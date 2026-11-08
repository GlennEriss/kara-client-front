import routes from '@/constantes/routes'
import type { OverdueProduct } from '@/hooks/useOverduePayments'

const PRODUCT_TAB: Record<OverdueProduct, string> = {
  'Caisse Spéciale': 'caisse-speciale',
  'Caisse Imprévue': 'caisse-imprevue',
  'Crédit Spéciale': 'credit-speciale',
  'Crédit Fixe': 'credit-fixe',
  'Crédit Aide': 'caisse-aide',
  Placement: 'placement',
}

/**
 * Lien profond vers une échéance du calendrier. Le mois et l'onglet sont
 * explicites afin que le bouton fonctionne même si l'administrateur consultait
 * auparavant un autre produit ou une autre période.
 */
export function calendarPaymentHref(product: OverdueProduct, dueAt: Date, focusKey: string): string {
  const params = new URLSearchParams({
    tab: PRODUCT_TAB[product],
    month: `${dueAt.getFullYear()}-${String(dueAt.getMonth() + 1).padStart(2, '0')}`,
    focus: focusKey,
  })
  return `${routes.admin.calendrier}?${params.toString()}`
}

export const calendarFocusKey = {
  // Les IDs de paiements sont locaux à la sous-collection d'un contrat :
  // les imports réutilisent notamment MK_CS_P_MIG_0, MK_CS_P_MIG_1, etc.
  caisseSpeciale: (contractId: string, paymentId: string) => `cs:${contractId}:${paymentId}`,
  caisseImprevue: (contractId: string, monthIndex: number) => `ci:${contractId}:${monthIndex}`,
  credit: (contractId: string, installmentNumber: number) => `credit:${contractId}:${installmentNumber}`,
  placement: (placementId: string, commissionId: string) => `placement:${placementId}:${commissionId}`,
}

/** Les anciens liens sans contrat sont ambigus et ne doivent jamais ouvrir un autre dossier. */
export function getCalendarFocusContractId(focusKey: string | undefined, product: 'cs' | 'ci' | 'credit' | 'placement'): string | undefined {
  const parts = focusKey?.split(':')
  if (!parts || parts.length !== 3 || parts[0] !== product || !parts[1] || !parts[2]) return undefined
  if ((product === 'ci' || product === 'credit') && !/^\d+$/.test(parts[2])) return undefined
  return parts[1]
}
