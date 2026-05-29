/**
 * Page de liste des événements (admin)
 *
 * - Onglets : Tous / À venir / Sondages en cours / Brouillons / Passés / Annulés
 * - Filtre par type
 * - Tri par date de début (desc par défaut)
 * - Pagination cursor-based (charger plus)
 */

'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import routes from '@/constantes/routes'
import { useEvents } from '../hooks/useEvents'
import { useEventStats } from '../hooks/useEventStats'
import type { EventFilters, EventStats } from '../entities/event-filters.types'
import type { Event, EventStatus, EventType } from '../entities/event.types'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import {
  CalendarHeart,
  ChevronRight,
  MapPin,
  Megaphone,
  Plus,
  RefreshCw,
  Users as UsersIcon,
  Vote,
} from 'lucide-react'
import Link from 'next/link'
import { useMemo, useState } from 'react'
import { EVENT_TYPE_LABEL, EventStatusBadge, EventTypeBadge } from './event-meta'

type TabKey = 'all' | 'upcoming' | 'poll_open' | 'draft' | 'past' | 'cancelled'

const TABS: { key: TabKey; label: string }[] = [
  { key: 'all', label: 'Tous' },
  { key: 'upcoming', label: 'À venir' },
  { key: 'poll_open', label: 'Sondages' },
  { key: 'draft', label: 'Brouillons' },
  { key: 'past', label: 'Passés' },
  { key: 'cancelled', label: 'Annulés' },
]

function tabToFilters(tab: TabKey): EventFilters {
  const now = new Date()
  switch (tab) {
    case 'upcoming':
      return {
        status: ['published', 'poll_open', 'location_confirmed'],
        fromDate: now,
      }
    case 'poll_open':
      return { status: 'poll_open' }
    case 'draft':
      return { status: 'draft' }
    case 'past':
      return { status: ['completed', 'location_confirmed', 'published'], toDate: now }
    case 'cancelled':
      return { status: 'cancelled' }
    case 'all':
    default:
      return {}
  }
}

function tabCount(stats: EventStats | undefined, tab: TabKey): number | undefined {
  if (!stats) return undefined
  switch (tab) {
    case 'all':
      return stats.total
    case 'upcoming':
      return stats.upcoming
    case 'poll_open':
      return stats.pollOpen
    case 'draft':
      return stats.draft
    case 'past':
      return stats.past
    case 'cancelled':
      return stats.cancelled
  }
}

