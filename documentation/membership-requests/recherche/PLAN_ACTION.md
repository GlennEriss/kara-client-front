# Plan d'Action - Implémentation Algolia

## ✅ Ce qui est déjà fait

- [x] Compte Algolia créé
- [x] 3 index créés (`membership-requests-dev`, `membership-requests-preprod`, `membership-requests-prod`)
- [x] Configuration des index (attributs de recherche, facets, ranking)
- [x] Variables d'environnement ajoutées dans `.env.dev`, `.env.preview`, `.env.prod`

---

## 📋 Ce qui reste à faire

### Étape 1 : Installation des Dépendances (5 min)

#### Client (Next.js)
```bash
pnpm add algoliasearch
```

#### Cloud Functions
```bash
cd functions
pnpm add algoliasearch
cd ..
```

**Vérification** :
- [ ] `algoliasearch` dans `package.json`
- [ ] `algoliasearch` dans `functions/package.json`

---

### Étape 2 : Créer les Utilitaires (30 min)

#### 2.1 Créer `src/utils/searchableText.ts`

**Fichier à créer** : `src/utils/searchableText.ts`

**Contenu** : Voir `IMPLEMENTATION_ALGOLIA.md` section "1. Utilitaires de Normalisation"

**Fonctions** :
- `generateSearchableText()` : Génère le texte de recherche normalisé
- `normalizeText()` : Normalise un texte (minuscules, sans accents)

**Tests** :
- [ ] Créer `src/utils/__tests__/searchableText.test.ts`
- [ ] Tester la génération avec tous les champs (ID, matricule, nom, email, téléphones)

---

### Étape 3 : Créer le Service Algolia Client (1h)

#### 3.1 Créer `src/services/search/AlgoliaSearchService.ts`

**Fichier à créer** : `src/services/search/AlgoliaSearchService.ts`

**Contenu** : Voir `IMPLEMENTATION_ALGOLIA.md` section "2. Service Algolia (Client)"

**Fonctionnalités** :
- Détection automatique de l'environnement
- Recherche avec filtres (isPaid, status)
- Pagination
- Transformation des résultats Algolia → MembershipRequest

**Tests** :
- [ ] Créer `src/services/search/__tests__/AlgoliaSearchService.test.ts`
- [ ] Tester la recherche avec différents filtres
- [ ] Tester la pagination

---

### Étape 4 : Créer le Hook React Query (30 min)

#### 4.1 Créer `src/domains/memberships/hooks/useMembershipSearch.ts`

**Fichier à créer** : `src/domains/memberships/hooks/useMembershipSearch.ts`

**Contenu** : Voir `IMPLEMENTATION_ALGOLIA.md` section "4. Hook React Query"

**Fonctionnalités** :
- Utilise `useQuery` de React Query
- Intègre `AlgoliaSearchService`
- Gère le cache et la mise à jour

**Tests** :
- [ ] Créer `src/domains/memberships/__tests__/hooks/useMembershipSearch.test.ts`
- [ ] Tester avec différents paramètres de recherche

---

### Étape 5 : Créer la Cloud Function de Synchronisation (1h)

#### 5.1 Créer `functions/src/membership-requests/syncToAlgolia.ts`

**Fichier à créer** : `functions/src/membership-requests/syncToAlgolia.ts`

**Contenu** : Voir `IMPLEMENTATION_ALGOLIA.md` section "3. Cloud Functions - Synchronisation"

**Fonctionnalités** :
- Détection automatique de l'environnement (dev/preprod/prod)
- Synchronisation automatique Firestore → Algolia
- Gestion des créations, mises à jour, suppressions
- Génération de `searchableText`

**Configuration Firebase Functions** :
```bash
# Dev
firebase use dev
firebase functions:config:set \
  algolia.app_id="IYE83A0LRH" \
  algolia.admin_api_key="f37a6169f18864759940d3a3125625f2" \
  algolia.index_name="membership-requests-dev"

# Preprod
firebase use preprod
firebase functions:config:set \
  algolia.app_id="IYE83A0LRH" \
  algolia.admin_api_key="f37a6169f18864759940d3a3125625f2" \
  algolia.index_name="membership-requests-preprod"

# Prod
firebase use prod
firebase functions:config:set \
  algolia.app_id="IYE83A0LRH" \
  algolia.admin_api_key="f37a6169f18864759940d3a3125625f2" \
  algolia.index_name="membership-requests-prod"
```

