import type { FinancialReportModule } from '../entities/financial-report.types'
import type { FinancialReportContext, FinancialReportSources } from '../entities/financial-report-sources.types'
import { monthKeyOf } from '../utils/report-months'
import { addValues, flowValues, makeBlock, makeLine, stockValues, subtractValues, toNumber, type MonthAmount } from '../utils/report-lines'

const IGNORED_STATUSES = new Set(['Draft', 'Canceled'])
const PAID_COMMISSION_STATUSES = new Set(['Paid', 'Partial'])

/**
 * Placements : les bienfaiteurs confient un capital à l'association, qui leur
 * verse des commissions puis restitue le capital. Le capital est une dette ;
 * les commissions sont une charge.
 */
export function buildPlacementsModule(sources: FinancialReportSources, context: FinancialReportContext): FinancialReportModule {
  const { months } = context
  const placements = sources.placements.filter((placement) => !IGNORED_STATUSES.has(String(placement.status)))
  const placementIds = new Set(placements.map((placement) => placement.id))
  const earlyExitByPlacement = new Map(sources.placementEarlyExits.map((exit) => [exit.parentId, exit]))

  const capitalReceived: MonthAmount[] = []
  const capitalReturned: MonthAmount[] = []
  const commissionsPaid: MonthAmount[] = []
  const activeCount: MonthAmount[] = []

  for (const placement of placements) {
    const receivedMonth = monthKeyOf(placement.handoverDate ?? placement.startDate ?? placement.createdAt)
    capitalReceived.push({ month: receivedMonth, amount: toNumber(placement.amount) })
    activeCount.push({ month: receivedMonth, amount: 1 })

    const earlyExit = placement.status === 'EarlyExit' ? earlyExitByPlacement.get(placement.id) : undefined
    if (earlyExit) {
      // Sortie anticipée : le montant versé = capital + commission due.
      const month = monthKeyOf(earlyExit.paymentDate ?? earlyExit.withdrawalDate ?? earlyExit.validatedAt ?? earlyExit.createdAt)
      const commission = toNumber(earlyExit.commissionDue)
      capitalReturned.push({ month, amount: Math.max(0, toNumber(earlyExit.payoutAmount) - commission) })
      commissionsPaid.push({ month, amount: commission })
      activeCount.push({ month, amount: -1 })
    } else if (placement.capitalRepaidAt || placement.capitalRepaidAmount != null) {
      const month = monthKeyOf(placement.capitalRepaidAt ?? placement.endDate)
      capitalReturned.push({ month, amount: toNumber(placement.capitalRepaidAmount ?? placement.amount) })
      activeCount.push({ month, amount: -1 })
    }
  }

  for (const commission of sources.placementCommissions) {
    if (!placementIds.has(commission.parentId) || !PAID_COMMISSION_STATUSES.has(String(commission.status))) continue
    commissionsPaid.push({
      month: monthKeyOf(commission.paidAt ?? commission.paymentRecordedAt ?? commission.dueDate),
      amount: toNumber(commission.paidAmount ?? commission.amount),
    })
  }

  const received = flowValues(months, capitalReceived)
  const commissions = flowValues(months, commissionsPaid)
  const returned = flowValues(months, capitalReturned)
  const outTotal = addValues(commissions, returned)

  return {
    key: 'placements',
    title: 'Placements',
    description: 'Capitaux confiés par les bienfaiteurs, commissions versées et capitaux restitués.',
    blocks: [
      makeBlock('treasury', [
        makeLine('in_capital', 'Capitaux reçus des bienfaiteurs', received,
          'Capitaux confiés par les bienfaiteurs, comptés à la remise des fonds.'),
        makeLine('in_total', 'Total des entrées', received,
          'Tout l’argent reçu des bienfaiteurs dans le mois.', { level: 'subtotal' }),
        makeLine('out_commissions', 'Commissions versées', commissions,
          'Commissions payées aux bienfaiteurs pour rémunérer leur placement.'),
        makeLine('out_capital', 'Capitaux restitués', returned,
          'Capitaux rendus aux bienfaiteurs à la fin du placement ou lors d’une sortie anticipée.'),
        makeLine('out_total', 'Total des sorties', outTotal,
          'Tout l’argent versé aux bienfaiteurs dans le mois.', { level: 'subtotal' }),
        makeLine('net', 'Solde du mois', subtractValues(received, outTotal),
          'Entrées moins sorties.', { level: 'total' }),
      ]),
      makeBlock('result', [
        makeLine('charge_commissions', 'Charges : commissions versées aux bienfaiteurs', commissions,
          'Les commissions sont le coût des placements pour l’association.'),
        makeLine('net', 'Résultat', commissions.map((value) => -value),
          'Seules les commissions comptent : le capital reçu n’est pas un gain, il doit être rendu.', { level: 'total' }),
      ]),
      makeBlock('outstanding', [
        makeLine(
          'capital_to_return',
          'Capitaux à restituer aux bienfaiteurs',
          subtractValues(stockValues(months, capitalReceived), stockValues(months, capitalReturned)),
          'Capitaux que l’association doit encore rendre aux bienfaiteurs.',
          { kind: 'stock', level: 'total' }
        ),
        makeLine('placements_active', 'Placements en cours', stockValues(months, activeCount),
          'Placements dont le capital n’a pas encore été rendu.', { kind: 'stock', unit: 'count' }),
      ]),
    ],
    notes: [
      'Le capital d’un placement est reçu à la date de remise des fonds ; il est une dette envers le bienfaiteur, pas un produit.',
      'Une commission compte à sa date de paiement ; une sortie anticipée sépare le capital restitué de la commission due.',
    ],
  }
}
