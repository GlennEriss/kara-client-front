# Plan de Couverture - Module Demandes Caisse Imprévue V2

> Plan détaillé de couverture de code pour garantir la qualité et la maintenabilité

## 📋 Vue d'ensemble

**Objectif de couverture globale** : **80% minimum**

**Outils** : Vitest avec `--coverage`  
**Rapports** : HTML, JSON, LCOV

---

## 🎯 Objectifs par Type de Test

| Type de Test | Couverture Cible | Couverture Minimale |
|--------------|------------------|---------------------|
| **Tests Unitaires** | 85% | 80% |
| **Tests d'Intégration** | 75% | 70% |
| **Tests E2E** | Chemins critiques | N/A |
| **GLOBAL** | **80%** | **75%** |

---

## 📊 Couverture par Fichier

### Priorité P0 (Critique) - Objectif 85%+

| Fichier | Lignes | Branches | Fonctions | Objectif |
|---------|--------|----------|-----------|----------|
| `CaisseImprevueService.ts` | 85%+ | 80%+ | 90%+ | **85%** |
| `DemandCIRepository.ts` | 85%+ | 80%+ | 90%+ | **85%** |
| `useCaisseImprevueDemands.ts` | 85%+ | 80%+ | 90%+ | **85%** |
| `useDemandForm.ts` | 85%+ | 80%+ | 90%+ | **85%** |

### Priorité P1 (Important) - Objectif 80%+

| Fichier | Lignes | Branches | Fonctions | Objectif |
|---------|--------|----------|-----------|----------|
| `DemandSimulationService.ts` | 80%+ | 75%+ | 85%+ | **80%** |
| `useDemandFormPersistence.ts` | 80%+ | 75%+ | 85%+ | **80%** |
| `useSubscriptionsCICache.ts` | 80%+ | 75%+ | 85%+ | **80%** |
| `useDemandSearch.ts` | 80%+ | 75%+ | 85%+ | **80%** |
| `DemandCIRepository.getPaginated` | 80%+ | 75%+ | 85%+ | **80%** |
| `DemandCIRepository.search` | 80%+ | 75%+ | 85%+ | **80%** |

### Priorité P2 (Nice to have) - Objectif 70%+

| Fichier | Lignes | Branches | Fonctions | Objectif |
|---------|--------|----------|-----------|----------|
| Composants UI | 70%+ | 65%+ | 75%+ | **70%** |
| Utils mineurs | 70%+ | 65%+ | 75%+ | **70%** |
| Schemas Zod | 70%+ | 65%+ | 75%+ | **70%** |

---

## 📈 Métriques Détaillées

### 1. Services (`services/`)

#### CaisseImprevueService.ts

| Méthode | Lignes | Branches | Objectif |
|---------|--------|----------|----------|
| `createDemand` | 90%+ | 85%+ | **85%** |
| `approveDemand` | 90%+ | 85%+ | **85%** |
| `rejectDemand` | 90%+ | 85%+ | **85%** |
| `reopenDemand` | 90%+ | 85%+ | **85%** |
| `createContractFromDemand` | 90%+ | 85%+ | **85%** |
| `deleteDemand` | 90%+ | 85%+ | **85%** |

#### DemandSimulationService.ts

| Méthode | Lignes | Branches | Objectif |
|---------|--------|----------|----------|
| `calculatePaymentSchedule` | 85%+ | 80%+ | **80%** |
| `calculateMonthlyPayments` | 85%+ | 80%+ | **80%** |
| `calculateDailyPayments` | 85%+ | 80%+ | **80%** |

### 2. Repositories (`repositories/`)

#### DemandCIRepository.ts

| Méthode | Lignes | Branches | Objectif |
|---------|--------|----------|----------|
| `create` | 90%+ | 85%+ | **85%** |
| `getById` | 90%+ | 85%+ | **85%** |
| `getPaginated` | 85%+ | 80%+ | **80%** |
| `search` | 85%+ | 80%+ | **80%** |
| `update` | 90%+ | 85%+ | **85%** |
| `delete` | 90%+ | 85%+ | **85%** |

### 3. Hooks (`hooks/`)

#### useCaisseImprevueDemands.ts

| Fonctionnalité | Lignes | Branches | Objectif |
|----------------|--------|----------|----------|
| Fetch paginated | 90%+ | 85%+ | **85%** |
| Filter by status | 90%+ | 85%+ | **85%** |
| Sort | 90%+ | 85%+ | **85%** |
| Cache invalidation | 85%+ | 80%+ | **80%** |

#### useDemandForm.ts

| Fonctionnalité | Lignes | Branches | Objectif |
|----------------|--------|----------|----------|
| Form initialization | 90%+ | 85%+ | **85%** |
| Step validation | 90%+ | 85%+ | **85%** |
| Step navigation | 90%+ | 85%+ | **85%** |
| Form submission | 90%+ | 85%+ | **85%** |

#### useDemandFormPersistence.ts

| Fonctionnalité | Lignes | Branches | Objectif |
|----------------|--------|----------|----------|
| Save to localStorage | 85%+ | 80%+ | **80%** |
| Load from localStorage | 85%+ | 80%+ | **80%** |
| Clear localStorage | 85%+ | 80%+ | **80%** |
| Version migration | 80%+ | 75%+ | **75%** |

