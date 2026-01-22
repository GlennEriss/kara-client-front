## Cloud Functions – Liste des membres (V2)

### Fonctions existantes (utilisées indirectement)

#### 1. `dailyBirthdayNotifications` (scheduled)
- **Fichier** : `functions/src/scheduled/birthdayNotifications.ts`
- **Déclenchement** : Quotidien à 8h00 (cron `0 8 * * *`)
- **Rôle** : Génère les notifications d'anniversaires pour les membres actifs.
- **Utilisation pour liste** : Le tab "Anniversaires" peut s'appuyer sur les données calculées par cette fonction (ou recalculer côté client).
- **Note** : Cette fonction est déjà utilisée pour le module anniversaires (voir `../anniversaires-memberships`).

### Fonctions à créer (V2 - recommandations)

#### 1. `exportMembersList` (callable) ⏳ **À CRÉER**
- **Objectif** : Déporter l'export de la liste des membres côté serveur pour :
  - Éviter les limitations de mémoire côté client.
  - Gérer les exports volumineux (>1000 membres).
  - Générer des fichiers PDF/Excel/CSV de manière optimisée.
- **Signature proposée** :
  ```typescript
  exportMembersList(data: {
    filters: UserFilters
    format: 'csv' | 'excel' | 'pdf'
    sortOrder?: 'A-Z' | 'Z-A'
    dateRange?: { start: string, end: string }
    vehicleFilter?: 'all' | 'with' | 'without'
    quantity?: number // ou 'all'
  }): Promise<{ downloadUrl: string }>
  ```
- **Implémentation** :
  - Récupère les membres selon filtres via Firestore Admin SDK.
  - Génère le fichier (CSV via bibliothèque, Excel via `exceljs`, PDF via `pdfkit` ou `jspdf`).
  - Upload le fichier dans Firebase Storage.
  - Retourne l'URL de téléchargement signée.
- **Avantages** :
  - Pas de limitation mémoire côté client.
  - Traitement asynchrone (peut prendre plusieurs minutes pour gros exports).
  - Fichiers stockés dans Storage (historique des exports).

#### 2. `recalculateMemberStats` (callable ou scheduled) ⏳ **À CRÉER**
- **Objectif** : Recalculer les statistiques globales des membres (actifs, expirés, genre, etc.) et les stocker dans un document Firestore pour éviter de recalculer à chaque chargement de page.
- **Signature proposée** :
  ```typescript
  recalculateMemberStats(): Promise<{
    total: number
    active: number
    expired: number
    men: number
    women: number
    // ... autres stats
  }>
  ```
- **Implémentation** :
  - Parcourt tous les membres avec leurs subscriptions.
  - Calcule les statistiques agrégées.
  - Met à jour un document `stats/members` dans Firestore.
- **Déclenchement** :
  - **Option 1** : Scheduled (quotidien à 6h00) pour recalcul automatique.
  - **Option 2** : Callable pour recalcul à la demande (bouton admin).
- **Avantages** :
  - Performance : stats pré-calculées, chargement instantané de la page.
  - Cohérence : stats calculées une fois par jour plutôt qu'à chaque requête.

#### 3. `updateMemberSearchableText` (trigger) ⏳ **À CRÉER** - **CRITIQUE POUR PAGINATION**
- **Objectif** : Maintenir un champ `searchableText` dans chaque document `users` pour optimiser la recherche textuelle côté Firestore.
- **Déclenchement** : Trigger `onUpdate` et `onCreate` sur collection `users`.
- **Implémentation** :
  - Concatène `firstName`, `lastName`, `matricule`, `email` en un champ `searchableText` (lowercase).
  - Met à jour le document avec ce champ.
- **Avantages** :
  - Permet de déplacer la recherche textuelle côté Firestore (au lieu de filtrer côté client).
  - Requête Firestore plus performante avec index sur `searchableText`.
- **Impact pagination côté serveur** :
  - **CRITIQUE** : Sans cette fonction, la recherche textuelle doit rester côté client, ce qui casse la pagination (recherche seulement sur la page actuelle, pas sur tous les membres).
  - Avec `searchableText` indexé, la recherche peut être faite côté Firestore avant pagination, permettant un `totalItems` correct.

