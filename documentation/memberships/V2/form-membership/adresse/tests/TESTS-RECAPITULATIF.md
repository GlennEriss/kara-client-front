# Récapitulatif des Tests - Step2 Adresse

## 📊 Vue d'ensemble

Tableau récapitulatif de tous les tests à implémenter pour Step2 Adresse.

## 🧪 Tests Unitaires - Hooks

### useAddressCascade

| ID | Test | Priorité | Fichier |
|----|------|----------|---------|
| UNIT-ADDR-001 | Chargement des provinces | 🔴 Critique | [useAddressCascade.test.md](./unit/hooks/useAddressCascade.test.md) |
| UNIT-ADDR-002 | Chargement des départements | 🔴 Critique | [useAddressCascade.test.md](./unit/hooks/useAddressCascade.test.md) |
| UNIT-ADDR-003 | Chargement des communes | 🔴 Critique | [useAddressCascade.test.md](./unit/hooks/useAddressCascade.test.md) |
| UNIT-ADDR-004 | Chargement des districts | 🔴 Critique | [useAddressCascade.test.md](./unit/hooks/useAddressCascade.test.md) |
| UNIT-ADDR-005 | Chargement des quarters | 🔴 Critique | [useAddressCascade.test.md](./unit/hooks/useAddressCascade.test.md) |
| UNIT-ADDR-006 | Mise à jour champ province | 🟡 Important | [useAddressCascade.test.md](./unit/hooks/useAddressCascade.test.md) |
| UNIT-ADDR-007 | Mise à jour champ city | 🟡 Important | [useAddressCascade.test.md](./unit/hooks/useAddressCascade.test.md) |
| UNIT-ADDR-008 | Réinitialisation champs enfants | 🔴 Critique | [useAddressCascade.test.md](./unit/hooks/useAddressCascade.test.md) |
| UNIT-ADDR-009 | Réinitialisation commune | 🔴 Critique | [useAddressCascade.test.md](./unit/hooks/useAddressCascade.test.md) |
| UNIT-ADDR-010 | Réinitialisation district | 🔴 Critique | [useAddressCascade.test.md](./unit/hooks/useAddressCascade.test.md) |
| UNIT-ADDR-011 | Réinitialisation quarter | 🔴 Critique | [useAddressCascade.test.md](./unit/hooks/useAddressCascade.test.md) |
| UNIT-ADDR-012 | États de chargement | 🟡 Important | [useAddressCascade.test.md](./unit/hooks/useAddressCascade.test.md) |
| UNIT-ADDR-013 | Trouver province sélectionnée | 🟡 Important | [useAddressCascade.test.md](./unit/hooks/useAddressCascade.test.md) |
| UNIT-ADDR-014 | Trouver commune sélectionnée | 🟡 Important | [useAddressCascade.test.md](./unit/hooks/useAddressCascade.test.md) |
| UNIT-ADDR-015 | Trouver district sélectionné | 🟡 Important | [useAddressCascade.test.md](./unit/hooks/useAddressCascade.test.md) |
| UNIT-ADDR-016 | Trouver quarter sélectionné | 🟡 Important | [useAddressCascade.test.md](./unit/hooks/useAddressCascade.test.md) |
| UNIT-ADDR-017 | Agrégation des communes | 🟡 Important | [useAddressCascade.test.md](./unit/hooks/useAddressCascade.test.md) |
| UNIT-ADDR-018 | Communes vides | 🟢 Normal | [useAddressCascade.test.md](./unit/hooks/useAddressCascade.test.md) |
| UNIT-ADDR-019 | Désactiver autoUpdateTextFields | 🟢 Normal | [useAddressCascade.test.md](./unit/hooks/useAddressCascade.test.md) |
| UNIT-ADDR-020 | Province invalide | 🟢 Normal | [useAddressCascade.test.md](./unit/hooks/useAddressCascade.test.md) |
| UNIT-ADDR-021 | Commune invalide | 🟢 Normal | [useAddressCascade.test.md](./unit/hooks/useAddressCascade.test.md) |
| UNIT-ADDR-022 | Erreur chargement départements | 🟢 Normal | [useAddressCascade.test.md](./unit/hooks/useAddressCascade.test.md) |

**Total : 22 tests**

### useCascadingEntityCreation

