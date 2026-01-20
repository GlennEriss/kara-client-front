# Vérification Workflow - Approbation

> Vérification complète de l'implémentation selon `workflow-use-case-approbation.md`

**Date** : 2025-01-XX  
**Branche** : `feat/membership-request-approval`

---

## ✅ Étape 0 — Vérification Préalable

- [x] Use case documenté dans `documentation/uml/use-cases/USE_CASES_COMPLETS.puml`
- [x] Diagramme de classes à jour dans `documentation/uml/classes/CLASSES_MEMBERSHIP.puml`
- [x] Toute la documentation fonctionnelle créée (diagrammes, wireframes, tests)
- [x] Architecture V2 comprise (domains, repositories, services, hooks)

---

## ✅ Étape 1 — Créer la Branche Git

- [x] Branche créée : `feat/membership-request-approval`
- [x] Basée sur `develop` (à jour)

**Fichiers** : N/A

---

## ✅ Étape 2 — Implémenter les Utilitaires (Phase 1)

### Checklist Utilitaires

- [x] `generateEmail(firstName, lastName, matricule)` : Génère email format `{firstName}{lastName}{4premiersChiffresMatricule}@kara.ga`
- [x] `generateSecurePassword(length?)` : Génère mot de passe sécurisé (12+ caractères, majuscules, minuscules, chiffres, caractères spéciaux)
- [x] `membershipTypeToRole(membershipType)` : Convertit type membre en rôle Firebase
- [x] `generateCredentialsPDF(data)` : Génère PDF avec identifiants (jsPDF)
- [x] `downloadPDF(blob, filename)` : Télécharge PDF automatiquement
- [x] `formatCredentialsFilename(matricule, date)` : Formate nom fichier PDF

**Fichiers créés** :
- ✅ `src/utils/approvalUtils.ts`
- ✅ `src/utils/pdfGenerator.ts`
- ✅ `src/utils/__tests__/approvalUtils.test.ts`
- ✅ `src/utils/__tests__/pdfGenerator.test.ts`

**Tests** :
- [x] Tests unitaires écrits (13 tests pour approvalUtils, 4 tests pour pdfGenerator)
- [ ] ⚠️ **À VÉRIFIER** : Exécuter `pnpm test --run` (tous les tests doivent passer)
- [ ] ⚠️ **À VÉRIFIER** : Couverture 100% pour les utilitaires

---

## ✅ Étape 3 — Implémenter les Services (Phase 2)

### Checklist MembershipServiceV2

- [x] `approveMembershipRequest(params)` :
  - [x] Valide que la demande est payée
  - [x] Valide que la demande a le statut `'pending'` ou `'under_review'`
  - [x] Récupère demande via repository
  - [x] **Appelle Cloud Function `approveMembershipRequest`** (transaction atomique)
  - [x] Cloud Function gère :
    - [x] Validation complète
    - [x] Génération email/password
    - [x] Création User Firebase Auth
    - [x] Création document `users` Firestore
    - [x] Création `subscription`
    - [x] Archivage PDF dans `documents`
    - [x] Mise à jour `membership-request` (statut, `approvedBy`, `approvedAt`)
    - [x] Création notification
    - [x] Rollback en cas d'erreur
  - [x] Retourne `{ success, matricule, email, password, subscriptionId }`
  - [x] Génère et télécharge PDF des identifiants

**Fichiers modifiés** :
- ✅ `src/domains/memberships/services/MembershipServiceV2.ts`
- ✅ `src/domains/memberships/services/interfaces/IMembershipService.ts`

**Tests** :
- [ ] ⚠️ **À FAIRE** : Écrire les tests unitaires (voir `TESTS_UNITAIRES.md` §2)
- [ ] ⚠️ **À FAIRE** : Écrire les tests d'intégration (voir `TESTS_INTEGRATION.md` §1)
- [ ] ⚠️ **À VÉRIFIER** : Exécuter `pnpm test --run`
- [ ] ⚠️ **À VÉRIFIER** : Couverture 85%+ pour les services

---

## ✅ Étape 4 — Implémenter les Repositories (Phase 2.5)

### Checklist MembershipRepositoryV2

- [x] `updateStatus(id, status, data)` :
  - [x] Met à jour statut + champs approval (`approvedBy`, `approvedAt`)
  - [x] Utilise `serverTimestamp()` pour `updatedAt`
  - [x] Gère les erreurs Firestore

**Fichiers modifiés** :
- ✅ `src/domains/memberships/repositories/MembershipRepositoryV2.ts` (méthode existante, vérifiée)

