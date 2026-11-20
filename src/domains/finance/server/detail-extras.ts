import { withBusinessDates } from '@/domains/mobile/server/calendar-dates'
import {
  buildGuarantorCommissionBalance,
  buildGuarantorCommissionRows,
  isUnknownGuarantor,
} from '@/utils/guarantor-commission'
import {
  buildCreditLossHistory,
  computeMissedEarningsBalance,
  computePostTermPenaltyBalance,
} from '@/utils/credit-losses'
import type { CreditContract, CreditPayment } from '@/types/types'
import type { FinanceServices } from './services'
import { mapWithConcurrency } from '@/utils/mapWithConcurrency'

type Row = Record<string, any>
export function creditDetailExtras(
  record: Row,
  payments: Row[],
  remunerations: Row[],
  guarantorPayments: Row[],
) {
  const contract = withBusinessDates(record) as CreditContract
  const paidRows = withBusinessDates(payments) as CreditPayment[]
  const commissions =
    contract.guarantorIsMember &&
    !isUnknownGuarantor(contract) &&
    Number(contract.guarantorRemunerationPercentage) > 0
      ? buildGuarantorCommissionRows(
          contract,
          withBusinessDates(remunerations) as any,
          paidRows,
        )
      : []
  return {
    lossHistory: buildCreditLossHistory(contract, paidRows),
    ...(['FIXE', 'AIDE'].includes(contract.creditType) ? { postTermPenaltyBalance: computePostTermPenaltyBalance(contract, paidRows) } : {}),
    commissions,
    commissionBalance: buildGuarantorCommissionBalance(
      commissions,
      withBusinessDates(guarantorPayments) as any,
    ),
    missedEarningsBalance: computeMissedEarningsBalance(contract, paidRows),
  }
}
/** Resolve actors once per detail; never replace business identifiers used by forms. */
export async function decorateFinanceDetail(
  services: FinanceServices,
  detail: Row,
) {
  const keys = [
    'createdBy',
    'updatedBy',
    'approvedBy',
    'agentRecouvrementId',
    'paymentRecordedBy',
    'recordedBy',
  ]
  const ids = new Set<string>()
  const visit = (value: any, apply?: Map<string, string>) => {
    if (!value || typeof value !== 'object' || value instanceof Date) return
    if (Array.isArray(value)) {
      value.forEach((v) => visit(v, apply))
      return
    }
    for (const key of keys) {
      if (typeof value[key] !== 'string' || !value[key]) continue
      if (!apply) ids.add(value[key])
      else {
        const name = apply.get(value[key])
        if (name)
          value[
            key === 'agentRecouvrementId'
              ? 'agentRecouvrementName'
              : key + 'Name'
          ] = name
      }
    }
    Object.values(value).forEach((v) => visit(v, apply))
  }
  visit(detail)
  const names = new Map<string, string>()
  await mapWithConcurrency([...ids], 6, async (id) => {
    const admin = await services.admins.getAdminById(id)
    const fullName = `${admin?.firstName || ''} ${admin?.lastName || ''}`.trim()
    if (fullName) names.set(id, fullName)
  })
  visit(detail, names)
  return detail
}