function StatusFilterTabs({
  active,
  onChange,
  stats,
}: {
  active: TabKey
  onChange: (tab: TabKey) => void
  stats: EventStats | undefined
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {TABS.map((t) => {
        const isActive = active === t.key
        const count = tabCount(stats, t.key)
        return (
          <button
            key={t.key}
            type="button"
            onClick={() => onChange(t.key)}
            className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-sm font-semibold transition-all cursor-pointer ${
              isActive
                ? 'border-[#234D65] bg-[#234D65] text-white'
                : 'border-slate-200 bg-white text-slate-600 hover:border-[#234D65]/50 hover:text-[#234D65]'
            }`}
          >
            {t.label}
            {count != null && count > 0 && (
              <span
                className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                  isActive ? 'bg-white/20' : 'bg-slate-100'
                }`}
              >
                {count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

const TYPE_GRADIENT: Record<string, string> = {
  assembly:    'from-[#234D65] to-[#1a3f56]',
  celebration: 'from-purple-700 to-purple-950',
  training:    'from-sky-700 to-sky-950',
  charity:     'from-emerald-700 to-emerald-950',
  other:       'from-gray-600 to-gray-900',
}

function EventCard({ event, index = 0 }: { event: Event; index?: number }) {
  const locationLabel = event.finalLocation?.name
    ?? (event.pollEnabled
      ? `${event.proposedLocations?.length ?? 0} option(s) — sondage`
      : null)
  const gradient = event.type ? (TYPE_GRADIENT[event.type] ?? TYPE_GRADIENT.other) : TYPE_GRADIENT.other

  return (
    <div
      className="animate-in fade-in-0 slide-in-from-bottom-2 duration-300"
      style={{ animationDelay: `${index * 40}ms` }}
    >
      <Link href={routes.admin.eventDetails(event.id)} className="block group h-full">
        <div className="h-full flex flex-col rounded-2xl border border-gray-100 bg-white shadow-sm hover:border-gray-200 hover:shadow-md transition-all duration-200 overflow-hidden">

          {/* Cover image */}
          <div className={`relative h-40 shrink-0 bg-gradient-to-br ${gradient} overflow-hidden`}>
            {event.imageURL && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={event.imageURL}
                alt=""
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
            )}
            {/* Poll badge top-right */}
            {event.pollEnabled && (
              <div className="absolute top-3 right-3 flex items-center gap-1 rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold text-white shadow">
                <Vote className="h-3 w-3" />
                Sondage
              </div>
            )}
          </div>

          {/* Header : type + ID / statut */}
          <div className="flex items-start justify-between px-5 pt-4 pb-0 gap-3">
            <div className="min-w-0">
              {event.type && <EventTypeBadge type={event.type} />}
              <p className="font-mono text-[11px] text-gray-400 truncate mt-1">{event.id}</p>
            </div>
            <EventStatusBadge status={event.status} />
          </div>

          {/* Titre */}
          <div className="px-5 pt-2">
            <h3 className="text-sm font-semibold text-gray-900 group-hover:text-[#234D65] transition-colors line-clamp-2 leading-snug">
              {event.title}
            </h3>
          </div>

          {/* Stats grid */}
          <div className="px-5 pt-3">
            <div className="grid grid-cols-2 gap-3 rounded-xl bg-gray-50 p-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-0.5">Date</p>
                <p className="text-sm font-medium text-gray-800">
                  {format(event.startDate, 'd MMM yyyy', { locale: fr })}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-0.5">Heure</p>
                <p className="text-sm font-medium text-gray-800">
                  {format(event.startDate, "HH'h'mm", { locale: fr })}
                </p>
              </div>
              {locationLabel && (
                <div className="col-span-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-0.5">Lieu</p>
                  <p className="text-sm font-medium text-gray-800 flex items-center gap-1.5 truncate">
                    <MapPin className="h-3.5 w-3.5 shrink-0 text-[#234D65]" />
                    <span className="truncate">{locationLabel}</span>
                  </p>
                </div>
              )}
              {event.pollEnabled && (
                <div className="col-span-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-0.5">Votes</p>
                  <p className="text-sm font-medium text-gray-800 flex items-center gap-1.5">
                    <UsersIcon className="h-3.5 w-3.5 shrink-0 text-[#234D65]" />
                    {event.totalVotes ?? 0} votant{(event.totalVotes ?? 0) > 1 ? 's' : ''}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Action */}
          <div className="mt-auto px-5 pb-5 pt-4 border-t border-gray-100">
            <div className="flex items-center justify-between text-sm font-semibold text-[#234D65] group-hover:text-[#2c5a73] transition-colors">
              <span>Voir les détails</span>
              <ChevronRight className="h-4 w-4" />
            </div>
          </div>

        </div>
      </Link>
    </div>
  )
}

export function EventsListPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('all')
  const [typeFilter, setTypeFilter] = useState<'all' | EventType>('all')

  const filters: EventFilters = useMemo(() => {
    const f = tabToFilters(activeTab)
    if (typeFilter !== 'all') f.type = typeFilter
    return f
  }, [activeTab, typeFilter])

  const { data, isLoading, isFetching, isError, refetch } = useEvents(filters, { pageSize: 20 }, {
    field: 'startDate',
    direction: activeTab === 'past' ? 'desc' : 'asc',
  })

  const stats = useEventStats()

  const events = data?.events ?? []

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4 md:p-5 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <StatusFilterTabs active={activeTab} onChange={setActiveTab} stats={stats.data} />
            <div className="flex items-center gap-2">
              <Select
                value={typeFilter}
                onValueChange={(v) => setTypeFilter(v as never)}
              >
                <SelectTrigger className="w-48 h-9">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les types</SelectItem>
                  {Object.entries(EVENT_TYPE_LABEL).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void refetch()}
                disabled={isFetching}
                aria-label="Rafraîchir"
              >
                <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
              </Button>
              <Button asChild size="sm" className="bg-[#234D65] hover:bg-[#1A3D4F]">
                <Link href={routes.admin.eventNew}>
                  <Plus className="h-4 w-4 mr-1" />
                  Nouvel événement
                </Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Liste */}
      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Skeleton className="h-64 w-full rounded-lg" />
          <Skeleton className="h-64 w-full rounded-lg" />
          <Skeleton className="h-64 w-full rounded-lg" />
        </div>
      )}

      {isError && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-5 text-sm text-red-700">
            Impossible de charger les événements. Réessayez plus tard.
          </CardContent>
        </Card>
      )}

      {!isLoading && !isError && events.length === 0 && (
        <Card>
          <CardContent className="p-10 text-center space-y-3">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#234D65]/10 text-[#234D65]">
              <Megaphone className="h-7 w-7" />
            </div>
            <h3 className="text-lg font-semibold text-gray-800">Aucun événement</h3>
            <p className="text-sm text-gray-500 max-w-md mx-auto">
              Créez un événement pour qu&apos;il apparaisse ici. Les membres pourront ensuite le
              consulter et, si vous l&apos;activez, voter pour le lieu.
            </p>
            <Button asChild className="bg-[#234D65] hover:bg-[#1A3D4F]">
              <Link href={routes.admin.eventNew}>
                <Plus className="h-4 w-4 mr-1" />
                Créer un événement
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {!isLoading && events.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {events.map((e, i) => (
            <EventCard key={e.id} event={e} index={i} />
          ))}
          {Boolean(data?.nextCursor) && (
            <div className="pt-2 text-center">
              {/* Page suivante : à brancher si on implémente "Load more".
                  Pour l'instant on indique simplement qu'il y a plus de résultats. */}
              <p className="text-xs text-gray-500">
                D&apos;autres résultats sont disponibles — affinez les filtres.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
