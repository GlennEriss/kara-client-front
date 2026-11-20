import { describe, expect, it, vi } from 'vitest'
vi.mock('@/domains/mobile/server/access', () => ({
  mobileJson: vi.fn(),
  requireMobileCaller: vi.fn(),
}))
import { canFinanceAction, guardFinanceTarget } from '../server/authorization'
vi.mock('../server/read-model', () => ({
  readFinanceTarget: vi.fn().mockResolvedValue({
    id: 'contract',
    contractType: 'INDIVIDUAL',
    creditType: 'SPECIALE',
  }),
}))
import { publicAction } from '../actions'
import { financeActions } from '../registry'
const caller = (permissions: string[], isSuperAdmin = false) =>
  ({
    claims: { uid: 'admin' },
    access: {
      permissions,
      permissionsDefined: true,
      isSuperAdmin,
      isAgent: false,
      restrictedRole: null,
    },
    mustChangePassword: false,
  }) as any
// Registry tests import actual service types only; no network calls or finance writes.
describe('permissions et références des opérations natives', () => {
  it('transmet les champs imbriqués sans sérialiser le schéma serveur', () => {
    const action = financeActions('caisse-speciale').find(
      (item) => item.id === 'demand.create',
    )!
    const dto = publicAction(action)
    const contact = dto.fields.find((item) => item.key === 'emergencyContact')!
    expect(contact.fields?.length).toBeGreaterThan(0)
    expect(JSON.stringify(dto)).not.toContain('schema')
    expect(JSON.stringify(dto)).not.toContain('~standard')
  })
  it('distingue lecture, paiement et suppression réservée au superadmin', () => {
    const actions = financeActions('caisse-speciale'),
      pay = actions.find((a) => a.id === 'payment.create')!,
      del = actions.find((a) => a.id === 'contract.delete')!
    expect(canFinanceAction(caller(['caisseSpeciale.view']), pay)).toBe(false)
    expect(canFinanceAction(caller(['caisseSpeciale.payment']), pay)).toBe(true)
    expect(canFinanceAction(caller(['caisseSpeciale.delete']), del)).toBe(false)
    expect(canFinanceAction(caller([], true), del)).toBe(true)
  })
  it.each(['paymentId', 'penaltyId', 'guarantorPaymentId'])(
    'refuse un identifiant enfant provenant d’un autre contrat (%s)',
    async (key) => {
      const services = {
        creditPayments: {
          getPaymentsByCreditId: vi.fn().mockResolvedValue([{ id: 'owned' }]),
        },
        creditPenalties: {
          getPenaltiesByCreditId: vi.fn().mockResolvedValue([{ id: 'owned' }]),
        },
        guarantorPayments: {
          getPaymentsByCreditId: vi.fn().mockResolvedValue([{ id: 'owned' }]),
        },
      }
      const action = financeActions('credit-speciale').find(
        (a) => a.id === 'payment.update',
      )!
      await expect(
        guardFinanceTarget(
          services as any,
          'credit-speciale',
          action,
          'contract',
          { [key]: 'foreign' },
          caller([], true),
        ),
      ).rejects.toThrow('contrat')
    },
  )
  it('valide les montants et rejette les rôles injectés dans les formulaires', () => {
    const action = financeActions('credit-speciale').find(
      (a) => a.id === 'payment.create',
    )!
    const input = {
      month: 1,
      amount: 100,
      date: '2026-11-17',
      time: '12:30',
      mode: 'cash',
    }
    expect(action.schema.safeParse(input).success).toBe(true)
    expect(
      action.schema.safeParse({ ...input, adminId: 'superadmin' }).success,
    ).toBe(false)
    expect(action.schema.safeParse({ ...input, amount: -100 }).success).toBe(
      false,
    )
    expect(
      action.schema.safeParse({ ...input, date: '2026-02-31' }).success,
    ).toBe(false)
  })
})
