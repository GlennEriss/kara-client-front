import { cn } from '@/lib/utils'
import {
  LATE_TOLERANCE_DAYS,
  PUNCTUALITY_LEGEND,
  PUNCTUALITY_META,
  punctualityLabel,
  type PaymentPunctuality,
} from '@/utils/credit-payment-punctuality'

/** Pastille de ponctualité d'un versement ou d'une échéance. */
export function PunctualityBadge({ kind, daysLate }: { kind: PaymentPunctuality; daysLate: number }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-medium',
        PUNCTUALITY_META[kind].badge,
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', PUNCTUALITY_META[kind].dot)} />
      {punctualityLabel(kind, daysLate)}
    </span>
  )
}

/** Légende des couleurs de ponctualité. */
export function PunctualityLegend() {
  return (
    <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-gray-600">
      {PUNCTUALITY_LEGEND.map((kind) => (
        <span key={kind} className="inline-flex items-center gap-1.5">
          <span className={cn('h-2 w-2 rounded-full', PUNCTUALITY_META[kind].dot)} />
          {PUNCTUALITY_META[kind].label}
          {kind === 'GRACE' ? ` (≤ ${LATE_TOLERANCE_DAYS} j, sans pénalité)` : ''}
          {kind === 'LATE' ? ` (> ${LATE_TOLERANCE_DAYS} j)` : ''}
        </span>
      ))}
    </div>
  )
}
