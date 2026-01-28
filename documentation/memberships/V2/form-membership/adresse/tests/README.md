# Tests – Step2 Adresse (V2)

## 📋 Vue d'ensemble

La fonctionnalité Step2 Adresse nécessite des tests exhaustifs à plusieurs niveaux pour garantir la fiabilité du pattern **Cascading Dependent Selection avec Optimistic Updates** :

- **Tests unitaires** : Hooks, Composants, Utilitaires
- **Tests d'intégration** : Composant Step2 avec mocks React Query/Firestore
- **Tests E2E** : Parcours complet utilisateur (voir [../ui/test-ids.md](../ui/test-ids.md))

## 🎯 Objectifs de test

### Critères de succès
- ✅ **Couverture ≥ 85%** pour tous les modules critiques
- ✅ **Tous les cas limites** couverts (erreurs, états vides, cascade)
- ✅ **Pattern Optimistic Update** testé exhaustivement
- ✅ **Synchronisation cache-formulaire** vérifiée
- ✅ **Cascade de dépendances** testée dans tous les scénarios

### Points critiques à tester
1. **Cascade de sélection** : Province → Commune → District → Quarter
2. **Optimistic Update** : Mise à jour immédiate du cache après création
3. **Context-Aware Update** : Mise à jour dans le contexte du parent
4. **Cascade Reset** : Réinitialisation des niveaux enfants
5. **Synchronisation** : Cache React Query ↔ Formulaire react-hook-form

## 📚 Structure des tests

```
tests/
├── README.md                          # Ce fichier
├── unit/                              # Tests unitaires
│   ├── hooks/
│   │   ├── useAddressCascade.test.ts
│   │   └── useCascadingEntityCreation.test.ts
│   ├── components/
│   │   ├── Step2.test.tsx
│   │   ├── ProvinceCombobox.test.tsx
│   │   ├── CommuneCombobox.test.tsx
│   │   ├── DistrictCombobox.test.tsx
│   │   └── QuarterCombobox.test.tsx
│   └── utils/
│       └── addressCascadeUtils.test.ts
└── integration/
    ├── step2-address-cascade.integration.test.tsx
    ├── step2-address-creation.integration.test.tsx
    └── step2-address-optimistic-update.integration.test.tsx
```

## 🔗 Liens vers les détails