**Exporter la fonction** :
- [ ] Ajouter `export { syncToAlgolia } from './membership-requests/syncToAlgolia'` dans `functions/src/index.ts`

**Tests** :
- [ ] Tester la synchronisation avec Firebase Emulators
- [ ] Vérifier que les documents sont bien indexés dans Algolia

---

### Étape 6 : Intégrer dans MembershipRepositoryV2 (30 min)

#### 6.1 Modifier `src/domains/memberships/repositories/MembershipRepositoryV2.ts`

**Modification** : Utiliser Algolia si disponible, sinon fallback Firestore

**Logique** :
```typescript
async getAll(...): Promise<MembershipRequestsResponse> {
  // Si Algolia est configuré et qu'il y a une recherche, utiliser Algolia
  if (process.env.NEXT_PUBLIC_ALGOLIA_APP_ID && filters.search) {
    const searchService = new AlgoliaSearchService()
    return await searchService.search({
      query: filters.search,
      filters: {
        isPaid: filters.isPaid,
        status: filters.status,
      },
      page,
      hitsPerPage: pageLimit,
    })
  }

  // Sinon, utiliser Firestore (fallback)
  // ... code existant
}
```

**Tests** :
- [ ] Tester avec Algolia configuré
- [ ] Tester le fallback Firestore si Algolia non configuré
- [ ] Tester sans recherche (doit utiliser Firestore)

---

### Étape 7 : Créer le Script de Migration (30 min)

#### 7.1 Créer `scripts/migrate-to-algolia.ts`

**Fichier à créer** : `scripts/migrate-to-algolia.ts`

**Contenu** : Voir `IMPLEMENTATION_ALGOLIA.md` section "Migration des Données Existantes"

**Fonctionnalités** :
- Migration par batch (100 documents)
- Génération de `searchableText` pour chaque document
- Indexation dans Algolia
- Support des 3 environnements (dev/preprod/prod)

**Exécution** :
```bash
# Dev
npx tsx scripts/migrate-to-algolia.ts dev

# Preprod
npx tsx scripts/migrate-to-algolia.ts preprod

# Prod
npx tsx scripts/migrate-to-algolia.ts prod
```

**Tests** :
- [ ] Tester la migration sur un échantillon (10 documents)
- [ ] Vérifier dans Algolia Dashboard que les documents sont indexés
- [ ] Vérifier que `searchableText` contient bien tous les champs (y compris téléphones)

---

### Étape 8 : Déployer les Cloud Functions (15 min)

#### 8.1 Déployer sur chaque environnement

```bash
# Dev
firebase use dev
firebase deploy --only functions:syncToAlgolia

# Preprod
firebase use preprod
firebase deploy --only functions:syncToAlgolia

# Prod
firebase use prod
firebase deploy --only functions:syncToAlgolia
```

**Vérification** :
- [ ] Vérifier les logs Firebase Functions
- [ ] Créer/modifier un document dans Firestore
- [ ] Vérifier dans Algolia Dashboard que le document est synchronisé

---

### Étape 9 : Exécuter la Migration (30 min)

#### 9.1 Migrer les données existantes

