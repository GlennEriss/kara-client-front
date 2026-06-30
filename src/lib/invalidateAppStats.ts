import type { QueryClient } from '@tanstack/react-query'

/**
 * Clés de cache des stats/listes **transverses** (tableau de bord + sections).
 * Une opération dans une section (créer un contrat, approuver une demande,
 * enregistrer un paiement…) impacte souvent d'autres sections (ex. le tableau
 * de bord agrège tout). On invalide donc cet ensemble pour garder l'app cohérente.
 */
export const APP_STATS_QUERY_KEYS: readonly (readonly string[])[] = [
  ['dashboard'],
  ['members'],
  ['allMembers'],
  ['memberships-list-v2'],
  ['membership-details'],
  ['memberships'], // couvre ['memberships','stats','global'] (préfixe)
  ['membership-requests'],
  ['membership-requests-stats'],
  ['filleuls'],
  // Caisse Imprévue
  ['contractsCI'],
  ['contractsCIStats'],
  // Caisse Spéciale
  ['caisse-contracts'],
  ['caisse-contracts-stats'],
  ['all-contracts'],
  ['subscriptions'],
]

/**
 * Invalide les stats transverses afin que TOUTES les sections (tableau de bord,
 * membres, demandes, caisses…) reflètent une opération effectuée dans l'app.
 * À appeler dans le `onSuccess` des mutations qui modifient des données
 * comptabilisées (contrats, paiements, demandes, membres, abonnements).
 */
export function invalidateAppStats(queryClient: QueryClient): void {
  for (const queryKey of APP_STATS_QUERY_KEYS) {
    queryClient.invalidateQueries({ queryKey: queryKey as string[] })
  }
}
