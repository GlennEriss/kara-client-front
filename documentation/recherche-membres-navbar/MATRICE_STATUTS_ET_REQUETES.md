# Matrice Statuts et Requêtes

Ce document centralise les filtres recommandés pour la fonctionnalité "Recherche membre globale" dans la navbar.

## Règle générale

- Afficher ce qui est actionnable.
- Masquer ce qui est terminé (contrats clos/déchargés) ou non utile pour le suivi.

## Matrice par module

| Module | Section | Critère recommandé |
|---|---|---|
| Caisse spéciale | Demandes | `status IN [PENDING, APPROVED]` |
| Caisse spéciale | Contrats | `status != CLOSED` |
| Caisse imprévue | Demandes | `status IN [PENDING, APPROVED]` |
| Caisse imprévue | Contrats | `status == ACTIVE` |
| Crédit spéciale | Demandes | `status IN [PENDING, APPROVED]` ET `contractId` absent |
| Crédit spéciale | Contrats | `status NOT IN [CLOSED, DISCHARGED]` |
| Crédit fixe | Demandes | `status IN [PENDING, APPROVED]` (option: `contractId` absent) |
| Crédit fixe | Contrats | `status NOT IN [CLOSED, DISCHARGED]` |
| Crédit aide | Demandes | `status IN [PENDING, APPROVED]` (option: `contractId` absent) |
| Crédit aide | Contrats | `status NOT IN [CLOSED, DISCHARGED]` |
| Placement | Demandes | `status IN [PENDING, APPROVED]` |
| Placement | Contrats | `status IN [Draft, Active]` (donc exclure `Closed`, `EarlyExit`, `Canceled`) |

## Sources principales dans le code

- Types de statuts: `src/types/types.ts`
- Recherche membre Algolia: `src/services/search/MembersAlgoliaSearchService.ts`
- Navbar cible: `src/components/layout/LayoutDashboard.tsx`
- Pattern d'agrégation domains existant: `src/domains/dashboard/*`

## Normalisation conseillée

Créer un fichier unique de constantes, par exemple:

- `src/domains/dashboard/member-overview/entities/member-overview-status-filters.ts`

Exemple:

```ts
export const MEMBER_OVERVIEW_STATUS_FILTERS = {
  caisseSpeciale: {
    demandes: ['PENDING', 'APPROVED'],
    contratsExcluded: ['CLOSED'],
  },
  caisseImprevue: {
    demandes: ['PENDING', 'APPROVED'],
    contratsIncluded: ['ACTIVE'],
  },
  credit: {
    demandes: ['PENDING', 'APPROVED'],
    contratsExcluded: ['CLOSED', 'DISCHARGED'],
  },
  placement: {
    demandes: ['PENDING', 'APPROVED'],
    contratsIncluded: ['Draft', 'Active'],
  },
} as const
```

Note architecture:

- Les filtres de statuts sont des règles métier.
- Ils doivent rester dans le domaine (`entities`/`services`), pas dans les composants UI.

## Pagination recommandée du panneau résumé

- Limiter chaque section à 5 éléments visibles.
- Ajouter "Voir tout" vers la page module.
- Éviter les payloads trop lourds dans la navbar.

## Validation métier à faire avant implémentation finale

1. Confirmer si un contrat `DRAFT` doit être considéré comme "non clôturé" dans tous les modules.
2. Confirmer si les demandes `APPROVED` déjà converties doivent rester visibles.
3. Confirmer les routes finales de redirection "Voir tout" (notamment pour caisse spéciale/imprévue).
