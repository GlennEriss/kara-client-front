# Workflow - Use Case "Approuver une Demande d'Adhésion"

> Workflow d'implémentation spécifique pour la fonctionnalité **"Approuver une Demande d'Adhésion"** (Membership Requests)
> 
> Ce workflow suit la structure générale de `documentation/general/WORKFLOW.md` mais est adapté spécifiquement à cette fonctionnalité.

---

## 📋 Vue d'ensemble

**Use Case** : UC-MEM-007 - Approuver une demande d'adhésion

**Acteurs** :
- **Admin KARA** : Approuve la demande et crée le compte membre
- **Système** : Gère la création automatique (Firebase Auth, Firestore, etc.)

**Scope** :
- Approuver une demande payée (Admin)
- Créer le compte membre (Firebase Auth, Firestore)
- Archiver le PDF d'adhésion
- Générer et télécharger les identifiants de connexion (PDF)
- Gérer entreprise/profession (si applicable)
- Notifications et traçabilité

---

## 📚 Documentation de Référence

### Documentation UML
- **Use Cases** : `documentation/uml/use-cases/USE_CASES_COMPLETS.puml` (UC-MEM-007)
- **Diagrammes de Classes** : `documentation/uml/classes/CLASSES_MEMBERSHIP.puml` (classes Approbation)

### Documentation Fonctionnelle
- **Diagrammes d'Activité** :
  - `documentation/membership-requests/approbation/activite/Approuver.puml` (Admin)

- **Diagrammes de Séquence** :
  - `documentation/membership-requests/approbation/sequence/SEQ_Approuver.puml` (Admin - Approbation)

