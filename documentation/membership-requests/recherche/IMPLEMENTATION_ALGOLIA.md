# Implémentation Algolia - Membership Requests

## 🎯 Objectif

Implémenter une recherche full-text professionnelle avec Algolia pour les demandes d'adhésion, avec synchronisation automatique Firestore → Algolia.

---

## 📋 Prérequis

### 1. Compte Algolia

1. Créer un compte sur [algolia.com](https://www.algolia.com)
2. Créer une nouvelle application
3. Récupérer :
   - `Application ID` (APP_ID)
   - `Search-Only API Key` (pour le client)
   - `Admin API Key` (pour l'indexation côté serveur)

### 2. Configuration Firebase

- Firebase Functions configurées
- Firestore avec les données existantes

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│              FIRESTORE (Source of Truth)                │
│  membership-requests/{id}                               │
└───────────────────┬─────────────────────────────────────┘
                    │
                    │ Cloud Function Trigger
                    │ (onCreate, onUpdate, onDelete)
                    ▼
┌─────────────────────────────────────────────────────────┐
│         FIREBASE CLOUD FUNCTIONS                         │
│  syncToAlgolia (onCreate/onUpdate)                      │
│  deleteFromAlgolia (onDelete)                            │
└───────────────────┬─────────────────────────────────────┘
                    │
                    │ HTTP API
                    ▼
┌─────────────────────────────────────────────────────────┐
│              ALGOLIA INDEX                                │
│  membership-requests                                     │
│  - objectID: request.id                                  │
│  - searchableText: "jean dupont jean@example.com..."    │
│  - filters: isPaid, status, etc.                         │
└───────────────────┬─────────────────────────────────────┘
                    │
                    │ Search API
                    ▼
┌─────────────────────────────────────────────────────────┐
│              CLIENT (React/Next.js)                       │
│  algoliasearch client                                    │
│  - Recherche instantanée                                 │
│  - Filtres avancés                                        │
│  - Pagination                                             │
└─────────────────────────────────────────────────────────┘
```

---

## 📦 Installation

### 1. Installer les dépendances

```bash
# Dans le projet principal (Next.js)
pnpm add algoliasearch

# Dans functions/ (Cloud Functions)
cd functions
pnpm add algoliasearch firebase-functions
```

### 2. Variables d'environnement

**`.env.local` (client)** :
```env
NEXT_PUBLIC_ALGOLIA_APP_ID=your_app_id
NEXT_PUBLIC_ALGOLIA_SEARCH_API_KEY=your_search_only_key
NEXT_PUBLIC_ALGOLIA_INDEX_NAME=membership-requests
```

**`.env` (functions)** :
```env
ALGOLIA_APP_ID=your_app_id
ALGOLIA_ADMIN_API_KEY=your_admin_key
ALGOLIA_INDEX_NAME=membership-requests
```

**`firebase/functions/.env`** (pour les emulators) :
```env
ALGOLIA_APP_ID=your_app_id
ALGOLIA_ADMIN_API_KEY=your_admin_key
ALGOLIA_INDEX_NAME=membership-requests
```

---

## 🔧 Configuration Algolia

### 1. Créer l'index dans Algolia Dashboard

1. Aller dans Algolia Dashboard → Indices
2. Créer un nouvel index : `membership-requests`
3. Configurer les attributs :

**Attributs de recherche** :
- `searchableText` (principal)
- `matricule`
- `firstName`
- `lastName`
- `email`

**Attributs pour filtres** :
- `isPaid` (facet)
- `status` (facet)
- `createdAt` (pour tri)

**Configuration de l'index** :
```json
{
  "searchableAttributes": [
    "searchableText",
    "matricule",
    "firstName",
    "lastName",
    "email"
  ],
  "attributesForFaceting": [
    "filterOnly(isPaid)",
    "filterOnly(status)"
  ],
  "customRanking": [
    "desc(createdAt)"
  ],
  "highlightPreTag": "<mark>",
  "highlightPostTag": "</mark>"
}
```

---

## 💻 Implémentation

### 1. Utilitaires de Normalisation

**`src/utils/searchableText.ts`** :
```typescript
/**
 * Génère un texte de recherche normalisé pour Algolia
 * 
 * NOTE: searchableText est utilisé dans Algolia (pas dans Firestore)
 * pour simplifier la recherche multi-champs.
 * 
 * Voir SEARCHABLETEXT_ALGOLIA.md pour plus de détails.
 */
export function generateSearchableText(data: {
  id?: string
  matricule?: string
  identity?: {
    firstName?: string
    lastName?: string
    email?: string
    contacts?: string[]
  }
}): string {
  const parts: string[] = []
  
  if (data.id) {
    parts.push(normalizeText(data.id))
  }
  
  if (data.matricule) {
    parts.push(normalizeText(data.matricule))
  }
  
  if (data.identity?.firstName) {
    parts.push(normalizeText(data.identity.firstName))
  }
  
  if (data.identity?.lastName) {
    parts.push(normalizeText(data.identity.lastName))
  }
  
  if (data.identity?.firstName && data.identity?.lastName) {
    parts.push(normalizeText(`${data.identity.firstName} ${data.identity.lastName}`))
  }
  
  if (data.identity?.email) {
    parts.push(normalizeText(data.identity.email))
  }
  
  // Téléphones : normaliser (supprimer espaces, tirets, parenthèses)
  // IMPORTANT : Inclure tous les numéros de téléphone dans searchableText
  if (data.identity?.contacts && Array.isArray(data.identity.contacts)) {
    data.identity.contacts.forEach(contact => {
      if (contact && typeof contact === 'string') {
        // Normaliser le téléphone : supprimer espaces, tirets, parenthèses
        const normalizedPhone = contact.replace(/[\s\-\(\)]/g, '').toLowerCase()
        parts.push(normalizedPhone)
      }
    })
  }
  
  return parts.join(' ')
}

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}
```

### 2. Service Algolia (Client)

**`src/services/search/AlgoliaSearchService.ts`** :
```typescript
import algoliasearch from 'algoliasearch/lite'
import type { MembershipRequest } from '@/domains/memberships/entities'

const client = algoliasearch(
  process.env.NEXT_PUBLIC_ALGOLIA_APP_ID!,
  process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_API_KEY!
)

const index = client.initIndex(
  process.env.NEXT_PUBLIC_ALGOLIA_INDEX_NAME || 'membership-requests'
)

export interface SearchOptions {
  query?: string
  filters?: {
    isPaid?: boolean
    status?: string
  }
  page?: number
  hitsPerPage?: number
}

export interface SearchResult {
  items: MembershipRequest[]
  pagination: {
    page: number
    totalPages: number
    totalItems: number
    hasNextPage: boolean
    hasPrevPage: boolean
  }
}

export class AlgoliaSearchService {
  async search(options: SearchOptions): Promise<SearchResult> {
    const {
      query = '',
      filters = {},
      page = 1,
      hitsPerPage = 20,
    } = options

    // Construire les filtres Algolia
    const filterStrings: string[] = []
    
    if (filters.isPaid !== undefined) {
      filterStrings.push(`isPaid:${filters.isPaid}`)
    }
    
    if (filters.status && filters.status !== 'all') {
      filterStrings.push(`status:"${filters.status}"`)
    }

    const algoliaFilters = filterStrings.join(' AND ')

    // Recherche Algolia
    const { hits, nbHits, nbPages, page: currentPage } = await index.search(query, {
      filters: algoliaFilters || undefined,
      page: page - 1, // Algolia utilise 0-based indexing
      hitsPerPage,
      attributesToRetrieve: ['*'], // Récupérer tous les attributs
    })

    // Transformer les résultats Algolia en MembershipRequest
    const items = hits.map(hit => this.transformHit(hit))

    return {
      items,
      pagination: {
        page: currentPage + 1, // Convertir en 1-based
        totalPages: nbPages,
        totalItems: nbHits,
        hasNextPage: currentPage + 1 < nbPages,
        hasPrevPage: currentPage > 0,
      },
    }
  }

  private transformHit(hit: any): MembershipRequest {
    // Transformer l'objet Algolia en MembershipRequest
    // Les données sont stockées dans hit._highlightResult ou directement dans hit
    return {
      id: hit.objectID,
      matricule: hit.matricule,
      identity: {
        firstName: hit.firstName,
        lastName: hit.lastName,
        email: hit.email,
        contacts: hit.contacts || [],
        // ... autres champs
      },
      status: hit.status,
      isPaid: hit.isPaid,
      createdAt: hit.createdAt ? new Date(hit.createdAt) : new Date(),
      updatedAt: hit.updatedAt ? new Date(hit.updatedAt) : new Date(),
      // ... autres champs
    }
  }
}
```

### 3. Cloud Functions - Synchronisation

**`functions/src/membership-requests/syncToAlgolia.ts`** :
```typescript
import * as functions from 'firebase-functions'
import * as admin from 'firebase-admin'
import algoliasearch from 'algoliasearch'

const ALGOLIA_APP_ID = functions.config().algolia.app_id
const ALGOLIA_ADMIN_API_KEY = functions.config().algolia.admin_api_key
const ALGOLIA_INDEX_NAME = functions.config().algolia.index_name || 'membership-requests'

const client = algoliasearch(ALGOLIA_APP_ID, ALGOLIA_ADMIN_API_KEY)
const index = client.initIndex(ALGOLIA_INDEX_NAME)

/**
 * Génère le searchableText pour Algolia
 */
function generateSearchableText(data: any): string {
  const parts: string[] = []
  
  if (data.id) parts.push(normalizeText(data.id))
  if (data.matricule) parts.push(normalizeText(data.matricule))
  if (data.identity?.firstName) parts.push(normalizeText(data.identity.firstName))
  if (data.identity?.lastName) parts.push(normalizeText(data.identity.lastName))
  if (data.identity?.firstName && data.identity?.lastName) {
    parts.push(normalizeText(`${data.identity.firstName} ${data.identity.lastName}`))
  }
  if (data.identity?.email) parts.push(normalizeText(data.identity.email))
  // Téléphones : normaliser (supprimer espaces, tirets, parenthèses)
  // IMPORTANT : Inclure tous les numéros de téléphone dans searchableText
  if (data.identity?.contacts && Array.isArray(data.identity.contacts)) {
    data.identity.contacts.forEach((contact: string) => {
      if (contact && typeof contact === 'string') {
        // Normaliser le téléphone : supprimer espaces, tirets, parenthèses
        const normalizedPhone = contact.replace(/[\s\-\(\)]/g, '').toLowerCase()
        parts.push(normalizedPhone)
      }
    })
  }
  
  return parts.join(' ')
}

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

/**
 * Synchronise un document Firestore vers Algolia
 */
export const syncToAlgolia = functions.firestore
  .document('membership-requests/{requestId}')
  .onWrite(async (change, context) => {
    const requestId = context.params.requestId
    const data = change.after.exists ? change.after.data() : null
    const previousData = change.before.exists ? change.before.data() : null

    // Supprimer si le document n'existe plus
    if (!data) {
      try {
        await index.deleteObject(requestId)
        console.log(`✅ Document ${requestId} supprimé d'Algolia`)
        return null
      } catch (error) {
        console.error(`❌ Erreur lors de la suppression d'Algolia:`, error)
        throw error
      }
    }

    // Ignorer si le document n'a pas changé (éviter les boucles)
    if (previousData && JSON.stringify(data) === JSON.stringify(previousData)) {
      return null
    }

    // Préparer l'objet pour Algolia
    // NOTE: searchableText est le champ principal de recherche dans Algolia
    // Il contient tous les champs de recherche normalisés pour simplifier la recherche
    // Voir SEARCHABLETEXT_ALGOLIA.md pour plus de détails
    const algoliaObject = {
      objectID: requestId,
      // Champ principal de recherche (recommandé pour Algolia)
      searchableText: generateSearchableText({
        id: requestId,
        matricule: data.matricule,
        identity: data.identity,
      }),
      // Champs individuels (pour affichage, filtres, recherche secondaire)
      matricule: data.matricule || '',
      firstName: data.identity?.firstName || '',
      lastName: data.identity?.lastName || '',
      email: data.identity?.email || '',
      contacts: data.identity?.contacts || [],
      // Facets pour filtres
      isPaid: data.isPaid || false,
      status: data.status || 'pending',
      createdAt: data.createdAt?.toMillis() || Date.now(),
      updatedAt: data.updatedAt?.toMillis() || Date.now(),
    }

    try {
      await index.saveObject(algoliaObject)
      console.log(`✅ Document ${requestId} synchronisé vers Algolia`)
      return null
    } catch (error) {
      console.error(`❌ Erreur lors de la synchronisation vers Algolia:`, error)
      throw error
    }
  })
```

### 4. Hook React Query

**`src/domains/memberships/hooks/useMembershipSearch.ts`** :
```typescript
import { useQuery } from '@tanstack/react-query'
import { AlgoliaSearchService, type SearchOptions } from '@/services/search/AlgoliaSearchService'

const searchService = new AlgoliaSearchService()

export function useMembershipSearch(options: SearchOptions) {
  return useQuery({
    queryKey: ['membership-search', options],
    queryFn: () => searchService.search(options),
    staleTime: 30000, // 30 secondes
    enabled: !!(options.query && options.query.trim().length >= 2) || !options.query,
  })
}
```

### 5. Intégration dans le Repository

**`src/domains/memberships/repositories/MembershipRepositoryV2.ts`** :

Modifier la méthode `getAll` pour utiliser Algolia si disponible :

```typescript
async getAll(
  filters: MembershipRequestFilters = {},
  page: number = 1,
  pageLimit: number = MEMBERSHIP_REQUEST_PAGINATION.DEFAULT_LIMIT
): Promise<MembershipRequestsResponse> {
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

---

## 🔄 Migration des Données Existantes

### Script de Migration

**`scripts/migrate-to-algolia.ts`** :
```typescript
import * as admin from 'firebase-admin'
import algoliasearch from 'algoliasearch'
import { getFirestore } from '@/firebase/firestore'

const ALGOLIA_APP_ID = process.env.ALGOLIA_APP_ID!
const ALGOLIA_ADMIN_API_KEY = process.env.ALGOLIA_ADMIN_API_KEY!
const ALGOLIA_INDEX_NAME = process.env.ALGOLIA_INDEX_NAME || 'membership-requests'

const client = algoliasearch(ALGOLIA_APP_ID, ALGOLIA_ADMIN_API_KEY)
const index = client.initIndex(ALGOLIA_INDEX_NAME)

async function migrateToAlgolia() {
  const db = admin.firestore()
  const batchSize = 100 // Traiter par batch de 100

  let lastDoc: admin.firestore.DocumentSnapshot | null = null
  let totalProcessed = 0

  while (true) {
    let query = db.collection('membership-requests').orderBy('createdAt', 'desc').limit(batchSize)
    
    if (lastDoc) {
      query = query.startAfter(lastDoc)
    }

    const snapshot = await query.get()

    if (snapshot.empty) {
      break
    }

    const objects: any[] = []

    snapshot.forEach((doc) => {
      const data = doc.data()
      
      objects.push({
        objectID: doc.id,
        matricule: data.matricule || '',
        firstName: data.identity?.firstName || '',
        lastName: data.identity?.lastName || '',
        email: data.identity?.email || '',
        contacts: data.identity?.contacts || [],
        searchableText: generateSearchableText({
          id: doc.id,
          matricule: data.matricule,
          identity: data.identity,
        }),
        isPaid: data.isPaid || false,
        status: data.status || 'pending',
        createdAt: data.createdAt?.toMillis() || Date.now(),
        updatedAt: data.updatedAt?.toMillis() || Date.now(),
      })
    })

    // Indexer le batch
    await index.saveObjects(objects)
    
    totalProcessed += objects.length
    console.log(`✅ ${totalProcessed} documents indexés`)

    lastDoc = snapshot.docs[snapshot.docs.length - 1]
  }

  console.log(`🎉 Migration terminée : ${totalProcessed} documents indexés`)
}

// Fonction generateSearchableText (identique à celle dans syncToAlgolia.ts)
function generateSearchableText(data: any): string {
  // ... (voir code précédent)
}

migrateToAlgolia().catch(console.error)
```

**Exécution** :
```bash
# Configurer les variables d'environnement
export ALGOLIA_APP_ID=your_app_id
export ALGOLIA_ADMIN_API_KEY=your_admin_key
export ALGOLIA_INDEX_NAME=membership-requests

# Exécuter le script
npx tsx scripts/migrate-to-algolia.ts
```

---

## 🧪 Tests

### Tests Unitaires

**`src/services/search/__tests__/AlgoliaSearchService.test.ts`** :
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AlgoliaSearchService } from '../AlgoliaSearchService'

// Mock Algolia
vi.mock('algoliasearch/lite', () => ({
  default: vi.fn(() => ({
    initIndex: vi.fn(() => ({
      search: vi.fn(),
    })),
  })),
}))

describe('AlgoliaSearchService', () => {
  let service: AlgoliaSearchService

  beforeEach(() => {
    service = new AlgoliaSearchService()
  })

  it('devrait rechercher avec succès', async () => {
    // Mock de la réponse Algolia
    const mockSearch = vi.fn().mockResolvedValue({
      hits: [
        {
          objectID: '1234.MK.5678',
          matricule: '1234.MK.5678',
          firstName: 'Jean',
          lastName: 'Dupont',
          email: 'jean@example.com',
          status: 'pending',
          isPaid: false,
        },
      ],
      nbHits: 1,
      nbPages: 1,
      page: 0,
    })

    // ... test
  })
})
```

---

## 📊 Monitoring et Analytics

### Algolia Dashboard

- **Analytics** : Nombre de recherches, taux de clics, etc.
- **Performance** : Temps de réponse moyen
- **Erreurs** : Logs des erreurs d'indexation

### Firebase Functions Logs

```bash
# Voir les logs de synchronisation
firebase functions:log --only syncToAlgolia
```

---

## 🚀 Déploiement

### 1. Configurer les variables d'environnement Firebase

```bash
firebase functions:config:set \
  algolia.app_id="your_app_id" \
  algolia.admin_api_key="your_admin_key" \
  algolia.index_name="membership-requests"
```

### 2. Déployer les Cloud Functions

```bash
firebase deploy --only functions:syncToAlgolia
```

### 3. Exécuter la migration

```bash
npx tsx scripts/migrate-to-algolia.ts
```

### 4. Vérifier dans Algolia Dashboard

- Vérifier que les documents sont indexés
- Tester une recherche
- Vérifier les analytics

---

## ⚠️ Points d'Attention

### 1. Coût Algolia

- **Free tier** : 10k requêtes/mois
- **Starter** : $0.50/1k requêtes
- **Estimation** : Pour 100k recherches/mois → ~$50/mois

### 2. Synchronisation

- Les Cloud Functions se déclenchent automatiquement
- En cas d'erreur, Algolia peut être désynchronisé
- Prévoir un script de re-synchronisation

### 3. Fallback Firestore

- Garder le code Firestore comme fallback
- Si Algolia est indisponible, utiliser Firestore

---

## ✅ Checklist d'Implémentation

- [ ] Créer compte Algolia
- [ ] Installer les dépendances
- [ ] Configurer les variables d'environnement
- [ ] Créer l'index dans Algolia Dashboard
- [ ] Implémenter `generateSearchableText`
- [ ] Créer `AlgoliaSearchService`
- [ ] Créer Cloud Function `syncToAlgolia`
- [ ] Créer hook `useMembershipSearch`
- [ ] Intégrer dans `MembershipRepositoryV2`
- [ ] Créer script de migration
- [ ] Exécuter la migration
- [ ] Créer les tests
- [ ] Déployer les Cloud Functions
- [ ] Tester en production
- [ ] Monitorer les performances

---

## 📝 Prochaines Étapes

1. Suivre cette checklist
2. Tester avec des données réelles
3. Monitorer les coûts Algolia
4. Ajuster la configuration si nécessaire
