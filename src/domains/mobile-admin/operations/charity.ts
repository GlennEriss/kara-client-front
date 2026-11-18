/* eslint-disable no-restricted-imports -- Export CSV du site partagé avec l’application native. */
import { CharityExportService } from '@/services/bienfaiteur/CharityExportService'
import {
  charityEventSchema,
  charityContributionSchema,
  charityParticipantSchema,
} from '@/schemas/bienfaiteur.schema'
import {
  asDate,
  textField,
  idField,
  dateField,
  moneyField,
  boolField,
  fileField,
  paymentModes,
  selectField,
  reasonField,
} from '@/domains/finance/actions'
import { select, textArea, type AdminModule } from '../catalog'
import { actor, type AdminAction, type AdminContext } from '../server/registry'
const eventFields = [
  textField('title', 'Titre'),
  textField('location', 'Lieu'),
  textArea('description', 'Présentation'),
  dateField('startDate', 'Début'),
  dateField('endDate', 'Fin'),
  moneyField('targetAmount', 'Objectif (FCFA)', false),
  moneyField('minContributionAmount', 'Contribution minimale (FCFA)', false),
  select('status', 'Statut', [
    'draft',
    'upcoming',
    'ongoing',
    'closed',
    'archived',
  ]),
  { ...boolField('isPublic', 'Évènement public'), initial: true },
  fileField('cover', 'Couverture', false),
]
const personFields = [
  select('participantType', 'Contributeur', ['member', 'group']),
  idField('memberId', 'Membre', 'members', false),
  idField('groupId', 'Groupe', 'groups', false),
]
const contributionFields = [
  ...personFields,
  select('contributionType', 'Type de contribution', ['money', 'in_kind']),
  moneyField('amount', 'Montant (FCFA)', false),
  selectField('paymentMethod', 'Moyen de paiement', paymentModes, true),
  textArea('inKindDescription', 'Description du don en nature', true),
  moneyField('estimatedValue', 'Valeur estimée (FCFA)', false),
  {
    ...fileField('proofFile', 'Preuve de contribution'),
    maxBytes: 10 * 1024 * 1024,
  },
  dateField('contributionDate', 'Date du don'),
  select('status', 'Statut', ['pending', 'confirmed', 'canceled']),
  textArea('notes', 'Notes', true),
]
const asset = async (ctx: AdminContext, key: string, _type: string) =>
  !ctx.files[key]
    ? undefined
    : key === 'cover'
      ? ctx.services.charityMediaService.uploadCharityEventCover(
          ctx.files[key],
          ctx.id === 'new' ? undefined : ctx.id,
        )
      : ctx.services.charityMediaService.uploadContributionProof(
          ctx.files[key],
          ctx.id,
          ctx.operationId,
        )
