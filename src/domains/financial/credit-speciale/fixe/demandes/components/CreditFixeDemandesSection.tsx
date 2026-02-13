'use client'

import ListDemandes from '@/components/credit-speciale/ListDemandes'
import routes from '@/constantes/routes'

export function CreditFixeDemandesSection() {
  return (
    <ListDemandes
      forcedCreditType="FIXE"
      demandDetailsBasePath={routes.admin.creditFixeDemandes}
    />
  )
}
