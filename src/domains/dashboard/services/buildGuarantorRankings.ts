import type { CreditType } from '@/types/types'
import type { FinancialReportSources } from '@/domains/financial/reports/entities/financial-report-sources.types'
import type { DashboardRankingBlock, DashboardRankingItem } from '../entities/dashboard.types'
import { addRankingValue, rankingDate, rankingIdentity, rankingMoney, rankingText, sortedRanking, type RankingMember, type RankingRange } from './ranking-utils'

/** Contract filters concern borrowers, matching the section's existing perimeter.
 * Payment beneficiaries are historical: never substitute the contract's current guarantor. */
export function buildGuarantorRankings(sources: FinancialReportSources, type: CreditType, members: RankingMember[], range: RankingRange, now: Date): DashboardRankingBlock[] {
  const identify = rankingIdentity(members)
  const contracts = new Map(sources.creditContracts
    .filter(c => c.creditType === type && !['DRAFT', 'PENDING', 'APPROVED', 'SIMULATED', 'REJECTED', 'REFUSED', 'CANCELLED', 'CANCELED'].includes(c.status))
    .map(c => [c.id, c]))
  const guarantees = new Map<string, DashboardRankingItem>()
  const earnings = new Map<string, DashboardRankingItem>()
  const paymentsByPerson = new Map<string, { payments: number; contracts: Set<string> }>()
  for (const contract of contracts.values()) {
    if (!rankingDate(contract.disbursementDate ?? contract.createdAt, range, now)) continue
    const item = identify(contract.guarantorId, [contract.guarantorLastName, contract.guarantorFirstName].filter(Boolean).join(' '))
    addRankingValue(guarantees, item, 1)
  }
  const seen = new Set<string>()
  for (const payment of sources.guarantorPayments) {
    const contract = contracts.get(payment.creditId)
    if (!contract || seen.has(payment.id) || !rankingDate(payment.paymentDate, range, now) || rankingMoney(payment.amount) <= 0) continue
    seen.add(payment.id)
    const fallback = payment.guarantorId === contract.guarantorId
      ? [contract.guarantorLastName, contract.guarantorFirstName].filter(Boolean).join(' ') : ''
    const item = identify(payment.guarantorId, fallback)
    if (!item?.id) continue
    addRankingValue(earnings, item, rankingMoney(payment.amount))
    const detail = paymentsByPerson.get(item.id) || { payments: 0, contracts: new Set<string>() }
    detail.payments++
    detail.contracts.add(contract.id)
    paymentsByPerson.set(item.id, detail)
  }
  return [
    { key: 'top_guarantors_contracts', title: 'Top 10 des garants — Contrats garantis', unit: 'contrats',
      description: 'Contrats finalisés des emprunteurs du périmètre, regroupés par garant. Date de décaissement, sinon création du contrat, dans la période choisie. INCONNU / LE KARA est exclu.',
      items: sortedRanking([...guarantees.values()]) },
    { key: 'top_guarantors_paid', title: 'Top 10 des garants — Gains réellement reçus', unit: 'FCFA',
      description: 'Commissions remises et enregistrées à leur date de paiement, sur les contrats des emprunteurs du périmètre. Aucun gain prévisionnel ; INCONNU / LE KARA est exclu.',
      items: sortedRanking([...earnings.values()].map(item => {
        const detail = paymentsByPerson.get(item.id!)!
        return { ...item, subLabel: `${rankingText(item.subLabel)} · ${detail.payments} versement(s) · ${detail.contracts.size} contrat(s)` }
      })) },
  ]
}
