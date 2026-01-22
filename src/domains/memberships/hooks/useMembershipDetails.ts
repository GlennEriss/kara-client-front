'use client'

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import type { User, Subscription, Filleul } from '@/types/types'
import { getUserById } from '@/db/user.db'
import { getMemberSubscriptions } from '@/db/member.db'
import { listContractsByMember } from '@/db/caisse/contracts.db'
import { useMemberWithFilleuls } from '@/hooks/filleuls'
import { useDocumentList } from '@/hooks/documents/useDocumentList'
import { getNationalityName } from '@/constantes/nationality'
import routes from '@/constantes/routes'

// Types pour les contrats
export interface MemberContract {
  id: string
  memberId: string
  status: string
  caisseType?: string
  monthlyAmount?: number
  contractStartAt?: Date
  contractEndAt?: Date
  nextDueAt?: Date
  createdAt?: Date
  updatedAt?: Date
  [key: string]: any
}

// Types pour les contrats organisés
export interface MemberContracts {
  caisseSpeciale: MemberContract[]
  caisseSpecialeCount: number
  hasActiveCaisseSpeciale: boolean
  caisseImprevue: MemberContract[]
  caisseImprevueCount: number
  hasActiveCaisseImprevue: boolean
  placements: MemberContract[]
  placementsCount: number
  totalCount: number
}

// Type pour les données enrichies du membre
export interface MemberDetails extends User {
  fullName: string
  displayName: string
  nationalityName: string
}

// Options du hook
export interface UseMembershipDetailsOptions {
  memberId: string
  enabled?: boolean
}

// Résultat du hook
export interface UseMembershipDetailsResult {
  // Données
  member: MemberDetails | null
  subscriptions: Subscription[]
  lastSubscription: Subscription | null
  isSubscriptionValid: boolean
  contracts: MemberContracts
  filleuls: Filleul[] | null
  filleulsCount: number
  documents: ReturnType<typeof useDocumentList>['documents'] | null
  documentsCount: number

  // États
  isLoading: boolean
  isError: boolean
  error: Error | null

  // Actions
  refetch: () => Promise<unknown>

  // Handlers de navigation
  onOpenMembershipRequest: () => void
  onOpenSubscriptionHistory: () => void
  onOpenFilleuls: () => void
  onOpenContracts: (moduleKey: 'caisse-speciale' | 'caisse-imprevue' | 'placements') => void
  onOpenDocuments: () => void
  onOpenVehicles: () => void
}

const MEMBERSHIP_DETAILS_CACHE_KEY = 'membership-details'

/**
 * Hook agrégateur pour récupérer toutes les données nécessaires à l'affichage
 * de la vue détails d'un membre.
 */
