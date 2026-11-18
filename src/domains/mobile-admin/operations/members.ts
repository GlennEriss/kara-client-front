import { NextRequest } from 'next/server'
import { createElement } from 'react'
import { renderToBuffer } from '@react-pdf/renderer'
import { IdentifiantsMembrePDF } from '@/domains/memberships/components/IdentifiantsMembrePDF'
import { POST as resetMemberPassword } from '@/app/api/auth/admin/reset-member-password/route'
import { updateMembershipRequestBeneficiary } from '@/db/membership.db'
import { z } from 'zod'
import { registerSchema, IdentityDocumentEnum } from '@/schemas/schemas'
import { identityDefaultValues } from '@/schemas/identity.schema'
import { resolveBeneficiary } from '@/constantes/beneficiary'
import { computeSubscriptionPeriod } from '@/domains/memberships/utils/subscriptionPeriod'
import {
  asDate,
  textField,
  idField,
  dateField,
  timeField,
  moneyField,
  boolField,
  fileField,
  field,
  paymentModes,
  selectField,
  reasonField,
} from '@/domains/finance/actions'
import {
  nested,
  rows,
  birthDate,
  select,
  textArea,
  type AdminModule,
  type Dataset,
} from '../catalog'
import { actor, type AdminAction, type AdminContext } from '../server/registry'
const addressFields = [
  idField('provinceId', 'Province', 'provinces', false),
  idField('communeId', 'Ville', 'communes', false),
  idField('districtId', 'Arrondissement', 'districts', false),
  idField('quarterId', 'Quartier', 'quarters', false),
  textField('province', 'Province', false),
  textField('city', 'Ville', false),
  textField('arrondissement', 'Arrondissement', false),
  textField('district', 'Quartier', false),
  textField('additionalInfo', 'Complément d’adresse', false),
]
const contacts = rows('contacts', 'Téléphones', [
  textField('phone', 'Téléphone (+241…)'),
])
const imageField = (key: string, label: string, required = true) =>
  field(
    key,
    label,
    'file',
    required
      ? z.union([z.literal(true), z.string().url()])
      : z.union([z.literal(true), z.string().url()]).optional(),
    {
      accept: ['image/jpeg', 'image/png', 'image/webp'],
      maxBytes: 5 * 1024 * 1024,
    },
  )
