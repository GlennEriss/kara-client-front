'use client'

import CreditDemandDetail from '@/components/credit-speciale/CreditDemandDetail'
import routes from '@/constantes/routes'
import type { CreditDemand } from '@/types/types'

interface CreditFixeDemandDetailSectionProps {
  demand: CreditDemand
}

export function CreditFixeDemandDetailSection({ demand }: CreditFixeDemandDetailSectionProps) {
  return (
    <CreditDemandDetail
      demand={demand}
      listPath={routes.admin.creditFixeDemandes}
      contractDetailsBasePath={routes.admin.creditFixeContrats}
      contractListPath={routes.admin.creditFixeContrats}
      lockCreditType
    />
  )
}
