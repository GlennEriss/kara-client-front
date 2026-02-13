'use client'

import ListDemandes from '@/components/credit-speciale/ListDemandes'
import routes from '@/constantes/routes'

export function CreditAideDemandesSection() {
  return (
    <ListDemandes
      forcedCreditType="AIDE"
      demandDetailsBasePath={routes.admin.creditAideDemandes}
    />
  )
}
