import { describe, expect, it } from 'vitest'
import type { CreditPayment, CreditPenalty } from '@/types/types'
import { getPaidCreditPenaltiesForGlobalFacture } from '../creditGlobalFacturePenalties'

const penalty = (id: string, amount: number, paid = false, paymentId?: string) =>
  ({ id, amount, paid, paymentId }) as CreditPenalty
const payment = (id: string, penaltyAmount = 0, comment?: string) =>
  ({ id, amount: 40_000, penaltyAmount, comment }) as CreditPayment

describe('pénalités de la facture globale', () => {
  it('exclut entièrement les deux pénalités impayées du contrat', () => {
    const unpaid = [penalty('p1', 5_500), penalty('p2', 4_167)]
    expect(getPaidCreditPenaltiesForGlobalFacture([payment('m1'), payment('m2')], unpaid)).toEqual([])
  })

  it('conserve une pénalité réglée indépendamment d’un versement mensuel', () => {
    const paid = penalty('p1', 5_500, true)
    expect(getPaidCreditPenaltiesForGlobalFacture([], [paid])).toEqual([paid])
  })

  it('ne crée pas de deuxième reçu pour une pénalité déjà comprise dans un paiement', () => {
    const result = getPaidCreditPenaltiesForGlobalFacture(
      [payment('m1', 5_500)],
      [penalty('p1', 5_500, true, 'm1')]
    )
    expect(result).toEqual([])
  })

  it('exclut un impayé même s’il est lié à un versement enregistré', () => {
    const unpaid = penalty('p1', 5_500, false, 'm1')
    expect(getPaidCreditPenaltiesForGlobalFacture([payment('m1')], [unpaid])).toEqual([])
  })

  it('évite aussi les doublons pour les anciens paiements de pénalités uniquement', () => {
    const result = getPaidCreditPenaltiesForGlobalFacture(
      [payment('legacy', 0, 'Paiement de pénalités uniquement')],
      [penalty('p1', 5_500, true, 'legacy')]
    )
    expect(result).toEqual([])
  })

  it('conserve le reçu réglé quand son paiement lié n’est pas disponible', () => {
    const paid = penalty('p1', 5_500, true, 'absent')
    expect(getPaidCreditPenaltiesForGlobalFacture([], [paid])).toEqual([paid])
  })
})
