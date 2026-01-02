'use client'

import { useQuery } from '@tanstack/react-query'
import { useContractsByMember } from './useCaisseContracts'
import { useMemberContractsCI } from './caisse-imprevue/useMemberContractsCI'
import { useCharityEventsList } from './bienfaiteur/useCharityEvents'
import { usePlacements } from './usePlacements'
import { ServiceFactory } from '@/factories/ServiceFactory'
import { listPayments } from '@/db/caisse/payments.db'
import { getContractWithComputedState } from '@/services/caisse/readers'
import { format } from 'date-fns'

export interface ContractSummary {
  id: string
  type: 'CAISSE_SPECIALE' | 'CAISSE_IMPREVUE'
  status: string
  monthlyAmount?: number
  lastPaymentDate?: Date | null
  nextPaymentDate?: Date | null
  isUpToDate: boolean
  hasDelay: boolean
  contractLink: string
}

export interface CharitySummary {
  id: string
  name: string
  date: Date
  amount?: number
  type?: string
  charityLink: string
}

export interface PlacementSummary {
  id: string
  amount: number
  rate: number
  period: number
  type: string
  status: string
  placementLink: string
}

export interface ContractStats {
  year: number
  rescinded: number
  closed: number
  earlyWithdraw: number
}

export interface MemberActivitySummary {
  contracts: ContractSummary[]
  charities: CharitySummary[]
  placements: PlacementSummary[]
  stats: ContractStats[]
}

/**
 * Hook pour récupérer le résumé complet des activités d'un membre
 * Inclut : contrats en cours, charités, placements, statistiques
 */
