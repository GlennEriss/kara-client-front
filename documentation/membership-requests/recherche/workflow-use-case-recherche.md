# Workflow - Use Case "Recherche Avancée avec Algolia"

> Workflow d'implémentation spécifique pour la fonctionnalité **"Recherche Avancée avec Algolia"** (Membership Requests)
> 
> Ce workflow suit la structure générale de `documentation/general/WORKFLOW.md` mais est adapté spécifiquement à cette fonctionnalité.

---

## 📋 Vue d'ensemble

**Use Case** : UC-MEM-007 - Recherche avancée dans les demandes d'adhésion avec Algolia

**Acteurs** :
- **Admin KARA** : Recherche des demandes d'adhésion par nom, email, téléphone, matricule

**Scope** :
- Recherche full-text avec typo tolerance
- Recherche multi-champs (nom, email, téléphone, matricule)
- Filtres (isPaid, status) avec pagination
- Synchronisation automatique Firestore → Algolia
- Fallback Firestore si Algolia indisponible

---

## 📚 Documentation de Référence

### Documentation Technique
- **Analyse** : `documentation/membership-requests/recherche/ANALYSE_RECHERCHE.md` (Limitations Firestore, solutions)
- **Architecture** : `documentation/membership-requests/recherche/ARCHITECTURE_RECHERCHE.md` (Clean Architecture)
- **Recommandations** : `documentation/membership-requests/recherche/RECOMMANDATIONS.md` (Décision Algolia)
- **Setup Algolia** : `documentation/membership-requests/recherche/ALGOLIA_SETUP.md` (Configuration)
- **Multi-environnements** : `documentation/membership-requests/recherche/MULTI_ENVIRONNEMENTS_ALGOLIA.md` (Dev/Preprod/Prod)
- **Variables d'environnement** : `documentation/membership-requests/recherche/VARIABLES_ENV_ALGOLIA.md`
- **searchableText** : `documentation/membership-requests/recherche/SEARCHABLETEXT_ALGOLIA.md` (Rôle et utilisation)
- **Implémentation** : `documentation/membership-requests/recherche/IMPLEMENTATION_ALGOLIA.md` (Code détaillé)
- **Plan d'action** : `documentation/membership-requests/recherche/PLAN_ACTION.md` (Checklist)

---

## 🎯 Architecture V2 - Domaines

### Structure du Code

```
src/
├── utils/
│   └── searchableText.ts                  # Génération searchableText (ID, matricule, nom, email, téléphones)
│
├── services/
│   └── search/
│       └── AlgoliaSearchService.ts         # Service client Algolia
│           - search()                      # Recherche avec filtres et pagination
│           - transformHit()                 # Transformation Algolia → MembershipRequest
│
├── domains/
│   └── memberships/
│       ├── repositories/
│       │   └── MembershipRepositoryV2.ts
│       │       - getAll()                  # Utilise Algolia si configuré + recherche, sinon Firestore
│       │
│       └── hooks/
│           └── useMembershipSearch.ts      # Hook React Query pour recherche Algolia
│               - useMembershipSearch()     # Recherche avec cache
│
└── functions/
    └── src/
        └── membership-requests/
            └── syncToAlgolia.ts            # Cloud Function synchronisation Firestore → Algolia
                - syncToAlgolia()           # Trigger onWrite (create/update/delete)

└── scripts/
    └── migrate-to-algolia.ts               # Script migration données existantes
```

---

## 📝 Workflow d'Implémentation

### Étape 0 — Vérification Préalable

**Avant de commencer, vérifier** :
- [x] Compte Algolia créé
- [x] 3 index créés (`membership-requests-dev`, `membership-requests-preprod`, `membership-requests-prod`)
- [x] Configuration des index (attributs de recherche, facets, ranking)
- [x] Variables d'environnement ajoutées dans `.env.dev`, `.env.preview`, `.env.prod`
- [ ] Architecture V2 comprise (domains, repositories, services, hooks)
- [ ] Documentation technique lue et comprise

**Références** :
- `documentation/general/WORKFLOW.md` — Workflow général
- `documentation/architecture/ARCHITECTURE.md` — Architecture technique
- `documentation/membership-requests/recherche/` — Documentation complète

---

### Étape 1 — Créer la Branche Git

Depuis `develop` :
```bash
git checkout develop
git pull
git checkout -b feat/membership-request-search-algolia
```

**Convention** : `feat/membership-request-search-algolia`

---

### Étape 2 — Installation des Dépendances

**Objectif** : Installer `algoliasearch` dans le projet client et les Cloud Functions

**Commandes** :
```bash
# Client (Next.js)
pnpm add algoliasearch

# Cloud Functions
cd functions
pnpm add algoliasearch
cd ..
```

