# V2 – Anniversaires des membres (`anniversaires-memberships`)

## 1. Vue d'ensemble

La fonctionnalité Anniversaires permet aux administrateurs de visualiser et gérer les anniversaires des membres de l'association. Elle comprend :
- Une **liste paginée** triée par anniversaire le plus proche
- Un **calendrier mensuel** avec affichage optimisé
- Une **recherche Algolia** par nom, prénom et matricule
- Des **filtres par mois** avec multi-sélection
- Des **exports PDF/Excel**

## 2. Architecture V2

### 2.1 Problèmes de la V1

| Problème | Impact |
|----------|--------|
| Charge tous les membres (jusqu'à 10K) | Coûteux (10K reads Firestore) |
| Calcul côté client | Lent avec beaucoup de données |
| Pagination côté client | Pas de vraie pagination serveur |
| Pas de cache intelligent | Re-fetch à chaque navigation |

### 2.2 Solutions V2

| Solution | Technologie |
|----------|-------------|
| Recherche full-text | **Algolia** (index `members-{env}`) |
| Liste paginée | **Firestore** avec curseur + `getCountFromServer` |
| Tri par anniversaire proche | Champ `birthDayOfYear` + requêtes intelligentes |
| Cache par mois | **React Query** avec `staleTime: 10min` |
| Filtres par mois | `where('birthMonth', 'in', [...])` |

## 3. Flux de données

```
┌─────────────────────────────────────────────────────────────────┐
│                     ANNIVERSAIRES V2                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────────┐ │
│  │   RECHERCHE │───▶│   ALGOLIA   │───▶│ Navigation vers mois│ │
│  │ (nom/matr.) │    │ members-env │    │ + highlight membre  │ │
│  └─────────────┘    └─────────────┘    └─────────────────────┘ │
│                                                                 │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────────┐ │
│  │    LISTE    │───▶│  FIRESTORE  │───▶│ Cache React Query   │ │
│  │  (paginée)  │    │   + cursor  │    │ par page/filtres    │ │
│  └─────────────┘    └─────────────┘    └─────────────────────┘ │
│                                                                 │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────────┐ │
│  │  CALENDRIER │───▶│  FIRESTORE  │───▶│ Cache React Query   │ │
│  │  (par mois) │    │ birthMonth  │    │ par mois/année      │ │
│  └─────────────┘    └─────────────┘    └─────────────────────┘ │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## 4. Stratégie de tri "Anniversaire le plus proche"

### 4.1 Problématique

Aujourd'hui = 23/01/2026
- Membre A né le 22/01 → prochain anniv = 22/01/2027 (334 jours)
- Membre B né le 24/01 → prochain anniv = 24/01/2026 (1 jour)
- Membre C né le 15/02 → prochain anniv = 15/02/2026 (23 jours)

**Ordre attendu :** B (J-1) → C (J-23) → A (J-334)

### 4.2 Solution technique

1. **Stocker `birthDayOfYear`** (1-366) pour chaque membre
   - Calcul : jour de l'année de la date de naissance
   - Ex: 15 février = jour 46

2. **Deux requêtes Firestore** pour pagination circulaire :
   ```typescript
   // Query 1 : Anniversaires à venir (du jour courant à fin d'année)
   const todayDayOfYear = calculateDayOfYear(new Date())
   const queryUpcoming = query(
     usersRef,
     where('birthDayOfYear', '>=', todayDayOfYear),
     orderBy('birthDayOfYear', 'asc'),
     limit(pageSize)
   )
   
   // Query 2 : Anniversaires passés (début d'année au jour courant)
   const queryPast = query(
     usersRef,
     where('birthDayOfYear', '<', todayDayOfYear),
     orderBy('birthDayOfYear', 'asc'),
     limit(pageSize)
   )
   ```

3. **Merger les résultats** : Query1 + Query2 pour avoir l'ordre correct

## 5. Filtres par mois

### 5.1 Multi-sélection

L'admin peut sélectionner plusieurs mois (ex: janvier + février) :

```typescript
// Interface des filtres
interface BirthdayFilters {
  months: number[] // [1, 2] pour janvier et février
}

// Requête Firestore
const query = query(
  usersRef,
  where('birthMonth', 'in', filters.months), // max 10 valeurs
  orderBy('birthDay', 'asc')
)
```

### 5.2 Filtre "Tous les mois"

Par défaut, aucun filtre de mois n'est appliqué. L'ordre est par anniversaire le plus proche (voir section 4).

### 5.3 Bouton de réinitialisation

Remet les filtres à leur état par défaut :
- Mois : "Tous"
- Recherche : vide
- Pagination : page 1

## 6. Vue Calendrier

### 6.1 Fetch par mois uniquement

**Problème V1 :** Fetch de toute la collection (1M de membres = 1M reads)

**Solution V2 :** Fetch uniquement le mois affiché

```typescript
// Hook : useBirthdaysByMonth
const { data, isLoading } = useQuery({
  queryKey: ['birthdays', 'calendar', selectedMonth, selectedYear],
  queryFn: () => fetchBirthdaysByMonth(selectedMonth, selectedYear),
  staleTime: 10 * 60 * 1000, // 10 minutes
  gcTime: 30 * 60 * 1000,    // 30 minutes
})
```

### 6.2 Cache React Query

Navigation entre mois avec cache intelligent :
- Janvier → cache miss → fetch Firestore
- Février → cache miss → fetch Firestore
- Janvier (retour) → cache hit → pas de fetch
- Février (retour) → cache hit → pas de fetch

### 6.3 Recherche et navigation automatique

Quand l'admin recherche "Ndong Obiang" :
1. Algolia trouve le membre
2. Récupère son `birthMonth` (ex: 8 pour août)
3. Le calendrier navigue automatiquement vers août
4. Le membre est mis en surbrillance

## 7. Comptage des anniversaires

### 7.1 Total de membres

```typescript
// Utiliser getCountFromServer pour le comptage
const countQuery = query(
  usersRef,
  where('roles', 'array-contains-any', ['Adherant', 'Bienfaiteur', 'Sympathisant']),
  where('birthDate', '!=', null)
)
const countSnapshot = await getCountFromServer(countQuery)
const totalMembers = countSnapshot.data().count
```

### 7.2 Comptage par filtre

Quand des filtres de mois sont appliqués :
```typescript
const countQuery = query(
  usersRef,
  where('birthMonth', 'in', selectedMonths),
  where('roles', 'array-contains-any', ['Adherant', 'Bienfaiteur', 'Sympathisant'])
)
```

## 8. Interface utilisateur

### 8.1 Layout des cards

| Propriété | Valeur |
|-----------|--------|
| Cards par ligne | 5 |
| Cards par page | 20 (4 lignes × 5) |
| Responsive | 1-2-3-4-5 selon viewport |

### 8.2 Contenu d'une card

```
┌─────────────────────┐
│      [PHOTO]        │
│                     │
│    Nom LASTNAME     │
│    Prénom           │
│    26 janvier       │
│    1234.MK.567890   │
│    29 ans   J-3     │
└─────────────────────┘
```

### 8.3 data-testid

| Élément | data-testid |
|---------|-------------|
| Conteneur principal | `member-birthdays-container` |
| Champ recherche | `member-birthdays-search` |
| Filtres mois | `member-birthdays-month-filter` |
| Toggle liste/calendrier | `member-birthdays-view-toggle` |
| Card membre | `birthday-card-{matricule}` |
| Pagination | `member-birthdays-pagination` |
| Export Excel | `member-birthdays-export-excel` |
| Export PDF | `member-birthdays-export-pdf` |

## 9. Migration requise

### 9.1 Champs à ajouter dans `users`

| Champ | Type | Description |
|-------|------|-------------|
| `birthMonth` | number (1-12) | Mois de naissance |
| `birthDay` | number (1-31) | Jour de naissance |
| `birthDayOfYear` | number (1-366) | Jour de l'année |

### 9.2 Script de migration

Voir `documentation/memberships/V2/anniversaires-memberships/firebase/README.md`

## 10. Structure des fichiers

```
src/domains/memberships/
├── components/
│   └── birthdays/
│       ├── BirthdaysPage.tsx           # Composant page principal
│       ├── BirthdaysList.tsx           # Vue liste
│       ├── BirthdaysCalendar.tsx       # Vue calendrier
│       ├── BirthdayCard.tsx            # Card individuelle
│       ├── BirthdaysFilters.tsx        # Filtres par mois
│       ├── BirthdaysSearch.tsx         # Recherche Algolia
│       └── BirthdaysPagination.tsx     # Pagination
├── hooks/
│   ├── useMemberBirthdays.ts           # Hook principal (liste paginée)
│   ├── useBirthdaysByMonth.ts          # Hook calendrier
│   └── useBirthdaySearch.ts            # Hook recherche Algolia
├── services/
│   ├── BirthdaysService.ts             # Service métier
│   └── BirthdaysAlgoliaService.ts      # Service Algolia
├── repositories/
│   └── BirthdaysRepository.ts          # Accès Firestore
└── utils/
    ├── calculateDayOfYear.ts           # Calcul jour de l'année
    └── birthdayHelpers.ts              # Utilitaires divers
```

## 11. Documentation associée

| Document | Description |
|----------|-------------|
| [algolia/README.md](./algolia/README.md) | Configuration Algolia |
| [firebase/README.md](./firebase/README.md) | Indexes et règles Firestore |
| [workflow/README.md](./workflow/README.md) | Workflow détaillé |
| [sequence/main.puml](./sequence/main.puml) | Diagramme de séquence |
| [activite/main.puml](./activite/main.puml) | Diagramme d'activité |
| [tests/README.md](./tests/README.md) | Plan de tests |

## 12. Roadmap

- [x] Documentation V2
- [ ] Migration des données (birthMonth, birthDay, birthDayOfYear)
- [ ] Mise à jour index Algolia
- [ ] Création des indexes Firestore
- [ ] Hook `useMemberBirthdays`
- [ ] Hook `useBirthdaysByMonth`
- [ ] Hook `useBirthdaySearch`
- [ ] Service `BirthdaysService`
- [ ] Repository `BirthdaysRepository`
- [ ] Composants UI (cards, filtres, etc.)
- [ ] Tests unitaires
- [ ] Tests d'intégration
