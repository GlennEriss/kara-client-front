# Design System UI - Composants Réutilisables pour le Dashboard

## Vue d'ensemble

Ce document définit les composants UI réutilisables et le layout standard pour toutes les pages du dashboard. Ces composants seront utilisés dans le module `membership-requests` et dans tous les autres modules pour garantir une cohérence visuelle et fonctionnelle.

## Structure Standard d'une Page Dashboard

Toutes les pages du dashboard suivent cette structure standardisée :

```
DashboardPageLayout
├── PageHeader (intégré)
│   ├── title (Titre de la page)
│   ├── description (Description de la page)
│   └── actions (Actions optionnelles en haut à droite)
├── StatsSection (optionnel)
│   └── StatsCard[] (cartes de statistiques)
└── TabsSection (optionnel)
    └── Tabs
        ├── TabsList (onglets)
        └── TabsContent (contenu de chaque onglet)
            ├── FiltersBar (barre de filtres)
            ├── SearchInput (recherche)
            ├── DataView (liste/cards)
            └── Pagination (pagination)
```

---

## Composants UI Réutilisables

### 1. DashboardPageLayout ✅

**Chemin :** `src/components/layouts/DashboardPageLayout.tsx`

**Rôle :** Layout standard pour toutes les pages du dashboard.

**Props :**
```typescript
interface DashboardPageLayoutProps {
  title: string
  description?: string
  stats?: React.ReactNode  // Composant de statistiques (optionnel)
  actions?: React.ReactNode  // Actions en haut à droite (optionnel)
  children: React.ReactNode  // Contenu (tabs + contenu)
  className?: string
}
```

**Structure :**
- Header avec titre et description (style KARA)
- Section stats optionnelle
- Zone de contenu pour les tabs et le contenu

**Exemple d'utilisation :**
```tsx
<DashboardPageLayout
  title="Gestion des Demandes d'Inscription"
  description="Gérez les demandes d'adhésion soumises par les utilisateurs"
  stats={<MembershipRequestsStats />}
>
  <Tabs>...</Tabs>
</DashboardPageLayout>
```

---

### 2. SearchInput ✅

**Chemin :** `src/components/ui/search-input.tsx`

**Rôle :** Champ de recherche standardisé avec debounce et animations.

**Props :**
```typescript
type SearchVariant = 'default' | 'kara' | 'minimal' | 'glass'

interface SearchInputProps {
  placeholder?: string
  value: string
  onChange: (value: string) => void
  onClear?: () => void
  debounceMs?: number  // Délai de debounce (défaut: 300ms)
  className?: string
  disabled?: boolean
  autoFocus?: boolean
  isLoading?: boolean  // Affiche un spinner
  variant?: SearchVariant  // Style prédéfini (défaut: 'kara')
  size?: 'sm' | 'md' | 'lg'
}
```

**Variantes de style :**
- `default` : Style sobre avec bordures grises
- `kara` : Style KARA avec gradient, ombres et ligne d'accent animée
- `minimal` : Style minimaliste avec bordure inférieure uniquement
- `glass` : Style glassmorphism avec backdrop-blur

**Fonctionnalités :**
- ✅ Icône de recherche animée (scale au focus)
- ✅ Bouton de suppression (X) avec animation fade-in/zoom
- ✅ Debounce automatique pour limiter les requêtes
- ✅ Indicateur de chargement (spinner)
- ✅ Ligne d'accent animée (variant kara)
- ✅ Design cohérent KARA avec couleurs du thème

**Exemple d'utilisation :**
```tsx
// Style KARA (par défaut) - recommandé
<SearchInput
  placeholder="Rechercher par nom, email, téléphone..."
  value={searchQuery}
  onChange={setSearchQuery}
  variant="kara"
  size="md"
/>

// Style glass pour overlay
<SearchInput
  placeholder="Rechercher..."
  value={search}
  onChange={setSearch}
  variant="glass"
  isLoading={isSearching}
/>
```

