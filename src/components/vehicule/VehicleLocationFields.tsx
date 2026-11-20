'use client'

import { useQuery } from '@tanstack/react-query'
import { ServiceFactory } from '@/factories/ServiceFactory'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import type { VehicleLocation } from '@/domains/vehicles/location'

/** Même référentiel et mêmes relations que la section Géographie. */
export function VehicleLocationFields({
  value,
  onChange,
  disabled = false,
  allowOther = false,
}: {
  value: VehicleLocation
  onChange: (value: VehicleLocation) => void
  disabled?: boolean
  allowOther?: boolean
}) {
  const service = ServiceFactory.getGeographieService()
  const communes = useQuery({
    queryKey: ['vehicle-geography', 'communes'],
    queryFn: () => service.getAllCommunes(),
    staleTime: 900000,
  })
  const districts = useQuery({
    queryKey: ['vehicle-geography', 'districts', value.communeId],
    queryFn: () => service.getDistrictsByCommuneId(value.communeId!),
    enabled: !!value.communeId,
    staleTime: 900000,
  })
  const quarters = useQuery({
    queryKey: ['vehicle-geography', 'quarters', value.districtId],
    queryFn: () => service.getQuartersByDistrictId(value.districtId!),
    enabled: !!value.districtId,
    staleTime: 900000,
  })
  const select = (
    label: string,
    selected: string | undefined,
    items: { id: string; name: string }[],
    change: (id: string) => void,
    loading: boolean,
    enabled = true,
  ) => (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Select
        value={selected || ''}
        onValueChange={change}
        disabled={disabled || loading || !enabled}
      >
        <SelectTrigger aria-label={label} className="h-11">
          <SelectValue
            placeholder={
              loading ? 'Chargement…' : `Choisir ${label.toLowerCase()}`
            }
          />
        </SelectTrigger>
        <SelectContent>
          {[...items]
            .sort((a, b) => a.name.localeCompare(b.name, 'fr'))
            .map((item) => (
              <SelectItem key={item.id} value={item.id}>
                {item.name}
              </SelectItem>
            ))}
        </SelectContent>
      </Select>
    </div>
  )
  return (
    <div className="space-y-3" data-testid="vehicle-geography-fields">
      {!value.quarterId && (value.quarter || value.city) && (
        <p className="text-xs text-slate-500">
          Localisation enregistrée :{' '}
          {[value.city, value.quarter].filter(Boolean).join(' · ')}.
          Sélectionnez les références ci-dessous pour la rattacher à Géographie.
        </p>
      )}
      {select(
        'Ville',
        value.communeId,
        communes.data || [],
        (id) =>
          onChange({
            ...value,
            communeId: id,
            city: communes.data?.find((row) => row.id === id)?.name || '',
            districtId: '',
            district: '',
            quarterId: '',
            quarter: '',
          }),
        communes.isPending,
      )}
      {allowOther && (
        <div className="space-y-2">
          <Label>Localisation</Label>
          <Select
            value={value.locationType || 'quarter'}
            onValueChange={(type) =>
              onChange({
                ...value,
                locationType: type as 'quarter' | 'other',
                quarterId: '',
                quarter: '',
                locationDetails: '',
              })
            }
            disabled={disabled}
          >
            <SelectTrigger aria-label="Localisation">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="quarter">Quartier</SelectItem>
              <SelectItem value="other">Autre emplacement</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}
      {value.locationType === 'other' ? (
        <div className="space-y-2">
          <Label>Précisez l’emplacement</Label>
          <Input
            aria-label="Précisez l’emplacement"
            value={value.locationDetails || ''}
            onChange={(event) =>
              onChange({ ...value, locationDetails: event.target.value })
            }
            disabled={disabled}
          />
        </div>
      ) : (
        <>
          {select(
            'Arrondissement',
            value.districtId,
            districts.data || [],
            (id) =>
              onChange({
                ...value,
                districtId: id,
                district:
                  districts.data?.find((row) => row.id === id)?.name || '',
                quarterId: '',
                quarter: '',
              }),
            districts.isFetching,
            !!value.communeId,
          )}
          {select(
            'Quartier',
            value.quarterId,
            quarters.data || [],
            (id) =>
              onChange({
                ...value,
                quarterId: id,
                quarter:
                  quarters.data?.find((row) => row.id === id)?.name || '',
              }),
            quarters.isFetching,
            !!value.districtId,
          )}
        </>
      )}
      {(communes.isError || districts.isError || quarters.isError) && (
        <p role="alert" className="text-sm text-red-600">
          Le référentiel géographique est indisponible. Réessayez avant
          d’enregistrer la localisation.
        </p>
      )}
    </div>
  )
}
