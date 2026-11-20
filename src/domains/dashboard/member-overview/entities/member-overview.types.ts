import type { MembershipType, UserRole } from '@/types/types'

export type MemberOverviewModuleKey =
  | 'caisseSpeciale'
  | 'caisseImprevue'
  | 'creditSpeciale'
  | 'creditFixe'
  | 'creditAide'
  | 'placement'
  | 'charite'

export type MemberOverviewRecordKind = 'demande' | 'contrat'

export interface MemberOverviewMemberInfo {
  id: string
  matricule?: string
  firstName?: string
  lastName?: string
  contacts?: string[]
  membershipType?: MembershipType
  roles?: UserRole[]
  isActive?: boolean
  photoURL?: string | null
}

export interface MemberOverviewListItem {
  id: string
  status: string
  amount?: number
  createdAt?: string
  desiredDate?: string
  contractId?: string
  /** Libellé lisible affiché avec l'identifiant (ex. titre d'événement). */
  label?: string
  kind: MemberOverviewRecordKind
  module: MemberOverviewModuleKey
}

export interface MemberOverviewModuleData {
  demandes: MemberOverviewListItem[]
  contrats: MemberOverviewListItem[]
  /** Contrats clôturés consultables derrière le compteur, sans limite d’affichage. */
  closedContracts?: MemberOverviewListItem[]
  available?: boolean
  /**
   * Vrai si au moins une requête du module a échoué (index manquant, droits,
   * réseau…). Sans ce drapeau, une section en erreur est indiscernable d'une
   * section réellement vide : l'admin lit « 0 » et croit la donnée absente.
   */
  hasError?: boolean
  /**
   * Nombre total de contrats clôturés, issu de la même liste que les liens.
   * Absent pour la charité ; null si la lecture des contrats a échoué.
   */
  closedContrats?: number | null
}

export interface MemberOverviewData {
  member: MemberOverviewMemberInfo | null
  modules: Record<MemberOverviewModuleKey, MemberOverviewModuleData>
  counts: Record<string, number>
  generatedAt: string
}

export interface MemberGlobalSearchItem {
  id: string
  firstName: string
  lastName: string
  matricule?: string
  contacts?: string[]
  photoURL?: string | null
}