const identityFields = [
  select('civility', 'Civilité', ['Monsieur', 'Madame', 'Mademoiselle']),
  textField('lastName', 'Nom'),
  textField('firstName', 'Prénom', false),
  birthDate('birthDate', 'Date de naissance'),
  textField('birthPlace', 'Lieu de naissance'),
  textField('birthCertificateNumber', 'Numéro d’acte de naissance'),
  select('gender', 'Sexe', ['Homme', 'Femme']),
  { ...textField('nationality', 'Nationalité (code pays)'), initial: 'GA' },
  select('maritalStatus', 'Situation matrimoniale', [
    'Célibataire',
    'Veuf/Veuve',
    'Marié(e)',
    'Concubinage',
  ]),
  textField('spouseLastName', 'Nom du conjoint', false),
  textField('spouseFirstName', 'Prénom du conjoint', false),
  textField('spousePhone', 'Téléphone du conjoint', false),
  textField('religion', 'Religion'),
  textField('customReligion', 'Autre religion', false),
  textField('prayerPlace', 'Lieu de prière'),
  contacts,
  textField('whatsappNumber', 'WhatsApp (+241…)'),
  textField('email', 'Email', false),
  idField('intermediaryCode', 'Parrain', 'members', false),
  idField('beneficiaryId', 'Ayant droit', 'members', false),
  boolField('hasCar', 'Possède un véhicule'),
  imageField('photo', 'Photo du membre'),
]
const companyFields = [
  boolField('isEmployed', 'Exerce une activité professionnelle'),
  textField('companyName', 'Entreprise', false),
  nested('companyAddress', 'Adresse de l’entreprise', addressFields, true),
  textField('profession', 'Métier', false),
  textField('seniority', 'Ancienneté', false),
]
const documentFields = [
  select('identityDocument', 'Pièce d’identité', IdentityDocumentEnum.options),
  textField('customDocumentType', 'Autre pièce', false),
  textField('identityDocumentNumber', 'Numéro de pièce'),
  birthDate('issuingDate', 'Date de délivrance'),
  textField('issuingPlace', 'Lieu de délivrance'),
  dateField('expirationDate', 'Expiration'),
  imageField('documentPhotoFront', 'Pièce recto'),
  imageField('documentPhotoBack', 'Pièce verso', false),
  boolField('termsAccepted', 'Conditions d’adhésion acceptées'),
]
const registration = [
  nested('identity', '1. Identité', identityFields),
  nested('address', '2. Adresse', addressFields),
  nested('company', '3. Profession', companyFields),
  nested('documents', '4. Pièces et engagement', documentFields),
]
const upload = async (ctx: AdminContext, key: string, type: string) => {
  const file = ctx.files[key]
  if (!file) throw Error('Ajoutez la pièce demandée.')
  return ctx.services.documents.uploadDocumentFile(
    file,
    ctx.id === 'new' ? ctx.caller.claims.uid : ctx.id,
    type,
  )
}
async function resolveIdentity(ctx: AdminContext, identity: any) {
  const next = {
    ...identity,
    contacts: (identity.contacts || []).map((r: any) =>
      typeof r === 'string' ? r : r.phone,
    ),
  }
  delete next.beneficiaryId
  const beneficiary = identity.beneficiaryId
    ? await ctx.services.members.getMemberById(identity.beneficiaryId)
    : null
  next.beneficiary = resolveBeneficiary(
    beneficiary
      ? {
          matricule: beneficiary.matricule || beneficiary.id,
          lastName: beneficiary.lastName,
          firstName: beneficiary.firstName,
        }
      : identity.beneficiary,
  )
  if (identity.intermediaryCode) {
    const m = await ctx.services.members.getMemberById(
      identity.intermediaryCode,
    )
    if (!m) throw Error('Parrain introuvable.')
    next.intermediaryCode = m.matricule || m.id
  }
  return next
}
async function resolveAddress(ctx: AdminContext, data: any) {
  const output = { ...data }
  for (const [id, name, col] of [
    ['provinceId', 'province', 'provinces'],
    ['communeId', 'city', 'communes'],
    ['districtId', 'arrondissement', 'districts'],
    ['quarterId', 'district', 'quarters'],
  ])
    if (data?.[id]) {
      const doc = await ctx.services.db.collection(col).doc(data[id]).get()
      if (!doc.exists) throw Error('Adresse inconnue.')
      output[name] = doc.data()?.name
    }
  return output
}
async function formData(ctx: AdminContext, data: any) {
  const identity = await resolveIdentity(ctx, {
    ...identityDefaultValues,
    ...data.identity,
  })
  const documents = { ...data.documents }
  for (const [path, target, key] of [
    ['identity.photo', identity, 'photo'],
    ['documents.documentPhotoFront', documents, 'documentPhotoFront'],
    ['documents.documentPhotoBack', documents, 'documentPhotoBack'],
  ] as const) {
    const file = ctx.files[path]
    if (file) {
      if (!file.type.startsWith('image/') || file.size > 5 * 1024 * 1024)
        throw Error('Les photos doivent être des images de 5 Mo maximum.')
      target[key] =
        `data:${file.type};base64,${Buffer.from(await file.arrayBuffer()).toString('base64')}`
    } else if (typeof target[key] === 'string') {
      const existing =
        path === 'identity.photo'
          ? ctx.row.identity?.photoURL || ctx.row.identity?.photo
          : ctx.row.documents?.[key + 'URL'] || ctx.row.documents?.[key]
      if (target[key] !== existing)
        throw Error(
          'Remplacez la pièce par un fichier sélectionné sur l’appareil.',
        )
    } else if (target[key] === true) delete target[key]
  }
  const validated = registerSchema.parse({
    identity,
    address: await resolveAddress(ctx, data.address),
    company: {
      ...data.company,
      ...(data.company?.companyAddress
        ? {
            companyAddress: await resolveAddress(
              ctx,
              data.company.companyAddress,
            ),
          }
        : {}),
    },
    documents,
  })
  return {
    ...validated,
    identity: {
      ...validated.identity,
      contacts: validated.identity.contacts.filter(
        (phone): phone is string => !!phone,
      ),
    },
  }
}
const pdfResult = (captured: { blob: Blob; filename: string }[]) =>
  Promise.all(
    captured.map(async (f) => ({
      filename: f.filename,
      mime: 'application/pdf',
      base64: Buffer.from(await f.blob.arrayBuffer()).toString('base64'),
    })),
  )
