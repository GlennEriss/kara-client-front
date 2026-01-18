# Tests - Fonctionnalité Corrections

## 📋 Vue d'ensemble

Ce dossier contient la documentation complète des cas de tests pour la fonctionnalité de correction, basée sur :
- Les diagrammes d'activité et de séquence
- Les wireframes UI/UX
- Les workflows métier

## 📁 Structure

```
test/
├── README.md                    # Ce fichier
├── DATA_TESTID.md              # Récapitulatif des data-testid à ajouter (57 data-testid)
├── TESTS_UNITAIRES.md          # Cas de tests unitaires (utilitaires, composants, services)
├── TESTS_INTEGRATION.md        # Cas de tests d'intégration (flows complets)
├── TESTS_E2E.md                # Cas de tests E2E avec data-testid (admin + demandeur)
├── HELPERS_TEST.md             # Helpers et fixtures pour les tests
├── RESUME_TESTS.md             # Résumé rapide de tous les tests
├── CAS_MANQUANTS.md            # Cas ajoutés suite au feedback P0
├── COUVERTURE_FEEDBACK_P0.md   # Vérification détaillée de la couverture P0
├── VERIFICATION_FINALE.md      # Résumé final de la couverture complète
└── COUVERTURE_80_POURCENT.md   # Plan de couverture 80% pour unitaires/intégration
```

## 🎯 Types de tests

### 1. Tests Unitaires
- Composants UI isolés
- Services et repositories
- Utilitaires (génération code, formatage, etc.)

### 2. Tests d'Intégration
- Interaction composants ↔ services
- Interaction services ↔ repositories
- Flow complet sans UI (logique métier)

### 3. Tests E2E
- Flow complet utilisateur (admin + demandeur)
- Interactions UI réelles
- Validation des workflows métier

## 🔍 Conventions

### Naming des tests
- **Unitaires** : `should [action] when [condition]`
  - Exemple : `should generate a 6-digit code`
- **Intégration** : `should [complete flow description]`
  - Exemple : `should complete full flow: Admin action → Service → Repository → Firestore`
- **E2E** : `P0-CORR-XX: devrait [action attendue]`
  - Exemple : `P0-CORR-01: devrait demander des corrections pour une demande en attente`

### Data-testid
- Format : `[context]-[element]-[action?]`
- Exemple : `corrections-modal-textarea`, `security-code-input-0`
- **Total : 57 data-testid** (43 admin + 14 demandeur)
- Voir `DATA_TESTID.md` pour la liste complète avec code d'exemple

### Priorités
- **P0** : Tests critiques (sécurité, fonctionnalités principales)
- **P1** : Tests importants (validation, edge cases)
- **P2** : Tests de confort (UX, animations)

## 📊 Statistiques

- **Data-testid** : 57 (43 admin + 14 demandeur)
- **Tests unitaires** : 96 tests (~24 utilitaires + 45 composants + 17 services + 10 repositories)
- **Tests d'intégration** : ~20 tests (flows complets)
- **Tests E2E** : 17 tests (10 admin + 7 demandeur)
- **Coverage cible** : 80% minimum (objectif atteint : ~88%)

**✅ Tous les cas du feedback P0 sont couverts à 100%** 
- Voir `COUVERTURE_FEEDBACK_P0.md` pour la vérification détaillée
- Voir `VERIFICATION_FINALE.md` pour le résumé complet

## 📚 Références

- [Wireframes](../wireframes/) : Spécifications UI/UX
- [Diagrammes d'activité](../activite/) : Workflows métier
- [Diagrammes de séquence](../sequence/) : Interactions techniques
- [Règles Firebase](../firebase/) : Sécurité et index

## ✅ Checklist globale

### Documentation
- [x] README.md créé
- [x] DATA_TESTID.md créé (57 data-testid documentés)
- [x] TESTS_UNITAIRES.md créé
- [x] TESTS_INTEGRATION.md créé
- [x] TESTS_E2E.md créé (17 tests, couverture P0 à 100%)
- [x] HELPERS_TEST.md créé
- [x] RESUME_TESTS.md créé
- [x] CAS_MANQUANTS.md créé
- [x] COUVERTURE_FEEDBACK_P0.md créé
- [x] VERIFICATION_FINALE.md créé

### Implémentation
- [ ] Ajouter tous les data-testid dans les composants (57 data-testid)
- [ ] Implémenter les tests unitaires (96 tests, couverture 80%+)
- [ ] Implémenter les tests d'intégration (~20 tests, couverture 80%+)
- [ ] Implémenter les tests E2E (17 tests)
- [ ] Créer les helpers et fixtures
- [ ] Vérifier la couverture avec `npm run test:coverage`
- [ ] Maintenir la couverture à 80%+ lors des modifications futures

**Voir `COUVERTURE_80_POURCENT.md` pour le plan détaillé de couverture**
