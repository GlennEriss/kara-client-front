import {
  isCaisseSpecialeContractLocked,
  isCaisseImprevueContractLocked,
  isCreditContractLocked,
} from '@/utils/contract-lock'
import { contractLocked } from './contract-card'
import type { FinanceModule } from '../actions'
import { canUploadSignedCreditContract } from '@/utils/credit-contract-documents'
import { isCreditModule } from '../credit-module'

type Row = Record<string, any>
export function contractDocumentGate(module: FinanceModule, row: Row) {
  const pending =
    row.memberSignedStatus === 'PENDING_ADMIN' && !!row.memberSignedDocumentId
  const signed =
    module === 'caisse-speciale'
      ? row.contractPdf &&
        ['fileSize', 'originalFileName', 'path', 'uploadedAt', 'url'].every(
          (key) => row.contractPdf[key] != null,
        )
      : module === 'caisse-imprevue'
        ? !!row.contractStartId
        : !!row.signedContractUrl
  if (
    signed ||
    (['caisse-speciale', 'caisse-imprevue'].includes(module) &&
      row.isMigrated &&
      !pending)
  )
    return null
  return {
    status: pending ? 'PENDING_ADMIN' : 'MISSING',
    title: pending ? 'Signature membre reçue' : 'Contrat signé requis',
    message: pending
      ? 'Consultez le document transmis par le membre, puis validez le contrat doublement signé avant les opérations.'
      : 'Générez le contrat, faites-le signer puis téléversez le document signé pour accéder aux opérations.',
  }
}
export function contractActionAvailable(
  module: FinanceModule,
  row: Row,
  actionId: string,
) {
  const hasDocument =
    module === 'caisse-speciale'
      ? !!row.contractPdf
      : module === 'caisse-imprevue'
        ? !!row.contractStartId
        : !!row.signedContractUrl
  if (
    [
      'document.upload',
      'document.replace',
      'contract.delete',
      'member-document.approve',
      'member-document.reject',
    ].includes(actionId) &&
    contractLocked(module, row)
  )
    return false
  if (actionId === 'document.upload')
    return isCreditModule(module)
      ? canUploadSignedCreditContract(row)
      : !hasDocument
  if (actionId === 'document.replace')
    return (
      hasDocument && (module !== 'caisse-imprevue' || row.status === 'ACTIVE')
    )
  if (actionId.startsWith('member-document.'))
    return (
      row.memberSignedStatus === 'PENDING_ADMIN' && !!row.memberSignedDocumentId
    )
  if (contractDocumentGate(module, row))
    return (
      actionId.startsWith('document.') ||
      actionId.startsWith('member-document.') ||
      actionId === 'contract.delete'
    )
  const locked =
    module === 'caisse-speciale'
      ? isCaisseSpecialeContractLocked(row.status)
      : module === 'caisse-imprevue'
        ? isCaisseImprevueContractLocked(row.status)
        : isCreditContractLocked(row.status)
  if (
    locked &&
    (actionId.startsWith('payment.') ||
      ['rest.create', 'contract.rest'].includes(actionId))
  )
    return false
  return true
}
