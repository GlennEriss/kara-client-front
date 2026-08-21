'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import {
  AlertCircle,
  Check,
  Clock3,
  ExternalLink,
  History,
  Pause,
  X,
} from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import type { MemberFormEntry, MemberFormOutcome } from '../entities/member-form.types'
import { useMemberForm } from '../hooks/useMemberForm'

const OUTCOME_CONFIG: Record<MemberFormOutcome, {
  label: string
  shortLabel: string
  className: string
  selectedClassName: string
  icon: typeof Check
}> = {
  onTime: {
    label: 'Payée à temps',
    shortLabel: 'À temps',
    className: 'border-emerald-200 bg-emerald-100 text-emerald-700 hover:bg-emerald-200',
    selectedClassName: 'ring-2 ring-emerald-500 ring-offset-2',
    icon: Check,
  },
  late: {
    label: 'Payée en retard',
    shortLabel: 'Retard',
    className: 'border-amber-200 bg-amber-100 text-amber-700 hover:bg-amber-200',
    selectedClassName: 'ring-2 ring-amber-500 ring-offset-2',
    icon: Clock3,
  },
  missed: {
    label: 'Échéance impayée',
    shortLabel: 'Impayée',
    className: 'border-red-200 bg-red-100 text-red-700 hover:bg-red-200',
    selectedClassName: 'ring-2 ring-red-500 ring-offset-2',
    icon: X,
  },
  excused: {
    label: 'Report accordé',
    shortLabel: 'Report',
    className: 'border-sky-200 bg-sky-100 text-sky-700 hover:bg-sky-200',
    selectedClassName: 'ring-2 ring-sky-500 ring-offset-2',
    icon: Pause,
  },
}

const formatDate = (value: Date) =>
  value.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })

const formatAmount = (amount: number) => `${Math.round(amount).toLocaleString('fr-FR')} FCFA`

function EntryDetails({
  entry,
  onNavigate,
}: {
  entry: MemberFormEntry
  onNavigate?: () => void
}) {
  const config = OUTCOME_CONFIG[entry.outcome]

  return (
    <div
      className="rounded-xl border border-slate-200 bg-slate-50/80 p-4"
      data-testid="member-form-entry-details"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-slate-900">{entry.product}</p>
          <p className="mt-0.5 text-sm text-slate-500">{entry.label}</p>
        </div>
        <Badge variant="outline" className={cn('font-medium', config.className)}>
          {config.label}
        </Badge>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        <div>
          <dt className="text-xs text-slate-500">Échéance</dt>
          <dd className="mt-1 font-medium text-slate-800">{formatDate(entry.dueAt)}</dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500">Montant</dt>
          <dd className="mt-1 font-medium text-slate-800">{formatAmount(entry.amount)}</dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500">Paiement</dt>
          <dd className="mt-1 font-medium text-slate-800">
            {entry.paidAt ? formatDate(entry.paidAt) : 'Non payé'}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500">Écart</dt>
          <dd className="mt-1 font-medium text-slate-800">
            {entry.outcome === 'excused'
              ? 'Neutralisé'
              : entry.daysLate > 0
                ? `${entry.daysLate} jour${entry.daysLate > 1 ? 's' : ''}`
                : '0 jour'}
          </dd>
        </div>
      </dl>

      {entry.contractHref && (
        <Button asChild variant="link" size="sm" className="mt-3 h-auto p-0 text-[#234D65]">
          <Link href={entry.contractHref} onClick={onNavigate}>
            Voir le contrat
            <ExternalLink className="ml-1 h-3.5 w-3.5" />
          </Link>
        </Button>
      )}
    </div>
  )
}

