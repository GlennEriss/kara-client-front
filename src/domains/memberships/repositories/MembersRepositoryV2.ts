/**
 * Repository V2 pour les membres (users)
 *
 * Étape de transition : on s'appuie sur les fonctions existantes de `member.db.ts`
 * pour ne pas dupliquer toute la logique Firestore. On pourra, dans un second temps,
 * déplacer cette logique dans ce repository si nécessaire.
 */

import type { UserFilters } from '@/types/types'
import type { PaginatedMembers } from '@/db/member.db'
import { getMembers } from '@/db/member.db'
import type { DocumentSnapshot } from 'firebase/firestore'

export class MembersRepositoryV2 {
  private static instance: MembersRepositoryV2

  private constructor() {}

  static getInstance(): MembersRepositoryV2 {
    if (!MembersRepositoryV2.instance) {
      MembersRepositoryV2.instance = new MembersRepositoryV2()
    }
    return MembersRepositoryV2.instance
  }

  async getAll(
    filters: UserFilters = {},
    page: number = 1,
    limit: number = 12,
    cursor?: DocumentSnapshot | null,
  ): Promise<PaginatedMembers> {
    // Délègue à l'implémentation existante pour limiter le risque
    // Si un curseur est fourni, on l'utilise pour la pagination
    return getMembers(filters, page, limit, cursor || undefined)
  }
}
