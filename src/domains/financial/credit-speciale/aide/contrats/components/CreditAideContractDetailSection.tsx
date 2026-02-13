'use client'

import CreditContractDetail from '@/components/credit-speciale/CreditContractDetail'
import routes from '@/constantes/routes'
import type { CreditContract } from '@/types/types'

interface CreditAideContractDetailSectionProps {
  contract: CreditContract
}

export function CreditAideContractDetailSection({ contract }: CreditAideContractDetailSectionProps) {
  return (
    <CreditContractDetail
      contract={contract}
      listPath={routes.admin.creditAideContrats}
      contractDetailsBasePath={routes.admin.creditAideContrats}
    />
  )
}