---

### 3. Pagination ✅

**Chemin :** `src/components/ui/pagination.tsx`

**Rôle :** Composant de pagination standardisé et réutilisable.

**Props :**
```typescript
interface PaginationProps {
  currentPage: number
  totalPages: number
  totalItems: number
  itemsPerPage: number
  onPageChange: (page: number) => void
  onItemsPerPageChange?: (limit: number) => void  // Optionnel
  itemsPerPageOptions?: number[]  // Ex: [10, 25, 50, 100]
  showInfo?: boolean  // Afficher "Page X sur Y" (défaut: true)
  showItemsPerPage?: boolean  // Afficher le sélecteur (défaut: true)
  isLoading?: boolean
  className?: string
  infoLabel?: string  // Ex: "demandes", "membres" (défaut: "résultats")
}
```

**Composants affichés :**
- ✅ Bouton "Première page" (ChevronsLeft)
- ✅ Bouton "Précédent" (ChevronLeft)
- ✅ Numéros de pages avec ellipses (...) pour grandes listes
- ✅ Bouton "Suivant" (ChevronRight)
- ✅ Bouton "Dernière page" (ChevronsRight)
- ✅ Info : "Affichage de X à Y sur Z résultats" (optionnel)
- ✅ Sélecteur items par page (optionnel)

**Exemple d'utilisation :**
```tsx
<Pagination
  currentPage={filters.page}
  totalPages={data.pagination.totalPages}
  totalItems={data.pagination.totalItems}
  itemsPerPage={filters.limit}
  onPageChange={(page) => handleFilterChange('page', page)}
  itemsPerPageOptions={[10, 25, 50, 100]}
  onItemsPerPageChange={(limit) => handleFilterChange('limit', limit)}
  infoLabel="demandes"
/>
```

---

### 4. FilterBar ✅

**Chemin :** `src/components/ui/filter-bar.tsx`

**Rôle :** Barre de filtres horizontale standardisée.

**Props :**
```typescript
interface FilterBarProps {
  filters: FilterConfig[]
  values: Record<string, any>
  onChange: (filterKey: string, value: any) => void
  onReset?: () => void
  className?: string
  showActiveFilters?: boolean  // Afficher les badges (défaut: true)
  resetLabel?: string
}

interface FilterConfig {
  key: string
  label: string
  type: 'select' | 'date' | 'daterange' | 'checkbox' | 'multiselect'
  options?: { value: string; label: string }[]  // Pour select/multiselect
  placeholder?: string
  className?: string
}
```

**Fonctionnalités :**
- ✅ Filtres horizontaux (Select pour le moment, extensible)
- ✅ Badges pour afficher les filtres actifs
- ✅ Bouton "Réinitialiser" pour effacer tous les filtres
- ✅ Design responsive (stack vertical sur mobile)

**Exemple d'utilisation :**
```tsx
const filterConfigs: FilterConfig[] = [
  {
    key: 'status',
    label: 'Statut',
    type: 'select',
    options: [
      { value: 'pending', label: 'En attente' },
      { value: 'approved', label: 'Approuvées' },
    ],
  },
]

<FilterBar
  filters={filterConfigs}
  values={filters}
  onChange={handleFilterChange}
  onReset={() => setFilters(defaultFilters)}
/>
```

---

### 5. DataView ✅

**Chemin :** `src/components/ui/data-view.tsx`

**Rôle :** Affichage des données en liste ou en cards avec toggle.

**Props :**
```typescript
interface DataViewProps<T> {
  data: T[]
  viewMode?: 'list' | 'cards'  // Mode d'affichage (défaut: 'cards')
  onViewModeChange?: (mode: 'list' | 'cards') => void  // Toggle optionnel
  renderItem: (item: T, index: number) => React.ReactNode  // Pour vue liste
  renderCard?: (item: T, index: number) => React.ReactNode  // Pour vue cards
  emptyMessage?: string
  emptyIcon?: React.ComponentType<any>
  loading?: boolean
  loadingSkeleton?: React.ReactNode  // Skeleton personnalisé
  className?: string
  cardClassName?: string  // Classe pour la grille de cards
  listClassName?: string  // Classe pour la liste
}
```

