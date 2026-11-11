import type { SourceRecord } from '@/domains/financial/reports/entities/financial-report-sources.types'
import type { DashboardRankingItem, DashboardTabPayload } from '../entities/dashboard.types'
import { addRankingValue, rankingDate, rankingIdentity, rankingMoney, rankingText, sortedRanking, type RankingMember, type RankingRange } from './ranking-utils'

/** Each insurance dossier is one introduction; renewal rewards never add vehicles.
 * The reward's beneficiary remains authoritative for each historical payment. */
export function buildVehicleDashboard(insurances: SourceRecord[], rewards: SourceRecord[], members: RankingMember[], range: RankingRange, now: Date, memberIds?: Set<string>): DashboardTabPayload {
  const identify = rankingIdentity(members)
  const inScope = (id: unknown, matricule: unknown) => !memberIds || memberIds.has(rankingText(id)) || memberIds.has(rankingText(matricule))
  const introductions = new Map<string, DashboardRankingItem>()
  const paid = new Map<string, DashboardRankingItem>()
  const kara = new Map<string, DashboardRankingItem>()
  const seenInsurances = new Set<string>(), seenRewards = new Set<string>()
  let introduced = 0, receivedTotal = 0, paidTotal = 0, karaTotal = 0, payable = 0
  for (const insurance of insurances) {
    if (seenInsurances.has(insurance.id) || (insurance.declarationStatus && insurance.declarationStatus !== 'validated')
      || !inScope(insurance.sponsorMemberId, insurance.sponsorMatricule)
      || !rankingDate(insurance.validatedAt ?? insurance.createdAt, range, now)) continue
    seenInsurances.add(insurance.id)
    introduced++
    addRankingValue(introductions, identify(insurance.sponsorMemberId, rankingText(insurance.sponsorName), insurance.sponsorMatricule), 1)
  }
  for (const reward of rewards) {
    if (seenRewards.has(reward.id) || !inScope(reward.beneficiaryId, reward.beneficiaryMatricule)) continue
    seenRewards.add(reward.id)
    const receipt = reward.partnerReceipt as Record<string, unknown> | undefined
    const payment = reward.memberPayment as Record<string, unknown> | undefined
    const receivedAt = rankingDate(receipt?.receivedAt, null, now)
    const received = rankingMoney(receipt?.amount)
    if (!receivedAt || !received) continue
    const share = rankingMoney(reward.memberAmount)
    const paidAt = rankingDate(payment?.paidAt, null, now)
    const confirmedPayment = !!paidAt && paidAt >= receivedAt
    payable += share - (confirmedPayment ? share : 0)
    const person = identify(reward.beneficiaryId, rankingText(reward.beneficiaryName), reward.beneficiaryMatricule)
    if (rankingDate(receivedAt, range, now)) {
      receivedTotal += received
      karaTotal += received - share
      addRankingValue(kara, person, received - share)
    }
    if (confirmedPayment && rankingDate(paidAt, range, now)) {
      paidTotal += share
      addRankingValue(paid, person, share)
    }
  }
  return {
    title: 'Véhicules', subtitle: 'Apports des parrains, commissions effectivement reçues et reversements confirmés.',
    kpis: [
      { key: 'introduced', label: 'Véhicules apportés', value: introduced, format: 'number', subtitle: 'Dossiers validés dans la période ; renouvellements exclus', tone: 'primary' },
      { key: 'received', label: 'Commissions reçues des assureurs', value: receivedTotal, format: 'currency', subtitle: 'Réceptions datées dans la période', tone: 'success' },
      { key: 'sponsors_paid', label: 'Commissions remises aux parrains', value: paidTotal, format: 'currency', subtitle: 'Remises datées et confirmées dans la période' },
      { key: 'kara_income', label: 'Part acquise à KARA', value: karaTotal, format: 'currency', subtitle: 'Commissions reçues moins parts réservées aux parrains', tone: 'success' },
      { key: 'sponsors_payable', label: 'Reste à reverser aux parrains', value: payable, format: 'currency', subtitle: 'Situation à ce jour, depuis l’origine', tone: 'warning' },
    ],
    rankings: [
      { key: 'top_vehicle_sponsors', title: 'Top 10 des parrains — Véhicules apportés', unit: 'véhicules', items: sortedRanking([...introductions.values()]),
        description: 'Dossiers validés dans la période choisie, regroupés par parrain. Un renouvellement ne compte pas comme un nouveau véhicule.' },
      { key: 'top_vehicle_sponsors_paid', title: 'Top 10 des parrains — Commissions réellement reçues', unit: 'FCFA', items: sortedRanking([...paid.values()]),
        description: 'Parts effectivement remises aux parrains, à la date enregistrée de remise. Les statuts et commissions attendues seuls ne comptent pas.' },
      { key: 'top_vehicle_sponsors_kara', title: 'Top 10 des parrains — Part apportée à KARA', unit: 'FCFA', items: sortedRanking([...kara.values()]),
        description: 'Commission réellement reçue de l’assureur moins la part réservée au parrain, à la date de réception. Le paiement ultérieur du parrain ne crée pas une seconde charge.' },
    ],
    notes: [
      'Dans cet onglet, les filtres de type de membre et de zone concernent les parrains, y compris pour les véhicules de non-membres.',
      'Les classements excluent le compte INCONNU. Les primes et commissions prévisionnelles ne sont pas des gains reçus.',
      'Les nouvelles assurances suivent leur date de validation, sinon de création. Les flux suivent leurs dates effectives ; le reste à reverser est un stock à ce jour.',
    ],
  }
}
