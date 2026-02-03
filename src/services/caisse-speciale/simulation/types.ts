import type { CaisseType } from '@/services/caisse/types'

/** Entrée du formulaire de simulation (Standard / Standard Charitable) */
export interface CaisseSpecialeSimulationInput {
  caisseType: CaisseType
  monthlyAmount: number
  durationMonths: number
  startDate: Date
}

/** Une ligne du tableau récapitulatif (une échéance) */
export interface CaisseSpecialeSimulationRow {
  /** Numéro d'échéance (1-based), ex. M1, M2 */
  monthLabel: string
  /** Index du mois (0-based) */
  monthIndex: number
  /** Date d'échéance (même jour chaque mois) */
  dueAt: Date
  /** Date de prise d'effet du bonus (M4, M5, … ou "—" pour M1–M3) */
  bonusEffectiveLabel: string
  /** Montant à verser (FCFA) */
  amount: number
  /** Taux bonus (%) pour cette échéance */
  bonusRatePercent: number
  /** Bonus gagné (FCFA) pour cette échéance */
  bonusAmount: number
}

/** Résultat complet de la simulation */
export interface CaisseSpecialeSimulationResult {
  rows: CaisseSpecialeSimulationRow[]
  totalAmount: number
  totalBonus: number
  /** Paramètres utilisés (pour affichage optionnel) */
  settingsId?: string
  /** True si aucun paramètre actif pour ce type (bonus à 0, message utilisateur) */
  noActiveSettings?: boolean
}
