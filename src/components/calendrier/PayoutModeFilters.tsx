"use client"

import { cn } from "@/lib/utils"
import { TrendingUp, Calendar, Filter } from "lucide-react"
import type { PayoutMode } from "@/types/types"

interface PayoutModeFiltersProps {
  selectedModes: PayoutMode[]
  onModesChange: (modes: PayoutMode[]) => void
}

const PAYOUT_MODE_CONFIG: Record<PayoutMode, { label: string; description: string; icon: typeof TrendingUp; color: string }> = {
  MonthlyCommission_CapitalEnd: { 
    label: "Commission mensuelle", 
    description: "Commission chaque mois, capital à la fin",
    icon: Calendar,
    color: "blue"
  },
  CapitalPlusCommission_End: { 
    label: "Capital + Commissions", 
    description: "Tout à la fin du placement",
    icon: TrendingUp,
    color: "purple"
  },
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
    <div className="bg-gradient-to-r from-gray-50/80 to-slate-50/80 rounded-xl p-5 border border-gray-100">
      <div className="flex items-center gap-2 mb-4">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#234D65]/10">
          <Filter className="h-4 w-4 text-[#234D65]" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Filtres par mode de règlement</h3>
          <p className="text-xs text-gray-500">Sélectionnez les types de placements à afficher</p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {(Object.keys(PAYOUT_MODE_CONFIG) as PayoutMode[]).map((mode) => {
          const config = PAYOUT_MODE_CONFIG[mode]
          const isSelected = selectedModes.includes(mode)
          const Icon = config.icon
          
          return (
            <button
              key={mode}
              onClick={() => toggleMode(mode)}
              className={cn(
                "group relative flex items-start gap-3 p-4 rounded-xl border-2 transition-all duration-300 text-left",
                isSelected
                  ? config.color === "blue"
                    ? "bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-300 shadow-lg shadow-blue-100/50"
                    : "bg-gradient-to-br from-purple-50 to-violet-50 border-purple-300 shadow-lg shadow-purple-100/50"
                  : "bg-white border-gray-200 hover:border-gray-300 hover:shadow-md"
              )}
            >
              {/* Indicateur de sélection */}
              <div className={cn(
                "absolute top-3 right-3 w-5 h-5 rounded-full border-2 transition-all duration-300 flex items-center justify-center",
                isSelected
                  ? config.color === "blue"
                    ? "bg-blue-500 border-blue-500"
                    : "bg-purple-500 border-purple-500"
                  : "border-gray-300 group-hover:border-gray-400"
              )}>
                {isSelected && (
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>

              {/* Icône */}
              <div className={cn(
                "flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-300",
                isSelected
                  ? config.color === "blue"
                    ? "bg-blue-500 text-white shadow-lg shadow-blue-500/30"
                    : "bg-purple-500 text-white shadow-lg shadow-purple-500/30"
                  : "bg-gray-100 text-gray-500 group-hover:bg-gray-200"
              )}>
                <Icon className="w-5 h-5" />
              </div>

              {/* Contenu */}
              <div className="flex-1 min-w-0 pr-6">
                <div className={cn(
                  "font-semibold text-sm transition-colors",
                  isSelected
                    ? config.color === "blue" ? "text-blue-900" : "text-purple-900"
                    : "text-gray-900"
                )}>
                  {config.label}
                </div>
                <div className={cn(
                  "text-xs mt-0.5 transition-colors",
                  isSelected
                    ? config.color === "blue" ? "text-blue-600" : "text-purple-600"
                    : "text-gray-500"
                )}>
                  {config.description}
                </div>
              </div>
            </button>
          )
        })}
      </div>

      {selectedModes.length === 0 && (
        <div className="mt-4 flex items-center gap-2 text-sm text-amber-600 bg-amber-50 rounded-lg p-3 border border-amber-200">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>Tous les modes de règlement sont affichés</span>
        </div>
      )}
    </div>
  )
}
