// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { businessWallTime, civilDayToTimestamp, getMobileCIDueDate, withBusinessDates } from '../server/calendar-dates'
import { addContractMonths } from '@/utils/contract-months'
import { mobileDateKey } from '../contracts'
describe('échéances CI calculées sur un serveur UTC', () => {
  it('plafonne le 31 janvier au 28 février, comme le calendrier admin', () => {
    const date = getMobileCIDueDate({ firstPaymentDate: '2026-01-31', paymentFrequency: 'MONTHLY' }, 1)
    expect(mobileDateKey(date!)).toBe('2026-02-28')
  })
  it('ne décale pas la fin d’une période de 30 jours à minuit', () => {
    const date = getMobileCIDueDate({ firstPaymentDate: '2026-11-01', paymentFrequency: 'DAILY' }, 0)
    expect(mobileDateKey(date!)).toBe('2026-11-30')
  })
  it('interprète un début stocké à minuit au Gabon dans le bon mois', () => {
    const date = getMobileCIDueDate({ firstPaymentDate: new Date('2026-01-30T23:00:00Z'), paymentFrequency: 'MONTHLY' }, 1)
    expect(mobileDateKey(date!)).toBe('2026-02-28')
  })
  it('conserve le jour contractuel des crédits lors du passage janvier → février', () => {
    const local = businessWallTime(new Date('2026-01-30T23:00:00Z'))
    expect(local.getDate()).toBe(31)
    expect(mobileDateKey(civilDayToTimestamp(addContractMonths(local, 1)))).toBe('2026-02-28')
    const inputs = withBusinessDates({ firstPaymentDate: '2026-01-31', creditCycles: [{ startedAt: new Date('2026-01-30T23:30:00Z') }] }) as { firstPaymentDate: Date; creditCycles: { startedAt: Date }[] }
    expect(inputs.firstPaymentDate.getDate()).toBe(31)
    expect(inputs.creditCycles[0].startedAt.getHours()).toBe(0)
  })
})
