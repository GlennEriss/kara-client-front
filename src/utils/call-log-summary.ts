import { REACHED_OUTCOMES, type CallLog } from '@/services/call-logs/callLog'

/** Shared with the web journal: WhatsApp delivery is never a reached phone call. */
export function callLogSummary(
  filtered: CallLog[],
  all: CallLog[],
  now = Date.now(),
) {
  const calls = filtered.filter((log) => log.channel === 'call')
  const reached = calls.filter((log) =>
    REACHED_OUTCOMES.includes(log.outcome),
  ).length
  const paidAfter = new Map<string, number>()
  for (const log of all)
    if (log.outcome === 'paiement_effectue')
      paidAfter.set(
        log.personKey,
        Math.max(paidAfter.get(log.personKey) || 0, log.createdAt.getTime()),
      )
  const broken = filtered.filter(
    (log) =>
      log.outcome === 'promesse_paiement' &&
      log.promiseToPayAt &&
      log.promiseToPayAt.getTime() <= now &&
      (!paidAfter.get(log.personKey) ||
        paidAfter.get(log.personKey)! < log.createdAt.getTime()),
  )
  const people = new Map<
    string,
    { name: string; total: number; reached: number; promises: number }
  >()
  for (const log of filtered) {
    const row = people.get(log.adminName) || {
      name: log.adminName,
      total: 0,
      reached: 0,
      promises: 0,
    }
    row.total++
    if (REACHED_OUTCOMES.includes(log.outcome)) row.reached++
    if (log.outcome === 'promesse_paiement') row.promises++
    people.set(log.adminName, row)
  }
  return {
    total: filtered.length,
    calls: calls.length,
    reachRate: calls.length ? Math.round((reached / calls.length) * 100) : 0,
    brokenPromises: broken.length,
    brokenAmount: broken.reduce(
      (sum, log) => sum + (log.promiseAmount || log.totalOverdue || 0),
      0,
    ),
    byCaller: [...people.values()].sort((a, b) => b.total - a.total),
  }
}
