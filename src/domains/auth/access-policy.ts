import {
  effectivePermissions, firstAccessiblePath, isOpenToRestrictedRole,
  requiredActionPermissionForPath, requiredViewPermissionForPath, restrictedRoleOf,
} from '@/constantes/permissions'

export interface ResolvedAdminAccess {
  isSuperAdmin: boolean
  isAgent: boolean
  restrictedRole: string | null
  permissions: string[]
  permissionsDefined: boolean
}

const roleNames = (data: Record<string, unknown>) => [
  ...(Array.isArray(data.roles) ? data.roles : []), data.role,
].filter((value): value is string => typeof value === 'string')
const normalizeRole = (role: string) => role.toLowerCase().replace(/[^a-z]/g, '')
export const hasAdminRole = (data: Record<string, unknown>) => data.admin === true || roleNames(data).some(role =>
  ['admin', 'superadmin', 'secretary', 'administrateur', 'agentrecouvrement', 'gestionnairevehicules'].includes(normalizeRole(role)))

/** Même priorité des fiches et mêmes règles, côté serveur et côté navigateur. */
export function resolveAdminAccess(accountDocs: Record<string, unknown>[], claims: Record<string, unknown>): ResolvedAdminAccess {
  const sources = [...accountDocs, claims]
  const isSuperAdmin = sources.some(data => roleNames(data).some(role => normalizeRole(role) === 'superadmin'))
  const restrictedRole = isSuperAdmin ? null : sources.map(data =>
    restrictedRoleOf(Array.isArray(data.roles) ? data.roles : null, data.role)).find(Boolean) ?? null
  const permissionDoc = accountDocs.find(data => Array.isArray(data.permissions))
  const permissionsDefined = !!permissionDoc || !!restrictedRole
  const permissions = effectivePermissions(
    ((permissionDoc?.permissions ?? []) as unknown[]).filter((key): key is string => typeof key === 'string'),
    { restrictedRole, version: typeof permissionDoc?.permissionsVersion === 'number' ? permissionDoc.permissionsVersion : undefined },
  )
  return { isSuperAdmin, isAgent: !!restrictedRole, restrictedRole, permissions, permissionsDefined }
}

export function canWithAccess(access: ResolvedAdminAccess, permission: string): boolean {
  return access.isSuperAdmin || !access.permissionsDefined || access.permissions.includes(permission)
}

/** null signifie autorisé. Les refus arrivent sur une page effectivement
 * ouverte, sans passer par l'affichage fugitif d'une page interdite. */
export function adminAccessRedirect(path: string, access: ResolvedAdminAccess): string | null {
  if (access.isSuperAdmin) return null
  const home = access.isAgent ? firstAccessiblePath(key => canWithAccess(access, key)) ?? '/aide' : '/dashboard'
  const isDashboard = path === '/dashboard' || path.startsWith('/dashboard/')
  if (access.isAgent && isDashboard) return home
  if (['/bilans-financiers', '/reinitialisation'].some(prefix => path === prefix || path.startsWith(`${prefix}/`))) return home
  const view = requiredViewPermissionForPath(path)
  const action = requiredActionPermissionForPath(path)
  if (view && !canWithAccess(access, view) || action && !canWithAccess(access, action)) return home
  if (!view && !action && access.isAgent && !isOpenToRestrictedRole(path)) return home
  return null
}
