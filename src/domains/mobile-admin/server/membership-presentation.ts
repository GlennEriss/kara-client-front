import { MembershipStatsService } from '@/domains/memberships/services/MembershipStatsService'
import type { AdminServices } from './context'

/** Données des cartes du site, indépendantes de la page et des filtres actifs. */
export function membershipOverview(key: string, rows: Record<string, any>[]) {
  if (key === 'members') {
    const stats = MembershipStatsService.calculateStatsFromMembers(rows as any)
    return {
      total: stats.total,
      active: stats.active,
      expired: stats.expired,
      noSub: stats.noSub,
      men: stats.men,
      women: stats.women,
    }
  }
  if (key === 'member-requests') {
    const count = (status: string) =>
      rows.filter((r) => r.status === status).length
    const pending = count('pending'),
      underReview = count('under_review')
    const paid = rows.filter((r) => r.isPaid).length
    return {
      total: rows.length,
      pending,
      underReview,
      toProcess: pending + underReview,
      approved: count('approved'),
      rejected: count('rejected'),
      paid,
      unpaid: rows.length - paid,
    }
  }
  if (key === 'birthdays')
    return {
      total: rows.length,
      today: rows.filter((r) => r.daysUntil === 0).length,
      week: rows.filter((r) => r.daysUntil >= 1 && r.daysUntil <= 7).length,
      upcoming: rows.filter((r) => r.daysUntil >= 8 && r.daysUntil <= 30)
        .length,
      recent: rows.filter((r) => r.daysUntil >= 358).length,
    }
}
export async function membershipCardRows(
  services: AdminServices,
  key: string,
  rows: Record<string, any>[],
): Promise<Record<string, any>[]> {
  if (key === 'members') {
    const stars = await services.charityStars.getMemberStarsMany(
      rows.map((r) => r.id),
    )
    return rows.map((r) => ({
      ...r,
      charityStars: stars.get(r.id)?.stars ?? 0,
    }))
  }
  if (key === 'member-requests') {
    const names = new Map<string, Promise<string>>()
    for (const row of rows)
      for (const id of [row.approvedBy, row.processedBy].filter(Boolean))
        if (!names.has(id))
          names.set(
            id,
            services.db
              .collection('users')
              .doc(id)
              .get()
              .then((s) => {
                const data = s.data()
                return (
                  [data?.firstName, data?.lastName].filter(Boolean).join(' ') ||
                  id
                )
              }),
          )
    return Promise.all(
      rows.map(async (r) => ({
        ...r,
        ...(r.approvedBy
          ? { approvedByName: await names.get(r.approvedBy) }
          : {}),
        ...(r.processedBy
          ? { processedByName: await names.get(r.processedBy) }
          : {}),
      })),
    )
  }
  return rows
}

export async function memberRecentForm(
  services: AdminServices,
  memberId: string,
  groups: { key: string; items: any[] }[],
) {
  const { buildCompleteMemberFormSummary } =
    await import('@/domains/community/member-form/services/member-form.builders')
  const { withBusinessDates, businessWallTime } =
    await import('@/domains/mobile/server/calendar-dates')
  const { fromFirestore } =
    await import('@/domains/mobile/server/calendar-service')
  const read = async (path: string, creditId?: string) => {
    const col = services.db.collection(path),
      snap = await (
        creditId ? col.where('creditId', '==', creditId) : col
      ).get()
    return snap.docs.map((d) =>
      withBusinessDates({ ...(fromFirestore(d.data()) as object), id: d.id }),
    )
  }
  const cs = groups.find((g) => g.key === 'contracts-cs')?.items || [],
    ci = groups.find((g) => g.key === 'contracts-ci')?.items || [],
    credits = groups.find((g) => g.key === 'contracts-credit')?.items || []
  const [caisseSpeciale, caisseImprevue, creditSources] = await Promise.all([
    Promise.all(
      cs.map(async (c) => ({
        contract: withBusinessDates(c),
        payments: await read(`caisseContracts/${c.id}/payments`),
      })),
    ),
    Promise.all(
      ci.map(async (c) => ({
        contract: withBusinessDates(c),
        payments: await read(`contractsCI/${c.id}/payments`),
      })),
    ),
    Promise.all(
      credits.map(async (c) => ({
        contract: withBusinessDates(c),
        payments: await read('creditPayments', c.id),
      })),
    ),
  ])
  return buildCompleteMemberFormSummary({
    memberId,
    caisseSpeciale,
    caisseImprevue,
    credits: creditSources,
    now: businessWallTime(new Date()),
  } as any)
}
