import {
  getInsuranceHolderPhone,
  getInsuranceHolderName,
  insuranceReminderTemplate,
} from '@/utils/vehicule/insuranceReminder'
import { renderTemplate } from '@/domains/messaging/utils/renderTemplate'
import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import {
  textField,
  dateField,
  timeField,
  fileField,
  field,
  moneyField,
  idField,
  numberField,
  boolField,
  reasonField,
  asDate,
  selectField,
  paymentModes,
} from '@/domains/finance/actions'
import { agentRecouvrementFormSchema } from '@/schemas/agent-recouvrement.schema'
import { createEventSchema } from '@/domains/community/events/schemas/event.schema'
import { vehicleInsuranceFormSchema } from '@/schemas/vehicule.schema'
import { MESSAGE_TEMPLATES } from '@/domains/messaging/constants/message-templates'
import {
  nested,
  rows,
  select,
  textArea,
  birthDate,
  type AdminModule,
  type Dataset,
} from '../catalog'
import {
  actor,
  convertDates,
  type AdminAction,
  type AdminContext,
} from '../server/registry'
const imageTypes = ['image/jpeg', 'image/png', 'image/webp']
const imageField = (key: string, label: string, required = false) => ({
  ...fileField(key, label, required),
  accept: imageTypes,
  maxBytes: 8 * 1024 * 1024,
})
const asset = async (ctx: AdminContext, key: string) => {
  const file = ctx.files[key]
  if (!file) return undefined
  if (['image', 'photo'].includes(key) && !imageTypes.includes(file.type))
    throw Error('Choisissez une image PNG, JPEG ou WebP.')
  return ctx.services.documents.uploadDocumentFile(
    file,
    ctx.row.memberId || ctx.row.ownerMemberId || actor(ctx).id,
    'CONTACT_DOCUMENT',
  )
}
const dateOptional = (key: string, label: string) =>
  field(key, label, 'date', z.string().optional())
const rate = (key: string, label: string, max = 100) =>
  field(key, label, 'number', z.number().min(0).max(max))
