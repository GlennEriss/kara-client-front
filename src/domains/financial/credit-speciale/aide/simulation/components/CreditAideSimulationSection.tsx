'use client'

import { CreditFixeSimulationSection } from '@/domains/financial/credit-speciale/fixe/simulation/components/CreditFixeSimulationSection'
import type { StandardSimulation, CustomSimulation } from '@/types/types'

interface CreditAideSimulationSectionProps {
  initialAmount?: number
  lockAmount?: boolean
  onSimulationSelect?: (simulation: StandardSimulation | CustomSimulation) => void
}

export function CreditAideSimulationSection({
  initialAmount,
  lockAmount = false,
  onSimulationSelect,
}: CreditAideSimulationSectionProps = {}) {
  return (
    <CreditFixeSimulationSection
      creditType="AIDE"
      initialAmount={initialAmount}
      lockAmount={lockAmount}
      onSimulationSelect={onSimulationSelect}
    />
  )
}
