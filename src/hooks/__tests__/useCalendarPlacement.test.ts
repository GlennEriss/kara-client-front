import {
  buildCapitalRestitutionId,
  groupPlacementScheduleByDay,
  isCapitalRestitution,
  type CalendarCommissionItem,
} from '@/hooks/useCalendarPlacement'
import type { Placement } from '@/types/types'
import { describe, expect, it } from 'vitest'

const placement = {
  id: 'placement-1',
  benefactorId: 'member-1',
  benefactorName: 'NGUEMA Paul',
  amount: 1_000_000,
  rate: 5,
  periodMonths: 3,
  payoutMode: 'MonthlyCommission_CapitalEnd',
  status: 'Active',
  startDate: new Date('2026-09-10T00:00:00'),
  endDate: new Date('2026-11-10T00:00:00'),
  createdAt: new Date('2026-09-01T00:00:00'),
  updatedAt: new Date('2026-09-01T00:00:00'),
  createdBy: 'admin-1',
} satisfies Placement

const baseItem = {
  placementId: placement.id,
  createdAt: placement.createdAt,
  updatedAt: placement.updatedAt,
  createdBy: 'admin-1',
  placement,
  benefactorDisplayName: 'NGUEMA Paul',
  color: 'yellow' as const,
}

const commission = (overrides: Partial<CalendarCommissionItem>): CalendarCommissionItem =>
  ({
    ...baseItem,
    id: 'commission-1',
    dueDate: new Date('2026-11-10T00:00:00'),
    amount: 50_000,
    status: 'Due',
    kind: 'commission',
    ...overrides,
  }) as CalendarCommissionItem

const capitalRestitution = (overrides: Partial<CalendarCommissionItem> = {}): CalendarCommissionItem =>
  ({
    ...baseItem,
    id: buildCapitalRestitutionId(placement.id),
    dueDate: new Date('2026-11-10T00:00:00'),
    amount: 1_000_000,
    status: 'Due',
    kind: 'capital',
    ...overrides,
  }) as CalendarCommissionItem

describe('groupPlacementScheduleByDay', () => {
  const today = new Date('2026-10-01T00:00:00')

  it('additionne la commission et le capital dus le même jour', () => {
    const [day] = groupPlacementScheduleByDay(
      [commission({}), capitalRestitution()],
      today
    )

    // Le 10/11, KARA remet la dernière commission ET le capital.
    expect(day.totalAmount).toBe(1_050_000)
    expect(day.remainingAmount).toBe(1_050_000)
    expect(day.capitalAmount).toBe(1_000_000)
    expect(day.count).toBe(2)
  })

  it('isole la part de capital du total du jour', () => {
    const [day] = groupPlacementScheduleByDay(
      [
        commission({ id: 'commission-1', status: 'Paid', paidAmount: 50_000 }),
        capitalRestitution(),
      ],
      today
    )

    expect(day.paidAmount).toBe(50_000)
    expect(day.remainingAmount).toBe(1_000_000)
    expect(day.capitalAmount).toBe(1_000_000)
  })

  it('n’attribue aucun capital à un jour ne portant que des commissions', () => {
    const [day] = groupPlacementScheduleByDay(
      [commission({ dueDate: new Date('2026-10-10T00:00:00') })],
      today
    )

    expect(day.totalAmount).toBe(50_000)
    expect(day.capitalAmount).toBe(0)
  })

  it('exclut des totaux une commission annulée sans la masquer', () => {
    const [day] = groupPlacementScheduleByDay(
      [
        commission({ id: 'commission-1', status: 'Due' }),
        commission({ id: 'commission-2', status: 'Canceled', amount: 50_000 }),
      ],
      today
    )

    // Seule la commission encore due engage KARA ; l'annulée reste listée.
    expect(day.totalAmount).toBe(50_000)
    expect(day.remainingAmount).toBe(50_000)
    expect(day.count).toBe(2)
    expect(day.commissions).toHaveLength(2)
  })

  it('exclut du cumul de capital une restitution annulée', () => {
    const [day] = groupPlacementScheduleByDay(
      [capitalRestitution({ status: 'Canceled' })],
      today
    )

    expect(day.totalAmount).toBe(0)
    expect(day.capitalAmount).toBe(0)
  })

  it('marque en retard un jour dont le capital est échu', () => {
    const [day] = groupPlacementScheduleByDay(
      [capitalRestitution({ dueDate: new Date('2026-09-10T00:00:00') })],
      today
    )

    expect(day.color).toBe('red')
  })

  it('trie les jours par date croissante', () => {
    const days = groupPlacementScheduleByDay(
      [
        capitalRestitution(),
        commission({ id: 'commission-0', dueDate: new Date('2026-09-10T00:00:00') }),
      ],
      today
    )

    expect(days.map((d) => d.date.getTime())).toEqual([
      new Date('2026-09-10T00:00:00').getTime(),
      new Date('2026-11-10T00:00:00').getTime(),
    ])
  })
})

describe('identification de la restitution du capital', () => {
  it('préfixe l’identifiant synthétique pour éviter toute collision avec une commission', () => {
    expect(buildCapitalRestitutionId('placement-1')).toBe('capital-restitution-placement-1')
  })

  it('distingue le capital d’une commission', () => {
    expect(isCapitalRestitution(capitalRestitution())).toBe(true)
    expect(isCapitalRestitution(commission({}))).toBe(false)
  })
})
