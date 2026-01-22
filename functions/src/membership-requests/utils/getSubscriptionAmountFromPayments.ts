/**
 * Utilitaire pour récupérer le montant d'abonnement depuis les paiements
 * 
 * Cette fonction extrait la logique de récupération du montant pour la rendre testable
 * 
 * @param payments - Tableau des paiements de la demande d'adhésion
 * @param membershipType - Type de membre (pour fallback sur montant par défaut)
 * @returns Le montant réel du paiement ou le montant par défaut
 */

export interface Payment {
  paymentType?: 'Subscription' | 'Membership' | 'Tontine' | 'Charity'
  amount?: number
  [key: string]: any
}

const DEFAULT_AMOUNTS: Record<string, number> = {
  adherant: 10300,
  bienfaiteur: 10300,
  sympathisant: 10300,
}

export function getSubscriptionAmountFromPayments(
  payments: Payment[] | undefined | null,
  membershipType: string = 'adherant'
): number {
  // Si aucun paiement, retourner le montant par défaut
  if (!payments || payments.length === 0) {
    return DEFAULT_AMOUNTS[membershipType] || 10300
  }

  // Priorité 1: Paiement de type 'Subscription'
  const subscriptionPayment = payments.find((p) => p.paymentType === 'Subscription')
  if (subscriptionPayment && subscriptionPayment.amount != null) {
    return subscriptionPayment.amount
  }

  // Priorité 2: Paiement de type 'Membership'
  const membershipPayment = payments.find((p) => p.paymentType === 'Membership')
  if (membershipPayment && membershipPayment.amount != null) {
    return membershipPayment.amount
  }

  // Priorité 3: Premier paiement disponible
  const firstPayment = payments[0]
  if (firstPayment && firstPayment.amount != null) {
    return firstPayment.amount
  }

  // Fallback: Montant par défaut
  return DEFAULT_AMOUNTS[membershipType] || 10300
}
