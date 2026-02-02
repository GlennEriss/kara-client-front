import type { AgentRecouvrement, AgentsFilters, AgentsStats } from '@/types/types'
import type { PaginatedAgents } from '@/db/agent-recouvrement.db'
import type { CreateAgentInput } from '@/repositories/agent-recouvrement/IAgentRecouvrementRepository'
import type { DocumentSnapshot } from '@/firebase/firestore'

export interface IAgentRecouvrementService {
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
