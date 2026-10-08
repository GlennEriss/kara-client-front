import type { CreditContract } from '@/types/types'

export interface ShopCreditStats {
  shopId: string
  shopName: string
  sales: number
  /** Prix financés (montant des crédits). */
  financed: number
  /** Déjà versé aux vendeurs. */
  paidToVendors: number
  /** Reste à verser aux vendeurs (contrats signés ou non). */
  dueToVendors: number
  /** Remises obtenues sur les ventes dont le vendeur est réglé. */
  discountEarned: number
  /** Intérêts prévus sur ces crédits. */
  interest: number
  /** Remboursé par les membres acheteurs. */
  repaid: number
}

const IGNORED_STATUSES = new Set(['DRAFT', 'EXTENDED'])

/** Suivi des achats à crédit par boutique partenaire. */
export function computeShopCreditStats(contracts: CreditContract[]): ShopCreditStats[] {
  const byShop = new Map<string, ShopCreditStats>()

  for (const contract of contracts) {
    const purchase = contract.shopPurchase
    if (!purchase || IGNORED_STATUSES.has(contract.status)) continue

    const stats = byShop.get(purchase.shopId) ?? {
      shopId: purchase.shopId,
      shopName: purchase.shopName,
      sales: 0,
      financed: 0,
      paidToVendors: 0,
      dueToVendors: 0,
      discountEarned: 0,
      interest: 0,
      repaid: 0,
    }
    const vendorPaid = purchase.vendorStatus !== 'PENDING'
    stats.sales += 1
    stats.financed += purchase.price
    stats.paidToVendors += vendorPaid ? purchase.vendorAmount : 0
    stats.dueToVendors += vendorPaid ? 0 : purchase.vendorAmount
    stats.discountEarned += vendorPaid ? purchase.price - purchase.vendorAmount : 0
    stats.interest += Math.max(0, (contract.totalAmount ?? 0) - contract.amount)
    stats.repaid += contract.amountPaid ?? 0
    byShop.set(purchase.shopId, stats)
  }

  return [...byShop.values()].sort((left, right) => right.financed - left.financed)
}
