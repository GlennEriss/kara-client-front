import { describe, expect, it } from 'vitest'
import { adminAccessRedirect, canWithAccess, resolveAdminAccess } from './access-policy'

describe('politique commune des accès admin', () => {
  it('conserve les accès historiques et distingue une liste vide explicitement enregistrée', () => {
    const legacy = resolveAdminAccess([{ roles: ['Admin'] }], {})
    expect(canWithAccess(legacy, 'groups.manage')).toBe(true)
    const restricted = resolveAdminAccess([{ roles: ['Admin'], permissions: [], permissionsVersion: 2 }], {})
    expect(canWithAccess(restricted, 'groups.view')).toBe(false)
    expect(adminAccessRedirect('/groups', restricted)).toBe('/dashboard')
  })
  it('respecte les modèles des rôles restreints et les personnalisations de version 2', () => {
    const agent = resolveAdminAccess([], { role: 'AgentRecouvrement' })
    expect(adminAccessRedirect('/dashboard', agent)).toBe('/calendrier')
    expect(adminAccessRedirect('/groups', agent)).toBe('/calendrier')
    expect(adminAccessRedirect('/calendrier', agent)).toBeNull()
    const vehicle = resolveAdminAccess([{ roles: ['GestionnaireVehicules'], permissionsVersion: 2, permissions: ['vehicules.view'] }], {})
    expect(adminAccessRedirect('/dashboard', vehicle)).toBe('/vehicules')
    expect(adminAccessRedirect('/vehicules/v1/edit', vehicle)).toBe('/vehicules')
  })
  it('conserve tous les accès du SuperAdmin même avec une ancienne liste vide', () => {
    const access = resolveAdminAccess([{ roles: ['AgentRecouvrement'], permissions: [] }], { role: 'SuperAdmin' })
    expect(access.isAgent).toBe(false)
    expect(adminAccessRedirect('/bilans-financiers', access)).toBeNull()
  })
  it('utilise les droits réels des modules sans action view', () => {
    const access = resolveAdminAccess([{ permissionsVersion: 2, permissions: ['settings.manage', 'imports.use'] }], { role: 'Admin' })
    expect(adminAccessRedirect('/caisse-imprevue/settings', access)).toBeNull()
    expect(adminAccessRedirect('/import-membres', access)).toBeNull()
  })
})