| ID | Test | Priorité | Fichier |
|----|------|----------|---------|
| UNIT-CASC-001 | Mise à jour cache spécifique | 🔴 Critique | [useCascadingEntityCreation.test.md](./unit/hooks/useCascadingEntityCreation.test.md) |
| UNIT-CASC-002 | Mise à jour cache générique | 🔴 Critique | [useCascadingEntityCreation.test.md](./unit/hooks/useCascadingEntityCreation.test.md) |
| UNIT-CASC-003 | Éviter les doublons | 🔴 Critique | [useCascadingEntityCreation.test.md](./unit/hooks/useCascadingEntityCreation.test.md) |
| UNIT-CASC-004 | Tri des communes | 🟡 Important | [useCascadingEntityCreation.test.md](./unit/hooks/useCascadingEntityCreation.test.md) |
| UNIT-CASC-005 | Vérification contexte parent | 🟡 Important | [useCascadingEntityCreation.test.md](./unit/hooks/useCascadingEntityCreation.test.md) |
| UNIT-CASC-006 | Pas de contexte parent | 🟡 Important | [useCascadingEntityCreation.test.md](./unit/hooks/useCascadingEntityCreation.test.md) |
| UNIT-CASC-007 | Invalidation des queries | 🔴 Critique | [useCascadingEntityCreation.test.md](./unit/hooks/useCascadingEntityCreation.test.md) |
| UNIT-CASC-008 | Refetch explicite | 🔴 Critique | [useCascadingEntityCreation.test.md](./unit/hooks/useCascadingEntityCreation.test.md) |
| UNIT-CASC-009 | Sélection de l'entité | 🔴 Critique | [useCascadingEntityCreation.test.md](./unit/hooks/useCascadingEntityCreation.test.md) |
| UNIT-CASC-010 | Cascade Reset | 🔴 Critique | [useCascadingEntityCreation.test.md](./unit/hooks/useCascadingEntityCreation.test.md) |
| UNIT-CASC-011 | Pas de resetChildren | 🟢 Normal | [useCascadingEntityCreation.test.md](./unit/hooks/useCascadingEntityCreation.test.md) |
| UNIT-CASC-012 | Filtrage personnalisé | 🟢 Normal | [useCascadingEntityCreation.test.md](./unit/hooks/useCascadingEntityCreation.test.md) |
| UNIT-CASC-013 | Cache vide | 🟢 Normal | [useCascadingEntityCreation.test.md](./unit/hooks/useCascadingEntityCreation.test.md) |
| UNIT-CASC-014 | Erreur invalidation | 🟢 Normal | [useCascadingEntityCreation.test.md](./unit/hooks/useCascadingEntityCreation.test.md) |
| UNIT-CASC-015 | Erreur refetch | 🟢 Normal | [useCascadingEntityCreation.test.md](./unit/hooks/useCascadingEntityCreation.test.md) |

**Total : 15 tests**

## 🧪 Tests Unitaires - Composants

### Step2

| ID | Test | Priorité | Fichier |
|----|------|----------|---------|
| UNIT-STEP2-001 | Rendu du composant | 🔴 Critique | [Step2.test.md](./unit/components/Step2.test.md) |
| UNIT-STEP2-002 | Affichage boutons d'ajout (admin) | 🟡 Important | [Step2.test.md](./unit/components/Step2.test.md) |
| UNIT-STEP2-003 | handleCommuneCreated avec Optimistic Update | 🔴 Critique | [Step2.test.md](./unit/components/Step2.test.md) |
| UNIT-STEP2-004 | handleProvinceCreated | 🟡 Important | [Step2.test.md](./unit/components/Step2.test.md) |
| UNIT-STEP2-005 | Cascade Province → Commune | 🔴 Critique | [Step2.test.md](./unit/components/Step2.test.md) |
| UNIT-STEP2-006 | Cascade Commune → District | 🔴 Critique | [Step2.test.md](./unit/components/Step2.test.md) |
| UNIT-STEP2-007 | Ouverture modal commune | 🟡 Important | [Step2.test.md](./unit/components/Step2.test.md) |
| UNIT-STEP2-008 | Fermeture modal | 🟢 Normal | [Step2.test.md](./unit/components/Step2.test.md) |

**Total : 8 tests**

### CommuneCombobox