**Vérification** :
- [ ] `algoliasearch` dans `package.json` (dependencies)
- [ ] `algoliasearch` dans `functions/package.json` (dependencies)

**Références** :
- `documentation/membership-requests/recherche/IMPLEMENTATION_ALGOLIA.md` § Installation

---

### Étape 3 — Implémenter les Utilitaires (Phase 1)

**Objectif** : Créer la fonction de génération de `searchableText`

**Fichiers à créer** :
- `src/utils/searchableText.ts`

**Fichiers de tests à créer** :
- `src/utils/__tests__/searchableText.test.ts`

**Références** :
- `documentation/membership-requests/recherche/IMPLEMENTATION_ALGOLIA.md` § "1. Utilitaires de Normalisation"
- `documentation/membership-requests/recherche/SEARCHABLETEXT_ALGOLIA.md` (Rôle et exemples)

**Checklist** :
- [ ] `generateSearchableText(data)` : Génère texte normalisé avec :
  - ID du document
  - Matricule
  - Prénom
  - Nom
  - Nom complet (prénom + nom)
  - Email
  - **Tous les numéros de téléphone** (normalisés : sans espaces, tirets, parenthèses)
- [ ] `normalizeText(text)` : Normalise texte (minuscules, sans accents)
- [ ] Gestion des cas null/undefined
- [ ] Gestion des tableaux vides

**Tests** :
- [ ] Test avec tous les champs remplis
- [ ] Test avec champs manquants (null/undefined)
- [ ] Test avec plusieurs téléphones
- [ ] Test normalisation (accents, majuscules)
- [ ] Test normalisation téléphones (espaces, tirets, parenthèses)

**Exemple de test** :
```typescript
it('devrait générer searchableText avec tous les champs incluant téléphones', () => {
  const result = generateSearchableText({
    id: '1234.MK.5678',
    matricule: '1234.MK.5678',
    identity: {
      firstName: 'Jean',
      lastName: 'Dupont',
      email: 'jean@example.com',
      contacts: ['+241 65 67 17 34', '65671734'],
    },
  })
  
  expect(result).toContain('1234.mk.5678')
  expect(result).toContain('jean')
  expect(result).toContain('dupont')
  expect(result).toContain('jean dupont')
  expect(result).toContain('jean@example.com')
  expect(result).toContain('+24165671734')
  expect(result).toContain('65671734')
})
```

---

### Étape 4 — Créer le Service Algolia Client (Phase 2)

**Objectif** : Créer le service client pour interagir avec Algolia

**Fichiers à créer** :
- `src/services/search/AlgoliaSearchService.ts`

**Fichiers de tests à créer** :
- `src/services/search/__tests__/AlgoliaSearchService.test.ts`

**Références** :
- `documentation/membership-requests/recherche/IMPLEMENTATION_ALGOLIA.md` § "2. Service Algolia (Client)"
- `documentation/membership-requests/recherche/MULTI_ENVIRONNEMENTS_ALGOLIA.md` (Détection environnement)

**Checklist** :
- [ ] Détection automatique de l'environnement (dev/preprod/prod)
- [ ] Initialisation client Algolia avec variables d'environnement
- [ ] `search(options)` : Recherche avec :
  - Query (terme de recherche)
  - Filtres (isPaid, status)
  - Pagination (page, hitsPerPage)
- [ ] `transformHit(hit)` : Transformation Algolia hit → MembershipRequest
- [ ] Gestion des erreurs (fallback, retry)
- [ ] Types TypeScript complets

**Tests** :
- [ ] Test recherche avec query
- [ ] Test recherche avec filtres (isPaid, status)
- [ ] Test pagination
- [ ] Test transformation hit → MembershipRequest
- [ ] Test gestion erreurs
- [ ] Test détection environnement

**Exemple de test** :
```typescript
it('devrait rechercher avec filtres et pagination', async () => {
  const service = new AlgoliaSearchService()
  const result = await service.search({
    query: 'jean',
    filters: {
      isPaid: true,
      status: 'pending',
    },
    page: 2,
    hitsPerPage: 20,
  })
  
  expect(result.items).toBeInstanceOf(Array)
  expect(result.pagination.page).toBe(2)
  expect(result.pagination.limit).toBe(20)
})
```

---

### Étape 5 — Créer le Hook React Query (Phase 3)

**Objectif** : Créer le hook React Query pour la recherche

**Fichiers à créer** :
- `src/domains/memberships/hooks/useMembershipSearch.ts`

**Fichiers de tests à créer** :
- `src/domains/memberships/__tests__/hooks/useMembershipSearch.test.ts`

**Références** :
- `documentation/membership-requests/recherche/IMPLEMENTATION_ALGOLIA.md` § "4. Hook React Query"

