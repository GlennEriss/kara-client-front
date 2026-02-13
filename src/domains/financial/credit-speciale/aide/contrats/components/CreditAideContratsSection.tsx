'use client'

import ListContrats from '@/components/credit-speciale/ListContrats'
import routes from '@/constantes/routes'

export function CreditAideContratsSection() {
  return (
    <ListContrats
      forcedCreditType="AIDE"
      contractDetailsBasePath={routes.admin.creditAideContrats}
    />
  )
}
