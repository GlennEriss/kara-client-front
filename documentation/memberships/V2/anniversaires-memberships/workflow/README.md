# Workflow – Anniversaires des membres (V2)

## 1. Architecture des composants

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            BirthdaysPage.tsx                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │                         BirthdaysHeader                                 ││
│  │  [Titre] [Compteur] [Recherche Algolia] [Filtres mois] [Export] [Vue]  ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                                                             │
│  ┌──────────────────────────────┐  ┌──────────────────────────────────────┐│
│  │      Vue Liste               │  │       Vue Calendrier                 ││
│  │  ┌─────┬─────┬─────┬─────┬───│─┤  ┌───────────────────────────────┐   ││
│  │  │Card │Card │Card │Card │Car│ │  │   Janvier 2026                │   ││
│  │  └─────┴─────┴─────┴─────┴───│─┤  │ D  L  M  M  J  V  S           │   ││
│  │  ┌─────┬─────┬─────┬─────┬───│─┤  │ .. .. .. 1  2  3  4           │   ││
│  │  │Card │Card │Card │Card │Car│ │  │  5  6  7  8  9 10 11          │   ││
│  │  └─────┴─────┴─────┴─────┴───│─┤  │    ▲ 2 anniversaires          │   ││
│  │  ┌─────┬─────┬─────┬─────┬───│─┤  │ 12 13 14 15 16 17 18          │   ││
│  │  │Card │Card │Card │Card │Car│ │  │ 19 20 21 22 23 24 25          │   ││
│  │  └─────┴─────┴─────┴─────┴───│─┤  │ 26 27 28 29 30 31             │   ││
│  │  ┌─────┬─────┬─────┬─────┬───│─┤  └───────────────────────────────┘   ││
│  │  │Card │Card │Card │Card │Car│ │  [< Mois précédent] [Mois suivant >] ││
│  │  └─────┴─────┴─────┴─────┴───│─┤                                      ││
│  │                              │  │                                      ││
│  │  [Pagination: < 1 2 3 ... >] │  │                                      ││
│  └──────────────────────────────┘  └──────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────────┘
```

## 2. Hooks

### 2.1 `useMemberBirthdays`

**Responsabilité :** Gère la liste paginée des anniversaires triée par date la plus proche.

```typescript
// src/domains/memberships/hooks/useMemberBirthdays.ts

interface UseMemberBirthdaysOptions {
  page: number
  itemsPerPage?: number // default: 20
  months?: number[]     // filtres par mois (ex: [1, 2] pour Jan, Fév)
  searchQuery?: string  // recherche locale (après fetch)
}

interface UseMemberBirthdaysReturn {
  data: BirthdayMember[]
  pagination: {
    currentPage: number
    totalPages: number
    totalItems: number
    hasNextPage: boolean
    hasPrevPage: boolean
  }
  isLoading: boolean
  isError: boolean
  error: unknown
  goToNextPage: () => void
  goToPrevPage: () => void
  refetch: () => void
}

export function useMemberBirthdays(options: UseMemberBirthdaysOptions): UseMemberBirthdaysReturn {
  const { page = 1, itemsPerPage = 20, months = [], searchQuery } = options
  
  return useQuery({
    queryKey: ['birthdays', 'list', { page, months, itemsPerPage }],
    queryFn: () => BirthdaysRepository.getPaginated({
      page,
      limit: itemsPerPage,
      months,
    }),
    staleTime: 5 * 60 * 1000,  // 5 minutes
    gcTime: 10 * 60 * 1000,    // 10 minutes
    select: (data) => {
      // Filtrage local par recherche si fourni
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        return {
          ...data,
          data: data.data.filter(b => 
            b.firstName.toLowerCase().includes(query) ||
            b.lastName.toLowerCase().includes(query) ||
            b.matricule.toLowerCase().includes(query)
          )
        }
      }
      return data
    }
  })
}
```

### 2.2 `useBirthdaysByMonth`

**Responsabilité :** Gère les anniversaires d'un mois spécifique pour le calendrier.

```typescript
// src/domains/memberships/hooks/useBirthdaysByMonth.ts

