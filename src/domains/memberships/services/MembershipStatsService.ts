/**
 * Service pour le calcul des statistiques des membres (V2)
 * 
 * Extrait la logique de calcul des stats depuis les composants UI
 * et centralise dans un service de domaine réutilisable.
 */

import type { MemberWithSubscription, PaginatedMembers } from '@/db/member.db'
import type { User } from '@/types/types'

/**
 * Statistiques complètes des membres
 * Combine les stats basées sur les abonnements et les stats globales
 */
export interface MembershipStatsV2 {
  // Stats de base
  total: number

  // Stats basées sur les abonnements (comme MembershipStats)
  active: number // Membres avec abonnement valide
  expired: number // Membres avec abonnement expiré
  noSub: number // Membres sans abonnement
  activePercentage: number
  expiredPercentage: number
  noSubPercentage: number

  // Stats démographiques
  men: number
  women: number
  menPercentage: number
  womenPercentage: number

  // Stats supplémentaires (comme UserStats)
  inactive?: number // Membres inactifs (basé sur isActive)
  withCar?: number // Membres avec véhicule
  withoutCar?: number // Membres sans véhicule
  newThisMonth?: number // Nouveaux membres ce mois
  newThisYear?: number // Nouveaux membres cette année
  byMembershipType?: {
    adherant: number
    bienfaiteur: number
    sympathisant: number
  }
}

export class MembershipStatsService {
  /**
   * Calcule les statistiques à partir d'une liste de membres paginés
   * 
   * @param paginated - Données paginées des membres
   * @returns Statistiques calculées ou null si pas de données
   */
  static calculateStats(paginated: PaginatedMembers | null): MembershipStatsV2 | null {
    if (!paginated) return null

    const membersWithSubscriptions: MemberWithSubscription[] =
      paginated.data as MemberWithSubscription[]
    const total = paginated.pagination.totalItems

    if (total === 0) {
      return this.getEmptyStats()
    }

    // Stats basées sur les abonnements
    const activeMembers = membersWithSubscriptions.filter((m) => m.isSubscriptionValid).length
    const expiredMembers = membersWithSubscriptions.filter(
      (m) => m.lastSubscription && !m.isSubscriptionValid,
    ).length
    const noSubscription = membersWithSubscriptions.filter((m) => !m.lastSubscription).length

    // Stats démographiques
    const men = membersWithSubscriptions.filter((m) => m.gender === 'Homme').length
    const women = membersWithSubscriptions.filter((m) => m.gender === 'Femme').length

    // Stats supplémentaires (si disponibles dans les données)
    const inactive = membersWithSubscriptions.filter((m) => !m.isActive).length
    const withCar = membersWithSubscriptions.filter((m) => m.hasCar).length
    const withoutCar = membersWithSubscriptions.filter((m) => !m.hasCar).length

    // Nouveaux membres (basé sur createdAt)
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const startOfYear = new Date(now.getFullYear(), 0, 1)

    let newThisMonth = 0
    let newThisYear = 0
    const byMembershipType = {
      adherant: 0,
      bienfaiteur: 0,
      sympathisant: 0,
    }

    membersWithSubscriptions.forEach((member) => {
      // Nouveaux membres
      if (member.createdAt) {
        const createdAt =
          member.createdAt instanceof Date
            ? member.createdAt
            : typeof member.createdAt === 'string'
              ? new Date(member.createdAt)
              : null

        if (createdAt) {
          if (createdAt >= startOfMonth) {
            newThisMonth++
          }
          if (createdAt >= startOfYear) {
            newThisYear++
          }
        }
      }

      // Par type de membership
      if (member.membershipType && byMembershipType.hasOwnProperty(member.membershipType)) {
        byMembershipType[member.membershipType as keyof typeof byMembershipType]++
      }
    })

    const toPercentage = (value: number) => (total > 0 ? (value / total) * 100 : 0)

    return {
      total,
      active: activeMembers,
      expired: expiredMembers,
      noSub: noSubscription,
      activePercentage: toPercentage(activeMembers),
      expiredPercentage: toPercentage(expiredMembers),
      noSubPercentage: toPercentage(noSubscription),
      men,
      women,
      menPercentage: toPercentage(men),
      womenPercentage: toPercentage(women),
      inactive,
      withCar,
      withoutCar,
      newThisMonth,
      newThisYear,
      byMembershipType,
    }
  }

  /**
   * Calcule les statistiques à partir d'une liste simple de membres
   * (sans pagination)
   * 
   * @param members - Liste des membres
   * @returns Statistiques calculées
   */
  static calculateStatsFromMembers(members: MemberWithSubscription[]): MembershipStatsV2 {
    if (members.length === 0) {
      return this.getEmptyStats()
    }

    const total = members.length

    // Stats basées sur les abonnements
    const activeMembers = members.filter((m) => m.isSubscriptionValid).length
    const expiredMembers = members.filter(
      (m) => m.lastSubscription && !m.isSubscriptionValid,
    ).length
    const noSubscription = members.filter((m) => !m.lastSubscription).length

    // Stats démographiques
    const men = members.filter((m) => m.gender === 'Homme').length
    const women = members.filter((m) => m.gender === 'Femme').length

    // Stats supplémentaires
    const inactive = members.filter((m) => !m.isActive).length
    const withCar = members.filter((m) => m.hasCar).length
    const withoutCar = members.filter((m) => !m.hasCar).length

    // Nouveaux membres
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const startOfYear = new Date(now.getFullYear(), 0, 1)

    let newThisMonth = 0
    let newThisYear = 0
    const byMembershipType = {
      adherant: 0,
      bienfaiteur: 0,
      sympathisant: 0,
    }

    members.forEach((member) => {
      // Nouveaux membres
      if (member.createdAt) {
        const createdAt =
          member.createdAt instanceof Date
            ? member.createdAt
            : typeof member.createdAt === 'string'
              ? new Date(member.createdAt)
              : null

        if (createdAt) {
          if (createdAt >= startOfMonth) {
            newThisMonth++
          }
          if (createdAt >= startOfYear) {
            newThisYear++
          }
        }
      }

      // Par type de membership
      if (member.membershipType && byMembershipType.hasOwnProperty(member.membershipType)) {
        byMembershipType[member.membershipType as keyof typeof byMembershipType]++
      }
    })

    const toPercentage = (value: number) => (total > 0 ? (value / total) * 100 : 0)

    return {
      total,
      active: activeMembers,
      expired: expiredMembers,
      noSub: noSubscription,
      activePercentage: toPercentage(activeMembers),
      expiredPercentage: toPercentage(expiredMembers),
      noSubPercentage: toPercentage(noSubscription),
      men,
      women,
      menPercentage: toPercentage(men),
      womenPercentage: toPercentage(women),
      inactive,
      withCar,
      withoutCar,
      newThisMonth,
      newThisYear,
      byMembershipType,
    }
  }

  /**
   * Retourne des stats vides (pour cas limites)
   */
  private static getEmptyStats(): MembershipStatsV2 {
    return {
      total: 0,
      active: 0,
      expired: 0,
      noSub: 0,
      activePercentage: 0,
      expiredPercentage: 0,
      noSubPercentage: 0,
      men: 0,
      women: 0,
      menPercentage: 0,
      womenPercentage: 0,
      inactive: 0,
      withCar: 0,
      withoutCar: 0,
      newThisMonth: 0,
      newThisYear: 0,
      byMembershipType: {
        adherant: 0,
        bienfaiteur: 0,
        sympathisant: 0,
      },
    }
  }
}
