import routes from '@/constantes/routes'
import type { MemberOverviewListItem } from './member-overview.types'

export function memberOverviewDetailRoute(
  item: MemberOverviewListItem,
): string | null {
  const id = encodeURIComponent(item.id)
  if (item.module === 'caisseSpeciale')
    return item.kind === 'demande'
      ? routes.admin.caisseSpecialeDemandDetails(id)
      : routes.admin.caisseSpecialeContractDetails(id)
  if (item.module === 'caisseImprevue')
    return item.kind === 'demande'
      ? routes.admin.caisseImprevueDemandDetails(id)
      : routes.admin.caisseImprevueContractDetails(id)
  const prefix = {
    creditSpeciale: 'credit-speciale',
    creditFixe: 'credit-fixe',
    creditAide: 'credit-aide',
  }[item.module as string]
  if (prefix)
    return `/${prefix}/${item.kind === 'demande' ? 'demandes' : 'contrats'}/${id}`
  if (item.module === 'placement')
    return item.kind === 'demande'
      ? `/placements/demandes/${id}`
      : `/placements/${id}`
  return null
}
