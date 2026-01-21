# Workflow - Use Case "Rejeter une Demande d'Adhésion"

> Workflow d'implémentation spécifique pour la fonctionnalité **"Rejeter une Demande d'Adhésion"** (Membership Requests)
> 
> Ce workflow suit la structure générale de `documentation/general/WORKFLOW.md` mais est adapté spécifiquement à cette fonctionnalité.
>
> **Note** : La branche Git a déjà été créée (`feat/membership-request-rejection`). Ce workflow commence directement avec l'implémentation.

---

## 📋 Vue d'ensemble

**Use Case** : UC-MEM-XXX - Rejeter une demande d'adhésion

**Acteurs** :
- **Admin KARA** : Rejette une demande d'adhésion avec motif justificatif
- **Demandeur** : Reçoit la notification de rejet (via WhatsApp manuel)

**Scope** :
- Rejeter une demande d'adhésion (Admin)
- Enregistrer le motif de rejet (obligatoire, minimum 10 caractères)
- Mettre à jour le statut avec traçabilité (processedBy, processedAt, motifReject)
- Créer notification Firestore pour admins (type: membership_rejected)
- Actions post-rejet : Réouvrir, Envoyer WhatsApp, Supprimer, Voir détails

---

## 📚 Documentation de Référence

### Documentation UML
- **Use Cases** : `documentation/uml/use-cases/USE_CASES_COMPLETS.puml` (UC-MEM-XXX)
- **Diagrammes de Classes** : `documentation/uml/classes/CLASSES_MEMBERSHIP.puml` (classes Rejet)

### Documentation Fonctionnelle
- **Diagrammes d'Activité** :
  - `documentation/membership-requests/rejet/activite/Rejeter.puml` (Flux complet avec actions post-rejet)
- **Diagrammes de Séquence** :
  - `documentation/membership-requests/rejet/sequence/SEQ_Rejeter.puml` (Flux de rejet)

### Documentation UI/UX
- **Wireframes** :
  - `documentation/membership-requests/rejet/wireframes/MODAL_WHATSAPP_REJET.md` (Modal WhatsApp pour motif de rejet)

