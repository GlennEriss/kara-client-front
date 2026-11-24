import { FieldValue, type Firestore } from 'firebase-admin/firestore'
import { z } from 'zod'
import {
  resolveVehicleLocation,
  type VehicleLocation,
} from '@/domains/vehicles/location'
import { InsuranceProspectRepository } from '@/domains/insurance-prospects/repository'
import { civilDate, prospectSchema } from '@/domains/insurance-prospects/model'
import { createServerFirestorePort } from '@/domains/finance/server/firestore-port'
import {
  assetTypeLabel,
  insuranceAssetOptions,
  isInsuranceAssetType,
} from '@/domains/vehicles/asset-types'
import {
  ensureConfiguredAssetType,
  readInsuranceAssetTypes,
} from '@/domains/vehicles/asset-types-server'
import type { MemberCaller } from './access'
import {
  iso,
  MemberError,
  memberIdentifier,
  memberIds,
  ownedRows,
} from './data'

const repository = (db: Firestore) =>
  new InsuranceProspectRepository(async () => createServerFirestorePort(db))

export async function memberInsuranceQuarters(db: Firestore, city: string) {
  if (!memberIdentifier(city)) throw new MemberError('Ville inconnue.', 400)
  const districts = await db
    .collection('districts')
    .where('communeId', '==', city)
    .get()
  const quarters = (
    await Promise.all(
      districts.docs.map(async (district) => {
        const rows = await db
          .collection('quarters')
          .where('districtId', '==', district.id)
          .get()
        return rows.docs.map((row) => ({
          value: row.id,
          districtId: district.id,
          name: String(row.data().name || ''),
          label: [row.data().name, district.data().name]
            .filter(Boolean)
            .join(' · '),
        }))
      }),
    )
  ).flat()
  return {
    quarters: quarters.sort((a, b) => a.label.localeCompare(b.label, 'fr')),
  }
}

export async function memberInsurance(db: Firestore, caller: MemberCaller) {
  const [setup, insurance, prospecting] = await Promise.allSettled([
    Promise.all([readInsuranceAssetTypes(db), db.collection('communes').get()]),
    ownedRows(db, 'vehicle-insurances', 'memberId', caller),
    repository(db).list(memberIds(caller)),
  ])
  const unavailable = [
    ...(setup.status === 'rejected' ? ['setup'] : []),
    ...(insurance.status === 'rejected' ? ['insurance'] : []),
    ...(prospecting.status === 'rejected' ? ['prospects'] : []),
  ]
  const contracts = insurance.status === 'fulfilled' ? insurance.value : []
  const prospects = prospecting.status === 'fulfilled' ? prospecting.value : []
  if (
    setup.status === 'rejected' &&
    insurance.status === 'rejected' &&
    prospecting.status === 'rejected'
  )
    throw new MemberError(
      'Impossible de charger vos assurances et prospections.',
      503,
    )
  return {
    unavailable,
    types:
      setup.status === 'fulfilled' ? insuranceAssetOptions(setup.value[0]) : [],
    cities: (setup.status === 'fulfilled' ? setup.value[1].docs : [])
      .map((d) => ({ value: d.id, label: String(d.data().name || '') }))
      .filter((d) => !!d.label)
      .sort((a, b) => a.label.localeCompare(b.label, 'fr')),
    insurance: contracts.map((c) => ({
      id: c.id,
      asset: assetTypeLabel(String(c.vehicleType || ''), c.vehicleDescription),
      reference: c.plateNumber,
      company: c.insuranceCompany,
      endDate: iso(c.endDate),
      status:
        c.declarationStatus && c.declarationStatus !== 'validated'
          ? c.declarationStatus
          : c.status || 'active',
    })),
    prospects: prospects.map((p) => ({
      id: p.id,
      asset: assetTypeLabel(p.vehicleType, p.vehicleDescription),
      ownerName: p.ownerName,
      reference: p.plateNumber,
      company: p.insuranceCompany,
      endDate: p.endDate,
      followUpDate: p.followUpDate ?? '',
      status: p.status,
    })),
  }
}

export async function createMemberProspect(
  db: Firestore,
  caller: MemberCaller,
  payload: unknown,
) {
  const input = prospectSchema.safeParse(payload)
  if (!input.success)
    throw new MemberError(
      input.error.issues[0]?.message || 'Prospect invalide.',
    )
  try {
    await ensureConfiguredAssetType(db, input.data.vehicleType)
    const id = await repository(db).create(input.data, caller.matricule, {
      admin: false,
      id: caller.uid,
      memberId: caller.matricule,
      name:
        [caller.member.firstName, caller.member.lastName]
          .filter(Boolean)
          .join(' ') || caller.matricule,
    })
    return { id }
  } catch (error) {
    throw new MemberError(
      error instanceof Error ? error.message : 'Création impossible.',
    )
  }
}

