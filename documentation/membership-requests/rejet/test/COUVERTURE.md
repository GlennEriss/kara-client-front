# Couverture de Tests - Fonctionnalité "Rejet d'une Demande d'Adhésion"

> Plan de couverture de code pour la fonctionnalité de rejet

---

## 📋 Vue d'ensemble

**Objectif Global** : 80%+ de couverture pour toutes les fonctionnalités de rejet

**Répartition par Type de Test** :
- **Tests Unitaires** : 85%+ (utilitaires : 100%, services : 85%+, composants : 80%+)
- **Tests d'Intégration** : 80%+ (flows complets)
- **Tests E2E** : 100% des flows critiques (P0)

---

## 📊 Couverture par Catégorie

### 1. Utilitaires

**Fichiers** :
- `src/shared/utils/whatsAppUrlUtils.ts`

**Couverture Cible** : 100%

**Fonctions à tester** :
- `generateRejectionWhatsAppUrl()` : 100% (5 tests)

**Statut** : ⏳ À implémenter

---

### 2. Services

**Fichiers** :
- `src/domains/memberships/services/MembershipServiceV2.ts`
- `src/services/notifications/NotificationService.ts`

**Couverture Cible** : 85%+

**Méthodes à tester** :
- `MembershipServiceV2.rejectMembershipRequest()` : 85%+ (10 tests)
- `MembershipServiceV2.reopenMembershipRequest()` : 85%+ (5 tests)
- `NotificationService.createRejectionNotification()` : 85%+ (3 tests)
- `NotificationService.createReopeningNotification()` : 85%+ (3 tests)
- `NotificationService.createDeletionNotification()` : 85%+ (4 tests)

**Statut** : ⏳ À implémenter

---

### 3. Repositories

**Fichiers** :
- `src/domains/memberships/repositories/MembershipRepositoryV2.ts`

**Couverture Cible** : 85%+

**Méthodes à tester** :
- `MembershipRepositoryV2.updateStatus()` : 85%+ (8 tests)
  - Rejet (status = 'rejected', motifReject, processedBy, processedAt)
  - Réouverture (status = 'under_review', reopenReason, reopenedBy, reopenedAt)

**Statut** : ⏳ À implémenter

---

### 4. Composants

**Fichiers** :
- `src/domains/memberships/components/modals/RejectModalV2.tsx`
- `src/domains/memberships/components/modals/ReopenModalV2.tsx`
- `src/domains/memberships/components/modals/DeleteModalV2.tsx`
- `src/domains/memberships/components/modals/RejectWhatsAppModalV2.tsx`

**Couverture Cible** : 80%+

**Composants à tester** :
- `RejectModalV2` : 80%+ (12 tests)
- `ReopenModalV2` : 80%+ (10 tests)
- `DeleteModalV2` : 80%+ (10 tests)
- `RejectWhatsAppModalV2` : 80%+ (8 tests)

**Statut** : ⏳ À implémenter

---

### 5. Hooks

**Fichiers** :
- `src/domains/memberships/hooks/useMembershipActionsV2.ts`

**Couverture Cible** : 80%+

**Hooks à tester** :
- `useRejectMembershipRequest()` : 80%+ (4 tests)
- `useReopenMembershipRequest()` : 80%+ (4 tests)
- `useDeleteMembershipRequest()` : 80%+ (4 tests)

**Statut** : ⏳ À implémenter

---

### 6. Cloud Functions

**Fichiers** :
- `functions/src/membership-requests/deleteMembershipRequest.ts`
- `functions/src/membership-requests/onMembershipRequestRejected.ts` (optionnel)

**Couverture Cible** : 90%+

**Cloud Functions à tester** :
- `deleteMembershipRequest` : 90%+ (15 tests)
  - Validation permissions
  - Validation statut = 'rejected'
  - Validation matricule
  - Création audit-log
  - Suppression Storage
  - Suppression Firestore
- `onMembershipRequestRejected` : 90%+ (8 tests - optionnel/non prioritaire)

**Statut** : ⏳ À implémenter

---

## 📈 Tableau de Couverture

| Catégorie | Nombre de Tests | Couverture Cible | Couverture Actuelle |
|-----------|----------------|------------------|---------------------|
| **Utilitaires** | ~5 | 100% | ⏳ 0% |
| **Services** | ~25 | 85%+ | ⏳ 0% |
| **Repositories** | ~8 | 85%+ | ⏳ 0% |
| **Composants** | ~40 | 80%+ | ⏳ 0% |
| **Hooks** | ~12 | 80%+ | ⏳ 0% |
| **Cloud Functions** | ~23 | 90%+ | ⏳ 0% |
| **Total** | **~113** | **85%+** | **⏳ 0%** |

---

## 🎯 Tests d'Intégration

**Couverture Cible** : 80%+

