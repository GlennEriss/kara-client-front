/**
 * Période couverte par un abonnement renouvelé.
 *
 * L'abonnement court à partir de la date saisie par l'admin, pas de la date du
 * jour : un renouvellement encaissé aujourd'hui peut porter sur une période qui
 * a commencé plus tôt, ou qui commence plus tard.
 */

/** Durée d'un abonnement. */
export const SUBSCRIPTION_DURATION_YEARS = 1

export interface SubscriptionPeriod {
  start: Date
  end: Date
}

/**
 * @param date Date saisie, au format `YYYY-MM-DD` du champ HTML, ou `Date`.
 * @throws si la date est absente ou illisible — mieux vaut échouer que de
 *         retomber silencieusement sur aujourd'hui, ce qui était le défaut.
 */
export function computeSubscriptionPeriod(date: string | Date): SubscriptionPeriod {
  const start =
    date instanceof Date
      ? new Date(date)
      : // Heure locale explicite : `new Date('2026-09-01')` serait interprété en
        // UTC et pourrait basculer la veille selon le fuseau.
        new Date(`${String(date).trim()}T00:00:00`)

  if (Number.isNaN(start.getTime())) {
    throw new Error('La date de début de l’abonnement est invalide')
  }

  const end = new Date(start)
  end.setFullYear(end.getFullYear() + SUBSCRIPTION_DURATION_YEARS)

  return { start, end }
}
