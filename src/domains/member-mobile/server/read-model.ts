import type { Firestore } from 'firebase-admin/firestore'
import { mobileDateKey } from '@/domains/mobile/contracts'
import type { MemberCaller, MemberData } from './access'
import { iso, ownedRows } from './data'
import { calendarSummary, memberEcheances } from './calendar'
import { isPlacementNotice } from './notifications'
export { iso, ownedRows } from './data'

// Champs et associations issus de kara-members-front : ProfilePayloadV1,
// /api/member/subscriptions et calendrierService. Les documents bruts ne sortent pas de l'API.
const str = (v: unknown) => (typeof v === 'string' ? v : '')
const pick = <K extends string>(
  data: MemberData,
  names: K[],
): Record<K, string> =>
  Object.fromEntries(names.map((key) => [key, str(data[key])])) as Record<
    K,
    string
  >
export function memberProfile(caller: MemberCaller) {
  const d = caller.dossier,
    i = d.identity || {},
    a = d.address || {},
    c = d.company || {},
    docs = d.documents || {}
  return {
    matricule: caller.matricule,
    status: d.status,
    memberNumber: str(d.memberNumber),
    isPaid: d.isPaid === true,
    identity: {
      ...pick(i, [
        'civility',
        'firstName',
        'lastName',
        'birthPlace',
        'nationality',
        'gender',
        'maritalStatus',
        'religion',
        'prayerPlace',
        'email',
        'whatsappNumber',
      ]),
      birthDate: iso(i.birthDate),
      contacts: Array.isArray(i.contacts)
        ? i.contacts.filter((v: unknown) => typeof v === 'string' && v.trim())
        : [],
      hasCar: i.hasCar === true,
      photoURL: str(i.photoURL || i.photo),
    },
    address: pick(a, [
      'province',
      'city',
      'district',
      'arrondissement',
      'additionalInfo',
    ]),
    company: {
      ...pick(c, ['companyName', 'profession', 'seniority']),
      isEmployed: typeof c.isEmployed === 'boolean' ? c.isEmployed : null,
    },
    documents: {
      ...pick(docs, [
        'identityDocument',
        'identityDocumentNumber',
        'issuingPlace',
        'documentPhotoFrontURL',
        'documentPhotoBackURL',
      ]),
      expirationDate: iso(docs.expirationDate),
      issuingDate: iso(docs.issuingDate),
    },
    createdAt: iso(d.createdAt),
    updatedAt: iso(d.updatedAt),
  }
}
export function subscriptionRow(
  d: MemberData,
  payment: MemberData | null,
  now = new Date(),
) {
  const dateStart = iso(d.startDate ?? d.dateStart),
    dateEnd = iso(d.endDate ?? d.dateEnd)
  const amount = payment?.amount ?? d.amount ?? d.montant
  const end = new Date(dateEnd)
  const remainingDays = dateEnd
    ? Math.round(
        (new Date(`${mobileDateKey(end)}T12:00:00Z`).getTime() -
          new Date(`${mobileDateKey(now)}T12:00:00Z`).getTime()) /
          86400000,
      )
    : null
  return {
    id: d.id,
    dateStart,
    dateEnd,
    type: str(d.membershipType ?? d.type),
    amount:
      amount != null && Number.isFinite(Number(amount)) && Number(amount) >= 0
        ? Number(amount)
        : null,
    currency: str(payment?.currency ?? d.currency) || 'XOF',
    paymentDate: iso(payment?.date ?? d.paymentDate),
    paymentMode: str(payment?.mode ?? d.paymentMode),
    adhesionPdfURL: str(d.adhesionPdfURL),
    status: !dateEnd
      ? 'none'
      : end.getTime() > now.getTime()
        ? 'active'
        : 'expired',
    remainingDays,
  }
}
export async function memberSubscriptions(
  db: Firestore,
  caller: MemberCaller,
  now = new Date(),
) {
  const [subs, byBeneficiary, bySource] = await Promise.all([
    ownedRows(db, 'subscriptions', 'userId', caller),
    ownedRows(db, 'payments', 'beneficiaryId', caller),
    ownedRows(db, 'payments', 'sourceId', caller),
  ])
  subs.sort((a, b) =>
    iso(b.dateEnd ?? b.endDate).localeCompare(iso(a.dateEnd ?? a.endDate)),
  )
  const memberPayments = [
    ...new Map([...byBeneficiary, ...bySource].map((p) => [p.id, p])).values(),
  ]
  const used = new Set<string>(),
    rows = []
  for (const sub of subs) {
    const direct = await db
      .collection('payments')
      .where('sourceId', '==', sub.id)
      .limit(5)
      .get()
    const candidates = direct.docs
      .map((d) => ({ ...d.data(), id: d.id }) as MemberData)
      .filter(
        (p) =>
          !p.beneficiaryId ||
          [caller.uid, caller.matricule].includes(p.beneficiaryId),
      )
    let payment =
      candidates.find(
        (p) =>
          p.sourceType === 'Subscription' || p.paymentType === 'Subscription',
      ) ??
      candidates[0] ??
      null
    if (!payment) {
      const start = new Date(iso(sub.startDate ?? sub.dateStart)).getTime()
      const eligible = memberPayments
        .filter(
          (p) =>
            !used.has(p.id) &&
            ['Membership', 'Subscription'].includes(p.paymentType),
        )
        .sort(
          (a, b) =>
            Math.abs(
              new Date(iso(a.date ?? a.recordedAt ?? a.createdAt)).getTime() -
                start,
            ) -
            Math.abs(
              new Date(iso(b.date ?? b.recordedAt ?? b.createdAt)).getTime() -
                start,
            ),
        )
      const nearest = eligible[0]
      if (
        nearest &&
        Math.abs(
          new Date(
            iso(nearest.date ?? nearest.recordedAt ?? nearest.createdAt),
          ).getTime() - start,
        ) <=
          90 * 86400000
      )
        payment = nearest
    }
    if (payment) used.add(payment.id)
    rows.push(subscriptionRow(sub, payment, now))
  }
  return rows
}
export async function memberDashboard(
  db: Firestore,
  caller: MemberCaller,
  now = new Date(),
) {
  const [ci, demands, notifications, subscriptions, echeances] =
    await Promise.all([
      ownedRows(db, 'contractsCI', 'memberId', caller),
      ownedRows(db, 'caisseImprevueDemands', 'memberId', caller),
      ownedRows(db, 'notifications', 'recipientId', caller),
      memberSubscriptions(db, caller, now),
      memberEcheances(db, caller, now),
    ])
  const latestNotifications = notifications.filter(n => !isPlacementNotice(n))
    .sort((a, b) => iso(b.createdAt).localeCompare(iso(a.createdAt)))
    .slice(0, 100)
  const calendar = calendarSummary(echeances, now)
  const today = mobileDateKey(now)
  return {
    activeCIContracts: ci.filter((c) => c.status === 'ACTIVE').length,
    pendingCIDemands: demands.filter((d) => d.status === 'PENDING').length,
    eligibleForSupport: ci.filter(
      (c) => c.isEligibleForSupport && !c.currentSupportId,
    ).length,
    supportsInProgress: ci.filter((c) => c.currentSupportId).length,
    upcomingCount: calendar.thisMonthCount,
    nextEcheances: echeances.filter(row =>
      row.day >= today && row.status !== 'PAID' && row.status !== 'CLOSED',
    ).slice(0, 4).map(({ id, source, contractId, day, label }) => ({ id, source, contractId, day, label })),
    overdueCount: calendar.overdueCount,
    unreadNotifications: latestNotifications.filter((n) => !n.isRead).length,
    subscription:
      subscriptions.find((s) => s.status === 'active') ??
      subscriptions[0] ??
      null,
  }
}
