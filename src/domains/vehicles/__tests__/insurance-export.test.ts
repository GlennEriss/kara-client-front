import { expect, it } from 'vitest'
import { paidInsuranceTotals } from '../insurance-export'

it('cumule les versements confirmés sur les renouvellements du même dossier', () => {
  expect([...paidInsuranceTotals([
    { insuranceId: 'A', status: 'PAID', memberAmount: 3000 },
    { insuranceId: 'A', status: 'TO_PAY', memberAmount: 11000 },
    { insuranceId: 'A', status: 'AWAITING_PARTNER', memberAmount: 9000 },
    { insuranceId: 'A', status: 'PAID', memberAmount: 2000 },
    { insuranceId: 'B', status: 'PAID', memberAmount: 700 },
  ])]).toEqual([['A', 5000], ['B', 700]])
})
