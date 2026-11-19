import { helpOverview } from './help-presentation'
import {
  activityRows,
  activityInsights,
  validateActivityQuery,
} from './activity-presentation'
import {
  archiveOverview,
  archiveRows,
  isArchive,
  validateArchiveFilters,
} from './archive-presentation'
import { isStaff, staffRow, staffOverview } from './staff-presentation'
import {
  isDirectory,
  directoryRows,
  directoryOverview,
} from './directory-presentation'
import {
  membershipOverview,
  membershipCardRows,
} from './membership-presentation'
import { PERMISSION_MODULES } from '@/constantes/permissions'
import {
  placementDocumentData,
  placementFields,
} from '../operations/placement-documents'
import { sectionFilters, sectionMetrics } from './filters'
import { z } from 'zod'
import { NextResponse, type NextRequest } from 'next/server'
import {
  canWithAccess,
  adminAccessRedirect,
  resolveAdminAccess,
} from '@/domains/auth/access-policy'
import {
  requireMobileCaller,
  mobileJson,
  type MobileCaller,
} from '@/domains/mobile/server/access'
import { findMobileSection } from '@/domains/mobile/sections'
import { identifier, type FinanceField } from '@/domains/finance/actions'
import { validateAdminFile } from './storage-port'
import {
  beginFinanceOperation,
  endFinanceOperation,
  financeFingerprint,
  FinanceRequestConflict,
} from '@/domains/finance/server/operations'
import { getAdminModule, type AdminModule, type Dataset } from '../catalog'
import { communityRows, communityInsights } from './community-presentation'
import { createAdminServices, type AdminServices } from './context'
import { adminActions } from '../operations'
import {
  actionSchema,
  publicAdminAction,
  safePublicRecord,
  redactAdminAmounts,
  type AdminAction,
  type AdminContext,
} from './registry'
import {
  filterRows,
  readRows,
  relatedRows,
  title,
  plain,
  normalized,
} from './read-model'
export const listSchema = z
  .object({
    directorySort: z.enum(['nameAsc', 'nameDesc', 'recent']).optional(),
    provinceId: identifier.optional(),
    departmentId: identifier.optional(),
    communeId: identifier.optional(),
    districtId: identifier.optional(),
    staffRole: z
      .enum([
        'SuperAdmin',
        'Admin',
        'Secretary',
        'AgentRecouvrement',
        'GestionnaireVehicules',
      ])
      .optional(),
    agentTab: z.enum(['birthdays']).optional(),
    staffSort: z
      .enum(['nameAsc', 'nameDesc', 'firstAsc', 'firstDesc', 'recent'])
      .optional(),
    dataset: identifier.optional(),
    search: z.string().max(180).default(''),
    status: z.string().max(80).default(''),
    page: z.coerce.number().int().min(1).max(10000).default(1),
    limit: z.coerce.number().int().min(1).max(200).default(25),
    declarationView: z.enum(['approved', 'pending']).optional(),
    payoutMode: z
      .enum(['MonthlyCommission_CapitalEnd', 'CapitalPlusCommission_End'])
      .optional(),
    contractState: z.enum(['present', 'missing']).optional(),
    durationRange: z.enum(['short', 'long']).optional(),
    overdue: z.enum(['true']).optional(),
    commissionMonth: z
      .string()
      .regex(/^\d{4}-\d{2}$/)
      .optional(),
    nextFrom: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    nextTo: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    minAmount: z.coerce.number().nonnegative().optional(),
    maxAmount: z.coerce.number().nonnegative().optional(),
    fileFormat: z.enum(['pdf', 'word', 'excel', 'image', 'text']).optional(),
    ...Object.fromEntries(
      ['createdFrom', 'createdTo', 'updatedFrom', 'updatedTo'].map((k) => [
        k,
        z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .optional(),
      ]),
    ),
    sort: z
      .enum([
        'recent',
        'amountAsc',
        'amountDesc',
        'nextDate',
        'nameAsc',
        'nameDesc',
        'dateAsc',
        'dateDesc',
      ])
      .optional(),
    projectKind: z.enum(['TONTINE', 'PURCHASE', 'OTHER']).optional(),
    projectStatus: z
      .enum(['PLANNED', 'ACTIVE', 'COMPLETED', 'CANCELLED'])
      .optional(),
    shopTab: z.enum(['pending', 'published', 'hidden']).optional(),
    eventTab: z
      .enum(['upcoming', 'poll_open', 'draft', 'past', 'cancelled'])
      .optional(),
    memberId: identifier.optional(),
    parentId: identifier.optional(),
    ...Object.fromEntries(
      [
        'membershipType',
        'nationality',
        'province',
        'city',
        'district',
        'companyName',
        'profession',
        'insuranceCompany',
        'vehicleType',
        'holderType',
        'declarationStatus',
        'category',
        'channel',
        'outcome',
        'adminId',
        'product',
        'action',
        'module',
        'mode',
        'paymentType',
        'sourceType',
        'type',
      ].map((k) => [k, z.string().max(180).optional()]),
    ),
    isSubscriptionValid: z.enum(['true', 'false']).optional(),
    birthdayPeriod: z
      .enum(['today', 'week', 'upcoming', 'recent', 'nearby'])
      .optional(),
    birthdayMonths: z
      .string()
      .regex(/^(?:[1-9]|1[0-2])(?:,(?:[1-9]|1[0-2])){0,9}$/)
      .optional(),
    hasCar: z.enum(['true', 'false']).optional(),
    isPaid: z.enum(['true', 'false']).optional(),
    isActive: z.enum(['true', 'false']).optional(),
    birthdayMonth: z.coerce.number().int().min(1).max(12).optional(),
    sponsorMemberId: identifier.optional(),
    from: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    to: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
  })
  .strict()
