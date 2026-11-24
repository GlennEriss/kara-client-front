import type { Firestore } from 'firebase-admin/firestore'
import { FieldValue } from 'firebase-admin/firestore'
import { z } from 'zod'
import type { MemberCaller, MemberData } from './access'
import {
  iso,
  MemberError,
  memberIdentifier,
  memberIds,
  ownedRows,
} from './data'
import { operationIdSchema } from './finance-actions'
import { computeCharityStars, MAX_CHARITY_STARS } from './charity-stars'
const text = (v: unknown) => (typeof v === 'string' ? v : '')
const amount = (v: unknown) => (Number.isFinite(Number(v)) ? Number(v) : 0)
const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((v) => {
    const d = new Date(v + 'T12:00:00Z')
    return Number.isFinite(d.getTime()) && d.toISOString().slice(0, 10) === v
  }, 'Date invalide.')
export const placementDemandSchema = z
  .object({
    amount: z.number().finite().min(50000).max(1e9),
    rate: z.number().finite().min(0).max(100),
    periodMonths: z.number().int().min(1).max(7),
    payoutMode: z.enum([
      'MonthlyCommission_CapitalEnd',
      'CapitalPlusCommission_End',
    ]),
    desiredDate: date,
    cause: z.string().trim().max(500).optional(),
  })
  .strict()
export const charityIntentSchema = z
  .object({
    eventId: z.string().refine(memberIdentifier),
    contributionType: z.enum(['money', 'in_kind']),
    amount: z.number().finite().min(100).max(1e9).optional(),
    inKindDescription: z.string().trim().max(500).optional(),
    estimatedValue: z.number().finite().min(0).max(1e9).optional(),
    notes: z.string().trim().max(500).optional(),
  })
  .strict()
  .superRefine((p, c) => {
    if (p.contributionType === 'money' && p.amount == null)
      c.addIssue({
        code: 'custom',
        message: 'Indiquez le montant de votre contribution.',
      })
    if (
      p.contributionType === 'in_kind' &&
      (!p.inKindDescription || p.inKindDescription.length < 3)
    )
      c.addIssue({
        code: 'custom',
        message: 'Décrivez votre contribution en nature.',
      })
  })
const placement = (p: MemberData) => ({
  id: p.id,
  status: text(p.status),
  amount: amount(p.amount),
  rate: amount(p.rate),
  periodMonths: amount(p.periodMonths),
  payoutMode: text(p.payoutMode),
  startDate: iso(p.startDate),
  endDate: iso(p.endDate),
  nextCommissionDate: iso(p.nextCommissionDate),
  hasOverdueCommission: p.hasOverdueCommission === true,
  handoverDate: iso(p.handoverDate),
  closingReason: text(p.closingReason),
  createdAt: iso(p.createdAt),
})
export async function memberPlacements(db: Firestore, caller: MemberCaller) {
  const [items, demands] = await Promise.all([
    ownedRows(db, 'placements', 'benefactorId', caller),
    ownedRows(db, 'placementDemands', 'benefactorId', caller),
  ])
  const recent = (rows: MemberData[]) =>
    rows.sort((a, b) => iso(b.createdAt).localeCompare(iso(a.createdAt)))
  return {
    items: recent(items).map(placement),
    demands: recent(demands).map((d) => ({
      ...placement(d),
      desiredDate: text(d.desiredDate),
      cause: text(d.cause),
      decisionReason: text(d.decisionReason),
      placementId: text(d.placementId),
    })),
  }
}
const visibleEvent = (e: MemberData) =>
  e.isPublic === true && ['upcoming', 'ongoing', 'closed'].includes(e.status)
