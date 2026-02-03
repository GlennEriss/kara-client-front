import { getActiveSettings } from '@/db/caisse/settings.db'
import { computeBonus } from '@/services/caisse/engine'
import type { CaisseType } from '@/services/caisse/types'
import type {
  CaisseSpecialeSimulationInput,
  CaisseSpecialeSimulationResult,
  CaisseSpecialeSimulationRow,
} from './simulation/types'

/**
 * Calcule l'échéancier de simulation pour Caisse Spéciale (Standard / Standard Charitable).
 * Utilise les paramètres actifs (bonusTable M4–M12) et la logique engine.computeBonus.
 * Aucune persistance.
 */
export async function runCaisseSpecialeSimulation(
  input: CaisseSpecialeSimulationInput
): Promise<CaisseSpecialeSimulationResult> {
  const { caisseType, monthlyAmount, durationMonths, startDate } = input

  const settings = await getActiveSettings(caisseType as CaisseType)
  const rows: CaisseSpecialeSimulationRow[] = []
  const start = new Date(startDate)

  for (let i = 0; i < durationMonths; i++) {
    const dueAt = new Date(start)
    dueAt.setMonth(start.getMonth() + i)

    const bonusRatePercent = computeBonus(i, settings ?? undefined)
    const bonusAmount = Math.round((monthlyAmount * bonusRatePercent) / 100)
    const bonusEffectiveLabel = i < 3 ? '—' : `M${i + 1}`

    rows.push({
      monthLabel: `M${i + 1}`,
      monthIndex: i,
      dueAt,
      bonusEffectiveLabel,
      amount: monthlyAmount,
      bonusRatePercent,
      bonusAmount,
    })
  }

  const totalAmount = rows.reduce((s, r) => s + r.amount, 0)
  const totalBonus = rows.reduce((s, r) => s + r.bonusAmount, 0)

  return {
    rows,
    totalAmount,
    totalBonus,
    settingsId: settings?.id,
    noActiveSettings: settings == null,
  }
}

/**
 * Vérifie si des paramètres actifs existent pour le type donné (pour message "aucun paramètre").
 */
export async function hasActiveSettingsForType(caisseType: CaisseType): Promise<boolean> {
  const settings = await getActiveSettings(caisseType)
  return settings != null
}
