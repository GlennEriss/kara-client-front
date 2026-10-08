'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { HandCoins, Loader2 } from 'lucide-react'

import { Dialog } from '@/components/ui/dialog'
import { ModalBody, ModalContent, ModalFooter, ModalHeader } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PAYMENT_MODE_LABELS } from '@/constantes/membership-requests'
import { useSaveShopCreditPartner, useShopCreditPartner } from '@/hooks/useShops'
import type { PaymentMode, Shop } from '@/types/types'

interface Props {
  open: boolean
  onClose: () => void
  shop: Shop | null
}

/**
 * Partenariat « achat à crédit » d'une boutique : l'association règle le
 * vendeur (prix moins la remise négociée) et le membre acheteur rembourse
 * l'association en 2 ou 3 mensualités.
 */
export default function ShopCreditPartnerModal({ open, onClose, shop }: Props) {
  const { data: partner, isLoading } = useShopCreditPartner(open ? shop?.id : undefined)
  const save = useSaveShopCreditPartner()
  const [enabled, setEnabled] = useState(false)
  const [discount, setDiscount] = useState('')
  const [payoutMode, setPayoutMode] = useState<PaymentMode | ''>('')
  const [payoutAccount, setPayoutAccount] = useState('')
  const [agreementSigned, setAgreementSigned] = useState(false)

  useEffect(() => {
    if (!open) return
    setEnabled(partner?.enabled ?? false)
    setDiscount(partner ? String(partner.discountPercent) : '')
    setPayoutMode(partner?.payoutMode ?? '')
    setPayoutAccount(partner?.payoutAccount ?? '')
    setAgreementSigned(partner?.agreementSigned ?? false)
  }, [open, partner])

  if (!shop) return null

  const hasOwner = !!(shop.ownerMemberId || shop.ownerMatricule)
  const discountValue = Number(discount.replace(',', '.'))

  const handleSave = async () => {
    if (enabled) {
      if (!hasOwner) {
        toast.error("Liez d'abord la boutique à son propriétaire membre.")
        return
      }
      if (!Number.isFinite(discountValue) || discountValue < 0 || discountValue >= 100) {
        toast.error('Indiquez une remise entre 0 et 99 %.')
        return
      }
      if (!payoutMode) {
        toast.error('Choisissez le moyen de règlement du vendeur.')
        return
      }
      if (!agreementSigned) {
        toast.error('La convention de partenariat doit être signée avant d’activer le crédit.')
        return
      }
    }
    try {
      await save.mutateAsync({
        shopId: shop.id,
        enabled,
        discountPercent: Number.isFinite(discountValue) ? discountValue : 0,
        payoutMode: payoutMode || undefined,
        payoutAccount: payoutAccount.trim() || undefined,
        agreementSigned,
      })
      toast.success(enabled ? 'Boutique partenaire du crédit' : 'Partenariat crédit désactivé')
      onClose()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur lors de l'enregistrement")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <ModalContent size="md">
        <ModalHeader
          icon={HandCoins}
          title="Achat à crédit"
          description={`Conditions négociées avec « ${shop.name} ». Elles ne sont jamais visibles des membres.`}
        />

        <ModalBody>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50/70 p-3">
                <div>
                  <p className="text-sm font-semibold text-gray-900">Boutique partenaire</p>
                  <p className="text-xs text-gray-500">
                    Les membres peuvent y acheter à crédit, remboursé en 2 ou 3 mensualités.
                  </p>
                </div>
                <Switch checked={enabled} onCheckedChange={setEnabled} />
              </div>

              {!hasOwner && (
                <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  Cette boutique n&apos;est liée à aucun membre : modifiez la fiche pour indiquer son propriétaire.
                </p>
              )}

              <div className="space-y-1">
                <Label className="text-xs text-gray-500">Remise accordée à l&apos;association (%)</Label>
                <Input
                  inputMode="decimal"
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                  placeholder="Ex : 5"
                />
                <p className="text-xs text-gray-500">
                  L&apos;association règle le vendeur au prix moins cette remise : c&apos;est sa marge sur chaque vente.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label className="text-xs text-gray-500">Règlement du vendeur</Label>
                  <Select value={payoutMode} onValueChange={(v) => setPayoutMode(v as PaymentMode)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choisir…" />
                    </SelectTrigger>
                    <SelectContent>
                      {(['airtel_money', 'mobicash', 'bank_transfer', 'cash'] as PaymentMode[]).map((mode) => (
                        <SelectItem key={mode} value={mode}>
                          {PAYMENT_MODE_LABELS[mode]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-gray-500">Numéro ou RIB</Label>
                  <Input
                    value={payoutAccount}
                    onChange={(e) => setPayoutAccount(e.target.value)}
                    placeholder="Ex : 074 00 00 00"
                  />
                </div>
              </div>

              <label className="flex items-start gap-2 text-sm text-gray-700">
                <Checkbox
                  checked={agreementSigned}
                  onCheckedChange={(v) => setAgreementSigned(v === true)}
                  className="mt-0.5"
                />
                <span>
                  Convention signée : le vendeur rembourse l&apos;association si l&apos;article est défectueux ou non
                  livré.
                </span>
              </label>
            </div>
          )}
        </ModalBody>

        <ModalFooter>
          <Button variant="outline" onClick={onClose} disabled={save.isPending}>
            Annuler
          </Button>
          <Button
            onClick={handleSave}
            disabled={save.isPending || isLoading}
            className="bg-[#234D65] hover:bg-[#234D65]/90"
          >
            {save.isPending && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
            Enregistrer
          </Button>
        </ModalFooter>
      </ModalContent>
    </Dialog>
  )
}
