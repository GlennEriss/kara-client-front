import { listContractsByMember } from '@/db/caisse/contracts.db'
import { listPayments } from '@/db/caisse/payments.db'
import type { ContractPayment } from '@/domains/financial/caisse-speciale/contrats/entities/contract.types'
import { RepositoryFactory } from '@/factories/RepositoryFactory'
import { ServiceFactory } from '@/factories/ServiceFactory'
import type { CaisseContract, ContractCI, CreditContract, CreditPayment, PaymentCI } from '@/types/types'
import type { MemberFormSummary } from '../entities/member-form.types'
import {
  buildCompleteMemberFormSummary,
  type CaisseImprevueFormSource,
  type CaisseSpecialeFormSource,
  type CreditFormSource,
} from './member-form.builders'

const CAISSE_SPECIALE_TYPES = new Set([
  'STANDARD',
  'JOURNALIERE',
  'LIBRE',
  'STANDARD_CHARITABLE',
  'JOURNALIERE_CHARITABLE',
  'LIBRE_CHARITABLE',
])

/**
 * Agrège les échéances des cinq produits financiers pour la fiche membre admin.
 * Les lectures par contrat sont parallélisées afin de ne pas allonger le temps
 * d'affichage quand le membre possède plusieurs historiques.
 */
export async function getMemberFormSummary(
  memberId: string,
  now: Date = new Date(),
): Promise<MemberFormSummary> {
  const caisseImprevueService = ServiceFactory.getCaisseImprevueService()
  const creditContractRepository = RepositoryFactory.getCreditContractRepository()
  const creditPaymentRepository = RepositoryFactory.getCreditPaymentRepository()

  const [rawCaisseSpecialeContracts, caisseImprevueContracts, creditContracts] = await Promise.all([
    listContractsByMember(memberId),
    caisseImprevueService.getContractsCIByMemberId(memberId),
    creditContractRepository.getContractsByClientId(memberId),
  ])

  const caisseSpecialeContracts = (rawCaisseSpecialeContracts as CaisseContract[]).filter(
    (contract): contract is CaisseContract & { id: string } =>
      Boolean(contract.id) && CAISSE_SPECIALE_TYPES.has(contract.caisseType),
  )

  const [caisseSpeciale, caisseImprevue, credits] = await Promise.all([
    Promise.all(
      caisseSpecialeContracts.map(async (contract): Promise<CaisseSpecialeFormSource> => ({
        contract,
        payments: await listPayments(contract.id) as ContractPayment[],
      })),
    ),
    Promise.all(
      (caisseImprevueContracts as ContractCI[]).map(
        async (contract): Promise<CaisseImprevueFormSource> => ({
          contract,
          payments: await caisseImprevueService.getPaymentsByContractId(contract.id) as PaymentCI[],
        }),
      ),
    ),
    Promise.all(
      (creditContracts as CreditContract[]).map(async (contract): Promise<CreditFormSource> => ({
        contract,
        payments: await creditPaymentRepository.getPaymentsByCreditId(contract.id) as CreditPayment[],
      })),
    ),
  ])

  return buildCompleteMemberFormSummary({
    memberId,
    caisseSpeciale,
    caisseImprevue,
    credits,
    now,
  })
}