| ID | Test | Priorité | Fichier |
|----|------|----------|---------|
| UNIT-COMMUNE-001 | État initial (vide) | 🟡 Important | [CommuneCombobox.test.md](./unit/components/CommuneCombobox.test.md) |
| UNIT-COMMUNE-002 | État verrouillé | 🔴 Critique | [CommuneCombobox.test.md](./unit/components/CommuneCombobox.test.md) |
| UNIT-COMMUNE-003 | État chargement | 🟡 Important | [CommuneCombobox.test.md](./unit/components/CommuneCombobox.test.md) |
| UNIT-COMMUNE-004 | État sélectionné | 🟡 Important | [CommuneCombobox.test.md](./unit/components/CommuneCombobox.test.md) |
| UNIT-COMMUNE-005 | Chargement des communes | 🔴 Critique | [CommuneCombobox.test.md](./unit/components/CommuneCombobox.test.md) |
| UNIT-COMMUNE-006 | Agrégation des communes | 🟡 Important | [CommuneCombobox.test.md](./unit/components/CommuneCombobox.test.md) |
| UNIT-COMMUNE-007 | Recherche par nom | 🟡 Important | [CommuneCombobox.test.md](./unit/components/CommuneCombobox.test.md) |
| UNIT-COMMUNE-008 | Recherche par code postal | 🟢 Normal | [CommuneCombobox.test.md](./unit/components/CommuneCombobox.test.md) |
| UNIT-COMMUNE-009 | Sélection d'une commune | 🔴 Critique | [CommuneCombobox.test.md](./unit/components/CommuneCombobox.test.md) |
| UNIT-COMMUNE-010 | Réinitialisation niveaux enfants | 🔴 Critique | [CommuneCombobox.test.md](./unit/components/CommuneCombobox.test.md) |
| UNIT-COMMUNE-011 | Affichage bouton d'ajout | 🟡 Important | [CommuneCombobox.test.md](./unit/components/CommuneCombobox.test.md) |
| UNIT-COMMUNE-012 | Désactivation bouton sans province | 🟢 Normal | [CommuneCombobox.test.md](./unit/components/CommuneCombobox.test.md) |

**Total : 12 tests**

### Autres Combobox (Province, District, Quarter)

| Composant | Tests | Priorité | Fichier |
|-----------|-------|----------|---------|
| ProvinceCombobox | ~8 tests | 🔴 Critique | [Combobox-Common-Tests.md](./unit/components/Combobox-Common-Tests.md) |
| DistrictCombobox | ~8 tests | 🔴 Critique | [Combobox-Common-Tests.md](./unit/components/Combobox-Common-Tests.md) |
| QuarterCombobox | ~8 tests | 🔴 Critique | [Combobox-Common-Tests.md](./unit/components/Combobox-Common-Tests.md) |

**Total estimé : ~24 tests**

## 🔗 Tests d'Intégration

### Cascade complète

| ID | Test | Priorité | Fichier |
|----|------|----------|---------|
| INT-CASCADE-001 | Cascade complète de sélection | 🔴 Critique | [step2-address-cascade.integration.test.md](./integration/step2-address-cascade.integration.test.md) |
| INT-CASCADE-002 | Réinitialisation en cascade | 🔴 Critique | [step2-address-cascade.integration.test.md](./integration/step2-address-cascade.integration.test.md) |
| INT-CASCADE-003 | Chargement des données en cascade | 🟡 Important | [step2-address-cascade.integration.test.md](./integration/step2-address-cascade.integration.test.md) |

**Total : 3 tests**

### Création d'entités

| ID | Test | Priorité | Fichier |
|----|------|----------|---------|
| INT-CREATE-001 | Création d'une province | 🟡 Important | [step2-address-creation.integration.test.md](./integration/step2-address-creation.integration.test.md) |
| INT-CREATE-002 | Création d'une commune avec contexte | 🔴 Critique | [step2-address-creation.integration.test.md](./integration/step2-address-creation.integration.test.md) |
| INT-CREATE-003 | Validation du formulaire de création | 🟡 Important | [step2-address-creation.integration.test.md](./integration/step2-address-creation.integration.test.md) |
| INT-CREATE-004 | Gestion des erreurs de création | 🟡 Important | [step2-address-creation.integration.test.md](./integration/step2-address-creation.integration.test.md) |
| INT-CREATE-005 | Création en cascade | 🟢 Normal | [step2-address-creation.integration.test.md](./integration/step2-address-creation.integration.test.md) |

