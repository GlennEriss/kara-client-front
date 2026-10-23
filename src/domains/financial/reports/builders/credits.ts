import type { CreditContract, CreditPayment, CreditPenalty, CreditType } from '@/types/types'
import { addContractMonths } from '@/utils/contract-months'
import { buildSimpleCreditSchedule, SIMPLE_CREDIT_LOSS_RATE } from '@/utils/credit-losses'
import {
  buildCreditSpecialeHistory,
  buildCreditSpecialeTimelineHistory,
  getCreditContractCycles,
  getCreditPaymentCycleNumber,
  getCreditPaymentMonthNumber,
  getCreditPaymentsForCurrentCycle,
} from '@/utils/credit-speciale-history'
import { isFlatCredit } from '@/utils/credit-weekly'
import type { FinancialReportModule, FinancialReportModuleKey, MonthKey } from '../entities/financial-report.types'
import type { FinancialReportContext, FinancialReportSources } from '../entities/financial-report-sources.types'
import { monthKeyOf } from '../utils/report-months'
import { addValues, flowValues, makeBlock, makeLine, stockValues, subtractValues, toNumber, type MonthAmount } from '../utils/report-lines'

/** Contrats pas encore signés : aucun argent n'a été remis. */
const NOT_DISBURSED_STATUSES = new Set(['DRAFT', 'PENDING', 'APPROVED', 'SIMULATED'])
const SETTLED_STATUSES = new Set(['DISCHARGED', 'CLOSED'])

const MODULE_INFO: Record<CreditType, { key: FinancialReportModuleKey; title: string; description: string }> = {
  SPECIALE: { key: 'credit_speciale', title: 'Crédit spécial', description: 'Crédits à intérêts mensuels, partie spéciale puis partie fixe.' },
  FIXE: { key: 'credit_fixe', title: 'Crédit fixe', description: 'Crédits à intérêt unique, remboursés sur la durée prévue.' },
  AIDE: { key: 'credit_aide', title: 'Crédit aide', description: 'Crédits d’aide à intérêt unique, sur 3 mois au plus.' },
}

const earliestMonth = (...months: Array<MonthKey | null>): MonthKey | null =>
  months.filter((month): month is MonthKey => !!month).sort()[0] ?? null

const byPaymentDate = (left: CreditPayment, right: CreditPayment) =>
  new Date(left.paymentDate).getTime() - new Date(right.paymentDate).getTime() || left.id.localeCompare(right.id)

/** Mouvements d'un contrat ; les stocks (reste dû, retard) se calculent à partir d'eux. */
interface ContractLedger {
  /** Dette créée : montant prêté au départ, puis rajout. */
  principal: MonthAmount[]
  /** Argent réellement remis (au vendeur pour un achat en boutique). */
  disbursed: MonthAmount[]
  shopDiscount: MonthAmount[]
  repayments: MonthAmount[]
  interestGenerated: MonthAmount[]
  interestCollected: MonthAmount[]
  /** Montants attendus à chaque échéance passée, pour mesurer le retard. */
  expected: MonthAmount[]
  missedEarnings: MonthAmount[]
  penaltiesCreated: MonthAmount[]
  penaltiesPaid: MonthAmount[]
  /** À partir de ce mois, le reste dû est nul : soldé, transféré ou clôturé en perte. */
  settledFrom: MonthKey | null
  writeOffMonth: MonthKey | null
}

function buildSpecialeRows(contract: CreditContract, payments: CreditPayment[]) {
  const cycles = getCreditContractCycles(contract)
  const currentCycleNumber = cycles[cycles.length - 1].cycleNumber
  // Cycles terminés par un rajout : l'historique tel qu'enregistré. Cycle en cours :
  // l'historique complet, avec l'échéance due et les suivantes.
  const pastRows = cycles.length > 1
    ? buildCreditSpecialeTimelineHistory(contract, payments)
        .filter((row) => row.cycleNumber < currentCycleNumber)
        .map((row) => ({ row, cycleNumber: row.cycleNumber }))
    : []
  const currentRows = buildCreditSpecialeHistory(contract, getCreditPaymentsForCurrentCycle(contract, payments), {
    projectUntilZero: true,
  }).map((row) => ({ row, cycleNumber: currentCycleNumber }))
  return [...pastRows, ...currentRows]
}

