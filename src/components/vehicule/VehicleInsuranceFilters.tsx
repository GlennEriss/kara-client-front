'use client'

import { insuranceAssetOptions } from '@/domains/vehicles/asset-types'
import { useInsuranceAssetTypes } from '@/domains/vehicles/use-insurance-asset-types'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { VehicleInsuranceFilters } from '@/types/types'
import { RefreshCw } from 'lucide-react'
import { useMemo } from 'react'

interface Props {
  filters: VehicleInsuranceFilters
  onChange: (filters: VehicleInsuranceFilters) => void
  onReset?: () => void
  companies?: string[]
  quarters?: { id: string; label: string; city: string }[]
}

export function VehicleInsuranceFilters({ filters, onChange, onReset, companies, quarters = [] }: Props) {
  const { data: customAssets } = useInsuranceAssetTypes()
  const uniqueCompanies = useMemo(() => {
    if (!companies || companies.length === 0) return []
    return Array.from(new Set(companies)).sort((a, b) => a.localeCompare(b))
  }, [companies])

  const updateFilter = (partial: Partial<VehicleInsuranceFilters>) => {
    onChange({
      ...filters,
      ...partial,
      page: 1,
    })
  }

  return (
    <div className="grid gap-4 lg:grid-cols-4 bg-white border rounded-2xl shadow-sm p-4">
      <div className="space-y-2">
        <Label>Quartier du bien assuré</Label>
        <Select value={filters.locationMissing ? 'missing' : filters.quarterId || 'all'} onValueChange={value => updateFilter({ quarterId: value === 'all' || value === 'missing' ? undefined : value, locationMissing: value === 'missing' })}>
          <SelectTrigger aria-label="Quartier du bien assuré"><SelectValue placeholder="Tous les quartiers" /></SelectTrigger>
          <SelectContent><SelectItem value="all">Tous les quartiers</SelectItem><SelectItem value="missing">À rattacher à Géographie</SelectItem>{quarters.map(row => <SelectItem key={row.id} value={row.id}>{row.label} · {row.city}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="space-y-2 lg:col-span-2">
        <Label htmlFor="search">Recherche</Label>
        <Input
          id="search"
          placeholder="Nom, immatriculation, référence du bien, assureur, numéro de police…"
          value={filters.searchQuery || ''}
          onChange={event => updateFilter({ searchQuery: event.target.value })}
        />
      </div>

      <div className="space-y-2">
        <Label>Statut</Label>
        <Select value={filters.status || 'all'} onValueChange={value => updateFilter({ status: value as VehicleInsuranceFilters['status'] })}>
          <SelectTrigger>
            <SelectValue placeholder="Tous les statuts" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous</SelectItem>
            <SelectItem value="active">Actifs</SelectItem>
            <SelectItem value="expires_soon">Expire bientôt</SelectItem>
            <SelectItem value="expired">Expirés</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Type de bien assuré</Label>
        <Select value={filters.vehicleType || 'all'} onValueChange={value => updateFilter({ vehicleType: value as VehicleInsuranceFilters['vehicleType'] })}>
          <SelectTrigger>
            <SelectValue placeholder="Tous les types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous</SelectItem>
            {insuranceAssetOptions(customAssets, { selected: filters.vehicleType, includeInactive: true }).map(({ value, label }) => (
              <SelectItem key={value} value={value}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Compagnie</Label>
          <Select value={filters.insuranceCompany || 'all'} onValueChange={value => updateFilter({ insuranceCompany: value === 'all' ? undefined : value })}>
            <SelectTrigger>
              <SelectValue placeholder="Toutes les compagnies" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes</SelectItem>
              {uniqueCompanies.map(company => (
                <SelectItem key={company} value={company}>
                  {company}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
      </div>

      <div className="space-y-2">
        <Label>Tri alphabétique</Label>
        <Select value={filters.alphabeticalOrder || 'asc'} onValueChange={value => updateFilter({ alphabeticalOrder: value as 'asc' | 'desc' })}>
          <SelectTrigger>
            <SelectValue placeholder="Ordre" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="asc">A → Z</SelectItem>
            <SelectItem value="desc">Z → A</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2 flex flex-col justify-end">
        <Label className="sr-only">Actions</Label>
        <Button type="button" variant="outline" className="w-full" onClick={() => (onReset ? onReset() : updateFilter({ searchQuery: '', status: 'all', vehicleType: 'all', insuranceCompany: undefined }))}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Réinitialiser
        </Button>
      </div>
    </div>
  )
}

