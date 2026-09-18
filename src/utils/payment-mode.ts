/**
 * Libellé lisible d'un moyen de paiement.
 *
 * La table des libellés vit déjà dans `@/constantes/membership-requests` ; on la
 * réutilise plutôt que d'en recopier une de plus — le dépôt en compte déjà une
 * dizaine, dispersées dans les écrans et les exports PDF.
 */

import { PAYMENT_MODE_LABELS } from '@/constantes/membership-requests'

export { PAYMENT_MODE_LABELS }

export interface PaymentModeDetails {
  /** Libellé libre saisi quand le mode vaut « other ». */
  paymentMethodOther?: string
  /** Airtel Money / Mobicash : versement avec ou sans frais. */
  withFees?: boolean
}

/**
 * Rend « Airtel Money (avec frais) », « Autre (Western Union) », « Espèces »…
 *
 * @param mode   identifiant du mode (`airtel_money`, `cash`, …)
 * @param details précisions facultatives affichées entre parenthèses
 * @param fallback valeur rendue si le mode est absent
 */
export function formatPaymentMode(
  mode?: string | null,
  details?: PaymentModeDetails,
  fallback = '—',
): string {
  if (!mode) return fallback

  const base = PAYMENT_MODE_LABELS[mode] || mode

  if (mode === 'other' && details?.paymentMethodOther?.trim()) {
    return `${base} (${details.paymentMethodOther.trim()})`
  }

  // L'information « frais » n'a de sens que pour les paiements mobiles.
  if ((mode === 'airtel_money' || mode === 'mobicash') && details?.withFees !== undefined) {
    return `${base} (${details.withFees ? 'avec frais' : 'sans frais'})`
  }

  return base
}
