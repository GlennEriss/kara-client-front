'use client'

import { useMemo } from 'react'
import { HandCoins } from 'lucide-react'

import { useCreditContracts } from '@/hooks/useCreditSpeciale'
import { computeShopCreditStats } from '@/utils/shop-credit-stats'

const fcfa = (value: number) => `${Math.round(value).toLocaleString('fr-FR')} FCFA`

/**
 * Suivi des achats à crédit par boutique partenaire : ce que l'association a
 * financé, versé aux vendeurs, et ce qu'elle y gagne (remises + intérêts).
 */
export default function ShopCreditSales() {
  const { data: contracts = [], isLoading } = useCreditContracts({ creditType: 'SPECIALE' })
  const stats = useMemo(() => computeShopCreditStats(contracts), [contracts])

  if (isLoading || stats.length === 0) return null

  const totals = stats.reduce(
    (acc, row) => ({
      sales: acc.sales + row.sales,
      financed: acc.financed + row.financed,
      dueToVendors: acc.dueToVendors + row.dueToVendors,
      gain: acc.gain + row.discountEarned + row.interest,
    }),
    { sales: 0, financed: 0, dueToVendors: 0, gain: 0 },
  )

  return (
    <div className="space-y-3 rounded-xl border border-emerald-100 bg-white p-3 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-sm font-semibold text-[#234D65]">
          <HandCoins className="h-4 w-4 text-emerald-600" /> Achats à crédit en boutique
        </p>
        <p className="text-xs text-gray-500">
          {totals.sales} vente{totals.sales > 1 ? 's' : ''} · {fcfa(totals.financed)} financés · gain prévu{' '}
          <span className="font-semibold text-emerald-700">{fcfa(totals.gain)}</span>
          {totals.dueToVendors > 0 && (
            <>
              {' '}· <span className="font-semibold text-amber-700">{fcfa(totals.dueToVendors)} à verser</span>
            </>
          )}
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="text-left text-[10px] uppercase tracking-wider text-gray-400">
            <tr>
              <th className="py-1.5 pr-3">Boutique</th>
              <th className="py-1.5 pr-3 text-right">Ventes</th>
              <th className="py-1.5 pr-3 text-right">Financé</th>
              <th className="py-1.5 pr-3 text-right">Versé aux vendeurs</th>
              <th className="py-1.5 pr-3 text-right">À verser</th>
              <th className="py-1.5 pr-3 text-right">Remises</th>
              <th className="py-1.5 pr-3 text-right">Intérêts</th>
              <th className="py-1.5 text-right">Remboursé</th>
            </tr>
          </thead>
          <tbody>
            {stats.map((row) => (
              <tr key={row.shopId} className="border-t border-gray-100">
                <td className="py-1.5 pr-3 font-medium text-gray-900">{row.shopName}</td>
                <td className="py-1.5 pr-3 text-right tabular-nums">{row.sales}</td>
                <td className="py-1.5 pr-3 text-right tabular-nums">{fcfa(row.financed)}</td>
                <td className="py-1.5 pr-3 text-right tabular-nums">{fcfa(row.paidToVendors)}</td>
                <td className={`py-1.5 pr-3 text-right tabular-nums ${row.dueToVendors > 0 ? 'text-amber-700' : ''}`}>
                  {fcfa(row.dueToVendors)}
                </td>
                <td className="py-1.5 pr-3 text-right tabular-nums text-emerald-700">{fcfa(row.discountEarned)}</td>
                <td className="py-1.5 pr-3 text-right tabular-nums text-emerald-700">{fcfa(row.interest)}</td>
                <td className="py-1.5 text-right tabular-nums">{fcfa(row.repaid)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