**Fonctionnalités :**
- ✅ Toggle entre vue liste et vue cards (optionnel)
- ✅ Message d'état vide personnalisé avec icône optionnelle
- ✅ Skeleton de chargement personnalisable
- ✅ Design responsive (grille adaptative pour cards)

**Exemple d'utilisation :**
```tsx
<DataView
  data={membershipData.data}
  viewMode={viewMode}
  onViewModeChange={setViewMode}
  renderCard={(request) => <MembershipRequestCard request={request} />}
  renderItem={(request) => <MembershipRequestListItem request={request} />}
  emptyMessage="Aucune demande trouvée"
  loading={isLoading}
/>
```

---

### 6. StatsCard (Existant) ✅

**Chemin :** `src/components/ui/stats-card.tsx`

**Rôle :** Carte de statistiques standardisée avec variantes KARA.

**Utilisation :** Déjà documenté dans `DESIGN_SYSTEM_COULEURS_KARA.md`

**Variantes disponibles :**
- `kara-blue` (par défaut)
- `kara-gold`
- `success`
- `warning`
- `error`

---

## Spécifications de Design

### Palette de Couleurs KARA

```typescript
const karaColors = {
  primary: {
    dark: '#234D65',    // kara-primary-dark
    light: '#2c5a73',   // kara-primary-light
  },
  accent: {
    gold: '#CBB171',    // kara-accent-gold
  },
  status: {
    success: '#10b981',  // green-500
    warning: '#f59e0b',  // amber-500
    error: '#ef4444',    // red-500
    info: '#3b82f6',     // blue-500
  },
}
```

### Typographie

- **Titre de page** : `text-2xl sm:text-3xl lg:text-4xl font-black` + gradient KARA
- **Description** : `text-sm sm:text-base lg:text-lg text-gray-600`
- **Labels de filtres** : `text-xs font-medium text-gray-700`
- **Texte de recherche** : `text-sm`

### Espacements

- **Container principal** : `space-y-4 sm:space-y-6 p-3 sm:p-6`
- **Sections** : `space-y-4` ou `space-y-6`
- **Éléments dans une barre** : `gap-3` ou `gap-4`

### Responsive

- **Mobile** : Stack vertical, padding réduit (`p-3 sm:p-6`)
- **Tablet** : 2 colonnes pour les stats, filtres horizontaux
- **Desktop** : 3-4 colonnes pour les stats, layout complet

---

## Exemples d'Utilisation

### Exemple 1 : Page Complète avec Stats et Tabs

