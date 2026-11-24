/* eslint-disable no-restricted-imports -- Adaptateur mobile vers les services métier existants du site, injectés par requête. */
import { z } from 'zod'
import { NextRequest } from 'next/server'
import { createElement } from 'react'
import { renderToBuffer } from '@react-pdf/renderer'
import { IdentifiantsMembrePDF } from '@/domains/memberships/components/IdentifiantsMembrePDF'
import { POST as createAccount } from '@/app/api/auth/create-admin/by-email/route'
import { POST as updateAccount } from '@/app/api/auth/update-admin/route'
import { POST as resetAccount } from '@/app/api/auth/admin/reset-admin-password/route'
import { POST as deleteAccount } from '@/app/api/firebase/auth/delete-user/route'
import { adminCreateSchema } from '@/schemas/schemas'
import {
  PERMISSION_MODULES,
  effectivePermissions,
  PERMISSIONS_VERSION,
  restrictedRoleOf,
} from '@/constantes/permissions'
import { STAFF_ROLES } from '@/types/types'
import {
  CALL_OUTCOME_LABELS,
  CONTACT_CHANNEL_LABELS,
} from '@/services/call-logs/callLog'
import {
  textField,
  idField,
  dateField,
  moneyField,
  boolField,
  fileField,
  field,
  reasonField,
  asDate,
} from '@/domains/finance/actions'
import {
  rows,
  select,
  birthDate,
  textArea,
  type AdminModule,
  type Dataset,
} from '../catalog'
import { actor, type AdminAction, type AdminContext } from '../server/registry'
const adminFields = [
  select('civility', 'Civilité', ['Monsieur', 'Madame', 'Mademoiselle']),
  textField('lastName', 'Nom'),
  textField('firstName', 'Prénom'),
  birthDate('birthDate', 'Date de naissance'),
  select('gender', 'Sexe', ['Homme', 'Femme']),
  textField('email', 'Email'),
  textField('phone', 'Téléphone (+241…)'),
  select('role', 'Rôle', [...STAFF_ROLES]),
  rows(
    'permissions',
    'Autorisations',
    [
      field(
        'permission',
        'Autorisation',
        'select',
        z.enum(
          PERMISSION_MODULES.flatMap((m) => m.actions.map((a) => a.key)) as [
            string,
            ...string[],
          ],
        ),
        {
          options: PERMISSION_MODULES.flatMap((m) =>
            m.actions.map((a) => ({
              value: a.key,
              label: `${m.label} · ${a.label}`,
            })),
          ),
        },
      ),
    ],
    true,
  ),
  fileField('photo', 'Photo de profil', false),
  boolField('removePhoto', 'Retirer la photo enregistrée'),
]
async function accountRequest(
  ctx: AdminContext,
  handler: typeof createAccount,
  data: unknown,
) {
  const req = new NextRequest('http://localhost/api/auth/native-account', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${ctx.token}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify(data),
  })
  const response = await handler(req)
  const result = await response.json()
  if (!response.ok)
    throw Error(result.error || 'Traitement du compte impossible.')
  return result
}
async function credentials(
  matricule: string,
  email: string,
  temporaryPassword: string,
) {
  const doc = await renderToBuffer(
    createElement<any>(IdentifiantsMembrePDF, {
      recipient: 'administrateur',
      data: {
        matricule,
        email,
        identifiant: email || matricule,
        motDePasse: temporaryPassword,
      },
    }),
  )
  return {
    documents: [
      {
        base64: doc.toString('base64'),
        mime: 'application/pdf',
        filename: `identifiants-admin-${matricule}.pdf`,
      },
    ],
  }
}
export function administrationActions(
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
  if (module.key === 'admins')
    return [
      action(
        'admin.public-contact.update',
        'Modifier les coordonnées publiques',
        'settings.manage',
        [
          textField('memberWhatsappNumber', 'WhatsApp des membres'),
          textField('guestWhatsappNumber', 'WhatsApp des invités'),
        ],
        async (ctx, d) => {
          const normalize = (v: string) => '+' + v.replace(/\D/g, '')
          const memberWhatsappNumber = normalize(d.memberWhatsappNumber),
            guestWhatsappNumber = normalize(d.guestWhatsappNumber)
          if (
            [memberWhatsappNumber, guestWhatsappNumber].some(
              (v) => v.replace(/\D/g, '').length < 8 || v.length > 16,
            )
          )
            throw Error(
              'Vérifiez les deux numéros WhatsApp au format international.',
            )
          await ctx.services.db
            .collection('settings')
            .doc('publicContact')
            .set(
              {
                memberWhatsappNumber,
                guestWhatsappNumber,
                updatedAt: new Date(),
                updatedBy: actor(ctx).id,
              },
              { merge: true },
            )
          return { message: 'Coordonnées publiques enregistrées.' }
        },
        { scope: 'workspace' },
      ),
      action(
        'admin.delete',
        'Supprimer cet administrateur',
        'admins.manage',
        [reasonField()],
        async (ctx) => {
          if (ctx.id === actor(ctx).id)
            throw Error('Vous ne pouvez pas supprimer votre propre compte.')
          await accountRequest(ctx, deleteAccount, { uid: ctx.id })
          if (!(await ctx.services.adminAccounts.deleteAdmin(ctx.id)))
            throw Error('Suppression impossible.')
          return { deleted: true }
        },
        { destructive: true, superAdminOnly: true },
      ),
      ...[true, false].map((create) =>
        action(
          create ? 'admin.create' : 'admin.update',
          create ? 'Ajouter un administrateur' : 'Modifier cet administrateur',
          'admins.manage',
          adminFields,
          async (ctx, d) => {
            if (
              ctx.files.photo &&
              !['image/jpeg', 'image/png', 'image/webp'].includes(
                ctx.files.photo.type,
              )
            )
              throw Error('La photo doit être une image JPEG, PNG ou WebP.')
            const photo = ctx.files.photo
              ? await ctx.services.documents.uploadDocumentFile(
                  ctx.files.photo,
                  ctx.id === 'new' ? actor(ctx).id : ctx.id,
                  'ADMIN_PHOTO',
                )
              : undefined
            const roles =
              !create && d.role === ctx.row.roles?.[0]
                ? ctx.row.roles
                : [d.role]
            const values = adminCreateSchema.parse({
              ...d,
              contacts: [d.phone],
              roles,
              permissions: roles.includes('SuperAdmin') || roles.includes('AgentProspection')
                ? []
                : effectivePermissions((d.permissions || []).map((r: any) => r.permission), {
                    version: PERMISSIONS_VERSION,
                    restrictedRole: restrictedRoleOf(roles),
                  }),
            })
            const id = create
              ? await ctx.services.users.generateMatricule()
              : ctx.id
            const response = await accountRequest(
              ctx,
              create ? createAccount : updateAccount,
              {
                ...values,
                uid: id,
                role: roles.includes('SuperAdmin') ? 'SuperAdmin' : d.role,
                phoneNumber: d.phone,
                photoURL:
                  photo?.url || (d.removePhoto ? undefined : ctx.row.photoURL),
              },
            )
            const payload = {
              ...values,
              permissionsVersion: PERMISSIONS_VERSION,
              ...(photo ? { photoURL: photo.url, photoPath: photo.path } : {}),
              ...(d.removePhoto && !photo
                ? { photoURL: null, photoPath: null }
                : {}),
              ...(create
                ? {
                    isActive: true,
                    mustChangePassword: true,
                    createdBy: actor(ctx).id,
                  }
                : { updatedBy: actor(ctx).id }),
            }
            if (create)
              await ctx.services.adminAccounts.createAdminWithId(
                id,
                payload as any,
              )
            else if (
              !(await ctx.services.adminAccounts.updateAdmin(id, payload))
            )
              throw Error('La fiche administrateur n’a pas été enregistrée.')
            return create
              ? {
                  id,
                  ...(await credentials(
                    id,
                    d.email,
                    response.temporaryPassword,
                  )),
                }
              : { id }
          },
          {
            scope: create ? 'workspace' : 'contract',
            superAdminOnly: true,
            sensitiveResult: create,
          },
        ),
      ),
      action(
        'admin.password.reset',
        'Réinitialiser le mot de passe',
        'admins.manage',
        [reasonField()],
        async (ctx) => {
          const result = await accountRequest(ctx, resetAccount, {
            adminId: ctx.id,
          })
          return credentials(
            ctx.id,
            result.email || ctx.row.email,
            result.temporaryPassword,
          )
        },
        { superAdminOnly: true, sensitiveResult: true },
      ),
      action(
        'admin.active.update',
        'Changer l’état du compte',
        'admins.manage',
        [boolField('isActive', 'Compte actif')],
        async (ctx, d) => {
          if (ctx.id === actor(ctx).id && !d.isActive)
            throw Error('Vous ne pouvez pas désactiver votre propre compte.')
          if (
            !(await ctx.services.adminAccounts.updateAdmin(ctx.id, {
              isActive: !!d.isActive,
            }))
          )
            throw Error('Modification impossible.')
        },
        { superAdminOnly: true },
      ),
    ]
  if (module.key !== 'calls') return []
  const contactFields = [
    {
      ...select('channel', 'Canal', Object.keys(CONTACT_CHANNEL_LABELS)),
      options: Object.entries(CONTACT_CHANNEL_LABELS).map(([value, label]) => ({
        value,
        label,
      })),
    },
    {
      ...select('outcome', 'Résultat', Object.keys(CALL_OUTCOME_LABELS)),
      options: Object.entries(CALL_OUTCOME_LABELS).map(([value, label]) => ({
        value,
        label,
      })),
    },
    {
      ...textArea('summary', 'Compte rendu'),
      schema: z
        .string()
        .trim()
        .min(5, 'Le compte rendu doit contenir au moins 5 caractères.'),
    },
    {
      ...field(
        'promiseDate',
        'Date promise / rappel',
        'date',
        z.string().optional(),
      ),
      initial: '',
    },
    moneyField('promiseAmount', 'Montant promis (FCFA)', false),
    boolField(
      'schedulePromise',
      'Planifier la relance à la date promise (Super Admin)',
    ),
  ]
  const record = async (ctx: AdminContext, d: any) => {
    if (d.outcome === 'promesse_paiement' && !d.promiseDate)
      throw Error('Renseignez la date promise.')
    if (d.schedulePromise && !ctx.caller.access.isSuperAdmin)
      throw Error('Seul un Super Administrateur peut planifier une relance.')
    const logId = await ctx.services.callLogs.createCallLog({
      personKey:
        ctx.row.personKey || ctx.row.memberId || ctx.row.matricule || ctx.id,
      memberId: ctx.row.memberId,
      groupId: ctx.row.groupId,
      matricule: ctx.row.matricule,
      name: ctx.row.name || ctx.row.memberName || ctx.row.id,
      isGroup: !!ctx.row.isGroup,
      product: ctx.row.product || '',
      channel: d.channel,
      outcome: d.outcome,
      summary: d.summary,
      totalOverdue: ctx.row.totalOverdue || 0,
      overdueCount: ctx.row.overdueCount || 0,
      maxDaysOverdue: ctx.row.maxDaysOverdue || 0,
      promiseToPayAt:
        d.outcome === 'promesse_paiement' && d.promiseDate
          ? asDate(d.promiseDate)
          : undefined,
      promiseAmount:
        d.outcome === 'promesse_paiement' ? d.promiseAmount : undefined,
      adminId: actor(ctx).id,
      adminName: actor(ctx).name,
    })
    if (d.outcome === 'promesse_paiement' && d.schedulePromise)
      await ctx.services.callPlans.createCallPlanBatch({
        scheduledDate: d.promiseDate,
        targets: [
          {
            ...ctx.row,
            isGroup: !!ctx.row.isGroup,
            product: ctx.row.product || '',
            totalOverdue: ctx.row.totalOverdue || 0,
            overdueCount: ctx.row.overdueCount || 0,
            maxDaysOverdue: ctx.row.maxDaysOverdue || 0,
            name: ctx.row.name || ctx.row.memberName || ctx.id,
            personKey: ctx.row.personKey || ctx.row.memberId || ctx.id,
          },
        ],
        createdById: actor(ctx).id,
        createdByName: actor(ctx).name,
        createdByEmail: ctx.caller.claims.email,
        sourceCallLogId: logId,
      })
    return logId
  }
  const resolveAssignee = async (ctx: AdminContext, id?: string) => {
    if (!id) return undefined
    const admin = await ctx.services.adminAccounts.getAdminById(id)
    if (!admin || !admin.isActive) throw Error('Administrateur indisponible.')
    return {
      adminId: admin.id,
      email: admin.email || '',
      name: `${admin.firstName} ${admin.lastName}`.trim(),
    }
  }
  const targetOf = (row: Record<string, any>) => ({
    personKey: row.personKey,
    memberId: row.memberId,
    groupId: row.groupId,
    matricule: row.matricule,
    name: row.name,
    isGroup: !!row.isGroup,
    product: row.product,
    phone: row.phone,
    whatsappNumber: row.whatsappNumber,
    totalOverdue: row.totalOverdue || 0,
    overdueCount: row.overdueCount || 0,
    maxDaysOverdue: row.maxDaysOverdue || 0,
  })
  const schedule = action(
    'call.schedule',
    'Planifier une nouvelle relance',
    'calendar.view',
    [
      dateField('scheduledDate', 'Date de relance'),
      idField(
        'assigneeId',
        'Administrateur chargé de la relance',
        'admins',
        false,
      ),
    ],
    async (ctx, d) => {
      let assignee
      if (d.assigneeId) {
        const admin = await ctx.services.adminAccounts.getAdminById(
          d.assigneeId,
        )
        if (!admin || !admin.isActive)
          throw Error('Administrateur indisponible.')
        assignee = {
          adminId: admin.id,
          email: admin.email || '',
          name: `${admin.firstName} ${admin.lastName}`.trim(),
        }
      }
      return {
        count: await ctx.services.callPlans.createCallPlanBatch({
          scheduledDate: d.scheduledDate,
          targets: [
            {
              personKey: ctx.row.personKey,
              memberId: ctx.row.memberId,
              groupId: ctx.row.groupId,
              matricule: ctx.row.matricule,
              name: ctx.row.name,
              isGroup: !!ctx.row.isGroup,
              product: ctx.row.product,
              phone: ctx.row.phone,
              whatsappNumber: ctx.row.whatsappNumber,
              totalOverdue: ctx.row.totalOverdue || 0,
              overdueCount: ctx.row.overdueCount || 0,
              maxDaysOverdue: ctx.row.maxDaysOverdue || 0,
            },
          ],
          assignee,
          createdById: actor(ctx).id,
          createdByName: actor(ctx).name,
          createdByEmail: ctx.caller.claims.email,
          sourceCallLogId: dataset.key === 'logs' ? ctx.id : undefined,
        }),
      }
    },
  )
  schedule.superAdminOnly = true
  if (dataset.key === 'logs')
    return [
      schedule,
      action(
        'call.batch.schedule',
        'Planifier un lot de relances',
        'calendar.view',
        [
          dateField('scheduledDate', 'Date de relance'),
          idField(
            'assigneeId',
            'Administrateur chargé des relances',
            'admins',
            false,
          ),
          rows('targets', 'Personnes à relancer', [
            idField('logId', 'Compte rendu de référence', 'callLogs'),
          ]),
        ],
        async (ctx, d) => {
          const ids = [...new Set<string>(d.targets.map((r: any) => r.logId))]
          const logs = await Promise.all(
            ids.map((id) =>
              ctx.services.db.collection('callLogs').doc(id).get(),
            ),
          )
          if (logs.some((log) => !log.exists))
            throw Error('Un compte rendu sélectionné est introuvable.')
          const targets = logs.map((log) => targetOf(log.data()!))
          if (targets.some((t) => !t.personKey || !t.name))
            throw Error(
              'Un compte rendu ne permet pas d’identifier la personne à relancer.',
            )
          return {
            count: await ctx.services.callPlans.createCallPlanBatch({
              scheduledDate: d.scheduledDate,
              targets,
              assignee: await resolveAssignee(ctx, d.assigneeId),
              createdById: actor(ctx).id,
              createdByName: actor(ctx).name,
              createdByEmail: ctx.caller.claims.email,
            }),
          }
        },
        { scope: 'workspace', superAdminOnly: true },
      ),
      action(
        'call.record',
        'Ajouter un compte rendu',
        'calendar.view',
        contactFields,
        async (ctx, d) => ({ id: await record(ctx, d) }),
      ),
    ]
  return [
    schedule,
    action(
      'plan.batch.reschedule',
      'Reporter tous les appels non terminés de ce lot',
      'calendar.view',
      [dateField('scheduledDate', 'Nouvelle date'), reasonField()],
      async (ctx, d) => {
        if (!ctx.row.batchId)
          throw Error('Cet appel ne fait pas partie d’un lot.')
        return {
          count: await ctx.services.callPlans.rescheduleCallPlan({
            batchId: ctx.row.batchId,
            scheduledDate: d.scheduledDate,
            reason: d.reason,
            byId: actor(ctx).id,
            byName: actor(ctx).name,
          }),
        }
      },
      { superAdminOnly: true },
    ),
    action(
      'plan.complete',
      'Enregistrer le compte rendu et terminer',
      'calendar.view',
      contactFields,
      async (ctx, d) => {
        if (ctx.row.status !== 'planned')
          throw Error('Cet appel est déjà terminé.')
        const callLogId = await record(ctx, d)
        await ctx.services.callPlans.completeCallPlan(ctx.id, {
          callLogId,
          completedById: actor(ctx).id,
          completedByName: actor(ctx).name,
        })
        return { callLogId }
      },
    ),
    action(
      'plan.reschedule',
      'Reporter cet appel',
      'calendar.view',
      [dateField('scheduledDate', 'Nouvelle date'), reasonField()],
      (ctx, d) =>
        ctx.services.callPlans.rescheduleCallPlan({
          id: ctx.id,
          scheduledDate: d.scheduledDate,
          reason: d.reason,
          byId: actor(ctx).id,
          byName: actor(ctx).name,
        }),
      { superAdminOnly: true },
    ),
    action(
      'plan.delete',
      'Supprimer cet appel planifié',
      'calendar.view',
      [reasonField()],
      (ctx) => ctx.services.callPlans.deleteCallPlan(ctx.id),
      { destructive: true, superAdminOnly: true },
    ),
  ]
}