**Checklist** :
- [ ] `useMembershipSearch(options)` : Hook React Query
  - Utilise `useQuery` de React Query
  - Intègre `AlgoliaSearchService`
  - Gère le cache (staleTime, gcTime)
  - Gère les erreurs
- [ ] Types TypeScript complets
- [ ] Gestion du loading state
- [ ] Gestion du error state

**Tests** :
- [ ] Test avec différents paramètres de recherche
- [ ] Test cache (staleTime)
- [ ] Test refetch
- [ ] Test gestion erreurs

---

### Étape 6 — Créer la Cloud Function de Synchronisation (Phase 4)

**Objectif** : Créer la Cloud Function qui synchronise automatiquement Firestore → Algolia

**Fichiers à créer** :
- `functions/src/membership-requests/syncToAlgolia.ts`

**Fichiers à modifier** :
- `functions/src/index.ts` (exporter la fonction)

**Références** :
- `documentation/membership-requests/recherche/IMPLEMENTATION_ALGOLIA.md` § "3. Cloud Functions - Synchronisation"
- `documentation/membership-requests/recherche/MULTI_ENVIRONNEMENTS_ALGOLIA.md` (Configuration Firebase Functions)

**Checklist** :
- [ ] `syncToAlgolia` : Cloud Function `onWrite` (create/update/delete)
- [ ] Détection automatique de l'environnement (dev/preprod/prod)
- [ ] Génération `searchableText` avec `generateSearchableText`
- [ ] Gestion création : Indexer dans Algolia
- [ ] Gestion mise à jour : Mettre à jour dans Algolia
- [ ] Gestion suppression : Supprimer de Algolia
- [ ] Gestion erreurs (logs, retry)
- [ ] Ignorer si document inchangé (éviter boucles)

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

**Tests** :
- [ ] Test création document → indexation Algolia
- [ ] Test mise à jour document → mise à jour Algolia
- [ ] Test suppression document → suppression Algolia
- [ ] Test génération searchableText
- [ ] Test détection environnement
- [ ] Test gestion erreurs

**Exporter dans `functions/src/index.ts`** :
```typescript
export { syncToAlgolia } from './membership-requests/syncToAlgolia'
```

---

### Étape 7 — Intégrer dans MembershipRepositoryV2 (Phase 5)

**Objectif** : Modifier `getAll()` pour utiliser Algolia si configuré et recherche active, sinon Firestore

**Fichiers à modifier** :
- `src/domains/memberships/repositories/MembershipRepositoryV2.ts`

**Fichiers de tests à modifier** :
- `src/domains/memberships/__tests__/unit/repositories/MembershipRepositoryV2.test.ts`

**Références** :
- `documentation/membership-requests/recherche/IMPLEMENTATION_ALGOLIA.md` § "5. Intégration dans MembershipRepositoryV2"

**Checklist** :
- [ ] Modifier `getAll()` :
  - Si Algolia configuré (`NEXT_PUBLIC_ALGOLIA_APP_ID`) ET recherche active (`filters.search`) → utiliser Algolia
  - Sinon → utiliser Firestore (fallback)
- [ ] Importer `AlgoliaSearchService`
- [ ] Transformer les filtres Firestore → Algolia
- [ ] Gérer les erreurs Algolia (fallback Firestore)
- [ ] Conserver la compatibilité avec le code existant

**Logique** :
```typescript
async getAll(filters, page, pageLimit): Promise<MembershipRequestsResponse> {
  // Si Algolia est configuré et qu'il y a une recherche, utiliser Algolia
  if (process.env.NEXT_PUBLIC_ALGOLIA_APP_ID && filters.search) {
    try {
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
    } catch (error) {
      console.error('Erreur Algolia, fallback Firestore:', error)
      // Fallback Firestore
    }
  }

  // Sinon, utiliser Firestore (code existant)
  // ... code Firestore existant
}
```

**Tests** :
- [ ] Test avec Algolia configuré + recherche → utilise Algolia
- [ ] Test avec Algolia configuré + pas de recherche → utilise Firestore
- [ ] Test sans Algolia configuré → utilise Firestore
- [ ] Test erreur Algolia → fallback Firestore
- [ ] Test compatibilité avec code existant

---

### Étape 8 — Créer le Script de Migration (Phase 6)

**Objectif** : Créer le script pour migrer les données existantes vers Algolia

**Fichiers à créer** :
- `scripts/migrate-to-algolia.ts`