async function child(ctx: AdminContext, type: string, id: string) {
  const doc = await ctx.services.db
    .collection(`charity-events/${ctx.id}/${type}`)
    .doc(id)
    .get()
  if (!doc.exists) throw Error('Élément introuvable dans cet évènement.')
  return { ...doc.data(), id: doc.id } as Record<string, any>
}
export function charityActions(module: AdminModule): AdminAction[] {
  if (module.key !== 'bienfaiteur') return []
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
    permission: `bienfaiteur.${permission}`,
    fields,
    run,
    ...extra,
  })
  return [
    action(
      'charity.contributions.export',
      'Exporter les contributions CSV',
      'export',
      [],
      async (ctx) => {
        const contributions =
          await ctx.services.charityContributions.getEventContributions(ctx.id)
        const snap = await ctx.services.db
          .collection(`charity-events/${ctx.id}/participants`)
          .get()
        const participants = snap.docs.map((d) => ({
          ...d.data(),
          id: d.id,
        })) as any[]
        const memberIds = [
          ...new Set<string>(
            participants.map((p) => p.memberId).filter(Boolean),
          ),
        ]
        const members = (
          await Promise.all(
            memberIds.map((id) => ctx.services.members.getMemberById(id)),
          )
        ).filter(Boolean)
        const groupIds = [
          ...new Set<string>(
            [
              ...participants.map((p) => p.groupId),
              ...members.flatMap((m) => m?.groupIds || []),
            ].filter(Boolean),
          ),
        ]
        const groups = (
          await Promise.all(
            groupIds.map((id) =>
              ctx.services.db.collection('groups').doc(id).get(),
            ),
          )
        )
          .filter((d) => d.exists)
          .map((d) => ({ ...d.data(), id: d.id }))
        const csv = CharityExportService.exportContributionsToCSV(
          contributions,
          participants,
          members,
          groups,
        )
        return {
          documents: [
            {
              filename: `LE-KARA-contributions-${ctx.id}.csv`,
              mime: 'text/csv',
              base64: Buffer.from('\uFEFF' + csv, 'utf8').toString('base64'),
            },
          ],
        }
      },
      { readonly: true },
    ),
    ...[true, false].map((create) =>
      action(
        create ? 'charity.create' : 'charity.update',
        create ? 'Nouvelle collecte' : 'Modifier la collecte',
        create ? 'create' : 'edit',
        eventFields,
        async (ctx, d) => {
          const parsed = charityEventSchema.parse({
            ...d,
            targetAmount: d.targetAmount?.toString(),
            minContributionAmount: d.minContributionAmount?.toString(),
            coverPhotoFile: ctx.files.cover,
          })
          const cover = await asset(ctx, 'cover', 'CHARITY_COVER')
          const data = {
            title: parsed.title,
            location: parsed.location,
            description: parsed.description,
            startDate: asDate(parsed.startDate),
            endDate: asDate(parsed.endDate),
            targetAmount: d.targetAmount,
            minContributionAmount: d.minContributionAmount,
            currency: 'FCFA',
            status: parsed.status,
            isPublic: parsed.isPublic,
            ...(cover
              ? { coverPhotoUrl: cover.url, coverPhotoPath: cover.path }
              : {}),
          }
          return create
            ? {
                id: await ctx.services.charityEvents.createEvent(
                  data as any,
                  actor(ctx).id,
                ),
              }
            : ctx.services.charityEvents.updateEvent(
                ctx.id,
                data,
                actor(ctx).id,
              )
        },
        { scope: create ? 'workspace' : 'contract' },
      ),
    ),
    action(
      'charity.delete',
      'Supprimer la collecte',
      'delete',
      [reasonField()],
      async (ctx) => {
        await ctx.services.charityEvents.deleteEvent(ctx.id)
        return { deleted: true }
      },
      { destructive: true },
    ),
    action(
      'charity.participant.add',
      'Inscrire un participant',
      'contribute',
      personFields,
      async (ctx, d) => {
        const p = charityParticipantSchema.parse(d)
        if (
          (p.participantType === 'member' && !p.memberId) ||
          (p.participantType === 'group' && !p.groupId)
        )
          throw Error('Sélectionnez le participant.')
        return {
          id: await ctx.services.charityParticipants.addParticipant(
            ctx.id,
            p.participantType,
            p.participantType === 'member' ? p.memberId : undefined,
            p.participantType === 'group' ? p.groupId : undefined,
            actor(ctx).id,
          ),
        }
      },
    ),
    action(
      'charity.participant.remove',
      'Retirer un participant',
      'contribute',
      [
        idField('participantId', 'Participant inscrit', 'charityParticipants'),
        reasonField(),
      ],
      async (ctx, d) => {
        await child(ctx, 'participants', d.participantId)
        return ctx.services.charityParticipants.removeParticipant(
          ctx.id,
          d.participantId,
        )
      },
      { destructive: true },
    ),
    action(
      'charity.contribution.create',
      'Ajouter une contribution',
      'contribute',
      contributionFields,
      async (ctx, d) => {
        const p = charityContributionSchema.parse({
          ...d,
          amount: d.amount?.toString(),
          estimatedValue: d.estimatedValue?.toString(),
          proofFile: ctx.files.proofFile,
        })
        const proof = await asset(ctx, 'proofFile', 'CHARITY_PROOF')
        const input = {
          contributionType: p.contributionType,
          status: p.status,
          contributionDate: asDate(p.contributionDate),
          notes: p.notes,
          proofUrl: proof?.url,
          proofPath: proof?.path,
          ...(p.contributionType === 'money'
            ? {
                payment: {
                  amount: Number(p.amount),
                  mode: p.paymentMethod,
                  paymentType: 'Charity',
                  date: asDate(p.contributionDate),
                  acceptedBy: actor(ctx).id,
                  recordedBy: actor(ctx).id,
                  recordedByName: actor(ctx).name,
                  recordedAt: new Date(),
                },
              }
            : {
                inKindDescription: p.inKindDescription,
                estimatedValue: Number(p.estimatedValue) || 0,
              }),
        }
        return ctx.services.charityContributions.addParticipantWithContribution(
          ctx.id,
          p.participantType === 'member' ? p.memberId : undefined,
          p.participantType === 'group' ? p.groupId : undefined,
          input as any,
          actor(ctx).id,
        )
      },
    ),
    action(
      'charity.contribution.delete',
      'Supprimer une contribution',
      'contribute',
      [
        idField('contributionId', 'Contribution', 'charityContributions'),
        reasonField(),
      ],
      async (ctx, d) => {
        await child(ctx, 'contributions', d.contributionId)
        return ctx.services.charityContributions.deleteContribution(
          ctx.id,
          d.contributionId,
        )
      },
      { destructive: true },
    ),
    action(
      'charity.contribution.status',
      'Modifier le statut d’une contribution',
      'contribute',
      [
        idField('contributionId', 'Contribution', 'charityContributions'),
        select('status', 'Statut', ['pending', 'confirmed', 'canceled']),
      ],
      async (ctx, d) => {
        await child(ctx, 'contributions', d.contributionId)
        return ctx.services.charityContributions.updateContribution(
          ctx.id,
          d.contributionId,
          { status: d.status },
          actor(ctx).id,
        )
      },
    ),
    action(
      'charity.media.add',
      'Ajouter un média',
      'edit',
      [
        select('type', 'Type de média', ['photo', 'video']),
        {
          ...fileField('media', 'Photo ou vidéo'),
          accept: [
            'image/jpeg',
            'image/png',
            'image/webp',
            'video/mp4',
            'video/webm',
            'video/quicktime',
          ],
          maxBytes: 50 * 1024 * 1024,
        },
        textField('title', 'Titre', false),
        textArea('description', 'Description', true),
        dateField('takenAt', 'Prise le'),
      ],
      async (ctx, d) => ({
        id: await ctx.services.charityMediaService.CharityMediaService.createMedia(
          ctx.id,
          ctx.files.media,
          d.type,
          actor(ctx).id,
          d.title,
          d.description,
          asDate(d.takenAt),
        ),
      }),
    ),
    action(
      'charity.media.update',
      'Modifier un média',
      'edit',
      [
        idField('mediaId', 'Média', 'charityMedia'),
        textField('title', 'Titre', false),
        textArea('description', 'Description', true),
        dateField('takenAt', 'Prise le'),
      ],
      async (ctx, d) => {
        await child(ctx, 'media', d.mediaId)
        await ctx.services.charityMediaService.CharityMediaService.updateMedia(
          ctx.id,
          d.mediaId,
          {
            title: d.title,
            description: d.description,
            takenAt: asDate(d.takenAt),
          },
          actor(ctx).id,
        )
      },
    ),
    action(
      'charity.media.delete',
      'Supprimer un média',
      'edit',
      [idField('mediaId', 'Média', 'charityMedia'), reasonField()],
      async (ctx, d) => {
        await child(ctx, 'media', d.mediaId)
        await ctx.services.charityMediaService.CharityMediaService.deleteMedia(
          ctx.id,
          d.mediaId,
        )
      },
      { destructive: true },
    ),
    ...[true, false].map((confirm) =>
      action(
        confirm ? 'charity.declaration.confirm' : 'charity.declaration.reject',
        confirm ? 'Confirmer une déclaration' : 'Refuser une déclaration',
        'contribute',
        [
          idField('declarationId', 'Déclaration', 'charityDeclarations'),
          ...(confirm
            ? [selectField('paymentMode', 'Moyen de paiement', paymentModes)]
            : [reasonField()]),
        ],
        async (ctx, d) => {
          const ref = ctx.services.db
            .collection('charityContributions')
            .doc(d.declarationId)
          const snap = await ref.get()
          const declaration = snap.data()
          if (
            !declaration ||
            declaration.eventId !== ctx.id ||
            declaration.status !== 'pending'
          )
            throw Error('Déclaration non disponible.')
          if (confirm) {
            const members = await ctx.services.users.getUsersByMatricules([
              declaration.participantId,
            ])
            const memberId =
              members.get(declaration.participantId.trim())?.id ||
              declaration.participantId
            const now = new Date()
            await ctx.services.charityContributions.addParticipantWithContribution(
              ctx.id,
              memberId,
              undefined,
              {
                contributionType: declaration.contributionType,
                status: 'confirmed',
                contributionDate: now,
                notes: declaration.notes,
                ...(declaration.contributionType === 'money'
                  ? {
                      payment: {
                        amount:
                          Number(
                            declaration.payment?.amount ?? declaration.amount,
                          ) || 0,
                        mode: d.paymentMode,
                        paymentType: 'Charity',
                        date: now,
                        time: now.toTimeString().slice(0, 5),
                        acceptedBy: actor(ctx).id,
                        recordedBy: actor(ctx).id,
                        recordedByName: actor(ctx).name,
                        recordedAt: now,
                      },
                    }
                  : {
                      inKindDescription: declaration.inKindDescription || '',
                      estimatedValue: Number(declaration.estimatedValue) || 0,
                    }),
              } as any,
              actor(ctx).id,
            )
          }
          await ref.update({
            status: confirm ? 'confirmed' : 'canceled',
            processedBy: actor(ctx).id,
            processedAt: new Date(),
            updatedAt: new Date(),
          })
          await ctx.services.notifications.notifyMember({
            recipientId: declaration.participantId,
            module: 'bienfaiteur',
            entityId: ctx.id,
            type: 'status_update',
            title: confirm
              ? 'Contribution confirmée'
              : 'Contribution non retenue',
            message: confirm
              ? 'Votre déclaration de contribution a été confirmée par un gestionnaire. Merci pour votre générosité !'
              : 'Votre déclaration de contribution n’a pas été retenue. Contactez un gestionnaire pour plus d’informations.',
            metadata: {
              declarationId: d.declarationId,
              status: confirm ? 'confirmed' : 'canceled',
            },
          })
        },
      ),
    ),
  ]
}
