'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { CheckCircle2, ExternalLink, HandCoins, Loader2, PackageCheck, Store, Truck } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ModalBody, ModalContent, ModalFooter, ModalHeader } from '@/components/ui/modal'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { PAYMENT_MODE_LABELS } from '@/constantes/membership-requests'
import { useCreditContractMutations } from '@/hooks/useCreditSpeciale'
import { useShopCreditPartner } from '@/hooks/useShops'
import {
  SHOP_PURCHASE_VENDOR_STATUS_LABELS,
  type CreditContract,
  type PaymentMode,
  type ShopPurchaseVendorStatus,
} from '@/types/types'

const fcfa = (value: number) => `${Math.round(value).toLocaleString('fr-FR')} FCFA`

/** Les dates imbriquées reviennent de Firestore en Timestamp. */
const toDate = (value: unknown): Date | undefined => {
  if (!value) return undefined
  if (value instanceof Date) return value
  if (typeof value === 'object' && value && 'toDate' in value) return (value as { toDate: () => Date }).toDate()
  const date = new Date(value as string)
  return Number.isNaN(date.getTime()) ? undefined : date
}

const STATUS_TONES: Record<ShopPurchaseVendorStatus, string> = {
  PENDING: 'bg-amber-100 text-amber-800 hover:bg-amber-100',
  PAID: 'bg-blue-100 text-blue-800 hover:bg-blue-100',
  DELIVERED: 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100',
}

const todayInput = () => format(new Date(), 'yyyy-MM-dd')

/**
 * Achat à crédit en boutique partenaire : article, vendeur, montant à lui
 * verser (prix − remise), puis règlement et livraison.
 */
