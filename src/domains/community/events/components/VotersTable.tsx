/**
 * Table des votants par option (admin)
 *
 * Affiche : matricule, nom, option votée, date du vote.
 * Avec filtre par option et compteur.
 */

'use client'

import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { useState } from 'react'
import type { Event } from '../entities/event.types'
import { useEventVoters } from '../hooks/useEventVoters'

interface Props {
  event: Event
}

export function VotersTable({ event }: Props) {
  const { data: voters, isLoading } = useEventVoters(event.id)
  const [filterOptionId, setFilterOptionId] = useState<'all' | string>('all')

  if (!event.pollEnabled) return null

  const options = event.proposedLocations ?? []
  const optionLabel = (optionId: string) =>
    options.find((o) => o.id === optionId)?.name ?? optionId

  const filtered = (voters ?? []).filter(
    (v) => filterOptionId === 'all' || v.optionId === filterOptionId,
  )

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-[#234D65]">
            Détail des votes
          </h3>
          <p className="text-xs text-gray-500">
            Liste nominative des membres ayant voté.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setFilterOptionId('all')}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition-all cursor-pointer ${
              filterOptionId === 'all'
                ? 'border-[#234D65] bg-[#234D65] text-white'
                : 'border-slate-200 bg-white text-slate-600 hover:border-[#234D65]/50'
            }`}
          >
            Tous ({voters?.length ?? 0})
          </button>
          {options.map((opt) => {
            const count = (voters ?? []).filter((v) => v.optionId === opt.id).length
            const isActive = filterOptionId === opt.id
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => setFilterOptionId(opt.id)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition-all cursor-pointer ${
                  isActive
                    ? 'border-[#234D65] bg-[#234D65] text-white'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-[#234D65]/50'
                }`}
              >
                {opt.name} ({count})
              </button>
            )
          })}
        </div>
      </div>

      {isLoading && (
        <div className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      )}

      {!isLoading && filtered.length === 0 && (
        <p className="py-6 text-center text-sm text-gray-500 border border-dashed border-gray-200 rounded-lg">
          Aucun vote {filterOptionId === 'all' ? 'enregistré' : 'pour cette option'}.
        </p>
      )}

      {!isLoading && filtered.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Matricule</TableHead>
              <TableHead>Nom</TableHead>
              <TableHead>Option choisie</TableHead>
              <TableHead className="text-right">Date du vote</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((v) => (
              <TableRow key={v.memberId}>
                <TableCell className="font-mono text-xs">{v.memberId}</TableCell>
                <TableCell>{v.memberName ?? '—'}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-200">
                    {optionLabel(v.optionId)}
                  </Badge>
                </TableCell>
                <TableCell className="text-right text-xs text-gray-500">
                  {format(v.votedAt, "d MMM yyyy 'à' HH:mm", { locale: fr })}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  )
}
