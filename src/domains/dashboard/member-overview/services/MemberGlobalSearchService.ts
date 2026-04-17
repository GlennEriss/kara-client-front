/* eslint-disable no-restricted-imports */
import { getMembersAlgoliaSearchService } from '@/services/search/MembersAlgoliaSearchService'
import type { MemberGlobalSearchItem } from '../entities/member-overview.types'

export class MemberGlobalSearchService {
  private static instance: MemberGlobalSearchService

  private constructor() {}

  static getInstance(): MemberGlobalSearchService {
    if (!MemberGlobalSearchService.instance) {
      MemberGlobalSearchService.instance = new MemberGlobalSearchService()
    }
    return MemberGlobalSearchService.instance
  }

  async searchMembers(query: string, limit = 8): Promise<MemberGlobalSearchItem[]> {
    const trimmed = query.trim()
    if (trimmed.length < 2) return []

    const service = getMembersAlgoliaSearchService()
    if (!service.isAvailable()) return []

    const result = await service.search({
      query: trimmed,
      page: 1,
      hitsPerPage: Math.max(1, Math.min(limit, 20)),
      sortBy: 'created_desc',
    })

    return result.items.map((member) => ({
      id: member.id,
      firstName: member.firstName,
      lastName: member.lastName,
      matricule: member.matricule,
      contacts: member.contacts,
      photoURL: member.photoURL,
    }))
  }
}