const insuranceDeclaration = z
  .object({
    vehicleType: z.string().refine(isInsuranceAssetType),
    vehicleDescription: z.string().trim().max(60).optional(),
    plateNumber: z
      .string()
      .trim()
      .min(3, 'Immatriculation ou référence du bien requise.')
      .max(50),
    vehicleBrand: z.string().trim().max(100).optional(),
    vehicleModel: z.string().trim().max(100).optional(),
    vehicleYear: z
      .number()
      .int()
      .min(1960)
      .max(new Date().getFullYear() + 1)
      .optional(),
    communeId: z.string().refine(memberIdentifier),
    quarterId: z.string().refine(memberIdentifier).optional(),
    districtId: z.string().refine(memberIdentifier).optional(),
    city: z.string().trim().max(100),
    quarter: z.string().trim().max(150).optional(),
    locationType: z.enum(['quarter', 'other']),
    locationDetails: z.string().trim().max(1000).optional(),
    insuranceCompany: z
      .string()
      .trim()
      .min(1, 'Compagnie d’assurance requise.')
      .max(150),
    policyNumber: z.string().trim().min(2, 'Numéro de police requis.').max(100),
    warrantyMonths: z.number().int().min(1).max(60),
    premiumAmount: z.number().positive(),
    startDate: civilDate,
    endDate: civilDate,
    notes: z.string().trim().max(1000).optional(),
  })
  .strict()
  .superRefine((data, ctx) => {
    const issue = (field: string, message: string) =>
      ctx.addIssue({ code: 'custom', path: [field], message })
    if (data.vehicleType === 'other' && !data.vehicleDescription)
      issue('vehicleDescription', 'Précisez le type de bien.')
    if (data.locationType === 'quarter' && !data.quarterId)
      issue('quarterId', 'Sélectionnez un quartier.')
    if (data.locationType === 'other' && !data.locationDetails)
      issue('locationDetails', 'Précisez où se trouve le bien.')
    if (data.endDate <= data.startDate)
      issue(
        'endDate',
        'La date d’échéance doit être postérieure à la date de début.',
      )
  })

export async function declareMemberInsurance(
  db: Firestore,
  caller: MemberCaller,
  payload: unknown,
) {
  const input = insuranceDeclaration.safeParse(payload)
  if (!input.success)
    throw new MemberError(
      input.error.issues[0]?.message || 'Déclaration invalide.',
    )
  const {
    communeId,
    quarterId,
    locationType,
    locationDetails,
    startDate,
    endDate,
    city: _city,
    quarter: _quarter,
    districtId: _districtId,
    ...fields
  } = input.data
  let location: VehicleLocation
  try {
    await ensureConfiguredAssetType(db, fields.vehicleType)
    location = await resolveVehicleLocation(
      {
        communeId,
        locationType,
        ...(locationType === 'quarter' ? { quarterId } : { locationDetails }),
      },
      async (collection, id) =>
        (await db.collection(collection).doc(id).get()).data() ?? null,
    )
  } catch (error) {
    throw new MemberError(
      error instanceof Error
        ? error.message
        : 'Informations du bien invalides.',
    )
  }
  const ref = db.collection('vehicle-insurances').doc()
  const timestamp = FieldValue.serverTimestamp()
  const memberFirstName = String(caller.member.firstName || '')
  const memberLastName = String(caller.member.lastName || '')
  const memberName =
    [memberFirstName, memberLastName].filter(Boolean).join(' ') ||
    caller.matricule
  const insurance = {
    ...fields,
    ...location,
    vehicleDescription:
      fields.vehicleType === 'other' ? fields.vehicleDescription! : null,
    plateNumber: fields.plateNumber.toUpperCase(),
    startDate: new Date(startDate),
    endDate: new Date(endDate),
  }
  const batch = db.batch()
  batch.set(ref, {
    ...insurance,
    holderType: 'member',
    memberId: caller.matricule,
    memberMatricule: caller.matricule,
    memberFirstName,
    memberLastName,
    currency: 'FCFA',
    status: 'active',
    declarationStatus: 'pending',
    declaredValues: insurance,
    createdBy: caller.uid,
    createdAt: timestamp,
    updatedAt: timestamp,
    submittedAt: timestamp,
  })
  batch.set(db.collection('notifications').doc(), {
    module: 'vehicule',
    type: 'vehicle_declared',
    entityId: ref.id,
    title: 'Bien à valider',
    message: `${memberName} a envoyé une déclaration d’assurance à valider.`,
    metadata: { insuranceId: ref.id, memberId: caller.matricule },
    isRead: false,
    createdAt: timestamp,
  })
  await batch.commit()
  return { id: ref.id }
}
