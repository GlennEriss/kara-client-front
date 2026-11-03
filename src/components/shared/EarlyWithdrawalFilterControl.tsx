'use client'

import { useId } from 'react'
import { HandCoins } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { EarlyWithdrawalFilter } from '@/domains/financial/refunds/earlyWithdrawalFilter'

const OPTIONS: Array<{ value: EarlyWithdrawalFilter; label: string; description: string }> = [
  {
    value: 'all',
    label: 'Tous les contrats',
    description: 'Tous les contrats, avec ou sans demande de retrait anticipé.',
  },
  {
    value: 'IN_PROGRESS',
    label: 'Non payés',
    description: 'Demandes à valider ou retraits validés, sans remise d’argent confirmée.',
  },
  {
    value: 'FINALIZED',
    label: 'Payés',
    description: 'Retraits anticipés dont la remise d’argent au membre a été confirmée.',
  },
]

interface EarlyWithdrawalFilterControlProps {
  value: EarlyWithdrawalFilter
  onChange: (value: EarlyWithdrawalFilter) => void
}

/** Les retraits ont leur propre rangée pour garder les critères courants lisibles. */
export function EarlyWithdrawalFilterControl({ value, onChange }: EarlyWithdrawalFilterControlProps) {
  const descriptionId = useId()
  const selected = OPTIONS.find((option) => option.value === value) ?? OPTIONS[0]

  return (
    <div className="grid min-w-0 gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3 sm:p-4 xl:grid-cols-2 xl:items-center xl:gap-6">
      <div className="min-w-0 space-y-1">
        <p className="flex items-center gap-2 text-sm font-semibold text-slate-800">
          <HandCoins className="h-4 w-4 shrink-0 text-[#234D65]" />
          Retraits anticipés
        </p>
        <p id={descriptionId} aria-live="polite" className="text-xs leading-5 text-slate-500">
          {selected.description}
        </p>
      </div>

      <div role="group" aria-label="Filtrer par retrait anticipé" aria-describedby={descriptionId} className="grid min-w-0 grid-cols-3 gap-1.5 sm:gap-2">
        {OPTIONS.map((option) => (
          <Button
            key={option.value}
            type="button"
            variant="outline"
            aria-pressed={selected.value === option.value}
            onClick={() => onChange(option.value)}
            className={cn(
              'h-auto min-h-11 min-w-0 whitespace-normal rounded-lg px-2 py-2 text-center text-xs leading-4 shadow-none sm:text-sm sm:leading-5',
              selected.value === option.value
                ? 'border-[#234D65] bg-[#234D65] text-white hover:bg-[#2c5a73] hover:text-white'
                : 'border-slate-200 bg-white text-slate-600 hover:border-[#234D65]/40 hover:bg-white hover:text-[#234D65]',
            )}
          >
            {option.label}
          </Button>
        ))}
      </div>
    </div>
  )
}
