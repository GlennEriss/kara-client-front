'use client'

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

  return (
    <div className="rounded-xl border border-kara-primary-dark/10 bg-white p-4">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <div className="space-y-2">
          <Label htmlFor="dashboard-period">Periode</Label>
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
            <SelectTrigger id="dashboard-period">
              <SelectValue placeholder="Periode" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Aujourd'hui</SelectItem>
              <SelectItem value="7d">7 derniers jours</SelectItem>
              <SelectItem value="30d">30 derniers jours</SelectItem>
              <SelectItem value="month">Mois en cours</SelectItem>
              <SelectItem value="custom">Personnalisee</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="dashboard-member-type">Type membre</Label>
          <Select
            value={filters.memberType}
            onValueChange={(value: DashboardFilters['memberType']) => update({ memberType: value })}
          >
            <SelectTrigger id="dashboard-member-type">
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

        <div className="space-y-2">
          <Label htmlFor="dashboard-province">Province</Label>
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
            <SelectTrigger id="dashboard-province">
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

        <div className="space-y-2">
          <Label htmlFor="dashboard-city">Ville</Label>
          <Select
            value={filters.zoneCity}
            onValueChange={(value) => update({ zoneCity: value })}
          >
            <SelectTrigger id="dashboard-city">
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

        <div className="space-y-2">
          <Label htmlFor="dashboard-reset">Actions</Label>
          <Button
            id="dashboard-reset"
            type="button"
            variant="outline"
            className="w-full"
            onClick={onReset}
          >
            Reinitialiser
          </Button>
        </div>
      </div>

      {activeTab === 'executive' && (
        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <div className="space-y-2 sm:col-span-2 xl:col-span-2">
            <Label htmlFor="dashboard-module-compare">Module compare (Executive)</Label>
            <Select
              value={filters.moduleCompare}
              onValueChange={(value: DashboardFilters['moduleCompare']) => update({ moduleCompare: value })}
            >
              <SelectTrigger id="dashboard-module-compare">
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
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="dashboard-custom-from">Date debut</Label>
            <Input
              id="dashboard-custom-from"
              type="date"
              value={filters.customFrom || ''}
              onChange={(event) => update({ customFrom: event.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="dashboard-custom-to">Date fin</Label>
            <Input
              id="dashboard-custom-to"
              type="date"
              value={filters.customTo || ''}
              onChange={(event) => update({ customTo: event.target.value })}
            />
          </div>
        </div>
      )}
    </div>
  )
}
