# Tests du Module Géographie

## 📋 Vue d'ensemble

Ce document décrit tous les tests créés pour le module Géographie après la refactorisation du design.

---

## 🧪 Types de Tests

### 1. Tests E2E (Playwright)

**Fichier** : `e2e/geographie.spec.ts`

**Couverture** :
- ✅ Affichage et navigation (header, statistiques, onglets)
- ✅ CRUD Provinces (création, affichage, recherche)
- ✅ CRUD Départements
- ✅ Design system (couleurs KARA, responsive)
- ✅ Formulaire d'inscription public

**Exécution** :
```bash
# Nécessite pnpm dev en arrière-plan
pnpm test:e2e
```

---

### 2. Tests Unitaires (Vitest)

#### Hooks (`src/domains/infrastructure/geography/__tests__/hooks/`)

**Fichier** : `useGeographie.test.ts`

**Couverture** :
- ✅ `useProvinces()` - Récupération de toutes les provinces
- ✅ `useProvince(id)` - Récupération d'une province par ID
- ✅ `useProvinceMutations()` - Création, mise à jour, suppression
- ✅ `useGeographyStats()` - Calcul des statistiques

**Exécution** :
```bash
pnpm test src/domains/infrastructure/geography/__tests__/hooks
```

#### Services (`src/domains/infrastructure/geography/__tests__/services/`)

**Fichier** : `GeographieService.test.ts`

**Couverture** :
- ✅ `createProvince()` - Création avec validation (code unique)
- ✅ `updateProvince()` - Mise à jour avec validation
- ✅ `deleteProvince()` - Suppression avec vérification des dépendances
- ✅ `getAllProvinces()` - Récupération de toutes les provinces

**Exécution** :
```bash
pnpm test src/domains/infrastructure/geography/__tests__/services
```

#### Repositories (À créer)

Les tests des repositories doivent être créés pour tester :
- Création, lecture, mise à jour, suppression (CRUD)
- Requêtes Firestore (mocks)
- Gestion des erreurs

---

## 📦 Configuration

### Vitest

**Fichier** : `vitest.config.ts`

- Environment : `jsdom` (pour React)
- Setup file : `src/__tests__/setup.ts`
- Path aliases : `@/` → `./src/`

### Setup Global

**Fichier** : `src/__tests__/setup.ts`

Mocks globaux :
- Next.js router (`useRouter`, `usePathname`)
- Firebase (app, firestore, auth)
- Sonner (toast)

---

## ✅ Checklist des Tests

### Tests E2E
- [x] Affichage du header avec titre et description
- [x] Affichage des statistiques (5 cards)
- [x] Navigation entre les onglets
- [x] CRUD Provinces (création complète)
- [x] Affichage des boutons avec couleur KARA
- [x] Responsive (mobile, tablette)
- [x] Formulaire d'inscription public

### Tests Unitaires - Hooks
- [x] `useProvinces()` - Récupération des provinces
- [x] `useProvince(id)` - Récupération par ID
- [x] `useProvinceMutations()` - Création
- [ ] `useProvinceMutations()` - Mise à jour
- [ ] `useProvinceMutations()` - Suppression
- [ ] `useDepartments()` - Récupération des départements
- [ ] `useDepartmentMutations()` - CRUD départements
- [ ] Autres hooks (Communes, Districts, Quarters)
- [ ] `useGeographyStats()` - Calcul des statistiques

### Tests Unitaires - Services
- [x] `createProvince()` - Création avec validation
- [x] `updateProvince()` - Mise à jour avec validation
- [x] `deleteProvince()` - Suppression avec vérification
- [x] `getAllProvinces()` - Récupération
- [ ] Autres méthodes du service (Départements, Communes, etc.)

### Tests Unitaires - Repositories
- [ ] `ProvinceRepository` - CRUD complet
- [ ] `DepartmentRepository` - CRUD complet
- [ ] `CommuneRepository` - CRUD complet
- [ ] `DistrictRepository` - CRUD complet
- [ ] `QuarterRepository` - CRUD complet

### Tests d'Intégration
- [ ] Flux complet : Création Province → Département → Commune → District → Quartier
- [ ] Validation des relations parent/enfant
- [ ] Gestion des erreurs en cascade

---

## 🚀 Prochaines Étapes

1. **Compléter les tests unitaires** :
   - Tous les hooks (Departments, Communes, Districts, Quarters)
   - Toutes les méthodes du service
   - Tous les repositories

2. **Créer les tests d'intégration** :
   - Flux complets CRUD
   - Validation des relations
   - Gestion des erreurs

3. **Améliorer les tests E2E** :
   - Tests pour chaque entité (Départements, Communes, etc.)
   - Tests de modification et suppression
   - Tests d'erreurs (validation, permissions)

---

## 📚 Références

- **Workflow** : `documentation/WORKFLOW.md` - Section "Étape E — Tests locaux"
- **Vitest** : https://vitest.dev/
- **Playwright** : https://playwright.dev/
- **Testing Library** : https://testing-library.com/
