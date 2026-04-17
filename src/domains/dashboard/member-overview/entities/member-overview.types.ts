import type { MembershipType, UserRole } from '@/types/types'

export type MemberOverviewModuleKey =
  | 'caisseSpeciale'
  | 'caisseImprevue'
  | 'creditSpeciale'
  | 'creditFixe'
  | 'creditAide'
  | 'placement'

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
  kind: MemberOverviewRecordKind
  module: MemberOverviewModuleKey
}

export interface MemberOverviewModuleData {
  demandes: MemberOverviewListItem[]
  contrats: MemberOverviewListItem[]
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

