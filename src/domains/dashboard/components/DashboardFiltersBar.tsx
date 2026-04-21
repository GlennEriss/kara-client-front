'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { CalendarDays, Filter, Layers3, MapPinned, RotateCcw, Users } from 'lucide-react'
import type { DashboardTabKey } from '../entities/dashboard-tabs.types'
import type { DashboardFilterOptions, DashboardFilters } from '../entities/dashboard.types'

interface DashboardFiltersBarProps {
  activeTab: DashboardTabKey
  filters: DashboardFilters
  filterOptions?: DashboardFilterOptions
  onChange: (next: DashboardFilters) => void
  onReset: () => void
}

export function DashboardFiltersBar({
  activeTab,
  filters,
  filterOptions,
  onChange,
  onReset,
}: DashboardFiltersBarProps) {
  const provinces = filterOptions?.provinces || []

  const availableCities =
    filters.zoneProvince !== 'all'
      ? filterOptions?.citiesByProvince?.[filters.zoneProvince] || []
      : Array.from(
        new Set(
          Object.values(filterOptions?.citiesByProvince || {})
            .flat()
            .filter((city) => city && city.trim())
        )
      ).sort((a, b) => a.localeCompare(b, 'fr'))

  const update = (partial: Partial<DashboardFilters>) => {
    onChange({ ...filters, ...partial })
  }

  const periodLabels: Record<DashboardFilters['period'], string> = {
    all: 'Depuis le debut',
    today: "Aujourd'hui",
    '7d': '7 derniers jours',
    '30d': '30 derniers jours',
    month: 'Mois en cours',
    custom: 'Personnalisee',
  }

  const memberTypeLabels: Record<DashboardFilters['memberType'], string> = {
    all: 'Tous',
    adherant: 'Adherant',
    bienfaiteur: 'Bienfaiteur',
    sympathisant: 'Sympathisant',
  }

  const moduleCompareLabels: Record<DashboardFilters['moduleCompare'], string> = {
    all: 'Tous modules',
    caisse: 'Caisse',
    credit: 'Credit',
    placement: 'Placement',
  }

  const activeFilters = [
    filters.period !== 'all' ? `Periode: ${periodLabels[filters.period]}` : null,
    filters.memberType !== 'all' ? `Type: ${memberTypeLabels[filters.memberType]}` : null,
    filters.zoneProvince !== 'all' ? `Province: ${filters.zoneProvince}` : null,
    filters.zoneCity !== 'all' ? `Ville: ${filters.zoneCity}` : null,
    activeTab === 'executive' && filters.moduleCompare !== 'all'
      ? `Module: ${moduleCompareLabels[filters.moduleCompare]}`
      : null,
  ].filter(Boolean) as string[]

  const hasActiveFilters = activeFilters.length > 0

  const fieldWrapperClass = cn(
    'space-y-2 rounded-xl border border-kara-primary-dark/10 bg-white/85 p-3',
    'transition-all duration-200 hover:border-kara-primary-dark/25 hover:shadow-sm'
  )

  const selectTriggerClass = cn(
    'h-11 w-full rounded-xl border-kara-primary-dark/15 bg-white text-kara-primary-dark',
    'shadow-none transition-all duration-200 hover:border-kara-primary-dark/30',
    'focus-visible:border-kara-primary-dark focus-visible:ring-kara-primary-dark/20'
  )

  return (
    <div className="overflow-hidden rounded-2xl border border-kara-primary-dark/15 bg-gradient-to-br from-white via-kara-primary-dark/[0.02] to-kara-primary-light/[0.08] shadow-[0_14px_32px_-24px_rgba(34,77,98,0.5)]">
      <div className="border-b border-kara-primary-dark/10 px-4 py-3 sm:px-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-kara-primary-dark text-white shadow-sm">
              <Filter className="h-4 w-4" />
            </span>
            <div>
              <p className="text-sm font-black text-kara-primary-dark">Filtres dashboard</p>
              <p className="text-xs text-muted-foreground">Affinez la lecture des indicateurs.</p>
            </div>
          </div>

          <div className="flex w-full items-center gap-2 sm:w-auto">
            <Badge
              variant="outline"
              className="hidden border-kara-primary-dark/20 bg-white/85 text-kara-primary-dark sm:inline-flex"
            >
              {hasActiveFilters ? `${activeFilters.length} filtre(s) actif(s)` : 'Aucun filtre actif'}
            </Badge>

            <Button
              id="dashboard-reset"
              type="button"
              variant="outline"
              className={cn(
                'h-10 w-full border-kara-primary-dark/20 text-kara-primary-dark sm:w-auto',
                'hover:border-kara-primary-dark hover:bg-kara-primary-dark hover:text-white'
              )}
              onClick={onReset}
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Reinitialiser
            </Button>
          </div>
        </div>
      </div>

      <div className="space-y-4 p-4 sm:p-5">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className={fieldWrapperClass}>
            <Label
              htmlFor="dashboard-period"
              className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-kara-primary-dark/80"
            >
              <CalendarDays className="h-3.5 w-3.5" />
              Periode
            </Label>
            <Select
              value={filters.period}
              onValueChange={(value: DashboardFilters['period']) => {
                if (value === 'custom') {
                  update({ period: value })
                } else {
                  update({ period: value, customFrom: undefined, customTo: undefined })
                }
              }}
            >
              <SelectTrigger id="dashboard-period" className={selectTriggerClass}>
                <SelectValue placeholder="Periode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Depuis le debut</SelectItem>
                <SelectItem value="today">Aujourd'hui</SelectItem>
                <SelectItem value="7d">7 derniers jours</SelectItem>
                <SelectItem value="30d">30 derniers jours</SelectItem>
                <SelectItem value="month">Mois en cours</SelectItem>
                <SelectItem value="custom">Personnalisee</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className={fieldWrapperClass}>
            <Label
              htmlFor="dashboard-member-type"
              className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-kara-primary-dark/80"
            >
              <Users className="h-3.5 w-3.5" />
              Type membre
            </Label>
            <Select
              value={filters.memberType}
              onValueChange={(value: DashboardFilters['memberType']) => update({ memberType: value })}
            >
              <SelectTrigger id="dashboard-member-type" className={selectTriggerClass}>
                <SelectValue placeholder="Type membre" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                <SelectItem value="adherant">Adherant</SelectItem>
                <SelectItem value="bienfaiteur">Bienfaiteur</SelectItem>
                <SelectItem value="sympathisant">Sympathisant</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className={fieldWrapperClass}>
            <Label
              htmlFor="dashboard-province"
              className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-kara-primary-dark/80"
            >
              <MapPinned className="h-3.5 w-3.5" />
              Province
            </Label>
            <Select
              value={filters.zoneProvince}
              onValueChange={(value) => {
                if (value === 'all') {
                  update({ zoneProvince: 'all', zoneCity: 'all' })
                  return
                }
                update({ zoneProvince: value, zoneCity: 'all' })
              }}
            >
              <SelectTrigger id="dashboard-province" className={selectTriggerClass}>
                <SelectValue placeholder="Province" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes</SelectItem>
                {provinces.map((province) => (
                  <SelectItem key={province} value={province}>
                    {province}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className={fieldWrapperClass}>
            <Label
              htmlFor="dashboard-city"
              className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-kara-primary-dark/80"
            >
              <MapPinned className="h-3.5 w-3.5" />
              Ville
            </Label>
            <Select
              value={filters.zoneCity}
              onValueChange={(value) => update({ zoneCity: value })}
            >
              <SelectTrigger id="dashboard-city" className={selectTriggerClass}>
                <SelectValue placeholder="Ville" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes</SelectItem>
                {availableCities.map((city) => (
                  <SelectItem key={city} value={city}>
                    {city}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {activeTab === 'executive' && (
          <div className="rounded-xl border border-kara-primary-dark/15 bg-white/85 p-4">
            <div className="space-y-2 sm:max-w-sm">
              <Label
                htmlFor="dashboard-module-compare"
                className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-kara-primary-dark/80"
              >
                <Layers3 className="h-3.5 w-3.5" />
                Comparaison des modules (Executif)
              </Label>
              <Select
                value={filters.moduleCompare}
                onValueChange={(value: DashboardFilters['moduleCompare']) => update({ moduleCompare: value })}
              >
                <SelectTrigger id="dashboard-module-compare" className={selectTriggerClass}>
                  <SelectValue placeholder="Module" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous modules</SelectItem>
                  <SelectItem value="caisse">Caisse</SelectItem>
                  <SelectItem value="credit">Credit</SelectItem>
                  <SelectItem value="placement">Placement</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {filters.period === 'custom' && (
          <div className="rounded-xl border border-kara-primary-dark/15 bg-white/85 p-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-kara-primary-dark/80">
              Periode personnalisee
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="dashboard-custom-from" className="text-sm font-medium text-kara-primary-dark">
                  Date debut
                </Label>
                <Input
                  id="dashboard-custom-from"
                  type="date"
                  value={filters.customFrom || ''}
                  onChange={(event) => update({ customFrom: event.target.value })}
                  className="h-11 rounded-xl border-kara-primary-dark/15 bg-white focus-visible:border-kara-primary-dark focus-visible:ring-kara-primary-dark/20"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="dashboard-custom-to" className="text-sm font-medium text-kara-primary-dark">
                  Date fin
                </Label>
                <Input
                  id="dashboard-custom-to"
                  type="date"
                  value={filters.customTo || ''}
                  onChange={(event) => update({ customTo: event.target.value })}
                  className="h-11 rounded-xl border-kara-primary-dark/15 bg-white focus-visible:border-kara-primary-dark focus-visible:ring-kara-primary-dark/20"
                />
              </div>
            </div>
          </div>
        )}

        {hasActiveFilters && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-kara-primary-dark/70">
              Filtres actifs
            </span>
            {activeFilters.map((filterLabel) => (
              <span
                key={filterLabel}
                className="rounded-full border border-kara-primary-dark/20 bg-white/90 px-3 py-1 text-xs font-medium text-kara-primary-dark"
              >
                {filterLabel}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
