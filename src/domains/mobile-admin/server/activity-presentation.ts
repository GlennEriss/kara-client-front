import { mapWithConcurrency } from '@/utils/mapWithConcurrency'
import { prospectPhase, daysToExpiry, type InsuranceProspect } from '@/domains/insurance-prospects/model'
import { roundFcfa, sumCommissionAmounts } from '@/utils/placementMoney'
import type { AdminServices } from './context'
type Row = Record<string, any>
export function placementSummary(
  row: Row,
  commissions: Row[],
  now = new Date(),
) {
  const payable = commissions.filter((c) => c.status !== 'Canceled'),
    paid = payable.filter((c) => c.status === 'Paid'),
    due = payable.filter((c) => c.status !== 'Paid')
  return {
    ...row,
    placementView: {
      paidCount: paid.length,
      totalCount: payable.length,
      paidAmount: sumCommissionAmounts(paid as any),
      commissionTotal: sumCommissionAmounts(payable as any),
      dueCount: due.length,
      nextId: due.find((c) => c.status === 'Due')?.id || null,
      nextAmount: due.find((c) => c.status === 'Due')?.amount || 0,
      overdueCount: due.filter((c) => new Date(c.dueDate) < now).length,
      nextDate: row.nextCommissionDate || due[0]?.dueDate || null,
      progress: payable.length
        ? Math.round((paid.length / payable.length) * 100)
        : 0,
      remainingCommission: due.reduce(
        (s, c) =>
          s + Math.max(0, roundFcfa(c.amount) - roundFcfa(c.paidAmount || 0)),
        0,
      ),
    },
  }
}
export async function activityRows(
  services: AdminServices,
  module: string,
  dataset: string,
  rows: Row[],
) {
  if (!['placements', 'vehicles'].includes(module)) return rows
  const members = new Map<string, Promise<any>>()
  const memberFor = (id: string) => {
    if (!members.has(id)) members.set(id, services.members.getMemberById(id))
    return members.get(id)!
  }
  const actors = new Map<string, Promise<any>>()
  const actorFor = (id: string) => {
    if (!actors.has(id)) actors.set(id, services.admins.getAdminById(id))
    return actors.get(id)!
  }
  return mapWithConcurrency(rows, 6, async (row) => {
    if (module === 'vehicles' && dataset === 'prospects')
      return { ...row, phase: prospectPhase(row as InsuranceProspect), daysUntil: daysToExpiry(row.endDate), displayName: row.plateNumber }
    if (module === 'vehicles' && dataset === 'rewards')
      return {
        ...row,
        receivedCommission: row.partnerReceipt?.amount || 0,
        karaAmount: row.partnerReceipt
          ? row.partnerReceipt.amount - Number(row.memberAmount || 0)
          : 0,
      }
    if (module === 'vehicles' && dataset === 'insurance')
      return {
        ...row,
        ...JSON.parse(
          JSON.stringify((await services.vehicles.getById(row.id)) || {}),
        ),
      }
    if (module !== 'placements') return row
    const [member, commissions] = await Promise.all([
      row.benefactorId ? memberFor(row.benefactorId) : null,
      dataset === 'contracts'
        ? services.placementService.listCommissions(row.id)
        : [],
    ])
    const actorNames: Row = {}
    for (const key of [
      'decisionMadeBy',
      'reopenedBy',
      'createdBy',
      'updatedBy',
    ])
      if (typeof row[key] === 'string' && !row[key + 'Name']) {
        const actor = await actorFor(row[key])
        if (actor)
          actorNames[key + 'Name'] = [actor.firstName, actor.lastName]
            .filter(Boolean)
            .join(' ')
      }
    const result = {
      ...row,
      ...actorNames,
      benefactorName:
        row.benefactorName ||
        [member?.firstName, member?.lastName].filter(Boolean).join(' '),
      benefactorContacts:
        member?.contacts || [row.benefactorPhone].filter(Boolean),
      benefactorEmail: member?.email || null,
      photoURL: member?.photoURL || null,
    }
    return dataset === 'contracts'
      ? placementSummary(result, commissions)
      : result
  })
}
export function activityMatches(row: Row, input: Row, module: string) {
  if (module === 'vehicles' && row.source && row.endDate) {
    if (input.nextFrom && row.endDate < input.nextFrom) return false
    if (input.nextTo && row.endDate > input.nextTo) return false
  }
  if (
    module === 'vehicles' &&
    input.declarationView &&
    (input.declarationView === 'pending'
      ? row.declarationStatus !== 'pending'
      : ['pending', 'rejected', 'draft'].includes(row.declarationStatus))
  )
    return false
  if (module === 'placements') {
    if (input.payoutMode && row.payoutMode !== input.payoutMode) return false
    if (
      input.contractState &&
      Boolean(row.contractDocumentId) !== (input.contractState === 'present')
    )
      return false
    if (input.durationRange === 'short' && Number(row.periodMonths) > 3)
      return false
    if (input.durationRange === 'long' && Number(row.periodMonths) < 4)
      return false
    if (
      (input.overdue === 'true' || input.commissionMonth) &&
      row.status !== 'Active'
    )
      return false
    if (input.overdue === 'true' && !row.placementView?.overdueCount)
      return false
    if (
      input.commissionMonth &&
      !String(row.placementView?.nextDate || '').startsWith(
        input.commissionMonth,
      )
    )
      return false
    if (
      input.nextFrom &&
      String(row.placementView?.nextDate || '').slice(0, 10) < input.nextFrom
    )
      return false
    if (
      input.nextTo &&
      (!row.placementView?.nextDate ||
        String(row.placementView.nextDate).slice(0, 10) > input.nextTo)
    )
      return false
  }
  if (
    input.minAmount != null &&
    Number(row.amount ?? row.premiumAmount ?? row.totalCollectedAmount ?? 0) <
      Number(input.minAmount)
  )
    return false
  if (
    input.maxAmount != null &&
    Number(row.amount ?? row.premiumAmount ?? row.totalCollectedAmount ?? 0) >
      Number(input.maxAmount)
  )
    return false
  return true
}
export function sortActivities(rows: Row[], sort: string) {
  if (sort === 'amountDesc')
    return rows.sort(
      (a, b) =>
        Number(b.amount || b.premiumAmount || 0) -
        Number(a.amount || a.premiumAmount || 0),
    )
  if (sort === 'amountAsc')
    return rows.sort(
      (a, b) =>
        Number(a.amount || a.premiumAmount || 0) -
        Number(b.amount || b.premiumAmount || 0),
    )
  if (sort === 'nextDate')
    return rows.sort((a, b) =>
      String(a.placementView?.nextDate || '9999').localeCompare(
        String(b.placementView?.nextDate || '9999'),
      ),
    )
  if (sort === 'nameAsc' || sort === 'nameDesc')
    return rows.sort(
      (a, b) =>
        [
          a.memberLastName,
          a.nonMemberLastName,
          a.benefactorName,
          a.title,
          a.name,
        ]
          .filter(Boolean)
          .join(' ')
          .localeCompare(
            [
              b.memberLastName,
              b.nonMemberLastName,
              b.benefactorName,
              b.title,
              b.name,
            ]
              .filter(Boolean)
              .join(' '),
            'fr',
          ) * (sort === 'nameDesc' ? -1 : 1),
    )
  return rows
}
export function activityInsights(module: string, dataset: string, rows: Row[]) {
  const groups: {
    title: string
    money?: boolean
    items: { label: string; value: number }[]
  }[] = []
  const upcoming: { id: string; label: string; date: string }[] = []
  if (module === 'placements' && dataset === 'contracts') {
    groups.push({
      title: 'Répartition par mode',
      items: [
        {
          label: 'Mensuel',
          value: rows.filter(
            (r) => r.payoutMode === 'MonthlyCommission_CapitalEnd',
          ).length,
        },
        {
          label: 'Final',
          value: rows.filter(
            (r) => r.payoutMode === 'CapitalPlusCommission_End',
          ).length,
        },
      ],
    })
    const benefactors = new Map<string, { label: string; value: number }>()
    for (const r of rows) {
      const key = r.benefactorId || r.benefactorName
      const previous = benefactors.get(key)
      benefactors.set(key, {
        label: r.benefactorName || key,
        value: (previous?.value || 0) + Number(r.amount || 0),
      })
    }
    groups.push({
      title: 'Principaux bienfaiteurs',
      money: true,
      items: [...benefactors.values()]
        .sort((a, b) => b.value - a.value)
        .slice(0, 5),
    })
  }
  if (module === 'vehicles' && dataset === 'insurance') {
    const valid = rows.filter(
        (r) => !r.declarationStatus || r.declarationStatus === 'validated',
      ),
      companies = new Map<string, number>()
    for (const r of valid)
      companies.set(
        r.insuranceCompany,
        (companies.get(r.insuranceCompany) || 0) + 1,
      )
    groups.push({
      title: 'Répartition par assurance',
      items: [...companies].map(([label, value]) => ({ label, value })),
    })
    upcoming.push(
      ...valid
        .filter((r) => r.status === 'expires_soon')
        .sort((a, b) => String(a.endDate).localeCompare(String(b.endDate)))
        .slice(0, 5)
        .map((r) => ({
          id: r.id,
          label: [
            r.memberFirstName || r.nonMemberFirstName,
            r.memberLastName || r.nonMemberLastName,
            r.plateNumber,
          ]
            .filter(Boolean)
            .join(' '),
          date: r.endDate,
        })),
    )
  }
  if (module === 'bienfaiteur')
    upcoming.push(
      ...rows
        .filter(
          (r) => r.status === 'upcoming' && new Date(r.startDate) >= new Date(),
        )
        .sort((a, b) => String(a.startDate).localeCompare(String(b.startDate)))
        .slice(0, 1)
        .map((r) => ({ id: r.id, label: r.title, date: r.startDate })),
    )
  return { groups, upcoming }
}

export function validateActivityQuery(input: Row) {
  for (const key of ['from', 'to', 'nextFrom', 'nextTo'])
    if (input[key]) {
      const d = new Date(input[key] + 'T12:00:00Z')
      if (
        !Number.isFinite(d.getTime()) ||
        d.toISOString().slice(0, 10) !== input[key]
      )
        throw Error('Choisissez des dates valides.')
    }
  for (const [from, to] of [
    ['from', 'to'],
    ['nextFrom', 'nextTo'],
  ])
    if (input[from] && input[to] && input[from] > input[to])
      throw Error('La date de début doit précéder la date de fin.')
  if (
    input.minAmount != null &&
    input.maxAmount != null &&
    input.minAmount > input.maxAmount
  )
    throw Error('Le montant minimum doit être inférieur au maximum.')
}
