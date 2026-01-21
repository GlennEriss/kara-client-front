# Tests - Fonctionnalité "Rejet d'une Demande d'Adhésion"

> Documentation complète des tests pour la fonctionnalité de rejet d'une demande d'adhésion et actions post-rejet

---

## 📋 Vue d'ensemble

**Use Case** : UC-MEM-XXX - Rejeter une demande d'adhésion

**Module** : `memberships`

**Objectif** : Assurer une couverture de tests complète (unitaires, intégration, E2E) pour :
- Le rejet d'une demande d'adhésion
- La réouverture d'un dossier rejeté
- La suppression définitive d'un dossier rejeté
- L'envoi WhatsApp du motif de rejet
- Les notifications Firestore pour admins

---

## 📚 Documentation Tests

### Fichiers de Documentation

- **README.md** : Ce fichier (vue d'ensemble)
- **DATA_TESTID.md** : Liste complète des data-testid à ajouter dans les composants
- **TESTS_UNITAIRES.md** : Plan détaillé des tests unitaires
- **TESTS_INTEGRATION.md** : Plan détaillé des tests d'intégration
- **TESTS_E2E.md** : Plan détaillé des tests E2E
- **COUVERTURE.md** : Plan de couverture de code (objectif 80%+)

---

## 🎯 Types de Tests

### 1. Tests Unitaires

**Objectif** : Tester les fonctions, méthodes et composants isolément

**Fichiers à tester** :
- **Utilitaires** :
  - `src/shared/utils/whatsAppUrlUtils.ts` (méthode `generateRejectionWhatsAppUrl`)
- **Services** :
  - `src/domains/memberships/services/MembershipServiceV2.ts` (`rejectMembershipRequest`, `reopenMembershipRequest`)
  - `src/services/notifications/NotificationService.ts` (`createRejectionNotification`, `createReopeningNotification`, `createDeletionNotification`)
- **Repositories** :
  - `src/domains/memberships/repositories/MembershipRepositoryV2.ts` (`updateStatus`)
- **Composants** :
  - `src/domains/memberships/components/modals/RejectModalV2.tsx`
  - `src/domains/memberships/components/modals/ReopenModalV2.tsx`
  - `src/domains/memberships/components/modals/DeleteModalV2.tsx`
  - `src/domains/memberships/components/modals/RejectWhatsAppModalV2.tsx`

**Couverture cible** : 85%+

**Référence** : `TESTS_UNITAIRES.md`

---

### 2. Tests d'Intégration

**Objectif** : Tester les interactions entre services, repositories et composants

**Flux à tester** :
- **Rejet** :
  - Service → Repository → Firestore
  - Service → NotificationService → Firestore
  - Hook → Service → Repository
- **Réouverture** :
  - Service → Repository → Firestore
  - Service → NotificationService → Firestore
  - Hook → Service → Repository
- **Suppression** :
  - Hook → Cloud Function → Firestore + Storage
  - Cloud Function → AuditLog
  - Cloud Function → NotificationService → Firestore

**Couverture cible** : 80%+

**Référence** : `TESTS_INTEGRATION.md`

---

### 3. Tests E2E (End-to-End)

**Objectif** : Tester les flows complets depuis l'interface utilisateur

**Scénarios à tester** :
- **P0-REJET-01** : Rejeter une demande d'adhésion (flow complet)
- **P0-REJET-02** : Réouvrir un dossier rejeté (flow complet)
- **P0-REJET-03** : Envoyer WhatsApp du motif de rejet (flow complet)
- **P0-REJET-04** : Supprimer définitivement un dossier rejeté (flow complet)
- **P0-REJET-05** : Vérifier notifications Firestore créées

**Outils** : Playwright

**Environnement** :
- **Local** : Firebase Cloud (dev)
- **Préprod** : Firebase Cloud (préprod) - **OBLIGATOIRE avant prod**

**Référence** : `TESTS_E2E.md`

---

## 📊 Couverture de Tests

### Objectif Global

**Couverture cible** : 80%+ pour toutes les fonctionnalités de rejet

**Répartition** :
- **Utilitaires** : 100% (fonctions simples, critiques)
- **Services** : 85%+ (logique métier)
- **Repositories** : 85%+ (accès données)
- **Composants** : 80%+ (UI/UX)
- **Hooks** : 80%+ (orchestration)
- **Cloud Functions** : 90%+ (sécurité, atomicité)

**Référence** : `COUVERTURE.md`

---

## 🔧 Data-TestID

### Objectif

Permettre la sélection fiable des éléments dans les tests E2E et d'intégration.

### Convention

Format : `{feature}-{element}-{action}`

Exemples :
- `reject-modal-reason-input` : Input motif de rejet dans le modal
- `reject-modal-submit-button` : Bouton "Rejeter" dans le modal
- `reopen-modal-reason-input` : Input motif de réouverture
- `delete-modal-matricule-input` : Input matricule de confirmation

**Référence** : `DATA_TESTID.md` (liste complète)

---

## 📁 Structure des Tests

```
src/domains/memberships/__tests__/
├── unit/
│   ├── utils/
│   │   └── whatsAppUrl.test.ts              # Tests whatsAppUrlUtils (rejet)
│   ├── services/
│   │   └── MembershipServiceV2.test.ts      # Tests rejectMembershipRequest, reopenMembershipRequest
│   ├── repositories/
│   │   └── MembershipRepositoryV2.test.ts   # Tests updateStatus (rejet)
│   └── components/
│       └── modals/
│           ├── RejectModalV2.test.tsx       # Tests modal rejet
│           ├── ReopenModalV2.test.tsx       # Tests modal réouverture
│           ├── DeleteModalV2.test.tsx       # Tests modal suppression
│           └── RejectWhatsAppModalV2.test.tsx # Tests modal WhatsApp
│
└── integration/
    ├── reject-membership-request.integration.test.tsx   # Flow rejet complet
    ├── reopen-membership-request.integration.test.tsx   # Flow réouverture complet
    └── delete-membership-request.integration.test.tsx   # Flow suppression complet

src/services/notifications/__tests__/
├── unit/
│   └── NotificationService.test.ts          # Tests createRejectionNotification, etc.

functions/src/membership-requests/__tests__/
├── deleteMembershipRequest.test.ts          # Tests Cloud Function suppression
└── onMembershipRequestRejected.test.ts      # Tests Cloud Function notification (optionnel)

e2e/membership-requests-v2/
├── reject.spec.ts                           # Tests E2E rejet
├── reopen.spec.ts                           # Tests E2E réouverture
├── delete.spec.ts                           # Tests E2E suppression
└── send-whatsapp.spec.ts                    # Tests E2E WhatsApp
```

---

## 🚀 Exécution des Tests

### Tests Unitaires & Intégration

```bash
# Tous les tests (unit + integration)
pnpm test --run

# Tests unitaires uniquement
pnpm test --run src/domains/memberships/__tests__/unit

# Tests d'intégration uniquement
pnpm test --run src/domains/memberships/__tests__/integration

# Avec couverture
pnpm test --coverage
```

### Tests E2E

```bash
# Tests E2E locaux (Firebase Cloud dev)
# Prérequis : pnpm dev en arrière-plan
pnpm test:e2e

# Tests E2E préprod (OBLIGATOIRE avant prod)
NEXT_PUBLIC_USE_FIREBASE_EMULATORS=false \
NEXT_PUBLIC_FIREBASE_PROJECT_ID=kara-mutuelle-preprod \
pnpm test:e2e:preprod
```

---

## ✅ Definition of Done (DoD) - Tests

### Pour cette fonctionnalité

- [ ] **Tests unitaires** : Tous les tests unitaires écrits et passent (85%+ couverture)
- [ ] **Tests d'intégration** : Tous les tests d'intégration écrits et passent (80%+ couverture)
- [ ] **Tests E2E locaux** : Tous les tests E2E passent avec Firebase Cloud (dev)
- [ ] **Tests E2E préprod** : Tous les tests E2E passent en préprod avec la vraie base Firebase (**OBLIGATOIRE avant prod**)
- [ ] **Data-testid** : Tous les data-testid ajoutés dans les composants
- [ ] **Couverture** : 80%+ pour toutes les fonctionnalités de rejet
- [ ] **CI** : Pipeline vert (incluant tests E2E)

---

## 📝 Prochaines Étapes

1. ⏳ Créer `DATA_TESTID.md` : Liste complète des data-testid
2. ⏳ Créer `TESTS_UNITAIRES.md` : Plan détaillé des tests unitaires
3. ⏳ Créer `TESTS_INTEGRATION.md` : Plan détaillé des tests d'intégration
4. ⏳ Créer `TESTS_E2E.md` : Plan détaillé des tests E2E
5. ⏳ Créer `COUVERTURE.md` : Plan de couverture de code
6. ⏳ Implémenter les tests unitaires
7. ⏳ Implémenter les tests d'intégration
8. ⏳ Implémenter les tests E2E

---

## 📚 Références

### Documentation Fonctionnelle
- **Workflow** : `../workflow-use-case-rejet.md`
- **Flux détaillé** : `../FLUX_REJET.md`
- **Actions post-rejet** : `../ACTIONS_POST_REJET.md`
- **Diagrammes** : `../activite/Rejeter.puml`, `../sequence/SEQ_Rejeter.puml`

### Documentation Tests Référence
- **Tests Corrections** : `../../corrections/test/` (référence pour la structure)
- **Data-testid Corrections** : `../../corrections/test/DATA_TESTID.md` (exemples)
- **Tests Unitaires Corrections** : `../../corrections/test/TESTS_UNITAIRES.md` (structure)

### Documentation Générale
- **Workflow général** : `../../../general/WORKFLOW.md`
- **Architecture** : `../../../architecture/ARCHITECTURE.md`

---

**Note** : Cette documentation sera complétée au fur et à mesure de l'implémentation des tests.
