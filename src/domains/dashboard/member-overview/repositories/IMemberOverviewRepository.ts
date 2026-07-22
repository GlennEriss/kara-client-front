import type { MemberOverviewMemberInfo } from '../entities/member-overview.types'

export interface OverviewRawRecord {
  id: string
  status?: string
  amount?: number
  createdAt?: unknown
  desiredDate?: unknown
  contractId?: string
  /** Libellé lisible (ex. titre de l'événement caritatif). */
  label?: string
  [key: string]: unknown
}

export interface IMemberOverviewRepository {
  getMemberById(memberId: string): Promise<MemberOverviewMemberInfo | null>
  getCaisseSpecialeDemands(memberId: string, limitPerSection: number): Promise<OverviewRawRecord[]>
  getCaisseSpecialeContracts(memberId: string, limitPerSection: number): Promise<OverviewRawRecord[]>
  getCaisseImprevueDemands(memberId: string, limitPerSection: number): Promise<OverviewRawRecord[]>
  getCaisseImprevueContracts(memberId: string, limitPerSection: number): Promise<OverviewRawRecord[]>
  getCreditDemands(memberId: string, creditType: 'SPECIALE' | 'FIXE' | 'AIDE', limitPerSection: number): Promise<OverviewRawRecord[]>
  getCreditContracts(memberId: string, creditType: 'SPECIALE' | 'FIXE' | 'AIDE', limitPerSection: number): Promise<OverviewRawRecord[]>
  getPlacementDemands(memberId: string, limitPerSection: number): Promise<OverviewRawRecord[]>
  getPlacements(memberId: string, limitPerSection: number): Promise<OverviewRawRecord[]>
  getCharityDeclarations(matricule: string, limitPerSection: number): Promise<OverviewRawRecord[]>
  getCharityContributions(memberId: string, limitPerSection: number): Promise<OverviewRawRecord[]>
}

