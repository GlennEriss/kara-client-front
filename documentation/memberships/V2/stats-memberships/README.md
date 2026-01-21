## V2 – Statistiques membres (`stats-memberships`)

### 1. État actuel V1

- **Composants UI** :
  - `MembershipList.tsx` : carrousel de stats (`StatsCarousel`) avec 5 indicateurs (Total, Actifs, Expirés, Hommes, Femmes).
  - `MemberStats.tsx` : widget de stats (si utilisé ailleurs).
- **Calcul des stats** :
  - Dans `MembershipList.tsx` via `useMemo` :
    - Calcul à partir de `membersWithSubscriptions` (membres chargés pour la page courante).
    - Indicateurs : `total`, `active`, `expired`, `men`, `women`, `activePercentage`, `expiredPercentage`, `menPercentage`, `womenPercentage`.
  - Fonction globale `getMemberStats()` dans `src/db/member.db.ts` :
    - Scan complet de tous les membres via Firestore.
    - Retourne `UserStats` (total, active, inactive, byMembershipType, withCar, withoutCar, newThisMonth, newThisYear).
    - Utilisée par `useMemberStats()` dans `src/hooks/useMembers.ts`.
- **Problèmes V1** :
  - Logique de calcul dispersée (dans `MembershipList` via `useMemo` + dans `getMemberStats`).
  - Stats dans `MembershipList` limitées aux membres de la page courante (si pagination).
  - Pas de service de domaine dédié pour les stats.
  - Couplage fort UI ↔ calculs.

### 2. Objectifs V2

- **Extraire la logique de calcul** :
  - Service `MembershipStatsService` (`domains/memberships/services/MembershipStatsService.ts`) :
    - `calculateStats(members: MemberWithSubscription[])` : calcul à partir d'une liste de membres.
    - `getGlobalStats()` : stats globales via repository V2 (si besoin d'un dashboard séparé).
  - Hook `useMembershipStats` (`domains/memberships/hooks/useMembershipStats.ts`) :
    - Option A : calcul basé sur les membres déjà chargés (comme actuellement).
    - Option B : récupération globale via repository V2.
- **Conserver le design visuel** :
  - Carrousel `StatsCarousel` avec drag/swipe.
  - Cartes `ModernStatsCard` avec graphiques (`recharts`).
  - Composants purement présentatifs (données injectées via props).

### 3. Plan des sous‑composants / services V2

#### 3.1 Service de stats

- **`MembershipStatsService`** (`src/domains/memberships/services/MembershipStatsService.ts`) :
  - Méthode `calculateStats(members: MemberWithSubscription[])` :
    - Calcule tous les indicateurs (total, actifs, expirés, hommes, femmes, pourcentages).
    - Peut être enrichie avec : avec/sans véhicule, nouveaux ce mois/année, par type de membership.
  - Méthode `getGlobalStats()` (optionnelle) :
    - Utilise un repository V2 pour récupérer les stats globales (tous les membres, pas seulement la page courante).

#### 3.2 Hook

- **`useMembershipStats`** (`src/domains/memberships/hooks/useMembershipStats.ts`) :
  - Entrées : `members?: MemberWithSubscription[]` (optionnel, si calcul local) ou aucun paramètre (si stats globales).
  - Retourne : `{ stats, isLoading, isError, error }`.
  - Utilise React Query pour le cache si stats globales.

#### 3.3 Composants UI

- **`MembershipsStatsCarousel`** (dans `domains/memberships/components/list/`) :
  - Wrapper autour de `StatsCarousel` actuel.
  - Reçoit `stats` en props (pas de calcul interne).

### 4. Mapping V1 → V2

- **Calcul des stats** :
  - **V1** :
    - `useMemo` dans `MembershipList.tsx` qui filtre `membersWithSubscriptions`.
    - `getMemberStats()` dans `member.db.ts` (scan complet).
  - **V2** :
    - `MembershipStatsService.calculateStats()` pour le calcul local.
    - Repository V2 pour les stats globales (si nécessaire).
- **Affichage** :
  - **V1** : `StatsCarousel` interne à `MembershipList.tsx`.
  - **V2** : `MembershipsStatsCarousel` composant présentatif, consommant `useMembershipStats`.

> Ce README servira de base aux fichiers `workflow/README.md`, `firebase/README.md`, `tests/README.md`, `functions/README.md` et `notifications/README.md` pour `stats-memberships`.