export function useMemberActivitySummary(memberId: string | undefined) {
  return useQuery({
    queryKey: ['member-activity-summary', memberId],
    queryFn: async (): Promise<MemberActivitySummary> => {
      if (!memberId) {
        return {
          contracts: [],
          charities: [],
          placements: [],
          stats: [],
        }
      }

      const currentYear = new Date().getFullYear()
      const previousYear = currentYear - 1

      // 1. Récupérer les contrats Caisse Spéciale
      const csContracts = await fetchCaisseSpecialeContracts(memberId)
      
      // 2. Récupérer les contrats Caisse Imprévue
      const ciContracts = await fetchCaisseImprevueContracts(memberId)
      
      // 3. Récupérer les charités
      const charities = await fetchCharities(memberId, currentYear, previousYear)
      
      // 4. Récupérer les placements
      const placements = await fetchPlacements(memberId)
      
      // 5. Calculer les statistiques
      const stats = await calculateStats(memberId, currentYear, previousYear)

      return {
        contracts: [...csContracts, ...ciContracts],
        charities,
        placements,
        stats,
      }
    },
    enabled: !!memberId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

async function fetchCaisseSpecialeContracts(memberId: string): Promise<ContractSummary[]> {
  try {
    const { listContractsByMember } = await import('@/db/caisse/contracts.db')
    const contracts = await listContractsByMember(memberId)
    
    // Filtrer seulement les contrats en cours (ACTIVE, LATE_NO_PENALTY, LATE_WITH_PENALTY)
    const activeStatuses = ['ACTIVE', 'LATE_NO_PENALTY', 'LATE_WITH_PENALTY', 'DRAFT']
    const activeContracts = contracts.filter((c: any) => activeStatuses.includes(c.status))
    
    const summaries: ContractSummary[] = []
    
    for (const contract of activeContracts) {
      try {
        // Récupérer l'état calculé du contrat
        const contractWithState = await getContractWithComputedState(contract.id)
        if (!contractWithState) continue
        
        // Récupérer les paiements
        const payments = await listPayments(contract.id)
        const paidPayments = payments.filter((p: any) => p.status === 'PAID')
        
        // Trouver le dernier paiement
        const lastPayment = paidPayments
          .sort((a: any, b: any) => {
            const dateA = a.paidAt?.toDate ? a.paidAt.toDate() : (a.paidAt ? new Date(a.paidAt) : new Date(0))
            const dateB = b.paidAt?.toDate ? b.paidAt.toDate() : (b.paidAt ? new Date(b.paidAt) : new Date(0))
            return dateB.getTime() - dateA.getTime()
          })[0]
        
        const lastPaymentDate = lastPayment?.paidAt 
          ? (lastPayment.paidAt.toDate ? lastPayment.paidAt.toDate() : new Date(lastPayment.paidAt))
          : null
        
        // Prochaine échéance
        const nextDue = payments.find((p: any) => p.status === 'DUE')
        const nextPaymentDate = contractWithState.nextDueAt || null
        
        // Vérifier si à jour
        const isUpToDate = contractWithState.status === 'ACTIVE' && 
          (!nextPaymentDate || nextPaymentDate > new Date())
        const hasDelay = ['LATE_NO_PENALTY', 'LATE_WITH_PENALTY'].includes(contractWithState.status)
        
        summaries.push({
          id: contract.id,
          type: 'CAISSE_SPECIALE',
          status: contractWithState.status,
          monthlyAmount: contract.monthlyAmount,
          lastPaymentDate,
          nextPaymentDate,
          isUpToDate,
          hasDelay,
          contractLink: `/caisse-speciale/contrats/${contract.id}`,
        })
      } catch (error) {
        console.error(`Erreur lors du traitement du contrat ${contract.id}:`, error)
      }
    }
    
    return summaries
  } catch (error) {
    console.error('Erreur lors de la récupération des contrats Caisse Spéciale:', error)
    return []
  }
}

async function fetchCaisseImprevueContracts(memberId: string): Promise<ContractSummary[]> {
  try {
    const service = ServiceFactory.getCaisseImprevueService()
    const contracts = await service.getContractsCIByMemberId(memberId)
    
    // Filtrer seulement les contrats actifs
    const activeContracts = contracts.filter((c: any) => c.status === 'ACTIVE')
    
    const summaries: ContractSummary[] = []
    
    for (const contract of activeContracts) {
      try {
        // Récupérer les paiements
        const payments = await service.getPaymentsByContractId(contract.id)
        const paidPayments = payments.filter((p: any) => p.status === 'PAID' || p.status === 'PARTIAL')
        
        // Pour CI, les paiements ont des versements
        let lastPaymentDate: Date | null = null
        if (paidPayments.length > 0) {
          // Trouver le dernier versement parmi tous les paiements
          const allVersements: any[] = []
          paidPayments.forEach((p: any) => {
            if (p.versements && Array.isArray(p.versements)) {
              allVersements.push(...p.versements)
            }
          })
          
          if (allVersements.length > 0) {
            const sortedVersements = allVersements.sort((a: any, b: any) => {
              const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : (a.createdAt ? new Date(a.createdAt) : new Date(0))
              const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : (b.createdAt ? new Date(b.createdAt) : new Date(0))
              return dateB.getTime() - dateA.getTime()
            })
            lastPaymentDate = sortedVersements[0]?.createdAt 
              ? (sortedVersements[0].createdAt.toDate ? sortedVersements[0].createdAt.toDate() : new Date(sortedVersements[0].createdAt))
              : null
          }
        }
        
        // Prochaine échéance : calculer à partir de firstPaymentDate et totalMonthsPaid
        let nextPaymentDate: Date | null = null
        if (contract.firstPaymentDate) {
          const firstDate = new Date(contract.firstPaymentDate)
          firstDate.setHours(0, 0, 0, 0)
          
          // Le prochain mois à payer est totalMonthsPaid (0-indexed)
          const nextMonthIndex = contract.totalMonthsPaid || 0
          
          if (contract.paymentFrequency === 'MONTHLY') {
            // Pour les contrats mensuels, ajouter le nombre de mois
            const nextDate = new Date(firstDate)
            nextDate.setMonth(nextDate.getMonth() + nextMonthIndex)
            nextPaymentDate = nextDate
          } else if (contract.paymentFrequency === 'DAILY') {
            // Pour les contrats journaliers, ajouter le nombre de jours (30 jours par mois)
            const nextDate = new Date(firstDate)
            nextDate.setDate(nextDate.getDate() + (nextMonthIndex * 30))
            nextPaymentDate = nextDate
          }
        }
        
        // Pour CI, on considère à jour si le contrat est ACTIVE
        const isUpToDate = contract.status === 'ACTIVE' && 
          (!nextPaymentDate || nextPaymentDate > new Date())
        const hasDelay = false // CI n'a pas de statut de retard explicite
        
        summaries.push({
          id: contract.id,
          type: 'CAISSE_IMPREVUE',
          status: contract.status,
          monthlyAmount: contract.subscriptionCIAmountPerMonth,
          lastPaymentDate,
          nextPaymentDate,
          isUpToDate,
          hasDelay,
          contractLink: `/caisse-imprevue/contrats/${contract.id}`,
        })
      } catch (error) {
        console.error(`Erreur lors du traitement du contrat CI ${contract.id}:`, error)
      }
    }
    
    return summaries
  } catch (error) {
    console.error('Erreur lors de la récupération des contrats Caisse Imprévue:', error)
    return []
  }
}

async function fetchCharities(memberId: string, currentYear: number, previousYear: number): Promise<CharitySummary[]> {
  try {
    const { CharityEventService } = await import('@/services/bienfaiteur/CharityEventService')
    const { CharityContributionService } = await import('@/services/bienfaiteur/CharityContributionService')
    
    // Récupérer tous les événements
    const allEvents = await CharityEventService.getAllEvents()
    
    // Filtrer les événements de l'année en cours et précédente
    const relevantEvents = allEvents.filter((event: any) => {
      const eventDate = event.startDate?.toDate ? event.startDate.toDate() : 
                       (event.date?.toDate ? event.date.toDate() : new Date(event.date || event.startDate))
      const eventYear = eventDate.getFullYear()
      return eventYear === currentYear || eventYear === previousYear
    })
    
    const summaries: CharitySummary[] = []
    
    for (const event of relevantEvents) {
      try {
        // Récupérer les contributions de l'événement
        const contributions = await CharityContributionService.getEventContributions(event.id)
        
        // Filtrer les contributions du membre
        const memberContributions = contributions.filter((c: any) => {
          // Vérifier si le participant est le membre
          if (c.participant?.type === 'member') {
            // Le participantId devrait correspondre au memberId
            return c.participantId === memberId
          }
          return false
        })
        
        for (const contribution of memberContributions) {
          // Gérer startDate qui peut être un Date ou un Timestamp Firestore
          let eventDate: Date
          if (event.startDate instanceof Date) {
            eventDate = event.startDate
          } else if (event.startDate && typeof (event.startDate as any).toDate === 'function') {
            eventDate = (event.startDate as any).toDate()
          } else {
            eventDate = new Date(event.startDate || Date.now())
          }
          
          // Le montant dépend du type de contribution
          const amount = contribution.contributionType === 'money' 
            ? (contribution.payment?.amount || 0)
            : (contribution.estimatedValue || 0)
          
          summaries.push({
            id: contribution.id,
            name: event.title || 'Événement sans titre',
            date: eventDate,
            amount,
            type: contribution.contributionType,
            charityLink: `/bienfaiteur/charities/${event.id}`,
          })
        }
      } catch (error) {
        console.error(`Erreur lors du traitement de la charité ${event.id}:`, error)
      }
    }
    
    return summaries.sort((a, b) => b.date.getTime() - a.date.getTime())
  } catch (error) {
    console.error('Erreur lors de la récupération des charités:', error)
    return []
  }
}

async function fetchPlacements(memberId: string): Promise<PlacementSummary[]> {
  try {
    const service = ServiceFactory.getPlacementService()
    const placements = await service.listPlacements()
    
    // Filtrer les placements du membre
    const memberPlacements = placements.filter((p: any) => p.bienfaiteurId === memberId)
    
    return memberPlacements.map((p: any) => ({
      id: p.id,
      amount: p.amount,
      rate: p.rate,
      period: p.period,
      type: p.type,
      status: p.status,
      placementLink: `/bienfaiteur/placements/${p.id}`,
    }))
  } catch (error) {
    console.error('Erreur lors de la récupération des placements:', error)
    return []
  }
}

async function calculateStats(memberId: string, currentYear: number, previousYear: number): Promise<ContractStats[]> {
  try {
    // Récupérer tous les contrats du membre
    const { listContractsByMember } = await import('@/db/caisse/contracts.db')
    const csContracts = await listContractsByMember(memberId)
    
    const service = ServiceFactory.getCaisseImprevueService()
    const ciContracts = await service.getContractsCIByMemberId(memberId)
    
    const allContracts = [...csContracts, ...ciContracts]
    
    const statsByYear: Record<number, { rescinded: number; closed: number; earlyWithdraw: number }> = {
      [currentYear]: { rescinded: 0, closed: 0, earlyWithdraw: 0 },
      [previousYear]: { rescinded: 0, closed: 0, earlyWithdraw: 0 },
    }
    
    for (const contract of allContracts) {
      const createdAt = contract.createdAt?.toDate ? contract.createdAt.toDate() : new Date(contract.createdAt)
      const year = createdAt.getFullYear()
      
      if (year !== currentYear && year !== previousYear) continue
      
      if (!statsByYear[year]) {
        statsByYear[year] = { rescinded: 0, closed: 0, earlyWithdraw: 0 }
      }
      
      const status = contract.status
      
      if (status === 'RESCINDED' || status === 'CANCELED') {
        statsByYear[year].rescinded++
      } else if (status === 'CLOSED' || status === 'FINISHED') {
        statsByYear[year].closed++
      } else if (status === 'EARLY_WITHDRAW_REQUESTED' || contract.hasEarlyWithdraw) {
        statsByYear[year].earlyWithdraw++
      }
    }
    
    return [
      { year: currentYear, ...statsByYear[currentYear] },
      { year: previousYear, ...statsByYear[previousYear] },
    ]
  } catch (error) {
    console.error('Erreur lors du calcul des statistiques:', error)
    return []
  }
}