const eventFields = [
  textField('title', 'Titre'),
  textArea('description', 'Description'),
  select(
    'type',
    'Type',
    ['assembly', 'celebration', 'training', 'charity', 'other'],
    true,
  ),
  idField('charityEventId', 'Collecte associée', 'charities', false),
  dateField('startDate', 'Date de début'),
  timeField('startTime', 'Heure de début'),
  dateOptional('endDate', 'Date de fin'),
  field('endTime', 'Heure de fin', 'time', z.string().optional()),
  boolField('pollEnabled', 'Organiser un sondage de lieu'),
  nested(
    'finalLocation',
    'Lieu fixe',
    [
      textField('name', 'Nom du lieu'),
      textField('address', 'Adresse', false),
      textArea('description', 'Précisions', true),
    ],
    true,
  ),
  dateOptional('pollClosesAt', 'Date de clôture du sondage'),
  field('pollCloseTime', 'Heure de clôture', 'time', z.string().optional()),
  rows(
    'proposedLocations',
    'Options de lieu',
    [
      { ...textField('id', 'Référence du lieu', false), kind: 'hidden' },
      textField('name', 'Nom'),
      textField('address', 'Adresse', false),
      textArea('description', 'Précisions', true),
    ],
    true,
  ),
  imageField('image', 'Image de couverture'),
]
const agentFields = [
  textField('nom', 'Nom'),
  textField('prenom', 'Prénom'),
  select('sexe', 'Sexe', ['M', 'F']),
  nested('pieceIdentite', 'Pièce d’identité', [
    select('type', 'Type', [
      'CNI',
      'Passport',
      'Carte scolaire',
      'Carte étrangère',
      'Carte consulaire',
    ]),
    textField('numero', 'Numéro'),
    birthDate('dateDelivrance', 'Délivrée le'),
    birthDate('dateExpiration', 'Expire le'),
  ]),
  birthDate('dateNaissance', 'Date de naissance'),
  textField('lieuNaissance', 'Lieu de naissance'),
  textField('tel1', 'Téléphone principal'),
  textField('tel2', 'Autre téléphone', false),
  fileField('photo', 'Photo', false),
  boolField('removePhoto', 'Retirer la photo enregistrée'),
]
const shopFields = [
  textField('name', 'Nom de la boutique'),
  textField('category', 'Spécialité / Catégorie'),
  idField('ownerMemberId', 'Propriétaire', 'members'),
  textArea('description', 'Description', true),
  textField('phone', 'Téléphone', false),
  textField('whatsapp', 'WhatsApp', false),
  textField('email', 'Email', false),
  textField('province', 'Province'),
  textField('city', 'Ville'),
  textField('district', 'Quartier', false),
  textField('address', 'Adresse / Repère', false),
  rows(
    'openingHours',
    'Horaires d’ouverture',
    [
      select('day', 'Jour', [
        'Lundi',
        'Mardi',
        'Mercredi',
        'Jeudi',
        'Vendredi',
        'Samedi',
        'Dimanche',
      ]),
      boolField('closed', 'Fermé'),
      field('open', 'Ouverture', 'time', z.string().optional()),
      field('close', 'Fermeture', 'time', z.string().optional()),
    ],
    true,
  ),
  boolField('isActive', 'Visible dans l’annuaire'),
  imageField('photo', 'Photo / logo'),
]
const insuranceFields = [
  select('holderType', 'Titulaire', ['member', 'non-member']),
  idField('memberId', 'Membre assuré', 'members', false),
  textField('nonMemberFirstName', 'Prénom du non-membre', false),
  textField('nonMemberLastName', 'Nom du non-membre', false),
  textField('nonMemberPhone1', 'Téléphone du non-membre', false),
  textField('nonMemberPhone2', 'Autre téléphone', false),
  textField('city', 'Ville'),
  select('vehicleType', 'Bien assuré', [
    'car',
    'motorcycle',
    'truck',
    'bus',
    'maison',
    'other',
  ]),
  textField('plateNumber', 'Immatriculation'),
  textField('vehicleBrand', 'Marque', false),
  textField('vehicleModel', 'Modèle', false),
  field(
    'vehicleYear',
    'Année',
    'number',
    z
      .number()
      .int()
      .min(1960)
      .max(new Date().getFullYear() + 1)
      .optional(),
  ),
  select(
    'energySource',
    'Énergie',
    ['essence', 'diesel', 'electrique', 'hybride', 'gaz', 'autre'],
    true,
  ),
  textField('fiscalPower', 'Puissance fiscale', false),
  textField('insuranceCompany', 'Assureur'),
  textField('policyNumber', 'Numéro de police'),
  numberField('warrantyMonths', 'Garantie (mois)', 1, 60),
  moneyField('premiumAmount', 'Prime (FCFA)'),
  idField('sponsorMemberId', 'Parrain', 'members'),
  dateField('startDate', 'Début de couverture'),
  dateField('endDate', 'Fin de couverture'),
  fileField('receipt', 'Reçu de paiement', false),
  textArea('notes', 'Notes', true),
]
export function communityActions(
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
  if (module.key === 'agents')
    return [
      ...[true, false].map((create) =>
        action(
          create ? 'agent.create' : 'agent.update',
          create ? 'Nouvel agent' : 'Modifier',
          'agents.manage',
          agentFields,
          async (ctx, d) => {
            const values = { ...d }
            delete values.photo
            delete values.removePhoto
            if (
              ctx.files.photo &&
              !['image/jpeg', 'image/png', 'image/webp'].includes(
                ctx.files.photo.type,
              )
            )
              throw Error('La photo doit être une image JPEG, PNG ou WebP.')
            const data = agentRecouvrementFormSchema.parse(
              convertDates(agentFields, values),
            )
            const photo = await asset(ctx, 'photo')
            return create
              ? ctx.services.agents.createAgent({
                  ...data,
                  ...(photo
                    ? { photoUrl: photo.url, photoPath: photo.path }
                    : {}),
                  createdBy: actor(ctx).id,
                })
              : ctx.services.agents.updateAgent(
                  ctx.id,
                  {
                    ...data,
                    ...(photo
                      ? { photoUrl: photo.url, photoPath: photo.path }
                      : {}),
                    ...(d.removePhoto && !photo
                      ? { photoUrl: null, photoPath: null }
                      : {}),
                  },
                  actor(ctx).id,
                )
          },
          { scope: create ? 'workspace' : 'contract' },
        ),
      ),
      action(
        'agent.deactivate',
        'Désactiver',
        'agents.manage',
        [reasonField()],
        (ctx) => ctx.services.agents.deactivateAgent(ctx.id, actor(ctx).id),
      ),
      action('agent.reactivate', 'Réactiver', 'agents.manage', [], (ctx) =>
        ctx.services.agents.reactivateAgent(ctx.id, actor(ctx).id),
      ),
      action(
        'agent.delete',
        'Supprimer',
        'agents.manage',
        [reasonField()],
        async (ctx) => {
          await ctx.services.agents.deleteAgent(ctx.id)
          return { deleted: true }
        },
        { destructive: true },
      ),
    ]
  if (module.key === 'events')
    return [
      ...[true, false].map((create) =>
        action(
          create ? 'event.create' : 'event.update',
          create ? 'Nouvel événement' : 'Modifier',
          'events.manage',
          eventFields,
          async (ctx, d) => {
            if (
              !create &&
              ctx.row.status !== 'draft' &&
              d.pollEnabled !== ctx.row.pollEnabled
            )
              throw Error(
                'Le type de lieu ne peut plus changer après publication.',
              )
            const input = {
              ...d,
              startDate: asDate(d.startDate, d.startTime).toISOString(),
              endDate: d.endDate
                ? asDate(d.endDate, d.endTime || d.startTime).toISOString()
                : undefined,
              pollClosesAt: d.pollClosesAt
                ? asDate(
                    d.pollClosesAt,
                    d.pollCloseTime || '12:00',
                  ).toISOString()
                : undefined,
              proposedLocations: d.proposedLocations?.map(
                (p: any, i: number) => ({
                  ...p,
                  id: p.id || (create ? `option-${i + 1}` : randomUUID()),
                }),
              ),
            }
            const validated = createEventSchema.parse(input)
            const uploaded = await asset(ctx, 'image')
            const data = {
              ...validated,
              startDate: new Date(validated.startDate),
              endDate: validated.endDate
                ? new Date(validated.endDate)
                : undefined,
              pollClosesAt: validated.pollClosesAt
                ? new Date(validated.pollClosesAt)
                : undefined,
              ...(uploaded ? { imageURL: uploaded.url } : {}),
            }
            return create
              ? ctx.services.events.createEvent(
                  { ...data, createdBy: actor(ctx).id } as any,
                  actor(ctx).id,
                )
              : ctx.services.events.updateEvent(
                  ctx.id,
                  data as any,
                  actor(ctx).id,
                )
          },
          { scope: create ? 'workspace' : 'contract' },
        ),
      ),
      action('event.publish', 'Publier', 'events.manage', [], (ctx) =>
        ctx.services.events.publishEvent(ctx.id, actor(ctx).id),
      ),
      action(
        'event.location',
        'Confirmer le lieu',
        'events.manage',
        [idField('optionId', 'Lieu retenu', 'eventLocations')],
        (ctx, d) =>
          ctx.services.events.confirmLocation(
            ctx.id,
            { optionId: d.optionId },
            actor(ctx).id,
          ),
      ),
      action(
        'event.cancel',
        'Annuler l’événement',
        'events.manage',
        [reasonField()],
        (ctx, d) =>
          ctx.services.events.cancelEvent(
            ctx.id,
            { reason: d.reason },
            actor(ctx).id,
          ),
      ),
      action(
        'event.delete',
        'Supprimer le brouillon',
        'events.manage',
        [reasonField()],
        async (ctx) => {
          await ctx.services.events.deleteEvent(ctx.id, actor(ctx).id)
          return { deleted: true }
        },
        { destructive: true },
      ),
    ]
  if (module.key === 'shops') {
    if (dataset.key === 'articles')
      return [
        action(
          'article.approve',
          'Publier l’article',
          'boutiques.manage',
          [],
          (ctx) =>
            ctx.services.shops.reviewShopArticle(
              ctx.id,
              'approved',
              actor(ctx).id,
            ),
        ),
        action(
          'article.reject',
          'Refuser l’article',
          'boutiques.manage',
          [reasonField()],
          (ctx, d) =>
            ctx.services.shops.reviewShopArticle(
              ctx.id,
              'rejected',
              actor(ctx).id,
              d.reason,
            ),
        ),
        action(
          'article.delete',
          'Retirer l’article',
          'boutiques.manage',
          [reasonField()],
          async (ctx) => {
            await ctx.services.shops.deleteShopArticle(ctx.id)
            return { deleted: true }
          },
          { destructive: true },
        ),
      ]
    if (dataset.key === 'partners')
      return [
        action(
          'partner.update',
          'Conditions d’achat à crédit',
          'boutiques.manage',
          [
            boolField('enabled', 'Activer l’achat à crédit'),
            rate('discountPercent', 'Remise négociée (%)'),
            selectField(
              'payoutMode',
              'Règlement du vendeur',
              paymentModes,
              true,
            ),
            textField('payoutAccount', 'Compte / Numéro de paiement', false),
            boolField('agreementSigned', 'Convention signée'),
            fileField('agreement', 'Convention', false),
          ],
          async (ctx, d) => {
            const file = await asset(ctx, 'agreement')
            return ctx.services.shops.saveShopCreditPartner(
              {
                shopId: ctx.id,
                enabled: !!d.enabled,
                discountPercent: d.discountPercent,
                payoutMode: d.payoutMode,
                payoutAccount: d.payoutAccount,
                agreementSigned: !!d.agreementSigned,
                ...(file
                  ? { agreementUrl: file.url, agreementPath: file.path }
                  : {}),
              },
              actor(ctx).id,
            )
          },
        ),
      ]
    return [
      ...[true, false].map((create) =>
        action(
          create ? 'shop.create' : 'shop.update',
          create ? 'Ajouter une boutique' : 'Modifier la boutique',
          'boutiques.manage',
          shopFields,
          async (ctx, d) => {
            const member = await ctx.services.members.getMemberById(
              d.ownerMemberId,
            )
            if (!member) throw Error('Propriétaire introuvable.')
            const data = { ...d }
            delete data.photo
            const photo = await asset(ctx, 'photo')
            const payload = {
              ...data,
              ownerName:
                `${member.firstName || ''} ${member.lastName || ''}`.trim(),
              ownerMatricule: member.matricule || member.id,
              openingHours: d.openingHours?.map((day: any) => ({
                ...day,
                closed: !!day.closed,
                open: day.open || '',
                close: day.close || '',
              })),
              ...(photo ? { photoURL: photo.url, photoPath: photo.path } : {}),
            }
            return create
              ? ctx.services.shops.createShop(payload, actor(ctx).id)
              : ctx.services.shops.updateShop(ctx.id, payload, actor(ctx).id)
          },
          { scope: create ? 'workspace' : 'contract' },
        ),
      ),
      action(
        'shop.approve',
        'Approuver la boutique',
        'boutiques.manage',
        [],
        (ctx) =>
          ctx.services.shops.reviewShop(ctx.id, 'approved', actor(ctx).id),
      ),
      action(
        'shop.reject',
        'Refuser la boutique',
        'boutiques.manage',
        [reasonField()],
        (ctx, d) =>
          ctx.services.shops.reviewShop(
            ctx.id,
            'rejected',
            actor(ctx).id,
            d.reason,
          ),
      ),
      action(
        'shop.changes.approve',
        'Approuver les modifications proposées',
        'boutiques.manage',
        [],
        (ctx) =>
          ctx.services.shops.approveShopChanges(ctx.row as any, actor(ctx).id),
      ),
      action(
        'shop.changes.reject',
        'Refuser les modifications proposées',
        'boutiques.manage',
        [reasonField()],
        (ctx, d) =>
          ctx.services.shops.rejectShopChanges(ctx.id, actor(ctx).id, d.reason),
      ),
      action(
        'shop.photo.add',
        'Ajouter une photo à la galerie',
        'boutiques.manage',
        [imageField('photo', 'Photo', true)],
        async (ctx) => {
          if (!ctx.files.photo.type.startsWith('image/'))
            throw Error('Choisissez une image.')
          const photo = await asset(ctx, 'photo')
          await ctx.services.shops.updateShop(
            ctx.id,
            {
              gallery: [
                ...(ctx.row.gallery || []),
                { url: photo!.url, path: photo!.path },
              ],
            },
            actor(ctx).id,
          )
        },
      ),
      action(
        'shop.photo.remove',
        'Retirer une photo de la galerie',
        'boutiques.manage',
        [
          numberField(
            'photoIndex',
            'Numéro de la photo (première = 1)',
            1,
            100,
          ),
        ],
        async (ctx, d) => {
          const gallery = ctx.row.gallery || []
          if (!gallery[d.photoIndex - 1]) throw Error('Photo introuvable.')
          await ctx.services.shops.updateShop(
            ctx.id,
            {
              gallery: gallery.filter(
                (_: unknown, i: number) => i !== d.photoIndex - 1,
              ),
            },
            actor(ctx).id,
          )
        },
      ),
      action(
        'shop.delete',
        'Supprimer la boutique',
        'boutiques.manage',
        [reasonField()],
        async (ctx) => {
          await ctx.services.shops.deleteShop(ctx.id)
          return { deleted: true }
        },
        { destructive: true },
      ),
      ...communityActions(module, { ...dataset, key: 'partners' }),
    ]
  }
  if (module.key === 'vehicles') {
    if (dataset.key === 'partners')
      return [
        ...[true, false].map((create) =>
          action(
            create ? 'insurer.create' : 'insurer.update',
            create ? 'Ajouter un assureur' : 'Modifier les taux',
            'vehicules.edit',
            [
              textField('name', 'Assureur'),
              rate('commissionRate', 'Commission de l’assureur (%)'),
              rate('memberSharePercent', 'Part du parrain (%)'),
            ],
            (ctx, d) =>
              ctx.services.rewards.saveInsurancePartner(
                { ...d, ...(!create ? { id: ctx.id } : {}) },
                actor(ctx).id,
              ),
            { scope: create ? 'workspace' : 'contract' },
          ),
        ),
        action(
          'insurer.delete',
          'Supprimer l’assureur',
          'vehicules.edit',
          [reasonField()],
          async (ctx) => {
            await ctx.services.rewards.deleteInsurancePartner(ctx.id)
            return { deleted: true }
          },
          { destructive: true },
        ),
      ]
    if (dataset.key === 'rewards')
      return [
        action(
          'reward.received',
          'Commission reçue',
          'vehicules.edit',
          [
            moneyField(),
            rate('memberSharePercent', 'Part du parrain (%)'),
            dateField('receivedAt', 'Date de réception'),
            textField('reference', 'Référence', false),
          ],
          (ctx, d) =>
            ctx.services.rewards.recordPartnerReceipt(
              ctx.row as any,
              { ...d, receivedAt: asDate(d.receivedAt) },
              actor(ctx),
            ),
        ),
        action(
          'reward.pay',
          'Verser au parrain',
          'vehicules.edit',
          [
            dateField('paidAt', 'Date de versement'),
            selectField('mode', 'Moyen de versement', paymentModes),
            textField('reference', 'Référence', false),
            fileField('proof', 'Preuve du versement', false),
          ],
          async (ctx, d) => {
            const proof = await asset(ctx, 'proof')
            await ctx.services.rewards.recordMemberPayment(
              ctx.row as any,
              {
                paidAt: asDate(d.paidAt),
                mode: d.mode,
                reference: d.reference,
                proofUrl: proof?.url,
                proofPath: proof?.path,
              },
              actor(ctx),
            )
            await ctx.services.notifications
              .notifyMember({
                recipientId:
                  ctx.row.beneficiaryMatricule || ctx.row.beneficiaryId,
                module: 'vehicule',
                entityId: ctx.row.insuranceId,
                type: 'status_update',
                title: 'Reversement assurance versé',
                message: `LE KARA vous a versé ${Number(ctx.row.memberAmount).toLocaleString('fr-FR')} FCFA pour l'assurance du véhicule ${ctx.row.plateNumber || ''}.`,
                metadata: {
                  rewardId: ctx.id,
                  insuranceId: ctx.row.insuranceId,
                  amount: ctx.row.memberAmount,
                },
              })
              .catch(() => {})
          },
        ),
      ]
    const reward = async (ctx: AdminContext, id: string) => {
      const insurance = await ctx.services.vehicles.getById(id)
      if (insurance)
        await ctx.services.rewards.openRewardForPeriod(
          insurance,
          insurance.renewalCount || 0,
          actor(ctx).id,
        )
    }
    return [
      action(
        'insurance.reminder',
        'Préparer un rappel WhatsApp',
        'vehicules.view',
        [],
        async (ctx) => {
          const insurance = {
            ...ctx.row,
            startDate: asDate(ctx.row.startDate),
            endDate: asDate(ctx.row.endDate),
          } as any
          const phone = getInsuranceHolderPhone(insurance)
          if (!phone)
            throw Error('Aucun téléphone disponible pour ce titulaire.')
          const { key, variables } = insuranceReminderTemplate(insurance)
          const saved =
            (
              await ctx.services.db
                .collection('settings')
                .doc('messageTemplates')
                .get()
            ).data()?.templates || {}
          return {
            messages: [
              {
                name: getInsuranceHolderName(insurance),
                phone,
                text: renderTemplate(
                  saved[key] ||
                    MESSAGE_TEMPLATES.find((t) => t.key === key)?.defaultBody ||
                    '',
                  variables,
                ),
              },
            ],
          }
        },
        { readonly: true },
      ),
      ...[true, false].map((create) =>
        action(
          create ? 'insurance.create' : 'insurance.update',
          create ? 'Nouvelle assurance' : 'Modifier l’assurance',
          create ? 'vehicules.create' : 'vehicules.edit',
          insuranceFields,
          async (ctx, d) => {
            const payload = {
              ...d,
              currency: 'FCFA',
              startDate: asDate(d.startDate),
              endDate: asDate(d.endDate),
            }
            if (d.holderType === 'member') {
              const m = await ctx.services.members.getMemberById(d.memberId)
              if (!m) throw Error('Membre introuvable.')
              Object.assign(payload, {
                memberFirstName: m.firstName,
                memberLastName: m.lastName,
                memberContacts: m.contacts,
                memberMatricule: m.matricule || m.id,
              })
            }
            const sponsor = await ctx.services.members.getMemberById(
              d.sponsorMemberId,
            )
            if (!sponsor) throw Error('Parrain introuvable.')
            Object.assign(payload, {
              sponsorName: `${sponsor.firstName} ${sponsor.lastName}`.trim(),
              sponsorContacts: sponsor.contacts,
              sponsorMatricule: sponsor.matricule || sponsor.id,
            })
            const data = vehicleInsuranceFormSchema.parse(payload)
            const receipt = await asset(ctx, 'receipt')
            if (receipt)
              data.attachments = {
                ...data.attachments,
                receiptUrl: receipt.url,
                receiptPath: receipt.path,
              }
            if (create) {
              const id = await ctx.services.vehicles.createInsurance(
                data,
                actor(ctx).id,
              )
              await reward(ctx, id)
              return { id }
            }
            return ctx.services.vehicles.updateInsurance(
              ctx.id,
              data,
              actor(ctx).id,
            )
          },
          { scope: create ? 'workspace' : 'contract' },
        ),
      ),
      action(
        'insurance.renew',
        'Renouveler l’assurance',
        'vehicules.edit',
        [
          dateField('startDate', 'Début'),
          dateField('endDate', 'Fin'),
          moneyField('premiumAmount', 'Prime (FCFA)'),
          textField('policyNumber', 'Numéro de police', false),
        ],
        async (ctx, d) => {
          await ctx.services.vehicles.renewInsurance(
            ctx.id,
            {
              ...d,
              startDate: asDate(d.startDate),
              endDate: asDate(d.endDate),
            },
            actor(ctx).id,
          )
          await reward(ctx, ctx.id)
        },
      ),
      action(
        'insurance.validate',
        'Valider la déclaration',
        'vehicules.edit',
        [],
        async (ctx) => {
          const result = await ctx.services.vehicles.validateDeclaration(
            ctx.id,
            actor(ctx).id,
          )
          await reward(ctx, ctx.id)
          return result
        },
      ),
      action(
        'insurance.reject',
        'Refuser la déclaration',
        'vehicules.edit',
        [reasonField()],
        (ctx, d) =>
          ctx.services.vehicles.rejectDeclaration(
            ctx.id,
            d.reason,
            actor(ctx).id,
          ),
      ),
      action(
        'insurance.reward',
        'Ouvrir le reversement de cette période',
        'vehicules.edit',
        [],
        (ctx) => reward(ctx, ctx.id),
      ),
      action(
        'insurance.delete',
        'Supprimer l’assurance',
        'vehicules.delete',
        [reasonField()],
        async (ctx) => {
          await ctx.services.vehicles.deleteInsurance(ctx.id)
          return { deleted: true }
        },
        { destructive: true },
      ),
    ]
  }
  return []
}
