import { NextResponse, type NextRequest } from 'next/server'
import { canWithAccess } from '@/domains/auth/access-policy'
import {
  mobileJson,
  requireMobileCaller,
  type MobileCaller,
} from '@/domains/mobile/server/access'
import { adminFirestore } from '@/firebase/adminFirestore'
import { createServerFirestorePort } from '@/domains/finance/server/firestore-port'
import { createMemberOverviewRepository } from '@/domains/dashboard/member-overview/repositories/MemberOverviewRepository'
import { MemberOverviewAggregationService } from '@/domains/dashboard/member-overview/services/MemberOverviewAggregationService'
import type { IMemberOverviewRepository } from '@/domains/dashboard/member-overview/repositories/IMemberOverviewRepository'
import type { MemberOverviewModuleKey } from '@/domains/dashboard/member-overview/entities/member-overview.types'

const prefixes: Record<MemberOverviewModuleKey, string> = {
  caisseSpeciale: 'caisseSpeciale',
  caisseImprevue: 'caisseImprevue',
  creditSpeciale: 'creditSpeciale',
  creditFixe: 'creditFixe',
  creditAide: 'creditAide',
  placement: 'placements',
  charite: 'bienfaiteur',
}

export function scopedOverviewRepository(
  repository: IMemberOverviewRepository,
  allowed: (key: MemberOverviewModuleKey) => boolean,
): IMemberOverviewRepository {
  const creditModule = (type: string): MemberOverviewModuleKey =>
    type === 'FIXE'
      ? 'creditFixe'
      : type === 'AIDE'
        ? 'creditAide'
        : 'creditSpeciale'
  return {
    getMemberById: (id) => repository.getMemberById(id),
    getCaisseSpecialeDemands: (id, limit) =>
      allowed('caisseSpeciale')
        ? repository.getCaisseSpecialeDemands(id, limit)
        : Promise.resolve([]),
    getCaisseSpecialeContracts: (id, limit) =>
      allowed('caisseSpeciale')
        ? repository.getCaisseSpecialeContracts(id, limit)
        : Promise.resolve([]),
    getCaisseImprevueDemands: (id, limit) =>
      allowed('caisseImprevue')
        ? repository.getCaisseImprevueDemands(id, limit)
        : Promise.resolve([]),
    getCaisseImprevueContracts: (id, limit) =>
      allowed('caisseImprevue')
        ? repository.getCaisseImprevueContracts(id, limit)
        : Promise.resolve([]),
    getCreditDemands: (id, type, limit) =>
      allowed(creditModule(type))
        ? repository.getCreditDemands(id, type, limit)
        : Promise.resolve([]),
    getCreditContracts: (id, type, limit) =>
      allowed(creditModule(type))
        ? repository.getCreditContracts(id, type, limit)
        : Promise.resolve([]),
    getPlacementDemands: (id, limit) =>
      allowed('placement')
        ? repository.getPlacementDemands(id, limit)
        : Promise.resolve([]),
    getPlacements: (id, limit) =>
      allowed('placement')
        ? repository.getPlacements(id, limit)
        : Promise.resolve([]),
    getCharityDeclarations: (id, limit) =>
      allowed('charite')
        ? repository.getCharityDeclarations(id, limit)
        : Promise.resolve([]),
    getCharityContributions: (id, limit) =>
      allowed('charite')
        ? repository.getCharityContributions(id, limit)
        : Promise.resolve([]),
    countClosedContracts: (id, module) =>
      allowed(module)
        ? repository.countClosedContracts(id, module)
        : Promise.resolve(0),
  }
}

export async function mobileMemberOverview(
  repository: IMemberOverviewRepository,
  caller: MobileCaller,
  id: string,
) {
  const allowed = (key: MemberOverviewModuleKey) =>
    caller.access.restrictedRole !== 'AgentRecouvrement' &&
    canWithAccess(caller.access, `${prefixes[key]}.view`)
  const data = await MemberOverviewAggregationService.withRepository(
    scopedOverviewRepository(repository, allowed),
  ).getMemberOverview(id)
  for (const key of Object.keys(data.modules) as MemberOverviewModuleKey[]) {
    data.modules[key].available = allowed(key)
    if (!allowed(key)) {
      delete data.modules[key].closedContrats
      delete data.modules[key].closedContracts
    }
  }
  return data
}

export async function getMobileMemberOverview(
  request: NextRequest,
  id: string,
) {
  const caller = await requireMobileCaller(request)
  if (caller instanceof NextResponse) return caller
  if (
    caller.mustChangePassword ||
    !canWithAccess(caller.access, 'members.view')
  )
    return mobileJson({ error: 'Accès à la vue membre refusé.' }, 403)
  if (
    !id ||
    id.length > 150 ||
    id.includes('/') ||
    Array.from(id).some((character) => character.charCodeAt(0) < 32)
  )
    return mobileJson({ error: 'Identifiant membre invalide.' }, 422)
  if (!adminFirestore)
    return mobileJson({ error: 'Service indisponible.' }, 503)
  try {
    const repository = createMemberOverviewRepository(
      createServerFirestorePort(adminFirestore),
    ).MemberOverviewRepository.getInstance()
    const data = await mobileMemberOverview(repository, caller, id)
    if (!data.member) return mobileJson({ error: 'Membre introuvable.' }, 404)
    return mobileJson(data)
  } catch {
    return mobileJson(
      { error: 'Impossible de charger la vue consolidée. Réessayez.' },
      503,
    )
  }
}