- **[Tests unitaires - Hooks](./unit/hooks/README.md)** : Tests détaillés des hooks
- **[Tests unitaires - Composants](./unit/components/README.md)** : Tests détaillés des composants
- **[Tests d'intégration](./integration/README.md)** : Tests d'intégration complets
- **[Tests E2E](./e2e/README.md)** : Tests E2E complets avec Playwright
- **[Test IDs E2E](../ui/test-ids.md)** : IDs pour les tests Playwright

## 📊 Couverture cible

| Module | Lignes | Fonctions | Branches | Statements |
|--------|--------|-----------|----------|------------|
| `useAddressCascade` | ≥90% | ≥95% | ≥85% | ≥90% |
| `useCascadingEntityCreation` | ≥90% | ≥95% | ≥85% | ≥90% |
| `Step2` | ≥85% | ≥90% | ≥80% | ≥85% |
| `ProvinceCombobox` | ≥85% | ≥90% | ≥80% | ≥85% |
| `CommuneCombobox` | ≥85% | ≥90% | ≥80% | ≥85% |
| `DistrictCombobox` | ≥85% | ≥90% | ≥80% | ≥85% |
| `QuarterCombobox` | ≥85% | ≥90% | ≥80% | ≥85% |

## ✅ Checklist de tests

### Tests unitaires - Hooks
- [ ] `useAddressCascade.test.ts` 
  - **22 tests** documentés dans [useAddressCascade.test.md](./unit/hooks/useAddressCascade.test.md)
  - Couverture : Chargement, mise à jour champs, réinitialisation cascade, états, calcul entités
- [ ] `useCascadingEntityCreation.test.ts`
  - **15 tests** documentés dans [useCascadingEntityCreation.test.md](./unit/hooks/useCascadingEntityCreation.test.md)
  - Couverture : Optimistic Update, Context-Aware, Invalidation, Refetch, Cascade Reset

### Tests unitaires - Composants
- [ ] `Step2.test.tsx`
  - **8 tests** documentés dans [Step2.test.md](./unit/components/Step2.test.md)
  - Couverture : Rendu, modals, handlers, cascade
- [ ] `CommuneCombobox.test.tsx`
  - **12 tests** documentés dans [CommuneCombobox.test.md](./unit/components/CommuneCombobox.test.md)
  - Couverture : États, chargement, recherche, sélection, cascade
- [ ] `ProvinceCombobox.test.tsx`
  - Tests documentés dans [Combobox-Common-Tests.md](./unit/components/Combobox-Common-Tests.md)
- [ ] `DistrictCombobox.test.tsx`
  - Tests documentés dans [Combobox-Common-Tests.md](./unit/components/Combobox-Common-Tests.md)
- [ ] `QuarterCombobox.test.tsx`
  - Tests documentés dans [Combobox-Common-Tests.md](./unit/components/Combobox-Common-Tests.md)

### Tests d'intégration
- [ ] `step2-address-cascade.integration.test.tsx`
  - **3 tests** documentés dans [step2-address-cascade.integration.test.md](./integration/step2-address-cascade.integration.test.md)
  - Couverture : Cascade complète, réinitialisation, ordre de chargement
- [ ] `step2-address-creation.integration.test.tsx`
  - **5 tests** documentés dans [step2-address-creation.integration.test.md](./integration/step2-address-creation.integration.test.md)
  - Couverture : Création province, commune, validation, erreurs, cascade
- [ ] `step2-address-optimistic-update.integration.test.tsx`
  - **6 tests** documentés dans [step2-address-optimistic-update.integration.test.md](./integration/step2-address-optimistic-update.integration.test.md)
  - Couverture : Optimistic Update, synchronisation, cascade reset, context-aware, invalidation, apparition immédiate
- [ ] `step2-address-cache-management.integration.test.tsx`
  - **6 tests** documentés dans [step2-address-cache-management.integration.test.md](./integration/step2-address-cache-management.integration.test.md)
  - Couverture : Cache React Query, debounce, limites, tri alphabétique, stratégies de chargement

### Tests E2E
- [ ] `step2-address-create-province.e2e.test.ts`
  - **2 tests** documentés dans [step2-address-create-province.e2e.test.md](./e2e/step2-address-create-province.e2e.test.md)
  - Couverture : Création province, sélection immédiate, Optimistic Update
- [ ] `step2-address-create-commune.e2e.test.ts`
  - **3 tests** documentés dans [step2-address-create-commune.e2e.test.md](./e2e/step2-address-create-commune.e2e.test.md)
  - Couverture : Création commune, sélection immédiate, cascade reset
- [ ] `step2-address-create-district.e2e.test.ts`
  - **3 tests** documentés dans [step2-address-create-district.e2e.test.md](./e2e/step2-address-create-district.e2e.test.md)
  - Couverture : Création 2-3 districts, sélection de l'un d'eux
- [ ] `step2-address-create-quarter.e2e.test.ts`
  - **2 tests** documentés dans [step2-address-create-quarter.e2e.test.md](./e2e/step2-address-create-quarter.e2e.test.md)
  - Couverture : Création quarter, résumé final
- [ ] `step2-address-full-cascade-create.e2e.test.ts`
  - **2 tests** documentés dans [step2-address-full-cascade-create.e2e.test.md](./e2e/step2-address-full-cascade-create.e2e.test.md)
  - Couverture : Cascade complète avec création de toutes les entités

## 🛠️ Setup et configuration

### Dépendances de test
```json
{
  "devDependencies": {
    "@testing-library/react": "^14.0.0",
    "@testing-library/user-event": "^14.5.0",
    "@tanstack/react-query": "^5.0.0",
    "vitest": "^1.0.0",
    "react-hook-form": "^7.48.0"
  }
}
```

### Mocks et fixtures

Voir **[MOCKS-AND-FIXTURES.md](./MOCKS-AND-FIXTURES.md)** pour :
- Mocks complets (React Query, hooks géographie, ServiceFactory, etc.)
- Fixtures de données (provinces, communes, districts, quarters)
- Helpers de test (sélection cascade, création via modal)
- Exemples d'utilisation

Les mocks sont **cruciaux** pour garantir la reproductibilité et l'isolation des tests.

## 📊 Récapitulatif des tests

Pour une vue d'ensemble complète de tous les tests à implémenter, voir **[TESTS-RECAPITULATIF.md](./TESTS-RECAPITULATIF.md)**.

**Statistiques** :
- **~101 tests** au total
- **~47 tests critiques** (priorité 1)
- **~38 tests importants** (priorité 2)
- **~19 tests normaux** (priorité 3)

**Note importante** : Les tests de gestion du cache (INT-CACHE-*) sont **cruciaux** pour vérifier que les stratégies de chargement (complet vs recherche) sont correctement implémentées. Voir [CACHE-ET-CAS-CRITIQUES.md](../CACHE-ET-CAS-CRITIQUES.md).

## 📚 Références

- [Documentation principale](../README.md)
- [Pattern Cascading Dependent Selection](../README.md#-design-pattern--cascading-dependent-selection-avec-optimistic-updates)
- [Gestion du Cache et Cas Critiques](../CACHE-ET-CAS-CRITIQUES.md) : **Crucial** - Stratégies de chargement, cache, volumes
- [Test IDs E2E](../ui/test-ids.md)
- [Récapitulatif des tests](./TESTS-RECAPITULATIF.md)
- [Tests E2E](./e2e/README.md)
- [Helpers E2E](./e2e/step2-address-helpers.md)
