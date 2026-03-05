/**
 * Génération du PDF « Résumé de versement – Partie fixe » pour le crédit fixe.
 * Utilisé par PaymentReceiptModal (Télécharger PDF) lorsque contract.creditType === 'FIXE'.
 */
import React from 'react'
import { pdf } from '@react-pdf/renderer'
import type { CreditContract, CreditPayment } from '@/types/types'
import ResumeCreditFixePDF, {
  type FixedCreditPayment,
  type FixedCreditSummary,
} from '@/components/credit-speciale/ResumeCreditFixePDF'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

export interface DueItemLike {
  month: number
  date: Date
  payment: number
  remaining: number
  paidAmount?: number
  paymentDate?: Date
  paymentTime?: string
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

function formatDateFr(d: Date): string {
  const dateObj = new Date(d)
  if (isNaN(dateObj.getTime())) return '—'
  return format(dateObj, 'EEEE d MMMM yyyy', { locale: fr })
}

function formatDateShort(d: Date): string {
  const dateObj = new Date(d)
  if (isNaN(dateObj.getTime())) return '—'
  return format(dateObj, 'dd/MM/yyyy', { locale: fr })
}

function formatAmount(n: number): string {
  if (typeof n !== 'number' || isNaN(n)) return '0'
  return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}

function formatTime(t: string | undefined): string {
  if (!t || typeof t !== 'string') return '—'
  const normalized = t.replace(/\s*[hH]\s*/, 'H').trim()
  return normalized || '—'
}

/** Associe un paiement au mois d'échéance (M1_, M2_, ou par date). */
function findPaymentForMonth(
  month: number,
  payments: CreditPayment[],
  firstPaymentDate: Date
): CreditPayment | undefined {
  const first = new Date(firstPaymentDate)
  for (const p of payments) {
    let paymentMonth: number | undefined
    if (p.id) {
      const match = p.id.match(/^M(\d+)_/)
      if (match) {
        paymentMonth = parseInt(match[1], 10)
      }
    }
    if (!paymentMonth || isNaN(paymentMonth)) {
      const paymentDate = new Date(p.paymentDate)
      const monthsDiff =
        (paymentDate.getFullYear() - first.getFullYear()) * 12 +
        (paymentDate.getMonth() - first.getMonth())
      paymentMonth = Math.max(1, monthsDiff + 1)
    }
    if (paymentMonth === month) return p
  }
  return undefined
}

export interface BuildResumeCreditFixePdfDataParams {
  contract: CreditContract
  schedule: DueItemLike[]
  payments: CreditPayment[]
  getAdminDisplayName: (adminId: string) => string
  /** Motif de la demande (cause) depuis la page demandes crédit fixe – affiché en « Libellé / Motif » dans le PDF */
  demandMotif?: string
}

export function buildResumeCreditFixePdfData({
  contract,
  schedule,
  payments,
  getAdminDisplayName,
  demandMotif,
}: BuildResumeCreditFixePdfDataParams): {
  summary: FixedCreditSummary
  payments: FixedCreditPayment[]
} {
  const summary: FixedCreditSummary = {
    reference: contract.id,
    libelle: (demandMotif?.trim() || undefined) ?? 'Partie fixe',
    montantFixeInitial: contract.amount ?? 0,
    taux: contract.interestRate ?? 0,
    montantTotal: contract.totalAmount ?? 0,
    totalVerse: contract.amountPaid ?? 0,
    soldeRestant: contract.amountRemaining ?? 0,
    dateEdition: format(new Date(), 'dd/MM/yyyy', { locale: fr }),
  }

  const tableRows: FixedCreditPayment[] = schedule.map((item) => {
    const payment = findPaymentForMonth(item.month, payments, contract.firstPaymentDate)
    const dateRemise = item.paymentDate ?? payment?.paymentDate
    const montantRemis = item.paidAmount ?? payment?.amount ?? 0
    const moyenTransaction = payment?.mode
      ? PAYMENT_MODE_LABELS[payment.mode] ?? payment.mode
      : '—'
    const agent = payment?.updatedBy
      ? getAdminDisplayName(payment.updatedBy)
      : '—'
    const remarque = (payment?.comment?.trim() ?? '') || '—'

    return {
      echeance: formatDateFr(item.date),
      dateRemise: dateRemise ? formatDateShort(new Date(dateRemise)) : '—',
      montantActuel: formatAmount(item.payment),
      montantRemis: formatAmount(montantRemis),
      montantRestant: formatAmount(item.remaining ?? 0),
      heureRemis: formatTime(item.paymentTime ?? (payment as { paymentTime?: string })?.paymentTime),
      moyenTransaction,
      agent,
      remarque,
    }
  })

  return { summary, payments: tableRows }
}

/** Génère et télécharge le PDF « Résumé de versement – Partie fixe ». */
export async function generateResumeCreditFixePDF(data: {
  summary: FixedCreditSummary
  payments: FixedCreditPayment[]
}): Promise<void> {
  const element = React.createElement(ResumeCreditFixePDF, {
    summary: data.summary,
    payments: data.payments,
  })
  type PdfDocumentElement = Parameters<typeof pdf>[0]
  const blob = await pdf(element as unknown as PdfDocumentElement).toBlob()
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `resume-versement-partie-fixe-${data.summary.reference ?? 'credit'}-${format(new Date(), 'yyyy-MM-dd')}.pdf`
  link.click()
  URL.revokeObjectURL(url)
}
