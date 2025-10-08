import { CaisseContract, CaissePayment, CaisseSettings } from './types'

export function daysBetween(a: Date, b: Date): number {
  const ms = new Date(b).getTime() - new Date(a).getTime()
  return Math.floor(ms / (1000 * 60 * 60 * 24))
}

export function computeDueWindow(dueAt: Date, now: Date) {
  const d = daysBetween(dueAt, now)
  // Si le paiement est fait en avance (d négatif), pas de pénalité
  if (d < 0) return { window: 'LATE_NO_PENALTY' as const, delayDays: 0 }
  if (d <= 3) return { window: 'LATE_NO_PENALTY' as const, delayDays: Math.max(0, d) }
  if (d >= 4 && d <= 12) return { window: 'LATE_WITH_PENALTY' as const, delayDays: d }
  return { window: 'DEFAULTED_AFTER_J12' as const, delayDays: d }
}

export function computePenalty(monthlyAmount: number, delayDays: number, settings?: CaisseSettings | null): number {
  if (delayDays < 4) return 0
  const rules: any = settings?.penaltyRules || {}
  const perDay = rules?.day4To12?.perDay
  if (typeof perDay === 'number') {
    // Formule: (perDay / 100) * monthlyAmount * delayDays
    // perDay est un pourcentage (ex: 0.5 pour 0.5%)
    const penaltyRate = perDay / 100
    return penaltyRate * monthlyAmount * delayDays
  }
  const steps: Array<{ from: number; to: number; rate: number }> = rules?.day4To12?.steps || []
  const dayInWindow = Math.min(delayDays, 12) - 3
  let total = 0
  for (const s of steps) {
    const covered = Math.max(0, Math.min(dayInWindow, s.to) - s.from + 1)
    total += covered * s.rate * monthlyAmount / 100 // Appliquer le pourcentage au montant mensuel
  }
  return total
}

export function computeBonus(monthIndex: number, settings?: CaisseSettings | null): number {
  if (monthIndex < 3) return 0
  const key = `M${monthIndex + 1}`
  const table = settings?.bonusTable || {}
  return (table as any)[key] ?? 0
}

export function computeNextDueAt(contract: CaisseContract): Date | undefined {
  if (!contract.contractStartAt) return undefined
  const start = new Date(contract.contractStartAt)
  // currentMonthIndex représente déjà le prochain mois à payer (0-indexed)
  const m = contract.currentMonthIndex
  const next = new Date(start)
  next.setMonth(start.getMonth() + m)
  return next
}