export default function ShopPurchaseSection({
  contract,
  canManage,
}: {
  contract: CreditContract
  canManage: boolean
}) {
  const purchase = contract.shopPurchase
  const { data: partner } = useShopCreditPartner(purchase?.shopId)
  const { recordShopVendorPayment, confirmShopPurchaseDelivery } = useCreditContractMutations()
  const [payOpen, setPayOpen] = useState(false)
  const [deliveryOpen, setDeliveryOpen] = useState(false)
  const [paidAt, setPaidAt] = useState(todayInput())
  const [mode, setMode] = useState<PaymentMode | ''>('')
  const [reference, setReference] = useState('')
  const [proofFile, setProofFile] = useState<File | undefined>()
  const [deliveredAt, setDeliveredAt] = useState(todayInput())
  const [comment, setComment] = useState('')

  if (!purchase) return null

  const discount = purchase.price - purchase.vendorAmount
  const isSigned = contract.status !== 'PENDING' && contract.status !== 'DRAFT'
  const vendorPayment = purchase.vendorPayment
  const delivery = purchase.delivery

  const openPay = () => {
    setPaidAt(todayInput())
    setMode(partner?.payoutMode ?? '')
    setReference('')
    setProofFile(undefined)
    setPayOpen(true)
  }

  const submitPay = async () => {
    if (!mode) return
    await recordShopVendorPayment.mutateAsync({
      contractId: contract.id,
      paidAt: new Date(paidAt),
      mode,
      reference: reference || undefined,
      proofFile,
    })
    setPayOpen(false)
  }

  const submitDelivery = async () => {
    await confirmShopPurchaseDelivery.mutateAsync({
      contractId: contract.id,
      deliveredAt: new Date(deliveredAt),
      comment: comment || undefined,
    })
    setDeliveryOpen(false)
  }

  return (
    <Card className="border-0 border-l-4 border-l-emerald-500 shadow-md">
      <CardHeader className="pb-2">
        <CardTitle className="flex flex-wrap items-center gap-2 text-[#234D65]">
          <Store className="h-5 w-5 text-emerald-600" />
          Achat en boutique : {purchase.shopName}
          <Badge className={STATUS_TONES[purchase.vendorStatus]}>
            {SHOP_PURCHASE_VENDOR_STATUS_LABELS[purchase.vendorStatus]}
          </Badge>
        </CardTitle>
        <p className="text-sm text-gray-600">
          {purchase.article}
          {purchase.shopOwnerName ? ` · vendeur ${purchase.shopOwnerName}` : ''}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3 rounded-xl bg-gray-50 p-3 sm:grid-cols-4">
          {[
            { title: 'Prix financé', value: fcfa(purchase.price) },
            { title: 'À verser au vendeur', value: fcfa(purchase.vendorAmount), accent: 'text-[#234D65]' },
            { title: `Remise (${purchase.discountPercent} %)`, value: fcfa(discount), accent: 'text-emerald-700' },
            {
              title: 'Gain prévu',
              value: fcfa(discount + Math.max(0, contract.totalAmount - contract.amount)),
              accent: 'text-emerald-700',
            },
          ].map((stat) => (
            <div key={stat.title}>
              <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400">{stat.title}</p>
              <p className={`text-sm font-bold ${stat.accent ?? 'text-gray-900'}`}>{stat.value}</p>
            </div>
          ))}
        </div>

        {partner?.payoutAccount && purchase.vendorStatus === 'PENDING' && (
          <p className="text-sm text-gray-600">
            Règlement : {partner.payoutMode ? PAYMENT_MODE_LABELS[partner.payoutMode] : '—'} · {partner.payoutAccount}
          </p>
        )}

        {vendorPayment && (
          <div className="flex flex-wrap items-center gap-2 text-sm text-gray-700">
            <CheckCircle2 className="h-4 w-4 text-blue-600" />
            Vendeur réglé le {toDate(vendorPayment.paidAt) ? format(toDate(vendorPayment.paidAt)!, 'dd/MM/yyyy') : '—'} par{' '}
            {PAYMENT_MODE_LABELS[vendorPayment.mode] ?? vendorPayment.mode}
            {vendorPayment.reference ? ` (réf. ${vendorPayment.reference})` : ''}
            {vendorPayment.paidByName ? ` — ${vendorPayment.paidByName}` : ''}
            {vendorPayment.proofUrl && (
              <a
                href={vendorPayment.proofUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-[#234D65] underline"
              >
                Preuve <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        )}

        {delivery && (
          <div className="flex flex-wrap items-center gap-2 text-sm text-gray-700">
            <PackageCheck className="h-4 w-4 text-emerald-600" />
            Article livré le {toDate(delivery.deliveredAt) ? format(toDate(delivery.deliveredAt)!, 'dd/MM/yyyy') : '—'}
            {delivery.confirmedByName ? ` — confirmé par ${delivery.confirmedByName}` : ''}
            {delivery.comment ? ` · ${delivery.comment}` : ''}
          </div>
        )}

        {canManage && purchase.vendorStatus === 'PENDING' && (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            {!isSigned && (
              <p className="text-sm text-amber-700">Le contrat doit être signé avant de régler le vendeur.</p>
            )}
            <Button
              className="bg-[#234D65] hover:bg-[#234D65]/90 sm:ml-auto"
              disabled={!isSigned}
              onClick={openPay}
            >
              <HandCoins className="mr-2 h-4 w-4" /> Régler le vendeur
            </Button>
          </div>
        )}
        {canManage && purchase.vendorStatus === 'PAID' && (
          <div className="flex justify-end">
            <Button
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={() => {
                setDeliveredAt(todayInput())
                setComment('')
                setDeliveryOpen(true)
              }}
            >
              <Truck className="mr-2 h-4 w-4" /> Confirmer la livraison
            </Button>
          </div>
        )}
      </CardContent>

      <Dialog open={payOpen} onOpenChange={setPayOpen}>
        <ModalContent size="md">
          <ModalHeader
            icon={HandCoins}
            title="Régler le vendeur"
            description={`${fcfa(purchase.vendorAmount)} à verser à « ${purchase.shopName} » (prix moins la remise de ${purchase.discountPercent} %).`}
          />
          <ModalBody>
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label className="text-xs text-gray-500">Date du règlement</Label>
                  <Input type="date" value={paidAt} onChange={(e) => setPaidAt(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-gray-500">Moyen</Label>
                  <Select value={mode} onValueChange={(v) => setMode(v as PaymentMode)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choisir…" />
                    </SelectTrigger>
                    <SelectContent>
                      {(['airtel_money', 'mobicash', 'bank_transfer', 'cash'] as PaymentMode[]).map((value) => (
                        <SelectItem key={value} value={value}>
                          {PAYMENT_MODE_LABELS[value]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-gray-500">Référence de la transaction</Label>
                <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Facultatif" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-gray-500">Preuve (capture, reçu du vendeur)</Label>
                <Input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={(e) => setProofFile(e.target.files?.[0])}
                />
              </div>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="outline" onClick={() => setPayOpen(false)} disabled={recordShopVendorPayment.isPending}>
              Annuler
            </Button>
            <Button
              onClick={submitPay}
              disabled={!mode || !paidAt || recordShopVendorPayment.isPending}
              className="bg-[#234D65] hover:bg-[#234D65]/90"
            >
              {recordShopVendorPayment.isPending && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
              Enregistrer le règlement
            </Button>
          </ModalFooter>
        </ModalContent>
      </Dialog>

      <Dialog open={deliveryOpen} onOpenChange={setDeliveryOpen}>
        <ModalContent size="md">
          <ModalHeader
            icon={Truck}
            title="Confirmer la livraison"
            description={`Le membre a reçu « ${purchase.article} ».`}
          />
          <ModalBody>
            <div className="space-y-4">
              <div className="space-y-1">
                <Label className="text-xs text-gray-500">Date de livraison</Label>
                <Input type="date" value={deliveredAt} onChange={(e) => setDeliveredAt(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-gray-500">Commentaire</Label>
                <Textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={3} placeholder="Facultatif" />
              </div>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button
              variant="outline"
              onClick={() => setDeliveryOpen(false)}
              disabled={confirmShopPurchaseDelivery.isPending}
            >
              Annuler
            </Button>
            <Button
              onClick={submitDelivery}
              disabled={!deliveredAt || confirmShopPurchaseDelivery.isPending}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {confirmShopPurchaseDelivery.isPending && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
              Confirmer
            </Button>
          </ModalFooter>
        </ModalContent>
      </Dialog>
    </Card>
  )
}
