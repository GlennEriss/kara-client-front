'use client'

import CreditContractDetail from '@/components/credit-speciale/CreditContractDetail'
import routes from '@/constantes/routes'
import type { CreditContract } from '@/types/types'

interface CreditFixeContractDetailSectionProps {
  contract: CreditContract
}

export function CreditFixeContractDetailSection({ contract }: CreditFixeContractDetailSectionProps) {
  return (
    <CreditContractDetail
      contract={contract}
      listPath={routes.admin.creditFixeContrats}
      contractDetailsBasePath={routes.admin.creditFixeContrats}
    />
  )
}