```tsx
// membership-requests/page.tsx
'use client'

import { useState } from 'react'
import { DashboardPageLayout } from '@/components/layouts/DashboardPageLayout'
import { SearchInput } from '@/components/ui/search-input'
import { FilterBar, type FilterConfig } from '@/components/ui/filter-bar'
import { DataView } from '@/components/ui/data-view'
import { Pagination } from '@/components/ui/pagination'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { StatsCard } from '@/components/ui/stats-card'
import { useMembershipRequests } from '@/hooks/useMembershipRequests'

export default function MembershipRequestsPage() {
  const [filters, setFilters] = useState({
    status: 'all' as const,
    searchQuery: '',
    page: 1,
    limit: 10,
  })
  const [viewMode, setViewMode] = useState<'list' | 'cards'>('cards')
  
  const { data, isLoading } = useMembershipRequests({
    page: filters.page,
    limit: filters.limit,
    status: filters.status,
    searchQuery: filters.searchQuery,
  })

  const filterConfigs: FilterConfig[] = [
    {
      key: 'status',
      label: 'Statut',
      type: 'select',
      options: [
        { value: 'pending', label: 'En attente' },
        { value: 'approved', label: 'Approuvées' },
      ],
    },
  ]

  const stats = data ? (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatsCard
        title="Total"
        value={data.pagination.totalItems}
        variant="kara-blue"
        icon={() => <span>📊</span>}
      />
    </div>
  ) : null

  return (
    <DashboardPageLayout
      title="Gestion des Demandes d'Inscription"
      description="Gérez les demandes d'adhésion soumises par les utilisateurs"
      stats={stats}
    >
      <Tabs>
        <TabsList>
          <TabsTrigger value="all">Toutes</TabsTrigger>
          <TabsTrigger value="pending">En attente</TabsTrigger>
        </TabsList>
        
        <TabsContent value="all" className="space-y-4 mt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <SearchInput
                placeholder="Rechercher par nom, email..."
                value={filters.searchQuery}
                onChange={(value) => setFilters(prev => ({ ...prev, searchQuery: value, page: 1 }))}
              />
            </div>
            <FilterBar
              filters={filterConfigs}
              values={filters}
              onChange={(key, value) => setFilters(prev => ({ ...prev, [key]: value, page: 1 }))}
            />
          </div>
          
          <DataView
            data={data?.data || []}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            renderCard={(request) => <MembershipRequestCard request={request} />}
            emptyMessage="Aucune demande trouvée"
            loading={isLoading}
          />
          
          {data && (
            <Pagination
              currentPage={filters.page}
              totalPages={data.pagination.totalPages}
              totalItems={data.pagination.totalItems}
              itemsPerPage={filters.limit}
              onPageChange={(page) => setFilters(prev => ({ ...prev, page }))}
              infoLabel="demandes"
            />
          )}
        </TabsContent>
      </Tabs>
    </DashboardPageLayout>
  )
}
```

---

## Checklist de Création

### Composants Créés ✅

- [x] `DashboardPageLayout.tsx` - Layout principal + PageHeader intégré
- [x] `search-input.tsx` - Champ de recherche avec debounce
- [x] `pagination.tsx` - Pagination complète (basé sur MembershipPagination)
- [x] `filter-bar.tsx` - Barre de filtres avec badges actifs intégrés
- [x] `data-view.tsx` - Vue liste/cards avec toggle

### Composants Existants à Utiliser ✅

- [x] `StatsCard` (`src/components/ui/stats-card.tsx`) - Cartes de statistiques
- [x] `Tabs` (`src/components/ui/tabs.tsx`) - Onglets standardisés
- [x] `Button` (`src/components/ui/button.tsx`) - Boutons avec variantes
- [x] `Input` (`src/components/ui/input.tsx`) - Inputs standardisés
- [x] `Select` (`src/components/ui/select.tsx`) - Select standardisés
- [x] `Badge` (`src/components/ui/badge.tsx`) - Badges de statut
- [x] `Card` (`src/components/ui/card.tsx`) - Cartes standardisées

### Composants Optionnels à Créer Plus Tard

- [ ] `data-table.tsx` - Tableau de données avec tri et sélection (pour modules nécessitant un tableau)
- [ ] `StatsSection.tsx` - Wrapper pour section de stats (optionnel, peut être inline)

---

## Prochaines Étapes

1. ✅ Créer les composants UI réutilisables
2. ⏳ Tester les composants avec le module membership-requests
3. ⏳ Migrer membership-requests vers la nouvelle structure
4. ⏳ Documenter les exemples d'utilisation dans Storybook (si disponible)
5. ⏳ Migrer les autres modules progressivement

---

## Références

- **Couleurs KARA** : Voir `documentation/DESIGN_SYSTEM_COULEURS_KARA.md`
- **Composants UI existants** : `src/components/ui/`
- **Exemple de structure** : `src/app/(admin)/memberships/page.tsx`
- **Exemple avec stats** : `src/domains/infrastructure/references/components/ReferencesManagementV2.tsx`
- **Pagination existante** : `src/components/memberships/MembershipPagination.tsx` (base pour le composant réutilisable)
