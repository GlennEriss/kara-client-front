import { IAgentRecouvrementService } from './IAgentRecouvrementService'
import { IAgentRecouvrementRepository } from '@/repositories/agent-recouvrement/IAgentRecouvrementRepository'
import type { DocumentSnapshot } from '@/firebase/firestore'

export class AgentRecouvrementService implements IAgentRecouvrementService {
  constructor(private repository: IAgentRecouvrementRepository) {}

  async getAgentsWithFilters(
    filters: Parameters<IAgentRecouvrementService['getAgentsWithFilters']>[0],
    page: number,
    itemsPerPage: number,
    cursor?: DocumentSnapshot
  ) {
    return this.repository.getAgentsWithFilters(filters, page, itemsPerPage, cursor)
  }

  async getAgentsAnniversairesMois(
    page: number,
    itemsPerPage: number,
    cursor?: DocumentSnapshot
  ) {
    return this.repository.getAgentsAnniversairesMois(page, itemsPerPage, cursor)
  }

  async getAgentById(id: string) {
    return this.repository.getAgentById(id)
  }

  async getAgentsStats() {
    return this.repository.getAgentsStats()
  }

  async createAgent(input: Parameters<IAgentRecouvrementService['createAgent']>[0]) {
    return this.repository.createAgent(input)
  }

  async updateAgent(
    id: string,
    updates: Parameters<IAgentRecouvrementService['updateAgent']>[1],
    updatedBy: string
  ) {
    return this.repository.updateAgent(id, updates, updatedBy)
  }

  async deactivateAgent(id: string, updatedBy: string) {
    return this.repository.deactivateAgent(id, updatedBy)
  }

  async reactivateAgent(id: string, updatedBy: string) {
    return this.repository.reactivateAgent(id, updatedBy)
  }

  async deleteAgent(id: string) {
    return this.repository.deleteAgent(id)
  }

  async getAgentsActifs() {
    return this.repository.getAgentsActifs()
  }
}
