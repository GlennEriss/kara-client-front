import { PAYMENT_MODE_LABELS, type RefundRequestPdfData } from '@/components/pdf/mutuelle/DemandeRemboursementPDF'
import type { ContractCI, User } from '@/types/types'
import { getContractEndDate } from '@/utils/caisse-imprevue-utils'

/** Données de la demande de remboursement CI, à partir du contrat et du formulaire en cours. */
export function buildCIRefundRequestData(params: {
  contract: ContractCI
  member?: User | null
  type: 'FINAL' | 'EARLY'
  amount?: number
  withdrawalMode?: string
  paymentMethodOther?: string
  reason?: string
  requestedAt?: unknown
}): RefundRequestPdfData {
  const { contract, member } = params
  const paymentMode = params.paymentMethodOther?.trim()
    || (params.withdrawalMode ? PAYMENT_MODE_LABELS[params.withdrawalMode] ?? params.withdrawalMode : '')

  return {
    productLabel: 'Caisse Imprévue',
    type: params.type,
    member: {
      lastName: member?.lastName ?? contract.memberLastName,
      firstName: member?.firstName ?? contract.memberFirstName,
      matricule: member?.matricule ?? contract.memberId,
      identityDocumentNumber: member?.identityDocumentNumber,
      identityDocumentIssuingDate: (member as { identityDocumentIssuingDate?: unknown } | null | undefined)?.identityDocumentIssuingDate,
      birthDate: member?.birthDate,
      birthPlace: member?.birthPlace,
      address: member?.address,
      contacts: member?.contacts?.length ? member.contacts : contract.memberContacts,
      whatsappNumber: member?.whatsappNumber,
      email: member?.email,
      profession: member?.profession,
      companyName: member?.companyName,
      phone: member?.contacts?.[0] ?? contract.memberContacts?.[0],
    },
    contract: {
      id: contract.id,
      formula: contract.subscriptionCILabel ?? contract.subscriptionCICode,
      durationMonths: contract.subscriptionCIDuration,
      startDate: contract.firstPaymentDate,
      endDate: getContractEndDate({
        firstPaymentDate: contract.firstPaymentDate,
        paymentFrequency: contract.paymentFrequency,
        subscriptionCIDuration: contract.subscriptionCIDuration,
      }),
    },
    request: {
      amount: params.amount,
      paymentMode,
      reason: params.reason,
      requestedAt: params.requestedAt ?? new Date(),
    },
  }
}
