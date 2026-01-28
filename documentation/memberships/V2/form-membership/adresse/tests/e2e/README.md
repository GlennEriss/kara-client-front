# Tests E2E - Step2 Adresse

## 📋 Vue d'ensemble

Tests E2E complets pour le composant Step2 Adresse, couvrant tous les scénarios de création et sélection en cascade.

## 🎯 Objectifs

Vérifier que l'utilisateur peut :
1. **Créer** toutes les entités géographiques (Province, Commune, District, Quarter)
2. **Sélectionner** immédiatement les entités créées
3. **Naviguer** dans la cascade complète
4. **Voir** les mises à jour optimistes en temps réel

## 📚 Structure des tests

```
e2e/
├── README.md                                    # Ce fichier
├── step2-address-create-province.e2e.test.ts     # Création et sélection province
├── step2-address-create-commune.e2e.test.ts     # Création et sélection commune
├── step2-address-create-district.e2e.test.ts    # Création et sélection district
├── step2-address-create-quarter.e2e.test.ts     # Création et sélection quarter
├── step2-address-full-cascade-create.e2e.test.ts # Cascade complète avec création
└── step2-address-helpers.ts                     # Helpers réutilisables
```

## 🧪 Scénarios de test

### Scénario 1 : Création et sélection d'une province
- ✅ Ajout d'une province via modal
- ✅ Sélection immédiate de la province créée
- ✅ Vérification de l'apparition dans le Combobox

### Scénario 2 : Création et sélection d'une commune
- ✅ Ajout d'une commune dans la province sélectionnée
- ✅ Sélection immédiate de la commune créée
- ✅ Vérification de l'apparition dans le Combobox

### Scénario 3 : Création et sélection d'un district
- ✅ Ajout d'un district dans la commune sélectionnée
- ✅ Sélection immédiate du district créé
- ✅ Vérification de l'apparition dans le Combobox

### Scénario 4 : Création et sélection d'un quarter
- ✅ Ajout d'un quarter dans le district sélectionné
- ✅ Sélection immédiate du quarter créé
- ✅ Vérification de l'apparition dans le Combobox

### Scénario 5 : Cascade complète avec création
- ✅ Création d'une province → sélection
- ✅ Création d'une commune → sélection
- ✅ Création de 2-3 districts → sélection de l'un
- ✅ Création d'un quarter → sélection
- ✅ Vérification du résumé final

## 📊 Récapitulatif des tests

Pour une vue d'ensemble complète de tous les tests E2E, voir **[E2E-TESTS-RECAPITULATIF.md](./E2E-TESTS-RECAPITULATIF.md)**.

**Statistiques** :
- **12 tests E2E** au total
- **7 tests critiques** (priorité 1)
- **5 tests importants** (priorité 2)

## 🔗 Références

- **[Test IDs](../ui/test-ids.md)** : Liste complète des `data-testid`
- **[Wireframes](../ui/wireframe-etat-initial.md)** : États visuels du composant
- **[Documentation principale](../../README.md)** : Pattern Optimistic Update
- **[Helpers de test](./step2-address-helpers.md)** : Helpers réutilisables
- **[Récapitulatif E2E](./E2E-TESTS-RECAPITULATIF.md)** : Tableau récapitulatif complet
