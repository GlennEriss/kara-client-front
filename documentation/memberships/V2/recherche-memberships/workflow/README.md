## Workflow d’implémentation – Recherche & filtres (V2)

### Objectif
Refondre la recherche et les filtres membres en centralisant la logique dans des hooks/services de domaine (`useMembershipSearch`, `useMembershipFilters`) et en préparant éventuellement une intégration avec un moteur de recherche externe.

### Séquence d'implémentation (ordre recommandé)

#### Phase 1 : Cartographie & contrats de données ⏳ **À FAIRE**
1. **Cartographier V1**
   - [ ] Analyser `MembershipList.tsx` (logique actuelle de filtres et recherche côté client).
   - [ ] Analyser `MemberFilters.tsx` (UI et logique de mise à jour des `UserFilters`).
   - [ ] Relever l’usage de `useSearchMembers` dans les autres modules (Véhicules, Caisse, Placement, Bienfaiteur).
   - [ ] Relire la doc V1 (UC5, recherche véhicules).
2. **Définir les contrats V2**
   - [ ] Spécifier le type cible `UserFilters` (champs supportés par les filtres V2).
   - [ ] Spécifier l’interface de `useMembershipSearch` (entrées/sorties).
   - [ ] Décider de la stratégie de recherche : Firestore-only vs moteur externe (à détailler dans `firebase/README.md`).

#### Phase 2 : Hooks `useMembershipFilters` & `useMembershipSearch` ⏳ **À FAIRE**
3. **Implémenter `useMembershipFilters`**
   - [ ] Créer `src/domains/memberships/hooks/useMembershipFilters.ts`.
   - [ ] Gérer `filters`, `setFilter`, `resetFilters`, `activeFiltersCount`.
   - [ ] Couvrir tous les champs de `UserFilters` utilisés par la liste.
4. **Implémenter `useMembershipSearch`**
   - [ ] Créer `src/domains/memberships/hooks/useMembershipSearch.ts`.
   - [ ] V1.5 : wrapper autour de `useSearchMembers` existant.
   - [ ] V2 : wrapper autour d’un `MemberSearchRepository` (Firestore/Algolia selon choix).
   - [ ] Gérer `isLoading`, `isError`, `error`.
5. **Tests unitaires**
   - [ ] Tests sur `useMembershipFilters` (construction/normalisation des filtres).
   - [ ] Tests sur `useMembershipSearch` (cas succès, pas de résultats, erreur backend).

#### Phase 3 : Intégration avec `MembershipList` ⏳ **À FAIRE**
6. **Brancher la liste V2 sur les hooks**
   - [ ] Adapter `MembershipList` pour utiliser `useMembershipFilters` au lieu de gérer les filtres localement.
   - [ ] S’assurer que les tabs (Adhérents, Bienfaiteurs, etc.) sont implémentés comme des presets de `UserFilters`.
   - [ ] Limiter le filtrage côté client au strict nécessaire (le reste côté Firestore).
7. **Adapter `MemberFilters`**
   - [ ] Transformer `MemberFilters` en composant purement présentatif.
   - [ ] Le faire consommer `filters` + `onFiltersChange`/`onReset` fournis par le container.

#### Phase 4 : UC5 – Recherche dans l’onglet Véhicules ⏳ **À FAIRE**
8. **Standardiser la recherche de membres**
   - [ ] Créer un `MemberSearchService` ou exposer `useMembershipSearch` comme API partagée pour les autres modules.
   - [ ] Aligner `vehicule/MemberSearchInput` sur cette API.
9. **Tests UC5**
   - [ ] Tests unitaires sur le service/hook partagé.
   - [ ] Tests d’intégration sur l’onglet Véhicules (recherche par nom/matricule).

#### Phase 5 : (Optionnel) Intégration moteur de recherche externe ⏳ **À FAIRE**
10. **Si choix Algolia ou autre**
    - [ ] Concevoir un `MemberSearchRepository` spécifique (index, champs, filtres).
    - [ ] Implémenter les Cloud Functions de synchronisation (voir `functions/README.md`).
    - [ ] Adapter `useMembershipSearch` pour utiliser ce repository.

#### Phase 6 : Tests d’intégration & E2E ⏳ **À FAIRE**
11. **Tests d’intégration** (`membership-search.integration.test.tsx`)
    - [ ] Scénario recherche par nom/matricule.
    - [ ] Scénario filtres combinés (type, abonnement, hasCar, géographie).
    - [ ] Scénario changement de tab (presets de filtres).
12. **Tests E2E**
    - [ ] Parcours complet : recherche membre + filtres + navigation vers fiche détail.

### Priorités
- **Critique** : Phase 2 (hooks) + Phase 3 (intégration liste).
- **Important** : Phase 4 (UC5) + Phase 6 (tests).
- **Optionnel** : Phase 5 (moteur externe) selon décision produit/tech.

### Suivi
- Utiliser cette checklist comme référence pendant l’implémentation.
- Découper idéalement par PR : hooks → intégration liste → UC5 → éventuelle intégration moteur externe → tests.