**Tests** :
- [ ] ⚠️ **À VÉRIFIER** : Tests unitaires existants couvrent `updateStatus`
- [ ] ⚠️ **À VÉRIFIER** : Exécuter `pnpm test --run`
- [ ] ⚠️ **À VÉRIFIER** : Couverture 85%+ pour les repositories

---

## ✅ Étape 3.5 — Implémenter la Cloud Function (Phase 2.3)

### Checklist Cloud Function

- [x] `approveMembershipRequest` (Callable Function) :
  - [x] Prend `requestId`, `adminId`, `membershipType`, `companyId?`, `professionId?`, `adhesionPdfURL`
  - [x] **Validation** :
    - [x] Vérifie que la demande existe
    - [x] Vérifie que la demande est payée
    - [x] Vérifie que la demande a le statut `'pending'` ou `'under_review'`
    - [x] Vérifie les permissions admin
  - [x] **Génération identifiants** :
    - [x] Génère email via `generateEmail()`
    - [x] Génère password via `generateSecurePassword()`
  - [x] **Création User Firebase Auth** :
    - [x] Crée utilisateur avec email/password
    - [x] Configure rôle selon `membershipType`
  - [x] **Création document `users` Firestore** :
    - [x] Crée document avec toutes les données du membre
    - [x] Lie `companyId` et `professionId` si fournis
  - [x] **Création `subscription`** :
    - [x] Crée subscription avec `membershipType`, `adhesionPdfURL`
    - [x] Lie au document `users`
  - [x] **Archivage PDF** :
    - [x] Crée document dans `documents` avec type `'ADHESION'`
    - [x] Lie au membre via `memberId` (matricule)
  - [x] **Mise à jour `membership-request`** :
    - [x] Met à jour statut à `'approved'`
    - [x] Enregistre `approvedBy` (admin ID)
    - [x] Enregistre `approvedAt` (timestamp serveur)
  - [x] **Création notification** :
    - [x] Crée notification type `'status_update'` avec metadata `status: 'approved'`
  - [x] **Rollback en cas d'erreur** :
    - [x] Supprime User Firebase Auth si création échoue
    - [x] Supprime document `users` si subscription échoue
    - [x] Remet statut à `'pending'` si erreur finale
  - [x] Retourne `{ success, matricule, email, password, subscriptionId }`

**Fichiers créés** :
- ✅ `functions/src/membership-requests/approveMembershipRequest.ts`
- ✅ `functions/src/index.ts` (export ajouté)

**Déploiement** :
- [ ] ⚠️ **À FAIRE** : Déployer la Cloud Function : `firebase deploy --only functions`
- [ ] ⚠️ **À FAIRE** : Tester la Cloud Function en dev avec Firebase Console ou Postman

**Tests** :
- [ ] ⚠️ **À FAIRE** : Écrire les tests unitaires (voir `TESTS_UNITAIRES.md` §4)
- [ ] ⚠️ **À FAIRE** : Écrire les tests d'intégration (voir `TESTS_INTEGRATION.md` §2)
- [ ] ⚠️ **À VÉRIFIER** : Exécuter `pnpm test --run` (functions)

---

## ✅ Étape 5 — Implémenter les Composants UI (Phase 3)

### Checklist ApprovalModalV2

