import { describe, expect, it } from 'vitest'
import type { CreditContract, CreditPayment } from '@/types/types'
import { getCreditExtensionStartDate } from '../credit-cycle-dates'
import { getWeeklyCreditStartDate } from '../credit-weekly'
import { getCreditContractStartDates } from '@/services/credit-speciale/creditContractDates'
import {
  buildCreditSpecialeTimelineHistory,
  getCreditContractCycles,
  getCreditPaymentCycleNumber,
} from '../credit-speciale-history'

const recordedAt = new Date('2026-10-12T09:34:00')
const contract = {
  id: 'credit-date-reconstituee',
  creditType: 'SPECIALE',
  durationUnit: 'MONTHS',
  status: 'ACTIVE',
  amount: 4_000_000,
  interestRate: 10,
  monthlyPaymentAmount: 1_000_000,
  totalAmount: 4_400_000,
  duration: 6,
  guarantorRemunerationPercentage: 0,
  rajoutEffectue: true,
  createdAt: recordedAt,
  extendedAt: recordedAt,
  disbursementDate: new Date('2025-11-20T12:00:00'),
  firstPaymentDate: new Date('2026-05-25T12:00:00'),
  creditCycles: [
    {
      cycleNumber: 1,
      type: 'INITIAL',
      amount: 2_500_000,
      interestRate: 10,
      monthlyPaymentAmount: 1_000_000,
      totalAmount: 2_750_000,
      duration: 7,
      firstPaymentDate: new Date('2025-12-20T12:00:00'),
      startedAt: recordedAt,
    },
    {
      cycleNumber: 2,
      type: 'AUGMENTATION',
      amount: 4_000_000,
      interestRate: 10,
      monthlyPaymentAmount: 1_000_000,
      totalAmount: 4_400_000,
      duration: 6,
      firstPaymentDate: new Date('2026-05-25T12:00:00'),
      startedAt: recordedAt,
      restMonths: [
        {
          monthNumber: 3,
          reason: 'Repos',
          recordedBy: 'admin',
          recordedByName: 'Admin',
          recordedAt,
        },
      ],
    },
  ],
} as CreditContract

const date = (value: Date | null | undefined) =>
  value?.toLocaleDateString('fr-FR')

