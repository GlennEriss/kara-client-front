// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'
const mock = vi.hoisted(() => ({ docs: new Map<string, Record<string, unknown>>(), fail: false }))
vi.mock('@/firebase/adminFirestore', () => ({ adminFirestore: {
  collection: (name: string) => ({
    doc: (id: string) => ({ get: async () => {
      if (mock.fail) throw new Error('indisponible')
      return { id, exists: mock.docs.has(`${name}/${id}`), data: () => mock.docs.get(`${name}/${id}`) }
    } }),
    where: (_field: string, _op: string, email: string) => ({ get: async () => ({ docs: [...mock.docs].filter(([path, data]) => path.startsWith(`${name}/`) && data.email === email).map(([path, data]) => ({ id: path.split('/')[1], data: () => data })) }) }),
  }),
} }))
import { loadAdminAccess } from '../admin-access'
beforeEach(() => { mock.docs.clear(); mock.fail = false })
describe('résolution serveur des accès', () => {
  it('retrouve une fiche historique par email et applique ses permissions explicites', async () => {
    mock.docs.set('admins/matricule', { email: 'admin@example.com', roles: ['Admin'], permissionsVersion: 2, permissions: ['groups.view'] })
    expect(await loadAdminAccess({ uid: 'uid-firebase', email: 'Admin@example.com' })).toMatchObject({ permissionsDefined: true, permissions: ['groups.view'], isSuperAdmin: false })
  })
  it('refuse un compte membre et ne convertit jamais une panne de lecture en accès complet', async () => {
    mock.docs.set('users/member', { roles: ['Adherant'] })
    expect(await loadAdminAccess({ uid: 'member', role: 'Adherant' })).toBeNull()
    mock.fail = true
    await expect(loadAdminAccess({ uid: 'admin', role: 'Admin' })).rejects.toThrow('indisponible')
  })
})