**Flows à tester** :
- Flow Rejet complet : ~8 tests
- Flow Réouverture complet : ~8 tests
- Flow Suppression complet : ~6 tests
- Flow WhatsApp complet : ~4 tests

**Total** : ~26 tests d'intégration

**Statut** : ⏳ À implémenter

---

## 🎯 Tests E2E

**Couverture Cible** : 100% des flows critiques (P0)

**Scénarios à tester** :
- P0-REJET-01 : Rejeter une demande (flow complet)
- P0-REJET-02 : Vérifier notification Firestore créée
- P0-REJET-03 : Réouvrir un dossier rejeté (flow complet)
- P0-REJET-04 : Vérifier notification réouverture créée
- P0-REJET-05 : Envoyer WhatsApp du motif de rejet
- P0-REJET-06 : Supprimer définitivement un dossier rejeté
- P0-REJET-07 : Vérifier Cloud Function deleteMembershipRequest

**Total** : ~20 tests E2E

**Statut** : ⏳ À implémenter

---

## ✅ Definition of Done (DoD) - Couverture

### Pour cette fonctionnalité

- [ ] **Couverture unitaires** : 85%+ pour toutes les fonctionnalités de rejet
  - [ ] Utilitaires : 100%
  - [ ] Services : 85%+
  - [ ] Repositories : 85%+
  - [ ] Composants : 80%+
  - [ ] Hooks : 80%+
  - [ ] Cloud Functions : 90%+
- [ ] **Couverture intégration** : 80%+ pour tous les flows d'intégration
- [ ] **Couverture E2E** : 100% des flows critiques (P0) testés en préprod
- [ ] **CI** : Pipeline vert avec tous les tests (unitaires + intégration + E2E)
- [ ] **Rapport de couverture** : Généré automatiquement et visible dans CI

---

## 📊 Rapport de Couverture

### Commandes

```bash
# Générer rapport de couverture
pnpm test --coverage

# Générer rapport HTML détaillé
pnpm test --coverage --coverageReporters=html

# Ouvrir rapport HTML
open coverage/index.html
```

### Métriques à Suivre

- **Statements** : Pourcentage de lignes de code exécutées
- **Branches** : Pourcentage de branches conditionnelles testées
- **Functions** : Pourcentage de fonctions appelées
- **Lines** : Pourcentage de lignes exécutées

**Objectif** : 80%+ pour toutes les métriques

---

## 🎯 Plan d'Action

### Phase 1 : Tests Unitaires Utilitaires
- [ ] Écrire tests pour `generateRejectionWhatsAppUrl()` (5 tests)
- [ ] Atteindre 100% de couverture pour utilitaires

### Phase 2 : Tests Unitaires Services
- [ ] Écrire tests pour `MembershipServiceV2` (15 tests)
- [ ] Écrire tests pour `NotificationService` (10 tests)
- [ ] Atteindre 85%+ de couverture pour services

### Phase 3 : Tests Unitaires Repositories
- [ ] Écrire tests pour `MembershipRepositoryV2.updateStatus()` (8 tests)
- [ ] Atteindre 85%+ de couverture pour repositories

### Phase 4 : Tests Unitaires Composants
- [ ] Écrire tests pour `RejectModalV2` (12 tests)
- [ ] Écrire tests pour `ReopenModalV2` (10 tests)
- [ ] Écrire tests pour `DeleteModalV2` (10 tests)
- [ ] Écrire tests pour `RejectWhatsAppModalV2` (8 tests)
- [ ] Atteindre 80%+ de couverture pour composants

### Phase 5 : Tests Unitaires Hooks
- [ ] Écrire tests pour hooks (12 tests)
- [ ] Atteindre 80%+ de couverture pour hooks

### Phase 6 : Tests Cloud Functions
- [ ] Écrire tests pour `deleteMembershipRequest` (15 tests)
- [ ] Atteindre 90%+ de couverture pour Cloud Functions

### Phase 7 : Tests d'Intégration
- [ ] Écrire tests d'intégration pour tous les flows (26 tests)
- [ ] Atteindre 80%+ de couverture pour intégration

### Phase 8 : Tests E2E
- [ ] Écrire tests E2E pour tous les flows critiques (20 tests)
- [ ] Tester en local avec Firebase Cloud (dev)
- [ ] Tester en préprod avec Firebase Cloud (préprod) - **OBLIGATOIRE**

---

## 📚 Références

- **Workflow** : `../workflow-use-case-rejet.md`
- **Tests unitaires** : `TESTS_UNITAIRES.md`
- **Tests intégration** : `TESTS_INTEGRATION.md`
- **Tests E2E** : `TESTS_E2E.md`
- **Data-testid** : `DATA_TESTID.md`

---

**Note** : Cette couverture sera suivie et mise à jour au fur et à mesure de l'implémentation des tests.
