import { CaisseContract, CaissePayment, CaisseSettings } from './types'

export function daysBetween(a: Date, b: Date): number {
  const ms = new Date(b).getTime() - new Date(a).getTime()
  return Math.floor(ms / (1000 * 60 * 60 * 24))
}

export function computeDueWindow(dueAt: Date, now: Date) {
  const d = daysBetween(dueAt, now)
  if (d <= 3) return { window: 'LATE_NO_PENALTY' as const, delayDays: Math.max(0, d) }
  if (d >= 4 && d <= 12) return { window: 'LATE_WITH_PENALTY' as const, delayDays: d }
  return { window: 'DEFAULTED_AFTER_J12' as const, delayDays: d }
}

export function computePenalty(monthlyAmount: number, delayDays: number, settings?: CaisseSettings | null): number {
  if (delayDays < 4) return 0
  const rules: any = settings?.penaltyRules || {}
  const perDay = rules?.day4To12?.perDay
  if (typeof perDay === 'number') {
    return Math.max(0, (Math.min(delayDays, 12) - 3)) * perDay
  }
  const steps: Array<{ from: number; to: number; rate: number }> = rules?.day4To12?.steps || []
  const dayInWindow = Math.min(delayDays, 12) - 3
  let total = 0
  for (const s of steps) {
    const covered = Math.max(0, Math.min(dayInWindow, s.to) - s.from + 1)
    total += covered * s.rate
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
  const m = contract.currentMonthIndex + 1
  const next = new Date(start)
  next.setMonth(start.getMonth() + m)
  return next
}