interface UseBirthdaysByMonthOptions {
  month: number  // 1-12
  year: number   // ex: 2026
}

interface UseBirthdaysByMonthReturn {
  data: BirthdayMember[]
  isLoading: boolean
  isError: boolean
  error: unknown
  refetch: () => void
}

export function useBirthdaysByMonth(options: UseBirthdaysByMonthOptions): UseBirthdaysByMonthReturn {
  const { month, year } = options
  
  return useQuery({
    queryKey: ['birthdays', 'calendar', month, year],
    queryFn: () => BirthdaysRepository.getByMonth(month, year),
    staleTime: 10 * 60 * 1000,  // 10 minutes
    gcTime: 30 * 60 * 1000,     // 30 minutes
  })
}
```

### 2.3 `useBirthdaySearch`

**Responsabilité :** Gère la recherche Algolia pour trouver un membre et son mois d'anniversaire.

```typescript
// src/domains/memberships/hooks/useBirthdaySearch.ts

interface UseBirthdaySearchOptions {
  query: string
  enabled?: boolean
}

interface BirthdaySearchHit {
  objectID: string      // matricule
  firstName: string
  lastName: string
  birthMonth: number    // 1-12
  birthDay: number      // 1-31
  photoURL?: string
}

interface UseBirthdaySearchReturn {
  hits: BirthdaySearchHit[]
  isLoading: boolean
  isError: boolean
  targetMonth: number | null  // mois du premier résultat pour navigation
}

export function useBirthdaySearch(options: UseBirthdaySearchOptions): UseBirthdaySearchReturn {
  const { query, enabled = true } = options
  
  return useQuery({
    queryKey: ['birthdays', 'search', query],
    queryFn: () => BirthdaysAlgoliaService.search(query),
    enabled: enabled && query.length >= 2,
    staleTime: 60 * 1000,  // 1 minute
    select: (result) => ({
      hits: result.hits,
      targetMonth: result.hits[0]?.birthMonth || null,
    })
  })
}
```

## 3. Services

### 3.1 `BirthdaysService`

**Responsabilité :** Logique métier pour le calcul des anniversaires.

```typescript
// src/domains/memberships/services/BirthdaysService.ts

export class BirthdaysService {
  /**
   * Calcule les informations d'anniversaire pour un membre
   */
  static calculateBirthdayInfo(
    birthDate: string,
    referenceDate: Date = new Date()
  ): BirthdayInfo {
    const birth = new Date(birthDate)
    const today = new Date(referenceDate)
    today.setHours(0, 0, 0, 0)
    
    const currentYear = today.getFullYear()
    const birthMonth = birth.getMonth()
    const birthDay = birth.getDate()
    
    // Prochain anniversaire
    let nextBirthday = new Date(currentYear, birthMonth, birthDay)
    if (nextBirthday <= today) {
      nextBirthday = new Date(currentYear + 1, birthMonth, birthDay)
    }
    
    // Jours restants
    const daysUntil = Math.ceil(
      (nextBirthday.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    )
    
    // Âge au prochain anniversaire
    const age = nextBirthday.getFullYear() - birth.getFullYear()
    
    return {
      birthDate: birth,
      nextBirthday,
      daysUntil,
      age,
      isToday: daysUntil === 0,
      isTomorrow: daysUntil === 1,
      isThisWeek: daysUntil <= 7,
    }
  }
  
  /**
   * Calcule le jour de l'année (1-366)
   */
  static calculateDayOfYear(date: Date): number {
    const start = new Date(date.getFullYear(), 0, 0)
    const diff = date.getTime() - start.getTime()
    const oneDay = 1000 * 60 * 60 * 24
    return Math.floor(diff / oneDay)
  }
  
  /**
   * Transforme un User en BirthdayMember
   */
  static transformToBirthdayMember(user: User, year: number): BirthdayMember {
    const info = this.calculateBirthdayInfo(user.birthDate)
    
    return {
      id: user.id,
      matricule: user.matricule,
      firstName: user.firstName,
      lastName: user.lastName,
      photoURL: user.photoURL,
      birthDate: user.birthDate,
      birthMonth: user.birthMonth,
      birthDay: user.birthDay,
      ...info,
    }
  }
}
```

### 3.2 `BirthdaysAlgoliaService`

**Responsabilité :** Recherche Algolia pour les anniversaires.

```typescript
// src/domains/memberships/services/BirthdaysAlgoliaService.ts

export class BirthdaysAlgoliaService {
  private static client = getMembersAlgoliaSearchService()
  