#### 4. `syncMemberSubscriptions` (trigger ou scheduled) ⏳ **À CRÉER** - **CRITIQUE POUR PAGINATION**
- **Objectif** : Maintenir un champ `lastSubscription` et `isSubscriptionValid` dans chaque document `users` pour éviter les N+1 queries.
- **Déclenchement** :
  - **Option 1** : Trigger `onWrite` sur collection `subscriptions` → met à jour le `users` correspondant.
  - **Option 2** : Scheduled (quotidien) pour recalculer tous les membres.
- **Implémentation** :
  - Pour chaque `subscription` créée/modifiée, récupère la dernière subscription du membre.
  - Met à jour `users/{userId}` avec `lastSubscription` (référence) et `isSubscriptionValid` (booléen calculé).
- **Avantages** :
  - Évite les N+1 queries dans `getMembersPaginated`.
  - Filtres "Abonnement valide/invalide" plus rapides (requête Firestore directe).
- **Impact pagination côté serveur** :
  - **CRITIQUE** : Sans cette fonction, `getMembersPaginated` doit appeler `getMemberWithSubscription()` pour chaque membre (N+1 queries), ce qui est très lent.
  - Avec `isSubscriptionValid` dans le document `users`, les filtres "Abonnement valide/invalide" peuvent être appliqués côté Firestore avant pagination, permettant un `totalItems` correct.

### Décisions d'architecture V2

#### Export : côté client vs serveur
- **V1** : Export côté client (`ExportMembershipModal.tsx`).
- **V2 recommandé** : 
  - **Petits exports (<100 membres)** : garder côté client (rapide, pas de latence réseau).
  - **Gros exports (>100 membres)** : utiliser Cloud Function `exportMembersList` (évite timeout/mémoire).

#### Stats : calcul temps réel vs pré-calculées
- **V1** : Calcul temps réel dans `useMemo` côté client.
- **V2 recommandé** :
  - **Stats globales** : pré-calculées via `recalculateMemberStats` (scheduled quotidien).
  - **Stats filtrées** : calcul temps réel côté client (dépendent des filtres actifs).

#### Recherche textuelle : côté client vs Firestore
- **V1** : Filtrage côté client après récupération.
  - **Problème** : La recherche ne porte que sur la page actuelle (12 membres), pas sur tous les membres.
  - **Impact pagination** : `totalItems` est incorrect car basé sur les résultats filtrés de la page uniquement.
- **V2 recommandé** :
  - Créer fonction `updateMemberSearchableText` (trigger).
  - Créer index Firestore sur `searchableText`.
  - Déplacer recherche côté Firestore pour meilleures performances.
  - **Impact pagination** : La recherche est appliquée avant pagination, donc `totalItems` est correct.

### Checklist d'implémentation

- [ ] **Phase 1 (CRITIQUE pour pagination)** : Créer `updateMemberSearchableText` (trigger) pour optimiser recherche.
  - **Blocage** : Sans cette fonction, la recherche textuelle doit rester côté client, ce qui casse la pagination.
- [ ] **Phase 2 (CRITIQUE pour pagination)** : Créer `syncMemberSubscriptions` (trigger) pour éviter N+1 queries.
  - **Blocage** : Sans cette fonction, les filtres "Abonnement valide/invalide" ne peuvent pas être appliqués côté Firestore avant pagination.
- [ ] **Phase 3** : Créer `recalculateMemberStats` (scheduled) pour stats pré-calculées.
- [ ] **Phase 4** : Créer `exportMembersList` (callable) pour exports volumineux.
- [ ] **Tests** : Tester chaque fonction avec données réelles.
- [ ] **Monitoring** : Configurer alertes sur erreurs/exécutions longues.

### Ordre de priorité pour pagination côté serveur

Pour que la pagination côté serveur fonctionne correctement, les fonctions suivantes doivent être implémentées **en priorité** :

1. **`updateMemberSearchableText`** : Permet de déplacer la recherche textuelle côté Firestore.
2. **`syncMemberSubscriptions`** : Permet de déplacer les filtres d'abonnement côté Firestore.

Sans ces deux fonctions, la pagination côté serveur ne peut pas être complètement implémentée car certains filtres doivent rester côté client, ce qui casse le calcul de `totalItems`.

