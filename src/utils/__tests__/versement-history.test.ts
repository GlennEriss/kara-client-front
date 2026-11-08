import { describe, expect, it } from 'vitest'
import type { PaymentCI } from '@/types/types'
import { getCaisseSpecialeRecordedVersements, getCIRecordedVersementCount, getCIRecordedVersements, getMemberQuarterForPdf } from '../versement-history'

describe('opérations réelles des historiques de versement', () => {
  it('conserve deux contributions CS du même jour', () => {
    const contribs = [{ amount: 1_000, paidAt: '2026-08-10', time: '09:00' }, { amount: 2_000, paidAt: '2026-08-10', time: '17:00' }]
    expect(getCaisseSpecialeRecordedVersements({ amount: 30_000, status: 'DUE', contribs })).toEqual(contribs)
  })
  it('ne transforme pas une échéance CS à payer en versement', () => {
    expect(getCaisseSpecialeRecordedVersements({ amount: 30_000, status: 'DUE' })).toEqual([])
  })
  it('conserve un ancien paiement CS sans fabriquer de date', () => {
    const [entry] = getCaisseSpecialeRecordedVersements({ amount: 30_000, status: 'PAID' })
    expect(entry.amount).toBe(30_000)
    expect(entry.paidAt).toBeUndefined()
  })
  it('utilise le cumul réellement versé d’un paiement CS partiel', () => {
    expect(getCaisseSpecialeRecordedVersements({ amount: 30_000, accumulatedAmount: 5_000, status: 'DUE' })[0].amount).toBe(5_000)
  })
  it('exclut les mois CI reconstruits sans versement', () => {
    expect(getCIRecordedVersements({ accumulatedAmount: 0, targetAmount: 30_000, status: 'DUE', versements: [] } as unknown as PaymentCI)).toEqual([])
  })
  it('conserve toutes les saisies CI du même jour et ignore les lignes à zéro', () => {
    const entries = [{ amount: 500, date: '2026-08-10', time: '09:00' }, { amount: 700, date: '2026-08-10', time: '17:00' }, { amount: 0 }]
    expect(getCIRecordedVersements({ versements: entries } as unknown as PaymentCI)).toEqual(entries.slice(0, 2))
  })
  it('conserve un ancien cumul CI sans inventer l’heure, la date ou le moyen', () => {
    expect(getCIRecordedVersements({ accumulatedAmount: 1_200, versements: [] } as unknown as PaymentCI)).toEqual([{ amount: 1_200 }])
  })
  it('ne confond pas le quartier avec la ville ou les notes d’import', () => {
    expect(getMemberQuarterForPdf({ address: { district: '  Akébé  ' } })).toBe('Akébé')
    expect(getMemberQuarterForPdf({ address: { district: '  ' } })).toBe('Non renseigné')
    expect(getMemberQuarterForPdf()).toBe('Non renseigné')
  })
  it('compte une remise CI répartie sur deux mois comme une seule opération', () => {
    const payments = [
      { id: 'm1', versements: [{ amount: 500, id: 'v1', splitGroupId: 'group' }] },
      { id: 'm2', versements: [{ amount: 500, id: 'v2', splitGroupId: 'group' }, { amount: 700, id: 'v3' }] },
    ] as PaymentCI[]
    expect(getCIRecordedVersementCount(payments)).toBe(2)
  })
})
