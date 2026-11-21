// Source métier : kara-members-front/features/groups/server/groupRepository.ts
import type { Firestore, DocumentData } from 'firebase-admin/firestore'
import { PROJECT_KINDS, PROJECT_STATUSES } from '../types/group'
import { withMyPayouts } from './payouts'
import { myGroupAgreements } from './agreements'
import { withMyContributions } from './contributions'
import { withMyProjectCredits } from './projectCredits'
import type {
  MemberGroupDetail,
  MemberGroupSummary,
  MemberProject,
} from '../types/group'

const text = (value: unknown): string =>
  typeof value === 'string' ? value : ''
const strings = (value: unknown): string[] =>
  Array.isArray(value)
    ? [
        ...new Set(
          value.filter((v): v is string => typeof v === 'string' && !!v),
        ),
      ]
    : []
const validId = (value: string) =>
  !!value && !value.includes('/') && value !== '.' && value !== '..'

function payoutOrderOf(
  project: DocumentData,
  ids: string[],
  viewerIds: Set<string>,
): Pick<MemberProject, 'payoutOrder' | 'payoutOrderNeedsRedraw'> {
  if (!['TONTINE', 'OTHER'].includes(project.kind)) return {}
  const history: DocumentData[] = Array.isArray(project.payoutDraws)
    ? project.payoutDraws.filter(
        (d: unknown) => d !== null && typeof d === 'object',
      )
    : []
  const draw = history.find((d) => d.id === project.payoutOrderDrawId)
  const order =
    draw && Array.isArray(draw.participantIds) ? draw.participantIds : []
  const valid =
    draw &&
    order.length >= 2 &&
    order.length === ids.length &&
    new Set(order).size === order.length &&
    order.every((id: unknown) => typeof id === 'string' && ids.includes(id))
  if (!valid) return { payoutOrderNeedsRedraw: history.length > 0 }
  const date =
    typeof draw.drawnAt?.toDate === 'function'
      ? draw.drawnAt.toDate()
      : new Date(draw.drawnAt)
  return {
    payoutOrderNeedsRedraw: false,
    payoutOrder: {
      participants: order.map((id: string) => ({
        id,
        name:
          text(draw.participantNames?.[id]) ||
          text(project.participantNames?.[id]) ||
          'Membre',
        isMe: viewerIds.has(id),
      })),
      drawnAt: Number.isNaN(date.getTime()) ? undefined : date.toISOString(),
    },
  }
}

async function membership(db: Firestore, uid: string) {
  // Always resolve identity from the verified session. Never accept a member ID
  // or group membership sent by the browser.
  const snapshot = await db.collection('users').doc(uid).get()
  const data = snapshot.data() ?? {}
  return {
    groupIds: strings(data.groupIds).filter(validId),
    viewerIds: new Set([uid, text(data.matricule)].filter(Boolean)),
  }
}

function projectsOf(
  data: DocumentData,
  viewerIds: Set<string>,
): MemberProject[] {
  if (!Array.isArray(data.projects)) return []
  return data.projects
    .filter(
      (p): p is DocumentData =>
        p !== null && typeof p === 'object' && !!text(p.id),
    )
    .map((p) => {
      const ids = strings(p.participantIds)
      return {
        id: p.id,
        name: text(p.name) || 'Projet collectif',
        kind: Object.hasOwn(PROJECT_KINDS, p.kind) ? p.kind : 'OTHER',
        status: Object.hasOwn(PROJECT_STATUSES, p.status)
          ? p.status
          : 'PLANNED',
        description: text(p.description),
        estimatedBudget:
          typeof p.estimatedBudget === 'number' &&
          Number.isFinite(p.estimatedBudget) &&
          p.estimatedBudget >= 0
            ? p.estimatedBudget
            : undefined,
        targetDate: /^\d{4}-\d{2}-\d{2}$/.test(text(p.targetDate))
          ? p.targetDate
          : undefined,
        participants: ids.map((id) => ({
          id,
          name: text(p.participantNames?.[id]) || 'Membre',
          isMe: viewerIds.has(id),
        })),
        isParticipant: ids.some((id) => viewerIds.has(id)),
        ...payoutOrderOf(p, ids, viewerIds),
      }
    })
}