describe('dates effectives des cycles et saisie historique', () => {
  it('utilise le départ initial persisté sans réécrire la date de création', () => {
    const initialStartAt = new Date('2025-11-20T12:00:00')
    const result = getCreditContractStartDates({ createdAt: recordedAt, initialStartAt })
    expect(result.startDate).toEqual(initialStartAt)
    expect(result.initialStartDate).toEqual(initialStartAt)
    expect(result.hasExtension).toBe(false)
  })

  it('distingue le départ du calendrier explicitement enregistré de la remise réelle', () => {
    const input = { createdAt: recordedAt, initialStartAt: new Date('2020-11-05'), disbursementDate: new Date('2020-01-01') }
    const result = getCreditContractStartDates(input)
    expect(date(result.initialStartDate)).toBe('05/11/2020')
    expect(input.disbursementDate).toEqual(new Date('2020-01-01'))
  })
  it('utilise la remise comme repli si le départ du calendrier n’est pas renseigné', () => {
    expect(date(getCreditContractStartDates({ createdAt: recordedAt, disbursementDate: new Date('2020-01-01') }).initialStartDate)).toBe('01/01/2020')
  })
  it.each([
    ['2020-12-05', '2020-11-05'],
    ['2024-03-30', '2024-02-29'],
    ['2026-06-04', '2026-05-04'],
    ['2026-09-30', '2026-08-30'],
  ])('respecte le départ du calendrier autorisé %s → %s sans déplacer l’échéance', (first, start) => {
    const input = { ...contract, creditCycles: [], rajoutEffectue: false, extendedAt: undefined, initialStartAt: new Date(start), firstPaymentDate: new Date(first) }
    expect(date(getCreditExtensionStartDate(first))).toBe(date(new Date(start)))
    expect(date(getCreditContractStartDates(input).startDate)).toBe(date(new Date(start)))
    expect(date(getCreditContractCycles(input)[0].startedAt)).toBe(date(new Date(start)))
    expect(input.firstPaymentDate).toEqual(new Date(first))
    expect(input.disbursementDate).toBe(contract.disbursementDate)
  })
  it('respecte les deux semaines avant le 19 octobre sans remplacer la remise du 20 septembre', () => {
    const input = { ...contract, creditCycles: [], rajoutEffectue: false, extendedAt: undefined, durationUnit: 'WEEKS' as const, duration: 2, firstPaymentDate: new Date('2026-10-19'), initialStartAt: new Date('2026-10-05'), disbursementDate: new Date('2026-09-20') }
    expect(date(getCreditContractStartDates(input).startDate)).toBe('05/10/2026')
    expect(date(getWeeklyCreditStartDate(input.firstPaymentDate, input.duration))).toBe('05/10/2026')
    expect(date(input.disbursementDate)).toBe('20/09/2026')
    expect(date(input.firstPaymentDate)).toBe('19/10/2026')
  })
  it('affiche le départ du 25 avril et la remise initiale du 20 novembre malgré une saisie en octobre', () => {
    const result = getCreditContractStartDates(contract)
    expect(date(result.startDate)).toBe('25/04/2026')
    expect(date(result.initialStartDate)).toBe('20/11/2025')
    expect(result.hasExtension).toBe(true)
    const cycles = getCreditContractCycles(contract)
    expect(date(cycles[0].startedAt)).toBe('20/11/2025')
    expect(date(cycles[1].startedAt)).toBe('25/04/2026')
    expect(cycles[1].recordedAt).toEqual(recordedAt)
    // La lecture ne réécrit pas le document ni l'audit historique.
    expect(contract.creditCycles?.[1].startedAt).toBe(recordedAt)
    expect(contract.createdAt).toBe(recordedAt)
    expect(contract.extendedAt).toBe(recordedAt)
  })

  it('utilise le nouveau cycle même si les cycles ne sont pas rangés dans l’ordre', () => {
    const reversed = {
      ...contract,
      creditCycles: [...contract.creditCycles!].reverse(),
    }
    expect(date(getCreditContractStartDates(reversed).startDate)).toBe(
      '25/04/2026',
    )
    expect(
      getCreditContractCycles(reversed).map((cycle) => date(cycle.startedAt)),
    ).toEqual(['20/11/2025', '25/04/2026'])
  })

  it('rattache le versement anticipé de mai au nouveau cycle sans déplacer un ancien paiement identifié', () => {
    expect(
      getCreditPaymentCycleNumber(contract, {
        id: 'versement-ancien-format',
        paymentDate: new Date('2026-05-19'),
      }),
    ).toBe(2)
    expect(
      getCreditPaymentCycleNumber(contract, {
        id: 'versement-avril',
        paymentDate: new Date('2026-04-19'),
      }),
    ).toBe(1)
    expect(
      getCreditPaymentCycleNumber(contract, {
        id: `C1_M5_${contract.id}`,
        paymentDate: new Date('2026-05-19'),
      }),
    ).toBe(1)
  })

  it('conserve les échéances, le repos et tous les capitaux du contrat communiqué', () => {
    const payments = [
      ...[
        '2025-12-20',
        '2026-01-15',
        '2026-02-18',
        '2026-03-20',
        '2026-04-19',
      ].map((day, index) => ({
        id: `C1_M${index + 1}_${contract.id}`,
        creditId: contract.id,
        amount: 250_000,
        paymentDate: new Date(day),
      })),
      ...[
        [1, 500_000, '2026-05-19'],
        [2, 500_000, '2026-06-22'],
        [4, 380_000, '2026-08-19'],
        [5, 500_000, '2026-09-15'],
        [6, 500_000, '2026-10-24'],
      ].map(([month, amount, day]) => ({
        id: `C2_M${month}_${contract.id}`,
        creditId: contract.id,
        amount: Number(amount),
        paymentDate: new Date(String(day)),
      })),
    ] as CreditPayment[]
    const rows = buildCreditSpecialeTimelineHistory(contract, payments)
    expect(
      rows
        .filter((row) => row.cycleNumber === 1)
        .map((row) => row.nextCapitalActual),
    ).toEqual(Array(5).fill(2_500_000))
    const current = rows.filter((row) => row.cycleNumber === 2)
    expect(current.map((row) => row.nextCapitalActual)).toEqual([
      3_900_000, 3_790_000, 3_790_000, 3_789_000, 3_667_900, 3_534_690,
    ])
    expect(current[2]).toMatchObject({
      isRest: true,
      actualPayment: 0,
      interest: 0,
    })
    expect(current.map((row) => date(row.date))).toEqual([
      '25/05/2026',
      '25/06/2026',
      '25/07/2026',
      '25/08/2026',
      '25/09/2026',
      '25/10/2026',
    ])
    expect(
      current.every((row) => date(row.cycleStartedAt) === '25/04/2026'),
    ).toBe(true)
  })

  it.each([
    ['2026-03-31T12:00:00', '28/02/2026'],
    ['2024-03-31T12:00:00', '29/02/2024'],
    ['2026-01-25T12:00:00', '25/12/2025'],
  ])('retire un mois calendaire à %s sans déborder', (first, expected) => {
    expect(date(getCreditExtensionStartDate(first))).toBe(expected)
  })

  it('corrige aussi un rajout connu sans tableau de cycles, et ne fabrique pas de date invalide', () => {
    expect(
      date(
        getCreditContractStartDates({ ...contract, creditCycles: [] })
          .startDate,
      ),
    ).toBe('25/04/2026')
    expect(getCreditExtensionStartDate('date invalide')).toBeNull()
    expect(getCreditExtensionStartDate(undefined)).toBeNull()
  })
})