### Documentation UI/UX
- **Wireframes** :
  - `documentation/membership-requests/approbation/wireframes/APPROVAL_MODAL.md` (Modal d'approbation)
  - `documentation/membership-requests/approbation/wireframes/APPROVAL_MODAL_STATES.md` (États du modal)

### Documentation Tests
- **Tests** :
  - `documentation/membership-requests/approbation/test/README.md` (Vue d'ensemble)
  - `documentation/membership-requests/approbation/test/DATA_TESTID.md` (~50 data-testid)
  - `documentation/membership-requests/approbation/test/TESTS_UNITAIRES.md` (33 tests unitaires)
  - `documentation/membership-requests/approbation/test/TESTS_INTEGRATION.md` (12 tests intégration)
  - `documentation/membership-requests/approbation/test/TESTS_E2E.md` (18 tests E2E)

### Documentation Firebase
- **Firebase** :
  - `documentation/membership-requests/approbation/firebase/README.md` (Vue d'ensemble)
  - `documentation/membership-requests/approbation/firebase/FIRESTORE_RULES.md` (Règles Firestore)
  - `documentation/membership-requests/approbation/firebase/STORAGE_RULES.md` (Règles Storage)
  - `documentation/membership-requests/approbation/firebase/FIRESTORE_INDEXES.md` (Index Firestore)

### Documentation Cloud Functions
- **Cloud Functions** :
  - `documentation/membership-requests/approbation/functions/README.md` ⭐ (Cloud Function `approveMembershipRequest`)
  - `documentation/membership-requests/approbation/functions/IMPLEMENTATION.md` ⭐ (Implémentation détaillée)

### Documentation Notifications
- **Notifications** :
  - `documentation/membership-requests/approbation/notification/README.md` ⭐ (Notifications d'approbation)

---

## 🎯 Architecture V2 - Domaines

### Structure du Code

```
src/
├── domains/
│   └── memberships/                    # Domaine Membership
│       ├── entities/                   # Types/Interfaces
│       │   └── MembershipRequest.ts    # Type avec champs approval (approvedBy, approvedAt)
│       │
│       ├── repositories/                # Accès données
│       │   └── MembershipRepositoryV2.ts
│       │       - updateStatus()         # Mise à jour statut 'approved'
│       │
│       ├── services/                    # Logique métier
│       │   └── MembershipServiceV2.ts
│       │       - approveMembershipRequest()  # Approuver demande
│       │
│       ├── hooks/                       # Hooks React Query
│       │   └── useMembershipActionsV2.ts
│       │       - useApproveMembershipRequest()
│       │
│       └── components/                  # Composants UI
│           ├── modals/
│           │   └── ApprovalModalV2.tsx  # Modal d'approbation
│           │
│           └── actions/
│               └── MembershipRequestActionsV2.tsx  # Bouton "Approuver"
│
└── shared/
    └── utils/                            # Utilitaires partagés
        ├── approvalUtils.ts             # Génération email, mot de passe
        └── pdfGenerator.ts              # Génération PDF identifiants

functions/
└── src/
    └── membership-requests/
        └── approveMembershipRequest.ts  # Cloud Function (callable)

src/domains/memberships/__tests__/    # Tests domaine Membership
├── unit/
│   ├── utils/
│   │   ├── approvalUtils.test.ts       # Tests approvalUtils
│   │   └── pdfGenerator.test.ts        # Tests pdfGenerator
│   ├── services/
│   │   └── MembershipServiceV2.test.ts  # Tests approveMembershipRequest
│   ├── repositories/
│   │   └── MembershipRepositoryV2.test.ts  # Tests updateStatus
│   └── components/
│       └── modals/
│           └── ApprovalModalV2.test.tsx    # Nouveau
│
└── integration/
    └── approve-membership-request.integration.test.tsx  # Nouveau

functions/src/membership-requests/__tests__/
└── approveMembershipRequest.test.ts    # Tests Cloud Function

e2e/                                  # Tests E2E Playwright
└── membership-requests-v2/
    └── approve-request.spec.ts        # Nouveau - Tests E2E (18 tests)
```

---

## 📝 Workflow d'Implémentation

### Étape 0 — Vérification Préalable

**Avant de commencer, vérifier** :
- [ ] Use case documenté dans `documentation/uml/use-cases/USE_CASES_COMPLETS.puml`
- [ ] Diagramme de classes à jour dans `documentation/uml/classes/CLASSES_MEMBERSHIP.puml`
- [ ] Toute la documentation fonctionnelle créée (diagrammes, wireframes, tests)
- [ ] Architecture V2 comprise (domains, repositories, services, hooks)

**Références** :
- `documentation/general/WORKFLOW.md` — Workflow général
- `documentation/architecture/ARCHITECTURE.md` — Architecture technique
- `documentation/membership-requests/approbation/` — Documentation complète

---

### Étape 1 — Créer la Branche Git

Depuis `develop` :
```bash
git checkout develop
git pull
git checkout -b feat/membership-request-approval
```

**Convention** : `feat/membership-request-approval`

---

### Étape 2 — Implémenter les Utilitaires (Phase 1)

**Objectif** : Créer les fonctions utilitaires de base

**Fichiers à créer/modifier** :
- `src/utils/approvalUtils.ts` (nouveau - génération email, mot de passe)
- `src/utils/pdfGenerator.ts` (nouveau - génération PDF identifiants)

**Fichiers de tests à créer** :
- `src/utils/__tests__/approvalUtils.test.ts` (nouveau)
- `src/utils/__tests__/pdfGenerator.test.ts` (nouveau)

**Références** :
- `documentation/membership-requests/approbation/test/TESTS_UNITAIRES.md` §1 (Tests utilitaires)
- `documentation/membership-requests/approbation/activite/Approuver.puml` (Logique génération email/password)

**Checklist** :
- [ ] `generateEmail(firstName, lastName, matricule)` : Génère email format `{firstName}{lastName}{4premiersChiffresMatricule}@kara.ga`
- [ ] `generateSecurePassword(length?)` : Génère mot de passe sécurisé (12+ caractères, majuscules, minuscules, chiffres, caractères spéciaux)
- [ ] `membershipTypeToRole(membershipType)` : Convertit type membre en rôle Firebase
- [ ] `generateCredentialsPDF(data)` : Génère PDF avec identifiants (jsPDF)
- [ ] `downloadPDF(blob, filename)` : Télécharge PDF automatiquement
- [ ] `formatCredentialsFilename(matricule, date)` : Formate nom fichier PDF

**Tests** :
- [ ] Écrire les tests unitaires (voir `TESTS_UNITAIRES.md` §1)
- [ ] Exécuter `pnpm test --run` (tous les tests doivent passer)
- [ ] Couverture 100% pour les utilitaires

---

### Étape 3 — Implémenter les Services (Phase 2)

**Objectif** : Créer la logique métier

**Fichiers à modifier/créer** :
- `src/domains/memberships/services/MembershipServiceV2.ts`

**Références** :
- `documentation/membership-requests/approbation/sequence/SEQ_Approuver.puml` (Flow admin)
- `documentation/membership-requests/approbation/test/TESTS_UNITAIRES.md` §2 (Tests services)

**Checklist MembershipServiceV2** :
- [ ] `approveMembershipRequest(params)` :
  - [ ] Valide que la demande est payée
  - [ ] Valide que la demande a le statut `'pending'`
  - [ ] Récupère demande via repository
  - [ ] **Appelle Cloud Function `approveMembershipRequest`** (transaction atomique)
  - [ ] Cloud Function gère :
    - [ ] Validation complète
    - [ ] Génération email/password
    - [ ] Création User Firebase Auth
    - [ ] Création document `users` Firestore
    - [ ] Création `subscription`
    - [ ] Archivage PDF dans `documents`
    - [ ] Mise à jour `membership-request` (statut, `approvedBy`, `approvedAt`)
    - [ ] Création notification
    - [ ] Rollback en cas d'erreur
  - [ ] Retourne `{ success, matricule, email, password, subscriptionId }`
  - [ ] Génère et télécharge PDF des identifiants

**Tests** :
- [ ] Écrire les tests unitaires (voir `TESTS_UNITAIRES.md` §2)
- [ ] Écrire les tests d'intégration (voir `TESTS_INTEGRATION.md` §1)
- [ ] Exécuter `pnpm test --run`
- [ ] Couverture 85%+ pour les services

---

### Étape 4 — Implémenter les Repositories (Phase 2.5)

**Objectif** : Créer l'accès aux données Firestore

**Fichiers à modifier** :
- `src/domains/memberships/repositories/MembershipRepositoryV2.ts`

**Références** :
- `documentation/membership-requests/approbation/firebase/FIRESTORE_RULES.md` (Règles sécurité)
- `documentation/membership-requests/approbation/firebase/FIRESTORE_INDEXES.md` (Index nécessaires)

**Checklist MembershipRepositoryV2** :
- [ ] `updateStatus(id, status, data)` :
  - [ ] Met à jour statut + champs approval (`approvedBy`, `approvedAt`)
  - [ ] Utilise `serverTimestamp()` pour `updatedAt`
  - [ ] Gère les erreurs Firestore

**Tests** :
- [ ] Écrire les tests unitaires (mocks Firestore)
- [ ] Exécuter `pnpm test --run`
- [ ] Couverture 85%+ pour les repositories

---

### Étape 3.5 — Implémenter la Cloud Function (Phase 2.3)

**Objectif** : Implémenter la Cloud Function pour l'approbation atomique

**Fichiers à créer/modifier** :
- `functions/src/membership-requests/approveMembershipRequest.ts` (nouveau)
- `functions/src/index.ts` (exporter la nouvelle fonction)

**Références** :
- `documentation/membership-requests/approbation/functions/README.md` (Documentation détaillée)
- `documentation/membership-requests/approbation/functions/IMPLEMENTATION.md` (Implémentation détaillée)
- `documentation/membership-requests/approbation/sequence/SEQ_Approuver.puml` (Interactions avec la CF)

**Checklist Cloud Function** :
- [ ] `approveMembershipRequest` (Callable Function) :
  - [ ] Prend `requestId`, `adminId`, `membershipType`, `companyId?`, `professionId?`, `adhesionPdfURL`
  - [ ] **Validation** :
    - [ ] Vérifie que la demande existe
    - [ ] Vérifie que la demande est payée
    - [ ] Vérifie que la demande a le statut `'pending'`
    - [ ] Vérifie les permissions admin
  - [ ] **Génération identifiants** :
    - [ ] Génère email via `generateEmail()`
    - [ ] Génère password via `generateSecurePassword()`
  - [ ] **Création User Firebase Auth** :
    - [ ] Crée utilisateur avec email/password
    - [ ] Configure rôle selon `membershipType`
  - [ ] **Création document `users` Firestore** :
    - [ ] Crée document avec toutes les données du membre
    - [ ] Lie `companyId` et `professionId` si fournis
  - [ ] **Création `subscription`** :
    - [ ] Crée subscription avec `membershipType`, `adhesionPdfURL`
    - [ ] Lie au document `users`
  - [ ] **Archivage PDF** :
    - [ ] Crée document dans `documents` avec type `'ADHESION'`
    - [ ] Lie au membre via `memberId` (matricule)
  - [ ] **Mise à jour `membership-request`** :
    - [ ] Met à jour statut à `'approved'`
    - [ ] Enregistre `approvedBy` (admin ID)
    - [ ] Enregistre `approvedAt` (timestamp serveur)
  - [ ] **Création notification** :
    - [ ] Crée notification type `'status_update'` avec metadata `status: 'approved'`
  - [ ] **Rollback en cas d'erreur** :
    - [ ] Supprime User Firebase Auth si création échoue
    - [ ] Supprime document `users` si subscription échoue
    - [ ] Remet statut à `'pending'` si erreur finale
  - [ ] Retourne `{ success, matricule, email, password, subscriptionId }`

**Déploiement** :
- [ ] Déployer la Cloud Function : `firebase deploy --only functions`
- [ ] Tester la Cloud Function en dev avec Firebase Console ou Postman

**Tests** :
- [ ] Écrire les tests unitaires (voir `TESTS_UNITAIRES.md` §4)
- [ ] Écrire les tests d'intégration (voir `TESTS_INTEGRATION.md` §2)
- [ ] Exécuter `pnpm test --run` (functions)

---

### Étape 5 — Implémenter les Composants UI (Phase 3)

**Objectif** : Créer l'interface utilisateur

**Références** :
- `documentation/membership-requests/approbation/wireframes/APPROVAL_MODAL.md` (UI modal)
- `documentation/membership-requests/approbation/test/DATA_TESTID.md` (~50 data-testid)

**Fichiers à créer/modifier** :

#### 5.1 Composants Admin

**`src/domains/memberships/components/modals/ApprovalModalV2.tsx`**

**Fichiers de tests à créer** :
- `src/domains/memberships/__tests__/unit/components/modals/ApprovalModalV2.test.tsx`

**Checklist** :
- [ ] Modal avec sections :
  - [ ] Informations du dossier (matricule, statut, paiement)
  - [ ] Entreprise (si `isEmployed === true`, avec badge existe/n'existe pas, bouton créer)
  - [ ] Profession (si `isEmployed === true`, avec badge existe/n'existe pas, bouton créer)
  - [ ] Type de membre (select obligatoire)
  - [ ] PDF d'adhésion (upload obligatoire)
- [ ] Validation (bouton désactivé si type ou PDF manquant)
- [ ] Loading state pendant approbation
- [ ] États d'erreur (validation, API)
- [ ] Data-testid : `approval-modal-*` (~35 data-testid)

**`src/domains/memberships/components/actions/MembershipRequestActionsV2.tsx`**
- [ ] Ajouter bouton "Approuver" (si `status === 'pending'` ET `isPaid === true`)
- [ ] Désactiver bouton si non payé (avec message "Paiement requis")
- [ ] Data-testid : `membership-request-approve-button-{requestId}`

**Checklist Design System** :
- [ ] Utiliser couleurs KARA (`#234D65`, `#CBB171`)
- [ ] Utiliser composants shadcn UI (Dialog, Button, Select, Badge, Alert)
- [ ] Responsive (mobile-first)
- [ ] Animations (fade, scale, slide) selon wireframes
- [ ] Accessibilité (ARIA labels, keyboard navigation)

**Tests** :
- [ ] Écrire les tests unitaires (voir `TESTS_UNITAIRES.md` §5)
- [ ] Exécuter `pnpm test --run`
- [ ] Couverture 85%+ pour les composants

**Référence tests** : `documentation/membership-requests/approbation/test/TESTS_UNITAIRES.md` §5 (Tests composants)

---

### Étape 6 — Implémenter les Hooks React Query (Phase 4)

**Objectif** : Créer l'orchestration avec React Query

**Fichiers à créer/modifier** :
- `src/domains/memberships/hooks/useMembershipActionsV2.ts`

**Checklist useMembershipActionsV2** :
- [ ] `useApproveMembershipRequest()` :
  - [ ] Mutation React Query
  - [ ] Appelle `MembershipServiceV2.approveMembershipRequest()`
  - [ ] Invalide cache `membershipRequests`
  - [ ] Gère loading/error/success
  - [ ] Génère et télécharge PDF après succès

**Tests** :
- [ ] Écrire les tests d'intégration (voir `TESTS_INTEGRATION.md`)
- [ ] Exécuter `pnpm test --run`

---

### Étape 7 — Intégrer dans les Pages (Phase 5)

**Objectif** : Intégrer les composants dans les pages existantes

**Fichiers à modifier** :
- `src/app/(admin)/membership-requests/page.tsx` (ou composant liste)

**Checklist Page Admin** :
- [ ] Intégrer `ApprovalModalV2` dans la liste des demandes
- [ ] Intégrer bouton "Approuver" dans `MembershipRequestActionsV2`
- [ ] Afficher badge "Approuvé" si `status === 'approved'`
- [ ] Afficher `approvedBy` et `approvedAt` si disponibles

**Fichiers de tests E2E à créer** :
- `e2e/membership-requests-v2/approve-request.spec.ts` (Tests E2E - 18 tests)

**Tests** :
- [ ] Tests E2E (voir `TESTS_E2E.md`)
- [ ] Exécuter `pnpm test:e2e` (avec `pnpm dev` en arrière-plan)

**Référence tests** : `documentation/membership-requests/approbation/test/TESTS_E2E.md` (18 tests E2E)

---

### Étape 8 — Configuration Firebase (Phase 6)

**Objectif** : Configurer Firestore Rules, Storage Rules, et Indexes

**Références** :
- `documentation/membership-requests/approbation/firebase/FIRESTORE_RULES.md`
- `documentation/membership-requests/approbation/firebase/STORAGE_RULES.md`
- `documentation/membership-requests/approbation/firebase/FIRESTORE_INDEXES.md`

**Checklist Firestore Rules** :
- [ ] Vérifier règles pour `membership-requests` :
  - [ ] Admin peut `update` avec `approvedBy` et `approvedAt`
- [ ] Vérifier règles pour `users` :
  - [ ] Cloud Function peut créer (service account)
  - [ ] Admin peut lire
- [ ] Vérifier règles pour `subscriptions` :
  - [ ] Cloud Function peut créer (service account)
  - [ ] Admin peut lire
- [ ] Vérifier règles pour `documents` :
  - [ ] Cloud Function peut créer (service account)
  - [ ] Admin peut lire
- [ ] Tester avec émulateurs Firebase
- [ ] Déployer en dev : `firebase deploy --only firestore:rules`

**Checklist Storage Rules** :
- [ ] Vérifier règles pour `membership-adhesion-pdfs/` :
  - [ ] Admin peut upload (PDF uniquement, max 10 MB)
  - [ ] Cloud Function peut lire (service account)
- [ ] Tester avec émulateurs
- [ ] Déployer en dev : `firebase deploy --only storage`

**Checklist Firestore Indexes** :
- [ ] Ajouter index `status + approvedBy + approvedAt` (si pas déjà présent)
- [ ] Ajouter index `status + approvedAt` (si pas déjà présent)
- [ ] Ajouter dans `firestore.indexes.json` :
  ```json
  {
    "collectionGroup": "membership-requests",
    "queryScope": "COLLECTION",
    "fields": [
      { "fieldPath": "status", "order": "ASCENDING" },
      { "fieldPath": "approvedBy", "order": "ASCENDING" },
      { "fieldPath": "approvedAt", "order": "DESCENDING" }
    ]
  },
  {
    "collectionGroup": "membership-requests",
    "queryScope": "COLLECTION",
    "fields": [
      { "fieldPath": "status", "order": "ASCENDING" },
      { "fieldPath": "approvedAt", "order": "DESCENDING" }
    ]
  }
  ```
- [ ] Déployer en dev : `firebase deploy --only firestore:indexes`
- [ ] Attendre construction de l'index (vérifier dans Firebase Console)

**⚠️ IMPORTANT** : Ne pas créer d'index manuellement via Firebase Console. Tout doit être dans `firestore.indexes.json`.

---

### Étape 9 — Tests Locaux (OBLIGATOIRE avant commit)

**⚠️ RÈGLE CRITIQUE** : **Aucun commit/push si les tests échouent localement**

Avant chaque commit, exécuter :
```bash
# 1. Linter
pnpm lint

# 2. Type check
pnpm typecheck

# 3. Tests unitaires/component/integration (mockés - rapides)
pnpm test --run

# 4. Build (vérifier que ça compile)
pnpm build

# 5. Tests E2E locaux (OBLIGATOIRE pour flows critiques)
# Prérequis : pnpm dev en arrière-plan, connexion Firebase Cloud (dev)
pnpm test:e2e
```

**Règle absolue** :
- ✅ **Si tous les tests passent** → Commit et push autorisés
- ❌ **Si un test échoue** → Corriger avant de commit/push

**Références** :
- `documentation/membership-requests/approbation/test/TESTS_UNITAIRES.md` (33 tests)
- `documentation/membership-requests/approbation/test/TESTS_INTEGRATION.md` (12 tests)
- `documentation/membership-requests/approbation/test/TESTS_E2E.md` (18 tests)
- `documentation/membership-requests/approbation/test/README.md` (Objectif 80%+)

---

### Étape 10 — Commits & Push

**Uniquement si tous les tests locaux passent** :

```bash
git add .
git commit -m "feat(membership): add approve membership request functionality"
git push -u origin feat/membership-request-approval
```

**Convention de commits** :
- `feat(membership): add approve membership request functionality`
- `feat(membership): add approval utilities (email, password generation)`
- `feat(membership): add approval modal component`
- `feat(cloud-functions): add approveMembershipRequest function`
- `feat(membership): add approval E2E tests`
- `feat(firestore): add approval indexes`

---

### Étape 11 — Pull Request vers `develop`

**Checklist PR** :
- [ ] **Use case documenté** dans `documentation/uml/use-cases/USE_CASES_COMPLETS.puml`
- [ ] **Diagramme de classes** à jour dans `documentation/uml/classes/CLASSES_MEMBERSHIP.puml`
- [ ] **Documentation complète** : Tous les fichiers dans `documentation/membership-requests/approbation/`
- [ ] **Code** : Respect de l'architecture (Repositories → Services → Hooks → Components)
- [ ] **Design System** : Utilise couleurs KARA, composants shadcn
- [ ] **Responsive** : Fonctionne sur mobile, tablette, desktop
- [ ] **Validation** : Schemas Zod pour formulaires
- [ ] **Rules** : Firestore/Storage rules à jour
- [ ] **Indexes** : `firestore.indexes.json` à jour (indexes `approvedBy`, `approvedAt`)
- [ ] **Tests locaux** : Tous les tests passent (`pnpm lint`, `pnpm typecheck`, `pnpm test --run`, `pnpm build`)
- [ ] **Tests** : Unit + component + integration (33 tests unitaires, 12 intégration)
- [ ] **Tests E2E locaux** : Tests E2E passent avec Firebase Cloud (dev) (18 tests)
- [ ] **CI** : Pipeline vert (incluant tests E2E)
- [ ] **Data-testid** : Tous les ~50 data-testid ajoutés

**Processus automatique GitHub Actions** :
1. PR créée → Workflow `pr-checks.yml` s'exécute
2. Exécution de tous les tests (incluant E2E)
3. **Si un seul test échoue** → ❌ PR bloquée
4. **Si tous les tests passent** → ✅ PR peut être mergée

---

### Étape 12 — Merge vers `develop` + Déploiement préprod

**Processus automatique après merge** :

1. **Phase Tests (OBLIGATOIRE)** :
   - Workflow `ci.yml` s'exécute automatiquement sur `develop`
   - Exécution de tous les tests (incluant E2E)
   - **Si un test échoue** → ❌ **Déploiement annulé**

2. **Phase Déploiement (seulement si tests OK)** :
   - Workflow `deploy-preprod.yml` s'exécute **uniquement si** `ci.yml` est vert
   - Déploiement automatique vers **préprod** :
     - Firestore Rules
     - Firestore Indexes (indexes `approvedBy`, `approvedAt` construits)
     - Storage Rules
     - Cloud Functions

---

### Étape 13 — Validation Préprod (Smoke Test)

**Sur préprod** :
- [ ] Vérifier que la liste des demandes s'affiche
- [ ] Tester "Approuver" (bouton → modal → remplissage → soumission)
- [ ] Vérifier que le PDF des identifiants est téléchargé
- [ ] Vérifier badge "Approuvé" et `approvedBy`/`approvedAt`
- [ ] Vérifier que le User est créé dans Firebase Auth
- [ ] Vérifier que les documents sont créés dans Firestore

**Si OK** : passer à l'étape 14 (tests E2E en préprod).  
**Si problème** : corriger sur `develop`, re-déployer en préprod.

---

### Étape 14 — Tests E2E en Préprod (OBLIGATOIRE avant prod)

**⚠️ RÈGLE CRITIQUE** : **Aucune feature ne peut être mise en production sans tests E2E réussis en préprod**

**Objectif** : Valider que la feature fonctionne avec la **vraie base de données Firebase en préprod**.

**Processus** :
```bash
# Configuration préprod pour tests E2E
NEXT_PUBLIC_FIREBASE_PROJECT_ID=kara-mutuelle-preprod
NEXT_PUBLIC_APP_URL=https://<preprod-url>.vercel.app

# Tests E2E en préprod (CRITIQUE)
NEXT_PUBLIC_USE_FIREBASE_EMULATORS=false pnpm test:e2e:preprod
```

**Checklist des tests E2E en préprod** :
- [ ] **P0-APPROV-01** : Approuver une demande payée (flow complet)
- [ ] **P0-APPROV-02** : Validation - Type de membre requis
- [ ] **P0-APPROV-03** : Validation - PDF d'adhésion requis
- [ ] **P0-APPROV-04** : Créer entreprise si n'existe pas
- [ ] **P0-APPROV-05** : Créer profession si n'existe pas
- [ ] **P0-APPROV-13** : Téléchargement automatique PDF identifiants
- [ ] **P1-APPROV-16** : Vérifier champs de traçabilité

**Règle absolue** :
- ✅ **Si tous les tests E2E passent en préprod** → Feature prête pour production
- ❌ **Si un test échoue en préprod** → Corriger, re-déployer, re-tester

**Référence** :
- `documentation/membership-requests/approbation/test/TESTS_E2E.md` (18 tests)

---

### Étape 15 — Release vers `main` (Prod)

Créer une PR `develop` → `main`.

**Processus automatique** :

1. **Phase Tests PR (OBLIGATOIRE)** :
   - Workflow `pr-checks.yml` s'exécute
   - Exécution de tous les tests (incluant E2E)
   - **Si un test échoue** → ❌ PR bloquée

2. **Phase Merge** :
   - **Seulement si tous les tests passent** → Merge possible

3. **Phase Tests Post-Merge (OBLIGATOIRE)** :
   - Workflow `ci.yml` s'exécute sur `main`
   - Exécution de tous les tests (incluant E2E)
   - **Si un test échoue** → ❌ **Déploiement annulé**

4. **Phase Déploiement Prod (seulement si tests OK)** :
   - Workflow `deploy-prod.yml` s'exécute **uniquement si** `ci.yml` est vert
   - Déploiement automatique vers **prod**
   - Création d'un tag Git `vX.Y.Z`
   - Annuaire : marquer feature comme "✅ Réalisée"

---

## ✅ Definition of Done (DoD)

### Pour cette fonctionnalité

- [ ] **Use case documenté** dans `documentation/uml/use-cases/USE_CASES_COMPLETS.puml` (UC-MEM-007)
- [ ] **Diagramme de classes** à jour dans `documentation/uml/classes/CLASSES_MEMBERSHIP.puml`
- [ ] **Documentation complète** : Tous les fichiers dans `documentation/membership-requests/approbation/`
- [ ] **Code** : Respect de l'architecture V2 (Repositories → Services → Hooks → Components)
- [ ] **Design System** : Utilise couleurs KARA, composants shadcn
- [ ] **Responsive** : Fonctionne sur mobile, tablette, desktop
- [ ] **Validation** : Schemas Zod pour formulaires
- [ ] **Rules** : Firestore/Storage rules à jour
- [ ] **Indexes** : `firestore.indexes.json` à jour (indexes `approvedBy`, `approvedAt`)
  - [ ] Indexes ajoutés dans `firestore.indexes.json`
  - [ ] Indexes testés en dev et déployés
  - [ ] Vérification que les indexes sont construits avant merge
- [ ] **Tests locaux** : Tous les tests passent (`pnpm lint`, `pnpm typecheck`, `pnpm test --run`, `pnpm build`)
- [ ] **Tests** : Unit + component + integration (33 tests unitaires, 12 intégration, couverture 80%+)
- [ ] **Tests E2E locaux** : Tests E2E passent pour les flows critiques avec Firebase Cloud (dev) (18 tests)
- [ ] **CI** : Pipeline vert (incluant tests E2E)
- [ ] **Préprod** : Test manuel rapide (smoke)
- [ ] **Tests E2E préprod** : Tests E2E passent en préprod avec la vraie base Firebase (OBLIGATOIRE)
- [ ] **Data-testid** : Tous les ~50 data-testid ajoutés dans les composants
- [ ] **Cloud Function** : `approveMembershipRequest` déployée et testée
- [ ] **Rollback** : Mécanisme de rollback testé en cas d'erreur
- [ ] **Annuaire** : Feature marquée comme "✅ Réalisée" dans l'annuaire

---

## 📊 Checklist Globale d'Implémentation

### Phase 1 : Utilitaires
- [ ] `approvalUtils.ts` (3 fonctions : email, password, role)
- [ ] `pdfGenerator.ts` (2 fonctions : génération, téléchargement)
- [ ] Tests unitaires (16 tests, couverture 100%)

### Phase 2 : Services & Repositories
- [ ] `MembershipServiceV2.approveMembershipRequest()`
- [ ] `MembershipRepositoryV2.updateStatus()`
- [ ] Tests unitaires (3 tests, couverture 85%+)
- [ ] Tests d'intégration (12 tests)

### Phase 2.5 : Cloud Function
- [ ] `approveMembershipRequest` (Callable Function) — Approbation atomique
- [ ] Déploiement : `firebase deploy --only functions`
- [ ] Tests unitaires (8 tests, couverture 100%)
- [ ] Tests d'intégration (5 tests)

### Phase 3 : Composants UI
- [ ] `ApprovalModalV2.tsx` (~35 data-testid)
- [ ] `MembershipRequestActionsV2.tsx` (modification, 1 data-testid)
- [ ] Tests unitaires (6 tests, couverture 85%+)

### Phase 4 : Hooks React Query
- [ ] `useApproveMembershipRequest()`

### Phase 5 : Intégration Pages
- [ ] Page admin `/membership-requests`
- [ ] Tests E2E (18 tests)

### Phase 6 : Notifications
- [ ] Extension `NotificationService.createApprovalNotification()`
- [ ] Intégration dans Cloud Function `approveMembershipRequest` → Notification d'approbation
- [ ] Ajouter type `NotificationType` dans `src/types/types.ts`

### Phase 7 : Firebase
- [ ] Firestore Rules
- [ ] Storage Rules
- [ ] Firestore Indexes (`firestore.indexes.json`)

---

## 🎯 Références Rapides

### Documentation Fonctionnelle
- Diagrammes d'activité : `documentation/membership-requests/approbation/activite/`
- Diagrammes de séquence : `documentation/membership-requests/approbation/sequence/`
- Wireframes : `documentation/membership-requests/approbation/wireframes/`

### Documentation Tests
- Tests : `documentation/membership-requests/approbation/test/`
- Data-testid : `documentation/membership-requests/approbation/test/DATA_TESTID.md` (~50 data-testid)

### Documentation Firebase
- Firebase : `documentation/membership-requests/approbation/firebase/`

### Documentation Cloud Functions
- Cloud Functions : `documentation/membership-requests/approbation/functions/`

### Documentation Notifications
- Notifications : `documentation/membership-requests/approbation/notification/`

### Documentation Générale
- Workflow général : `documentation/general/WORKFLOW.md`
- Architecture : `documentation/architecture/ARCHITECTURE.md`
- Design System : `documentation/DESIGN_SYSTEM_ET_QUALITE_UI.md`

---

## 🚀 Ordre d'Implémentation Recommandé

1. **Utilitaires** (base solide)
2. **Services** (logique métier)
3. **Cloud Function** (sécurité et atomicité)
4. **Repositories** (accès données)
5. **Composants UI** (interface)
6. **Hooks** (orchestration)
7. **Intégration Pages** (assemblage)
8. **Notifications** (extension NotificationService)
9. **Firebase** (règles et indexes)
10. **Tests E2E** (validation complète)

---

## 📝 Notes d'Implémentation

### Approche TDD vs Test-After

**TDD (Test-Driven Development)** — Recommandé pour :
- ✅ Utilitaires (approvalUtils, pdfGenerator)
- ✅ Services (MembershipServiceV2)
- ✅ Repositories (logique d'accès données)
- ✅ Cloud Function (logique métier critique)

**Test-After** — Recommandé pour :
- ✅ Composants UI (itération rapide, validation visuelle d'abord)
- ✅ Hooks React Query (orchestration, validation après intégration)

**Règle absolue** : Tous les tests doivent être écrits avant le commit final.

### Ordre de Priorité des Tests

1. **Tests unitaires utilitaires** (Phase 1) — Base solide
2. **Tests unitaires services** (Phase 2) — Logique métier
3. **Tests unitaires Cloud Function** (Phase 2.5) — Atomicité et sécurité
4. **Tests d'intégration** (Phase 2.5) — Flows complets
5. **Tests unitaires composants** (Phase 3) — UI isolée
6. **Tests E2E** (Phase 5) — Validation utilisateur complète

### Gestion des Data-testid

**Règle** : Ajouter les data-testid **pendant** l'implémentation des composants, pas après.

**Référence** : `documentation/membership-requests/approbation/test/DATA_TESTID.md` (~50 data-testid documentés)

**Checklist** :
- [ ] Vérifier que chaque composant a ses data-testid
- [ ] Utiliser les noms exacts du fichier DATA_TESTID.md
- [ ] Tester les sélecteurs E2E après ajout

### Gestion des Indexes Firestore

**⚠️ CRITIQUE** : Les indexes `approvedBy` et `approvedAt` doivent être ajoutés dans `firestore.indexes.json` et déployés **avant** de tester les requêtes en production.

**Processus** :
1. Ajouter les indexes dans `firestore.indexes.json`
2. Déployer en dev : `firebase deploy --only firestore:indexes`
3. Attendre construction (vérifier dans Firebase Console)
4. Tester les requêtes
5. Commit et PR (indexes déployés automatiquement en préprod/prod)

**Référence** : `documentation/membership-requests/approbation/firebase/FIRESTORE_INDEXES.md`

---

## 🎯 Points d'Attention

### Sécurité
- ✅ Validation admin : `approvedBy` ne doit jamais être vide
- ✅ Traçabilité : `approvedBy` et `approvedAt` obligatoires
- ✅ Firestore Rules : Cloud Function seule peut créer User/Subscription
- ✅ Storage Rules : Admin seul peut uploader PDF
- ✅ Rollback : Mécanisme complet en cas d'erreur

### Performance
- ✅ Index Firestore : `approvedBy`, `approvedAt` (requêtes rapides)
- ✅ Cache React Query : Invalidation après mutations
- ✅ Lazy loading : Modal chargé à la demande

### UX
- ✅ PDF téléchargement automatique : Identifiants disponibles immédiatement
- ✅ Feedback visuel : Toast, loading states, erreurs claires
- ✅ Responsive : Mobile-first, animations fluides
- ✅ Validation claire : Messages d'erreur explicites

---

## 📞 Support

En cas de doute pendant l'implémentation :
1. Consulter la documentation de référence (section "Documentation de Référence")
2. Vérifier les diagrammes de séquence (flows techniques)
3. Vérifier les wireframes (UI/UX attendue)
4. Vérifier les tests (comportement attendu)
5. Consulter `documentation/general/WORKFLOW.md` pour le workflow général

---

**Note** : Ce workflow doit être suivi étape par étape. Chaque étape doit être validée avant de passer à la suivante.