export function memberActions(
  module: AdminModule,
  dataset: Dataset,
): AdminAction[] {
  const action = (
    id: string,
    label: string,
    permission: string,
    fields: AdminAction['fields'],
    run: AdminAction['run'],
    extra: Partial<AdminAction> = {},
  ): AdminAction => ({
    id,
    label,
    scope: 'contract',
    permission,
    fields,
    run,
    ...extra,
  })
  if (module.key === 'member-requests' && dataset.key === 'duplicates')
    return [
      action(
        'duplicate.resolve',
        'Marquer le groupe de doublons comme traité',
        'memberRequests.edit',
        [],
        (ctx) => ctx.services.duplicates.resolveGroup(ctx.id, actor(ctx).id),
      ),
    ]
  if (module.key === 'members')
    return [
      action(
        'member.create',
        'Nouvelle demande d’adhésion',
        'members.create',
        registration,
        async (ctx, d) => {
          const result = await ctx.services
            .memberships(ctx.token)
            .form.submitNewMembership(await formData(ctx, d))
          if (!result.success)
            throw Error(result.error || 'Création impossible.')
          return { id: result.requestId }
        },
        { scope: 'workspace' },
      ),
      action(
        'member.credentials',
        'Générer les identifiants de connexion',
        'members.edit',
        [textField('confirmMatricule', 'Recopiez le matricule du membre')],
        async (ctx, d) => {
          const matricule = ctx.row.matricule || ctx.id
          if (d.confirmMatricule.trim() !== matricule)
            throw Error('Le matricule saisi ne correspond pas au membre.')
          const response = await resetMemberPassword(
            new NextRequest(
              'http://localhost/api/auth/admin/reset-member-password',
              {
                method: 'POST',
                headers: {
                  authorization: `Bearer ${ctx.token}`,
                  'content-type': 'application/json',
                },
                body: JSON.stringify({ memberId: ctx.id }),
              },
            ),
          )
          const result = await response.json()
          if (!response.ok)
            throw Error(
              result.details || result.error || 'Génération impossible.',
            )
          const bytes = await renderToBuffer(
            createElement<any>(IdentifiantsMembrePDF, {
              data: {
                matricule,
                email: result.email,
                identifiant: result.email || ctx.row.email || matricule,
                motDePasse: result.newPassword,
              },
            }),
          )
          return {
            documents: [
              {
                filename: `identifiants-${matricule}.pdf`,
                mime: 'application/pdf',
                base64: bytes.toString('base64'),
              },
            ],
          }
        },
        { sensitiveResult: true },
      ),
      action(
        'member.adhesion',
        'Téléverser la fiche d’adhésion',
        'members.edit',
        [fileField('document', 'Fiche d’adhésion (PDF)')],
        async (ctx) => {
          if (ctx.files.document?.type !== 'application/pdf')
            throw Error('Choisissez un fichier PDF.')
          const uploaded = await upload(ctx, 'document', 'MEMBERSHIP_ADHESION')
          const [member] =
            await ctx.services.memberDatabase.enrichWithSubscriptionsBatch([
              ctx.row,
            ] as any)
          if (member.lastSubscription?.id)
            await ctx.services.subscriptions.updateSubscription(
              member.lastSubscription.id,
              { adhesionPdfURL: uploaded.url },
            )
          await ctx.services.users.updateUser(ctx.id, {
            adhesionPdfURL: uploaded.url,
          })
          if (ctx.row.dossier)
            await ctx.services.db
              .collection('membership-requests')
              .doc(ctx.row.dossier)
              .update({
                adhesionPdfURL: uploaded.url,
                adhesionPdfUpdatedBy: actor(ctx).id,
                updatedAt: new Date(),
              })
              .catch(() => {})
          return { id: ctx.id }
        },
      ),
      action(
        'member.identity.update',
        'Modifier les informations personnelles',
        'members.edit',
        identityFields
          .filter((f) =>
            [
              'gender',
              'nationality',
              'hasCar',
              'birthDate',
              'birthPlace',
              'maritalStatus',
              'religion',
            ].includes(f.key),
          )
          .map((f) => ({ ...f, required: false, schema: f.schema.optional() })),
        async (ctx, d) => {
          if (!(await ctx.services.users.updateUser(ctx.id, d)))
            throw Error('Mise à jour impossible.')
        },
      ),
      action(
        'member.name.update',
        'Modifier le nom et le prénom',
        'members.edit',
        [textField('lastName', 'Nom'), textField('firstName', 'Prénom', false)],
        async (ctx, d) => {
          if (
            !(await ctx.services.users.updateUser(ctx.id, {
              lastName: d.lastName,
              firstName: d.firstName || '',
            }))
          )
            throw Error('Mise à jour impossible.')
        },
      ),
      action(
        'member.contacts.update',
        'Modifier les coordonnées',
        'members.edit',
        [
          contacts,
          textField('email', 'Email', false),
          textField('whatsappNumber', 'WhatsApp', false),
        ],
        async (ctx, d) => {
          if (
            !(await ctx.services.users.updateUser(ctx.id, {
              contacts: d.contacts.map((r: any) => r.phone).filter(Boolean),
              email: d.email || '',
              whatsappNumber: d.whatsappNumber || '',
            }))
          )
            throw Error('Mise à jour impossible.')
        },
      ),
      action(
        'member.identity.metadata.update',
        'Modifier la pièce d’identité',
        'members.edit',
        [
          textField('identityDocument', 'Type de pièce', false),
          textField('identityDocumentNumber', 'Numéro de pièce', false),
        ],
        async (ctx, d) => {
          if (
            !(await ctx.services.users.updateUser(ctx.id, {
              identityDocument: d.identityDocument || '',
              identityDocumentNumber: d.identityDocumentNumber || '',
            }))
          )
            throw Error('Mise à jour impossible.')
        },
      ),
      action(
        'member.beneficiary.update',
        'Modifier l’ayant droit',
        'members.edit',
        [
          idField(
            'beneficiaryId',
            'Membre ayant droit (sans choix : INCONNU)',
            'members',
            false,
          ),
        ],
        async (ctx, d) => {
          if (!ctx.row.dossier)
            throw Error('Le dossier d’adhésion n’est pas disponible.')
          const identity = await resolveIdentity(ctx, d)
          await updateMembershipRequestBeneficiary(
            ctx.row.dossier,
            identity.beneficiary,
            actor(ctx).id,
            ctx.services.firestore,
          )
        },
      ),
      action(
        'member.address.update',
        'Modifier l’adresse',
        'members.edit',
        [nested('address', 'Adresse', addressFields)],
        async (ctx, d) => {
          if (
            !(await ctx.services.users.updateUser(ctx.id, {
              address: await resolveAddress(ctx, d.address),
            }))
          )
            throw Error('Mise à jour impossible.')
        },
      ),
      action(
        'member.company.update',
        'Modifier l’activité professionnelle',
        'members.edit',
        [
          textField('profession', 'Métier', false),
          textField('companyName', 'Entreprise', false),
          textField('companyAddress', 'Adresse de l’entreprise', false),
          textField('seniority', 'Ancienneté', false),
        ],
        async (ctx, d) => {
          if (!(await ctx.services.users.updateUser(ctx.id, d)))
            throw Error('Mise à jour impossible.')
        },
      ),
      action(
        'member.photo',
        'Remplacer la photo',
        'members.edit',
        [fileField('photo', 'Photo du membre')],
        async (ctx) => {
          const image = ctx.files.photo
          if (!image.type.startsWith('image/') || image.size > 5 * 1024 * 1024)
            throw Error('Photo de 5 Mo maximum.')
          const photo = await upload(ctx, 'photo', 'MEMBER_PHOTO')
          if (
            !(await ctx.services.users.updateUser(ctx.id, {
              photoURL: photo.url,
              photoPath: photo.path,
            }))
          )
            throw Error('Mise à jour impossible.')
        },
      ),
      action(
        'subscription.renew',
        'Renouveler l’abonnement',
        'members.edit',
        [
          dateField('paymentDate', 'Date du versement'),
          timeField('paymentTime', 'Heure'),
          selectField(
            'paymentMode',
            'Moyen de paiement',
            paymentModes.filter((p) =>
              ['airtel_money', 'mobicash'].includes(p.value),
            ),
          ),
          boolField('withFees', 'Avec frais'),
          moneyField('paymentAmount', 'Montant (FCFA)'),
          fileField('pdf', 'Adhésion signée (PDF)'),
        ],
        async (ctx, d) => {
          if (ctx.files.pdf.type !== 'application/pdf')
            throw Error('Le document d’adhésion doit être un PDF.')
          const { start, end } = computeSubscriptionPeriod(d.paymentDate)
          const pdf = await upload(ctx, 'pdf', 'MEMBERSHIP_ADHESION')
          const subscription =
            await ctx.services.subscriptions.createSubscription({
              userId: ctx.id,
              dateStart: start,
              dateEnd: end,
              montant: d.paymentAmount,
              currency: 'XOF',
              type: ctx.row.membershipType,
              createdBy: actor(ctx).id,
              isValid: true,
              adhesionPdfURL: pdf.url,
            } as any)
          if (ctx.row.dossier) {
            const dossier = await ctx.services
              .memberships(ctx.token)
              .repository.getById(ctx.row.dossier)
            if (!dossier) throw Error('Dossier d’adhésion introuvable.')
            await ctx.services
              .memberships(ctx.token)
              .repository.markAsPaid(ctx.row.dossier, {
                date: asDate(d.paymentDate, d.paymentTime).toISOString(),
                time: d.paymentTime,
                amount: d.paymentAmount,
                mode: d.paymentMode,
                withFees: !!d.withFees,
                paymentType: 'Subscription',
                acceptedBy: actor(ctx).id,
                recordedBy: actor(ctx).id,
                recordedByName: actor(ctx).name,
                recordedAt: new Date(),
              } as any)
          }
          return { id: subscription.id }
        },
      ),
      action(
        'subscription.period',
        'Corriger la période d’un abonnement',
        'members.edit',
        [
          idField('subscriptionId', 'Abonnement', 'subscriptions'),
          dateField('startDate', 'Début de la période'),
        ],
        async (ctx, d) => {
          const sub = await ctx.services.subscriptions.getSubscriptionById(
            d.subscriptionId,
          )
          if (!sub || sub.userId !== ctx.id)
            throw Error('Cet abonnement n’appartient pas au membre.')
          const { start, end } = computeSubscriptionPeriod(d.startDate)
          if (
            !(await ctx.services.subscriptions.updateSubscription(sub.id, {
              dateStart: start,
              dateEnd: end,
            }))
          )
            throw Error('Correction impossible.')
        },
      ),
      action(
        'member.gps.update',
        'Modifier la position GPS',
        'members.edit',
        [
          field('latitude', 'Latitude', 'number', z.number().min(-90).max(90)),
          field(
            'longitude',
            'Longitude',
            'number',
            z.number().min(-180).max(180),
          ),
        ],
        async (ctx, d) => {
          if (
            !(await ctx.services.users.updateUser(ctx.id, {
              gpsLocation: {
                ...d,
                capturedAt: new Date(),
                capturedBy: actor(ctx).id,
              },
            }))
          )
            throw Error('Enregistrement impossible.')
        },
      ),
      action(
        'member.identity.document',
        'Remplacer une pièce d’identité',
        'members.edit',
        [
          selectField('side', 'Face de la pièce', [
            { value: 'identityDocumentFrontURL', label: 'Recto' },
            { value: 'identityDocumentBackURL', label: 'Verso' },
          ]),
          fileField('document', 'Photo de la pièce'),
        ],
        async (ctx, d) => {
          const file = await upload(ctx, 'document', 'MEMBER_ID')
          if (
            !(await ctx.services.users.updateUser(ctx.id, {
              [d.side]: file.url,
            }))
          )
            throw Error('Mise à jour impossible.')
        },
      ),
      action(
        'member.star.deduct',
        'Retirer une étoile de charité',
        'members.edit',
        [reasonField()],
        (ctx, d) =>
          ctx.services.charityStars.deductStar({
            memberId: ctx.id,
            reason: d.reason,
            adminId: actor(ctx).id,
            adminName: actor(ctx).name,
          }),
      ),
    ]
  if (module.key !== 'member-requests') return []
  return [
    action(
      'request.create',
      'Nouvelle demande',
      'memberRequests.edit',
      registration,
      async (ctx, d) => {
        const result = await ctx.services
          .memberships(ctx.token)
          .form.submitNewMembership(await formData(ctx, d))
        if (!result.success) throw Error(result.error || 'Création impossible.')
        return { id: result.requestId }
      },
      { scope: 'workspace' },
    ),
    action(
      'request.update',
      'Modifier le dossier',
      'memberRequests.edit',
      registration,
      async (ctx, d) => {
        const result = await ctx.services
          .memberships(ctx.token)
          .form.updateMembershipRequest(ctx.id, await formData(ctx, d))
        if (!result.success)
          throw Error(result.error || 'Modification impossible.')
        return { id: ctx.id }
      },
    ),
    action(
      'request.payment',
      'Enregistrer un paiement',
      'memberRequests.edit',
      [
        { ...moneyField(), initial: 10300 },
        dateField(),
        timeField(),
        selectField('mode', 'Moyen de paiement', paymentModes),
        boolField('withFees', 'Avec frais'),
        textField('paymentMethodOther', 'Préciser le moyen de paiement', false),
        {
          ...fileField('proof', 'Preuve de paiement', false),
          accept: ['image/jpeg', 'image/png', 'image/webp'],
          maxBytes: 5 * 1024 * 1024,
        },
        textArea(
          'proofJustification',
          'Justification sans preuve (20 caractères minimum)',
          true,
        ),
      ],
      async (ctx, d) => {
        if (!ctx.files.proof && (d.proofJustification || '').trim().length < 20)
          throw Error(
            'Ajoutez une preuve ou une justification de 20 caractères minimum.',
          )
        if (
          ctx.files.proof &&
          (!['image/jpeg', 'image/png', 'image/webp'].includes(
            ctx.files.proof.type,
          ) ||
            ctx.files.proof.size > 5 * 1024 * 1024)
        )
          throw Error(
            'La preuve doit être une image JPG, PNG ou WEBP de 5 Mo maximum.',
          )
        if ((d.proofJustification || '').length > 500)
          throw Error('La justification ne doit pas dépasser 500 caractères.')
        const proof = ctx.files.proof
          ? await upload(ctx, 'proof', 'MEMBERSHIP_PAYMENT')
          : undefined
        await ctx.services.memberships(ctx.token).service.processPayment({
          requestId: ctx.id,
          adminId: actor(ctx).id,
          paymentInfo: {
            ...d,
            paymentType: 'Membership',
            date: asDate(d.date, d.time).toISOString(),
            ...(proof ? { proofUrl: proof.url, proofPath: proof.path } : {}),
          },
        })
      },
    ),
    action(
      'request.approve',
      'Approuver l’adhésion',
      'memberRequests.validate',
      [
        select('membershipType', 'Type de membre', [
          'adherant',
          'bienfaiteur',
          'sympathisant',
        ]),
        idField('companyId', 'Entreprise', 'companies', false),
        idField('professionId', 'Métier', 'professions', false),
        fileField('adhesion', 'Adhésion signée (PDF)'),
      ],
      async () => undefined,
    ),
    action(
      'request.reject',
      'Refuser la demande',
      'memberRequests.reject',
      [reasonField()],
      (ctx, d) =>
        ctx.services.memberships(ctx.token).service.rejectMembershipRequest({
          requestId: ctx.id,
          adminId: actor(ctx).id,
          reason: d.reason,
        }),
    ),
    action(
      'request.reopen',
      'Réouvrir le dossier',
      'memberRequests.edit',
      [reasonField()],
      (ctx, d) =>
        ctx.services.memberships(ctx.token).service.reopenMembershipRequest({
          requestId: ctx.id,
          adminId: actor(ctx).id,
          reason: d.reason,
        }),
    ),
    action(
      'request.corrections',
      'Demander des corrections',
      'memberRequests.edit',
      [
        rows('corrections', 'Corrections à apporter', [
          textArea('text', 'Correction'),
        ]),
      ],
      (ctx, d) =>
        ctx.services.memberships(ctx.token).service.requestCorrections({
          requestId: ctx.id,
          adminId: actor(ctx).id,
          corrections: d.corrections.map((r: any) => r.text),
          sendWhatsApp: false,
        }),
    ),
    action(
      'request.code',
      'Régénérer le code de correction',
      'memberRequests.edit',
      [],
      (ctx) =>
        ctx.services
          .memberships(ctx.token)
          .service.renewSecurityCode(ctx.id, actor(ctx).id),
    ),
    action(
      'request.delete',
      'Supprimer définitivement le dossier',
      'memberRequests.delete',
      [textField('confirmedMatricule', 'Recopiez le matricule du dossier')],
      async (ctx, d) => {
        if (d.confirmedMatricule !== (ctx.row.matricule || ctx.id))
          throw Error(
            'Le matricule de confirmation ne correspond pas au dossier.',
          )
        const result = await ctx.services
          .memberships(ctx.token)
          .invoke('deleteMembershipRequest', {
            requestId: ctx.id,
            confirmedMatricule: d.confirmedMatricule,
          })
        return result.data
      },
      { destructive: true },
    ),
    action(
      'request.pdf',
      'Remplacer l’adhésion signée',
      'memberRequests.edit',
      [fileField('adhesion', 'Adhésion signée (PDF)')],
      (ctx) =>
        ctx.services.memberships(ctx.token).service.replaceAdhesionPdf({
          requestId: ctx.id,
          adminId: actor(ctx).id,
          file: ctx.files.adhesion,
        }),
    ),
  ].map((a) =>
    a.id !== 'request.approve'
      ? a
      : {
          ...a,
          sensitiveResult: true,
          run: async (ctx, d) => {
            if (ctx.files.adhesion.type !== 'application/pdf')
              throw Error('Le document d’adhésion doit être un PDF.')
            const doc = await upload(ctx, 'adhesion', 'MEMBERSHIP_ADHESION')
            const memberships = ctx.services.memberships(ctx.token)
            await memberships.service.approveMembershipRequest({
              requestId: ctx.id,
              adminId: actor(ctx).id,
              membershipType: d.membershipType,
              companyId: d.companyId,
              professionId: d.professionId,
              adhesionPdfURL: doc.url,
            })
            return { documents: await pdfResult(memberships.captured) }
          },
        },
  )
}