- [x] Modal avec sections :
  - [x] Informations du dossier (matricule, statut, paiement)
  - [x] Entreprise (si `isEmployed === true`, avec badge existe/n'existe pas)
  - [x] Profession (si `isEmployed === true`, avec badge existe/n'existe pas)
  - [x] Type de membre (select obligatoire)
  - [x] PDF d'adhésion (upload obligatoire)
- [x] Validation (bouton désactivé si type ou PDF manquant)
- [x] Loading state pendant approbation
- [x] États d'erreur (validation, API)
- [x] Data-testid : `approval-modal-*` (~35 data-testid)

**Fichiers créés** :
- ✅ `src/domains/memberships/components/modals/ApprovalModalV2.tsx`
- ✅ `src/domains/memberships/components/modals/index.ts` (export ajouté)

**Fichiers de tests à créer** :
- [ ] ⚠️ **À FAIRE** : `src/domains/memberships/__tests__/unit/components/modals/ApprovalModalV2.test.tsx`

### Checklist MembershipRequestActionsV2

- [x] Bouton "Approuver" (si `status === 'pending'` ET `isPaid === true`)
- [x] Désactiver bouton si non payé (avec message "Paiement requis")
- [x] Data-testid : `action-approve-primary` (existe déjà)

**Fichiers modifiés** :
- ✅ `src/domains/memberships/components/actions/MembershipRequestActionsV2.tsx` (bouton existe déjà, ligne 204-225)

### Checklist Design System

- [x] Utiliser couleurs KARA (`#234D65`, `#CBB171`)
- [x] Utiliser composants shadcn UI (Dialog, Button, Select, Badge, Alert)
- [x] Responsive (mobile-first)
- [x] Animations (fade, scale, slide) selon wireframes
- [x] Accessibilité (ARIA labels, keyboard navigation)

**Tests** :
- [ ] ⚠️ **À FAIRE** : Écrire les tests unitaires (voir `TESTS_UNITAIRES.md` §5)
- [ ] ⚠️ **À VÉRIFIER** : Exécuter `pnpm test --run`
- [ ] ⚠️ **À VÉRIFIER** : Couverture 85%+ pour les composants

---

## ✅ Étape 6 — Implémenter les Hooks React Query (Phase 4)

### Checklist useApproveMembershipRequest

- [x] `useApproveMembershipRequest()` :
  - [x] Mutation React Query
  - [x] Appelle `MembershipServiceV2.approveMembershipRequest()`
  - [x] Invalide cache `membershipRequests`
  - [x] Gère loading/error/success
  - [x] Génère et télécharge PDF après succès (géré par le service)

**Fichiers créés** :
- ✅ `src/domains/memberships/hooks/useApproveMembershipRequest.ts`
- ✅ `src/domains/memberships/hooks/index.ts` (export ajouté)

**Tests** :
- [ ] ⚠️ **À FAIRE** : Écrire les tests d'intégration (voir `TESTS_INTEGRATION.md`)
- [ ] ⚠️ **À VÉRIFIER** : Exécuter `pnpm test --run`

---

## ✅ Étape 7 — Intégrer dans les Pages (Phase 5)

### Checklist Page Admin

- [x] Intégrer `ApprovalModalV2` dans la liste des demandes
- [x] Intégrer bouton "Approuver" dans `MembershipRequestActionsV2` (existe déjà)
- [ ] ⚠️ **À VÉRIFIER** : Afficher badge "Approuvé" si `status === 'approved'`
- [ ] ⚠️ **À VÉRIFIER** : Afficher `approvedBy` et `approvedAt` si disponibles

**Fichiers modifiés** :
- ✅ `src/domains/memberships/components/page/MembershipRequestsPageV2.tsx`

**Fichiers de tests E2E à créer** :
- [ ] ⚠️ **À FAIRE** : `e2e/membership-requests-v2/approve-request.spec.ts` (Tests E2E - 18 tests)

**Tests** :
- [ ] ⚠️ **À FAIRE** : Tests E2E (voir `TESTS_E2E.md`)
- [ ] ⚠️ **À VÉRIFIER** : Exécuter `pnpm test:e2e` (avec `pnpm dev` en arrière-plan)

---

## ✅ Étape 8 — Configuration Firebase (Phase 6)

### Checklist Firestore Rules

- [x] Vérifier règles pour `membership-requests` :
  - [x] Admin peut `update` avec `approvedBy` et `approvedAt`
  - [x] Validation ajoutée pour `approvedBy` et `approvedAt` (lignes 119-147)
- [x] Vérifier règles pour `users` :
  - [x] Cloud Function peut créer (service account)
  - [x] Admin peut lire
- [x] Vérifier règles pour `subscriptions` :
  - [x] Cloud Function peut créer (service account)
  - [x] Admin peut lire
- [x] Vérifier règles pour `documents` :
  - [x] Cloud Function peut créer (service account)
  - [x] Admin peut lire
- [ ] ⚠️ **À FAIRE** : Tester avec émulateurs Firebase
- [ ] ⚠️ **À FAIRE** : Déployer en dev : `firebase deploy --only firestore:rules`

**Fichiers modifiés** :
- ✅ `firestore.rules` (validation ajoutée)

### Checklist Storage Rules

- [x] Vérifier règles pour `membership-adhesion-pdfs/` :
  - [x] Admin peut upload (PDF uniquement, max 10 MB)
  - [x] Cloud Function peut lire (service account)
- [ ] ⚠️ **À FAIRE** : Tester avec émulateurs
- [ ] ⚠️ **À FAIRE** : Déployer en dev : `firebase deploy --only storage`

**Fichiers** :
- ✅ `storage.rules` (règles déjà correctes)

### Checklist Firestore Indexes

- [x] Index `status + approvedBy + approvedAt` (DESC) ajouté
- [x] Index `status + approvedAt` (DESC) ajouté
- [x] Ajouté dans `firestore.indexes.json` (lignes 637-668)
- [ ] ⚠️ **À FAIRE** : Déployer en dev : `firebase deploy --only firestore:indexes`
- [ ] ⚠️ **À FAIRE** : Attendre construction (vérifier dans Firebase Console)

**Fichiers modifiés** :
- ✅ `firestore.indexes.json` (indexes déjà présents)

---

## ⚠️ Étape 9 — Tests Locaux (OBLIGATOIRE avant commit)

**⚠️ RÈGLE CRITIQUE** : **Aucun commit/push si les tests échouent localement**

### Checklist Tests Locaux

- [ ] ⚠️ **À FAIRE** : Linter : `pnpm lint`
- [ ] ⚠️ **À FAIRE** : Type check : `pnpm typecheck`
- [ ] ⚠️ **À FAIRE** : Tests unitaires/component/integration : `pnpm test --run`
- [ ] ⚠️ **À FAIRE** : Build : `pnpm build`
- [ ] ⚠️ **À FAIRE** : Tests E2E locaux : `pnpm test:e2e` (avec `pnpm dev` en arrière-plan)

**Règle absolue** :
- ✅ **Si tous les tests passent** → Commit et push autorisés
- ❌ **Si un test échoue** → Corriger avant de commit/push

---

## 📊 Résumé Global

### ✅ Fait (Implémentation)

1. ✅ **Étape 0** : Vérification préalable
2. ✅ **Étape 1** : Branche Git créée
3. ✅ **Étape 2** : Utilitaires implémentés (`approvalUtils.ts`, `pdfGenerator.ts`)
4. ✅ **Étape 3** : Services implémentés (`MembershipServiceV2.approveMembershipRequest`)
5. ✅ **Étape 4** : Repositories vérifiés (`MembershipRepositoryV2.updateStatus` existe)
6. ✅ **Étape 3.5** : Cloud Function implémentée (`approveMembershipRequest`)
7. ✅ **Étape 5** : Composants UI implémentés (`ApprovalModalV2.tsx`, bouton dans `MembershipRequestActionsV2`)
8. ✅ **Étape 6** : Hooks React Query implémentés (`useApproveMembershipRequest`)
9. ✅ **Étape 7** : Intégration dans les pages (`MembershipRequestsPageV2.tsx`)
10. ✅ **Étape 8** : Configuration Firebase (Rules, Indexes, Storage)

### ⚠️ À Faire (Tests et Déploiement)

1. ⚠️ **Tests unitaires** :
   - [ ] Tests utilitaires (vérifier qu'ils passent)
   - [ ] Tests services (à écrire)
   - [ ] Tests Cloud Function (à écrire)
   - [ ] Tests composants (à écrire)

2. ⚠️ **Tests d'intégration** :
   - [ ] Tests services (à écrire)
   - [ ] Tests Cloud Function (à écrire)
   - [ ] Tests hooks (à écrire)

3. ⚠️ **Tests E2E** :
   - [ ] Créer `e2e/membership-requests-v2/approve-request.spec.ts`
   - [ ] Exécuter les 18 tests E2E

4. ⚠️ **Déploiement Firebase** :
   - [ ] Déployer Firestore Rules : `firebase deploy --only firestore:rules`
   - [ ] Déployer Storage Rules : `firebase deploy --only storage`
   - [ ] Déployer Firestore Indexes : `firebase deploy --only firestore:indexes`
   - [ ] Déployer Cloud Function : `firebase deploy --only functions`

5. ⚠️ **Vérifications UI** :
   - [ ] Vérifier badge "Approuvé" si `status === 'approved'`
   - [ ] Vérifier affichage `approvedBy` et `approvedAt`

6. ⚠️ **Tests locaux** :
   - [ ] `pnpm lint`
   - [ ] `pnpm typecheck`
   - [ ] `pnpm test --run`
   - [ ] `pnpm build`
   - [ ] `pnpm test:e2e`

---

## 🎯 Prochaines Actions

1. **Écrire les tests manquants** (priorité haute)
2. **Exécuter les tests locaux** (priorité haute)
3. **Déployer Firebase** (règles, indexes, Cloud Function) (priorité moyenne)
4. **Vérifier l'affichage UI** (badge, `approvedBy`, `approvedAt`) (priorité moyenne)
5. **Tests E2E** (priorité haute)

---

## 📝 Notes

- **Tous les fichiers de code sont implémentés** ✅
- **Les tests doivent être écrits et exécutés** ⚠️
- **Le déploiement Firebase doit être fait** ⚠️
- **Les vérifications UI doivent être faites** ⚠️

---

**Dernière mise à jour** : 2025-01-XX
