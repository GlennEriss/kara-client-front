'use client'

import { useMyAccess } from '@/hooks/useMyAccess'

/** Ce qui remplace un montant pour un compte qui ne doit pas le voir. */
export const HIDDEN_AMOUNT = '•••'

/**
 * Formate un montant du calendrier, ou le masque pour l'agent de recouvrement
 * (il relance les membres sans connaître les sommes en jeu).
 */
export function useShownAmount(): (value: number) => string {
  const { canSeeAmounts } = useMyAccess()
  return (value: number) => (canSeeAmounts ? value.toLocaleString('fr-FR') : HIDDEN_AMOUNT)
}
