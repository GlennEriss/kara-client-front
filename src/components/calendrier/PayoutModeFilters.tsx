"use client"

import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import type { PayoutMode } from "@/types/types"

interface PayoutModeFiltersProps {
  selectedModes: PayoutMode[]
  onModesChange: (modes: PayoutMode[]) => void
}

const PAYOUT_MODE_LABELS: Record<PayoutMode, string> = {
  MonthlyCommission_CapitalEnd: "Commission mensuelle",
  CapitalPlusCommission_End: "Capital + commissions à la fin",
}

export function PayoutModeFilters({
  selectedModes,
  onModesChange,
}: PayoutModeFiltersProps) {
  const toggleMode = (mode: PayoutMode) => {
    if (selectedModes.includes(mode)) {
      onModesChange(selectedModes.filter((m) => m !== mode))
    } else {
      onModesChange([...selectedModes, mode])
    }
  }

  return (
    <Card className="p-4">
      <div className="space-y-3">
        <Label className="text-sm font-semibold">Filtres par mode de règlement</Label>
        <div className="flex flex-wrap gap-4">
          {(Object.keys(PAYOUT_MODE_LABELS) as PayoutMode[]).map((mode) => (
            <div key={mode} className="flex items-center space-x-2">
              <Switch
                id={`filter-${mode}`}
                checked={selectedModes.includes(mode)}
                onCheckedChange={() => toggleMode(mode)}
              />
              <Label
                htmlFor={`filter-${mode}`}
                className="text-sm font-medium cursor-pointer"
              >
                {PAYOUT_MODE_LABELS[mode]}
              </Label>
            </div>
          ))}
        </div>
        {selectedModes.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Aucun filtre sélectionné
          </p>
        )}
      </div>
    </Card>
  )
}
