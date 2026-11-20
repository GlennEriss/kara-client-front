import type { FinanceModule } from '../actions'
import { isCreditModule } from '../credit-module'
import {
  findCardEarlyWithdrawal,
  earlyRefundPayoutDueAt,
  refundDate,
} from '@/utils/refund-payout'
import {
  isCaisseSpecialeContractLocked,
  isCaisseImprevueContractLocked,
  isCreditContractLocked,
} from '@/utils/contract-lock'

type Row = Record<string, any>
const iso = (value: unknown) => refundDate(value)?.toISOString() || null
export function contractLocked(module: FinanceModule, row: Row) {
  return module === 'caisse-speciale'
    ? isCaisseSpecialeContractLocked(row.status)
    : module === 'caisse-imprevue'
      ? isCaisseImprevueContractLocked(row.status)
      : isCreditContractLocked(row.status)
}
export function contractSignature(module: FinanceModule, row: Row) {
  if (isCreditModule(module))
    return row.signedContractUrl ? 'SIGNED' : 'MISSING'
  if (module === 'caisse-imprevue' && row.contractStartId) return 'SIGNED'
  if (module === 'caisse-speciale' && row.memberSignedStatus === 'VALIDATED')
    return 'SIGNED'
  if (row.memberSignedStatus === 'PENDING_ADMIN') return 'PENDING_ADMIN'
  if (row.memberSignedStatus === 'REJECTED') return 'REJECTED'
  if (module === 'caisse-speciale' && row.contractPdf) return 'WAITING_MEMBER'
  return 'MISSING'
}
export function projectContractCard(
  module: FinanceModule,
  row: Row,
  data: Row,
) {
  const early = findCardEarlyWithdrawal(data.refunds)
  const variable =
    module === 'caisse-speciale' &&
    /^(LIBRE|JOURNALIERE)/.test(row.caisseType || '')
  return {
    signature: contractSignature(module, row),
    locked: contractLocked(module, row),
    monthlyKind:
      module === 'caisse-speciale' && String(row.caisseType).startsWith('LIBRE')
        ? 'FREE'
        : isCreditModule(module) && row.customSchedule?.length
          ? 'CUSTOM'
          : 'FIXED',
    progress: variable
      ? null
      : isCreditModule(module)
        ? data.progress
        : data.duration > 0
          ? Math.min(100, Math.round((data.paidPeriods / data.duration) * 100))
          : 0,
    progressLabel: isCreditModule(module)
      ? 'Remboursement'
      : 'Échéances réglées',
    earlyWithdrawal: early
      ? {
          id: early.id,
          status: early.status,
          date: iso(
            early.status === 'PAID'
              ? refundDate(early.paidAt) || refundDate(early.withdrawalDate)
              : early.status === 'APPROVED'
                ? earlyRefundPayoutDueAt(early)
                : null,
          ),
          dateKind:
            early.status === 'PAID'
              ? 'ACTUAL'
              : early.status === 'APPROVED'
                ? 'EXPECTED'
                : 'UNSCHEDULED',
        }
      : null,
    refundTypes: [
      ...new Set(
        [
          ...(data.refunds || []).map((refund: Row) => refund.type),
          ...(row.finalRefundDocumentId ? ['FINAL'] : []),
          ...(row.earlyRefundDocumentId ? ['EARLY'] : []),
        ].filter(Boolean),
      ),
    ],
    overdueSummary: data.overdueSummary || null,
    credit: data.credit || null,
  }
}
