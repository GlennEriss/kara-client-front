'use client'

import { useEffect, useMemo, useState } from 'react'
import { format } from 'date-fns'
import { AlertTriangle, Banknote, CheckCircle, Loader2, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Modal } from '@/components/ui/modal'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { getStorageInstance } from '@/firebase/storage'
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage'
import { finalizeRefundHandover, type RefundFund } from '@/services/refunds/finalizeRefundHandover'
import { useMyAccess } from '@/hooks/useMyAccess'
import { useQueryClient } from '@tanstack/react-query'
import { useAuditLogger } from '@/hooks/useAuditLog'
import { canFinalizeEarlyRefundAt, earlyRefundPayoutDueAt } from '@/utils/refund-payout'

type PaymentMode = 'cash' | 'bank_transfer' | 'airtel_money' | 'mobicash' | 'other'

interface FinalizeRefundHandoverModalProps {
  open: boolean
  onClose: () => void
  fund: RefundFund
  contractId: string
  refundId: string
  refundLabel: string
  refundType?: string
  approvedAt?: unknown
  payoutDueAt?: unknown
  userId: string
  onSuccess?: () => void | Promise<void>
}

const validProofTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
const maxSizeMB = 20

export function FinalizeRefundHandoverModal({
  open,
  onClose,
  fund,
  contractId,
  refundId,
  refundLabel,
  refundType,
  approvedAt,
  payoutDueAt,
  userId,
  onSuccess,
}: FinalizeRefundHandoverModalProps) {
  const { isSuperAdmin } = useMyAccess()
  const queryClient = useQueryClient()
  const { log } = useAuditLogger()
  const [proofFile, setProofFile] = useState<File | null>(null)
  const [handoverDate, setHandoverDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [handoverTime, setHandoverTime] = useState(format(new Date(), 'HH:mm'))
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('cash')
  const [paymentMethodOther, setPaymentMethodOther] = useState('')
  const [confirmed, setConfirmed] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [now, setNow] = useState(() => Date.now())
  const isEarly = refundType === 'EARLY'
  const dueAt = useMemo(
    () => earlyRefundPayoutDueAt({ approvedAt, payoutDueAt }),
    [approvedAt, payoutDueAt],
  )
  const refundTiming = { approvedAt, payoutDueAt }
  const canAdminFinalizeNow = canFinalizeEarlyRefundAt(refundTiming, false, new Date(now))
  const isBeforeDueAt = Boolean(dueAt && !canAdminFinalizeNow)
  const isForbidden = isEarly && !canFinalizeEarlyRefundAt(refundTiming, isSuperAdmin, new Date(now))

  useEffect(() => {
    if (!open) return
    setProofFile(null)
    setHandoverDate(format(new Date(), 'yyyy-MM-dd'))
    setHandoverTime(format(new Date(), 'HH:mm'))
    setPaymentMode('cash')
    setPaymentMethodOther('')
    setConfirmed(false)
    setNow(Date.now())
  }, [open])

  useEffect(() => {
    if (!open || !isEarly || !dueAt) return
    const timer = window.setInterval(() => setNow(Date.now()), 60_000)
    return () => window.clearInterval(timer)
  }, [dueAt, isEarly, open])

  const handleProofChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null
    if (!file) return setProofFile(null)
    if (!validProofTypes.includes(file.type)) {
      toast.error('La preuve doit être une image ou un PDF')
      event.target.value = ''
      return
    }
    if (file.size > maxSizeMB * 1024 * 1024) {
      toast.error(`La taille ne doit pas dépasser ${maxSizeMB} MB`)
      event.target.value = ''
      return
    }
    setProofFile(file)
  }

  const handleSubmit = async () => {
    if (!proofFile || !confirmed || isForbidden) return
    if (paymentMode === 'other' && !paymentMethodOther.trim()) {
      toast.error('Précisez le moyen de remise utilisé')
      return
    }
    setIsSubmitting(true)
    try {
      const storage = getStorageInstance()
      const extension = proofFile.name.split('.').pop() || 'jpg'
      const path = `contracts-${fund.toLowerCase()}/refunds/${contractId}/${refundId}/handover-proof-${Date.now()}.${extension}`
      const storageRef = ref(storage, path)
      await uploadBytes(storageRef, proofFile)
      const proofUrl = await getDownloadURL(storageRef)

      await finalizeRefundHandover({
        fund,
        contractId,
        refundId,
        adminId: userId,
        handoverDate,
        handoverTime,
        paymentMode,
        paymentMethodOther,
        proofUrl,
        proofPath: path,
      })
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: [fund === 'CS' ? 'refundsCS' : 'refundsCI', contractId] }),
        queryClient.invalidateQueries({ queryKey: [fund === 'CS' ? 'caisse-contract' : 'contractCI', contractId] }),
        queryClient.invalidateQueries({ queryKey: [fund === 'CS' ? 'caisse-contracts' : 'contractsCI'] }),
        queryClient.invalidateQueries({ queryKey: ['upcoming-payouts'] }),
      ])
      log({
        action: 'payment',
        module: fund === 'CS' ? 'caisseSpeciale' : 'caisseImprevue',
        moduleLabel: fund === 'CS' ? 'Caisse Spéciale' : 'Caisse Imprévue',
        targetType: isEarly ? 'retrait anticipé' : 'remboursement final',
        targetId: refundId,
        description: `${isEarly ? 'Remise du retrait anticipé' : 'Remise du remboursement final'} confirmée et contrat clôturé`,
        metadata: { contractId, handoverDate, handoverTime, paymentMode },
      })
      toast.success(isEarly ? 'Remise confirmée et contrat clôturé' : 'Remboursement confirmé et contrat clôturé')
      onClose()
      await onSuccess?.()
    } catch (error: any) {
      console.error('[refund] finalisation de la remise impossible:', error)
      toast.error(error?.message || 'La remise n’a pas pu être finalisée')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal
      open={open}
      onOpenChange={(nextOpen) => !nextOpen && !isSubmitting && onClose()}
      size="md"
      icon={Banknote}
      tone="success"
      title={isEarly ? 'Finaliser le retrait et la clôture' : 'Confirmer la remise d’argent'}
      description={`${refundLabel} — Enregistrez la remise réellement effectuée au membre.`}
      footer={(
        <>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>Annuler</Button>
          <Button
            onClick={() => void handleSubmit()}
            disabled={isForbidden || !proofFile || !confirmed || isSubmitting}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
            Confirmer la remise et clôturer
          </Button>
        </>
      )}
    >
      <div className="space-y-4">
        {isForbidden && (
          <Alert className="border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              {dueAt
                ? `Le délai court jusqu’au ${format(dueAt, 'dd/MM/yyyy à HH:mm')}. Avant cette échéance, seul un superadmin peut confirmer la remise.`
                : 'La date limite de remise est introuvable. Seul un superadmin peut finaliser ce retrait.'}
            </AlertDescription>
          </Alert>
        )}

        {isEarly && isSuperAdmin && isBeforeDueAt && dueAt && (
          <Alert className="border-amber-200 bg-amber-50">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-900">
              Vous confirmez une remise avant l’échéance du {format(dueAt, 'dd/MM/yyyy à HH:mm')}. Cette décision anticipée est réservée au superadmin.
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor={`${fund}-handover-date`}>Date réelle de remise *</Label>
            <Input id={`${fund}-handover-date`} type="date" max={format(new Date(), 'yyyy-MM-dd')} value={handoverDate} onChange={(event) => setHandoverDate(event.target.value)} disabled={isSubmitting || isForbidden} />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${fund}-handover-time`}>Heure de remise *</Label>
            <Input id={`${fund}-handover-time`} type="time" value={handoverTime} onChange={(event) => setHandoverTime(event.target.value)} disabled={isSubmitting || isForbidden} />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Moyen de remise *</Label>
          <Select value={paymentMode} onValueChange={(value) => setPaymentMode(value as PaymentMode)} disabled={isSubmitting || isForbidden}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="cash">Espèces</SelectItem>
              <SelectItem value="bank_transfer">Virement bancaire</SelectItem>
              <SelectItem value="airtel_money">Airtel Money</SelectItem>
              <SelectItem value="mobicash">MobiCash</SelectItem>
              <SelectItem value="other">Autre</SelectItem>
            </SelectContent>
          </Select>
          {paymentMode === 'other' && (
            <Input value={paymentMethodOther} onChange={(event) => setPaymentMethodOther(event.target.value)} placeholder="Précisez le moyen utilisé" disabled={isSubmitting || isForbidden} />
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor={`${fund}-handover-proof`} className="flex items-center gap-2">
            <Upload className="h-4 w-4" /> Preuve de remise *
          </Label>
          <Input id={`${fund}-handover-proof`} type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={handleProofChange} disabled={isSubmitting || isForbidden} />
          {proofFile && <p className="text-xs font-medium text-emerald-700">{proofFile.name}</p>}
        </div>

        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} disabled={isSubmitting || isForbidden} className="mt-0.5 h-4 w-4" />
          <span>Je confirme que l’argent a réellement été remis au membre. Cette validation clôturera définitivement le contrat.</span>
        </label>
      </div>
    </Modal>
  )
}
