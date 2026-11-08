'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { callPlanDateShortcuts, callPlanToday } from '@/utils/call-plan-dates'

export function CallPlanDatePicker({ id, value, onChange }: { id: string; value: string; onChange: (value: string) => void }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>Date de la relance</Label>
      <Input id={id} type="date" min={callPlanToday()} value={value} onChange={(event) => onChange(event.target.value)} />
      <div className="flex flex-wrap gap-2">
        {callPlanDateShortcuts().map((shortcut) => (
          <Button key={shortcut.label} type="button" size="sm" variant={value === shortcut.value ? 'default' : 'outline'} onClick={() => onChange(shortcut.value)}>
            {shortcut.label}
          </Button>
        ))}
      </div>
    </div>
  )
}
