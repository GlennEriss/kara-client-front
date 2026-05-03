import type { FactureCreditSpecialPDFData } from '@/components/credit-speciale/FactureCreditSpecialPDF'
import type { CreditContract, CreditPayment } from '@/types/types'
import { getCreditPaymentMonthNumber } from '@/utils/credit-speciale-history'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import type { FactureCreditSpecialPage1Data } from './factureCreditSpecialPdfExport'

type MemberAddressLike = {
  additionalInfo?: string
  city?: string
  district?: string
}

export type CreditFactureMemberLike = {
  matricule?: string
  lastName?: string
  firstName?: string
  birthPlace?: string
  birthDate?: string
  nationality?: string
  identityDocumentNumber?: string
  contacts?: string[]
  gender?: string
  profession?: string
  address?: MemberAddressLike
}

export type CreditFactureDueItemLike = {
  month: number
  date: Date
  payment: number
  interest?: number
  principal?: number
  remaining?: number
}

const PAYMENT_MODE_LABELS: Record<string, string> = {
  airtel_money: 'Airtel Money',
  mobicash: 'Mobicash',
  cash: 'Espèce',
  bank_transfer: 'Virement bancaire',
  CASH: 'Espèces',
  MOBILE_MONEY: 'Mobile Money',
  BANK_TRANSFER: 'Virement bancaire',
  CHEQUE: 'Chèque',
}

const formatDateYYYYMMDD = (date: Date) => format(new Date(date), 'yyyy-MM-dd')

const formatLongDate = (value: Date | string | undefined): string => {
  if (!value) return '-'
  const d = typeof value === 'string' ? new Date(value) : value
  if (Number.isNaN(d.getTime())) return '-'
  return format(d, 'EEEE d MMMM yyyy', { locale: fr })
}

const getAgeFromBirthDate = (birthDate: string | undefined): string => {
  if (!birthDate) return '-'
  const birth = new Date(birthDate)
  if (Number.isNaN(birth.getTime())) return '-'
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const monthDiff = today.getMonth() - birth.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) age -= 1
  return age > 0 ? `${age} ANS` : '-'
}

export function buildCreditSpecialFacturePage1Data(
  contract: CreditContract,
  member?: CreditFactureMemberLike | null
): FactureCreditSpecialPage1Data {
  const ec = contract.emergencyContact
  const emergencyName = ec
    ? `${ec.lastName || ''} ${ec.firstName || ''}`.trim() || 'INCONNU'
    : 'INCONNU'
  const memberPhone1 = member?.contacts?.[0] ?? contract.clientContacts?.[0] ?? '-'
  const memberPhone2 = member?.contacts?.[1] ?? contract.clientContacts?.[1] ?? '-'
  const quartier =
    member?.address?.additionalInfo ??
    (member?.address ? [member.address.city, member.address.district].filter(Boolean).join(', ') : null) ??
    '-'

  return {
    contractId: contract.id,
    memberMatricule: member?.matricule ?? contract.clientId ?? '-',
    memberLastName: member?.lastName ?? contract.clientLastName ?? '-',
    memberFirstName: member?.firstName ?? contract.clientFirstName ?? '-',
    memberBirthPlace: member?.birthPlace ?? '-',
    memberBirthDateFormatted: formatLongDate(member?.birthDate),
    memberNationality: member?.nationality ?? '-',
    memberIdDocument: member?.identityDocumentNumber ?? '-',
    memberPhone1,
    memberPhone2,
    memberGender: member?.gender ? String(member.gender).toUpperCase() : '-',
    memberAge: getAgeFromBirthDate(member?.birthDate),
    memberQuarter: quartier,
    memberProfession: member?.profession ?? '-',
    emergencyName,
    emergencyRelation: ec?.relationship ?? '-',
    emergencyPhone1: ec?.phone1 ?? '-',
    emergencyPhone2: ec?.phone2 ?? '-',
    emergencyId: ec?.idNumber ?? '-',
  }
}

export function buildCreditSpecialFactureData(params: {
  contract: CreditContract
  payment: CreditPayment
  installmentNumber?: number
  schedule?: CreditFactureDueItemLike[]
  dueDate?: Date | null
  /** Permet de forcer la pénalité affichée dans la facture (ex: pénalité payée séparément). */
  penaltyAmountOverride?: number
}): FactureCreditSpecialPDFData {
  const { contract, payment, installmentNumber, schedule, dueDate, penaltyAmountOverride } = params
  const num =
    installmentNumber && installmentNumber > 0
      ? installmentNumber
      : getCreditPaymentMonthNumber(contract, payment)
  const dueItem = schedule?.find((s) => s.month === num)
  const nextDueItem = schedule?.find((s) => s.month === num + 1)
  const prevDueItem = schedule?.find((s) => s.month === num - 1)
  const isLastInstallment = !nextDueItem
  const capitalStartFallback =
    dueItem
      ? Math.max(
          0,
          (dueItem.principal ?? 0) - (dueItem.interest ?? Math.round(payment.interestAmount || 0))
        )
      : contract.amount
  const capitalStart =
    num === 1
      ? Math.round(contract.amount)
      : Math.round(prevDueItem?.remaining ?? capitalStartFallback)
  const interest = Math.round(dueItem?.interest ?? payment.interestAmount ?? 0)
  const globalAmount = Math.round(
    dueItem?.principal ?? capitalStart + (dueItem?.interest ?? payment.interestAmount ?? 0)
  )
  const isFixedExtensionMonth = interest === 0 && globalAmount === capitalStart
  const newCapitalAfter = Math.round(
    dueItem?.remaining ?? Math.max(0, globalAmount - (payment.amount || 0))
  )
  const newCapitalNext = Math.round(nextDueItem?.principal ?? 0)
  const nouveauCapital = dueItem?.remaining !== undefined ? Math.round(dueItem.remaining) : newCapitalAfter
  const capitalMoisProchain = isLastInstallment ? 0 : newCapitalNext
  const moyenLabel =
    payment.amount === 0 ? 'AUCUN' : (PAYMENT_MODE_LABELS[payment.mode] ?? payment.mode ?? 'Aucun')
  const fraisValue =
    (payment.mode === 'airtel_money' || payment.mode === 'mobicash') && payment.withFees !== undefined
      ? payment.withFees
      : false
  const dateEcheance = formatDateYYYYMMDD(dueDate ?? dueItem?.date ?? payment.paymentDate)
  const resolvedPenaltyAmount =
    typeof penaltyAmountOverride === 'number' && Number.isFinite(penaltyAmountOverride)
      ? Math.max(0, Math.round(penaltyAmountOverride))
      : Math.max(0, Math.round(payment.penaltyAmount ?? 0))

  return {
    paymentDate: formatDateYYYYMMDD(payment.paymentDate),
    capital: capitalStart,
    taux: isFixedExtensionMonth ? 0 : contract.interestRate ?? 0,
    interets: interest,
    montantGlobal: globalAmount,
    dateEcheance,
    dateRemise: formatDateYYYYMMDD(payment.paymentDate),
    heureRemise: payment.paymentTime || '12H00',
    moyen: moyenLabel,
    frais: fraisValue,
    montantRemis: payment.amount,
    penalite: resolvedPenaltyAmount,
    remarque: payment.comment?.trim() || 'PAS DE VERSEMENT',
    note: payment.note ?? 0,
    nouveauCapital1: nouveauCapital,
    nouveauCapital2: nouveauCapital,
    capitalMoisProchain,
    isFixedExtensionMonth,
  }
}