export function MemberFormCard({
  memberId,
  onNavigate,
}: {
  memberId: string
  /** Permet notamment de fermer une modale avant d'ouvrir le contrat. */
  onNavigate?: () => void
}) {
  const { data, isLoading, isError, refetch } = useMemberForm(memberId)
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const selectedEntry = data?.entries.find((entry) => entry.key === selectedKey) ?? null
  const punctuality = data?.punctualityRate == null
    ? null
    : Math.round(data.punctualityRate * 100)

  return (
    <Card className="border-0 bg-linear-to-br from-white to-slate-50/70 shadow-lg">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg font-bold text-slate-900">
              <History className="h-5 w-5 text-[#234D65]" />
              Historique d’activité
            </CardTitle>
            <p className="mt-1 text-sm text-slate-500">Les 10 dernières échéances du membre</p>
          </div>
          {!isLoading && !isError && (
            <div className="rounded-xl bg-[#234D65] px-3 py-2 text-right text-white">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-white/70">Ponctualité</p>
              <p className="text-lg font-bold">{punctuality == null ? '—' : `${punctuality} %`}</p>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4" data-testid="member-form-card">
        {isLoading && (
          <div className="space-y-4" data-testid="member-form-loading">
            <div className="flex gap-2 overflow-hidden">
              {Array.from({ length: 10 }, (_, index) => (
                <Skeleton key={index} className="h-11 w-11 shrink-0 rounded-full" />
              ))}
            </div>
            <Skeleton className="h-20 w-full" />
          </div>
        )}

        {isError && (
          <div className="flex flex-col items-center rounded-xl border border-red-100 bg-red-50 p-5 text-center">
            <AlertCircle className="h-6 w-6 text-red-600" />
            <p className="mt-2 text-sm font-medium text-red-800">Impossible de charger l’historique.</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={() => refetch()}>
              Réessayer
            </Button>
          </div>
        )}

        {!isLoading && !isError && data?.entries.length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center">
            <History className="mx-auto h-7 w-7 text-slate-300" />
            <p className="mt-2 text-sm font-medium text-slate-600">Aucune échéance passée</p>
            <p className="mt-1 text-xs text-slate-400">La forme récente apparaîtra après la première échéance.</p>
          </div>
        )}

        {!isLoading && !isError && data && data.entries.length > 0 && (
          <>
            <div className="overflow-x-auto pb-2">
              <div className="flex min-w-max gap-2" aria-label="Forme récente du membre">
                {data.entries.map((entry) => {
                  const config = OUTCOME_CONFIG[entry.outcome]
                  const Icon = config.icon
                  const isSelected = entry.key === selectedKey
                  const detail = entry.daysLate > 0
                    ? `${entry.daysLate} j`
                    : config.shortLabel

                  return (
                    <Tooltip key={entry.key}>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          aria-label={`${entry.product}, ${config.label}, échéance du ${formatDate(entry.dueAt)}`}
                          aria-pressed={isSelected}
                          onClick={() => setSelectedKey(isSelected ? null : entry.key)}
                          className={cn(
                            'flex h-12 w-12 shrink-0 items-center justify-center rounded-full border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#234D65] focus-visible:ring-offset-2',
                            config.className,
                            isSelected && config.selectedClassName,
                          )}
                        >
                          <Icon className="h-5 w-5" aria-hidden="true" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        <p className="font-semibold">{entry.product}</p>
                        <p>{formatDate(entry.dueAt)} · {detail}</p>
                      </TooltipContent>
                    </Tooltip>
                  )
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-center sm:grid-cols-4">
              <div className="rounded-lg bg-emerald-50 px-2 py-2">
                <p className="text-lg font-bold text-emerald-700">{data.onTimeCount}</p>
                <p className="text-[11px] text-emerald-700">À temps</p>
              </div>
              <div className="rounded-lg bg-amber-50 px-2 py-2">
                <p className="text-lg font-bold text-amber-700">{data.lateCount}</p>
                <p className="text-[11px] text-amber-700">En retard</p>
              </div>
              <div className="rounded-lg bg-red-50 px-2 py-2">
                <p className="text-lg font-bold text-red-700">{data.missedCount}</p>
                <p className="text-[11px] text-red-700">Impayées</p>
              </div>
              <div className="rounded-lg bg-sky-50 px-2 py-2">
                <p className="text-lg font-bold text-sky-700">{data.excusedCount}</p>
                <p className="text-[11px] text-sky-700">Reports</p>
              </div>
            </div>

            {selectedEntry ? (
              <EntryDetails entry={selectedEntry} onNavigate={onNavigate} />
            ) : (
              <p className="text-center text-xs text-slate-400">
                Sélectionnez un résultat pour afficher son détail.
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
