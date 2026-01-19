# Tests - Approbation d'une Demande d'Adhésion

> Documentation complète des tests (E2E, intégration, unitaires) pour l'approbation

---

## 📋 Vue d'ensemble

Cette documentation couvre tous les tests nécessaires pour la fonctionnalité d'approbation :
- **Tests E2E** : Tests de bout en bout avec Playwright
- **Tests d'Intégration** : Tests des services et repositories
- **Tests Unitaires** : Tests des utilitaires et fonctions isolées

**Objectif de couverture** : **≥ 80%**

---

## 📚 Documents

- **[DATA_TESTID.md](./DATA_TESTID.md)** : Liste complète des `data-testid` pour les tests E2E
- **[TESTS_E2E.md](./TESTS_E2E.md)** : Cas de tests E2E détaillés
- **[TESTS_INTEGRATION.md](./TESTS_INTEGRATION.md)** : Cas de tests d'intégration
- **[TESTS_UNITAIRES.md](./TESTS_UNITAIRES.md)** : Cas de tests unitaires

---

## 🎯 Couverture Cible

### Par Type de Test

- **Tests E2E** : 18 scénarios (P0: 13, P1: 4, P2: 1)
- **Tests d'Intégration** : 12 scénarios
- **Tests Unitaires** : 33 scénarios

**Total** : **63 scénarios de test**

### Par Composant

- **Modal d'Approbation** : 100% des interactions (6 tests unitaires)
- **Cloud Function** : 100% des cas d'erreur et succès (8 tests unitaires + 5 tests intégration)
- **Services** : ≥ 80% de couverture (2 tests unitaires + 3 tests intégration)
- **Repositories** : ≥ 80% de couverture (1 test unitaire)
- **Utilitaires** : 100% de couverture (16 tests unitaires)
- **PDF Generator** : 100% de couverture (3 tests unitaires + 2 tests intégration)

### Estimation de Couverture

**Objectif** : **≥ 80%**

**Répartition estimée** :
- **E2E** : Couvre les flows complets utilisateur
- **Intégration** : Couvre les interactions entre composants
- **Unitaires** : Couvre les fonctions isolées

**Total estimé** : **~85% de couverture**

---

## 📖 Références

- **Wireframes** : `../wireframes/`
- **Flux d'approbation** : `../FLUX_APPROBATION.md`
- **Cloud Function** : `../functions/IMPLEMENTATION.md`
- **Data-TestID** : `DATA_TESTID.md`