**Références** :
- `documentation/membership-requests/recherche/IMPLEMENTATION_ALGOLIA.md` § "Migration des Données Existantes"
- `documentation/membership-requests/recherche/MULTI_ENVIRONNEMENTS_ALGOLIA.md` (Variables d'environnement)

**Checklist** :
- [ ] Support des 3 environnements (dev/preprod/prod)
- [ ] Migration par batch (100 documents)
- [ ] Génération `searchableText` pour chaque document
- [ ] Indexation dans Algolia
- [ ] Barre de progression (console)
- [ ] Gestion erreurs (continue en cas d'erreur)
- [ ] Statistiques finales (total, succès, erreurs)

**Exécution** :
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

**Tests** :
- [ ] Test migration sur échantillon (10 documents)
- [ ] Vérifier dans Algolia Dashboard que les documents sont indexés
- [ ] Vérifier que `searchableText` contient tous les champs (y compris téléphones)

---

### Étape 9 — Déployer les Cloud Functions (Phase 7)

**Objectif** : Déployer `syncToAlgolia` sur les 3 environnements

**Commandes** :
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

### Étape 10 — Exécuter la Migration (Phase 8)

**Objectif** : Migrer les données existantes vers Algolia

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

### Étape 11 — Tests et Validation (Phase 9)

**Objectif** : Tester l'implémentation complète

#### 11.1 Tests Unitaires

**Fichiers de tests** :
- `src/utils/__tests__/searchableText.test.ts`
- `src/services/search/__tests__/AlgoliaSearchService.test.ts`
- `src/domains/memberships/__tests__/hooks/useMembershipSearch.test.ts`

**Checklist** :
- [ ] Tests pour `generateSearchableText` (incluant téléphones)
- [ ] Tests pour `AlgoliaSearchService`
- [ ] Tests pour `useMembershipSearch`
- [ ] Tests pour `syncToAlgolia` (mocks)

#### 11.2 Tests d'Intégration

**Checklist** :
- [ ] Tester la recherche depuis l'UI
- [ ] Tester avec différents termes de recherche (nom, email, téléphone, matricule)
- [ ] Tester avec filtres (isPaid, status)
- [ ] Tester la pagination
- [ ] Tester la synchronisation automatique (créer/modifier un document)

#### 11.3 Tests Manuels

**Checklist** :
- [ ] Recherche "Jean" → doit trouver "Jean Dupont"
- [ ] Recherche "dupont" → doit trouver "Jean Dupont"
- [ ] Recherche "jean@example.com" → doit trouver par email
- [ ] Recherche "65671734" → doit trouver par téléphone
- [ ] Recherche "+24165671734" → doit trouver par téléphone
- [ ] Recherche "1234.MK.5678" → doit trouver par matricule
- [ ] Vérifier que les nouveaux documents sont automatiquement synchronisés
- [ ] Vérifier le fallback Firestore si Algolia indisponible

---

### Étape 12 — Mise à Jour de l'UI (Phase 10)

**Objectif** : Vérifier que l'intégration dans l'UI fonctionne correctement

**Fichiers à vérifier** :
- `src/domains/memberships/components/page/MembershipRequestsPageV2.tsx`

**Vérifications** :
- [ ] La recherche utilise bien Algolia (si configuré)
- [ ] Le fallback Firestore fonctionne si Algolia non configuré
- [ ] Les résultats s'affichent correctement
- [ ] La pagination fonctionne
- [ ] Les filtres fonctionnent

**Modifications possibles** :
- Aucune modification nécessaire si `MembershipRepositoryV2.getAll()` gère déjà Algolia
- Vérifier que `handleSearch` passe bien le terme de recherche

---

### Étape 13 — Documentation et Monitoring (Phase 11)

**Objectif** : Finaliser la documentation et configurer le monitoring

**Documentation** :
- [ ] Mettre à jour le README principal si nécessaire
- [ ] Documenter les variables d'environnement
- [ ] Documenter le processus de migration

**Monitoring** :
- [ ] Configurer les alertes Algolia (si nécessaire)
- [ ] Monitorer les logs Firebase Functions
- [ ] Vérifier les analytics Algolia

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
- [ ] Fallback Firestore fonctionne
- [ ] Documentation à jour
- [ ] Monitoring configuré

---

## 🎯 Definition of Done

L'implémentation est terminée quand :

1. ✅ **Code** : Tous les fichiers créés et fonctionnels
2. ✅ **Tests** : Tests unitaires et d'intégration passent
3. ✅ **Déploiement** : Cloud Functions déployées sur les 3 environnements
4. ✅ **Migration** : Données migrées vers Algolia sur les 3 environnements
5. ✅ **Validation** : Recherche fonctionne depuis l'UI avec tous les cas de test
6. ✅ **Documentation** : Documentation à jour
7. ✅ **Monitoring** : Monitoring configuré

---

## 📊 Estimation Totale

- **Temps total** : ~6-7 heures
- **Priorité** : P0 (fonctionnalité critique)

---

## 🚀 Prochaine Étape Immédiate

**Commencer par l'Étape 1** : Créer la branche Git

```bash
git checkout develop
git pull
git checkout -b feat/membership-request-search-algolia
```

Ensuite, suivre les étapes dans l'ordre.
