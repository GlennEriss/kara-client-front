import { z } from 'zod'
import { isInsuranceAssetType } from "@/domains/vehicles/asset-types"

export const PROSPECT_COLLECTION = 'insurance-prospects'
export const KARA_SPONSOR_ID = '2548.MK.290126'
export const REMINDER_DAYS = [30, 15, 7, 0] as const
export const prospectStatuses = {
  tracking: 'À suivre',
  contacted: 'Contacté',
  quote_requested: 'Assurance LE KARA demandée',
  converted: 'Assuré chez LE KARA',
  lost: 'Prospect perdu',
} as const
export type ProspectStatus = keyof typeof prospectStatuses
export const civilDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date requise')
  .refine((value) => {
    const date = new Date(`${value}T12:00:00Z`)
    return (
      !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
    )
  }, 'Date invalide')
const optionalText = z.string().trim().max(2000).optional().default('')
export const prospectSchema = z
  .object({
    ownerName: z.string().trim().min(2, 'Nom du contact requis').max(150),
    phone: z.string().trim().min(6, 'Téléphone requis').max(30),
    whatsapp: z.string().trim().max(30).optional().default(''),
    plateNumber: z
      .string()
      .trim()
      .min(2, 'Immatriculation ou référence du bien requise')
      .max(30)
      .transform((v) => v.toUpperCase()),
    vehicleType: z.string().refine(isInsuranceAssetType, "Sélectionnez un type de bien"),
    vehicleDescription: optionalText,
    city: z.string().trim().min(2, 'Ville requise').max(100),
    communeId: z.string().optional(),
    districtId: z.string().optional(),
    quarterId: z.string().optional(),
    locationType: z.enum(['quarter', 'other']),
    quarter: z.string().trim().max(150).optional().default(''),
    locationDetails: optionalText,
    insuranceCompany: z
      .string()
      .trim()
      .min(2, 'Assureur actuel requis')
      .max(150),
    endDate: civilDate,
    notes: optionalText,
  })
  .strict()
  .superRefine((v, ctx) => {
    if (v.locationType === 'quarter' && !v.quarter && !v.quarterId)
      ctx.addIssue({
        code: 'custom',
        path: ['quarter'],
        message: 'Indiquez le quartier',
      })
    if (v.locationType === 'other' && !v.locationDetails)
      ctx.addIssue({
        code: 'custom',
        path: ['locationDetails'],
        message: 'Précisez où se trouve le bien',
      })
    if (v.vehicleType === 'other' && !v.vehicleDescription)
      ctx.addIssue({
        code: 'custom',
        path: ['vehicleDescription'],
        message: 'Précisez le type de bien',
      })
  })
export type ProspectInput = z.input<typeof prospectSchema>
export type InsuranceProspect = z.output<typeof prospectSchema> & {
  id: string
  status: ProspectStatus
  sponsorMemberId: string
  sponsorName: string
  createdBy: string
  updatedBy: string
  source: 'member' | 'admin'
  createdAt: unknown
  updatedAt: unknown
  followUpDate?: string
  insuranceId?: string
}
export function gabonDay(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Libreville',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)
}
export function daysToExpiry(endDate: string, now = new Date()) {
  return Math.round(
    (new Date(`${endDate}T12:00:00Z`).getTime() -
      new Date(`${gabonDay(now)}T12:00:00Z`).getTime()) /
      86400000,
  )
}
export function prospectPhase(
  row: Pick<InsuranceProspect, 'status' | 'endDate'>,
  now = new Date(),
) {
  if (row.status === 'converted' || row.status === 'lost')
    return prospectStatuses[row.status]
  const days = daysToExpiry(row.endDate, now)
  return days < 0
    ? 'Échéance dépassée — à traiter'
    : days === 0
      ? 'Expire aujourd’hui'
      : days <= 30
        ? 'À contacter'
        : prospectStatuses[row.status]
}
/** Rattrape un passage manqué, puis un seul rappel par palier et échéance. */
export function reminderStage(endDate: string, now = new Date()) {
  const days = daysToExpiry(endDate, now)
  return days <= 0
    ? 0
    : days <= 7
      ? 7
      : days <= 15
        ? 15
        : days <= 30
          ? 30
          : null
}
export const normalizedPlate = (value: string) =>
  value.toUpperCase().replace(/[^A-Z0-9]/g, '')

export function insuranceMatchesProspect(
  row: Pick<
    InsuranceProspect,
    'id' | 'plateNumber' | 'sponsorMemberId' | 'endDate'
  >,
  insured: {
    plateNumber?: string
    sponsorMemberId?: string | null
    declarationStatus?: string
    prospectId?: string
    endDate?: unknown
  },
) {
  const raw = insured.endDate as { toDate?: () => Date } | undefined
  const end =
    raw && typeof raw.toDate === 'function'
      ? raw.toDate()
      : new Date(insured.endDate as string)
  return (
    (!insured.declarationStatus || insured.declarationStatus === 'validated') &&
    normalizedPlate(insured.plateNumber || '') ===
      normalizedPlate(row.plateNumber) &&
    insured.sponsorMemberId === row.sponsorMemberId &&
    (!insured.prospectId || insured.prospectId === row.id) &&
    !Number.isNaN(end.getTime()) &&
    gabonDay(end) > row.endDate
  )
}