**Ordre recommandé** :
1. Dev (tester d'abord)
2. Preprod
3. Prod

**Commandes** :
```bash
# Dev
export ALGOLIA_APP_ID=IYE83A0LRH
export ALGOLIA_ADMIN_API_KEY=f37a6169f18864759940d3a3125625f2
npx tsx scripts/migrate-to-algolia.ts dev

# Preprod
export ALGOLIA_APP_ID=IYE83A0LRH
export ALGOLIA_ADMIN_API_KEY=f37a6169f18864759940d3a3125625f2
npx tsx scripts/migrate-to-algolia.ts preprod

# Prod
export ALGOLIA_APP_ID=IYE83A0LRH
export ALGOLIA_ADMIN_API_KEY=f37a6169f18864759940d3a3125625f2
npx tsx scripts/migrate-to-algolia.ts prod
```

**Vérification** :
- [ ] Vérifier dans Algolia Dashboard le nombre de documents indexés
- [ ] Comparer avec le nombre de documents dans Firestore
- [ ] Tester une recherche dans Algolia Dashboard

---

### Étape 10 : Tests et Validation (1h)

#### 10.1 Tests Unitaires

- [ ] Tests pour `generateSearchableText` (incluant téléphones)
- [ ] Tests pour `AlgoliaSearchService`
- [ ] Tests pour `useMembershipSearch`
- [ ] Tests pour `syncToAlgolia` (mocks)

#### 10.2 Tests d'Intégration

- [ ] Tester la recherche depuis l'UI
- [ ] Tester avec différents termes de recherche (nom, email, téléphone, matricule)
- [ ] Tester avec filtres (isPaid, status)
- [ ] Tester la pagination
- [ ] Tester la synchronisation automatique (créer/modifier un document)

#### 10.3 Tests Manuels

- [ ] Recherche "Jean" → doit trouver "Jean Dupont"
- [ ] Recherche "dupont" → doit trouver "Jean Dupont"
- [ ] Recherche "jean@example.com" → doit trouver par email
- [ ] Recherche "65671734" → doit trouver par téléphone
- [ ] Recherche "1234.MK.5678" → doit trouver par matricule
- [ ] Vérifier que les nouveaux documents sont automatiquement synchronisés

---

### Étape 11 : Mise à Jour de l'UI (30 min)

#### 11.1 Vérifier l'intégration dans `MembershipRequestsPageV2.tsx`

**Vérifications** :
- [ ] La recherche utilise bien Algolia (si configuré)
- [ ] Le fallback Firestore fonctionne si Algolia non configuré
- [ ] Les résultats s'affichent correctement
- [ ] La pagination fonctionne

**Modifications possibles** :
- Aucune modification nécessaire si `MembershipRepositoryV2.getAll()` gère déjà Algolia
- Vérifier que `handleSearch` passe bien le terme de recherche

---

### Étape 12 : Documentation et Monitoring (30 min)

#### 12.1 Documentation

- [ ] Mettre à jour le README principal
- [ ] Documenter les variables d'environnement
- [ ] Documenter le processus de migration

#### 12.2 Monitoring

- [ ] Configurer les alertes Algolia (si nécessaire)
- [ ] Monitorer les logs Firebase Functions
- [ ] Vérifier les analytics Algolia

---

## 📊 Estimation Totale

- **Temps total** : ~6-7 heures
- **Priorité** : P0 (fonctionnalité critique)

---

## 🎯 Ordre d'Exécution Recommandé

1. **Étape 1** : Installation (5 min)
2. **Étape 2** : Utilitaires (30 min)
3. **Étape 3** : Service Algolia (1h)
4. **Étape 4** : Hook React Query (30 min)
5. **Étape 5** : Cloud Function (1h)
6. **Étape 6** : Intégration Repository (30 min)
7. **Étape 7** : Script Migration (30 min)
8. **Étape 8** : Déploiement Functions (15 min)
9. **Étape 9** : Migration Données (30 min)
10. **Étape 10** : Tests (1h)
11. **Étape 11** : UI (30 min)
12. **Étape 12** : Documentation (30 min)

---

## ✅ Checklist Finale

Avant de considérer l'implémentation terminée :

- [ ] Toutes les dépendances installées
- [ ] Tous les fichiers créés
- [ ] Tous les tests passent
- [ ] Cloud Functions déployées sur les 3 environnements
- [ ] Migration exécutée sur les 3 environnements
- [ ] Recherche fonctionne depuis l'UI
- [ ] Synchronisation automatique fonctionne
- [ ] Documentation à jour
- [ ] Monitoring configuré

---

## 🚀 Prochaine Étape Immédiate

**Commencer par l'Étape 1** : Installation des dépendances

```bash
pnpm add algoliasearch
cd functions && pnpm add algoliasearch && cd ..
```

Ensuite, suivre les étapes dans l'ordre.
