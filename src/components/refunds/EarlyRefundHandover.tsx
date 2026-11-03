'use client'

import { useEffect, useId, useState } from 'react'
import { Banknote } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useMyAccess } from '@/hooks/useMyAccess'
import { canFinalizeEarlyRefundAt, earlyRefundPayoutDueAt } from '@/utils/refund-payout'
import { RefundPayoutCountdown } from './RefundPayoutCountdown'
import { FinalizeRefundHandoverModal } from './FinalizeRefundHandoverModal'

interface EarlyRefundHandoverProps {
  fund: 'CS' | 'CI'
  contractId: string
  refund: Record<string, unknown> & { id: string }
  userId?: string
  onSuccess: () => void | Promise<void>
}

/** L'action reste visible pendant le délai, même si les versements sont verrouillés. */
export function EarlyRefundHandover({ fund, contractId, refund, userId, onSuccess }: EarlyRefundHandoverProps) {
  const { isSuperAdmin, isLoading } = useMyAccess()
  const explanationId = useId()
  const [open, setOpen] = useState(false)
  const [now, setNow] = useState(() => Date.now())
  const isApprovedEarlyRefund = refund.type === 'EARLY' && refund.status === 'APPROVED'

  useEffect(() => {
    if (!isApprovedEarlyRefund) return
    const timer = window.setInterval(() => setNow(Date.now()), 60_000)
    return () => window.clearInterval(timer)
  }, [isApprovedEarlyRefund])

  if (!isApprovedEarlyRefund) return null

  const canFinalize = canFinalizeEarlyRefundAt(refund, isSuperAdmin, new Date(now))
  const isBeforeDueAt = !canFinalizeEarlyRefundAt(refund, false, new Date(now))
  const hasDueDate = Boolean(earlyRefundPayoutDueAt(refund))
  const explanation = isLoading
    ? 'Vérification de vos droits…'
    : !userId
      ? 'Connectez-vous pour confirmer la remise.'
      : isSuperAdmin && isBeforeDueAt
        ? 'En tant que superadmin, vous pouvez confirmer la remise avant l’échéance.'
        : !canFinalize
          ? hasDueDate
            ? 'Avant l’échéance, seul un superadmin peut confirmer la remise.'
            : 'La date limite est manquante. Seul un superadmin peut finaliser ce retrait.'
          : 'Confirmez uniquement une remise réellement effectuée au membre.'

  return (
    <div className="space-y-3">
      <RefundPayoutCountdown refund={refund} compact />
      <div className="flex min-w-0 flex-col items-start gap-2 sm:flex-row sm:items-center sm:gap-3">
        <Button
          type="button"
          aria-describedby={explanationId}
          disabled={!userId || isLoading || !canFinalize}
          onClick={() => setOpen(true)}
          className="h-auto min-h-11 w-full shrink-0 gap-2 whitespace-normal bg-emerald-600 py-2 text-white hover:bg-emerald-700 sm:w-auto"
        >
          <Banknote className="h-4 w-4 shrink-0" />
          Finaliser la remise
        </Button>
        <p id={explanationId} className="text-xs leading-5 text-slate-600">{explanation}</p>
      </div>
      {open && userId && (
        <FinalizeRefundHandoverModal
          open={open}
          onClose={() => setOpen(false)}
          fund={fund}
          contractId={contractId}
          refundId={refund.id}
          refundLabel="Retrait anticipé"
          refundType="EARLY"
          approvedAt={refund.approvedAt}
          payoutDueAt={refund.payoutDueAt}
          userId={userId}
          onSuccess={onSuccess}
        />
      )}
    </div>
  )
}