const eventDTO = (e: MemberData) => ({
  id: e.id,
  title: text(e.title),
  description: text(e.description),
  location: text(e.location),
  startDate: iso(e.startDate),
  endDate: iso(e.endDate),
  minContributionAmount: amount(e.minContributionAmount),
  targetAmount: amount(e.targetAmount),
  currency: text(e.currency) || 'FCFA',
  coverPhotoUrl: text(e.coverPhotoUrl),
  status: text(e.status),
  totalCollectedAmount: amount(e.totalCollectedAmount),
  totalContributionsCount: amount(e.totalContributionsCount),
  totalParticipantsCount: amount(e.totalParticipantsCount),
  canContribute: ['upcoming', 'ongoing'].includes(e.status),
})
function contributionDTO(
  c: MemberData,
  event: MemberData,
  kind: 'actual' | 'intent',
  fileId = '',
) {
  return {
    id: `${kind}:${event.id}:${c.id}`,
    eventId: event.id,
    eventTitle: text(event.title) || 'Œuvre de charité',
    eventDate: iso(event.startDate),
    eventEndDate: iso(event.endDate),
    eventLocation: text(event.location),
    contributionType: text(c.contributionType) || 'money',
    date: iso(c.contributionDate || c.createdAt),
    amount: amount(c.payment?.amount ?? c.amount),
    inKindDescription: text(c.inKindDescription),
    estimatedValue: amount(c.estimatedValue),
    notes: text(c.notes),
    status: kind === 'actual' ? text(c.status) || 'pending' : 'pending',
    file:
      c.receiptUrl && fileId ? { kind: 'charity' as const, id: fileId } : null,
  }
}
export async function ownedCharityContributions(db: Firestore, caller: MemberCaller) {
  const participants = await Promise.all(
      memberIds(caller).map((id) =>
        db
          .collectionGroup('participants')
          .where('memberId', '==', id)
          .where('participantType', '==', 'member')
          .get(),
      ),
    )
  const ownedParticipants = [
    ...new Map(
      participants
        .flatMap((s) => s.docs)
        .filter((d) =>
          /^charity-events\/[^/]+\/participants\/[^/]+$/.test(d.ref.path),
        )
        .map((d) => [d.ref.path, d]),
    ).values(),
  ]
  return (await Promise.all(ownedParticipants.map(async p => {
    const eventId = p.ref.path.split('/')[1]
    const snapshot = await db.collection('charity-events').doc(eventId)
      .collection('contributions').where('participantId', '==', p.id).get()
    return snapshot.docs.map(d => ({
      row: { ...d.data(), id: d.id } as MemberData, eventId, participantId: p.id,
    }))
  }))).flat()
}

