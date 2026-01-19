# Architecture de la Recherche - Membership Requests

## 🏗️ Architecture Proposée

### Principe : Clean Architecture avec Séparation des Responsabilités

```
┌─────────────────────────────────────────────────────────────┐
│                    PRESENTATION LAYER                       │
│  (React Components, Hooks, Pages)                          │
└───────────────────────┬─────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                   APPLICATION LAYER                        │
│  (SearchService, SearchCriteria, SearchResult)              │
│  - Orchestration de la recherche                           │
│  - Validation des critères                                 │
│  - Pagination                                              │
└───────────────────────┬─────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    DOMAIN LAYER                             │
│  (SearchStrategy, Normalizer, SearchableTextGenerator)     │
│  - Logique métier de recherche                             │
│  - Normalisation du texte                                  │
│  - Génération de searchableText                            │
└───────────────────────┬─────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                 INFRASTRUCTURE LAYER                        │
│  (FirestoreRepository, IndexRepository)                    │
│  - Accès aux données                                       │
│  - Requêtes Firestore                                      │
│  - Gestion des index                                       │
└─────────────────────────────────────────────────────────────┘
```

---

## 📁 Structure des Fichiers

### Domain Layer (`src/domains/memberships/search/domain/`)

**Responsabilité** : Logique métier pure, indépendante de l'infrastructure.

#### `interfaces.ts`
```typescript
export interface SearchCriteria {
  query?: string
  filters?: {
    isPaid?: boolean
    status?: MembershipRequestStatus
  }
  pagination?: {
    page: number
    limit: number
  }
}

export interface SearchResult<T> {
  items: T[]
  pagination: {
    page: number
    limit: number
    totalItems: number
    totalPages: number
    hasNextPage: boolean
    hasPrevPage: boolean
  }
}

export interface ISearchStrategy {
  search(criteria: SearchCriteria): Promise<SearchResult<MembershipRequest>>
}
```

#### `normalizer.ts`
```typescript
export class TextNormalizer {
  /**
   * Normalise un texte pour la recherche
   * - Minuscules
   * - Suppression des accents
   * - Suppression des espaces multiples
   */
  static normalize(text: string): string {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Supprime les accents
      .replace(/\s+/g, ' ') // Espaces multiples → un seul
      .trim()
  }

  /**
   * Normalise un numéro de téléphone
   * Supprime espaces, tirets, parenthèses
   */
  static normalizePhone(phone: string): string {
    return phone.replace(/[\s\-\(\)]/g, '').toLowerCase()
  }
}
```

#### `searchableTextGenerator.ts`
```typescript
export class SearchableTextGenerator {
  /**
   * Génère le texte de recherche à partir d'une demande d'adhésion
   */
  static generate(request: MembershipRequest): string {
    const parts: string[] = []
    
    // ID du document
    if (request.id) {
      parts.push(TextNormalizer.normalize(request.id))
    }
    
    // Matricule
    if (request.matricule) {
      parts.push(TextNormalizer.normalize(request.matricule))
    }
    
    // Prénom
    if (request.identity?.firstName) {
      parts.push(TextNormalizer.normalize(request.identity.firstName))
    }
    
    // Nom
    if (request.identity?.lastName) {
      parts.push(TextNormalizer.normalize(request.identity.lastName))
    }
    
    // Nom complet
    if (request.identity?.firstName && request.identity?.lastName) {
      parts.push(
        TextNormalizer.normalize(
          `${request.identity.firstName} ${request.identity.lastName}`
        )
      )
    }
    
    // Email
    if (request.identity?.email) {
      parts.push(TextNormalizer.normalize(request.identity.email))
    }
    
    // Téléphones (normalisés)
    if (request.identity?.contacts) {
      request.identity.contacts.forEach(contact => {
        if (contact) {
          parts.push(TextNormalizer.normalizePhone(contact))
        }
      })
    }
    
    return parts.join(' ')
  }
}
```

---

### Application Layer (`src/domains/memberships/search/application/`)

**Responsabilité** : Orchestration de la recherche, validation, pagination.

#### `SearchService.ts`
```typescript
export class SearchService {
  constructor(
    private repository: ISearchRepository,
    private normalizer: TextNormalizer
  ) {}

  async search(criteria: SearchCriteria): Promise<SearchResult<MembershipRequest>> {
    // Validation
    if (criteria.query && criteria.query.trim().length < 2) {
      throw new Error('La recherche doit contenir au moins 2 caractères')
    }

    // Normalisation de la requête
    const normalizedQuery = criteria.query
      ? this.normalizer.normalize(criteria.query)
      : undefined

    // Recherche via le repository
    return await this.repository.search({
      ...criteria,
      query: normalizedQuery,
    })
  }
}
```

#### `SearchCriteriaValidator.ts`
```typescript
export class SearchCriteriaValidator {
  static validate(criteria: SearchCriteria): void {
    // Validation de la longueur minimale
    if (criteria.query && criteria.query.trim().length < 2) {
      throw new Error('La recherche doit contenir au moins 2 caractères')
    }

    // Validation de la longueur maximale
    if (criteria.query && criteria.query.length > 100) {
      throw new Error('La recherche ne peut pas dépasser 100 caractères')
    }

    // Validation de la page
    if (criteria.pagination && criteria.pagination.page < 1) {
      throw new Error('La page doit être supérieure à 0')
    }

    // Validation de la limite
    if (criteria.pagination && criteria.pagination.limit > 100) {
      throw new Error('La limite ne peut pas dépasser 100')
    }
  }
}
```

---

### Infrastructure Layer (`src/domains/memberships/search/infrastructure/`)

**Responsabilité** : Accès aux données Firestore, implémentation concrète.