#### useSubscriptionsCICache.ts

| Fonctionnalité | Lignes | Branches | Objectif |
|----------------|--------|----------|----------|
| Fetch subscriptions | 85%+ | 80%+ | **80%** |
| Cache for 30 minutes | 85%+ | 80%+ | **80%** |
| Filter active | 85%+ | 80%+ | **80%** |

#### useDemandSearch.ts

| Fonctionnalité | Lignes | Branches | Objectif |
|----------------|--------|----------|----------|
| Search by name | 85%+ | 80%+ | **80%** |
| Debounce | 85%+ | 80%+ | **80%** |
| Cache results | 85%+ | 80%+ | **80%** |

---

## 🎯 Zones Critiques à Couvrir

### 1. Gestion des Erreurs

**Objectif** : 100% des cas d'erreur doivent être testés

- Validation des données (cause, emergencyContact, etc.)
- Erreurs Firestore (permissions, réseau, etc.)
- Erreurs de statut (approbation d'une demande déjà approuvée, etc.)
- Erreurs de conversion (création de contrat depuis une demande non approuvée)

### 2. Transitions de Statut

**Objectif** : 100% des transitions doivent être testées

- `PENDING` → `APPROVED`
- `PENDING` → `REJECTED`
- `REJECTED` → `REOPENED`
- `APPROVED` → `CONVERTED`
- Erreurs de transition invalides

### 3. Calculs Financiers

**Objectif** : 100% des calculs doivent être testés

- Calcul mensuel (montant × durée)
- Calcul journalier (montant / jours)
- Cumulé des versements
- Total du plan de remboursement

### 4. Cache et Performance

**Objectif** : 80%+ des mécanismes de cache

- Cache React Query
- Cache localStorage
- Invalidation du cache
- Expiration du cache

---

## 📊 Rapports de Couverture

### Génération des Rapports

```bash
# Générer le rapport de couverture
pnpm test --coverage

# Générer avec seuil minimum
pnpm test --coverage --coverage.threshold.lines=80 --coverage.threshold.branches=75

# Générer avec format HTML
pnpm test --coverage --coverage.reporter=html

# Générer avec format JSON
pnpm test --coverage --coverage.reporter=json

# Générer avec format LCOV (pour CI/CD)
pnpm test --coverage --coverage.reporter=lcov
```

### Configuration Vitest (`vitest.config.ts`)

```typescript
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        '**/*.spec.ts',
        '**/*.test.ts',
        '**/__tests__/**',
        '**/__mocks__/**',
        '**/fixtures/**'
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80
      },
      // Seuils par fichier
      perFile: true,
      // 100% pour les fichiers critiques
      100: {
        lines: 85,
        functions: 90,
        branches: 80
      }
    }
  }
})
```

---

## 📈 Suivi de la Couverture

### Tableau de Bord

| Métrique | Objectif | Actuel | Écart |
|----------|----------|--------|-------|
| **Lignes** | 80% | - | - |
| **Branches** | 75% | - | - |
| **Fonctions** | 80% | - | - |
| **Statements** | 80% | - | - |

### Fichiers Non Couverts

Liste des fichiers avec couverture < 80% :

| Fichier | Couverture | Action Requise |
|---------|------------|----------------|
| - | - | - |

---

## ✅ Checklist de Couverture

### Tests Unitaires

- [ ] `CaisseImprevueService.ts` : 85%+
- [ ] `DemandCIRepository.ts` : 85%+
- [ ] `DemandSimulationService.ts` : 80%+
- [ ] `useCaisseImprevueDemands.ts` : 85%+
- [ ] `useDemandForm.ts` : 85%+
- [ ] `useDemandFormPersistence.ts` : 80%+
- [ ] `useSubscriptionsCICache.ts` : 80%+
- [ ] `useDemandSearch.ts` : 80%+

### Tests d'Intégration

- [ ] Création complète : 75%+
- [ ] Acceptation/Refus/Réouverture : 75%+
- [ ] Pagination serveur : 75%+
- [ ] Recherche : 75%+
- [ ] Cache : 75%+
- [ ] Conversion contrat : 75%+

### Tests E2E

- [ ] Parcours création : ✅
- [ ] Parcours liste : ✅
- [ ] Parcours détails : ✅
- [ ] Parcours actions : ✅

---

## 🔍 Analyse des Gaps

### Zones à Améliorer

1. **Gestion des erreurs réseau** : Ajouter des tests pour les timeouts et erreurs Firestore
2. **Edge cases** : Tester les limites (demandes avec 500 caractères, dates limites, etc.)
3. **Performance** : Tester le comportement avec de grandes quantités de données (1000+ demandes)
4. **Accessibilité** : Tester les interactions clavier et lecteurs d'écran

---

## 📚 Références

- **Tests unitaires** : `TESTS_UNITAIRES.md`
- **Tests d'intégration** : `TESTS_INTEGRATION.md`
- **Tests E2E** : `TESTS_E2E.md`
- **Fixtures** : `FIXTURES.md`
- **Mocks** : `MOCKS.md`

---

**Date de création** : 2026-01-27  
**Version** : V2  
**Auteur** : Senior QA
