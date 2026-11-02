'use client'

import { useEffect, useMemo, useState } from 'react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { CalendarClock, CheckCircle2 } from 'lucide-react'
import { earlyRefundPayoutDueAt } from '@/utils/refund-payout'

interface RefundPayoutCountdownProps {
  refund: Record<string, unknown>
  compact?: boolean
}

function countdownLabel(milliseconds: number): string {
  if (milliseconds <= 0) return 'Délai arrivé à échéance'
  const totalHours = Math.ceil(milliseconds / 3_600_000)
  const days = Math.floor(totalHours / 24)
  const hours = totalHours % 24
  if (days === 0) return `${hours} heure${hours > 1 ? 's' : ''} restante${hours > 1 ? 's' : ''}`
  return `${days} jour${days > 1 ? 's' : ''}${hours ? ` et ${hours} h` : ''} restant${days > 1 ? 's' : ''}`
}

/** Compte à rebours entre l'approbation d'un retrait anticipé et sa remise. */
export function RefundPayoutCountdown({ refund, compact = false }: RefundPayoutCountdownProps) {
  const dueAt = useMemo(() => earlyRefundPayoutDueAt(refund), [refund])
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (!dueAt) return
    const timer = window.setInterval(() => setNow(Date.now()), 60_000)
    return () => window.clearInterval(timer)
  }, [dueAt])

  if (!dueAt || refund.type !== 'EARLY' || refund.status !== 'APPROVED') return null
  const remaining = dueAt.getTime() - now
  const expired = remaining <= 0

  if (compact) {
    return (
      <div className={`mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2 text-xs ${
        expired ? 'border-red-200 bg-red-50 text-red-800' : 'border-blue-200 bg-blue-50 text-blue-800'
      }`}>
        <span className="flex items-center gap-1.5 font-semibold">
          <CalendarClock className="h-3.5 w-3.5" />
          {countdownLabel(remaining)}
        </span>
        <span>Remise au plus tard le {format(dueAt, 'dd/MM/yyyy', { locale: fr })}</span>
      </div>
    )
  }

  return (
    <div className={`mt-4 rounded-xl border p-4 ${
      expired ? 'border-red-200 bg-red-50' : 'border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50'
    }`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className={`rounded-lg p-2 ${expired ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
            <CalendarClock className="h-5 w-5" />
          </div>
          <div>
            <p className={`font-bold ${expired ? 'text-red-800' : 'text-blue-900'}`}>
              {countdownLabel(remaining)}
            </p>
            <p className="mt-0.5 text-xs text-gray-600">
              Remise prévue au plus tard le {format(dueAt, 'd MMMM yyyy', { locale: fr })}.
            </p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 self-start rounded-full bg-white px-3 py-1 text-xs font-semibold text-gray-700 shadow-sm sm:self-center">
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
          Le superadmin peut confirmer avant l’échéance
        </span>
      </div>
    </div>
  )
}
