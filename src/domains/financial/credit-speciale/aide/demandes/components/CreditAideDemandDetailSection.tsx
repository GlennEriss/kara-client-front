'use client'

import CreditDemandDetail from '@/components/credit-speciale/CreditDemandDetail'
import routes from '@/constantes/routes'
import type { CreditDemand } from '@/types/types'

interface CreditAideDemandDetailSectionProps {
  demand: CreditDemand
}

export function CreditAideDemandDetailSection({ demand }: CreditAideDemandDetailSectionProps) {
  return (
    <CreditDemandDetail
      demand={demand}
      listPath={routes.admin.creditAideDemandes}
      contractDetailsBasePath={routes.admin.creditAideContrats}
      contractListPath={routes.admin.creditAideContrats}
      lockCreditType
    />
  )
}
