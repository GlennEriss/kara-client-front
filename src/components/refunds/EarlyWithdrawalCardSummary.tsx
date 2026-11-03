import { format } from 'date-fns'
import { CalendarClock, HandCoins } from 'lucide-react'
import { earlyRefundPayoutDueAt, refundDate } from '@/utils/refund-payout'

export function EarlyWithdrawalCardSummary({ refund }: { refund?: Record<string, unknown> }) {
  if (refund?.type !== 'EARLY' || !['PENDING', 'APPROVED', 'PAID'].includes(String(refund.status))) return null
  const paid = refund.status === 'PAID'
  const date = paid ? refundDate(refund.paidAt) ?? refundDate(refund.withdrawalDate)
    : refund.status === 'APPROVED' ? earlyRefundPayoutDueAt(refund) : null
  const dateLabel = date
    ? `${paid ? 'Remise effectuée' : 'Remise prévue'} le ${format(date, 'dd/MM/yyyy')}`
    : refund.status === 'PENDING' ? 'Date de remise à fixer après approbation'
      : paid ? 'Date réelle de remise non renseignée' : 'Date de remise à confirmer'

  return (
    <div className={`min-w-0 space-y-1 rounded-xl border p-3 text-xs leading-5 ${paid ? 'border-emerald-100 bg-emerald-50 text-emerald-800' : 'border-blue-100 bg-blue-50 text-blue-900'}`}>
      <p className="flex items-center gap-2 font-semibold"><HandCoins className="h-3.5 w-3.5 shrink-0" />Retrait anticipé</p>
      <p className="flex items-start gap-2"><CalendarClock className="mt-0.5 h-3.5 w-3.5 shrink-0" />{dateLabel}</p>
    </div>
  )
}
