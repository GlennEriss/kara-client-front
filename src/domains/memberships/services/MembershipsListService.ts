import type { UserFilters } from '@/types/types'
import type { MemberWithSubscription, PaginatedMembers } from '@/db/member.db'

export type MembersTab =
  | 'all'
  | 'adherents'
  | 'bienfaiteurs'
  | 'sympathisants'
  | 'abonnement-valide'
  | 'abonnement-invalide'
  | 'anniversaires'

export interface MembershipStats {
  total: number
  active: number
  expired: number
  noSub: number
  men: number
  women: number
  activePercentage: number
  expiredPercentage: number
  noSubPercentage: number
  menPercentage: number
  womenPercentage: number
}

export class MembershipsListService {
  /**
   * Construit les filtres effectifs à partir des filtres de base + du tab sélectionné.
   * Pour l’instant le mapping est minimal ; il pourra être enrichi progressivement.
   */
  static buildFiltersForTab(baseFilters: UserFilters = {}, tab?: MembersTab): UserFilters {
    if (!tab || tab === 'all') {
      return baseFilters
    }

    const filters: UserFilters = { ...baseFilters }

    switch (tab) {
      case 'adherents':
        filters.membershipType = ['adherant']
        break

      case 'bienfaiteurs':
        filters.membershipType = ['bienfaiteur']
        break

      case 'sympathisants':
        filters.membershipType = ['sympathisant']
        break

      case 'abonnement-valide':
        // Pour l’instant, ces filtres sont surtout gérés côté client via subscriptions.
        // On pourra les déplacer côté Firestore plus tard.
        filters.isActive = true
        break

      case 'abonnement-invalide':
        filters.isActive = false
        break

      case 'anniversaires':
        // Aucun filtre Firestore spécifique pour l’instant : la logique
        // restera côté client (ex: isBirthdayToday) jusqu’au refacto complet.
        break

      default:
        break
    }

    return filters
  }

  /**
   * Calcule les statistiques affichées dans le carrousel à partir des données paginées.
   * Reprend la logique existante de `MembershipList.tsx` pour garder le même rendu.
   */
  static calculateStats(paginated: PaginatedMembers | null): MembershipStats | null {
    if (!paginated) return null

    const membersWithSubscriptions: MemberWithSubscription[] = paginated.data as MemberWithSubscription[]
    const total = paginated.pagination.totalItems

    if (total === 0) {
      return {
        total: 0,
        active: 0,
        expired: 0,
        noSub: 0,
        men: 0,
        women: 0,
        activePercentage: 0,
        expiredPercentage: 0,
        noSubPercentage: 0,
        menPercentage: 0,
        womenPercentage: 0,
      }
    }

    const activeMembers = membersWithSubscriptions.filter((m) => m.isSubscriptionValid).length
    const expiredMembers = membersWithSubscriptions.filter(
      (m) => m.lastSubscription && !m.isSubscriptionValid,
    ).length
    const noSubscription = membersWithSubscriptions.filter((m) => !m.lastSubscription).length

    const men = membersWithSubscriptions.filter((m) => m.gender === 'Homme').length
    const women = membersWithSubscriptions.filter((m) => m.gender === 'Femme').length

    const toPercentage = (value: number) => (total > 0 ? (value / total) * 100 : 0)

    return {
      total,
      active: activeMembers,
      expired: expiredMembers,
      noSub: noSubscription,
      men,
      women,
      activePercentage: toPercentage(activeMembers),
      expiredPercentage: toPercentage(expiredMembers),
      noSubPercentage: toPercentage(noSubscription),
      menPercentage: toPercentage(men),
      womenPercentage: toPercentage(women),
    }
  }
}

