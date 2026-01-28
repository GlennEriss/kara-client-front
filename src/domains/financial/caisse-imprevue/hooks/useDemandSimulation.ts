/**
 * Hook pour calculer la simulation de versements d'une demande
 */

import { useMemo } from 'react'
import { DemandSimulationService } from '../services/DemandSimulationService'
import type { CaisseImprevueDemand } from '../entities/demand.types'
import type { PaymentSchedule } from '../services/DemandSimulationService'

const simulationService = DemandSimulationService.getInstance()

export function useDemandSimulation(demand: CaisseImprevueDemand | null) {
  return useMemo<PaymentSchedule | null>(() => {
    if (!demand) return null

    return simulationService.calculatePaymentSchedule(demand)
  }, [demand])
}
