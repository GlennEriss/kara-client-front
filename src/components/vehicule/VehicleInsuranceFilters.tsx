'use client'

import { useMemo } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import type { VehicleInsuranceFilters } from '@/types/types'
import { RefreshCw } from 'lucide-react'

interface Props {
  filters: VehicleInsuranceFilters
  onChange: (filters: VehicleInsuranceFilters) => void
  onReset?: () => void
  companies?: string[]
}

export function VehicleInsuranceFilters({ filters, onChange, onReset, companies }: Props) {
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
      <div className="space-y-2 lg:col-span-2">
        <Label htmlFor="search">Recherche</Label>
        <Input
          id="search"
          placeholder="Nom, plaque, assurance, numéro de police..."
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
        <Label>Type de véhicule</Label>
        <Select value={filters.vehicleType || 'all'} onValueChange={value => updateFilter({ vehicleType: value as VehicleInsuranceFilters['vehicleType'] })}>
          <SelectTrigger>
            <SelectValue placeholder="Tous les types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous</SelectItem>
            <SelectItem value="car">Voiture</SelectItem>
            <SelectItem value="motorcycle">Moto</SelectItem>
            <SelectItem value="truck">Camion</SelectItem>
            <SelectItem value="bus">Bus</SelectItem>
            <SelectItem value="maison">Maison</SelectItem>
            <SelectItem value="other">Autre</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Compagnie</Label>
        {uniqueCompanies.length > 0 ? (
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
        ) : (
          <Input placeholder="Nom de l’assurance" value={filters.insuranceCompany || ''} onChange={event => updateFilter({ insuranceCompany: event.target.value || undefined })} />
        )}
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

