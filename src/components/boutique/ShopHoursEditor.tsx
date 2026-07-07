'use client'

import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import type { ShopDayHours } from '@/types/types'

export const SHOP_DAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']

/** 7 jours par défaut (fermés, 08:00–18:00). */
export function makeDefaultHours(): ShopDayHours[] {
  return SHOP_DAYS.map((day) => ({ day, closed: true, open: '08:00', close: '18:00' }))
}

/** Garantit un tableau de 7 jours cohérent (complète/normalise si besoin). */
export function normalizeHours(value?: ShopDayHours[]): ShopDayHours[] {
  if (!value || value.length === 0) return makeDefaultHours()
  return SHOP_DAYS.map((day, i) => {
    const found = value.find((h) => h.day === day) ?? value[i]
    return {
      day,
      closed: found?.closed ?? true,
      open: found?.open || '08:00',
      close: found?.close || '18:00',
    }
  })
}

interface Props {
  value: ShopDayHours[]
  onChange: (value: ShopDayHours[]) => void
}

export default function ShopHoursEditor({ value, onChange }: Props) {
  const hours = normalizeHours(value)

  const setDay = (index: number, patch: Partial<ShopDayHours>) =>
    onChange(hours.map((h, i) => (i === index ? { ...h, ...patch } : h)))

  const applyFirstToAll = () => {
    const ref = hours[0]
    onChange(hours.map((h) => ({ ...h, closed: ref.closed, open: ref.open, close: ref.close })))
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-xs text-gray-500">Horaires d&apos;ouverture</Label>
        <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={applyFirstToAll}>
          Appliquer lundi à tous
        </Button>
      </div>
      <div className="divide-y rounded-lg border">
        {hours.map((h, i) => (
          <div key={h.day} className="flex items-center gap-3 px-3 py-2">
            <span className="w-20 shrink-0 text-sm font-medium text-gray-700">{h.day}</span>
            <div className="flex items-center gap-2">
              <Switch checked={!h.closed} onCheckedChange={(v) => setDay(i, { closed: !v })} />
              <span className="w-12 text-xs text-gray-500">{h.closed ? 'Fermé' : 'Ouvert'}</span>
            </div>
            {!h.closed && (
              <div className="flex items-center gap-1">
                <input
                  type="time"
                  value={h.open}
                  onChange={(e) => setDay(i, { open: e.target.value })}
                  className="h-8 rounded-md border border-gray-200 px-2 text-sm"
                />
                <span className="text-gray-400">–</span>
                <input
                  type="time"
                  value={h.close}
                  onChange={(e) => setDay(i, { close: e.target.value })}
                  className="h-8 rounded-md border border-gray-200 px-2 text-sm"
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
