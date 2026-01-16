# Plan de Refactorisation du Design - Module Géographie

## 🎯 Objectif

Refactoriser le module Géographie pour respecter le **pattern de design standardisé** défini dans `DESIGN_SYSTEM_MODULE_PATTERN.md`, améliorer la cohérence visuelle, la lisibilité et l'expérience utilisateur.

---

## 📋 État Actuel - Problèmes Identifiés

1. **Boutons peu visibles** : Boutons blancs sur fond blanc (notamment "Enregistrer")
2. **Pas de statistiques** : Aucune métrique affichée en haut du module
3. **Typographie non standardisée** : Pas de cohérence avec le design system
4. **Pas de pattern d'organisation clair** : Structure différente des autres modules
5. **Design pas cohérent** : Ne respecte pas le thème KARA

---

## ✅ Objectifs de la Refactorisation

### 1. Header du Module
- ✅ Ajouter un header avec icône KARA et description
- ✅ Utiliser la typographie standardisée (`text-3xl font-bold`)
- ✅ Gradient KARA pour l'icône (`from-[#234D65] to-[#2c5a73]`)

### 2. Statistiques
- ✅ Ajouter des cards de statistiques en haut :
  - Nombre total de provinces
  - Nombre total de départements
  - Nombre total de communes
  - Nombre total d'arrondissements
  - Nombre total de quartiers
- ✅ Utiliser le pattern de cards standardisé
- ✅ Responsive (grid: `md:grid-cols-2 lg:grid-cols-5`)

### 3. Boutons
- ✅ Bouton primaire (Nouvelle Province, etc.) : `bg-[#234D65] hover:bg-[#234D65]/90 text-white`
- ✅ Boutons dans les modals (Enregistrer) : Couleur KARA au lieu de blanc
- ✅ Boutons secondaires : `variant="outline"`

### 4. Typographie
- ✅ Titre principal : `text-3xl font-bold tracking-tight text-gray-900`
- ✅ Titres de section : `text-2xl font-bold text-gray-900`
- ✅ Textes secondaires : `text-muted-foreground`

### 5. Responsive Design
- ✅ Grilles responsive : `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`
- ✅ Espacements adaptatifs : `gap-4 sm:gap-6`
- ✅ Layout flexible : `flex-col sm:flex-row`

### 6. États de Chargement
- ✅ Skeleton loaders cohérents
- ✅ Messages d'erreur clairs
- ✅ États vides (empty states) avec message

---

## 📐 Structure Cible

```
┌─────────────────────────────────────────────────────────┐
│ HEADER                                                  │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ [Icône] Titre: "Gestion Géographique"              │ │
│ │        Description: "Gérez les provinces..."       │ │
│ └─────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────┤
│ STATISTIQUES (5 cards)                                 │
│ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐             │
│ │Prov │ │Dépt │ │Comm │ │Arr  │ │Quar │             │
│ └─────┘ └─────┘ └─────┘ └─────┘ └─────┘             │
├─────────────────────────────────────────────────────────┤
│ TABS                                                    │
│ [Provinces] [Départements] [Communes] [Arrond] [Quart] │
├─────────────────────────────────────────────────────────┤
│ ACTIONS + FILTRES                                       │
│ [Export CSV] [Actualiser] [+ Nouvelle Province]        │
│ [Recherche...]                                          │
├─────────────────────────────────────────────────────────┤
│ CONTENU (Liste/Tableau)                                │
│ [Cards avec provinces/départements/etc.]                │
└─────────────────────────────────────────────────────────┘
```

---

## 🔧 Fichiers à Modifier

### 1. Composant Principal
- `src/domains/infrastructure/geography/components/GeographieManagement.tsx`
  - Ajouter le header standardisé
  - Ajouter les statistiques
  - Améliorer la structure

### 2. Composants de Liste
- `src/domains/infrastructure/geography/components/ProvinceList.tsx`
- `src/domains/infrastructure/geography/components/DepartmentList.tsx`
- `src/domains/infrastructure/geography/components/CommuneList.tsx`
- `src/domains/infrastructure/geography/components/DistrictList.tsx`
- `src/domains/infrastructure/geography/components/QuarterList.tsx`
  - Améliorer les boutons (couleur KARA)
  - Standardiser la typographie
  - Améliorer le responsive

