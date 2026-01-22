# Documentation d'Implémentation Algolia pour Members

> Guide complet de l'implémentation Algolia pour le module Members (collection `users`)

## Table des matières

1. [Vue d'ensemble de l'implémentation](#vue-densemble-de-limplémentation)
2. [Architecture technique](#architecture-technique)
3. [Composants implémentés](#composants-implémentés)
4. [Guide de migration](#guide-de-migration)
5. [Tests](#tests)
6. [Dépannage](#dépannage)
7. [Bonnes pratiques](#bonnes-pratiques)

---

## Vue d'ensemble de l'implémentation

### Statut d'implémentation

✅ **Tous les composants sont implémentés et testés**

| Composant | Statut | Fichier |
|-----------|--------|---------|
| Configuration Algolia | ✅ | `documentation/memberships/V2/algolia/index-setting.json` |
| Utilitaires de recherche | ✅ | `src/utils/memberSearchableText.ts` |
| Service de recherche | ✅ | `src/services/search/MembersAlgoliaSearchService.ts` |
| Cloud Function sync | ✅ | `functions/src/members/syncMembersToAlgolia.ts` |
| Script de migration | ✅ | `scripts/migrate-members-to-algolia.ts` |
| Repository V2 | ✅ | `src/domains/memberships/repositories/MembersRepositoryV2.ts` |
| Hook React Query | ✅ | `src/domains/memberships/hooks/useMembersSearch.ts` |
| Tests unitaires | ✅ | `src/utils/__tests__/memberSearchableText.test.ts` |
| Tests service | ✅ | `src/services/search/__tests__/MembersAlgoliaSearchService.test.ts` |
| Tests hook | ✅ | `src/domains/memberships/hooks/__tests__/useMembersSearch.test.tsx` |

### Flux de données complet

```
┌─────────────────────────────────────────────────────────────────┐
│                    FIRESTORE (users)                           │
│  - Membres validés (rôles: Adherant, Bienfaiteur, Sympathisant)│
└────────────────────────────┬───────────────────────────────────┘
                             │
                             │ onDocumentWritten
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│         CLOUD FUNCTION: syncMembersToAlgolia                   │
│  - Génère searchableText                                       │
│  - Indexe/Supprime dans Algolia                                │
│  - Gère les changements de rôle (admin → membre)                │
└────────────────────────────┬───────────────────────────────────┘
                             │
                             │ API Algolia (Admin Key)
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    ALGOLIA INDEX                               │
│  Index: members-{env}                                          │
│  - searchableText (champ principal)                            │
│  - Facets: membershipType, isActive, gender, hasCar, etc.       │
│  - Replicas: members-{env}_name_asc (tri par nom)              │
└────────────────────────────┬───────────────────────────────────┘
                             │
                             │ Search API (Search Key)
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│              FRONTEND (React/Next.js)                            │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  MembersAlgoliaSearchService                              │  │
│  │  - search(query, filters, pagination)                     │  │
│  │  - Récupère objectIDs → Fetch Firestore                    │  │
│  └──────────────────────┬─────────────────────────────────────┘  │
│                         │                                        │
│  ┌──────────────────────▼─────────────────────────────────────┐  │
│  │  useMembersSearch (React Query Hook)                      │  │
│  │  - Cache (30s staleTime, 5min gcTime)                     │  │
│  │  - Gestion loading/error                                   │  │
│  │  - Condition: query >= 2 caractères ou vide                │  │
│  └──────────────────────┬─────────────────────────────────────┘  │
│                         │                                        │
│  ┌──────────────────────▼─────────────────────────────────────┐  │
│  │  MembersRepositoryV2                                       │  │
│  │  - Stratégie hybride: Algolia si searchQuery, sinon Firestore│
│  └────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Architecture technique

### 1. Génération du searchableText

**Fichier** : `src/utils/memberSearchableText.ts`

Le `searchableText` est un champ agrégé qui contient tous les champs de recherche normalisés :

```typescript
// Exemple de searchableText généré
"0004.mk.040825 jean dupont jean dupont jean.dupont@kara.ga +24165671734 065671734 kara gabon ingenieur estuaire libreville libreville 1er quartier a"
```

**Fonctions principales** :

- `normalizeText(text: string)`: Normalise un texte (minuscules, suppression accents, trim)
- `generateMemberSearchableText(data: MemberSearchableTextData)`: Génère le texte de recherche complet
- `extractMemberSearchableData(data: any)`: Extrait les données depuis Firestore

**Champs inclus dans searchableText** :
- Matricule
- Prénom
- Nom
- Nom complet (prénom + nom)
- Email
- Téléphones (normalisés : suppression espaces, tirets, parenthèses)
- Entreprise (companyName)
- Profession
- Province, Ville, Arrondissement, Quartier

### 2. Service de recherche Algolia

**Fichier** : `src/services/search/MembersAlgoliaSearchService.ts`

**Fonctionnalités** :
- Détection automatique de l'environnement (dev/preprod/prod)
- Résolution du nom d'index selon l'environnement et le tri
- Recherche avec filtres (facets) et pagination
- Récupération des données complètes depuis Firestore

**Méthodes principales** :

```typescript
class MembersAlgoliaSearchService {
  // Recherche avec options
  async search(options: MembersSearchOptions): Promise<MembersSearchResult>
  
  // Vérifier si Algolia est disponible
  isAvailable(): boolean
  
  // Obtenir le nom d'index selon le tri
  getIndexName(sortBy?: MembersSortBy): string
}
```

**Filtres Algolia (facets)** :
- `membershipType`: Type de membre (adherant, bienfaiteur, sympathisant)
- `roles`: Rôles (OR entre les rôles)
- `isActive`: Statut actif (boolean)
- `gender`: Genre (M/F)
- `hasCar`: Possession de voiture (boolean)
- `province`, `city`, `arrondissement`: Adresse
- `companyId`, `professionId`: IDs professionnels (pour filtrage précis)

**Recherche textuelle** :
- `searchQuery`: Recherche dans `searchableText`
- `companyName`, `profession`, `district`: Ajoutés à la query (recherche textuelle)

### 3. Cloud Function de synchronisation

**Fichier** : `functions/src/members/syncMembersToAlgolia.ts`

**Trigger** : `onDocumentWritten` sur la collection `users`

**Logique** :

```typescript
// Cas 1: Document supprimé OU membre devient admin
if (!afterData || (wasMember && !isMemberNow)) {
  await client.deleteObject({ indexName, objectID: userId })
}

// Cas 2: Document créé/modifié ET c'est un membre
if (afterData && isMemberNow) {
  const searchableText = generateMemberSearchableText(afterData)
  await client.saveObject({ indexName, body: algoliaObject })
}

// Cas 3: Document créé/modifié mais ce n'est pas un membre → ignoré
```

**Optimisation** : Compare les champs pertinents avant de synchroniser pour éviter les mises à jour inutiles.

### 4. Repository V2 (stratégie hybride)

**Fichier** : `src/domains/memberships/repositories/MembersRepositoryV2.ts`

**Stratégie** :

```typescript
async getAll(filters: UserFilters, page: number, limit: number) {
  // Si recherche textuelle → Algolia
  if (filters.searchQuery && filters.searchQuery.trim().length > 0) {
    return this.getAllWithAlgolia(filters, page, limit)
  }
  
  // Sinon → Firestore (plus rapide pour filtres simples)
  return getMembers(filters, page, limit)
}
```

**Mapping UserFilters → Algolia** :

| UserFilters | Algolia | Type |
|-------------|---------|------|
| `searchQuery` | `query` | Recherche textuelle |
| `companyName` | `query` | Recherche textuelle |
| `profession` | `query` | Recherche textuelle |
| `district` | `query` | Recherche textuelle |
| `membershipType[0]` | `filters.membershipType` | Facet |
| `isActive` | `filters.isActive` | Facet |
| `hasCar` | `filters.hasCar` | Facet |
| `province` | `filters.province` | Facet |
| `city` | `filters.city` | Facet |
| `arrondissement` | `filters.arrondissement` | Facet |

### 5. Hook React Query

**Fichier** : `src/domains/memberships/hooks/useMembersSearch.ts`

**Fonctionnalités** :
- Cache React Query (30s staleTime, 5min gcTime)
- Condition d'activation : `query.length >= 2 || query.length === 0`
- Désactivation si Algolia non disponible
- Support de `enabled` optionnel

**Hooks disponibles** :

```typescript
// Hook principal
useMembersSearch(options: UseMembersSearchOptions)

// Hook de compatibilité avec UserFilters
useMembersSearchWithUserFilters(filters: UserFilters, page, limit, enabled)
```

---

## Composants implémentés

### 1. Utilitaires (`src/utils/memberSearchableText.ts`)

**Exports** :
- `generateMemberSearchableText(data)`: Génère le texte de recherche
- `normalizeText(text)`: Normalise un texte
- `extractMemberSearchableData(data)`: Extrait depuis Firestore
- `MemberSearchableTextData`: Interface TypeScript

**Tests** : `src/utils/__tests__/memberSearchableText.test.ts`

### 2. Service de recherche (`src/services/search/MembersAlgoliaSearchService.ts`)

**Exports** :
- `MembersAlgoliaSearchService`: Classe principale
- `getMembersAlgoliaSearchService()`: Singleton
- `MembersSearchOptions`, `MembersSearchFilters`, `MembersSearchResult`: Types

**Tests** : `src/services/search/__tests__/MembersAlgoliaSearchService.test.ts`

### 3. Cloud Function (`functions/src/members/syncMembersToAlgolia.ts`)

**Exports** :
- `syncMembersToAlgolia`: Cloud Function trigger

**Configuration** :
- Memory: 256MiB
- Timeout: 60s
- Trigger: `onDocumentWritten` sur `users/{userId}`

### 4. Script de migration (`scripts/migrate-members-to-algolia.ts`)

**Fonctionnalités** :
- Migration par batch (1000 documents)
- Génération de `searchableText` pour chaque membre
- Options : `--dry-run`, `--clear-index`
- Statistiques détaillées

**Usage** :
```bash
# Migration dev
npx tsx scripts/migrate-members-to-algolia.ts dev

# Test sans indexation
npx tsx scripts/migrate-members-to-algolia.ts dev --dry-run

# Migration avec vidage de l'index
npx tsx scripts/migrate-members-to-algolia.ts dev --clear-index
```

**Documentation** : `scripts/MIGRATE_MEMBERS_README.md`

### 5. Repository V2 (`src/domains/memberships/repositories/MembersRepositoryV2.ts`)

**Méthodes** :
- `getAll(filters, page, limit)`: Stratégie hybride Algolia/Firestore
- `getAllWithAlgolia(filters, page, limit)`: Recherche Algolia uniquement

### 6. Hook React Query (`src/domains/memberships/hooks/useMembersSearch.ts`)

**Hooks** :
- `useMembersSearch(options)`: Hook principal
- `useMembersSearchWithUserFilters(filters, page, limit, enabled)`: Compatibilité

**Tests** : `src/domains/memberships/hooks/__tests__/useMembersSearch.test.tsx`

---

## Guide de migration

### Prérequis

1. **Variables d'environnement Algolia** :
   ```bash
   export ALGOLIA_APP_ID=VOTRE_APP_ID
   export ALGOLIA_WRITE_API_KEY=votre_admin_key
   ```

2. **Accès Firebase** :
   - Variables d'environnement OU fichier service account dans `service-accounts/`

### Étapes de migration

#### 1. Configuration Algolia

- [x] Créer les index `members-dev`, `members-preprod`, `members-prod`
- [x] Appliquer la configuration JSON (`index-setting.json`)
- [x] Créer les replicas pour le tri (optionnel)

#### 2. Migration des données

**Environnement DEV** :
```bash
# 1. Test (dry-run)
npx tsx scripts/migrate-members-to-algolia.ts dev --dry-run

# 2. Migration réelle
npx tsx scripts/migrate-members-to-algolia.ts dev
```

**Environnement PROD** :
```bash
# 1. Test (dry-run)
npx tsx scripts/migrate-members-to-algolia.ts prod --dry-run

# 2. Migration réelle
npx tsx scripts/migrate-members-to-algolia.ts prod
```

#### 3. Vérification

1. **Dashboard Algolia** :
   - Aller dans **Indices** → `members-{env}`
   - Cliquer sur **Browse**
   - Vérifier que les documents sont présents
   - Tester une recherche (ex: "jean dupont")

2. **Application** :
   - Tester la recherche dans l'interface
   - Vérifier les filtres
   - Vérifier la pagination

#### 4. Déploiement Cloud Function

```bash
# Déployer la Cloud Function
firebase deploy --only functions:syncMembersToAlgolia
```

**Note** : La Cloud Function synchronisera automatiquement les nouveaux membres et les modifications.

---

## Tests

### Exécution des tests

```bash
# Tous les tests
npm run test

# Tests spécifiques Algolia
npm run test -- memberSearchableText
npm run test -- MembersAlgoliaSearchService
npm run test -- useMembersSearch

# Tests avec couverture
npm run test:coverage
```

### Couverture des tests

#### 1. Tests utilitaires (`memberSearchableText.test.ts`)

**Couverture** :
- ✅ Normalisation des textes (accents, casse, espaces)
- ✅ Génération avec tous les champs
- ✅ Gestion des champs manquants
- ✅ Normalisation des téléphones
- ✅ Extraction depuis Firestore

#### 2. Tests service (`MembersAlgoliaSearchService.test.ts`)

**Couverture** :
- ✅ Disponibilité Algolia
- ✅ Résolution des noms d'index
- ✅ Recherche avec résultats vides
- ✅ Construction des filtres (AND/OR)
- ✅ Conversion pagination
- ✅ Récupération depuis Firestore
- ✅ Filtres multiples

#### 3. Tests hook (`useMembersSearch.test.tsx`)

**Couverture** :
- ✅ Appel du service avec les bonnes options
- ✅ Désactivation si query < 2 caractères
- ✅ Activation si query vide ou >= 2 caractères
- ✅ Valeurs par défaut
- ✅ Désactivation si Algolia non disponible
- ✅ Mapping UserFilters → MembersSearchFilters

---

## Dépannage

### Problèmes courants

#### 1. Algolia non disponible

**Symptôme** : `isAvailable()` retourne `false`

**Solutions** :
- Vérifier les variables d'environnement :
  ```bash
  echo $NEXT_PUBLIC_ALGOLIA_APP_ID
  echo $NEXT_PUBLIC_ALGOLIA_SEARCH_API_KEY
  ```
- Vérifier que les variables sont définies dans `.env.local`

#### 2. Aucun résultat de recherche

**Symptôme** : La recherche ne retourne aucun résultat

**Solutions** :
- Vérifier que l'index Algolia contient des données (Dashboard Algolia)
- Vérifier que `searchableText` est bien généré (inspecter un document dans Algolia)
- Vérifier les filtres appliqués (console.log dans le service)

#### 3. Erreur lors de la migration

**Symptôme** : Le script de migration échoue

**Solutions** :
- Vérifier les variables d'environnement Algolia
- Vérifier l'accès Firebase (service account ou variables d'env)
- Vérifier les logs d'erreur détaillés dans la console
- Utiliser `--dry-run` pour tester sans indexer

#### 4. Cloud Function ne synchronise pas

**Symptôme** : Les nouveaux membres ne sont pas indexés

**Solutions** :
- Vérifier que la Cloud Function est déployée :
  ```bash
  firebase functions:list
  ```
- Vérifier les logs de la Cloud Function :
  ```bash
  firebase functions:log --only syncMembersToAlgolia
  ```
- Vérifier que le trigger est bien configuré sur `users/{userId}`

#### 5. Filtres ne fonctionnent pas

**Symptôme** : Les filtres Algolia ne retournent pas les bons résultats

**Solutions** :
- Vérifier que les champs sont bien configurés comme facets dans Algolia
- Vérifier la syntaxe des filtres (console.log dans `buildAlgoliaFilters`)
- Vérifier que les valeurs des filtres correspondent aux valeurs indexées

---

## Bonnes pratiques

### 1. Recherche textuelle

✅ **À faire** :
- Utiliser Algolia pour les recherches avec `searchQuery`
- Combiner `searchQuery` avec `companyName` et `profession` dans la query
- Utiliser Firestore pour les requêtes sans recherche textuelle

❌ **À éviter** :
- Utiliser Algolia pour des filtres simples sans recherche textuelle
- Rechercher avec moins de 2 caractères (sauf query vide)

### 2. Filtres

✅ **À faire** :
- Utiliser les facets pour les filtres précis (membershipType, isActive, etc.)
- Utiliser la recherche textuelle pour les champs dans `searchableText` (companyName, profession)
- Combiner les filtres avec AND pour des résultats précis

❌ **À éviter** :
- Utiliser des filtres sur des champs non configurés comme facets
- Utiliser trop de filtres OR (peut ralentir la recherche)

### 3. Pagination

✅ **À faire** :
- Utiliser la pagination par page (1-based) pour Algolia
- Limiter à 20-50 résultats par page
- Utiliser les curseurs Firestore pour les requêtes sans recherche

❌ **À éviter** :
- Paginer avec des curseurs sur Algolia (non supporté)
- Récupérer trop de résultats par page (> 100)

### 4. Performance

✅ **À faire** :
- Utiliser le cache React Query (30s staleTime)
- Désactiver la requête si Algolia n'est pas disponible
- Utiliser `enabled: false` pour désactiver temporairement

❌ **À éviter** :
- Faire des requêtes à chaque keystroke (utiliser debounce)
- Récupérer tous les champs depuis Algolia (utiliser `attributesToRetrieve: ['objectID']`)

### 5. Tests

✅ **À faire** :
- Tester les fonctions utilitaires isolément
- Mocker Algolia et Firestore dans les tests
- Tester les cas limites (query vide, Algolia non disponible, etc.)

❌ **À éviter** :
- Faire des appels réels à Algolia dans les tests unitaires
- Tester sans mocks (peut être lent et instable)

---

## Ressources

- [Documentation Algolia principale](../README.md)
- [Configuration Algolia](./index-setting.json)
- [Script de migration](../../../../../scripts/migrate-members-to-algolia.ts)
- [Guide de migration](../../../../../scripts/MIGRATE_MEMBERS_README.md)
- [Documentation Algolia officielle](https://www.algolia.com/doc/)
- [Firebase Functions v2](https://firebase.google.com/docs/functions/get-started?gen=2nd)

---

## Checklist finale

- [x] Configuration Algolia (index, settings, replicas)
- [x] Utilitaires de recherche (`memberSearchableText.ts`)
- [x] Service de recherche (`MembersAlgoliaSearchService.ts`)
- [x] Cloud Function (`syncMembersToAlgolia.ts`)
- [x] Script de migration (`migrate-members-to-algolia.ts`)
- [x] Repository V2 (stratégie hybride)
- [x] Hook React Query (`useMembersSearch.ts`)
- [x] Tests unitaires (utilitaires, service, hook)
- [x] Documentation complète
- [x] Migration des données (dev/prod)
- [x] Déploiement Cloud Function

**Statut** : ✅ **Implémentation complète et testée**
