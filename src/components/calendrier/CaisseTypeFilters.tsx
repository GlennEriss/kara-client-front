"use client"

import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import type { CaisseType } from "@/services/caisse/types"

interface CaisseTypeFiltersProps {
  selectedTypes: CaisseType[]
  onTypesChange: (types: CaisseType[]) => void
}

const CAISSE_TYPE_LABELS: Record<CaisseType, string> = {
  JOURNALIERE: "Journaliers",
  STANDARD: "Standard",
  LIBRE: "Libre",
  STANDARD_CHARITABLE: "Standard Charitable",
  JOURNALIERE_CHARITABLE: "Journalière Charitable",
  LIBRE_CHARITABLE: "Libre Charitable",
}

export function CaisseTypeFilters({
  selectedTypes,
  onTypesChange,
}: CaisseTypeFiltersProps) {
  const toggleType = (type: CaisseType) => {
    if (selectedTypes.includes(type)) {
      onTypesChange(selectedTypes.filter((t) => t !== type))
    } else {
      onTypesChange([...selectedTypes, type])
    }
  }

  return (
    <Card className="p-4">
      <div className="space-y-3">
        <Label className="text-sm font-semibold">Filtres par type de contrat</Label>
        <div className="flex flex-wrap gap-4">
          {(Object.keys(CAISSE_TYPE_LABELS) as CaisseType[]).map((type) => (
            <div key={type} className="flex items-center space-x-2">
              <Switch
                id={`filter-${type}`}
                checked={selectedTypes.includes(type)}
                onCheckedChange={() => toggleType(type)}
              />
              <Label
                htmlFor={`filter-${type}`}
                className="text-sm font-medium cursor-pointer"
              >
                {CAISSE_TYPE_LABELS[type]}
              </Label>
            </div>
          ))}
        </div>
        {selectedTypes.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Aucun filtre sélectionné
          </p>
        )}
      </div>
    </Card>
  )
}