### 3. Modals
- `src/domains/infrastructure/geography/components/modals/AddProvinceModal.tsx`
- `src/domains/infrastructure/geography/components/modals/AddDepartmentModal.tsx`
- `src/domains/infrastructure/geography/components/modals/AddCommuneModal.tsx`
- `src/domains/infrastructure/geography/components/modals/AddDistrictModal.tsx`
- `src/domains/infrastructure/geography/components/modals/AddQuarterModal.tsx`
  - **PRIORITÉ** : Changer le bouton "Enregistrer" pour utiliser la couleur KARA

### 4. Hook pour Statistiques
- `src/domains/infrastructure/geography/hooks/useGeographie.ts`
  - Ajouter un hook `useGeographyStats()` pour récupérer les statistiques

---

## 🎨 Détails d'Implémentation

### Statistiques

Créer un hook `useGeographyStats()` qui retourne :
```typescript
{
  provincesCount: number
  departmentsCount: number
  communesCount: number
  districtsCount: number
  quartersCount: number
  isLoading: boolean
  error: Error | null
}
```

Utiliser `useProvinces()`, `useDepartments()`, etc. pour compter les éléments.

### Cards de Statistiques

```tsx
const statsData = [
  {
    title: "Provinces",
    value: stats?.provincesCount || 0,
    icon: MapPin,
    color: "text-blue-600"
  },
  // ... autres stats
]
```

### Bouton "Enregistrer" dans les Modals

**AVANT** (actuel - invisible) :
```tsx
<Button type="submit">
  Enregistrer
</Button>
```

**APRÈS** (visible avec couleur KARA) :
```tsx
<Button 
  type="submit"
  className="bg-[#234D65] hover:bg-[#234D65]/90 text-white"
>
  Enregistrer
</Button>
```

---

## 📝 Checklist de Vérification

- [ ] Header ajouté avec icône et description
- [ ] Statistiques affichées (5 cards)
- [ ] Bouton primaire "Nouvelle Province" utilise la couleur KARA
- [ ] Bouton "Enregistrer" dans tous les modals utilise la couleur KARA
- [ ] Typographie standardisée (titres, textes)
- [ ] Responsive design testé (mobile, tablette, desktop)
- [ ] États de chargement améliorés
- [ ] États d'erreur clairs
- [ ] Cohérence avec les autres modules (Membership, Groups, etc.)

---

## 🧪 Tests

### Tests Manuels
- [ ] Tester l'affichage sur mobile (< 640px)
- [ ] Tester l'affichage sur tablette (640px - 1024px)
- [ ] Tester l'affichage sur desktop (> 1024px)
- [ ] Vérifier que tous les boutons sont visibles
- [ ] Vérifier que les statistiques s'affichent correctement
- [ ] Tester la création d'une province
- [ ] Tester la création d'un département
- [ ] Tester la création d'une commune
- [ ] Tester la création d'un arrondissement
- [ ] Tester la création d'un quartier

### Tests E2E (à ajouter)
- [ ] Test E2E : Affichage des statistiques
- [ ] Test E2E : Création d'une province
- [ ] Test E2E : Navigation entre les tabs

---

## 📚 Références

- Pattern de Design : `documentation/DESIGN_SYSTEM_MODULE_PATTERN.md`
- Design System Couleurs : `documentation/DESIGN_SYSTEM_COULEURS_KARA.md`
- Exemples de modules : 
  - `src/components/memberships/MembershipRequestsList.tsx`
  - `src/components/groups/GroupList.tsx`
  - `src/components/dashboard/Dashboard.tsx`

---

## ⏱️ Estimation

- **Header + Statistiques** : ~30 min
- **Boutons (tous les modals)** : ~20 min
- **Typographie** : ~15 min
- **Responsive** : ~20 min
- **Tests** : ~30 min

**Total estimé** : ~2h