export function useMembershipDetails(
  options: UseMembershipDetailsOptions,
): UseMembershipDetailsResult {
  const { memberId, enabled = true } = options
  const router = useRouter()

  // Requête pour le membre
  const memberQuery = useQuery<User | null>({
    queryKey: [MEMBERSHIP_DETAILS_CACHE_KEY, 'member', memberId],
    queryFn: () => getUserById(memberId),
    enabled: enabled && !!memberId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  })

  // Requête pour les abonnements
  const subscriptionsQuery = useQuery<Subscription[]>({
    queryKey: [MEMBERSHIP_DETAILS_CACHE_KEY, 'subscriptions', memberId],
    queryFn: () => getMemberSubscriptions(memberId),
    enabled: enabled && !!memberId,
    staleTime: 3 * 60 * 1000, // 3 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  })

  // Requête pour les contrats
  const contractsQuery = useQuery<MemberContract[]>({
    queryKey: [MEMBERSHIP_DETAILS_CACHE_KEY, 'contracts', memberId],
    queryFn: () => listContractsByMember(memberId),
    enabled: enabled && !!memberId,
    staleTime: 3 * 60 * 1000, // 3 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  })

  // Hook pour les filleuls (utilise le hook existant)
  // Note: useMemberWithFilleuls retourne des objets query, on utilise directement les données
  const filleulsData = useMemberWithFilleuls(memberId)

  // Hook pour les documents (utilise le hook existant)
  const documentsQuery = useDocumentList(memberId)

  // Enrichir les données du membre
  const member: MemberDetails | null = useMemo(() => {
    if (!memberQuery.data) return null

    const user = memberQuery.data
    return {
      ...user,
      fullName: `${user.firstName} ${user.lastName}`.trim(),
      displayName: `${user.firstName} ${user.lastName}`.trim(),
      nationalityName: getNationalityName(user.nationality),
    }
  }, [memberQuery.data])

  // Calculer la dernière subscription et son statut
  const { lastSubscription, isSubscriptionValid } = useMemo(() => {
    const subscriptions = subscriptionsQuery.data || []
    if (subscriptions.length === 0) {
      return { lastSubscription: null, isSubscriptionValid: false }
    }

    // Trier par date de fin (plus récente en premier)
    const sorted = [...subscriptions].sort(
      (a, b) => b.dateEnd.getTime() - a.dateEnd.getTime(),
    )
    const last = sorted[0]
    const isValid = last.dateEnd > new Date()

    return { lastSubscription: last, isSubscriptionValid: isValid }
  }, [subscriptionsQuery.data])

  // Organiser les contrats par type
  const contracts: MemberContracts = useMemo(() => {
    const allContracts = contractsQuery.data || []

    const caisseSpeciale = allContracts.filter(
      (c) => c.caisseType === 'STANDARD' || c.caisseType === 'JOURNALIERE' || c.caisseType === 'LIBRE',
    )
    const caisseImprevue = allContracts.filter((c) => c.caisseType === 'CAISSE_IMPREVUE')
    const placements = allContracts.filter((c) => c.caisseType === 'PLACEMENT')

    const activeStatuses = [
      'ACTIVE',
      'LATE_NO_PENALTY',
      'LATE_WITH_PENALTY',
      'FINAL_REFUND_PENDING',
      'EARLY_REFUND_PENDING',
    ]

    return {
      caisseSpeciale,
      caisseSpecialeCount: caisseSpeciale.length,
      hasActiveCaisseSpeciale: caisseSpeciale.some((c) => activeStatuses.includes(c.status)),
      caisseImprevue,
      caisseImprevueCount: caisseImprevue.length,
      hasActiveCaisseImprevue: caisseImprevue.some((c) => activeStatuses.includes(c.status)),
      placements,
      placementsCount: placements.length,
      totalCount: allContracts.length,
    }
  }, [contractsQuery.data])

  // États agrégés
  const isLoading =
    memberQuery.isLoading ||
    subscriptionsQuery.isLoading ||
    contractsQuery.isLoading ||
    filleulsData.isLoading ||
    documentsQuery.isLoading

  const isError =
    memberQuery.isError ||
    subscriptionsQuery.isError ||
    contractsQuery.isError ||
    filleulsData.isError ||
    documentsQuery.isError

  const error =
    memberQuery.error ||
    subscriptionsQuery.error ||
    contractsQuery.error ||
    filleulsData.error ||
    (documentsQuery.isError ? new Error('Erreur lors du chargement des documents') : null) ||
    null

  // Fonction de refetch globale
  const refetch = async () => {
    await Promise.all([
      memberQuery.refetch(),
      subscriptionsQuery.refetch(),
      contractsQuery.refetch(),
      filleulsData.filleuls.refetch(),
    ])
  }

  // Handlers de navigation
  const onOpenMembershipRequest = () => {
    if (!member?.dossier) return
    router.push(routes.admin.membershipRequestDetails(member.dossier))
  }

  const onOpenSubscriptionHistory = () => {
    router.push(routes.admin.membershipSubscription(memberId))
  }

  const onOpenFilleuls = () => {
    router.push(routes.admin.membershipFilleuls(memberId))
  }

  const onOpenContracts = (moduleKey: 'caisse-speciale' | 'caisse-imprevue' | 'placements') => {
    switch (moduleKey) {
      case 'caisse-speciale':
        router.push(routes.admin.caisseSpeciale)
        break
      case 'caisse-imprevue':
        router.push(routes.admin.caisseImprevue)
        break
      case 'placements':
        router.push(routes.admin.placements)
        break
    }
  }

  const onOpenDocuments = () => {
    router.push(routes.admin.membershipDocuments(memberId))
  }

  const onOpenVehicles = () => {
    // TODO: Vérifier si une route existe pour les véhicules d'un membre spécifique
    router.push(routes.admin.vehicules)
  }

  return {
    // Données
    member,
    subscriptions: subscriptionsQuery.data || [],
    lastSubscription,
    isSubscriptionValid,
    contracts,
    filleuls: filleulsData.filleuls.data || null,
    filleulsCount: filleulsData.filleuls.data?.length || 0,
    documents: documentsQuery.documents || null,
    documentsCount: documentsQuery.pagination.totalItems || 0,

    // États
    isLoading,
    isError,
    error: error as Error | null,

    // Actions
    refetch,

    // Handlers de navigation
    onOpenMembershipRequest,
    onOpenSubscriptionHistory,
    onOpenFilleuls,
    onOpenContracts,
    onOpenDocuments,
    onOpenVehicles,
  }
}