export function canAction(caller: MobileCaller, a: AdminAction) {
  return (
    (!a.superAdminOnly || caller.access.isSuperAdmin) &&
    canWithAccess(caller.access, a.permission) &&
    (a.requiredPermissions || []).every((p) => canWithAccess(caller.access, p))
  )
}
export async function adminAccess(request: NextRequest, key: string) {
  const module = getAdminModule(key),
    section = findMobileSection(key)
  if (!module || !section)
    return mobileJson({ error: 'Section inconnue.' }, 404)
  const caller = await requireMobileCaller(request)
  if (caller instanceof NextResponse) return caller
  if (caller.mustChangePassword)
    return mobileJson(
      { error: 'Choisissez votre mot de passe personnel avant de continuer.' },
      403,
    )
  if (
    (section.superAdminOnly && !caller.access.isSuperAdmin) ||
    (section.permission && !canWithAccess(caller.access, section.permission)) ||
    adminAccessRedirect(section.path, caller.access)
  )
    return mobileJson(
      { error: 'Vos accès ne permettent pas d’ouvrir cette section.' },
      403,
    )
  return { module, caller, services: createAdminServices(caller) }
}
export function errorResponse(error: unknown) {
  if (error instanceof z.ZodError)
    return mobileJson(
      {
        error: error.issues
          .map((i) => `${i.path.join('.')} : ${i.message}`)
          .join('\n')
          .slice(0, 1200),
      },
      422,
    )
  if (error instanceof FinanceRequestConflict)
    return mobileJson({ error: error.message }, 409)
  return mobileJson(
    {
      error:
        error instanceof Error && !('code' in error)
          ? error.message.slice(0, 400)
          : 'Le service est temporairement indisponible. Actualisez avant de réessayer.',
    },
    400,
  )
}
export const datasetOf = (module: AdminModule, key?: string) => {
  const d = key
    ? module.datasets.find((d) => d.key === key)
    : module.datasets[0]
  if (!d) throw Error('Onglet inconnu.')
  return d
}
export async function getAdminWorkspace(request: NextRequest, key: string) {
  const access = await adminAccess(request, key)
  if (access instanceof NextResponse) return access
  try {
    const input = listSchema.parse(
      Object.fromEntries(request.nextUrl.searchParams),
    )
    if (isStaff(key)) validateArchiveFilters(input)
    if (['placements', 'vehicles', 'bienfaiteur'].includes(key))
      validateActivityQuery(input)
    const dataset = datasetOf(access.module, input.dataset)
    const all = await readRows(
      access.services,
      access.module,
      dataset,
      access.caller,
    )
    const selected = filterRows(all, input, key)
    const counts = new Map<string, number>()
    for (const r of all) {
      const k = String(
        r.status ??
          (r.actif === false || r.isActive === false ? 'inactive' : 'active'),
      )
      counts.set(k, (counts.get(k) || 0) + 1)
    }
    const actions = adminActions(access.module, dataset)
      .filter((a) => a.scope === 'workspace' && canAction(access.caller, a))
      .map((a) => publicAdminAction(a))
    const batchMembership = [
      'members',
      'member-requests',
      'birthdays',
    ].includes(key)
    const overview =
      batchMembership && dataset.key !== 'duplicates'
        ? membershipOverview(key, all)
        : undefined
    const cardRows =
      batchMembership && dataset.key !== 'duplicates'
        ? await membershipCardRows(
            access.services,
            key,
            selected.slice(
              (input.page - 1) * input.limit,
              input.page * input.limit,
            ),
          )
        : selected.slice(
            (input.page - 1) * input.limit,
            input.page * input.limit,
          )
    if (key === 'groups')
      await Promise.all(
        cardRows.map(async (row) => {
          const count = await access.services.db
            .collection('users')
            .where('groupIds', 'array-contains', row.id)
            .count()
            .get()
          row.memberCount = count.data().count
        }),
      )
    const duplicateCount =
      key === 'member-requests' && dataset.key !== 'duplicates'
        ? (await access.services.duplicates.getUnresolvedGroups()).length
        : undefined
    return mobileJson(
      safePublicRecord({
        module: key,
        title: access.module.label,
        dataset: dataset.key,
        datasets: access.module.datasets.map((d) => ({
          key: d.key,
          label: d.label,
        })),
        overview,
        help: key === 'help' ? helpOverview(all) : undefined,
        directory: isDirectory(key)
          ? await directoryOverview(access.services, key, all)
          : undefined,
        staff: isStaff(key)
          ? redactAdminAmounts(
              await staffOverview(
                access.services,
                access.caller,
                key,
                dataset.key,
                all,
                selected,
              ),
              access.caller.access.restrictedRole !== 'AgentRecouvrement',
            )
          : undefined,
        archive: isArchive(key)
          ? redactAdminAmounts(
              archiveOverview(key, all, selected, input),
              access.caller.access.restrictedRole !== 'AgentRecouvrement',
            )
          : undefined,
        insights: ['shops', 'events'].includes(key)
          ? communityInsights(key, all)
          : ['placements', 'vehicles', 'bienfaiteur'].includes(key)
            ? activityInsights(key, dataset.key, all)
            : undefined,
        duplicateCount,
        canDownload: canWithAccess(access.caller.access, 'documents.download'),
        items: cardRows.map((r) =>
          redactAdminAmounts(
            {
              ...r,
              displayName:
                isArchive(key) || isStaff(key) || isDirectory(key)
                  ? r.displayName
                  : title(r),
              ...(isStaff(key) || isDirectory(key)
                ? {
                    availableActions: visibleActions(
                      access.caller,
                      access.module,
                      dataset,
                      r,
                    ).map((a) => a.id),
                  }
                : {}),
              ...(batchMembership
                ? {
                    availableActions: visibleActions(
                      access.caller,
                      access.module,
                      dataset,
                      r,
                    ).map((a) => a.id),
                  }
                : {}),
            },
            access.caller.access.restrictedRole !== 'AgentRecouvrement',
          ),
        ),
        total: selected.length,
        more: input.page * input.limit < selected.length,
        actions,
        statuses: [...counts].map(([value, count]) => ({
          value,
          label: value,
          count,
        })),
        metrics: sectionMetrics(access.module, dataset, all, selected),
        filters: sectionFilters(access.module, dataset, all).map(
          ({ schema: _schema, ...f }) => f,
        ),
        canExport:
          canWithAccess(
            access.caller.access,
            `${access.module.permission}.export`,
          ) ||
          (['references', 'geography', 'groups', 'journal'].includes(key) &&
            canWithAccess(
              access.caller.access,
              `${access.module.permission}.${key === 'journal' ? 'view' : 'manage'}`,
            )),
      }),
    )
  } catch (e) {
    return errorResponse(e)
  }
}
export async function readTarget(
  services: AdminServices,
  module: AdminModule,
  dataset: Dataset,
  id: string,
  caller: MobileCaller,
) {
  identifier.parse(id)
  if (dataset.virtual || module.key === 'birthdays') {
    const row = (await readRows(services, module, dataset, caller)).find(
      (r) => r.id === id,
    )
    if (!row) throw Error('Fiche introuvable.')
    return row
  }
  const snap = await services.db.collection(dataset.collection).doc(id).get()
  if (!snap.exists) throw Error('Fiche introuvable.')
  const row = { ...plain(snap.data()), id: snap.id }
  if (
    ['members', 'birthdays'].includes(module.key) &&
    (!Array.isArray(row.roles) ||
      !row.roles.some((role: string) =>
        ['Adherant', 'Bienfaiteur', 'Sympathisant'].includes(role),
      ))
  )
    throw Error('Membre introuvable.')
  if (
    module.key === 'calls' &&
    dataset.key === 'plans' &&
    !caller.access.isSuperAdmin &&
    row.assignee?.adminId &&
    row.assignee.adminId !== caller.claims.uid &&
    row.assignee.email !== caller.claims.email
  )
    throw Error('Cet appel est attribué à un autre administrateur.')
  return row
}
export function visibleActions(
  caller: MobileCaller,
  module: AdminModule,
  dataset: Dataset,
  row: any,
) {
  return adminActions(module, dataset)
    .filter((a) => a.scope === 'contract' && canAction(caller, a))
    .filter((a) => {
      if (a.id === 'request.payment') return !row.isPaid
      if (a.id === 'request.approve')
        return !!row.isPaid && ['pending', 'under_review'].includes(row.status)
      if (a.id === 'request.reopen') return row.status === 'rejected'
      if (a.id === 'request.code') return row.status === 'under_review'
      if (a.id === 'request.pdf')
        return row.status === 'approved' && !!row.isPaid
      if (a.id === 'request.reject' || a.id === 'request.corrections')
        return ['pending', 'under_review'].includes(row.status)
      if (a.id === 'event.publish' || a.id === 'event.delete')
        return row.status === 'draft'
      if (a.id === 'event.location') return row.status === 'poll_open'
      if (a.id === 'event.cancel')
        return !['completed', 'cancelled'].includes(row.status)
      if (a.id === 'agent.deactivate') return row.actif !== false
      if (a.id === 'agent.reactivate') return row.actif === false
      if (a.id === 'admin.delete') return row.id !== caller.claims.uid
      if (
        a.id === 'plan.complete' ||
        a.id === 'plan.reschedule' ||
        a.id === 'plan.batch.reschedule'
      )
        return row.status === 'planned'
      if (a.id === 'demand.approve' || a.id === 'demand.reject')
        return row.status === 'PENDING'
      if (a.id === 'demand.reopen') return row.status === 'REJECTED'
      if (a.id === 'demand.convert')
        return row.status === 'APPROVED' && !row.placementId
      if (a.id === 'insurance.validate' || a.id === 'insurance.reject')
        return row.declarationStatus === 'pending'
      if (a.id === 'reward.pay') return row.status === 'TO_PAY'
      if (a.id === 'reward.received') return row.status !== 'PAID'
      if (
        a.id === 'shop.approve' ||
        a.id === 'shop.reject' ||
        a.id === 'article.approve' ||
        a.id === 'article.reject'
      )
        return row.status === 'pending'
      if (a.id.startsWith('shop.changes.')) return !!row.pendingChanges
      return true
    })
    .map((a) =>
      caller.access.isSuperAdmin
        ? a
        : { ...a, fields: a.fields.filter((f) => f.key !== 'schedulePromise') },
    )
}
export async function getAdminDetail(
  request: NextRequest,
  key: string,
  id: string,
) {
  const access = await adminAccess(request, key)
  if (access instanceof NextResponse) return access
  try {
    const { dataset: ds } = z
      .object({ dataset: identifier.optional() })
      .strict()
      .parse(Object.fromEntries(request.nextUrl.searchParams))
    const dataset = datasetOf(access.module, ds)
    const row = await readTarget(
      access.services,
      access.module,
      dataset,
      id,
      access.caller,
    )
    if (isArchive(key))
      Object.assign(row, (await archiveRows(access.services, key, [row]))[0])
    if (isStaff(key)) Object.assign(row, staffRow(key, row))
    if (isDirectory(key))
      Object.assign(
        row,
        (await directoryRows(access.services, key, dataset.key, [row]))[0],
      )
    Object.assign(
      row,
      (await activityRows(access.services, key, dataset.key, [row]))[0],
    )
    Object.assign(
      row,
      plain((await communityRows(access.services, key, dataset.key, [row]))[0]),
    )
    if (key === 'members' && row.dossier) {
      const dossier = await access.services
        .memberships('')
        .repository.getById(row.dossier)
      if (dossier?.identity?.beneficiary)
        row.beneficiary = dossier.identity.beneficiary
    }
    if (key === 'members') {
      const enriched =
        await access.services.memberDatabase.enrichWithSubscriptionsBatch([
          row,
        ] as any)
      Object.assign(row, plain(enriched[0]))
    }
    const beneficiary =
      key === 'members'
        ? row.beneficiary
        : key === 'member-requests'
          ? row.identity?.beneficiary
          : undefined
    if (beneficiary?.matricule && !beneficiary.isUnknown) {
      const member = await access.services.users.getUserById(
        beneficiary.matricule,
      )
      if (member)
        Object.assign(beneficiary, {
          firstName: member.firstName,
          lastName: member.lastName,
        })
    }
    const editedAccess =
      key === 'admins' ? resolveAdminAccess([row], {}) : undefined
    return mobileJson(
      safePublicRecord({
        module: key,
        dataset: dataset.key,
        record: redactAdminAmounts(
          {
            ...row,
            displayName:
              isStaff(key) || isDirectory(key) ? row.displayName : title(row),
            ...(key === 'admins'
              ? {
                  effectivePermissions: editedAccess?.permissionsDefined
                    ? editedAccess.permissions
                    : PERMISSION_MODULES.flatMap((m) =>
                        m.actions.map((a) => a.key),
                      ),
                }
              : {}),
          },
          access.caller.access.restrictedRole !== 'AgentRecouvrement',
        ),
        directory:
          key === 'geography'
            ? await directoryOverview(access.services, key, [row])
            : undefined,
        staff:
          key === 'admins'
            ? await staffOverview(
                access.services,
                access.caller,
                key,
                dataset.key,
                [row],
                [row],
              )
            : undefined,
        actions: visibleActions(access.caller, access.module, dataset, row).map(
          (a) =>
            publicAdminAction(a, {
              ...row,
              ...(key === 'admins'
                ? {
                    role: row.roles?.[0],
                    phone: row.contacts?.[0],
                    permissions: (editedAccess?.permissionsDefined
                      ? editedAccess.permissions
                      : PERMISSION_MODULES.flatMap((m) =>
                          m.actions.map((a) => a.key),
                        )
                    ).map((permission: string) => ({
                      permission,
                    })),
                  }
                : {}),
              ...(key === 'members' || key === 'member-requests'
                ? {
                    ...(key === 'members'
                      ? { beneficiaryId: row.beneficiary?.matricule }
                      : {}),
                    identity: row.identity
                      ? {
                          ...row.identity,
                          photo: row.identity.photoURL || row.identity.photo,
                          beneficiaryId: row.identity.beneficiary?.matricule,
                        }
                      : undefined,
                    documents: row.documents
                      ? {
                          ...row.documents,
                          documentPhotoFront:
                            row.documents.documentPhotoFrontURL ||
                            row.documents.documentPhotoFront,
                          documentPhotoBack:
                            row.documents.documentPhotoBackURL ||
                            row.documents.documentPhotoBack,
                        }
                      : undefined,
                  }
                : {}),
            }),
        ),
        related: redactAdminAmounts(
          await relatedRows(access.services, access.module, row, access.caller),
          access.caller.access.restrictedRole !== 'AgentRecouvrement',
        ),
        canExport:
          key === 'groups' &&
          canWithAccess(access.caller.access, 'groups.manage'),
        canDownload: canWithAccess(access.caller.access, 'documents.download'),
      }),
    )
  } catch (e) {
    return errorResponse(e)
  }
}
function fileKeys(
  fields: FinanceField[],
  values: Record<string, any>,
  prefix = '',
): string[] {
  return fields.flatMap((f) =>
    f.kind === 'file'
      ? [prefix + f.key]
      : f.fields
        ? f.kind === 'rows' && Array.isArray(values[f.key])
          ? values[f.key].flatMap((row: Record<string, any>, index: number) =>
              fileKeys(f.fields!, row, prefix + f.key + '.' + index + '.'),
            )
          : fileKeys(f.fields, values[f.key] || {}, prefix + f.key + '.')
        : [],
  )
}
function requireSubmittedFiles(
  fields: FinanceField[],
  values: Record<string, any>,
  files: Record<string, File>,
  prefix = '',
) {
  for (const f of fields) {
    const path = prefix + f.key
    if (f.kind === 'file' && values[f.key] === true && !files[path])
      throw Error(`Ajoutez « ${f.label} ».`)
    if (f.fields && values[f.key]) {
      if (f.kind === 'rows')
        values[f.key].forEach((row: Record<string, any>, i: number) =>
          requireSubmittedFiles(f.fields!, row, files, path + '.' + i + '.'),
        )
      else requireSubmittedFiles(f.fields, values[f.key], files, path + '.')
    }
  }
}
export async function postAdminAction(
  request: NextRequest,
  key: string,
  id: string,
) {
  const access = await adminAccess(request, key)
  if (access instanceof NextResponse) return access
  let operation: Awaited<ReturnType<typeof beginFinanceOperation>> | undefined
  try {
    identifier.parse(id)
    const { dataset: ds } = z
      .object({ dataset: identifier.optional() })
      .strict()
      .parse(Object.fromEntries(request.nextUrl.searchParams))
    const dataset = datasetOf(access.module, ds)
    if (
      Number(request.headers.get('content-length') || 0) >
      (key === 'bienfaiteur' ? 64 : 24) * 1024 * 1024
    )
      throw Error('Le formulaire et ses fichiers dépassent 24 Mo.')
    const files: Record<string, File> = {}
    let raw: any
    if (request.headers.get('content-type')?.includes('application/json'))
      raw = await request.json()
    else {
      const form = await request.formData()
      const payload = form.get('payload')
      if (typeof payload !== 'string' || payload.length > 200000)
        throw Error('Formulaire invalide.')
      raw = {
        action: form.get('action'),
        operationId: form.get('operationId'),
        payload: JSON.parse(payload),
      }
      let size = 0
      for (const [key, value] of form.entries()) {
        if (['action', 'operationId', 'payload'].includes(key)) continue
        if (typeof value === 'string' || files[key])
          throw Error('Pièce jointe invalide.')
        size += value.size
        if (size > (key === 'bienfaiteur' ? 60 : 20) * 1024 * 1024)
          throw Error('Les fichiers dépassent 20 Mo.')
        await validateAdminFile(value, key === 'bienfaiteur')
        files[key] = value
      }
    }
    const input = z
      .object({
        action: z.string().max(100),
        operationId: z.string().uuid(),
        payload: z.record(z.string(), z.unknown()),
      })
      .strict()
      .parse(raw)
    const action = adminActions(access.module, dataset).find(
      (a) => a.id === input.action,
    )
    if (!action) return mobileJson({ error: 'Opération inconnue.' }, 404)
    if (!canAction(access.caller, action))
      return mobileJson({ error: 'Opération non autorisée.' }, 403)
    const row =
      action.scope === 'workspace'
        ? {}
        : await readTarget(
            access.services,
            access.module,
            dataset,
            id,
            access.caller,
          )
    if (action.scope === 'workspace' && id !== 'new')
      throw Error('Référence de création invalide.')
    const allowed = fileKeys(action.fields, input.payload)
    if (Object.keys(files).some((k) => !allowed.includes(k)))
      throw Error('Fichier inattendu pour cette opération.')
    if (
      action.scope === 'contract' &&
      !visibleActions(access.caller, access.module, dataset, row).some(
        (a) => a.id === action.id,
      )
    )
      throw Error('Cette opération n’est pas disponible pour le statut actuel.')
    const data = actionSchema(action).parse(input.payload) as Record<
      string,
      any
    >
    requireSubmittedFiles(action.fields, data, files)
    if (!action.readonly) {
      operation = await beginFinanceOperation(
        access.services.db,
        access.caller.claims.uid,
        input.operationId,
        `admin:${key}:${dataset.key}:${id === 'new' ? access.caller.claims.uid : id}`,
        await financeFingerprint(
          {
            key,
            dataset: dataset.key,
            id,
            action: action.id,
            payload: input.payload,
          },
          files,
        ),
      )
      if (operation.replay)
        return mobileJson({
          success: true,
          replay: true,
          result: operation.result,
        })
    }
    const ctx: AdminContext = {
      ...access,
      dataset,
      id,
      row,
      files,
      operationId: input.operationId,
      token:
        request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') || '',
    }
    const result = plain((await action.run(ctx, data)) ?? { success: true })
    if (operation)
      await endFinanceOperation(
        access.services.db,
        operation.operation,
        operation.lock,
        'DONE',
        action.sensitiveResult ? { success: true } : result,
      )
    if (!action.readonly)
      await access.services
        .audit({
          adminName:
            ctx.caller.claims.name ||
            ctx.caller.claims.email ||
            ctx.caller.claims.uid,
          action: action.id.includes('delete')
            ? 'delete'
            : action.scope === 'workspace'
              ? 'create'
              : 'update',
          module: access.module.permission,
          targetId: result?.id || id,
          description: action.label,
          source: 'mobile-native',
          operationId: input.operationId,
        })
        .catch(() => {})
    return mobileJson({ success: true, result })
  } catch (e) {
    if (operation && !operation.replay)
      await endFinanceOperation(
        access.services.db,
        operation.operation,
        operation.lock,
        'FAILED',
      ).catch(() => {})
    return errorResponse(e)
  }
}
export async function getAdminChoices(request: NextRequest, key: string) {
  const access = await adminAccess(request, key)
  if (access instanceof NextResponse) return access
  try {
    const input = z
      .object({
        dataset: identifier.optional(),
        source: z.string().max(80),
        search: z.string().max(180).default(''),
        contractId: identifier.optional(),
      })
      .strict()
      .parse(Object.fromEntries(request.nextUrl.searchParams))
    const dataset = datasetOf(access.module, input.dataset)
    const sources = (fields: FinanceField[]): string[] =>
      fields.flatMap((f) => [
        ...(f.source ? [f.source] : []),
        ...(f.fields ? sources(f.fields) : []),
      ])
    const allowed = adminActions(access.module, dataset)
      .filter((a) => canAction(access.caller, a))
      .flatMap((a) => sources(a.fields))
    const filterSources = sectionFilters(access.module, dataset, []).flatMap(
      (f) => (f.source ? [f.source] : []),
    )
    allowed.push(...filterSources)
    if (access.caller.access.isSuperAdmin && key === 'members')
      allowed.push('members')
    if (!allowed.includes(input.source))
      return mobileJson({ error: 'Recherche non autorisée.' }, 403)
    const record = input.contractId
      ? await readTarget(
          access.services,
          access.module,
          dataset,
          input.contractId,
          access.caller,
        )
      : undefined
    let rows: any[] = []
    if (
      [
        'projects',
        'eventLocations',
        'groupMembers',
        'commissions',
        'agreements',
        'agreementPayments',
        'agreementRemittances',
        'subscriptions',
        'charityParticipants',
        'charityContributions',
        'charityMedia',
        'charityDeclarations',
        'contributions',
        'documentFields',
      ].includes(input.source)
    ) {
      if (!record) throw Error('Ouvrez d’abord le dossier concerné.')
      if (input.source === 'documentFields') {
        const data = await placementDocumentData(access.services, record.id)
        const fields = ['contract', 'quittance', 'early-quittance'].flatMap(
          (type) => placementFields(data, type),
        )
        const unique = [...new Map(fields.map((f) => [f.key, f])).values()]
        return mobileJson({
          items: unique
            .filter((f) =>
              normalized(f.label).includes(normalized(input.search)),
            )
            .map((f) => ({ value: f.key, label: f.label })),
        })
      }
      if (input.source === 'contributions') {
        const snap = await access.services.db
          .collection(`groups/${record.id}/contributions`)
          .get()
        rows = snap.docs.map((d) => ({ ...plain(d.data()), id: d.id }))
      } else if (input.source.startsWith('charity')) {
        const col = (
          {
            charityParticipants: 'participants',
            charityContributions: 'contributions',
            charityMedia: 'media',
          } as Record<string, string>
        )[input.source]
        const query =
          input.source === 'charityDeclarations'
            ? access.services.db
                .collection('charityContributions')
                .where('eventId', '==', record.id)
            : access.services.db.collection(
                `charity-events/${record.id}/${col}`,
              )
        const snap = await query.get()
        rows = snap.docs.map((d) => ({ ...plain(d.data()), id: d.id }))
      } else if (input.source === 'subscriptions')
        rows = plain(
          await access.services.subscriptions.getSubscriptionsByUserId(
            record.id,
          ),
        )
      else if (input.source === 'projects') rows = record.projects || []
      else if (input.source === 'eventLocations')
        rows = record.proposedLocations || []
      else if (input.source === 'commissions')
        rows = plain(
          await access.services.placementService.listCommissions(record.id),
        )
      else if (input.source === 'groupMembers') {
        const snap = await access.services.db
          .collection('users')
          .where('groupIds', 'array-contains', record.id)
          .get()
        rows = snap.docs.map((d) => ({ ...plain(d.data()), id: d.id }))
      } else {
        const snap = await access.services.db
          .collection(`groups/${record.id}/agreements`)
          .get()
        const agreements = snap.docs.map((d) => ({
          ...plain(d.data()),
          id: d.id,
        }))
        rows =
          input.source === 'agreements'
            ? agreements
            : agreements.flatMap(
                (a) =>
                  (input.source === 'agreementPayments'
                    ? a.payments
                    : a.remittances) || [],
              )
      }
    } else {
      const collections: Record<string, string> = {
        admins: 'admins',
        members: 'users',
        groups: 'groups',
        shops: 'shops',
        provinces: 'provinces',
        departments: 'departments',
        communes: 'communes',
        districts: 'districts',
        quarters: 'quarters',
        companies: 'companies',
        professions: 'professions',
        charities: 'charity-events',
        creditDemands: 'creditDemands',
        creditContracts: 'creditContracts',
        callLogs: 'callLogs',
      }
      const col = collections[input.source]
      if (!col) throw Error('Recherche inconnue.')
      const snap = await access.services.db.collection(col).limit(10001).get()
      if (snap.size > 10000) throw Error('Trop de résultats.')
      rows = snap.docs.map((d) => ({ ...plain(d.data()), id: d.id }))
      if (input.source === 'members')
        rows = rows.filter(
          (r) =>
            Array.isArray(r.roles) &&
            r.roles.some((role: string) =>
              ['Adherant', 'Bienfaiteur', 'Sympathisant'].includes(role),
            ),
        )
    }
    return mobileJson({
      items: rows
        .filter((r) =>
          normalized([title(r), r.id, r.contacts].join(' ')).includes(
            normalized(input.search),
          ),
        )
        .slice(0, 100)
        .map((r) => ({
          value: r.id,
          label: `${title(r)}${r.amount ? ` · ${Number(r.amount).toLocaleString('fr-FR')} FCFA` : ''}${r.matricule ? ` · ${r.matricule}` : ''}`,
        })),
    })
  } catch (e) {
    return errorResponse(e)
  }
}
