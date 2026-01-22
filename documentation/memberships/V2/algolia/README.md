# Intégration Algolia pour le Module Members

> Documentation complète pour l'intégration de la recherche Algolia dans le module Members (liste des membres validés).

## Table des matières

1. [Vue d'ensemble](#vue-densemble)
2. [Architecture](#architecture)
3. [Configuration Algolia](#configuration-algolia)
4. [Implémentation](#implémentation)
5. [Cloud Functions](#cloud-functions)
6. [Migration des données](#migration-des-données)
7. [Utilisation dans les composants](#utilisation-dans-les-composants)
8. [Tests](#tests)

> 📖 **Documentation d'implémentation complète** : Voir [IMPLEMENTATION.md](./IMPLEMENTATION.md) pour les détails techniques, le guide de migration, les tests et le dépannage.

---

## Vue d'ensemble

### Objectif

Actuellement, la recherche dans la liste des membres utilise des requêtes Firestore directes, ce qui présente des limitations :

| Problème Firestore | Solution Algolia |
|-------------------|------------------|
| Recherche limitée (préfixe uniquement) | Recherche full-text avec tolérance aux fautes |
| Pas de recherche multi-champs native | Champ `searchableText` agrégé |
| Performance dégradée sur gros volumes | Index optimisé pour la recherche |
| Pas de typo tolerance | Tolérance aux fautes d'orthographe |

### Différence avec Membership-Requests

| Aspect | membership-requests (existant) | members (nouveau) |
|--------|-------------------------------|-------------------|
| **Collection Firestore** | `membership-requests` | `users` |
| **Index Algolia** | `membership-requests-{env}` | `members-{env}` |
| **Champs de recherche** | matricule, nom, prénom, email, téléphones | matricule, nom, prénom, email, téléphones, entreprise, profession |
| **Filtres** | status, isPaid | membershipType, isActive, gender, hasCar, province, company |
| **Tri** | createdAt DESC | lastName ASC, createdAt DESC |

---

## Architecture

### Flux de données

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              FIRESTORE                                   │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │  Collection: users                                               │    │
│  │  - Membres validés (ex-membership-requests approuvés)            │    │
│  └──────────────────────────────┬──────────────────────────────────┘    │
└─────────────────────────────────┼───────────────────────────────────────┘
                                  │
                                  │ Trigger: onDocumentWritten
                                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                          CLOUD FUNCTION                                  │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │  syncMembersToAlgolia                                            │    │
│  │  - Génère searchableText                                         │    │
│  │  - Indexe/Supprime dans Algolia                                  │    │
│  └──────────────────────────────┬──────────────────────────────────┘    │
└─────────────────────────────────┼───────────────────────────────────────┘
                                  │
                                  │ API Algolia (Admin Key)
                                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                              ALGOLIA                                     │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │  Index: members-{env}                                            │    │
│  │  - searchableText (généré)                                       │    │
│  │  - matricule, firstName, lastName, email                         │    │
│  │  - membershipType, isActive, gender, hasCar                      │    │
│  │  - province, companyName, profession                             │    │
│  └──────────────────────────────┬──────────────────────────────────┘    │
└─────────────────────────────────┼───────────────────────────────────────┘
                                  │
                                  │ Search API (Search Key)
                                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND                                    │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │  MembersAlgoliaSearchService                                     │    │
│  │  - search(query, filters, pagination)                            │    │
│  │  - Récupère IDs → Fetch Firestore                                │    │
│  └──────────────────────────────┬──────────────────────────────────┘    │
│                                 │                                        │
│  ┌──────────────────────────────▼──────────────────────────────────┐    │
│  │  useMembersSearch (Hook)                                         │    │
│  │  - Cache React Query                                             │    │
│  │  - Gestion états loading/error                                   │    │
│  └─────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────┘
```

### Structure des fichiers

```
src/
├── services/
│   └── search/
│       ├── AlgoliaSearchService.ts           # Existant (membership-requests)
│       └── MembersAlgoliaSearchService.ts    # NOUVEAU (members)
│
├── domains/
│   └── memberships/
│       ├── hooks/
│       │   ├── useMembershipSearch.ts        # Existant (membership-requests)
│       │   └── useMembersSearch.ts           # NOUVEAU (members)
│       └── repositories/
│           └── MembersRepositoryV2.ts        # À adapter pour Algolia
│
└── utils/
    └── searchableText.ts                     # Existant + extension pour members

functions/
└── src/
    └── members/
        └── syncMembersToAlgolia.ts           # NOUVEAU
```

---

## Configuration Algolia

### Étape 1 : Créer l'index

1. Accéder au [Dashboard Algolia](https://dashboard.algolia.com)
2. Aller dans **Indices** → **Create Index**
3. Créer 3 index (un par environnement) :
   - `members-dev`
   - `members-preprod`
   - `members-prod`

### Étape 2 : Configurer l'index

Pour chaque index, appliquer cette configuration :

#### Configuration JSON

```json
{
  "searchableAttributes": [
    "searchableText",
    "matricule",
    "firstName",
    "lastName",
    "email",
    "companyName",
    "profession"
  ],
  "attributesForFaceting": [
    "filterOnly(membershipType)",
    "filterOnly(isActive)",
    "filterOnly(gender)",
    "filterOnly(hasCar)",
    "filterOnly(province)",
    "filterOnly(companyId)",
    "filterOnly(professionId)",
    "searchable(roles)"
  ],
  "customRanking": [
    "desc(createdAt)"
  ],
  "ranking": [
    "typo",
    "geo",
    "words",
    "filters",
    "proximity",
    "attribute",
    "exact",
    "custom"
  ],
  "highlightPreTag": "<mark>",
  "highlightPostTag": "</mark>",
  "minWordSizefor1Typo": 4,
  "minWordSizefor2Typos": 8,
  "typoTolerance": true,
  "ignorePlurals": true,
  "removeStopWords": false,
  "distinct": false,
  "maxValuesPerFacet": 100
}
```

#### Replicas (optionnel)

Créer des replicas pour différents tris :

| Replica | Tri | Utilisation |
|---------|-----|-------------|
| `members-{env}_name_asc` | lastName ASC, firstName ASC | Tri alphabétique |
| `members-{env}_created_desc` | createdAt DESC | Tri par date (défaut) |

### Étape 3 : Variables d'environnement

#### Frontend (`.env.local`)

```env
# Algolia (existant pour membership-requests)
NEXT_PUBLIC_ALGOLIA_APP_ID=VOTRE_APP_ID
NEXT_PUBLIC_ALGOLIA_SEARCH_API_KEY=votre_search_key

# Index Members (NOUVEAU)
NEXT_PUBLIC_ALGOLIA_MEMBERS_INDEX_NAME=members
```

#### Cloud Functions (`functions/.env`)

```env
# Algolia
ALGOLIA_APP_ID=VOTRE_APP_ID
ALGOLIA_WRITE_API_KEY=votre_admin_key

# Index Members (NOUVEAU)
ALGOLIA_MEMBERS_INDEX_NAME=members
```

#### Firebase Functions Config

```bash
firebase functions:config:set \
  algolia.members_index_name="members"
```

---

## Implémentation

### 1. Structure de l'objet indexé

```typescript
interface MemberAlgoliaRecord {
  // Identifiant (= matricule = UID Firebase)
  objectID: string
  
  // Champ principal de recherche (généré)
  searchableText: string
  
  // Champs de recherche secondaires
  matricule: string
  firstName: string
  lastName: string
  email: string
  contacts: string[]
  
  // Informations professionnelles
  companyId: string | null
  companyName: string
  professionId: string | null
  profession: string
  
  // Adresse
  province: string
  city: string
  district: string
  
  // Attributs filtrables (facets)
  membershipType: 'adherant' | 'bienfaiteur' | 'sympathisant'
  roles: string[]
  isActive: boolean
  gender: 'M' | 'F'
  hasCar: boolean
  
  // Timestamps (pour tri)
  createdAt: number  // milliseconds
  updatedAt: number
}
```

### 2. Génération du searchableText

```typescript
// src/utils/memberSearchableText.ts

export interface MemberSearchableTextData {
  matricule?: string
  firstName?: string
  lastName?: string
  email?: string
  contacts?: string[]
  companyName?: string
  profession?: string
  province?: string
  city?: string
}

export function generateMemberSearchableText(data: MemberSearchableTextData): string {
  const parts: string[] = []
  
  // Matricule
  if (data.matricule) {
    parts.push(normalizeText(data.matricule))
  }
  
  // Prénom
  if (data.firstName) {
    parts.push(normalizeText(data.firstName))
  }
  
  // Nom
  if (data.lastName) {
    parts.push(normalizeText(data.lastName))
  }
  
  // Nom complet (prénom + nom)
  if (data.firstName && data.lastName) {
    parts.push(normalizeText(`${data.firstName} ${data.lastName}`))
  }
  
  // Email
  if (data.email) {
    parts.push(normalizeText(data.email))
  }
  
  // Téléphones
  if (data.contacts && Array.isArray(data.contacts)) {
    data.contacts.forEach(contact => {
      if (contact && typeof contact === 'string') {
        const normalizedPhone = contact.replace(/[\s\-\(\)]/g, '').toLowerCase()
        parts.push(normalizedPhone)
      }
    })
  }
  
  // Entreprise
  if (data.companyName) {
    parts.push(normalizeText(data.companyName))
  }
  
  // Profession
  if (data.profession) {
    parts.push(normalizeText(data.profession))
  }
  
  // Province
  if (data.province) {
    parts.push(normalizeText(data.province))
  }
  
  // Ville
  if (data.city) {
    parts.push(normalizeText(data.city))
  }
  
  return parts.join(' ')
}
```

### 3. Service Algolia pour Members

```typescript
// src/services/search/MembersAlgoliaSearchService.ts

import { liteClient } from 'algoliasearch/lite'
import type { User } from '@/types/types'

export interface MembersSearchOptions {
  query?: string
  filters?: {
    membershipType?: 'adherant' | 'bienfaiteur' | 'sympathisant'
    isActive?: boolean
    gender?: 'M' | 'F'
    hasCar?: boolean
    province?: string
    companyId?: string
    professionId?: string
  }
  page?: number
  hitsPerPage?: number
  sortBy?: 'name_asc' | 'created_desc'
}

export interface MembersSearchResult {
  items: User[]
  pagination: {
    page: number
    limit: number
    totalItems: number
    totalPages: number
    hasNextPage: boolean
    hasPrevPage: boolean
  }
}

export class MembersAlgoliaSearchService {
  async search(options: MembersSearchOptions): Promise<MembersSearchResult> {
    const {
      query = '',
      filters = {},
      page = 1,
      hitsPerPage = 20,
      sortBy = 'created_desc'
    } = options

    const client = getClient()
    const indexName = getMembersIndexName(sortBy)

    // Construire les filtres Algolia
    const filterStrings: string[] = []
    
    if (filters.membershipType) {
      filterStrings.push(`membershipType:"${filters.membershipType}"`)
    }
    if (filters.isActive !== undefined) {
      filterStrings.push(`isActive:${filters.isActive}`)
    }
    if (filters.gender) {
      filterStrings.push(`gender:"${filters.gender}"`)
    }
    if (filters.hasCar !== undefined) {
      filterStrings.push(`hasCar:${filters.hasCar}`)
    }
    if (filters.province) {
      filterStrings.push(`province:"${filters.province}"`)
    }
    if (filters.companyId) {
      filterStrings.push(`companyId:"${filters.companyId}"`)
    }
    if (filters.professionId) {
      filterStrings.push(`professionId:"${filters.professionId}"`)
    }

    const algoliaFilters = filterStrings.length > 0 
      ? filterStrings.join(' AND ') 
      : undefined

    // Recherche Algolia
    const searchResponse = await client.search({
      requests: [{
        indexName,
        query,
        filters: algoliaFilters,
        page: page - 1,
        hitsPerPage,
        attributesToRetrieve: ['objectID'],
      }],
    })

    const firstResult = searchResponse.results[0]
    if (!firstResult || !('hits' in firstResult)) {
      return this.emptyResult(page, hitsPerPage)
    }

    const memberIds = firstResult.hits.map(hit => hit.objectID)
    
    if (memberIds.length === 0) {
      return this.emptyResult(page, hitsPerPage)
    }

    // Récupérer les données complètes depuis Firestore
    const items = await this.fetchMembersFromFirestore(memberIds)

    return {
      items,
      pagination: {
        page: (firstResult.page || 0) + 1,
        limit: hitsPerPage,
        totalItems: firstResult.nbHits || 0,
        totalPages: firstResult.nbPages || 0,
        hasNextPage: (firstResult.page || 0) + 1 < (firstResult.nbPages || 0),
        hasPrevPage: (firstResult.page || 0) > 0,
      },
    }
  }

  private emptyResult(page: number, limit: number): MembersSearchResult {
    return {
      items: [],
      pagination: { page, limit, totalItems: 0, totalPages: 0, hasNextPage: false, hasPrevPage: false }
    }
  }

  private async fetchMembersFromFirestore(memberIds: string[]): Promise<User[]> {
    // Similaire à AlgoliaSearchService.fetchFullDataFromFirestore
    // Voir implémentation existante
  }
}
```

---

## Cloud Functions

### Trigger de synchronisation

```typescript
// functions/src/members/syncMembersToAlgolia.ts

import * as admin from 'firebase-admin'
import { onDocumentWritten } from 'firebase-functions/v2/firestore'
import { algoliasearch } from 'algoliasearch'

export const syncMembersToAlgolia = onDocumentWritten(
  {
    document: 'users/{userId}',
    memory: '256MiB',
    timeoutSeconds: 60,
  },
  async (event) => {
    const userId = event.params.userId
    const beforeData = event.data?.before.exists ? event.data.before.data() : null
    const afterData = event.data?.after.exists ? event.data.after.data() : null

    // Ne synchroniser que les membres (pas les admins)
    if (afterData && !isMember(afterData)) {
      console.log(`⏭️ Document ${userId} n'est pas un membre, ignoré`)
      return
    }

    const { client, indexName } = await getAlgoliaClient('members')

    // Cas 1 : Document supprimé
    if (!afterData && beforeData && isMember(beforeData)) {
      await client.deleteObject({ indexName, objectID: userId })
      console.log(`✅ Membre ${userId} supprimé d'Algolia`)
      return
    }

    // Cas 2 : Document créé ou mis à jour
    if (afterData && isMember(afterData)) {
      const searchableText = generateMemberSearchableText(afterData)
      
      const algoliaObject = {
        objectID: userId,
        searchableText,
        matricule: afterData.matricule || userId,
        firstName: afterData.firstName || '',
        lastName: afterData.lastName || '',
        email: afterData.email || '',
        contacts: afterData.contacts || [],
        companyId: afterData.companyId || null,
        companyName: afterData.companyName || '',
        professionId: afterData.professionId || null,
        profession: afterData.profession || '',
        province: afterData.address?.province || '',
        city: afterData.address?.city || '',
        district: afterData.address?.district || '',
        membershipType: afterData.membershipType || 'adherant',
        roles: afterData.roles || [],
        isActive: afterData.isActive !== false,
        gender: afterData.gender || 'M',
        hasCar: afterData.hasCar || false,
        createdAt: afterData.createdAt?.toMillis?.() || Date.now(),
        updatedAt: afterData.updatedAt?.toMillis?.() || Date.now(),
      }

      await client.saveObject({ indexName, body: algoliaObject })
      console.log(`✅ Membre ${userId} synchronisé vers Algolia`)
    }
  }
)

function isMember(data: any): boolean {
  const memberRoles = ['Adherant', 'Bienfaiteur', 'Sympathisant']
  return data.roles?.some((role: string) => memberRoles.includes(role))
}
```

---

## Migration des données

### Script de migration

```typescript
// scripts/migrate-members-to-algolia.ts

import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { algoliasearch } from 'algoliasearch'

async function migrateMembers() {
  console.log('🚀 Démarrage de la migration des membres vers Algolia...')

  const db = getFirestore()
  const client = algoliasearch(
    process.env.ALGOLIA_APP_ID!,
    process.env.ALGOLIA_WRITE_API_KEY!
  )
  
  const indexName = `members-${process.env.ENV || 'dev'}`
  
  // Récupérer tous les membres
  const usersRef = db.collection('users')
  const snapshot = await usersRef.get()
  
  const memberRoles = ['Adherant', 'Bienfaiteur', 'Sympathisant']
  const records: any[] = []
  
  snapshot.forEach(doc => {
    const data = doc.data()
    
    // Filtrer les membres uniquement
    if (!data.roles?.some((role: string) => memberRoles.includes(role))) {
      return
    }
    
    const searchableText = generateMemberSearchableText({
      matricule: data.matricule || doc.id,
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      contacts: data.contacts,
      companyName: data.companyName,
      profession: data.profession,
      province: data.address?.province,
      city: data.address?.city,
    })
    
    records.push({
      objectID: doc.id,
      searchableText,
      matricule: data.matricule || doc.id,
      firstName: data.firstName || '',
      lastName: data.lastName || '',
      email: data.email || '',
      contacts: data.contacts || [],
      companyId: data.companyId || null,
      companyName: data.companyName || '',
      professionId: data.professionId || null,
      profession: data.profession || '',
      province: data.address?.province || '',
      city: data.address?.city || '',
      district: data.address?.district || '',
      membershipType: data.membershipType || 'adherant',
      roles: data.roles || [],
      isActive: data.isActive !== false,
      gender: data.gender || 'M',
      hasCar: data.hasCar || false,
      createdAt: data.createdAt?.toMillis?.() || Date.now(),
      updatedAt: data.updatedAt?.toMillis?.() || Date.now(),
    })
  })

  console.log(`📊 ${records.length} membres à migrer`)

  // Indexer par batch de 1000
  const batchSize = 1000
  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize)
    await client.saveObjects({ indexName, objects: batch })
    console.log(`✅ Batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(records.length / batchSize)} indexé`)
  }

  console.log('🎉 Migration terminée !')
}

migrateMembers().catch(console.error)
```

### Commande de migration

```bash
# Dev
ENV=dev npx tsx scripts/migrate-members-to-algolia.ts

# Preprod
ENV=preprod npx tsx scripts/migrate-members-to-algolia.ts

# Prod
ENV=prod npx tsx scripts/migrate-members-to-algolia.ts
```

---

## Utilisation dans les composants

### Hook useMembersSearch

```typescript
// src/domains/memberships/hooks/useMembersSearch.ts

import { useQuery } from '@tanstack/react-query'
import { MembersAlgoliaSearchService } from '@/services/search/MembersAlgoliaSearchService'
import type { MembersSearchOptions } from '@/services/search/MembersAlgoliaSearchService'

export function useMembersSearch(options: MembersSearchOptions) {
  const service = new MembersAlgoliaSearchService()

  return useQuery({
    queryKey: ['members', 'search', options],
    queryFn: () => service.search(options),
    staleTime: 30 * 1000,       // 30 secondes
    gcTime: 5 * 60 * 1000,      // 5 minutes
    enabled: true,
  })
}
```

### Exemple d'utilisation

```tsx
// Dans MembershipsListPage.tsx

function MembershipsListPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [filters, setFilters] = useState<MembersSearchFilters>({})
  const [page, setPage] = useState(1)

  const { data, isLoading, isError } = useMembersSearch({
    query: searchQuery,
    filters,
    page,
    hitsPerPage: 20,
  })

  return (
    <div>
      <SearchInput value={searchQuery} onChange={setSearchQuery} />
      <MembersFilters filters={filters} onChange={setFilters} />
      
      {isLoading && <Skeleton />}
      {isError && <ErrorState />}
      
      {data && (
        <>
          <MembersList members={data.items} />
          <Pagination 
            pagination={data.pagination} 
            onPageChange={setPage} 
          />
        </>
      )}
    </div>
  )
}
```

---

## Tests

### Test du service

```typescript
// src/services/search/__tests__/MembersAlgoliaSearchService.test.ts

import { describe, it, expect, vi } from 'vitest'
import { MembersAlgoliaSearchService } from '../MembersAlgoliaSearchService'

describe('MembersAlgoliaSearchService', () => {
  it('devrait rechercher par nom', async () => {
    const service = new MembersAlgoliaSearchService()
    const result = await service.search({ query: 'dupont' })
    
    expect(result.items).toBeDefined()
    expect(result.pagination.totalItems).toBeGreaterThanOrEqual(0)
  })

  it('devrait filtrer par membershipType', async () => {
    const service = new MembersAlgoliaSearchService()
    const result = await service.search({
      filters: { membershipType: 'adherant' }
    })
    
    result.items.forEach(member => {
      expect(member.membershipType).toBe('adherant')
    })
  })
})
```

### Test du hook

```tsx
// src/domains/memberships/hooks/__tests__/useMembersSearch.test.tsx

import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useMembersSearch } from '../useMembersSearch'

describe('useMembersSearch', () => {
  it('devrait retourner les résultats de recherche', async () => {
    const queryClient = new QueryClient()
    const wrapper = ({ children }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )

    const { result } = renderHook(
      () => useMembersSearch({ query: 'jean' }),
      { wrapper }
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.items).toBeDefined()
  })
})
```

---

## Checklist d'implémentation

### Phase 1 : Configuration Algolia

- [ ] Créer les index `members-dev`, `members-preprod`, `members-prod`
- [ ] Appliquer la configuration JSON sur chaque index
- [ ] Créer les replicas pour le tri (optionnel)
- [ ] Ajouter les variables d'environnement

### Phase 2 : Implémentation Backend

- [ ] Créer `generateMemberSearchableText()` dans `src/utils/`
- [ ] Créer `MembersAlgoliaSearchService.ts`
- [ ] Créer Cloud Function `syncMembersToAlgolia`
- [ ] Déployer la Cloud Function

### Phase 3 : Migration

- [ ] Créer le script `migrate-members-to-algolia.ts`
- [ ] Exécuter la migration sur dev
- [ ] Vérifier les données dans Algolia Dashboard
- [ ] Exécuter la migration sur preprod/prod

### Phase 4 : Intégration Frontend

- [ ] Créer `useMembersSearch` hook
- [ ] Adapter `MembersRepositoryV2` pour utiliser Algolia
- [ ] Mettre à jour les composants de recherche
- [ ] Tester l'intégration complète

### Phase 5 : Tests et Documentation

- [ ] Écrire les tests unitaires
- [ ] Écrire les tests d'intégration
- [ ] Documenter les limitations et bonnes pratiques
- [ ] Mettre à jour le README principal

---

## Ressources

- 📖 [Documentation d'implémentation complète](./IMPLEMENTATION.md) - Détails techniques, migration, tests, dépannage
- [Documentation Algolia](https://www.algolia.com/doc/)
- [Algolia React InstantSearch](https://www.algolia.com/doc/guides/building-search-ui/what-is-instantsearch/react/)
- [Firebase Functions v2](https://firebase.google.com/docs/functions/get-started?gen=2nd)
- [Documentation membership-requests existante](../../membership-requests/recherche/ALGOLIA_SETUP.md)
