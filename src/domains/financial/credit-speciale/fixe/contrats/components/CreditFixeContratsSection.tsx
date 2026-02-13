'use client'

import ListContrats from '@/components/credit-speciale/ListContrats'
import routes from '@/constantes/routes'

export function CreditFixeContratsSection() {
  return (
    <ListContrats
      forcedCreditType="FIXE"
      contractDetailsBasePath={routes.admin.creditFixeContrats}
    />
  )
}