#### `FirestoreSearchRepository.ts`
```typescript
export class FirestoreSearchRepository implements ISearchRepository {
  constructor(
    private db: Firestore,
    private collectionName: string = 'membership-requests'
  ) {}

  async search(criteria: SearchCriteria): Promise<SearchResult<MembershipRequest>> {
    const collectionRef = collection(this.db, this.collectionName)
    const constraints: any[] = []

    // Filtres
    if (criteria.filters?.isPaid !== undefined) {
      constraints.push(where('isPaid', '==', criteria.filters.isPaid))
    }

    if (criteria.filters?.status) {
      constraints.push(where('status', '==', criteria.filters.status))
    }

    // Recherche par searchableText
    if (criteria.query) {
      constraints.push(where('searchableText', '>=', criteria.query))
      constraints.push(where('searchableText', '<=', criteria.query + '\uf8ff'))
    }

    // Tri
    constraints.push(orderBy('createdAt', 'desc'))

    // Pagination
    const page = criteria.pagination?.page || 1
    const limit = criteria.pagination?.limit || 20

    if (page > 1) {
      // Calculer l'offset pour obtenir le curseur
      const offset = (page - 1) * limit
      const offsetQuery = query(collectionRef, ...constraints, limit(offset))
      const offsetSnapshot = await getDocs(offsetQuery)

      if (offsetSnapshot.docs.length > 0) {
        const lastDoc = offsetSnapshot.docs[offsetSnapshot.docs.length - 1]
        constraints.push(startAfter(lastDoc))
      }
    }

    constraints.push(limit(limit))

    // Exécuter la requête
    const q = query(collectionRef, ...constraints)
    const snapshot = await getDocs(q)

    // Transformer les documents
    const items = snapshot.docs.map(doc => 
      this.transformDocument(doc.id, doc.data())
    )

    // Compter le total
    const countQuery = query(collectionRef, ...constraints.slice(0, -1)) // Sans limit
    const totalCount = await getCountFromServer(countQuery)

    return {
      items,
      pagination: {
        page,
        limit,
        totalItems: totalCount.data().count,
        totalPages: Math.ceil(totalCount.data().count / limit),
        hasNextPage: page < Math.ceil(totalCount.data().count / limit),
        hasPrevPage: page > 1,
      },
    }
  }
}
```

---

## 🔄 Flux de Recherche

```
1. User saisit "Jean Dupont" dans l'input
   ↓
2. handleSearch("Jean Dupont")
   ↓
3. SearchService.search({ query: "Jean Dupont", ... })
   ↓
4. TextNormalizer.normalize("Jean Dupont") → "jean dupont"
   ↓
5. FirestoreSearchRepository.search({ query: "jean dupont", ... })
   ↓
6. Requête Firestore:
   where('searchableText', '>=', 'jean dupont')
   where('searchableText', '<=', 'jean dupont\uf8ff')
   orderBy('createdAt', 'desc')
   limit(20)
   ↓
7. Résultats transformés en MembershipRequest[]
   ↓
8. SearchResult retourné avec pagination
   ↓
9. UI affiche les résultats
```

---

## 🧪 Tests

### Tests Unitaires

#### `TextNormalizer.test.ts`
```typescript
describe('TextNormalizer', () => {
  it('devrait normaliser un texte avec accents', () => {
    expect(TextNormalizer.normalize('Élève')).toBe('eleve')
  })

  it('devrait normaliser un numéro de téléphone', () => {
    expect(TextNormalizer.normalizePhone('+241 65 67 17 34')).toBe('+24165671734')
  })
})
```

#### `SearchableTextGenerator.test.ts`
```typescript
describe('SearchableTextGenerator', () => {
  it('devrait générer un searchableText complet', () => {
    const request = createMockRequest({
      id: '1234.MK.5678',
      matricule: '1234.MK.5678',
      identity: {
        firstName: 'Jean',
        lastName: 'Dupont',
        email: 'jean@example.com',
        contacts: ['+24165671734'],
      },
    })

    const searchableText = SearchableTextGenerator.generate(request)
    
    expect(searchableText).toContain('1234.mk.5678')
    expect(searchableText).toContain('jean')
    expect(searchableText).toContain('dupont')
    expect(searchableText).toContain('jean@example.com')
    expect(searchableText).toContain('+24165671734')
  })
})
```

---

## 📊 Métriques et Performance

### Objectifs de Performance

- **Temps de réponse** : < 200ms pour une recherche simple
- **Temps de réponse** : < 500ms pour une recherche avec filtres
- **Coût Firestore** : Minimiser les lectures (utiliser les index)

### Monitoring

- Temps de réponse moyen
- Nombre de recherches par jour
- Taux de résultats vides
- Coût Firestore (lectures)

---

## 🔐 Sécurité

### Validation des Entrées

- Longueur minimale : 2 caractères
- Longueur maximale : 100 caractères
- Sanitization : Échapper les caractères spéciaux
- Rate limiting : Limiter le nombre de recherches par utilisateur

### Protection contre les Abus

- Limiter la taille des pages (max 100)
- Timeout des requêtes (5s)
- Logging des recherches suspectes

---

## 📝 Prochaines Étapes

1. ✅ Créer la structure de dossiers
2. ✅ Implémenter `TextNormalizer`
3. ✅ Implémenter `SearchableTextGenerator`
4. ✅ Implémenter `FirestoreSearchRepository`
5. ✅ Implémenter `SearchService`
6. ✅ Intégrer dans `MembershipRepositoryV2`
7. ✅ Créer les tests unitaires
8. ✅ Créer un script de migration pour les documents existants
9. ✅ Ajouter les index Firestore nécessaires
10. ✅ Tester avec des données réelles