export async function memberCharity(db: Firestore, caller: MemberCaller) {
  const [eventsSnap, intents, contributions, starsSnap] = await Promise.all([
    db.collection('charity-events').where('isPublic', '==', true).get(),
    ownedRows(db, 'charityContributions', 'participantId', caller),
    ownedCharityContributions(db, caller),
    Promise.all(
      memberIds(caller).map((id) =>
        db.collection('member-charity-summary').doc(id).get(),
      ),
    ),
  ])
  const events = eventsSnap.docs
    .map((d) => ({ ...d.data(), id: d.id }) as MemberData)
    .filter(visibleEvent)
    .sort((a, b) => iso(b.startDate).localeCompare(iso(a.startDate)))
  const eventCache = new Map<string, MemberData>(events.map((e) => [e.id, e]))
  const event = async (id: string) => {
    if (!eventCache.has(id)) {
      const s = await db.collection('charity-events').doc(id).get()
      eventCache.set(id, { ...s.data(), id })
    }
    return eventCache.get(id)!
  }
  const actual = await Promise.all(contributions.map(async ({ row, eventId, participantId }) =>
    contributionDTO(row, await event(eventId), 'actual', `${eventId}:${participantId}:${row.id}`),
  ))
  const pending = await Promise.all(
    intents
      .filter((c) => c.status === 'pending' && memberIdentifier(c.eventId))
      .map(async (c) => contributionDTO(c, await event(c.eventId), 'intent')),
  )
  const raw = starsSnap.find((s) => s.exists)?.data() || {},
    stars = computeCharityStars({
      memberId: caller.matricule,
      starredEvents: raw.starredEvents,
      deductions: raw.starDeductions,
    })
  return {
    events: events.map(eventDTO),
    contributions: [...actual, ...pending].sort((a, b) =>
      b.date.localeCompare(a.date),
    ),
    stars: {
      count: stars.stars,
      max: MAX_CHARITY_STARS,
      isCapped: stars.isCapped,
      nextExpiryAt: iso(stars.nextExpiryAt),
    },
  }
}
export async function memberCharityReceiptSource(
  db: Firestore,
  caller: MemberCaller,
  id: string,
) {
  const parts = id.split(':')
  if (parts.length !== 3 || !parts.every(memberIdentifier))
    throw new MemberError('Document introuvable.', 404)
  const [eventId, participantId, contributionId] = parts,
    ref = db.collection('charity-events').doc(eventId)
  const p = (
    await ref.collection('participants').doc(participantId).get()
  ).data()
  if (
    !p ||
    p.participantType !== 'member' ||
    !memberIds(caller).includes(p.memberId)
  )
    throw new MemberError('Document introuvable.', 404)
  const c = (
    await ref.collection('contributions').doc(contributionId).get()
  ).data()
  if (
    !c ||
    c.participantId !== participantId ||
    typeof c.receiptUrl !== 'string'
  )
    throw new MemberError('Document introuvable.', 404)
  return { url: c.receiptUrl, name: `recu-charite-${contributionId}` }
}
export async function createSolidarityRequest(
  db: Firestore,
  caller: MemberCaller,
  kind: 'placement-demand' | 'charity-intent',
  input: unknown,
  operationId: string,
) {
  if (!operationIdSchema.safeParse(operationId).success)
    throw new MemberError('Référence de demande invalide.')
  const parsed = (
    kind === 'placement-demand' ? placementDemandSchema : charityIntentSchema
  ).safeParse(input)
  if (!parsed.success)
    throw new MemberError(
      parsed.error.issues[0]?.message || 'Demande invalide.',
    )
  const p = parsed.data as MemberData,
    id = `MEMBER_${operationId}`,
    collection =
      kind === 'placement-demand' ? 'placementDemands' : 'charityContributions',
    identity = caller.dossier.identity || {},
    name =
      [identity.firstName, identity.lastName].filter(Boolean).join(' ') ||
      caller.matricule
  return db.runTransaction(async (tx) => {
    const ref = db.collection(collection).doc(id),
      existing = await tx.get(ref)
    if (existing.exists) {
      if (
        !memberIds(caller).includes(
          existing.data()?.benefactorId || existing.data()?.participantId,
        )
      )
        throw new MemberError('Référence de demande indisponible.', 409)
      return { id }
    }
    if (kind === 'charity-intent') {
      const e = (
        await tx.get(db.collection('charity-events').doc(p.eventId))
      ).data()
      if (!e || !visibleEvent(e) || !['upcoming', 'ongoing'].includes(e.status))
        throw new MemberError(
          'Cet événement n’accepte plus de contribution.',
          409,
        )
    }
    const stamp = FieldValue.serverTimestamp()
    tx.set(
      ref,
      kind === 'placement-demand'
        ? {
            ...p,
            benefactorId: caller.matricule,
            benefactorName: name,
            benefactorPhone: identity.contacts?.[0] || null,
            status: 'PENDING',
            createdBy: caller.matricule,
            createdAt: stamp,
            updatedAt: stamp,
          }
        : {
            ...p,
            participantId: caller.matricule,
            participantName: name,
            payment:
              p.contributionType === 'money'
                ? { amount: p.amount, paymentType: 'Charity' }
                : null,
            status: 'pending',
            createdBy: caller.matricule,
            createdAt: stamp,
            updatedAt: stamp,
          },
    )
    tx.set(
      db.collection('notifications').doc(`member-solidarity-${kind}-${id}`),
      {
        module: kind === 'placement-demand' ? 'placement' : 'bienfaiteur',
        type:
          kind === 'placement-demand'
            ? 'placement_demand_created'
            : 'charity_contribution_created',
        entityId: id,
        title:
          kind === 'placement-demand'
            ? 'Nouvelle demande d’apport solidaire'
            : 'Nouvelle déclaration de contribution',
        message: `${name} a transmis une demande à examiner.`,
        isRead: false,
        createdAt: stamp,
        metadata:
          kind === 'placement-demand'
            ? {
                demandId: id,
                benefactorId: caller.matricule,
                status: 'PENDING',
              }
            : {
                contributionId: id,
                eventId: p.eventId,
                participantId: caller.matricule,
                status: 'pending',
              },
      },
    )
    return { id }
  })
}
