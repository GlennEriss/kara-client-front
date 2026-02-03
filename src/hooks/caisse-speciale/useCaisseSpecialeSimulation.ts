import { useMutation } from '@tanstack/react-query'
import { runCaisseSpecialeSimulation } from '@/services/caisse-speciale/CaisseSpecialeSimulationService'
import type { CaisseSpecialeSimulationInput, CaisseSpecialeSimulationResult } from '@/services/caisse-speciale/simulation/types'

/**
 * Hook pour lancer une simulation Caisse Spéciale (Standard / Standard Charitable).
 * Pas de persistance ; calcul côté client avec paramètres actifs (bonusTable).
 */
export function useCaisseSpecialeSimulation() {
  return useMutation<CaisseSpecialeSimulationResult, Error, CaisseSpecialeSimulationInput>({
    mutationFn: runCaisseSpecialeSimulation,
  })
}
