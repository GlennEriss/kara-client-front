import { describe, expect, it } from 'vitest'
import {
  addContractMonths,
  getContractEndDate,
  getMonthPeriod,
  getPaymentDueDate,
} from '@/utils/caisse-imprevue-utils'

const iso = (d: Date | null) =>
  d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` : null

const monthly = { firstPaymentDate: '2025-01-31', paymentFrequency: 'MONTHLY', subscriptionCIDuration: 12 }
const daily = { firstPaymentDate: '2025-01-15', paymentFrequency: 'DAILY', subscriptionCIDuration: 12 }

describe('addContractMonths', () => {
  it('plafonne au dernier jour du mois d’arrivée', () => {
    const jan31 = new Date(2025, 0, 31)
    expect(iso(addContractMonths(jan31, 1))).toBe('2025-02-28')
    expect(iso(addContractMonths(jan31, 3))).toBe('2025-04-30')
  })

  it('ne déborde jamais sur le mois suivant', () => {
    const jan31 = new Date(2025, 0, 31)
    for (let i = 1; i <= 12; i++) {
      expect(addContractMonths(jan31, i).getMonth()).toBe((jan31.getMonth() + i) % 12)
    }
  })

  it('gère le 29 février', () => {
    expect(iso(addContractMonths(new Date(2024, 0, 29), 1))).toBe('2024-02-29')
    expect(iso(addContractMonths(new Date(2025, 0, 29), 1))).toBe('2025-02-28')
  })
})

describe('getPaymentDueDate', () => {
  it('mensuel : applique la règle du dernier jour du mois', () => {
    expect(iso(getPaymentDueDate(monthly, 1))).toBe('2025-02-28')
    expect(iso(getPaymentDueDate(monthly, 3))).toBe('2025-04-30')
  })

  it('quotidien : fin de la période de 30 jours, pas monthIndex jours', () => {
    // Le bug corrigé ajoutait monthIndex JOURS : la période 3 tombait au 18/01.
    expect(iso(getPaymentDueDate(daily, 0))).toBe('2025-02-13')
    expect(iso(getPaymentDueDate(daily, 3))).toBe('2025-05-14')
  })

  it('quotidien : cohérent avec getMonthPeriod', () => {
    for (const monthIndex of [0, 1, 5, 11]) {
      const { endDate } = getMonthPeriod(monthIndex, daily.firstPaymentDate)
      expect(iso(getPaymentDueDate(daily, monthIndex))).toBe(iso(endDate))
    }
  })

  it('retourne null sans date de première échéance', () => {
    expect(getPaymentDueDate({ paymentFrequency: 'MONTHLY' }, 0)).toBeNull()
    expect(getPaymentDueDate({ firstPaymentDate: 'invalide', paymentFrequency: 'MONTHLY' }, 0)).toBeNull()
  })
})

describe('getContractEndDate', () => {
  it('mensuel : durée en mois calendaires, plafonnée', () => {
    expect(iso(getContractEndDate(monthly))).toBe('2026-01-31')
    expect(iso(getContractEndDate({ ...monthly, subscriptionCIDuration: 1 }))).toBe('2025-02-28')
  })

  it('quotidien : fin de la dernière période de 30 jours', () => {
    // `+ duration mois` donnait 15/01/2026, soit 6 jours de trop.
    expect(iso(getContractEndDate(daily))).toBe('2026-01-09')
  })

  it('retourne null sans durée exploitable', () => {
    expect(getContractEndDate({ ...monthly, subscriptionCIDuration: 0 })).toBeNull()
    expect(getContractEndDate({ paymentFrequency: 'MONTHLY', subscriptionCIDuration: 12 })).toBeNull()
  })
})