  /**
   * Recherche un membre par nom/prénom/matricule
   * Retourne les résultats avec le mois d'anniversaire
   */
  static async search(query: string): Promise<BirthdaySearchResult> {
    const algoliaClient = getAlgoliaClient()
    const indexName = getMembersIndexName()
    
    const response = await algoliaClient.search({
      requests: [{
        indexName,
        query,
        filters: 'isActive:true AND (roles:"Adherant" OR roles:"Bienfaiteur" OR roles:"Sympathisant")',
        attributesToRetrieve: [
          'objectID',
          'firstName',
          'lastName',
          'birthMonth',
          'birthDay',
          'photoURL',
        ],
        hitsPerPage: 10,
      }],
    })
    
    const hits = response.results[0]?.hits || []
    
    return {
      hits: hits.map(hit => ({
        objectID: hit.objectID,
        firstName: hit.firstName,
        lastName: hit.lastName,
        birthMonth: hit.birthMonth,
        birthDay: hit.birthDay,
        photoURL: hit.photoURL,
      })),
      targetMonth: hits[0]?.birthMonth || null,
    }
  }
}
```

## 4. Repository

### 4.1 `BirthdaysRepository`

**Responsabilité :** Accès Firestore pour les données d'anniversaires.

```typescript
// src/domains/memberships/repositories/BirthdaysRepository.ts

export class BirthdaysRepository {
  private static instance: BirthdaysRepository | null = null
  
  static getInstance(): BirthdaysRepository {
    if (!this.instance) {
      this.instance = new BirthdaysRepository()
    }
    return this.instance
  }
  
  /**
   * Récupère la liste paginée des anniversaires triée par date la plus proche
   */
  async getPaginated(options: BirthdaysPaginationOptions): Promise<PaginatedBirthdays> {
    const { page, limit, months } = options
    const usersRef = collection(db, 'users')
    const todayDayOfYear = BirthdaysService.calculateDayOfYear(new Date())
    
    // Avec filtres de mois
    if (months && months.length > 0) {
      return this.getPaginatedByMonths(months, page, limit)
    }
    
    // Sans filtres : tri par anniversaire le plus proche
    // Query 1 : Anniversaires à venir
    const q1 = query(
      usersRef,
      where('roles', 'array-contains-any', ['Adherant', 'Bienfaiteur', 'Sympathisant']),
      where('birthDayOfYear', '>=', todayDayOfYear),
      orderBy('birthDayOfYear', 'asc')
    )
    
    // Query 2 : Anniversaires passés (pour compléter)
    const q2 = query(
      usersRef,
      where('roles', 'array-contains-any', ['Adherant', 'Bienfaiteur', 'Sympathisant']),
      where('birthDayOfYear', '<', todayDayOfYear),
      orderBy('birthDayOfYear', 'asc')
    )
    
    const [snapshot1, snapshot2, countSnapshot] = await Promise.all([
      getDocs(q1),
      getDocs(q2),
      this.getTotalCount()
    ])
    
    // Merger : à venir d'abord, puis passés
    const allDocs = [...snapshot1.docs, ...snapshot2.docs]
    const startIndex = (page - 1) * limit
    const pageDocs = allDocs.slice(startIndex, startIndex + limit)
    
    const currentYear = new Date().getFullYear()
    const data = pageDocs.map(doc => 
      BirthdaysService.transformToBirthdayMember(doc.data() as User, currentYear)
    )
    
    return {
      data,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(countSnapshot / limit),
        totalItems: countSnapshot,
        hasNextPage: startIndex + limit < allDocs.length,
        hasPrevPage: page > 1,
      }
    }
  }
  
