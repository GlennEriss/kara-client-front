import { useMutation } from '@tanstack/react-query'
import { CreditFixeSimulationService } from '../services/CreditFixeSimulationService'
import type {
  FixedCustomSimulationInput,
  FixedSimulationResult,
  FixedStandardSimulationInput,
} from '../entities/fixed-simulation.types'

const simulationService = CreditFixeSimulationService.getInstance()

export function useCreditFixeSimulation() {
  const calculateStandard = useMutation<FixedSimulationResult, Error, FixedStandardSimulationInput>({
    mutationFn: (input) => Promise.resolve(simulationService.calculateStandardSimulation(input)),
  })

  const calculateCustom = useMutation<FixedSimulationResult, Error, FixedCustomSimulationInput>({
    mutationFn: (input) => Promise.resolve(simulationService.calculateCustomSimulation(input)),
  })

  return {
    calculateStandard,
    calculateCustom,
  }
}
