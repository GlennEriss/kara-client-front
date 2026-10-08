import { describe, expect, it } from 'vitest'
import type { CreditContract } from '@/types/types'
import { computeShopCreditStats } from '@/utils/shop-credit-stats'

const contract = (overrides: Partial<CreditContract>) =>
  ({
    status: 'ACTIVE',
    amount: 100_000,
    totalAmount: 110_000,
    amountPaid: 0,
    ...overrides,
  }) as CreditContract

const purchase = (shopId: string, vendorStatus: 'PENDING' | 'PAID' | 'DELIVERED') => ({
  shopId,
  shopName: `Boutique ${shopId}`,
  article: 'Article',
  price: 100_000,
  discountPercent: 5,
  vendorAmount: 95_000,
  vendorStatus,
})

describe('suivi des achats à crédit par boutique', () => {
  it('agrège ventes, règlements, remises et intérêts', () => {
    const stats = computeShopCreditStats([
      contract({ shopPurchase: purchase('a', 'DELIVERED'), amountPaid: 55_000 }),
      contract({ shopPurchase: purchase('a', 'PENDING') }),
      contract({ shopPurchase: purchase('b', 'PAID') }),
      contract({}),
    ])

    expect(stats).toHaveLength(2)
    expect(stats.find((s) => s.shopId === 'a')).toMatchObject({
      sales: 2,
      financed: 200_000,
      paidToVendors: 95_000,
      dueToVendors: 95_000,
      discountEarned: 5_000,
      interest: 20_000,
      repaid: 55_000,
    })
  })

  it('ignore les contrats remplacés', () => {
    expect(computeShopCreditStats([contract({ status: 'EXTENDED', shopPurchase: purchase('a', 'PAID') })])).toEqual([])
  })
})
