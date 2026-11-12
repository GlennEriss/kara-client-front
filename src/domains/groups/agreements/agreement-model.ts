/** Member-to-member obligations. These are distinct from loans funded by KARA. */
export type AgreementKind = 'SALE' | 'LOAN' | 'SERVICE'
export type AgreementFrequency = 'MONTHLY' | 'WEEKLY' | 'DAILY'
export type AgreementPaymentMode = 'CASH' | 'AIRTEL_MONEY' | 'MOBICASH' | 'BANK_TRANSFER' | 'OTHER'
export type AgreementInstallment = { id: string; dueDate: string; amount: number }
export type AgreementPayment = {
  id: string
  amount: number
  date: string
  mode: AgreementPaymentMode
  reference?: string
  note?: string
  proofUrl?: string
  receivedBy: 'CREDITOR' | 'KARA'
  recordedAt: string
  byId: string
  byName: string
  voidedAt?: string
  voidedById?: string
  voidedByName?: string
  voidReason?: string
}
export type AgreementRemittance = Omit<AgreementPayment, 'receivedBy'>
export type AgreementReminder = {
  id: string
  channel: 'PHONE' | 'WHATSAPP' | 'NOTE'
  outcome: 'CONTACTED' | 'UNREACHABLE' | 'PROMISE' | 'MESSAGE_OPENED' | 'PLANNED'
  note: string
  plannedDate?: string
  promiseDate?: string
  recordedAt: string
  byId: string
  byName: string
}
export type AgreementHistory = {
  id: string
  description: string
  at: string
  byId: string
  byName: string
}
export interface GroupAgreement {
  id: string
  groupId: string
  groupName?: string
  batchId: string
  kind: AgreementKind
  title: string
  description: string
  agreementDate: string
  creditorId: string
  creditorMatricule: string
  creditorName: string
  debtorId: string
  debtorMatricule: string
  debtorName: string
  partyIds: string[]
  quantity: number
  unitAmount: number
  totalAmount: number
  schedule: AgreementInstallment[]
  status: 'ACTIVE' | 'CANCELLED'
  payments: AgreementPayment[]
  remittances: AgreementRemittance[]
  reminders: AgreementReminder[]
  history: AgreementHistory[]
  createdAt?: unknown
  updatedAt?: unknown
  createdBy: string
}
export interface AgreementBuyerDraft {
  debtorId: string
  quantity: number
  unitAmount: number
  schedule: AgreementInstallment[]
}
export interface AgreementBatchDraft {
  requestId: string
  groupId: string
  creditorId: string
  kind: AgreementKind
  title: string
  description: string
  agreementDate: string
  buyers: AgreementBuyerDraft[]
}
export const AGREEMENT_KINDS: Record<AgreementKind, string> = {
  SALE: 'Vente entre membres',
  LOAN: 'Prêt entre membres',
  SERVICE: 'Prestation entre membres',
}
export const AGREEMENT_PAYMENT_MODES: Record<AgreementPaymentMode, string> = {
  CASH: 'Espèces',
  AIRTEL_MONEY: 'Airtel Money',
  MOBICASH: 'Mobicash',
  BANK_TRANSFER: 'Virement bancaire',
  OTHER: 'Autre',
}
export function agreementToday(now = new Date()): string {
  return new Date(now.getTime() + 3_600_000).toISOString().slice(0, 10)
}
export function validAgreementDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T12:00:00Z`)
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
}
export function agreementId(value: string): string {
  if (!value || value.includes('/') || value === '.' || value === '..' || value.length > 200)
    throw new Error('Référence d’accord invalide.')
  return value
}
const positiveMoney = (n: number) => Number.isSafeInteger(n) && n > 0
export function validateAgreementBatch(input: AgreementBatchDraft) {
  agreementId(input.groupId)
  agreementId(input.creditorId)
  if (!/^[a-zA-Z0-9-]{8,80}$/.test(input.requestId))
    throw new Error('Référence de création invalide. Rouvrez le formulaire.')
  if (!Object.hasOwn(AGREEMENT_KINDS, input.kind)) throw new Error('Choisissez le type d’accord.')
  if (
    input.title.trim().length < 3 ||
    input.title.trim().length > 120 ||
    input.description.length > 2000
  )
    throw new Error(
      'Indiquez un objet de 3 à 120 caractères et une description de 2 000 caractères au maximum.',
    )
  if (!validAgreementDate(input.agreementDate)) throw new Error('La date de l’accord est invalide.')
  if (!input.buyers.length || input.buyers.length > 50)
    throw new Error('Sélectionnez entre 1 et 50 membres par création.')
  if (new Set(input.buyers.map((b) => b.debtorId)).size !== input.buyers.length)
    throw new Error('Un membre ne peut apparaître qu’une fois dans cette création.')
  for (const buyer of input.buyers) {
    agreementId(buyer.debtorId)
    if (buyer.debtorId === input.creditorId)
      throw new Error(
        'Le bénéficiaire et la personne qui paie doivent être deux membres différents.',
      )
    if (
      !positiveMoney(buyer.quantity) ||
      !positiveMoney(buyer.unitAmount) ||
      !positiveMoney(buyer.quantity * buyer.unitAmount)
    )
      throw new Error('Quantités et montants doivent être des entiers positifs en FCFA.')
    if (input.kind !== 'SALE' && buyer.quantity !== 1)
      throw new Error('Pour un accord hors vente, indiquez une quantité de 1.')
    if (!buyer.schedule.length || buyer.schedule.length > 60)
      throw new Error('Prévoyez entre 1 et 60 échéances par membre.')
    if (new Set(buyer.schedule.map((row) => row.id)).size !== buyer.schedule.length)
      throw new Error('Chaque échéance doit avoir une référence distincte.')
    let previous = ''
    for (const row of buyer.schedule) {
      agreementId(row.id)
      if (
        !validAgreementDate(row.dueDate) ||
        row.dueDate < input.agreementDate ||
        row.dueDate <= previous ||
        !positiveMoney(row.amount)
      )
        throw new Error(
          'Les échéances doivent être datées après l’accord, dans l’ordre, à des dates distinctes et avec des montants positifs.',
        )
      previous = row.dueDate
    }
    if (
      buyer.schedule.reduce((sum, row) => sum + row.amount, 0) !==
      buyer.quantity * buyer.unitAmount
    )
      throw new Error(
        'La somme des échéances doit correspondre exactement au montant de chaque accord.',
      )
  }
}

export function generateAgreementSchedule(
  total: number,
  count: number,
  firstDueDate: string,
  frequency: AgreementFrequency = 'MONTHLY',
): AgreementInstallment[] {
  if (
    !positiveMoney(total) ||
    !Number.isInteger(count) ||
    count < 1 ||
    count > 60 ||
    total < count ||
    !validAgreementDate(firstDueDate)
  )
    throw new Error('Vérifiez le montant, le nombre d’échéances et la première date.')
  const base = new Date(`${firstDueDate}T12:00:00Z`)
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(base)
    if (frequency === 'MONTHLY') {
      const day = base.getUTCDate()
      date.setUTCDate(1)
      date.setUTCMonth(base.getUTCMonth() + index)
      const last = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate()
      date.setUTCDate(Math.min(day, last))
    } else date.setUTCDate(base.getUTCDate() + index * (frequency === 'WEEKLY' ? 7 : 1))
    return {
      id: `e${index + 1}`,
      dueDate: date.toISOString().slice(0, 10),
      amount: Math.floor(total / count) + (index < total % count ? 1 : 0),
    }
  })
}
export const firstAgreementDueDate = (date: string) =>
  generateAgreementSchedule(2, 2, date, 'MONTHLY')[1].dueDate

/** Same FIFO rules as the member projection: every payment belongs to one agreement. */
export function agreementBalance(
  agreement: Pick<GroupAgreement, 'totalAmount' | 'schedule' | 'payments' | 'status'> & {
    remittances?: AgreementRemittance[]
  },
  today = agreementToday(),
) {
  const payments = agreement.payments.filter(
    (p) => !p.voidedAt && validAgreementDate(p.date) && p.date <= today,
  )
  const paid = payments.reduce((sum, payment) => sum + payment.amount, 0)
  const remitted = (agreement.remittances || [])
    .filter((p) => !p.voidedAt && validAgreementDate(p.date) && p.date <= today)
    .reduce((sum, p) => sum + p.amount, 0)
  const collectedByKara = payments
    .filter((p) => p.receivedBy === 'KARA')
    .reduce((sum, p) => sum + p.amount, 0)
  const directlyReceived = payments
    .filter((p) => p.receivedBy !== 'KARA')
    .reduce((sum, p) => sum + p.amount, 0)
  const heldByKara = Math.max(0, collectedByKara - remitted)
  const receivedByCreditor = directlyReceived + remitted
  let unallocated = paid
  const installments = agreement.schedule.map((row) => {
    const allocated = Math.min(row.amount, Math.max(0, unallocated))
    unallocated -= allocated
    const remaining = row.amount - allocated
    return {
      ...row,
      paid: allocated,
      remaining,
      status:
        remaining === 0
          ? ('PAID' as const)
          : row.dueDate < today
            ? ('OVERDUE' as const)
            : allocated > 0
              ? ('PARTIAL' as const)
              : ('UPCOMING' as const),
    }
  })
  const cancelled = agreement.status === 'CANCELLED'
  const remaining = cancelled ? 0 : Math.max(0, agreement.totalAmount - paid)
  const overdue = cancelled
    ? 0
    : installments.filter((row) => row.dueDate < today).reduce((sum, row) => sum + row.remaining, 0)
  return {
    paid,
    remaining,
    overdue,
    installments,
    collectedByKara,
    directlyReceived,
    remitted,
    heldByKara,
    receivedByCreditor,
    receivable: cancelled ? 0 : Math.max(0, agreement.totalAmount - receivedByCreditor),
    nextDue: cancelled ? undefined : installments.find((row) => row.remaining > 0),
    status: cancelled
      ? ('CANCELLED' as const)
      : remaining === 0
        ? heldByKara > 0
          ? ('PENDING_REMITTANCE' as const)
          : ('SETTLED' as const)
        : overdue > 0
          ? ('OVERDUE' as const)
          : paid > 0
            ? ('PARTIAL' as const)
            : ('ACTIVE' as const),
  }
}
export const AGREEMENT_STATUS_LABELS = {
  CANCELLED: 'Annulé',
  SETTLED: 'Réglé et remis',
  PENDING_REMITTANCE: 'À reverser par KARA',
  OVERDUE: 'En retard',
  PARTIAL: 'Partiellement réglé',
  ACTIVE: 'En cours',
}
/** After a correction or historical entry, KARA must never have paid money it
 * had not yet collected. A positive balance today alone is insufficient. */
export function validateAgreementCashTimeline(
  agreement: Pick<GroupAgreement, 'payments' | 'remittances'>,
) {
  const days = new Map<string, number>()
  for (const payment of agreement.payments)
    if (!payment.voidedAt && payment.receivedBy === 'KARA')
      days.set(payment.date, (days.get(payment.date) || 0) + payment.amount)
  for (const remittance of agreement.remittances)
    if (!remittance.voidedAt)
      days.set(remittance.date, (days.get(remittance.date) || 0) - remittance.amount)
  let balance = 0
  for (const [, amount] of [...days.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    balance += amount
    if (!Number.isSafeInteger(balance) || balance < 0)
      throw new Error(
        'Ce reversement ou cette correction dépasserait les fonds disponibles chez LE KARA à cette date. Vérifiez les encaissements et reversements déjà enregistrés.',
      )
  }
}
export function agreementBatchSignature(input: AgreementBatchDraft): string {
  return JSON.stringify({
    groupId: input.groupId,
    creditorId: input.creditorId,
    kind: input.kind,
    title: input.title.trim(),
    description: input.description.trim(),
    agreementDate: input.agreementDate,
    buyers: [...input.buyers].sort((a, b) => a.debtorId.localeCompare(b.debtorId)),
  })
}
