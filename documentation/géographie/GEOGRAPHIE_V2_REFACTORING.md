# Refactoring Géographie V2

## Vue d'ensemble

Les composants V2 sont une refonte complète des composants géographie avec :
- **Design moderne** : Cards compactes, couleurs KARA, effets hover
- **Sélecteurs stables** : Utilisation de `data-testid` pour les tests E2E
- **Gestion d'état améliorée** : Utilisation optimale de React Query (invalidateQueries)
- **Accessibilité** : Attributs ARIA et labels améliorés
- **Performance** : Optimisations de rendu et de chargement

## Couleurs KARA utilisées

Conformément au Design System KARA (`documentation/DESIGN_SYSTEM_COULEURS_KARA.md`) :

| Couleur | Code | Classe Tailwind | Usage |
|---------|------|-----------------|-------|
| **KARA Blue** | `#224D62` | `bg-kara-primary-dark` | Boutons principaux, headers |
| **KARA Gold** | `#CBB171` | `bg-kara-primary-light` | Accents, badges, hover |
| **Success** | `#10b981` | `bg-kara-success` | États actifs |
| **Error** | `#ef4444` | `bg-kara-error` | Suppression |

## Structure des fichiers

```
src/domains/infrastructure/geography/components/
├── GeographieManagement.tsx      # V1 (legacy)
├── ProvinceList.tsx               # V1 (legacy)
├── ...
├── index.ts                       # Export avec switch V1/V2
└── v2/
    ├── GeographieManagementV2.tsx # Composant principal V2
    ├── GeographyStatsV2.tsx       # Statistiques avec carousel
    ├── ProvinceListV2.tsx         # Liste provinces V2
    ├── DepartmentListV2.tsx       # (placeholder → V1)
    ├── CommuneListV2.tsx          # (placeholder → V1)
    ├── DistrictListV2.tsx         # (placeholder → V1)
    └── QuarterListV2.tsx          # (placeholder → V1)
```

## Basculement entre versions

### Via import direct
```typescript
// Utiliser V2 explicitement
import { GeographieManagementV2 } from '@/domains/infrastructure/geography/components'

// Utiliser V1 explicitement
import { GeographieManagementV1 } from '@/domains/infrastructure/geography/components'
```

### Via index.ts (automatique - V2 par défaut)
```typescript
// Utilise V2 par défaut
import { GeographieManagement } from '@/domains/infrastructure/geography/components'
```

## Améliorations V2

### 1. Design moderne avec couleurs KARA
- **Boutons** : `bg-kara-primary-dark` au lieu de `bg-[#234D65]`
- **Accents** : `bg-kara-primary-light` pour les hover et badges
- **Cards compactes** : Format table/liste au lieu de cards énormes
- **Effets visuels** : Hover effects, transitions fluides

### 2. Sélecteurs pour tests E2E
Tous les éléments importants ont des `data-testid` :
- `data-testid="geographie-management-v2"`
- `data-testid="geographie-stats"`
- `data-testid="stat-provinces"`
- `data-testid="btn-new-province"`
- `data-testid="input-province-name"`
- etc.

### 3. Design responsive
- Grid adaptatif : 2 colonnes (mobile) → 3 (tablette) → 5 (desktop)
- Carousel automatique pour les stats si besoin
- Tabs avec scroll horizontal en mobile

### 4. Gestion d'état React Query
- **Pas de `refetch()` manuel** → utiliser `invalidateQueries()`
- **Pas de bouton "Actualiser"** → mise à jour automatique
- États de chargement/erreur/vide bien gérés

### 5. Composants réutilisables
- `StatsCard` : `@/components/ui/stats-card`
- `useCarousel` : `@/hooks/ui/useCarousel`

## Migration depuis V1

### Étape 1 : Tester V2 en local
```bash
npm run dev
# V2 est utilisée par défaut
```

### Étape 2 : Mettre à jour les tests E2E
Les tests doivent utiliser les nouveaux `data-testid` :
```typescript
// Avant (V1)
await expect(page.locator('h1:has-text("Gestion Géographique")')).toBeVisible()

// Après (V2)
await expect(page.locator('[data-testid="geographie-title"]')).toBeVisible()
```

### Étape 3 : Déployer progressivement
1. Déployer V2 en preview
2. Tester en profondeur
3. Basculer en production
4. Supprimer V1 après validation complète

## TODO

- [x] GeographieManagementV2 avec stats carousel
- [x] ProvinceListV2 avec design compact
- [ ] DepartmentListV2 avec design compact
- [ ] CommuneListV2 avec design compact
- [ ] DistrictListV2 avec design compact
- [ ] QuarterListV2 avec design compact
- [ ] Mettre à jour les tests E2E pour utiliser les data-testid