**Total : 5 tests**

### Optimistic Update

| ID | Test | Priorité | Fichier |
|----|------|----------|---------|
| INT-OPT-001 | Création commune avec Optimistic Update | 🔴 Critique | [step2-address-optimistic-update.integration.test.md](./integration/step2-address-optimistic-update.integration.test.md) |
| INT-OPT-002 | Synchronisation cache-formulaire | 🔴 Critique | [step2-address-optimistic-update.integration.test.md](./integration/step2-address-optimistic-update.integration.test.md) |
| INT-OPT-003 | Cascade Reset après création | 🔴 Critique | [step2-address-optimistic-update.integration.test.md](./integration/step2-address-optimistic-update.integration.test.md) |
| INT-OPT-004 | Context-Aware Update | 🔴 Critique | [step2-address-optimistic-update.integration.test.md](./integration/step2-address-optimistic-update.integration.test.md) |
| INT-OPT-005 | Invalidation et Refetch | 🟡 Important | [step2-address-optimistic-update.integration.test.md](./integration/step2-address-optimistic-update.integration.test.md) |
| INT-OPT-006 | Apparition immédiate dans Combobox | 🔴 Critique | [step2-address-optimistic-update.integration.test.md](./integration/step2-address-optimistic-update.integration.test.md) |

**Total : 6 tests**

### Gestion du Cache

| ID | Test | Priorité | Fichier |
|----|------|----------|---------|
| INT-CACHE-001 | Cache lors du retour à une recherche précédente | 🔴 Critique | [step2-address-cache-management.integration.test.md](./integration/step2-address-cache-management.integration.test.md) |
| INT-CACHE-002 | Debounce de la recherche | 🟡 Important | [step2-address-cache-management.integration.test.md](./integration/step2-address-cache-management.integration.test.md) |
| INT-CACHE-003 | Limite de résultats (50) | 🟡 Important | [step2-address-cache-management.integration.test.md](./integration/step2-address-cache-management.integration.test.md) |
| INT-CACHE-004 | Tri alphabétique | 🟡 Important | [step2-address-cache-management.integration.test.md](./integration/step2-address-cache-management.integration.test.md) |
| INT-CACHE-005 | Chargement complet vs Recherche | 🔴 Critique | [step2-address-cache-management.integration.test.md](./integration/step2-address-cache-management.integration.test.md) |
| INT-CACHE-006 | Minimum de caractères pour la recherche | 🟡 Important | [step2-address-cache-management.integration.test.md](./integration/step2-address-cache-management.integration.test.md) |

**Total : 6 tests**

## 📊 Statistiques globales

| Catégorie | Nombre de tests | Priorité Critique | Priorité Important | Priorité Normal |
|-----------|----------------|-------------------|-------------------|-----------------|
| **Tests unitaires - Hooks** | 37 | 15 | 12 | 10 |
| **Tests unitaires - Composants** | ~44 | ~20 | ~16 | ~8 |
| **Tests d'intégration** | 20 | 11 | 8 | 1 |
| **TOTAL** | **~101 tests** | **~47** | **~38** | **~19** |

## 🎯 Tests critiques (à implémenter en priorité)

### Phase 1 : Fondations (🔴 Critique)
1. `useAddressCascade` : Tests de chargement et cascade (UNIT-ADDR-001 à 011)
2. `useCascadingEntityCreation` : Tests Optimistic Update (UNIT-CASC-001 à 010)
3. `CommuneCombobox` : Tests de base et cascade (UNIT-COMMUNE-001 à 010)
4. `Step2` : Tests de cascade et handlers (UNIT-STEP2-001, 003, 005, 006)
5. Tests d'intégration Optimistic Update (INT-OPT-001 à 004, 006)
6. Tests d'intégration Gestion du Cache (INT-CACHE-001, 005) : **Crucial** pour les stratégies de chargement

### Phase 2 : Compléments (🟡 Important)
6. Tests de recherche et filtrage
7. Tests de validation
8. Tests d'erreurs

### Phase 3 : Cas limites (🟢 Normal)
9. Tests de cas limites
10. Tests d'accessibilité

## 📚 Références

- [README principal](./README.md)
- [Documentation Step2](../README.md)
- [Test IDs E2E](../ui/test-ids.md)
