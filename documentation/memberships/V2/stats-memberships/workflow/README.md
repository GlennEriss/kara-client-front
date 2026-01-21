## Workflow d'implémentation – Statistiques membres (V2)

### Objectif
Refondre le calcul et l'affichage des statistiques membres en extrayant la logique dans un service/hook de domaine (`MembershipStatsService`, `useMembershipStats`) et en conservant le design visuel actuel (carrousel de stats, graphiques).

### Séquence d'implémentation (ordre recommandé)

#### Phase 1 : Cartographie & design du service ⏳ **À FAIRE**
1. **Cartographier V1**
   - [ ] Analyser `MembershipList.tsx` (calcul des stats dans `useMemo` : total, actifs, expirés, hommes, femmes).
   - [ ] Analyser `getMemberStats()` dans `member.db.ts` (scan complet de tous les membres pour stats globales).
   - [ ] Lister tous les indicateurs affichés (carrousel, graphiques).
2. **Concevoir l'API du service V2**
   - [ ] Définir le type `MembershipStats` (total, actifs, expirés, hommes, femmes, avec/sans véhicule, nouveaux, par type, etc.).
   - [ ] Définir `MembershipStatsService.calculateStats(members: MemberWithSubscription[])` (calcul à partir d'une liste de membres).
   - [ ] Définir `MembershipStatsService.getGlobalStats()` (stats globales via Firestore, pour un dashboard séparé si besoin).

#### Phase 2 : Service `MembershipStatsService` ⏳ **À FAIRE**
3. **Créer le service** (`src/domains/memberships/services/MembershipStatsService.ts`)
   - [ ] Extraire la logique de calcul actuelle de `MembershipList.tsx` :
     - Total, actifs/expirés (basés sur `isSubscriptionValid`), hommes/femmes.
     - Calcul des pourcentages.
   - [ ] Optionnellement : enrichir avec d'autres stats (avec/sans véhicule, nouveaux ce mois/année, par type de membership).
4. **Tests unitaires du service**
   - [ ] Vérifier le calcul correct de chaque indicateur.
   - [ ] Vérifier les cas limites (liste vide, membres sans données complètes).

#### Phase 3 : Hook `useMembershipStats` ⏳ **À FAIRE**
5. **Créer le hook** (`src/domains/memberships/hooks/useMembershipStats.ts`)
   - [ ] Option A : calcul basé sur les membres déjà chargés (comme actuellement dans `MembershipList`).
   - [ ] Option B : récupération globale via `getMemberStats()` (repository V2) si on veut des stats indépendantes de la liste paginée.
   - [ ] Retourne : `stats` + `isLoading`, `isError`.
6. **Tests unitaires du hook**
   - [ ] Cas succès (stats calculées).
   - [ ] Cas erreur (backend).

#### Phase 4 : Refactor des composants UI ⏳ **À FAIRE**
7. **Adapter `MembershipList` / carrousel de stats**
   - [ ] Utiliser `useMembershipStats` au lieu du `useMemo` local.
   - [ ] Conserver le design actuel (`StatsCarousel`, `ModernStatsCard`).
8. **Créer un composant dédié `MembershipsStatsWidget`** (optionnel)
   - [ ] Si on veut réutiliser les stats ailleurs (dashboard, page dédiée stats).

#### Phase 5 : Tests d'intégration ⏳ **À FAIRE**
9. **Tests d'intégration** (`membership-stats.integration.test.tsx`)
    - [ ] Scénario affichage des stats dans la liste des membres.
    - [ ] Scénario calcul correct des pourcentages et indicateurs.

### Priorités
- **Critique** : Phase 2 (service) + Phase 3 (hook).
- **Important** : Phase 4 (refactor UI) + Phase 5 (tests).

### Suivi
- Utiliser cette checklist comme référence pendant l'implémentation.