  /**
   * Récupère les anniversaires d'un mois spécifique (pour calendrier)
   */
  async getByMonth(month: number, year: number): Promise<BirthdayMember[]> {
    const usersRef = collection(db, 'users')
    
    const q = query(
      usersRef,
      where('birthMonth', '==', month),
      where('roles', 'array-contains-any', ['Adherant', 'Bienfaiteur', 'Sympathisant']),
      orderBy('birthDay', 'asc')
    )
    
    const snapshot = await getDocs(q)
    
    return snapshot.docs.map(doc => 
      BirthdaysService.transformToBirthdayMember(doc.data() as User, year)
    )
  }
  
  /**
   * Récupère les anniversaires filtrés par plusieurs mois
   */
  private async getPaginatedByMonths(
    months: number[],
    page: number,
    limit: number
  ): Promise<PaginatedBirthdays> {
    const usersRef = collection(db, 'users')
    
    // Limite Firestore : max 10 valeurs pour 'in'
    if (months.length > 10) {
      const chunks = this.chunkArray(months, 10)
      const results = await Promise.all(
        chunks.map(chunk => this.getPaginatedByMonths(chunk, 1, 10000))
      )
      const allData = results.flatMap(r => r.data)
      // Trier et paginer
      allData.sort((a, b) => a.birthDay - b.birthDay)
      const startIndex = (page - 1) * limit
      return {
        data: allData.slice(startIndex, startIndex + limit),
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(allData.length / limit),
          totalItems: allData.length,
          hasNextPage: startIndex + limit < allData.length,
          hasPrevPage: page > 1,
        }
      }
    }
    
    const q = query(
      usersRef,
      where('birthMonth', 'in', months),
      where('roles', 'array-contains-any', ['Adherant', 'Bienfaiteur', 'Sympathisant']),
      orderBy('birthDay', 'asc')
    )
    
    const [snapshot, countSnapshot] = await Promise.all([
      getDocs(q),
      getCountFromServer(q)
    ])
    
    const currentYear = new Date().getFullYear()
    const allData = snapshot.docs.map(doc => 
      BirthdaysService.transformToBirthdayMember(doc.data() as User, currentYear)
    )
    
    const startIndex = (page - 1) * limit
    
    return {
      data: allData.slice(startIndex, startIndex + limit),
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(countSnapshot.data().count / limit),
        totalItems: countSnapshot.data().count,
        hasNextPage: startIndex + limit < allData.length,
        hasPrevPage: page > 1,
      }
    }
  }
  
  /**
   * Compte total des membres avec date de naissance
   */
  private async getTotalCount(): Promise<number> {
    const usersRef = collection(db, 'users')
    const q = query(
      usersRef,
      where('roles', 'array-contains-any', ['Adherant', 'Bienfaiteur', 'Sympathisant'])
    )
    const countSnapshot = await getCountFromServer(q)
    return countSnapshot.data().count
  }
  
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = []
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size))
    }
    return chunks
  }
}
```

## 5. Types

```typescript
// src/domains/memberships/types/birthdays.ts

export interface BirthdayMember {
  id: string
  matricule: string
  firstName: string
  lastName: string
  photoURL?: string
  birthDate: string
  birthMonth: number    // 1-12
  birthDay: number      // 1-31
  nextBirthday: Date
  daysUntil: number
  age: number
  isToday: boolean
  isTomorrow: boolean
  isThisWeek: boolean
}

export interface BirthdayInfo {
  birthDate: Date
  nextBirthday: Date
  daysUntil: number
  age: number
  isToday: boolean
  isTomorrow: boolean
  isThisWeek: boolean
}

