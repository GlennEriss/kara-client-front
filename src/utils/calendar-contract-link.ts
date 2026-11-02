import routes from '@/constantes/routes'
import type { OverdueProduct } from '@/hooks/useOverduePayments'

const CONTRACT_ROUTES: Record<OverdueProduct, { viewPermission: string; href: (id: string) => string }> = {
  'Caisse Spéciale': { viewPermission: 'caisseSpeciale.view', href: routes.admin.caisseSpecialeContractDetails },
  'Caisse Imprévue': { viewPermission: 'caisseImprevue.view', href: routes.admin.caisseImprevueContractDetails },
  'Crédit Spéciale': { viewPermission: 'creditSpeciale.view', href: (id) => `${routes.admin.creditSpecialeContrats}/${id}` },
  'Crédit Fixe': { viewPermission: 'creditFixe.view', href: routes.admin.creditFixeContractDetails },
  'Crédit Aide': { viewPermission: 'creditAide.view', href: routes.admin.creditAideContractDetails },
  Placement: { viewPermission: 'placements.view', href: routes.admin.placementDetails },
}

/** Respecte aussi le droit de la page cible : aucun lien vers un dossier inaccessible. */
export function calendarContractHref(
  product: OverdueProduct,
  contractId: string,
  can: (permission: string) => boolean,
): string | null {
  const target = CONTRACT_ROUTES[product]
  if (!contractId || !can('calendar.view') || !can('calendar.contracts') || !can(target.viewPermission)) return null
  return target.href(encodeURIComponent(contractId))
}