function buildContractLedger(
  contract: CreditContract,
  payments: CreditPayment[],
  penalties: CreditPenalty[],
  context: FinancialReportContext,
  options: { parent?: CreditContract; childStartMonth?: MonthKey | null }
): ContractLedger {
  const now = context.now.getTime()
  const cycles = getCreditContractCycles(contract)
  const firstCycle = cycles[0]
  const currentCycle = cycles[cycles.length - 1]
  const startMonth = monthKeyOf(contract.disbursementDate ?? contract.createdAt ?? firstCycle.startedAt)
  const repaymentRecords = payments.filter((payment) => toNumber(payment.amount) > 0)

  const ledger: ContractLedger = {
    principal: [],
    disbursed: [],
    shopDiscount: [],
    repayments: repaymentRecords.map((payment) => ({ month: monthKeyOf(payment.paymentDate), amount: toNumber(payment.amount) })),
    interestGenerated: [],
    interestCollected: [],
    expected: [],
    missedEarnings: [],
    penaltiesCreated: [],
    penaltiesPaid: [],
    settledFrom: null,
    writeOffMonth: null,
  }

  // Argent remis et dette créée.
  if (options.parent) {
    // Ancienne augmentation : un nouveau contrat reprend le reste dû du parent.
    const transferred = toNumber(options.parent.amountRemaining)
    ledger.principal.push({ month: startMonth, amount: toNumber(contract.amount) })
    ledger.disbursed.push({
      month: startMonth,
      amount: contract.rajoutAmount != null ? toNumber(contract.rajoutAmount) : Math.max(0, toNumber(contract.amount) - transferred),
    })
  } else {
    const initialAmount = toNumber(contract.initialAmount ?? firstCycle.amount)
    const vendorAmount = contract.shopPurchase?.vendorAmount
    const cash = vendorAmount != null ? toNumber(vendorAmount) : initialAmount
    ledger.principal.push({ month: startMonth, amount: initialAmount })
    ledger.disbursed.push({ month: startMonth, amount: cash })
    if (vendorAmount != null) ledger.shopDiscount.push({ month: startMonth, amount: Math.max(0, initialAmount - cash) })
  }
  const augmentation = cycles.find((cycle) => cycle.cycleNumber > firstCycle.cycleNumber)
  if (augmentation && contract.rajoutAmount != null) {
    // Le nouveau cycle reprend le reste dû : seul le rajout est une dette nouvelle.
    const month = monthKeyOf(augmentation.startedAt ?? contract.extendedAt)
    ledger.principal.push({ month, amount: toNumber(contract.rajoutAmount) })
    ledger.disbursed.push({ month, amount: toNumber(contract.rajoutAmount) })
  }

  if (contract.creditType === 'SPECIALE') {
    const flat = isFlatCredit(contract)
    const paymentsByRow = new Map<string, CreditPayment[]>()
    for (const payment of repaymentRecords) {
      const key = `${getCreditPaymentCycleNumber(contract, payment)}_${getCreditPaymentMonthNumber(contract, payment)}`
      paymentsByRow.set(key, [...(paymentsByRow.get(key) ?? []), payment])
    }

    let unpaidInterest = 0
    for (const { row, cycleNumber } of buildSpecialeRows(contract, payments)) {
      const dueMonth = monthKeyOf(row.date)
      const isPast = new Date(row.date).getTime() <= now
      // Intérêts comptés à leur échéance (ou au versement s'il est arrivé avant),
      // seulement pour les mois enregistrés et l'échéance due, comme le reste dû du contrat.
      if (row.status !== 'FUTURE' && row.interest > 0) {
        ledger.interestGenerated.push({
          month: earliestMonth(dueMonth, row.paymentDate ? monthKeyOf(row.paymentDate) : null),
          amount: row.interest,
        })
      }
      if (!row.isRest && isPast) ledger.expected.push({ month: dueMonth, amount: row.expectedPayment })
      if (row.phase === 'FIXE' && !row.isRest && row.capitalStart > 0 && isPast) {
        const rate = toNumber(cycles.find((cycle) => cycle.cycleNumber === cycleNumber)?.interestRate ?? contract.interestRate) / 100
        ledger.missedEarnings.push({ month: dueMonth, amount: Math.round(row.capitalStart * rate) })
      }
      // Même règle qu'à l'enregistrement : un versement paie au plus les intérêts de son
      // mois ; intérêts appliqués une fois (semaines, boutique) : rattrapés ensuite.
      unpaidInterest = flat ? unpaidInterest + row.interest : row.interest
      for (const payment of [...(paymentsByRow.get(`${cycleNumber}_${row.month}`) ?? [])].sort(byPaymentDate)) {
        const paidInterest = Math.min(toNumber(payment.amount), unpaidInterest)
        unpaidInterest -= paidInterest
        ledger.interestCollected.push({ month: monthKeyOf(payment.paymentDate), amount: paidInterest })
      }
    }
  } else {
    // Intérêt unique : dû dès le départ du cycle, perçu au prorata de chaque versement.
    for (const cycle of cycles) {
      const month = cycle.cycleNumber === firstCycle.cycleNumber ? startMonth : monthKeyOf(cycle.startedAt ?? contract.extendedAt)
      ledger.interestGenerated.push({ month, amount: Math.max(0, toNumber(cycle.totalAmount) - toNumber(cycle.amount)) })
    }
    for (const payment of repaymentRecords) {
      const cycle = cycles.find((entry) => entry.cycleNumber === getCreditPaymentCycleNumber(contract, payment)) ?? currentCycle
      const total = toNumber(cycle.totalAmount)
      const share = total > 0 ? Math.max(0, total - toNumber(cycle.amount)) / total : 0
      ledger.interestCollected.push({ month: monthKeyOf(payment.paymentDate), amount: toNumber(payment.amount) * share })
    }
    const duration = Math.max(1, toNumber(currentCycle.duration))
    const installment = toNumber(currentCycle.totalAmount) / duration
    for (let index = 0; index < duration; index++) {
      const dueDate = addContractMonths(new Date(currentCycle.firstPaymentDate), index)
      if (dueDate.getTime() <= now) ledger.expected.push({ month: monthKeyOf(dueDate), amount: installment })
    }
    for (const row of buildSimpleCreditSchedule(contract, getCreditPaymentsForCurrentCycle(contract, payments))) {
      if (row.month > contract.duration && row.principal > 0 && new Date(row.date).getTime() <= now) {
        ledger.missedEarnings.push({ month: monthKeyOf(row.date), amount: Math.round(row.principal * SIMPLE_CREDIT_LOSS_RATE) })
      }
    }
  }

  for (const penalty of penalties) {
    ledger.penaltiesCreated.push({ month: monthKeyOf(penalty.createdAt ?? penalty.dueDate), amount: toNumber(penalty.amount) })
    if (penalty.paid) {
      ledger.penaltiesPaid.push({
        month: monthKeyOf(penalty.paidAt ?? penalty.paymentRecordedAt ?? penalty.createdAt),
        amount: toNumber(penalty.amount),
      })
    }
  }

  if (contract.status === 'WRITTEN_OFF' && contract.writeOff) {
    ledger.writeOffMonth = monthKeyOf(contract.writeOff.writtenOffAt)
    ledger.settledFrom = ledger.writeOffMonth
  } else if (options.childStartMonth) {
    ledger.settledFrom = options.childStartMonth
  } else if (SETTLED_STATUSES.has(contract.status)) {
    const lastPayment = [...repaymentRecords].sort(byPaymentDate).at(-1)
    ledger.settledFrom = lastPayment ? monthKeyOf(lastPayment.paymentDate) : monthKeyOf(contract.updatedAt)
  }

  return ledger
}