export interface BirthdayFilters {
  months: number[]      // ex: [1, 2] pour Jan/Fév
}

export interface BirthdaysPaginationOptions {
  page: number
  limit: number
  months?: number[]
}

export interface PaginatedBirthdays {
  data: BirthdayMember[]
  pagination: {
    currentPage: number
    totalPages: number
    totalItems: number
    hasNextPage: boolean
    hasPrevPage: boolean
  }
}

export interface BirthdaySearchResult {
  hits: BirthdaySearchHit[]
  targetMonth: number | null
}

export interface BirthdaySearchHit {
  objectID: string
  firstName: string
  lastName: string
  birthMonth: number
  birthDay: number
  photoURL?: string
}
```

## 6. Composants

### 6.1 `BirthdayCard`

Card individuelle affichant un membre et son anniversaire.

```tsx
// src/domains/memberships/components/birthdays/BirthdayCard.tsx

interface BirthdayCardProps {
  member: BirthdayMember
  isHighlighted?: boolean
}

export function BirthdayCard({ member, isHighlighted }: BirthdayCardProps) {
  return (
    <Card 
      className={cn(
        "transition-shadow hover:shadow-md",
        isHighlighted && "ring-2 ring-pink-500"
      )}
      data-testid={`birthday-card-${member.matricule}`}
    >
      <CardContent className="p-4 text-center">
        {/* Photo */}
        <Avatar className="w-16 h-16 mx-auto mb-2">
          <AvatarImage src={member.photoURL} />
          <AvatarFallback>
            {member.firstName[0]}{member.lastName[0]}
          </AvatarFallback>
        </Avatar>
        
        {/* Nom */}
        <p className="font-semibold text-gray-900 truncate">
          {member.lastName.toUpperCase()}
        </p>
        
        {/* Prénom */}
        <p className="text-gray-600 truncate">{member.firstName}</p>
        
        {/* Date anniversaire */}
        <p className="text-sm text-pink-600 mt-1">
          {format(member.nextBirthday, 'dd MMMM', { locale: fr })}
        </p>
        
        {/* Matricule */}
        <p className="text-xs text-gray-400 mt-1 truncate">
          {member.matricule}
        </p>
        
        {/* Age et J-X */}
        <div className="flex justify-center items-center gap-2 mt-2">
          <span className="text-sm text-gray-500">{member.age} ans</span>
          <Badge variant={member.isToday ? 'default' : 'secondary'}>
            {member.isToday ? "Aujourd'hui" : `J-${member.daysUntil}`}
          </Badge>
        </div>
      </CardContent>
    </Card>
  )
}
```

## 7. Cache React Query

| Query Key | Durée cache | Invalidation |
|-----------|------------|--------------|
| `['birthdays', 'list', {...}]` | 5 min | Manuelle ou après 5 min |
| `['birthdays', 'calendar', month, year]` | 10 min | Manuelle ou après 10 min |
| `['birthdays', 'search', query]` | 1 min | Automatique |

## 8. Checklist d'implémentation

- [ ] Créer les types `src/domains/memberships/types/birthdays.ts`
- [ ] Créer `BirthdaysService.ts`
- [ ] Créer `BirthdaysAlgoliaService.ts`
- [ ] Créer `BirthdaysRepository.ts`
- [ ] Créer `useMemberBirthdays.ts`
- [ ] Créer `useBirthdaysByMonth.ts`
- [ ] Créer `useBirthdaySearch.ts`
- [ ] Créer `BirthdayCard.tsx`
- [ ] Créer `BirthdaysList.tsx`
- [ ] Créer `BirthdaysCalendar.tsx`
- [ ] Créer `BirthdaysFilters.tsx`
- [ ] Créer `BirthdaysSearch.tsx`
- [ ] Créer `BirthdaysPage.tsx`
- [ ] Tests unitaires (hooks, services)
- [ ] Tests d'intégration
