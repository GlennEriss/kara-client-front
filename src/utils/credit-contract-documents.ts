import type { CreditContract } from '@/types/types'
import { isCreditContractLocked } from './contract-lock'

type DocumentContract = Partial<
  Pick<
    CreditContract,
    | 'status'
    | 'signedContractUrl'
    | 'rajoutEffectue'
    | 'extendedAt'
    | 'creditCycles'
  >
>

/** Les anciens contrats peuvent ne disposer que du marqueur de rajout. */
export function hasCreditContractExtension(
  contract: DocumentContract,
): boolean {
  return (
    contract.rajoutEffectue === true ||
    !!contract.extendedAt ||
    (contract.creditCycles ?? []).some((cycle) => cycle.type === 'AUGMENTATION')
  )
}

/** Un dépôt après rajout ajoute une version, même si un PDF est déjà présent. */
export function canUploadSignedCreditContract(
  contract: DocumentContract,
): boolean {
  return (
    !!contract.status &&
    !isCreditContractLocked(contract.status) &&
    ['PENDING', 'ACTIVE', 'PARTIAL', 'OVERDUE', 'BLOCKED'].includes(
      contract.status,
    ) &&
    (!contract.signedContractUrl || hasCreditContractExtension(contract))
  )
}

export function isCreditContractActivationUpload(
  contract: DocumentContract,
): boolean {
  return contract.status === 'PENDING' && !hasCreditContractExtension(contract)
}