function summary(
  id: string,
  data: DocumentData,
  projects: MemberProject[],
  memberCount: number,
): MemberGroupSummary {
  return {
    id,
    name: text(data.name) || text(data.label) || 'Groupe',
    label: text(data.label) || undefined,
    description: text(data.description),
    coordinatorName: text(data.coordinatorName) || undefined,
    guarantorName: text(data.guarantorName) || undefined,
    memberCount,
    projectCount: projects.length,
    openProjectCount: projects.filter(
      (p) => p.status === 'PLANNED' || p.status === 'ACTIVE',
    ).length,
    myProjectCount: projects.filter((p) => p.isParticipant).length,
  }
}

export async function listMemberGroups(
  db: Firestore,
  uid: string,
): Promise<MemberGroupSummary[]> {
  const { groupIds, viewerIds } = await membership(db, uid)
  const groups: MemberGroupSummary[] = []
  // Bounded batches; no scan of the groups collection or entire member directory.
  for (let start = 0; start < groupIds.length; start += 20) {
    const batch = await Promise.all(
      groupIds.slice(start, start + 20).map(async (id) => {
        const doc = await db.collection('groups').doc(id).get()
        if (!doc.exists) return null
        const data = doc.data()!
        const count = await db
          .collection('users')
          .where('groupIds', 'array-contains', id)
          .count()
          .get()
        return summary(
          id,
          data,
          projectsOf(data, viewerIds),
          count.data().count,
        )
      }),
    )
    groups.push(...batch.filter((g): g is MemberGroupSummary => g !== null))
  }
  return groups.sort((a, b) => a.name.localeCompare(b.name, 'fr'))
}

export async function getMemberGroup(
  db: Firestore,
  uid: string,
  groupId: string,
): Promise<MemberGroupDetail | null> {
  if (!validId(groupId)) return null
  const { groupIds, viewerIds } = await membership(db, uid)
  // Check membership before reading the group or its participants.
  if (!groupIds.includes(groupId)) return null
  const doc = await db.collection('groups').doc(groupId).get()
  if (!doc.exists) return null
  const data = doc.data()!
  const memberDocs = await db
    .collection('users')
    .where('groupIds', 'array-contains', groupId)
    .select('firstName', 'lastName', 'matricule')
    .get()
  const members = memberDocs.docs
    .map((member) => {
      const user = member.data()
      return {
        id: member.id,
        name:
          [text(user.firstName), text(user.lastName)]
            .filter(Boolean)
            .join(' ') || 'Membre',
        isMe: viewerIds.has(member.id) || viewerIds.has(text(user.matricule)),
        isCoordinator: member.id === data.coordinatorId,
      }
    })
    .sort(
      (a, b) =>
        Number(b.isCoordinator) - Number(a.isCoordinator) ||
        a.name.localeCompare(b.name, 'fr'),
    )
  const financedProjects = await withMyProjectCredits(
    db,
    projectsOf(data, viewerIds),
    groupId,
    viewerIds,
  )
  const contributedProjects = await withMyContributions(
    db,
    financedProjects,
    Array.isArray(data.projects) ? data.projects : [],
    groupId,
    viewerIds,
  )
  const projects = await withMyPayouts(
    db,
    contributedProjects,
    Array.isArray(data.projects) ? data.projects : [],
    groupId,
    viewerIds,
  )
  const agreements = await myGroupAgreements(db, groupId, viewerIds)
  // Explicit DTO: no audit history, private contacts, other members' finances
  // or arbitrary future admin fields are returned to the member application.
  return {
    ...summary(groupId, data, projects, members.length),
    members,
    projects,
    agreements,
  }
}
