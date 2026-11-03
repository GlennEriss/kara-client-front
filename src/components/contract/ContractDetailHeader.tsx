'use client'

import type { ReactNode } from 'react'
import { ArrowLeft, type LucideIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface ContractDetailHeaderProps {
  contractLabel: string
  statusLabel: string
  statusClassName: string
  statusIcon?: LucideIcon
  onBack: () => void
  children?: ReactNode
  extraBadges?: ReactNode
  description?: ReactNode
}

/** En-tête partagé par les fiches de caisse, de crédit et de placement. */
export function ContractDetailHeader({
  contractLabel, statusLabel, statusClassName, statusIcon: StatusIcon,
  onBack, children, extraBadges, description,
}: ContractDetailHeaderProps) {
  return (
    <section aria-label="Navigation et état du contrat" className="min-w-0 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
      <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <Button type="button" variant="outline" onClick={onBack} className="h-10 w-fit shrink-0 gap-2 rounded-lg">
          <ArrowLeft className="h-4 w-4" />
          Retour
        </Button>

        {children && (
          <div
            role="group"
            aria-label="Actions du contrat"
            className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2 lg:flex lg:flex-wrap lg:justify-end [&>button]:h-auto [&>button]:min-h-10 [&>button]:w-full [&>button]:min-w-0 [&>button]:justify-start [&>button]:whitespace-normal [&>button]:rounded-lg [&>button]:text-left [&>button]:leading-5 lg:[&>button]:w-auto"
          >
            {children}
          </div>
        )}
      </div>

      <div className="mt-3 space-y-2 border-t border-slate-100 pt-3">
        <div aria-label="Type et statut du contrat" className="flex min-w-0 flex-wrap items-start gap-2">
          <Badge className="max-w-full whitespace-normal rounded-lg bg-[#234D65] px-3 py-1.5 text-left text-xs leading-5 text-white sm:text-sm">
            {contractLabel}
          </Badge>
          <Badge className={cn(statusClassName, 'max-w-full gap-1.5 whitespace-normal rounded-lg px-3 py-1.5 text-left text-xs leading-5 sm:text-sm')}>
            {StatusIcon && <StatusIcon className="h-4 w-4 shrink-0" />}
            {statusLabel}
          </Badge>
          {extraBadges}
        </div>
        {description && <p className="text-xs leading-5 text-slate-500">{description}</p>}
      </div>
    </section>
  )
}
