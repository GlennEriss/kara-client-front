"use client"

import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import type { CaisseImprevuePaymentFrequency } from "@/types/types"

interface PaymentFrequencyFiltersProps {
  selectedFrequencies: CaisseImprevuePaymentFrequency[]
  onFrequenciesChange: (frequencies: CaisseImprevuePaymentFrequency[]) => void
}

const PAYMENT_FREQUENCY_LABELS: Record<CaisseImprevuePaymentFrequency, string> = {
  DAILY: "Journaliers",
  MONTHLY: "Mensuels",
}

export function PaymentFrequencyFilters({
  selectedFrequencies,
  onFrequenciesChange,
}: PaymentFrequencyFiltersProps) {
  const toggleFrequency = (frequency: CaisseImprevuePaymentFrequency) => {
    if (selectedFrequencies.includes(frequency)) {
      onFrequenciesChange(selectedFrequencies.filter((f) => f !== frequency))
    } else {
      onFrequenciesChange([...selectedFrequencies, frequency])
    }
  }

  return (
    <Card className="p-4">
      <div className="space-y-3">
        <Label className="text-sm font-semibold">Filtres par type de contrat</Label>
        <div className="flex flex-wrap gap-4">
          {(Object.keys(PAYMENT_FREQUENCY_LABELS) as CaisseImprevuePaymentFrequency[]).map((frequency) => (
            <div key={frequency} className="flex items-center space-x-2">
              <Switch
                id={`filter-${frequency}`}
                checked={selectedFrequencies.includes(frequency)}
                onCheckedChange={() => toggleFrequency(frequency)}
              />
              <Label
                htmlFor={`filter-${frequency}`}
                className="text-sm font-medium cursor-pointer"
              >
                {PAYMENT_FREQUENCY_LABELS[frequency]}
              </Label>
            </div>
          ))}
        </div>
        {selectedFrequencies.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Aucun filtre sélectionné
          </p>
        )}
      </div>
    </Card>
  )
}
