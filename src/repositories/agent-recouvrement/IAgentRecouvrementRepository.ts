import type { AgentRecouvrement, AgentsFilters, AgentsStats } from '@/types/types'
import type { IRepository } from '../IRepository'
import type { PaginatedAgents } from '@/db/agent-recouvrement.db'
import type { DocumentSnapshot } from '@/firebase/firestore'

export interface CreateAgentInput {
  nom: string
  prenom: string
  sexe: 'M' | 'F'
  pieceIdentite: {
    type: string
    numero: string
    dateDelivrance: Date
    dateExpiration: Date
  }
  dateNaissance: Date
  lieuNaissance: string
  tel1: string
  tel2?: string
  photoUrl?: string | null
  photoPath?: string | null
  actif?: boolean
  createdBy: string
}

export interface IAgentRecouvrementRepository extends IRepository {
  getAgentsWithFilters(
    filters: AgentsFilters,
    page: number,
    itemsPerPage: number,
    cursor?: DocumentSnapshot
  ): Promise<PaginatedAgents>
  getAgentsAnniversairesMois(
    page: number,
    itemsPerPage: number,
    cursor?: DocumentSnapshot
  ): Promise<PaginatedAgents>
  getAgentById(id: string): Promise<AgentRecouvrement | null>
  getAgentsStats(): Promise<AgentsStats>
  createAgent(input: CreateAgentInput): Promise<string>
  updateAgent(
    id: string,
    updates: Partial<Omit<AgentRecouvrement, 'id' | 'createdAt' | 'createdBy'>>,
    updatedBy: string
  ): Promise<boolean>
  deactivateAgent(id: string, updatedBy: string): Promise<boolean>
  reactivateAgent(id: string, updatedBy: string): Promise<boolean>
  deleteAgent(id: string): Promise<boolean>
  getAgentsActifs(): Promise<AgentRecouvrement[]>
}
