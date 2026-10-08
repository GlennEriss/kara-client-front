'use client'

import { useMemo, useState } from 'react'
import type { UseFormReturn } from 'react-hook-form'
import { HandCoins, Store } from 'lucide-react'

import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useShopCreditPartners, useShops } from '@/hooks/useShops'
import type { CreditDemandFormInput } from '@/schemas/credit-speciale.schema'
import { customRound } from '@/utils/credit-speciale-calculations'

interface Props {
  form: UseFormReturn<CreditDemandFormInput>
}

/** Montant versé au vendeur : prix − remise négociée avec la boutique. */
export const computeVendorAmount = (price: number, discountPercent: number): number =>
  customRound(price - (price * discountPercent) / 100)

/**
 * Achat à crédit dans une boutique partenaire : le montant du crédit est le
 * prix de l'article, l'association règle le vendeur (prix − remise) et le
 * membre rembourse en 2 ou 3 mensualités.
 */
export default function ShopPurchaseFields({ form }: Props) {
  const { data: shops = [] } = useShops()
  const { data: partners } = useShopCreditPartners()
  const purchase = form.watch('shopPurchase')
  const clientId = form.watch('clientId')
  const [enabled, setEnabled] = useState(!!purchase)

  const partnerShops = useMemo(
    () =>
      shops.filter(
        (shop) => (shop.status ?? 'approved') === 'approved' && shop.isActive && partners?.get(shop.id)?.enabled,
      ),
    [shops, partners],
  )

  const update = (patch: Partial<NonNullable<CreditDemandFormInput['shopPurchase']>>) => {
    const next = {
      shopId: '',
      shopName: '',
      article: '',
      price: 0,
      discountPercent: 0,
      vendorAmount: 0,
      vendorStatus: 'PENDING' as const,
      ...purchase,
      ...patch,
    }
    next.vendorAmount = computeVendorAmount(next.price, next.discountPercent)
    form.setValue('shopPurchase', next, { shouldValidate: form.formState.isSubmitted })
    if (patch.price !== undefined) {
      form.setValue('amount', next.price || undefined, { shouldValidate: form.formState.isSubmitted })
    }
  }

  const toggle = (value: boolean) => {
    setEnabled(value)
    if (value) {
      form.setValue('creditType', 'SPECIALE')
      form.setValue('monthlyPaymentAmount', undefined)
      update({})
    } else {
      form.setValue('shopPurchase', undefined)
    }
  }

  const selectShop = (shopId: string) => {
    const shop = partnerShops.find((s) => s.id === shopId)
    if (!shop) return
    update({
      shopId: shop.id,
      shopName: shop.name,
      shopOwnerMemberId: shop.ownerMemberId || undefined,
      shopOwnerName: shop.ownerName || undefined,
      discountPercent: partners?.get(shop.id)?.discountPercent ?? 0,
    })
    if (!form.getValues('cause')) {
      form.setValue('cause', `Achat à crédit dans la boutique « ${shop.name} »`)
    }
  }

  const ownShop = !!purchase?.shopOwnerMemberId && purchase.shopOwnerMemberId === clientId
  const errors = form.formState.errors.shopPurchase as Record<string, { message?: string }> | undefined

  return (
    <Card className="border border-emerald-200/80 bg-white shadow-sm">
      <CardContent className="space-y-4 p-4 md:p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="flex items-center gap-2 text-lg font-bold text-slate-900">
              <HandCoins className="h-5 w-5 text-emerald-600" /> Achat en boutique partenaire
            </h3>
            <p className="text-sm text-slate-500">
              Le crédit finance un article dans la boutique d&apos;un membre. Remboursement en 2 ou 3 mensualités,
              intérêts appliqués une seule fois.
            </p>
          </div>
          <Switch checked={enabled} onCheckedChange={toggle} />
        </div>

        {enabled && (
          <div className="space-y-4">
            {partnerShops.length === 0 ? (
              <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
                Aucune boutique partenaire. Activez l&apos;achat à crédit sur une boutique depuis la section Boutiques.
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="space-y-1">
                  <Label>Boutique</Label>
                  <Select value={purchase?.shopId || ''} onValueChange={selectShop}>
                    <SelectTrigger className="h-11 rounded-xl border-2 border-slate-200">
                      <SelectValue placeholder="Choisir une boutique…" />
                    </SelectTrigger>
                    <SelectContent>
                      {partnerShops.map((shop) => (
                        <SelectItem key={shop.id} value={shop.id}>
                          <span className="flex items-center gap-2">
                            <Store className="h-3.5 w-3.5 text-slate-400" />
                            {shop.name}
                            {shop.ownerName ? ` · ${shop.ownerName}` : ''}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {(errors?.shopId?.message || ownShop) && (
                    <p className="text-sm text-red-600">
                      {ownShop ? 'Le membre ne peut pas acheter à crédit dans sa propre boutique' : errors?.shopId?.message}
                    </p>
                  )}
                </div>
                <div className="space-y-1">
                  <Label>Article acheté</Label>
                  <Input
                    className="h-11 rounded-xl border-2 border-slate-200"
                    placeholder="Ex : réfrigérateur 200 L"
                    value={purchase?.article ?? ''}
                    onChange={(e) => update({ article: e.target.value })}
                  />
                  {errors?.article?.message && <p className="text-sm text-red-600">{errors.article.message}</p>}
                </div>
                <div className="space-y-1">
                  <Label>Prix de l&apos;article (FCFA)</Label>
                  <Input
                    type="number"
                    className="h-11 rounded-xl border-2 border-slate-200"
                    placeholder="Ex : 250000"
                    value={purchase?.price || ''}
                    onChange={(e) => update({ price: parseFloat(e.target.value) || 0 })}
                  />
                  {errors?.price?.message && <p className="text-sm text-red-600">{errors.price.message}</p>}
                </div>
              </div>
            )}

            {purchase?.shopId && purchase.price > 0 && (
              <div className="grid grid-cols-1 gap-2 rounded-xl bg-emerald-50/70 p-3 text-sm sm:grid-cols-3">
                <div>
                  <p className="text-xs text-emerald-700">Montant financé</p>
                  <p className="font-semibold text-emerald-950">{purchase.price.toLocaleString('fr-FR')} FCFA</p>
                </div>
                <div>
                  <p className="text-xs text-emerald-700">Versé au vendeur</p>
                  <p className="font-semibold text-emerald-950">{purchase.vendorAmount.toLocaleString('fr-FR')} FCFA</p>
                </div>
                <div>
                  <p className="text-xs text-emerald-700">Remise ({purchase.discountPercent} %)</p>
                  <p className="font-semibold text-emerald-950">
                    {(purchase.price - purchase.vendorAmount).toLocaleString('fr-FR')} FCFA
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
