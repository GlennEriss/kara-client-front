# Réalisation à faire – Module Caisse spéciale

Ce document décrit **les fonctionnalités à implémenter** pour la caisse spéciale et fait le lien entre :

- L’architecture globale du projet : [`../architecture/ARCHITECTURE.md`](../architecture/ARCHITECTURE.md)  
- L’analyse UML / fonctionnelle dédiée au module : [`./ANALYSE_CAISSE_SPECIALE.md`](./ANALYSE_CAISSE_SPECIALE.md)

## 1. Rappels module existant

- UI & flux actuels :
  - Composants : `src/components/caisse-speciale/*`
  - Pages admin : `src/app/(admin)/caisse-speciale/*`
  - PDF / exports : `src/components/caisse-speciale/CaisseSpecialePDF*.tsx`, modals associées.
- Ce fichier doit toujours être **synchronisé** avec :
  - Les règles techniques définies dans [`ARCHITECTURE.md`](../architecture/ARCHITECTURE.md)
  - Les modèles définis dans `src/types/types.ts`
  - Les services / repositories du module.

## 2. Backlog de fonctionnalités à implémenter

> À compléter au fur et à mesure des besoins. Chaque point doit être traçable avec l'implémentation réelle (PR, commits, etc.).

- [ ] **Formaliser le cycle de vie complet d'un contrat**
  - Statuts : brouillon, validé, en cours, résilié, terminé…
  - Règles de transition de statut.
- [ ] **Uniformiser les formulaires de création / édition de contrat**
  - Schémas Zod dans `src/schemas/caisse-speciale.schema.ts`
  - Utiliser `react-hook-form` + composants UI internes.
- [ ] **Standardiser les PDF et exports**
  - Réutiliser la logique d'export et de mise en page déjà utilisée dans les autres modules (bienfaiteur, véhicules, etc.).

### UC6 – Filtrer les contrats par retard de paiement

> **Documentation détaillée** : Voir [`./UC6_FILTRAGE_RETARD.md`](./UC6_FILTRAGE_RETARD.md) pour l'implémentation complète.

- [ ] **Repository/Service**
  - Étendre les filtres de contrats pour supporter `overdueOnly: true`
  - Implémenter la logique pour identifier les contrats en retard :
    - Filtrer les contrats avec `status: 'LATE_NO_PENALTY'` ou `'LATE_WITH_PENALTY'` (déjà calculé)
    - OU filtrer les contrats avec `nextDueAt < aujourd'hui` et `status: 'ACTIVE'`
  - **Note** : Utiliser la méthode `getContractWithComputedState()` existante qui calcule déjà le statut selon les retards

- [ ] **Hooks**
  - Étendre les hooks de récupération des contrats pour accepter `overdueOnly` dans les filtres
  - Fichier : `src/hooks/useContracts.ts` ou le hook approprié

- [ ] **Composants UI**
  - Modifier `src/components/caisse-speciale/ListContracts.tsx`
  - Ajouter une structure d'onglets avec "Tous les contrats" et "Retard"
  - Implémenter la logique pour activer `overdueOnly: true` quand l'onglet "Retard" est sélectionné
  - Ajouter un badge visuel (rouge/orange) sur les contrats en retard dans la liste
  - Adapter les statistiques pour l'onglet "Retard" (afficher uniquement les stats des contrats en retard)

- [ ] **Indicateurs visuels**
  - Badge "En retard" sur les cartes/tableaux de contrats
  - Couleur différente (rouge/orange) pour les contrats en retard
  - Afficher le nombre de jours de retard si disponible (calculé via `computeDueWindow`)

- [ ] **Types**
  - Étendre les interfaces de filtres pour inclure `overdueOnly?: boolean`

## 3. Impacts architecturaux

Pour chaque nouvelle fonctionnalité listée ci‑dessus, vérifier :

- Les impacts sur :
  - `src/repositories/caisse-speciale/*` (structure des collections Firestore, requêtes)
  - `src/services/caisse-speciale/*` (règles métier)
  - `src/hooks/caisse-speciale/*` (React Query, formats, mapping vers l’UI)
- La conformité avec les conventions décrites dans [`../architecture/ARCHITECTURE.md`](../architecture/ARCHITECTURE.md)
  - Séparation stricte Repository / Service / Hook / Composant
  - Centralisation des types dans `src/types/types.ts`

## 4. Lien avec l’analyse

- Avant toute implémentation significative, **mettre à jour** l’analyse dans [`ANALYSE_CAISSE_SPECIALE.md`](./ANALYSE_CAISSE_SPECIALE.md) :
  - Cas d’utilisation
  - Diagrammes UML (classe, séquence si besoin)
  - Contraintes métiers supplémentaires

Ce fichier sert donc de **plan d’action** pour le développement, toujours relié :

- À l’architecture globale (`../architecture/ARCHITECTURE.md`)
- À l’analyse détaillée du module (`./ANALYSE_CAISSE_SPECIALE.md`)


