import { beforeEach, it, expect, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'
import { resolveAdminAccess } from '@/domains/auth/access-policy'
import type { IMemberOverviewRepository } from '@/domains/dashboard/member-overview/repositories/IMemberOverviewRepository'
const state = vi.hoisted(() => ({
  caller: null as any,
  repository: null as any,
}))
vi.mock('@/domains/mobile/server/access', () => ({
  requireMobileCaller: async () => state.caller,
  mobileJson: (body: unknown, status = 200) =>
    NextResponse.json(body, { status }),
}))
vi.mock('@/firebase/adminFirestore', () => ({ adminFirestore: {} }))
vi.mock('@/domains/finance/server/firestore-port', () => ({
  createServerFirestorePort: () => ({}),
}))
vi.mock(
  '@/domains/dashboard/member-overview/repositories/MemberOverviewRepository',
  () => ({
    createMemberOverviewRepository: () => ({
      MemberOverviewRepository: { getInstance: () => state.repository },
    }),
    MemberOverviewRepository: { getInstance: () => state.repository },
    coerceDate: (value: any) =>
      value ? new Date(value).toISOString() : undefined,
  }),
)
import { getMobileMemberOverview } from '../server/member-overview'

const request = () =>
  new NextRequest('http://localhost/api/mobile/member-overview/M1')
beforeEach(() => {
  state.caller = {
    claims: { uid: 'A1' },
    access: resolveAdminAccess(
      [{ role: 'Admin', permissions: ['members.view', 'creditFixe.view'] }],
      {},
    ),
    mustChangePassword: false,
  }
  state.repository = {
    getMemberById: vi.fn(async () => ({ id: 'M1', matricule: 'M1' })),
    ...Object.fromEntries(
      [
        'getCaisseSpecialeDemands',
        'getCaisseSpecialeContracts',
        'getCaisseImprevueDemands',
        'getCaisseImprevueContracts',
        'getCreditDemands',
        'getPlacementDemands',
        'getPlacements',
        'getCharityDeclarations',
        'getCharityContributions',
      ].map((name) => [name, vi.fn(async () => [])]),
    ),
    getCreditContracts: vi.fn(async () => [
      { id: 'FIXE-C1', status: 'CLOSED', amount: 20000 },
    ]),
    countClosedContracts: vi.fn(),
  } as unknown as IMemberOverviewRepository
})
it('respecte le refus d’authentification et le changement obligatoire de mot de passe', async () => {
  state.caller = NextResponse.json({}, { status: 401 })
  expect((await getMobileMemberOverview(request(), 'M1')).status).toBe(401)
  state.caller = {
    access: resolveAdminAccess([{ role: 'SuperAdmin' }], {}),
    mustChangePassword: true,
  }
  expect((await getMobileMemberOverview(request(), 'M1')).status).toBe(403)
  expect(state.repository.getMemberById).not.toHaveBeenCalled()
})
it('refuse le droit membres manquant, un identifiant invalide et un membre absent', async () => {
  state.caller.access = resolveAdminAccess(
    [{ role: 'Admin', permissions: [] }],
    {},
  )
  expect((await getMobileMemberOverview(request(), 'M1')).status).toBe(403)
  state.caller.access = resolveAdminAccess(
    [{ role: 'Admin', permissions: ['members.view'] }],
    {},
  )
  expect((await getMobileMemberOverview(request(), '../M1')).status).toBe(422)
  state.repository.getMemberById.mockResolvedValue(null)
  expect((await getMobileMemberOverview(request(), 'M1')).status).toBe(404)
})
it('ne lit et ne renvoie que les modules autorisés et conserve les identifiants clôturés', async () => {
  const response = await getMobileMemberOverview(request(), 'M1')
  const data = await response.json()
  expect(response.status).toBe(200)
  expect(data.modules.creditFixe.closedContracts[0]).toMatchObject({
    id: 'FIXE-C1',
    amount: 20000,
  })
  expect(data.modules.creditFixe.closedContrats).toBe(1)
  expect(data.modules.caisseSpeciale).toMatchObject({
    available: false,
    contrats: [],
    demandes: [],
  })
  expect(state.repository.getCaisseSpecialeContracts).not.toHaveBeenCalled()
  expect(state.repository.getCreditContracts).toHaveBeenCalledTimes(1)
  expect(state.repository.getCreditContracts).toHaveBeenCalledWith(
    'M1',
    'FIXE',
    8,
  )
})
it('ne divulgue pas les montants ou compteurs financiers aux agents de recouvrement', async () => {
  state.caller.access = {
    ...state.caller.access,
    restrictedRole: 'AgentRecouvrement',
    isAgent: true,
  }
  const data = await (await getMobileMemberOverview(request(), 'M1')).json()
  expect(data.modules.creditFixe.available).toBe(false)
  expect(data.modules.creditFixe.closedContrats).toBeUndefined()
  expect(JSON.stringify(data)).not.toContain('20000')
  expect(state.repository.getCreditContracts).not.toHaveBeenCalled()
})
