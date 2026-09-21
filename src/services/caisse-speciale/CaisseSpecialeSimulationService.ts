import { getActiveSettings } from '@/db/caisse/settings.db'
import { computeContractBonus } from '@/services/caisse/bonus'
import type { CaisseType } from '@/services/caisse/types'
import type {
  CaisseSpecialeSimulationInput,
  CaisseSpecialeSimulationResult,
  CaisseSpecialeSimulationRow,
} from './simulation/types'
import { addContractMonths } from '@/utils/contract-months'

/**
 * Calcule l'échéancier de simulation pour Caisse Spéciale (Standard / Standard Charitable).
 * Utilise les paramètres actifs (bonusTable M4–M12) et `computeContractBonus`,
 * la même règle que le remboursement : le taux d'un mois est celui du mois
 * précédent, à partir du 5ᵉ mois. La simulation annonce donc exactement ce qui
 * sera versé, au lieu d'un mois d'avance.
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
    const dueAt = addContractMonths(start, i)

    // Simulation d'un contrat payé à l'heure : mois écoulés = mois soldés.
    const totalContributedAtMonth = monthlyAmount * (i + 1)
    const { ratePercent: bonusRatePercent, rateLabel, amount: bonusAmount } =
      computeContractBonus({
        paidMonthsCount: i + 1,
        totalPaid: totalContributedAtMonth,
        settings: settings ?? undefined,
      })
    const bonusEffectiveLabel = rateLabel ?? '—'

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
