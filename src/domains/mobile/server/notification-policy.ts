import {
  canWithAccess,
  type ResolvedAdminAccess,
} from '@/domains/auth/access-policy'

type Row = Record<string, any>
const permissions: Record<string, string> = {
  memberships: 'members.view',
  vehicule: 'vehicules.view',
  caisse_speciale: 'caisseSpeciale.view',
  caisse_imprevue: 'caisseImprevue.view',
  bienfaiteur: 'bienfaiteur.view',
  placement: 'placements.view',
  credit_speciale: 'creditSpeciale.view',
  credit_fixe: 'creditFixe.view',
  credit_aide: 'creditAide.view',
  boutique: 'boutiques.view',
  'member-requests': 'memberRequests.view',
}
const isMembershipRequest = (row: Row) =>
  row.module === 'memberships' &&
  (!!row.metadata?.requestId ||
    /^(new_request|corrections_|security_code_|membership_)/.test(row.type))
export const notificationScope = (row: Row) =>
  row.type === 'birthday_reminder'
    ? 'birthdays'
    : isMembershipRequest(row)
      ? 'member-requests'
      : row.module === 'credit_speciale' && row.metadata?.creditType === 'FIXE'
        ? 'credit_fixe'
        : row.module === 'credit_speciale' &&
            row.metadata?.creditType === 'AIDE'
          ? 'credit_aide'
          : row.module
export function notificationScopes(access: ResolvedAdminAccess) {
  if (access.isSuperAdmin || !access.permissionsDefined) return ['*']
  return Object.entries({ ...permissions, birthdays: 'birthdays.view' })
    .filter(([, p]) => canWithAccess(access, p))
    .map(([module]) => module)
}
export function canReadNotification(access: ResolvedAdminAccess, row: Row) {
  if (typeof row.recipientId === 'string' && row.recipientId.length)
    return false
  const scopes = notificationScopes(access)
  return scopes.includes('*') || scopes.includes(notificationScope(row))
}
const identifier = (value: unknown): value is string =>
  typeof value === 'string' &&
  !!value &&
  value.length <= 240 &&
  !/[\\/]/.test(value)
export function notificationTarget(access: ResolvedAdminAccess, row: Row) {
  const meta = row.metadata || {},
    id = meta.contractId || row.contractId || row.entityId
  const section = (section: string) => ({ screen: 'section', section })
  const record = (module: string, dataset: string, id: unknown) =>
    identifier(id) ? { screen: 'record', module, dataset, id } : null
  if (row.type === 'birthday_reminder')
    return canWithAccess(access, 'birthdays.view') ? section('birthdays') : null
  if (row.module === 'memberships') {
    const request = isMembershipRequest(row)
    const allowed = canWithAccess(
      access,
      request ? 'memberRequests.view' : 'members.view',
    )
    return allowed
      ? record(
          request ? 'member-requests' : 'members',
          request ? 'requests' : 'members',
          meta.requestId || row.entityId,
        )
      : null
  }
  const finance: Record<string, [string, string]> = {
    caisse_speciale: ['caisse-speciale', 'caisseSpeciale.view'],
    caisse_imprevue: ['caisse-imprevue', 'caisseImprevue.view'],
    credit_speciale: ['credit-speciale', 'creditSpeciale.view'],
    credit_fixe: ['credit-fixe', 'creditFixe.view'],
    credit_aide: ['caisse-aide', 'creditAide.view'],
  }
  const scope = notificationScope(row)
  if (finance[scope]) {
    const [module, permission] = finance[scope]
    if (
      !canWithAccess(access, permission) ||
      access.restrictedRole === 'AgentRecouvrement'
    )
      return null
    const demand =
      !meta.contractId &&
      (!!meta.demandId ||
        /demand/.test(row.type) ||
        row.type === 'new_request') &&
      !/converted/.test(row.type)
    const targetId = demand
      ? meta.demandId || meta.requestId || row.entityId
      : id
    return identifier(targetId)
      ? {
          screen: 'finance',
          module,
          id: targetId,
          kind: demand ? 'demand' : 'contract',
        }
      : null
  }
  if (row.module === 'placement' && canWithAccess(access, 'placements.view')) {
    const demand = /demand/.test(row.type) && !/converted/.test(row.type)
    return record(
      'placements',
      demand ? 'demands' : 'contracts',
      demand ? meta.demandId || row.entityId : meta.placementId || row.entityId,
    )
  }
  if (row.module === 'vehicule' && canWithAccess(access, 'vehicules.view'))
    if (meta.prospectId) return record('vehicles', 'prospects', meta.prospectId)
    else
    return {
      ...section('vehicles'),
      declarationView: row.type === 'vehicle_declared' ? 'pending' : 'approved',
    }
  if (row.module === 'boutique' && canWithAccess(access, 'boutiques.view'))
    return { ...section('shops'), shopTab: 'pending' }
  if (row.module === 'bienfaiteur' && canWithAccess(access, 'bienfaiteur.view'))
    return section('bienfaiteur')
  return null
}
export function publicNotification(
  id: string,
  row: Row,
  access: ResolvedAdminAccess,
) {
  const date = row.createdAt?.toDate?.() || row.createdAt
  const valid = date ? new Date(date) : null
  return {
    id,
    module:
      row.module === 'credit_speciale'
        ? notificationScope(row)
        : String(row.module || ''),
    type: String(row.type || ''),
    title: String(row.title || 'Notification LE KARA'),
    message: String(row.message || ''),
    isRead: row.isRead === true,
    createdAt:
      valid && Number.isFinite(valid.getTime()) ? valid.toISOString() : null,
    daysUntil:
      typeof row.metadata?.daysUntil === 'number'
        ? row.metadata.daysUntil
        : null,
    target: notificationTarget(access, row),
  }
}
