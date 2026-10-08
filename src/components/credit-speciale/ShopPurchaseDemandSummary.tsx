'use client'

import { useQuery } from '@tanstack/react-query'
import { getShopArticle } from '@/db/shops.db'
import { useShopCreditPartner } from '@/hooks/useShops'
import type { CreditShopPurchase } from '@/types/types'
import { applyShopPartnerTerms } from '@/utils/credit-weekly'

const fcfa = (value: number) => `${Math.round(value).toLocaleString('fr-FR')} FCFA`

/**
 * Résumé d'un achat en boutique sur une demande. La remise affichée est celle
 * de la convention en vigueur : une demande saisie par le membre n'en porte pas.
 */
export default function ShopPurchaseDemandSummary({
  purchase: rawPurchase,
  compact = false,
}: {
  purchase: CreditShopPurchase
  compact?: boolean
}) {
  const { data: partner, isLoading } = useShopCreditPartner(rawPurchase.shopId)
  const purchase = applyShopPartnerTerms(rawPurchase, partner)
  const notPartner = !isLoading && !partner?.enabled
  // Article du catalogue : signale s'il a été retiré ou si son prix a changé depuis la demande.
  const { data: article, isFetched: articleFetched } = useQuery({
    queryKey: ['shops', 'articles', rawPurchase.articleId],
    queryFn: () => getShopArticle(rawPurchase.articleId as string),
    enabled: !!rawPurchase.articleId,
  })
  const articleWarning = !rawPurchase.articleId || !articleFetched
    ? null
    : !article || article.status !== 'approved'
      ? "L'article n'est plus publié dans la boutique : le contrat sera refusé."
      : rawPurchase.unitPrice != null && article.price !== rawPurchase.unitPrice
        ? `Le prix de l'article est passé à ${fcfa(article.price)} depuis la demande (${fcfa(rawPurchase.unitPrice)}) : c'est le prix de la demande qui s'applique.`
        : null

  if (compact) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 text-sm text-emerald-900">
        Vendeur « {purchase.shopName} » : {fcfa(purchase.vendorAmount)} (prix {fcfa(purchase.price)} − remise{' '}
        {purchase.discountPercent} %). Le règlement et la livraison se confirment ensuite sur la fiche du contrat.
        {notPartner && (
          <p className="mt-1 font-medium text-red-700">Cette boutique n&apos;est plus partenaire : le contrat sera refusé.</p>
        )}
        {articleWarning && <p className="mt-1 font-medium text-amber-800">{articleWarning}</p>}
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
        Achat en boutique partenaire · 2 ou 3 mensualités
      </p>
      <p className="mt-2 text-sm font-semibold text-slate-900">
        {purchase.article}
        {purchase.quantity && purchase.quantity > 1 && purchase.unitPrice ? ` (${fcfa(purchase.unitPrice)} l'unité)` : ''} — {purchase.shopName}
        {purchase.shopOwnerName ? ` (${purchase.shopOwnerName})` : ''}
      </p>
      <div className="mt-2 grid grid-cols-1 gap-2 text-sm sm:grid-cols-3">
        <p>
          Prix : <b>{fcfa(purchase.price)}</b>
        </p>
        <p>
          Versé au vendeur : <b>{fcfa(purchase.vendorAmount)}</b>
        </p>
        <p>
          Remise {purchase.discountPercent} % : <b>{fcfa(purchase.price - purchase.vendorAmount)}</b>
        </p>
      </div>
      {articleWarning && <p className="mt-2 text-sm font-medium text-amber-800">{articleWarning}</p>}
      {notPartner && (
        <p className="mt-2 text-sm font-medium text-red-700">
          Cette boutique n&apos;est plus partenaire de l&apos;achat à crédit : réactivez le partenariat avant de créer le
          contrat.
        </p>
      )}
    </div>
  )
}
