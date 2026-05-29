/**
 * Panneau de résultats du sondage : barres horizontales par option
 *
 * Affiche : option, nombre de votes, %, leader (mis en évidence).
 * Lecture seule — les actions (clôturer, confirmer) sont dans EventDetailPage.
 */

'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Trophy, Vote } from 'lucide-react'
import type { Event } from '../entities/event.types'
import { EventsService } from '../services/EventsService'

interface Props {
  event: Event
}

export function PollResultsPanel({ event }: Props) {
  if (!event.pollEnabled || !event.proposedLocations || event.proposedLocations.length === 0) {
    return null
  }

  const results = EventsService.getInstance().computePollResults(event)

  return (
    <Card>
      <CardContent className="p-5 md:p-6 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Vote className="h-5 w-5 text-amber-600" />
            <h2 className="text-lg font-semibold text-[#234D65]">Résultats du sondage</h2>
          </div>
          <div className="text-sm text-gray-600">
            <strong className="text-[#234D65]">{results.totalVotes}</strong>{' '}
            votant{results.totalVotes > 1 ? 's' : ''} au total
          </div>
        </div>

        {results.totalVotes === 0 && (
          <p className="text-sm text-gray-500 italic">
            Aucun vote enregistré pour le moment.
          </p>
        )}

        <div className="space-y-3">
          {event.proposedLocations.map((opt) => {
            const count = results.byOptionId[opt.id] ?? 0
            const pct = results.percentByOptionId[opt.id] ?? 0
            const isLeader = results.leadingOptionId === opt.id && results.totalVotes > 0
            return (
              <div key={opt.id} className="space-y-1">
                <div className="flex items-baseline justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    {isLeader && <Trophy className="h-4 w-4 text-amber-500 shrink-0" />}
                    <span className={`font-medium truncate ${isLeader ? 'text-amber-700' : 'text-gray-800'}`}>
                      {opt.name}
                    </span>
                  </div>
                  <span className="text-sm font-semibold text-gray-600 shrink-0">
                    {count} ({pct}%)
                  </span>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-100">
                  <div
                    className={`h-full rounded-full transition-all ${isLeader ? 'bg-amber-500' : 'bg-[#234D65]'}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                {(opt.address || opt.description) && (
                  <p className="text-xs text-gray-500">
                    {opt.address}
                    {opt.address && opt.description && ' · '}
                    {opt.description}
                  </p>
                )}
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
