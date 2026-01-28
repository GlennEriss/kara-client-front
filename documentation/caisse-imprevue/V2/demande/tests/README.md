# Tests - Module Demandes Caisse Imprévue V2

> Documentation complète des plans de tests pour le module Demandes Caisse Imprévue V2

## 📋 Vue d'ensemble

Ce dossier contient la documentation complète des cas de tests pour le module Demandes Caisse Imprévue V2, basée sur :
- Les diagrammes d'activité et de séquence (`activite/`, `sequence/`)
- Les solutions proposées (`SOLUTIONS_PROPOSEES.md`)
- Les use cases (`USE_CASES.puml`)
- L'architecture V2 (domains-based)

**Module** : `caisse_imprevue`  
**Collection** : `caisseImprevueDemands`

---

## 📁 Structure

```
tests/
├── README.md                    # Ce fichier (vue d'ensemble)
├── TESTS_UNITAIRES.md          # Plan détaillé des tests unitaires
├── TESTS_INTEGRATION.md        # Plan détaillé des tests d'intégration
├── TESTS_E2E.md                # Plan détaillé des tests E2E (optionnel)
├── DATA_TESTID.md              # Liste des data-testid à ajouter
├── FIXTURES.md                 # Fixtures et données de test
├── MOCKS.md                    # Mocks et stubs nécessaires
└── COUVERTURE.md               # Plan de couverture de code (objectif 80%+)
```

---

## 🎯 Types de Tests

### 1. Tests Unitaires

**Objectif** : Tester les fonctions, méthodes et composants isolément

**Fichiers à tester** :
- **Repositories** : `DemandCIRepository.ts`
- **Services** : `CaisseImprevueService.ts`, `DemandSimulationService.ts`
- **Hooks** : `useCaisseImprevueDemands.ts`, `useDemandForm.ts`, `useDemandFormPersistence.ts`, `useSubscriptionsCICache.ts`, `useDemandSimulation.ts`, `useDemandSearch.ts`
- **Utils** : Fonctions utilitaires (formatage, validation, calculs)
- **Schemas** : Validation Zod

**Couverture cible** : 80%+

**Référence** : `TESTS_UNITAIRES.md`

---

### 2. Tests d'Intégration

**Objectif** : Tester l'interaction entre plusieurs unités (composants ↔ services ↔ repositories)

**Flux à tester** :
- Création complète d'une demande (formulaire → service → repository → Firestore)
- Acceptation d'une demande (modal → service → repository → notification)
- Refus d'une demande (modal → service → repository → notification)
- Réouverture d'une demande (modal → service → repository → notification)
- Conversion en contrat (service → repository → création contrat)
- Suppression d'une demande (modal → service → repository)
- Recherche et filtrage (hook → repository → Firestore)
- Pagination serveur (hook → repository → Firestore)
- Cache React Query (hook → cache → repository)

**Couverture cible** : 70%+

**Référence** : `TESTS_INTEGRATION.md`

---

### 3. Tests E2E (Optionnel)

**Objectif** : Tester les parcours utilisateur complets via l'interface

**Scénarios à tester** :
- Création d'une demande (3 étapes)
- Liste des demandes (pagination, recherche, filtres, tri)
- Détails d'une demande
- Actions sur une demande (accepter, refuser, réouvrir, supprimer, créer contrat)
- Responsive design (mobile, tablette, desktop)

**Framework** : Playwright

**Référence** : `TESTS_E2E.md`

---

## 🔍 Conventions

### Naming des Tests

- **Unitaires** : `should [action] when [condition]`
  - Exemple : `should create demand with valid data`
  - Exemple : `should throw error when cause is too short`
  
- **Intégration** : `should [complete flow description]`
  - Exemple : `should complete full flow: Create demand → Service → Repository → Firestore → Notification`
  - Exemple : `should handle pagination: Fetch page 2 → Repository → Cache → UI update`
  
- **E2E** : `P0-CI-XX: devrait [action attendue]`
  - Exemple : `P0-CI-01: devrait créer une demande en 3 étapes`
  - Exemple : `P0-CI-02: devrait afficher la liste des demandes avec pagination`

### Structure AAA (Arrange-Act-Assert)

```typescript
it('should create demand with valid data', async () => {
  // Arrange
  const demandData = createDemandFixture()
  const mockRepository = createMockRepository()
  
  // Act
  const result = await service.createDemand(demandData)
  
  // Assert
  expect(result).toBeDefined()
  expect(mockRepository.create).toHaveBeenCalledWith(demandData)
})
```

---

## 📊 Métriques de Couverture

### Objectifs de Couverture

| Type de Test | Couverture Cible | Couverture Minimale |
|--------------|------------------|---------------------|
| **Tests Unitaires** | 85% | 80% |
| **Tests d'Intégration** | 75% | 70% |
| **Tests E2E** | Chemins critiques | N/A |

### Fichiers Prioritaires

**Priorité P0 (Critique)** :
- `CaisseImprevueService.ts` (logique métier principale)
- `DemandCIRepository.ts` (accès données)
- `useCaisseImprevueDemands.ts` (hook principal)
- `useDemandForm.ts` (gestion formulaire)

**Priorité P1 (Important)** :
- `DemandSimulationService.ts` (calculs simulation)
- `useDemandFormPersistence.ts` (persistance localStorage)
- `useSubscriptionsCICache.ts` (cache forfaits)
- `useDemandSearch.ts` (recherche)

**Priorité P2 (Nice to have)** :
- Composants UI (testés via E2E)
- Utils mineurs
- Schemas (validation de base)

---

## 🚀 Commandes de Test

### Tests Unitaires

```bash
# Exécuter tous les tests unitaires
pnpm test src/domains/financial/caisse-imprevue

# Exécuter avec couverture
pnpm test --coverage src/domains/financial/caisse-imprevue

# Exécuter en mode watch
pnpm test --watch src/domains/financial/caisse-imprevue
```

### Tests d'Intégration

```bash
# Exécuter les tests d'intégration
pnpm test src/domains/financial/caisse-imprevue/__tests__/integration

# Exécuter avec couverture
pnpm test --coverage src/domains/financial/caisse-imprevue/__tests__/integration
```

### Tests E2E

```bash
# Exécuter les tests E2E
pnpm test:e2e e2e/caisse-imprevue

# Exécuter en mode UI
pnpm test:e2e:ui e2e/caisse-imprevue
```

---

## 📚 Références

- **Solutions proposées** : [`../SOLUTIONS_PROPOSEES.md`](../SOLUTIONS_PROPOSEES.md)
- **Use Cases** : [`../USE_CASES.puml`](../USE_CASES.puml)
- **Diagrammes** : [`../activite/`](../activite/), [`../sequence/`](../sequence/)
- **Architecture tests** : [`../../tests/TESTS_ARCHITECTURE.md`](../../tests/TESTS_ARCHITECTURE.md)
- **Documentation tests globale** : [`../../tests/README.md`](../../tests/README.md)

---

**Date de création** : 2026-01-27  
**Version** : V2  
**Auteur** : Senior QA