### Documentation Cloud Functions
- **Cloud Functions** :
  - `documentation/membership-requests/rejet/functions/README.md` (Vue d'ensemble)
  - `documentation/membership-requests/rejet/functions/deleteMembershipRequest.md` (Suppression définitive - obligatoire)
  - `documentation/membership-requests/rejet/functions/onMembershipRequestRejected.md` (Notification automatique - optionnel/non prioritaire)

### Documentation Notifications
- **Notifications** :
  - `documentation/membership-requests/rejet/notification/README.md` (Toutes les notifications pour le rejet)

### Documentation Firebase
- **Firebase** :
  - `documentation/membership-requests/rejet/firebase/README.md` (Vue d'ensemble)
  - `documentation/membership-requests/rejet/firebase/FIRESTORE_RULES.md` (Règles Firestore)
  - `documentation/membership-requests/rejet/firebase/STORAGE_RULES.md` (Règles Storage)
  - `documentation/membership-requests/rejet/firebase/FIRESTORE_INDEXES.md` (Index Firestore)

---

## 🎯 Architecture V2 - Domaines

### Structure du Code

```
src/
├── domains/
│   └── memberships/                    # Domaine Membership
│       ├── entities/                   # Types/Interfaces
│       │   └── MembershipRequest.ts    # Type avec champs rejet (motifReject, processedBy, processedAt)
│       │
│       ├── repositories/                # Accès données
│       │   └── MembershipRepositoryV2.ts
│       │       - updateStatus()         # Mise à jour statut 'rejected'
│       │
│       ├── services/                    # Logique métier
│       │   └── MembershipServiceV2.ts
│       │       - rejectMembershipRequest()   # Rejeter demande
│       │       - reopenMembershipRequest()   # Réouvrir dossier rejeté
│       │
│       ├── hooks/                       # Hooks React Query
│       │   └── useMembershipActionsV2.ts
│       │       - useRejectMembershipRequest()
│       │       - useReopenMembershipRequest()
│       │       - useDeleteMembershipRequest()
│       │
│       └── components/                  # Composants UI
│           ├── modals/
│           │   ├── RejectModalV2.tsx        # Modal rejet (existant)
│           │   ├── ReopenModalV2.tsx        # Modal réouverture (à créer)
│           │   ├── DeleteModalV2.tsx        # Modal suppression (à créer)
│           │   └── RejectWhatsAppModalV2.tsx # Modal WhatsApp (à créer)
│           │
│           └── actions/
│               └── MembershipRequestActionsV2.tsx # Actions post-rejet
│
├── shared/
│   └── utils/                            # Utilitaires partagés
│       └── whatsAppUrlUtils.ts           # Génération URL WhatsApp (avec méthode rejection)
│
├── services/
│   └── notifications/
│       └── NotificationService.ts        # Service notifications
│           - createRejectionNotification()    # Notification rejet (NOTIF-REJET-002)
│           - createReopeningNotification()    # Notification réouverture (NOTIF-REJET-003)
│           - createDeletionNotification()     # Notification suppression (NOTIF-REJET-004)
│
functions/src/membership-requests/
├── deleteMembershipRequest.ts            # Cloud Function suppression (obligatoire)
└── onMembershipRequestRejected.ts        # Cloud Function trigger notification (optionnel/non prioritaire)
```

---

## 📝 Workflow d'Implémentation

### Étape 0 — Vérification Préalable

**✅ Branche Git** : On est déjà sur `feat/membership-request-rejection`

**Avant de commencer, vérifier** :
- [x] Use case documenté dans diagrammes UML
- [x] Diagramme de classes à jour dans `documentation/uml/classes/CLASSES_MEMBERSHIP.puml`
- [x] Toute la documentation fonctionnelle créée (diagrammes, wireframes)
- [x] Architecture V2 comprise (domains, repositories, services, hooks)

**Références** :
- `documentation/general/WORKFLOW.md` — Workflow général
- `documentation/architecture/ARCHITECTURE.md` — Architecture technique
- `documentation/membership-requests/rejet/` — Documentation complète

---

### Étape 1 — Implémenter les Utilitaires (Phase 1)

**Objectif** : Créer/améliorer les fonctions utilitaires pour le rejet

**Fichiers à créer/modifier** :
- `src/shared/utils/whatsAppUrlUtils.ts` (existe déjà, ajouter méthode pour rejet)

**Checklist WhatsAppUrlUtils** :
- [ ] `generateRejectionWhatsAppUrl(phoneNumber, firstName, matricule, motifReject)` :
  - Génère URL WhatsApp avec template de message de rejet
  - Format message : "Bonjour {firstName}, Votre demande d'adhésion KARA (matricule: {matricule}) a été rejetée. Motif de rejet: {motifReject}..."
  - Retourne URL format : `https://wa.me/{phoneNumber}?text={encodedMessage}`

**Tests** :
- [ ] Écrire les tests unitaires pour la nouvelle méthode
- [ ] Exécuter `pnpm test --run` (tous les tests doivent passer)
- [ ] Couverture 100% pour les utilitaires

---

### Étape 2 — Implémenter les Services (Phase 2)

**Objectif** : Créer/améliorer la logique métier pour le rejet et actions post-rejet

**Fichiers à modifier/créer** :
- `src/domains/memberships/services/MembershipServiceV2.ts`
- `src/services/notifications/NotificationService.ts` (ajouter méthodes rejet)

**Références** :
- `documentation/membership-requests/rejet/sequence/SEQ_Rejeter.puml` (Flow rejet)
- `documentation/membership-requests/rejet/FLUX_REJET.md` (Détails logique métier)

**Checklist MembershipServiceV2** :
- [x] `rejectMembershipRequest(params)` : (existant, vérifier/améliorer)
  - [x] Valide motif (10-500 caractères)
  - [x] Récupère demande via repository
  - [x] Met à jour statut 'rejected' avec motifReject, processedBy, processedAt
  - [ ] **Créer notification NOTIF-REJET-002** (membership_rejected) - Tous les admins
  - [x] Retourne `void`

- [ ] `reopenMembershipRequest(params)` : (à créer)
  - [ ] Valide que statut = 'rejected'
  - [ ] Valide motif de réouverture (10-500 caractères)
  - [ ] Met à jour statut à 'under_review' avec reopenReason, reopenedBy, reopenedAt
  - [ ] **Créer notification NOTIF-REJET-003** (membership_reopened) - Tous les admins
  - [ ] Retourne `void`

**Checklist NotificationService** :
- [ ] `createRejectionNotification(params)` :
  - [ ] Crée notification type `membership_rejected`
  - [ ] Destinataire : Tous les admins
  - [ ] Métadonnées : requestId, memberName, adminName, adminId, status, motifReject, processedAt, processedBy

- [ ] `createReopeningNotification(params)` :
  - [ ] Crée notification type `membership_reopened`
  - [ ] Destinataire : Tous les admins
  - [ ] Métadonnées : requestId, memberName, adminName, adminId, status, reopenReason, reopenedAt, reopenedBy, previousStatus

- [ ] `createDeletionNotification(params)` :
  - [ ] Crée notification type `membership_deleted` (optionnel)
  - [ ] Destinataire : Tous les admins
  - [ ] Métadonnées : requestId, memberName, matricule, adminName, adminId, deletedAt, deletedBy, previousStatus, previousMotifReject

**Tests** :
- [ ] Écrire les tests unitaires pour les services
- [ ] Écrire les tests d'intégration
- [ ] Exécuter `pnpm test --run`
- [ ] Couverture 85%+ pour les services

---

### Étape 3 — Implémenter les Repositories (Phase 2.5)

**Objectif** : Vérifier/améliorer l'accès aux données Firestore

**Fichiers à modifier** :
- `src/domains/memberships/repositories/MembershipRepositoryV2.ts`

**Références** :
- `documentation/membership-requests/rejet/firebase/FIRESTORE_RULES.md` (Règles sécurité)
- `documentation/membership-requests/rejet/firebase/FIRESTORE_INDEXES.md` (Index nécessaires)

**Checklist MembershipRepositoryV2** :
- [x] `updateStatus(id, status, data)` : (existant, vérifier/améliorer)
  - [x] Met à jour statut + champs de traçabilité (processedBy, processedAt, motifReject)
  - [x] Utilise `serverTimestamp()` pour `updatedAt`
  - [x] Gère les erreurs Firestore

**Tests** :
- [ ] Écrire les tests unitaires (mocks Firestore)
- [ ] Exécuter `pnpm test --run`
- [ ] Couverture 85%+ pour les repositories

---

### Étape 4 — Implémenter les Cloud Functions (Phase 2.3)

**Objectif** : Créer les Cloud Functions nécessaires

**Fichiers à créer/modifier** :
- `functions/src/membership-requests/deleteMembershipRequest.ts` (obligatoire)
- `functions/src/membership-requests/onMembershipRequestRejected.ts` (optionnel/non prioritaire)
- `functions/src/index.ts` (exporter les nouvelles fonctions)

**Références** :
- `documentation/membership-requests/rejet/functions/README.md` (Documentation détaillée)
- `documentation/membership-requests/rejet/functions/deleteMembershipRequest.md` (Détails suppression)
- `documentation/membership-requests/rejet/functions/onMembershipRequestRejected.md` (Détails notification)

**Checklist Cloud Functions** :
- [ ] `deleteMembershipRequest` (Callable Function - **OBLIGATOIRE**) :
  - [ ] Validation permissions admin
  - [ ] Validation statut = 'rejected'
  - [ ] Validation matricule confirmé = matricule du dossier
  - [ ] Création log d'audit dans `audit-logs`
  - [ ] Suppression fichiers Storage (photos, pièces d'identité)
  - [ ] Suppression document Firestore
  - [ ] **Créer notification NOTIF-REJET-004** (membership_deleted) - Optionnel
  - [ ] Retourne `{ success, requestId, filesDeleted, deletedAt }`

- [ ] `onMembershipRequestRejected` (Firestore Trigger - **OPTIONNEL/NON PRIORITAIRE**) :
  - [ ] Détecte changement statut → 'rejected'
  - [ ] Envoie email/SMS au demandeur
  - [ ] **Note** : Pour l'instant, version minimale avec logging uniquement (phase ultérieure)

**Déploiement** :
- [ ] Déployer Cloud Function `deleteMembershipRequest` : `firebase deploy --only functions:deleteMembershipRequest`
- [ ] Tester la Cloud Function en dev avec Firebase Console ou Postman

---

### Étape 5 — Implémenter les Composants UI (Phase 3)

**Objectif** : Créer/améliorer l'interface utilisateur

**Références** :
- `documentation/membership-requests/rejet/wireframes/MODAL_WHATSAPP_REJET.md` (Modal WhatsApp)

**Fichiers à créer/modifier** :

#### 5.1 Composants Modals

**`src/domains/memberships/components/modals/RejectModalV2.tsx`**
- [x] Modal de rejet (existant, vérifier/améliorer)
- [ ] Validation motif (10-500 caractères)
- [ ] Loading state
- [ ] Data-testid : `reject-modal-*`

**`src/domains/memberships/components/modals/ReopenModalV2.tsx`** (à créer)
- [ ] Modal de réouverture
- [ ] Affichage informations dossier (nom, matricule, motif de rejet initial)
- [ ] Champ motif de réouverture (obligatoire, 10-500 caractères)
- [ ] Validation côté client
- [ ] Loading state
- [ ] Data-testid : `reopen-modal-*`

**`src/domains/memberships/components/modals/DeleteModalV2.tsx`** (à créer)
- [ ] Modal de suppression
- [ ] Avertissement "La suppression sera définitive et non réversible"
- [ ] Affichage informations dossier (nom, matricule)
- [ ] Champ confirmation matricule (obligatoire)
- [ ] Validation : Matricule saisi = Matricule du dossier
- [ ] Loading state
- [ ] Data-testid : `delete-modal-*`

**`src/domains/memberships/components/modals/RejectWhatsAppModalV2.tsx`** (à créer)
- [ ] Modal WhatsApp pour envoyer motif de rejet
- [ ] Sélection numéro WhatsApp (dropdown si plusieurs numéros)
- [ ] Affichage numéro unique si un seul numéro
- [ ] Message template prérempli avec motif de rejet (modifiable)
- [ ] Textarea modifiable pour le message
- [ ] Bouton "Envoyer via WhatsApp" qui ouvre WhatsApp Web
- [ ] Data-testid : `reject-whatsapp-modal-*`

#### 5.2 Composants Actions

**`src/domains/memberships/components/actions/MembershipRequestActionsV2.tsx`** (modification)
- [ ] Ajouter bouton "Réouvrir" (si `status === 'rejected'`)
- [ ] Ajouter bouton "Envoyer WhatsApp" (si `status === 'rejected'`)
- [ ] Ajouter bouton "Supprimer" (si `status === 'rejected'`)
- [ ] Dropdown actions : Fiche d'adhésion, Pièce d'identité (si `status === 'rejected'`)
- [ ] Data-testid : `reopen-button`, `send-whatsapp-button`, `delete-button`

**Checklist Design System** :
- [ ] Utiliser couleurs KARA (`kara-primary-dark`, `kara-primary-light`)
- [ ] Utiliser composants shadcn UI (Dialog, Button, Textarea, Select, Badge, Alert)
- [ ] Responsive (mobile-first)
- [ ] Animations (fade, scale, slide)
- [ ] Accessibilité (ARIA labels, keyboard navigation)

**Tests** :
- [ ] Écrire les tests unitaires pour les composants
- [ ] Exécuter `pnpm test --run`
- [ ] Couverture 85%+ pour les composants

---

### Étape 6 — Implémenter les Hooks React Query (Phase 4)

**Objectif** : Créer l'orchestration avec React Query

**Fichiers à créer/modifier** :
- `src/domains/memberships/hooks/useMembershipActionsV2.ts`

**Checklist useMembershipActionsV2** :
- [x] `useRejectMembershipRequest()` : (existant, vérifier/améliorer)
  - [x] Mutation React Query
  - [x] Appelle `MembershipServiceV2.rejectMembershipRequest()`
  - [x] Invalide cache `membershipRequests`, `membershipRequest`, `notifications`
  - [x] Gère loading/error/success

- [ ] `useReopenMembershipRequest()` : (à créer)
  - [ ] Mutation React Query
  - [ ] Appelle `MembershipServiceV2.reopenMembershipRequest()`
  - [ ] Invalide cache `membershipRequests`, `membershipRequest`, `notifications`
  - [ ] Gère loading/error/success

- [ ] `useDeleteMembershipRequest()` : (à créer)
  - [ ] Mutation React Query
  - [ ] Appelle Cloud Function `deleteMembershipRequest` via `httpsCallable`
  - [ ] Invalide cache `membershipRequests`
  - [ ] Gère loading/error/success

**Tests** :
- [ ] Écrire les tests d'intégration pour les hooks
- [ ] Exécuter `pnpm test --run`

---

### Étape 7 — Intégrer dans les Pages (Phase 5)

**Objectif** : Intégrer les composants dans les pages existantes

**Fichiers à modifier** :
- `src/app/(admin)/membership-requests/page.tsx` (ou composant liste)

**Checklist Page Admin** :
- [ ] Intégrer modals (RejectModalV2, ReopenModalV2, DeleteModalV2, RejectWhatsAppModalV2)
- [ ] Intégrer actions post-rejet dans `MembershipRequestActionsV2`
- [ ] Afficher badge "Rejetée" si `status === 'rejected'`
- [ ] Afficher actions disponibles selon statut

**Fichiers de tests E2E à créer** :
- `e2e/membership-requests-v2/reject.spec.ts` (Tests E2E rejet)
- `e2e/membership-requests-v2/reopen.spec.ts` (Tests E2E réouverture)
- `e2e/membership-requests-v2/delete.spec.ts` (Tests E2E suppression)
- `e2e/membership-requests-v2/send-whatsapp.spec.ts` (Tests E2E WhatsApp)

**Tests** :
- [ ] Tests E2E pour les flows principaux
- [ ] Exécuter `pnpm test:e2e` (avec `pnpm dev` en arrière-plan)

---

### Étape 8 — Configuration Firebase (Phase 6)

**Objectif** : Configurer Firestore Rules, Storage Rules, et Indexes

**Références** :
- `documentation/membership-requests/rejet/firebase/FIRESTORE_RULES.md`
- `documentation/membership-requests/rejet/firebase/STORAGE_RULES.md`
- `documentation/membership-requests/rejet/firebase/FIRESTORE_INDEXES.md`

**Checklist Firestore Rules** :
- [ ] Ajouter règles pour `membership-requests` :
  - [ ] Validation champs rejet (processedBy, processedAt, motifReject) lors du rejet
  - [ ] Validation champs réouverture (reopenedBy, reopenedAt, reopenReason) lors de la réouverture
  - [ ] `read` : Admin toujours, demandeur si authentifié
  - [ ] `update` : Admin toujours (rejet, réouverture)
  - [ ] `delete` : Interdit côté client (uniquement via Cloud Function)
- [ ] Ajouter règles pour `notifications` :
  - [ ] `read` : Admin toujours
  - [ ] `create` : Admin ou Cloud Function
- [ ] Ajouter règles pour `audit-logs` :
  - [ ] `read` : Admin uniquement
  - [ ] `create` : Cloud Function uniquement
- [ ] Tester avec émulateurs Firebase
- [ ] Déployer en dev : `firebase deploy --only firestore:rules`

**Checklist Storage Rules** :
- [ ] Vérifier règles existantes (suppression via Cloud Function uniquement)
- [ ] Tester avec émulateurs
- [ ] Déployer en dev : `firebase deploy --only storage`

**Checklist Firestore Indexes** :
- [ ] Vérifier index `status + createdAt` (si pas déjà présent)
- [ ] Vérifier index `isPaid + status + createdAt` (si pas déjà présent)
- [ ] Vérifier index `processedBy + processedAt` (pour traçabilité)
- [ ] Ajouter dans `firestore.indexes.json` si nécessaire
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

---

### Étape 10 — Commits & Push

**Uniquement si tous les tests locaux passent** :

```bash
git add .
git commit -m "feat(membership): add reject membership request functionality"
git push -u origin feat/membership-request-rejection
```

**Convention de commits** :
- `feat(membership): add reject membership request functionality`
- `feat(membership): add reopen membership request functionality`
- `feat(membership): add delete membership request Cloud Function`
- `feat(membership): add reject WhatsApp modal`
- `feat(notifications): add rejection/reopening/deletion notifications`
- `feat(firestore): add rejection/reopening validation rules`

---

### Étape 11 — Pull Request vers `develop`

**Checklist PR** :
- [ ] **Use case documenté** dans diagrammes UML
- [ ] **Diagramme de classes** à jour dans `documentation/uml/classes/CLASSES_MEMBERSHIP.puml`
- [ ] **Documentation complète** : Tous les fichiers dans `documentation/membership-requests/rejet/`
- [ ] **Code** : Respect de l'architecture (Repositories → Services → Hooks → Components)
- [ ] **Design System** : Utilise couleurs KARA, composants shadcn
- [ ] **Responsive** : Fonctionne sur mobile, tablette, desktop
- [ ] **Validation** : Schemas Zod pour formulaires
- [ ] **Rules** : Firestore/Storage rules à jour
- [ ] **Indexes** : `firestore.indexes.json` à jour
- [ ] **Cloud Functions** : `deleteMembershipRequest` déployée et testée
- [ ] **Tests locaux** : Tous les tests passent (`pnpm lint`, `pnpm typecheck`, `pnpm test --run`, `pnpm build`)
- [ ] **Tests** : Unit + component + integration
- [ ] **Tests E2E locaux** : Tests E2E passent avec Firebase Cloud (dev)
- [ ] **CI** : Pipeline vert (incluant tests E2E)

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
     - Firestore Indexes
     - Storage Rules
     - Cloud Functions

---

### Étape 13 — Validation Préprod (Smoke Test)

**Sur préprod** :
- [ ] Vérifier que la liste des demandes s'affiche
- [ ] Tester "Rejeter" (modal → motif → soumission)
- [ ] Vérifier badge "Rejetée" et statut mis à jour
- [ ] Tester "Réouvrir" (modal → motif → soumission)
- [ ] Tester "Envoyer WhatsApp" (modal → sélection numéro → message → ouverture WhatsApp)
- [ ] Tester "Supprimer" (modal → confirmation matricule → suppression)
- [ ] Vérifier notifications Firestore créées

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
- [ ] **P0-REJET-01** : Rejeter demande (flow complet)
- [ ] **P0-REJET-02** : Vérifier notification Firestore créée (membership_rejected)
- [ ] **P0-REJET-03** : Réouvrir dossier rejeté (flow complet)
- [ ] **P0-REJET-04** : Vérifier notification Firestore créée (membership_reopened)
- [ ] **P0-REJET-05** : Envoyer WhatsApp (sélection numéro → message → ouverture)
- [ ] **P0-REJET-06** : Supprimer dossier rejeté (confirmation matricule → suppression)
- [ ] **P0-REJET-07** : Vérifier Cloud Function deleteMembershipRequest (Firestore + Storage supprimés, audit-log créé)

**Règle absolue** :
- ✅ **Si tous les tests E2E passent en préprod** → Feature prête pour production
- ❌ **Si un test échoue en préprod** → Corriger, re-déployer, re-tester

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

---

## ✅ Definition of Done (DoD)

### Pour cette fonctionnalité

- [ ] **Use case documenté** dans diagrammes UML
- [ ] **Diagramme de classes** à jour dans `documentation/uml/classes/CLASSES_MEMBERSHIP.puml`
- [ ] **Documentation complète** : Tous les fichiers dans `documentation/membership-requests/rejet/`
- [ ] **Code** : Respect de l'architecture V2 (Repositories → Services → Hooks → Components)
- [ ] **Design System** : Utilise couleurs KARA, composants shadcn
- [ ] **Responsive** : Fonctionne sur mobile, tablette, desktop
- [ ] **Validation** : Schemas Zod pour formulaires
- [ ] **Rules** : Firestore/Storage rules à jour
- [ ] **Indexes** : `firestore.indexes.json` à jour
- [ ] **Cloud Functions** : `deleteMembershipRequest` déployée et testée (obligatoire)
- [ ] **Notifications** : Notifications Firestore créées pour rejet, réouverture, suppression
- [ ] **Tests locaux** : Tous les tests passent (`pnpm lint`, `pnpm typecheck`, `pnpm test --run`, `pnpm build`)
- [ ] **Tests** : Unit + component + integration (couverture 85%+)
- [ ] **Tests E2E locaux** : Tests E2E passent pour les flows critiques avec Firebase Cloud (dev)
- [ ] **CI** : Pipeline vert (incluant tests E2E)
- [ ] **Préprod** : Test manuel rapide (smoke)
- [ ] **Tests E2E préprod** : Tests E2E passent en préprod avec la vraie base Firebase (OBLIGATOIRE)

---

## 📊 Checklist Globale d'Implémentation

### Phase 1 : Utilitaires
- [ ] `whatsAppUrlUtils.generateRejectionWhatsAppUrl()` (méthode pour rejet)
- [ ] Tests unitaires (couverture 100%)

### Phase 2 : Services & Repositories
- [x] `MembershipServiceV2.rejectMembershipRequest()` (existant, améliorer notifications)
- [ ] `MembershipServiceV2.reopenMembershipRequest()` (à créer)
- [ ] `NotificationService.createRejectionNotification()` (à créer)
- [ ] `NotificationService.createReopeningNotification()` (à créer)
- [ ] `NotificationService.createDeletionNotification()` (à créer, optionnel)
- [ ] Tests unitaires (couverture 85%+)
- [ ] Tests d'intégration

### Phase 3 : Composants UI
- [x] `RejectModalV2.tsx` (existant, vérifier/améliorer)
- [ ] `ReopenModalV2.tsx` (à créer)
- [ ] `DeleteModalV2.tsx` (à créer)
- [ ] `RejectWhatsAppModalV2.tsx` (à créer)
- [ ] `MembershipRequestActionsV2.tsx` (modification - ajouter actions post-rejet)
- [ ] Tests unitaires (couverture 85%+)

### Phase 4 : Hooks React Query
- [x] `useRejectMembershipRequest()` (existant, vérifier/améliorer)
- [ ] `useReopenMembershipRequest()` (à créer)
- [ ] `useDeleteMembershipRequest()` (à créer)

### Phase 5 : Intégration Pages
- [ ] Page admin `/membership-requests`
- [ ] Tests E2E (rejet, réouverture, suppression, WhatsApp)

### Phase 6 : Cloud Functions
- [ ] `deleteMembershipRequest` (Callable Function) — **OBLIGATOIRE**
- [ ] `onMembershipRequestRejected` (Firestore Trigger) — **OPTIONNEL/NON PRIORITAIRE**
- [ ] Déploiement : `firebase deploy --only functions`

### Phase 7 : Notifications
- [ ] Extension `NotificationService` avec méthodes rejet, réouverture, suppression
- [ ] Intégration dans `MembershipServiceV2.rejectMembershipRequest()` → NOTIF-REJET-002
- [ ] Intégration dans `MembershipServiceV2.reopenMembershipRequest()` → NOTIF-REJET-003
- [ ] Intégration dans Cloud Function `deleteMembershipRequest` → NOTIF-REJET-004 (optionnel)
- [ ] Ajouter types `NotificationType` dans `src/types/types.ts` (membership_rejected, membership_reopened, membership_deleted)

### Phase 8 : Firebase
- [ ] Firestore Rules (validation rejet, réouverture, notifications, audit-logs)
- [ ] Storage Rules (suppression via Cloud Function)
- [ ] Firestore Indexes (`firestore.indexes.json`)

---

## 🎯 Références Rapides

### Documentation Fonctionnelle
- Diagrammes d'activité : `documentation/membership-requests/rejet/activite/`
- Diagrammes de séquence : `documentation/membership-requests/rejet/sequence/`
- Wireframes : `documentation/membership-requests/rejet/wireframes/`

### Documentation Firebase
- Firebase : `documentation/membership-requests/rejet/firebase/`

### Documentation Cloud Functions
- Cloud Functions : `documentation/membership-requests/rejet/functions/`

### Documentation Notifications
- Notifications : `documentation/membership-requests/rejet/notification/`

### Documentation Générale
- Workflow général : `documentation/general/WORKFLOW.md`
- Architecture : `documentation/architecture/ARCHITECTURE.md`

---

## 🚀 Ordre d'Implémentation Recommandé

1. **Utilitaires** (base solide)
2. **Services** (logique métier - notifications)
3. **Cloud Functions** (suppression - obligatoire)
4. **Repositories** (accès données)
5. **Composants UI** (interface - modals)
6. **Hooks** (orchestration)
7. **Intégration Pages** (assemblage)
8. **Firebase** (règles et indexes)
9. **Tests E2E** (validation complète)

---

## 📝 Notes d'Implémentation

### Ordre de Priorité des Fonctionnalités

**Priorité 0 (Critique - Obligatoire)** :
1. ✅ `MembershipServiceV2.rejectMembershipRequest()` (existant, améliorer notifications)
2. ✅ `RejectModalV2.tsx` (existant, vérifier/améliorer)
3. ✅ `useRejectMembershipRequest()` (existant, vérifier/améliorer)
4. ✅ Notification Firestore pour admins (NOTIF-REJET-002)
5. ⏳ Cloud Function `deleteMembershipRequest` (obligatoire pour suppression Storage)

**Priorité 1 (Important)** :
6. ⏳ `MembershipServiceV2.reopenMembershipRequest()` (réouverture)
7. ⏳ `ReopenModalV2.tsx` (modal réouverture)
8. ⏳ `useReopenMembershipRequest()` (hook réouverture)
9. ⏳ Notification Firestore pour réouverture (NOTIF-REJET-003)
10. ⏳ `RejectWhatsAppModalV2.tsx` (modal WhatsApp manuel)

**Priorité 2 (Secondaire)** :
11. ⏳ `DeleteModalV2.tsx` (modal suppression)
12. ⏳ `useDeleteMembershipRequest()` (hook suppression)
13. ⏳ Notification Firestore pour suppression (NOTIF-REJET-004 - optionnel)

**Priorité 3 (Optionnel/Non prioritaire)** :
14. ⏳ Cloud Function `onMembershipRequestRejected` (notification email/SMS automatique - phase ultérieure)

---

## 🎯 Points d'Attention

### Sécurité
- ✅ Validation motif : Obligatoire, 10-500 caractères
- ✅ Traçabilité : processedBy, processedAt, motifReject (rejet) ; reopenedBy, reopenedAt, reopenReason (réouverture)
- ✅ Firestore Rules : Admin uniquement pour rejet/réouverture
- ✅ Storage Rules : Suppression uniquement via Cloud Function (privilèges admin)

### Performance
- ✅ Index Firestore : status + createdAt, processedBy + processedAt
- ✅ Cache React Query : Invalidation après mutations
- ✅ Lazy loading : Modals chargés à la demande

### UX
- ✅ Modal simplifié : Validation en temps réel
- ✅ Actions post-rejet : Boutons clairs selon statut
- ✅ Feedback visuel : Toast, loading states, erreurs claires
- ✅ Responsive : Mobile-first, animations fluides

---

## 📞 Support

En cas de doute pendant l'implémentation :
1. Consulter la documentation de référence (section "Documentation de Référence")
2. Vérifier les diagrammes de séquence (flows techniques)
3. Vérifier les wireframes (UI/UX attendue)
4. Vérifier la documentation des Cloud Functions
5. Consulter `documentation/general/WORKFLOW.md` pour le workflow général

---

**Note** : Ce workflow doit être suivi étape par étape. Chaque étape doit être validée avant de passer à la suivante.
