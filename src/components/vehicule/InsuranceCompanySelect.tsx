'use client'

import type { ComponentProps } from 'react'
import { insurerKey } from '@/domains/vehicles/insurance-companies'
import { useInsuranceCompanies } from '@/domains/vehicles/use-insurance-companies'

export function InsuranceCompanySelect({ value, onChange, legacyValue, ...props }: Omit<ComponentProps<'select'>, 'value' | 'onChange'> & {
  value: string
  onChange: (value: string) => void
  legacyValue?: string
}) {
  const catalog = useInsuranceCompanies()
  const names = catalog.data ?? []
  const current = names.find(name => insurerKey(name) === insurerKey(value))
  const legacy = legacyValue && !names.some(name => insurerKey(name) === insurerKey(legacyValue)) ? legacyValue : ''
  return (
    <div className="min-w-0 space-y-1">
      <select {...props} value={current ?? (value === legacy ? legacy : '')}
        onChange={event => onChange(event.target.value)}
        className="h-11 w-full min-w-0 rounded-lg border border-input bg-background px-3 text-sm focus-visible:ring-2 focus-visible:ring-ring">
        <option value="">{catalog.isPending ? 'Chargement des assureurs…' : 'Choisir un assureur'}</option>
        {names.map(name => <option key={name} value={name}>{name}</option>)}
        {legacy && <option value={legacy}>{legacy}</option>}
      </select>
      {catalog.isError && <button type="button" onClick={() => void catalog.refetch()}
        className="text-sm text-destructive underline">Assureurs indisponibles · Réessayer</button>}
    </div>
  )
}
