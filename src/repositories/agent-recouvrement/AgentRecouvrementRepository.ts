import { IAgentRecouvrementRepository, CreateAgentInput } from './IAgentRecouvrementRepository'
import * as agentDb from '@/db/agent-recouvrement.db'
import type { DocumentSnapshot } from '@/firebase/firestore'

export class AgentRecouvrementRepository implements IAgentRecouvrementRepository {
  readonly name = 'AgentRecouvrementRepository'

  async getAgentsWithFilters(
    filters: Parameters<IAgentRecouvrementRepository['getAgentsWithFilters']>[0],
    page: number,
    itemsPerPage: number,
    cursor?: DocumentSnapshot
  ) {
    return agentDb.getAgentsWithFilters(filters, page, itemsPerPage, cursor)
  }

  async getAgentsAnniversairesMois(
    page: number,
    itemsPerPage: number,
    cursor?: DocumentSnapshot
  ) {
    return agentDb.getAgentsAnniversairesMois(page, itemsPerPage, cursor)
  }

  async getAgentById(id: string) {
    return agentDb.getAgentById(id)
  }

  async getAgentsStats() {
    return agentDb.getAgentsStats()
  }

  async createAgent(input: CreateAgentInput) {
    return agentDb.createAgent(input)
  }

  async updateAgent(
    id: string,
    updates: Parameters<IAgentRecouvrementRepository['updateAgent']>[1],
    updatedBy: string
  ) {
    return agentDb.updateAgent(id, updates, updatedBy)
  }

  async deactivateAgent(id: string, updatedBy: string) {
    return agentDb.deactivateAgent(id, updatedBy)
  }

  async reactivateAgent(id: string, updatedBy: string) {
    return agentDb.reactivateAgent(id, updatedBy)
  }

  async deleteAgent(id: string) {
    return agentDb.deleteAgent(id)
  }

  async getAgentsActifs() {
    return agentDb.getAgentsActifs()
  }
}