/** Série d'un contrat, mise à zéro à partir du mois où il est soldé. */
const settle = (months: MonthKey[], values: number[], from: MonthKey | null) =>
  values.map((value, index) => (from && months[index] >= from ? 0 : Math.max(0, value)))

export function buildCreditModule(
  creditType: CreditType,
  sources: FinancialReportSources,
  context: FinancialReportContext
): FinancialReportModule {
  const { months } = context
  const info = MODULE_INFO[creditType]
  const contracts = sources.creditContracts.filter(
    (contract) => contract.creditType === creditType && !NOT_DISBURSED_STATUSES.has(contract.status)
  )
  const contractById = new Map(sources.creditContracts.map((contract) => [contract.id, contract]))
  const childStartByParent = new Map<string, MonthKey | null>()
  for (const contract of sources.creditContracts) {
    if (contract.parentContractId) {
      childStartByParent.set(contract.parentContractId, monthKeyOf(contract.disbursementDate ?? contract.createdAt))
    }
  }
  const paymentsByContract = new Map<string, CreditPayment[]>()
  for (const payment of sources.creditPayments) {
    paymentsByContract.set(payment.creditId, [...(paymentsByContract.get(payment.creditId) ?? []), payment])
  }
  const penaltiesByContract = new Map<string, CreditPenalty[]>()
  for (const penalty of sources.creditPenalties) {
    penaltiesByContract.set(penalty.creditId, [...(penaltiesByContract.get(penalty.creditId) ?? []), penalty])
  }
  const contractIds = new Set(contracts.map((contract) => contract.id))

  const all = {
    disbursed: [] as MonthAmount[],
    shopDiscount: [] as MonthAmount[],
    repayments: [] as MonthAmount[],
    interestGenerated: [] as MonthAmount[],
    interestCollected: [] as MonthAmount[],
    missedEarnings: [] as MonthAmount[],
    penaltiesPaid: [] as MonthAmount[],
    recoveries: [] as MonthAmount[],
    missedEarningsPaid: [] as MonthAmount[],
    losses: [] as MonthAmount[],
  }
  const zeros = () => new Array(months.length).fill(0) as number[]
  let receivables = zeros()
  let unpaidPenalties = zeros()
  let lateAmount = zeros()
  let activeContracts = zeros()
  let lateContracts = zeros()

  for (const contract of contracts) {
    const parent = contract.parentContractId ? contractById.get(contract.parentContractId) : undefined
    const ledger = buildContractLedger(contract, paymentsByContract.get(contract.id) ?? [], penaltiesByContract.get(contract.id) ?? [], context, {
      parent,
      childStartMonth: childStartByParent.get(contract.id),
    })

    all.disbursed.push(...ledger.disbursed)
    all.shopDiscount.push(...ledger.shopDiscount)
    all.repayments.push(...ledger.repayments)
    all.interestGenerated.push(...ledger.interestGenerated)
    all.interestCollected.push(...ledger.interestCollected)
    all.missedEarnings.push(...ledger.missedEarnings)
    all.penaltiesPaid.push(...ledger.penaltiesPaid)
    for (const recovery of contract.writeOffRecoveries ?? []) {
      all.recoveries.push({ month: monthKeyOf(recovery.date), amount: toNumber(recovery.amount) })
    }
    for (const payment of contract.missedEarningsPayments ?? []) {
      all.missedEarningsPaid.push({ month: monthKeyOf(payment.date), amount: toNumber(payment.amount) })
    }
    if (ledger.writeOffMonth && contract.writeOff) {
      all.losses.push({ month: ledger.writeOffMonth, amount: toNumber(contract.writeOff.amountRemaining) })
    }

    // Reste dû = montant prêté + intérêts échus − versements.
    const due = subtractValues(
      addValues(stockValues(months, ledger.principal), stockValues(months, ledger.interestGenerated)),
      stockValues(months, ledger.repayments)
    )
    const contractReceivable = settle(months, due, ledger.settledFrom)
    const late = subtractValues(stockValues(months, ledger.expected), stockValues(months, ledger.repayments))
      .map((value, index) => Math.min(value, contractReceivable[index]))
    const contractLate = settle(months, late, ledger.settledFrom)
    const penalties = subtractValues(stockValues(months, ledger.penaltiesCreated), stockValues(months, ledger.penaltiesPaid))
    const firstMonth = ledger.principal[0]?.month ?? null

    receivables = addValues(receivables, contractReceivable)
    lateAmount = addValues(lateAmount, contractLate)
    unpaidPenalties = addValues(unpaidPenalties, settle(months, penalties, ledger.writeOffMonth))
    activeContracts = addValues(
      activeContracts,
      contractReceivable.map((value, index) => (value >= 1 && !!firstMonth && months[index] >= firstMonth ? 1 : 0))
    )
    lateContracts = addValues(lateContracts, contractLate.map((value) => (value >= 1 ? 1 : 0)))
  }

  const guarantorPaid: MonthAmount[] = sources.guarantorPayments
    .filter((payment) => contractIds.has(payment.creditId))
    .map((payment) => ({ month: monthKeyOf(payment.paymentDate), amount: toNumber(payment.amount) }))

  const repayments = flowValues(months, all.repayments)
  const penaltiesPaid = flowValues(months, all.penaltiesPaid)
  const missedEarningsPaid = flowValues(months, all.missedEarningsPaid)
  const recoveries = flowValues(months, all.recoveries)
  const disbursed = flowValues(months, all.disbursed)
  const guarantors = flowValues(months, guarantorPaid)
  const interest = flowValues(months, all.interestCollected)
  const shopDiscount = flowValues(months, all.shopDiscount)
  const losses = flowValues(months, all.losses)
  const inTotal = addValues(repayments, penaltiesPaid, missedEarningsPaid, recoveries)
  const outTotal = addValues(disbursed, guarantors)
  const incomeLines = [
    makeLine('income_interest', 'Intérêts perçus', interest),
    makeLine('income_penalties', 'Pénalités encaissées', penaltiesPaid),
    makeLine('income_missed_earnings', 'Manque à gagner encaissé', missedEarningsPaid),
    makeLine('income_recoveries', 'Récupérations sur pertes', recoveries),
    ...(creditType === 'SPECIALE' ? [makeLine('income_shop_discount', 'Remises des boutiques partenaires', shopDiscount)] : []),
  ]
  const incomeTotal = addValues(...incomeLines.map((line) => line.values))
  const chargeTotal = addValues(guarantors, losses)

  return {
    key: info.key,
    title: info.title,
    description: info.description,
    blocks: [
      makeBlock('treasury', [
        makeLine('in_repayments', 'Remboursements reçus', repayments),
        makeLine('in_penalties', 'Pénalités encaissées', penaltiesPaid),
        makeLine('in_missed_earnings', 'Manque à gagner encaissé', missedEarningsPaid),
        makeLine('in_recoveries', 'Sommes récupérées après une perte', recoveries),
        makeLine('in_total', 'Total des entrées', inTotal, { level: 'subtotal' }),
        makeLine('out_disbursed', 'Fonds remis aux membres', disbursed),
        makeLine('out_guarantors', 'Commissions versées aux garants', guarantors),
        makeLine('out_total', 'Total des sorties', outTotal, { level: 'subtotal' }),
        makeLine('net', 'Solde du mois', subtractValues(inTotal, outTotal), { level: 'total' }),
      ]),
      makeBlock('result', [
        ...incomeLines,
        makeLine('income_total', 'Total des produits', incomeTotal, { level: 'subtotal' }),
        makeLine('charge_guarantors', 'Commissions versées aux garants', guarantors),
        makeLine('charge_losses', 'Pertes sur crédits clôturés en perte', losses),
        makeLine('charge_total', 'Total des charges', chargeTotal, { level: 'subtotal' }),
        makeLine('net', 'Résultat net', subtractValues(incomeTotal, chargeTotal), { level: 'total' }),
        makeLine('info_interest_generated', 'Pour information : intérêts générés', flowValues(months, all.interestGenerated), { level: 'info' }),
      ]),
      makeBlock('outstanding', [
        makeLine('receivables', 'Reste dû par les membres (capital et intérêts échus)', receivables, { kind: 'stock', level: 'total' }),
        makeLine('contracts_active', 'Contrats en cours', activeContracts, { kind: 'stock', unit: 'count' }),
      ]),
      makeBlock('risks', [
        makeLine('missed_earnings', 'Manque à gagner du mois', flowValues(months, all.missedEarnings)),
        makeLine('losses', 'Pertes constatées (clôtures en perte)', losses),
        makeLine('unpaid_penalties', 'Pénalités impayées', unpaidPenalties, { kind: 'stock' }),
        makeLine('late_amount', 'Montant des échéances en retard', lateAmount, { kind: 'stock' }),
        makeLine('late_contracts', 'Contrats en retard', lateContracts, { kind: 'stock', unit: 'count' }),
      ]),
    ],
    notes: [
      'Les fonds remis comptent à la date de remise (à défaut, à la création du contrat) ; un rajout compte à sa date. Achat en boutique : le montant versé au vendeur.',
      creditType === 'SPECIALE'
        ? 'Intérêts perçus : un versement paie au plus les intérêts de son mois (règle de l’application). Les intérêts d’un mois impayé passent dans le reste dû et ne sont pas comptés comme perçus.'
        : 'Intérêts perçus : l’intérêt unique est réparti au prorata de chaque versement.',
      'Le reste dû cumule le montant prêté et les intérêts échus, moins les versements ; il tombe à zéro quand le contrat est soldé, clos ou clôturé en perte.',
      'Une échéance est en retard quand les versements reçus n’atteignent pas les échéances passées ; le montant en retard ne dépasse jamais le reste dû.',
      'Les contrats pas encore signés (en attente, brouillon) ne sont pas comptés.',
    ],
  }
}
