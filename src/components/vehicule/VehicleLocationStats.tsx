'use client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { vehicleLocationStats } from '@/domains/vehicles/location'

export function VehicleLocationStats({
  locations,
  title = 'Véhicules par quartier',
}: {
  locations?: ReturnType<typeof vehicleLocationStats>
  title?: string
}) {
  if (!locations) return null
  return (
    <Card className="rounded-2xl border border-gray-100 bg-white shadow-sm">
      <CardHeader>
        <CardTitle className="text-base text-[#234D65]">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase text-slate-500">
              Quartiers de Géographie
            </p>
            {locations.quarters.map((row) => (
              <div
                key={row.id}
                className="flex items-center justify-between gap-4 rounded-lg bg-slate-50 p-3 text-sm"
              >
                <span>
                  {row.label}
                  <span className="block text-xs text-slate-500">
                    {row.city}
                  </span>
                </span>
                <strong>{row.count}</strong>
              </div>
            ))}
            {!locations.quarters.length && (
              <p className="text-sm text-slate-500">
                Aucun quartier rattaché pour le moment.
              </p>
            )}
          </div>
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase text-slate-500">
              Villes
            </p>
            {locations.cities.map((row) => (
              <div
                key={row.id}
                className="flex justify-between rounded-lg bg-slate-50 p-3 text-sm"
              >
                <span>{row.label}</span>
                <strong>{row.count}</strong>
              </div>
            ))}
          </div>
        </div>
        <p className="text-xs text-slate-500">
          {locations.missing} véhicule(s) à rattacher à un quartier ·{' '}
          {locations.other} autre(s) emplacement(s) précisé(s). Les anciens noms
          libres restent à renseigner depuis « Modifier » ; aucun quartier n’est
          deviné.
        </p>
      </CardContent>
    </Card>
  )
}
