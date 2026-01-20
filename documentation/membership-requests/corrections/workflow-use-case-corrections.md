# Workflow - Use Case "Demander des Corrections"

> Workflow d'implémentation spécifique pour la fonctionnalité **"Demander des Corrections"** (Membership Requests)
> 
> Ce workflow suit la structure générale de `documentation/general/WORKFLOW.md` mais est adapté spécifiquement à cette fonctionnalité.

---

## 📋 Vue d'ensemble

**Use Case** : UC-MEM-006 - Demander des corrections à une demande d'adhésion

**Acteurs** :
- **Admin KARA** : Demande des corrections
- **Demandeur** : Reçoit les corrections et modifie sa demande

**Scope** :
- Demander des corrections (Admin)
- Accéder et modifier les corrections (Demandeur)
- Gérer le code de sécurité et l'expiration
- Envoyer les corrections via WhatsApp

---

## 📚 Documentation de Référence

### Documentation UML
- **Use Cases** : `documentation/uml/use-cases/USE_CASES_COMPLETS.puml` (UC-MEM-006)
- **Diagrammes de Classes** : `documentation/uml/classes/CLASSES_MEMBERSHIP.puml` (classes Corrections)

### Documentation Fonctionnelle
- **Diagrammes d'Activité** :
  - `documentation/membership-requests/corrections/activite/DIAGRAMMES_ACTIVITE_CORRECTIONS.puml` (Admin)
  - `documentation/membership-requests/corrections/activite/DIAGRAMMES_ACTIVITE_DEMANDEUR_CORRECTIONS.puml` (Demandeur)
  - `documentation/membership-requests/corrections/activite/DIAGRAMMES_ACTIVITE_FLUX_COMPLET_CORRECTIONS.puml` (Flux complet)

- **Diagrammes de Séquence** :
  - `documentation/membership-requests/corrections/sequence/SEQ_Demander_Corrections.puml` (Admin - Demander corrections)
  - `documentation/membership-requests/corrections/sequence/SEQ_Renouveler_Code.puml` (Admin - Régénérer code)
  - `documentation/membership-requests/corrections/sequence/DIAGRAMMES_SEQUENCE_CORRECTIONS.puml` (Contient : SEQ_Demandeur_Acceder_Corrections, SEQ_Admin_Generer_Lien_Correction)

### Documentation UI/UX
- **Wireframes** :
  - `documentation/membership-requests/corrections/wireframes/ADMIN_WIREFRAME.md` (Page admin)
  - `documentation/membership-requests/corrections/wireframes/DEMANDEUR_WIREFRAME.md` (Page demandeur)
  - `documentation/membership-requests/corrections/wireframes/MODAL_WHATSAPP.md` (Modal WhatsApp)
  - `documentation/membership-requests/corrections/wireframes/MODAL_RENOUVELLER_CODE.md` (Modal régénération)
  - `documentation/membership-requests/corrections/wireframes/COMPOSANTS_UI.md` (Composants UI)
  - `documentation/membership-requests/corrections/wireframes/INTERACTIONS_DETAILLEES.md` (Interactions)
  - `documentation/membership-requests/corrections/wireframes/FLOW_VISUEL.md` (Flow visuel)
  - `documentation/membership-requests/corrections/wireframes/RESUME_CORRECTIONS.md` (Résumé modifications)

### Documentation Tests
- **Tests** :
  - `documentation/membership-requests/corrections/test/README.md` (Vue d'ensemble)
  - `documentation/membership-requests/corrections/test/DATA_TESTID.md` (57 data-testid)
  - `documentation/membership-requests/corrections/test/TESTS_UNITAIRES.md` (96 tests unitaires)
  - `documentation/membership-requests/corrections/test/TESTS_INTEGRATION.md` (~20 tests intégration)
  - `documentation/membership-requests/corrections/test/TESTS_E2E.md` (17 tests E2E)
  - `documentation/membership-requests/corrections/test/COUVERTURE_80_POURCENT.md` (Plan couverture)
  - `documentation/membership-requests/corrections/test/HELPERS_TEST.md` (Helpers et fixtures)

### Documentation Firebase
- **Firebase** :
  - `documentation/membership-requests/corrections/firebase/README.md` (Vue d'ensemble)
  - `documentation/membership-requests/corrections/firebase/FIRESTORE_RULES.md` (Règles Firestore)
  - `documentation/membership-requests/corrections/firebase/STORAGE_RULES.md` (Règles Storage)
  - `documentation/membership-requests/corrections/firebase/FIRESTORE_INDEXES.md` (Index Firestore)
  - `documentation/membership-requests/corrections/firebase/firestore.indexes.json` (Configuration indexes)

### Documentation Cloud Functions
- **Cloud Functions** :
  - `documentation/membership-requests/corrections/functions/README.md` ⭐ (Cas obligatoires nécessitant des Cloud Functions)
  - `documentation/membership-requests/corrections/CHANGELOG_CLOUD_FUNCTIONS.md` ⭐ (Changelog modifications Cloud Functions)

### Documentation Notifications
- **Notifications** :
  - `documentation/membership-requests/corrections/notification/README.md` ⭐ (5 types de notifications identifiés)
  - `documentation/membership-requests/corrections/notification/COMPATIBILITE_UML.md` ⭐ (Compatibilité avec diagramme de classes UML)

---

## 🎯 Architecture V2 - Domaines

### Structure du Code

```
src/
├── domains/
│   └── memberships/                    # Domaine Membership
│       ├── entities/                   # Types/Interfaces
│       │   └── MembershipRequest.ts    # Type avec champs corrections
│       │
│       ├── repositories/                # Accès données
│       │   └── MembershipRepositoryV2.ts
│       │       - updateStatus()         # Mise à jour statut 'under_review'
│       │       - renewSecurityCode()    # Régénération code
│       │
│       ├── services/                    # Logique métier
│       │   └── MembershipServiceV2.ts
│       │       - requestCorrections()   # Demander corrections
│       │       - renewSecurityCode()    # Régénérer code
│       │
│       ├── hooks/                       # Hooks React Query
│       │   └── useMembershipActionsV2.ts
│       │       - useRequestCorrections()
│       │       - useRenewSecurityCode()
│       │       - useCopyCorrectionLink()
│       │       - useSendWhatsApp()
│       │
│       └── components/                  # Composants UI
│           ├── modals/
│           │   ├── CorrectionsModalV2.tsx        # Modal demander corrections
│           │   ├── SendWhatsAppModalV2.tsx        # Modal WhatsApp
│           │   └── RenewSecurityCodeModalV2.tsx  # Modal régénération
│           │
│           ├── shared/
│           │   └── CorrectionsBlockV2.tsx         # Bloc "Corrections demandées"
│           │
│           └── actions/
│               └── MembershipRequestActionsV2.tsx # Dropdown actions
│
├── domains/
│   └── auth/
│       └── registration/                # Domaine Registration
│           ├── services/
│           │   └── RegistrationService.ts
│           │       - verifySecurityCode()         # Vérifier code
│           │       - loadRegistrationForCorrection() # Charger données
│           │       - updateRegistration()          # Soumettre corrections
│           │
│           └── components/
│               ├── SecurityCodeFormV2.tsx          # Formulaire code
│               └── CorrectionBannerV2.tsx         # Banner corrections
│
└── shared/
    └── utils/                            # Utilitaires partagés
        ├── securityCodeUtils.ts          # Génération code, expiration
        ├── whatsAppUrlUtils.ts           # Génération URL WhatsApp
        └── correctionUtils.ts            # Formatage, liens

├── src/domains/memberships/__tests__/    # Tests domaine Membership
│   ├── unit/
│   │   ├── utils/
│   │   │   ├── securityCode.test.ts      # Tests securityCodeUtils
│   │   │   ├── whatsappUrl.test.ts       # Tests whatsAppUrlUtils
│   │   │   └── correctionUtils.test.ts   # Tests correctionUtils (nouveau)
│   │   ├── services/
│   │   │   └── MembershipServiceV2.test.ts  # Ajouter tests requestCorrections, renewSecurityCode
│   │   ├── repositories/
│   │   │   └── MembershipRepositoryV2.test.ts  # Ajouter tests updateStatus, renewSecurityCode
│   │   └── components/
│   │       ├── modals/
│   │       │   ├── CorrectionsModalV2.test.tsx        # Nouveau
│   │       │   ├── SendWhatsAppModalV2.test.tsx        # Nouveau
│   │       │   └── RenewSecurityCodeModalV2.test.tsx  # Nouveau
│   │       └── shared/
│   │           └── CorrectionsBlockV2.test.tsx         # Nouveau
│   │
│   └── integration/
│       ├── request-corrections.integration.test.tsx     # Nouveau
│       ├── renew-security-code.integration.test.tsx     # Nouveau
│       └── copy-correction-link.integration.test.tsx   # Nouveau

├── src/domains/auth/registration/__tests__/  # Tests domaine Registration
│   ├── unit/
│   │   ├── services/
│   │   │   └── RegistrationService.test.ts  # Ajouter tests verifySecurityCode, loadRegistrationForCorrection, updateRegistration
│   │   ├── repositories/
│   │   │   └── RegistrationRepository.test.ts  # Ajouter tests verifySecurityCode, update
│   │   └── components/
│   │       ├── SecurityCodeFormV2.test.tsx     # Nouveau
│   │       └── CorrectionBannerV2.test.tsx     # Nouveau (ou dans memberships si partagé)
│   │
│   └── integration/
│       ├── verify-security-code.integration.test.tsx    # Nouveau
│       └── submit-corrections.integration.test.tsx     # Nouveau

└── e2e/                                  # Tests E2E Playwright
    ├── membership-requests-v2/
    │   └── request-corrections.spec.ts   # Nouveau - Tests E2E admin (10 tests)
    └── registration/
        └── corrections.spec.ts           # Nouveau - Tests E2E demandeur (7 tests)
        # Total : 17 tests E2E
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
- `documentation/membership-requests/corrections/` — Documentation complète

---

### Étape 1 — Créer la Branche Git

Depuis `develop` :
```bash
git checkout develop
git pull
git checkout -b feat/membership-request-corrections
```

**Convention** : `feat/membership-request-corrections`

---

### Étape 2 — Implémenter les Utilitaires (Phase 1)

**Objectif** : Créer les fonctions utilitaires de base

**Fichiers à créer/modifier** :
- `src/domains/memberships/utils/securityCode.ts` (existe déjà, vérifier/ajouter fonctions manquantes)
- `src/domains/memberships/utils/whatsappUrl.ts` (existe déjà, vérifier/ajouter fonctions manquantes)
- `src/shared/utils/correctionUtils.ts` (nouveau - formatage, liens, génération message WhatsApp)

**Fichiers de tests à créer/modifier** :
- `src/domains/memberships/__tests__/unit/utils/correctionUtils.test.ts` (nouveau)
- `src/domains/memberships/__tests__/unit/utils/securityCode.test.ts` (compléter si manquant)
- `src/domains/memberships/__tests__/unit/utils/whatsappUrl.test.ts` (compléter si manquant)

**Références** :
- `documentation/membership-requests/corrections/test/TESTS_UNITAIRES.md` §1 (Tests utilitaires)
- `documentation/membership-requests/corrections/activite/DIAGRAMMES_ACTIVITE_CORRECTIONS.puml` (Logique génération code)

**Checklist** :
- [ ] `generateSecurityCode()` : Génère code 6 chiffres (100000-999999)
- [ ] `calculateCodeExpiry(hours)` : Calcule expiration (48h par défaut)
- [ ] `isSecurityCodeValid(info)` : Valide code (non utilisé, non expiré)
- [ ] `normalizePhoneNumber(phone)` : Normalise numéro téléphone
- [ ] `generateWhatsAppUrl(phone, message)` : Génère URL WhatsApp
- [ ] `formatSecurityCode(code)` : Formate code (AB12-CD34)
- [ ] `getTimeRemaining(expiry)` : Calcule temps restant (2j 13h)
- [ ] `generateCorrectionLink(requestId)` : Génère lien `/register?requestId=XXX` (sans code)
- [ ] `generateWhatsAppMessage(params)` : Génère message avec lien + code + expiration

**Tests** :
- [ ] Écrire les tests unitaires (voir `TESTS_UNITAIRES.md` §1)
- [ ] Exécuter `pnpm test --run` (tous les tests doivent passer)
- [ ] Couverture 100% pour les utilitaires

---

### Étape 3 — Implémenter les Services (Phase 2)

**Objectif** : Créer la logique métier

**Fichiers à modifier/créer** :
- `src/domains/memberships/services/MembershipServiceV2.ts`
- `src/domains/auth/registration/services/RegistrationService.ts`

**Références** :
- `documentation/membership-requests/corrections/sequence/SEQ_Demander_Corrections.puml` (Flow admin)
- `documentation/membership-requests/corrections/sequence/DIAGRAMMES_SEQUENCE_CORRECTIONS.puml` (Flow demandeur - SEQ_Demandeur_Acceder_Corrections)
- `documentation/membership-requests/corrections/test/TESTS_UNITAIRES.md` §3 (Tests services)

**Checklist MembershipServiceV2** :
- [ ] `requestCorrections(params)` :
  - [ ] Valide corrections non vide
  - [ ] Récupère demande via repository
  - [ ] Génère code de sécurité (6 chiffres)
  - [ ] Calcule expiration (48h)
  - [ ] Met à jour statut 'under_review'
  - [ ] Génère URL WhatsApp si numéro disponible
  - [ ] **Créer notification NOTIF-CORR-001** (Corrections demandées) - Autres admins
  - [ ] Retourne `{ securityCode, securityCodeExpiry, whatsAppUrl? }`
- [ ] `renewSecurityCode(requestId, adminId)` :
  - [ ] Vérifie demande en 'under_review'
  - [ ] Génère nouveau code
  - [ ] Calcule nouvelle expiration (48h)
  - [ ] Met à jour dans Firestore
  - [ ] **Créer notification NOTIF-CORR-005** (Code régénéré) - Autres admins
  - [ ] Retourne `{ success, newCode }`

**Checklist RegistrationService** :
- [ ] `verifySecurityCode(requestId, code)` :
  - [ ] Valide format code (6 chiffres)
  - [ ] **Appelle Cloud Function `verifySecurityCode`** (transaction atomique)
  - [ ] Retourne `{ isValid: boolean, reason?: string, requestData?: {...} }`
- [ ] `loadRegistrationForCorrection(requestId)` :
  - [ ] Charge demande via repository
  - [ ] Vérifie statut 'under_review'
  - [ ] Convertit en `RegisterFormData`
  - [ ] Retourne données pré-remplies
- [ ] `updateRegistration(requestId, data, code)` :
  - [ ] **Appelle Cloud Function `submitCorrections`** (transaction atomique)
  - [ ] Cloud Function gère :
    - [ ] Vérification code (correspond, non utilisé, non expiré)
    - [ ] Mise à jour données dans Firestore
    - [ ] Marque `securityCodeUsed = true`
    - [ ] Remet statut à 'pending'
    - [ ] Nettoie champs corrections (reviewNote, securityCode, securityCodeExpiry)

**Tests** :
- [ ] Écrire les tests unitaires (voir `TESTS_UNITAIRES.md` §3)
- [ ] Écrire les tests d'intégration (voir `TESTS_INTEGRATION.md` §1, §2)
- [ ] Exécuter `pnpm test --run`
- [ ] Couverture 85%+ pour les services

---

### Étape 4 — Implémenter les Repositories (Phase 2.5)

**Objectif** : Créer l'accès aux données Firestore

**Fichiers à modifier** :
- `src/domains/memberships/repositories/MembershipRepositoryV2.ts`
- `src/domains/auth/registration/repositories/RegistrationRepository.ts`

**Références** :
- `documentation/membership-requests/corrections/firebase/FIRESTORE_RULES.md` (Règles sécurité)
- `documentation/membership-requests/corrections/firebase/FIRESTORE_INDEXES.md` (Index nécessaires)

**Checklist MembershipRepositoryV2** :
- [ ] `updateStatus(id, status, data)` :
  - [ ] Met à jour statut + champs corrections
  - [ ] Utilise `serverTimestamp()` pour `updatedAt`
  - [ ] Gère les erreurs Firestore
- [ ] `renewSecurityCode(requestId)` :
  - [ ] Génère nouveau code
  - [ ] Calcule nouvelle expiration (48h)
  - [ ] Met à jour dans Firestore
  - [ ] Retourne `{ success, newCode }`

**Checklist RegistrationRepository** :
- [ ] `verifySecurityCode(requestId, code)` :
  - [ ] ⚠️ **DÉPRÉCIÉ** : Utiliser Cloud Function `verifySecurityCode` à la place
  - [ ] (Méthode peut rester pour compatibilité mais ne sera plus utilisée)
- [ ] `markSecurityCodeAsUsed(requestId)` :
  - [ ] ⚠️ **DÉPRÉCIÉ** : Géré par Cloud Function `submitCorrections`
  - [ ] (Méthode peut rester pour compatibilité mais ne sera plus utilisée)
- [ ] `update(id, data)` :
  - [ ] ⚠️ **DÉPRÉCIÉ pour corrections** : Utiliser Cloud Function `submitCorrections` à la place
  - [ ] (Méthode reste pour autres cas d'usage non liés aux corrections)

**Tests** :
- [ ] Écrire les tests unitaires (mocks Firestore)
- [ ] Exécuter `pnpm test --run`
- [ ] Couverture 85%+ pour les repositories

---

### Étape 3.5 — Implémenter les Cloud Functions (Phase 2.3)

**Objectif** : Déplacer la logique critique de vérification et de soumission du code de sécurité vers des Cloud Functions pour des raisons de sécurité et d'atomicité.

**Fichiers à créer/modifier** :
- `functions/src/membership-requests/verifySecurityCode.ts` (nouveau)
- `functions/src/membership-requests/submitCorrections.ts` (nouveau)
- `functions/src/index.ts` (exporter les nouvelles fonctions)

**Références** :
- `documentation/membership-requests/corrections/functions/README.md` (Documentation détaillée des Cloud Functions)
- `documentation/membership-requests/corrections/sequence/DIAGRAMMES_SEQUENCE_CORRECTIONS.puml` (Interactions avec les CF)
- `documentation/membership-requests/corrections/activite/DIAGRAMMES_ACTIVITE_DEMANDEUR_CORRECTIONS.puml` (Logique CF)

**Checklist Cloud Functions** :
- [ ] `verifySecurityCode` (Callable Function) :
  - [ ] Prend `requestId` et `code`
  - [ ] Effectue une transaction atomique pour :
    - [ ] Récupérer la demande
    - [ ] Valider le format du code
    - [ ] Vérifier que le code correspond
    - [ ] Vérifier que le code n'est pas `securityCodeUsed`
    - [ ] Vérifier que le code n'est pas expiré
    - [ ] Vérifier que le statut est `under_review`
    - [ ] Mettre à jour `securityCodeVerifiedAt`
  - [ ] Retourne `{ isValid: boolean, reason?: string, requestData?: any }`
- [ ] `submitCorrections` (Callable Function) :
  - [ ] Prend `requestId`, `securityCode` et `formData`
  - [ ] Effectue une transaction atomique pour :
    - [ ] Récupérer la demande
    - [ ] Re-valider le `securityCode` (non utilisé, non expiré)
    - [ ] Fusionner `formData` avec les données existantes
    - [ ] Mettre à jour `status` à `'pending'`
    - [ ] Mettre `securityCodeUsed` à `true`
    - [ ] Nettoyer `reviewNote`, `securityCode`, `securityCodeExpiry`
    - [ ] **Créer notification NOTIF-CORR-002** (Corrections soumises)
  - [ ] Retourne `{ success: boolean }`
- [ ] `checkExpiredSecurityCodes` (Scheduled Function, optionnel) :
  - [ ] Cron : `every 1 hours` (ou `every 24 hours`)
  - [ ] Recherche codes expirés (`securityCodeExpiry < now` ET `securityCodeUsed = false` ET `status = 'under_review'`)
  - [ ] **Créer notification NOTIF-CORR-003** (Code expiré)
  - [ ] Recherche codes expirant < 24h
  - [ ] **Créer notification NOTIF-CORR-004** (Code expirant bientôt) - Une seule fois par code

**Déploiement** :
- [ ] Déployer les Cloud Functions : `firebase deploy --only functions`
- [ ] Tester les Cloud Functions en dev avec Firebase Console ou Postman

---

### Étape 5 — Implémenter les Composants UI (Phase 3)

**Objectif** : Créer l'interface utilisateur

**Références** :
- `documentation/membership-requests/corrections/wireframes/ADMIN_WIREFRAME.md` (UI admin)
- `documentation/membership-requests/corrections/wireframes/DEMANDEUR_WIREFRAME.md` (UI demandeur)
- `documentation/membership-requests/corrections/test/DATA_TESTID.md` (57 data-testid)

**Fichiers à créer/modifier** :

#### 5.1 Composants Admin

**`src/domains/memberships/components/modals/CorrectionsModalV2.tsx`**

**Fichiers de tests à créer** :
- `src/domains/memberships/__tests__/unit/components/modals/CorrectionsModalV2.test.tsx`
- [ ] Modal simplifié (textarea uniquement, pas de WhatsApp)
- [ ] Compteur de corrections en temps réel
- [ ] Validation (bouton désactivé si vide)
- [ ] Loading state
- [ ] Data-testid : `corrections-modal-*` (6 data-testid)

**`src/domains/memberships/components/modals/SendWhatsAppModalV2.tsx`**
- [ ] Sélection numéro (dropdown si plusieurs)
- [ ] Affichage numéro unique si un seul
- [ ] Génération URL WhatsApp
- [ ] Ouverture dans nouvel onglet
- [ ] Data-testid : `whatsapp-modal-*` (8 data-testid)

**Fichiers de tests à créer** :
- `src/domains/memberships/__tests__/unit/components/modals/SendWhatsAppModalV2.test.tsx`

**`src/domains/memberships/components/modals/RenewSecurityCodeModalV2.tsx`**
- [ ] Avertissement (ancien code invalidé)
- [ ] Affichage code actuel
- [ ] Checkbox de confirmation
- [ ] Loading state
- [ ] Data-testid : `renew-code-modal-*` (10 data-testid)

**`src/domains/memberships/components/shared/CorrectionsBlockV2.tsx`**
- [ ] Affichage max 3 corrections + "Voir plus"
- [ ] Format code AB12-CD34
- [ ] Date expiration formatée
- [ ] Temps restant (2j 13h)
- [ ] "Demandé par" avec matricule
- [ ] Boutons "Copier lien" et "Envoyer WhatsApp" (conditionnels)
- [ ] Data-testid : `corrections-block-*` (13 data-testid)

**Fichiers de tests à créer** :
- `src/domains/memberships/__tests__/unit/components/modals/RenewSecurityCodeModalV2.test.tsx`
- `src/domains/memberships/__tests__/unit/components/shared/CorrectionsBlockV2.test.tsx`

**`src/domains/memberships/components/actions/MembershipRequestActionsV2.tsx`**
- [ ] Ajouter "Demander des corrections" dans dropdown (si `status === 'pending'`)
- [ ] Ajouter "Copier lien", "Envoyer WhatsApp", "Régénérer code" (si `status === 'under_review'`)
- [ ] Data-testid : `request-corrections-menu`, `copy-correction-link-menu`, etc. (5 data-testid)

#### 5.2 Composants Demandeur

**`src/domains/auth/registration/components/SecurityCodeFormV2.tsx`**
- [ ] 6 inputs pour code (auto-advance)
- [ ] Validation format (6 chiffres)
- [ ] Bouton "Vérifier le code" (désactivé si incomplet)
- [ ] Gestion erreurs (code incorrect, expiré, utilisé)
- [ ] Loading state
- [ ] Data-testid : `security-code-form-*` (9 data-testid)

**Fichiers de tests à créer** :
- `src/domains/auth/registration/__tests__/unit/components/SecurityCodeFormV2.test.tsx`

**`src/domains/auth/registration/components/CorrectionBannerV2.tsx`**
- [ ] Banner avec corrections demandées
- [ ] Liste des corrections
- [ ] Data-testid : `correction-banner-*` (4 data-testid)

**`src/domains/auth/registration/components/RegistrationFormV2.tsx`** (modification)
- [ ] Détection mode correction (via URL `?requestId=XXX`)
- [ ] Affichage banner + formulaire code
- [ ] Chargement données pré-remplies après vérification code
- [ ] Bouton "Soumettre les corrections" (au lieu de "S'inscrire")
- [ ] Data-testid : `registration-form-submit-corrections-button` (1 data-testid)

**Checklist Design System** :
- [ ] Utiliser couleurs KARA (`kara-primary-dark`, `kara-primary-light`)
- [ ] Utiliser composants shadcn UI (Dialog, Button, Textarea, Select, Badge, Alert)
- [ ] Responsive (mobile-first)
- [ ] Animations (fade, scale, slide) selon wireframes
- [ ] Accessibilité (ARIA labels, keyboard navigation)

**Fichiers de tests à créer** :
- `src/domains/auth/registration/__tests__/unit/components/CorrectionBannerV2.test.tsx` (ou dans memberships si partagé)

**Tests** :
- [ ] Écrire les tests unitaires (voir `TESTS_UNITAIRES.md` §2)
- [ ] Exécuter `pnpm test --run`
- [ ] Couverture 85%+ pour les composants

**Référence tests** : `documentation/membership-requests/corrections/test/TESTS_UNITAIRES.md` §2 (Tests composants)

---

### Étape 6 — Implémenter les Hooks React Query (Phase 4)

**Objectif** : Créer l'orchestration avec React Query

**Fichiers à créer/modifier** :
- `src/domains/memberships/hooks/useMembershipActionsV2.ts`
- `src/domains/auth/registration/hooks/useRegistration.ts` (modification)

**Checklist useMembershipActionsV2** :
- [ ] `useRequestCorrections()` :
  - [ ] Mutation React Query
  - [ ] Appelle `MembershipServiceV2.requestCorrections()`
  - [ ] Invalide cache `membershipRequests`
  - [ ] Gère loading/error/success
- [ ] `useRenewSecurityCode()` :
  - [ ] Mutation React Query
  - [ ] Appelle `MembershipServiceV2.renewSecurityCode()`
  - [ ] Invalide cache `membershipRequests`
- [ ] `useCopyCorrectionLink()` :
  - [ ] Génère lien via `generateCorrectionLink()`
  - [ ] Copie dans presse-papier
  - [ ] Affiche toast "Lien copié"
- [ ] `useSendWhatsApp()` :
  - [ ] Génère message via `generateWhatsAppMessage()`
  - [ ] Génère URL via `generateWhatsAppUrl()`
  - [ ] Ouvre dans nouvel onglet

**Checklist useRegistration** :
- [ ] Détection `requestId` dans URL
- [ ] Chargement demande si `requestId` présent
- [ ] Vérification code de sécurité
- [ ] Chargement données pour correction
- [ ] Soumission corrections

**Tests** :
- [ ] Écrire les tests d'intégration (voir `TESTS_INTEGRATION.md`)
- [ ] Exécuter `pnpm test --run`

---

### Étape 7 — Intégrer dans les Pages (Phase 5)

**Objectif** : Intégrer les composants dans les pages existantes

**Fichiers à modifier** :
- `src/app/(admin)/membership-requests/page.tsx` (ou composant liste)
- `src/app/(public)/register/page.tsx`

**Checklist Page Admin** :
- [ ] Intégrer `CorrectionsBlockV2` dans la liste des demandes
- [ ] Afficher badge "En correction" si `status === 'under_review'`
- [ ] Intégrer modals (CorrectionsModalV2, SendWhatsAppModalV2, RenewSecurityCodeModalV2)
- [ ] Intégrer actions dans `MembershipRequestActionsV2`

**Checklist Page Register** :
- [ ] Détecter `requestId` dans URL (`?requestId=XXX`)
- [ ] Afficher `CorrectionBannerV2` si corrections demandées
- [ ] Afficher `SecurityCodeFormV2` si code requis
- [ ] Charger données pré-remplies après vérification code
- [ ] Afficher bouton "Soumettre les corrections" en mode correction

**Fichiers de tests E2E à créer** :
- `e2e/membership-requests-v2/request-corrections.spec.ts` (Tests E2E admin - 10 tests)
- `e2e/registration/corrections.spec.ts` (Tests E2E demandeur - 7 tests)

**Tests** :
- [ ] Tests E2E (voir `TESTS_E2E.md`)
- [ ] Exécuter `pnpm test:e2e` (avec `pnpm dev` en arrière-plan)

**Référence tests** : `documentation/membership-requests/corrections/test/TESTS_E2E.md` (17 tests E2E)

---

### Étape 8 — Configuration Firebase (Phase 6)

**Objectif** : Configurer Firestore Rules, Storage Rules, et Indexes

**Références** :
- `documentation/membership-requests/corrections/firebase/FIRESTORE_RULES.md`
- `documentation/membership-requests/corrections/firebase/STORAGE_RULES.md`
- `documentation/membership-requests/corrections/firebase/FIRESTORE_INDEXES.md`

**Checklist Firestore Rules** :
- [ ] Ajouter règles pour `membership-requests` :
  - [ ] `read` : Admin toujours, demandeur si `under_review` + code valide
  - [ ] `update` : Admin toujours, demandeur si `under_review` + code valide + marque code utilisé
- [ ] Tester avec émulateurs Firebase
- [ ] Déployer en dev : `firebase deploy --only firestore:rules`

**Checklist Storage Rules** :
- [ ] Vérifier règles existantes (pas de changement nécessaire normalement)
- [ ] Tester avec émulateurs
- [ ] Déployer en dev : `firebase deploy --only storage`

**Checklist Firestore Indexes** :
- [ ] Ajouter index `status + createdAt` (si pas déjà présent)
- [ ] Ajouter index `isPaid + status + createdAt` (si pas déjà présent)
- [ ] Ajouter index `securityCode + securityCodeUsed` (nouveau)
- [ ] Ajouter dans `firestore.indexes.json` :
  ```json
  {
    "collectionGroup": "membership-requests",
    "queryScope": "COLLECTION",
    "fields": [
      { "fieldPath": "securityCode", "order": "ASCENDING" },
      { "fieldPath": "securityCodeUsed", "order": "ASCENDING" }
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
- `documentation/membership-requests/corrections/test/TESTS_UNITAIRES.md` (96 tests)
- `documentation/membership-requests/corrections/test/TESTS_INTEGRATION.md` (~20 tests)
- `documentation/membership-requests/corrections/test/TESTS_E2E.md` (17 tests)
- `documentation/membership-requests/corrections/test/COUVERTURE_80_POURCENT.md` (Objectif 80%+)

---

### Étape 10 — Commits & Push

**Uniquement si tous les tests locaux passent** :

```bash
git add .
git commit -m "feat(membership): add request corrections functionality"
git push -u origin feat/membership-request-corrections
```

**Convention de commits** :
- `feat(membership): add request corrections functionality`
- `feat(membership): add security code generation utilities`
- `feat(membership): add corrections modal component`
- `feat(membership): add corrections E2E tests`
- `feat(firestore): add security code indexes`

---

### Étape 11 — Pull Request vers `develop`

**Checklist PR** :
- [ ] **Use case documenté** dans `documentation/uml/use-cases/USE_CASES_COMPLETS.puml`
- [ ] **Diagramme de classes** à jour dans `documentation/uml/classes/CLASSES_MEMBERSHIP.puml`
- [ ] **Documentation complète** : Tous les fichiers dans `documentation/membership-requests/corrections/`
- [ ] **Code** : Respect de l'architecture (Repositories → Services → Hooks → Components)
- [ ] **Design System** : Utilise couleurs KARA, composants shadcn
- [ ] **Responsive** : Fonctionne sur mobile, tablette, desktop
- [ ] **Validation** : Schemas Zod pour formulaires
- [ ] **Rules** : Firestore/Storage rules à jour
- [ ] **Indexes** : `firestore.indexes.json` à jour (index `securityCode + securityCodeUsed`)
- [ ] **Tests locaux** : Tous les tests passent (`pnpm lint`, `pnpm typecheck`, `pnpm test --run`, `pnpm build`)
- [ ] **Tests** : Unit + component + integration (96 tests unitaires, ~20 intégration)
- [ ] **Tests E2E locaux** : Tests E2E passent avec Firebase Cloud (dev) (17 tests)
- [ ] **CI** : Pipeline vert (incluant tests E2E)
- [ ] **Data-testid** : Tous les 57 data-testid ajoutés

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
     - Firestore Indexes (index `securityCode + securityCodeUsed` construit)
     - Storage Rules

---

### Étape 13 — Validation Préprod (Smoke Test)

**Sur préprod** :
- [ ] Vérifier que la liste des demandes s'affiche
- [ ] Tester "Demander des corrections" (dropdown → modal → soumission)
- [ ] Vérifier badge "En correction" et bloc "Corrections demandées"
- [ ] Tester "Copier lien", "Envoyer WhatsApp", "Régénérer code"
- [ ] Tester accès demandeur (`/register?requestId=XXX`)
- [ ] Tester vérification code et soumission corrections

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
- [ ] **P0-CORR-01** : Demander corrections (flow complet)
- [ ] **P0-CORR-02** : Dropdown conditionnel selon statut
- [ ] **P0-CORR-04** : Copier lien (format correct, sans code)
- [ ] **P0-CORR-05** : WhatsApp conditionnel
- [ ] **P0-CORR-06B** : Régénérer code
- [ ] **P0-CORR-07** : Accéder via URL (demandeur)
- [ ] **P0-CORR-10** : Vérifier code et charger formulaire
- [ ] **P0-CORR-13** : Soumettre corrections

**Règle absolue** :
- ✅ **Si tous les tests E2E passent en préprod** → Feature prête pour production
- ❌ **Si un test échoue en préprod** → Corriger, re-déployer, re-tester

**Référence** :
- `documentation/membership-requests/corrections/test/TESTS_E2E.md` (17 tests)

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

- [ ] **Use case documenté** dans `documentation/uml/use-cases/USE_CASES_COMPLETS.puml` (UC-MEM-006)
- [ ] **Diagramme de classes** à jour dans `documentation/uml/classes/CLASSES_MEMBERSHIP.puml`
- [ ] **Documentation complète** : Tous les fichiers dans `documentation/membership-requests/corrections/`
- [ ] **Code** : Respect de l'architecture V2 (Repositories → Services → Hooks → Components)
- [ ] **Design System** : Utilise couleurs KARA, composants shadcn
- [ ] **Responsive** : Fonctionne sur mobile, tablette, desktop
- [ ] **Validation** : Schemas Zod pour formulaires
- [ ] **Rules** : Firestore/Storage rules à jour
- [ ] **Indexes** : `firestore.indexes.json` à jour (index `securityCode + securityCodeUsed`)
  - [ ] Index ajouté dans `firestore.indexes.json`
  - [ ] Index testé en dev et déployé
  - [ ] Vérification que l'index est construit avant merge
- [ ] **Tests locaux** : Tous les tests passent (`pnpm lint`, `pnpm typecheck`, `pnpm test --run`, `pnpm build`)
- [ ] **Tests** : Unit + component + integration (96 tests unitaires, ~20 intégration, couverture 80%+)
- [ ] **Tests E2E locaux** : Tests E2E passent pour les flows critiques avec Firebase Cloud (dev) (17 tests)
- [ ] **CI** : Pipeline vert (incluant tests E2E)
- [ ] **Préprod** : Test manuel rapide (smoke)
- [ ] **Tests E2E préprod** : Tests E2E passent en préprod avec la vraie base Firebase (OBLIGATOIRE)
- [ ] **Data-testid** : Tous les 57 data-testid ajoutés dans les composants
- [ ] **Annuaire** : Feature marquée comme "✅ Réalisée" dans l'annuaire

---

## 📊 Checklist Globale d'Implémentation

### Phase 1 : Utilitaires
- [ ] `securityCodeUtils.ts` (3 fonctions)
- [ ] `whatsAppUrlUtils.ts` (2 fonctions)
- [ ] `correctionUtils.ts` (4 fonctions)
- [ ] Tests unitaires (24 tests, couverture 100%)

### Phase 2 : Services & Repositories
- [ ] `MembershipServiceV2.requestCorrections()`
- [ ] `MembershipServiceV2.renewSecurityCode()`
- [ ] `RegistrationService.verifySecurityCode()`
- [ ] `RegistrationService.loadRegistrationForCorrection()`
- [ ] `RegistrationService.updateRegistration()`
- [ ] `MembershipRepositoryV2.updateStatus()`
- [ ] `MembershipRepositoryV2.renewSecurityCode()`
- [ ] `RegistrationRepository.verifySecurityCode()`
- [ ] `RegistrationRepository.update()`
- [ ] Tests unitaires (27 tests, couverture 85%+)
- [ ] Tests d'intégration (~20 tests)

### Phase 3 : Composants UI
- [ ] `CorrectionsModalV2.tsx` (6 data-testid)
- [ ] `SendWhatsAppModalV2.tsx` (8 data-testid)
- [ ] `RenewSecurityCodeModalV2.tsx` (10 data-testid)
- [ ] `CorrectionsBlockV2.tsx` (13 data-testid)
- [ ] `SecurityCodeFormV2.tsx` (9 data-testid)
- [ ] `CorrectionBannerV2.tsx` (4 data-testid)
- [ ] `MembershipRequestActionsV2.tsx` (modification, 5 data-testid)
- [ ] `RegistrationFormV2.tsx` (modification, 1 data-testid)
- [ ] Tests unitaires (45 tests, couverture 85%+)

### Phase 4 : Hooks React Query
- [ ] `useRequestCorrections()`
- [ ] `useRenewSecurityCode()`
- [ ] `useCopyCorrectionLink()`
- [ ] `useSendWhatsApp()`
- [ ] `useRegistration()` (modification)

### Phase 5 : Intégration Pages
- [ ] Page admin `/membership-requests`
- [ ] Page demandeur `/register`
- [ ] Tests E2E (17 tests)

### Phase 6 : Cloud Functions
- [ ] `verifySecurityCode` (Callable Function) — Vérification atomique du code
- [ ] `submitCorrections` (Callable Function) — Soumission atomique des corrections
- [ ] `checkExpiredSecurityCodes` (Scheduled Function, optionnel) — Vérification codes expirés
- [ ] Déploiement : `firebase deploy --only functions`

### Phase 7 : Notifications
- [ ] Extension `NotificationService.createCorrectionNotification()`
- [ ] Intégration dans `MembershipServiceV2.requestCorrections()` → NOTIF-CORR-001
- [ ] Intégration dans Cloud Function `submitCorrections` → NOTIF-CORR-002
- [ ] Intégration dans Cloud Function `checkExpiredSecurityCodes` → NOTIF-CORR-003, 004
- [ ] Intégration dans `MembershipServiceV2.renewSecurityCode()` → NOTIF-CORR-005
- [ ] Ajouter types `NotificationType` dans `src/types/types.ts` (5 types)

### Phase 8 : Firebase
- [ ] Firestore Rules
- [ ] Storage Rules
- [ ] Firestore Indexes (`firestore.indexes.json`)

---

## 🎯 Références Rapides

### Documentation Fonctionnelle
- Diagrammes d'activité : `documentation/membership-requests/corrections/activite/`
- Diagrammes de séquence : `documentation/membership-requests/corrections/sequence/`
- Wireframes : `documentation/membership-requests/corrections/wireframes/`

### Documentation Tests
- Tests : `documentation/membership-requests/corrections/test/`
- Data-testid : `documentation/membership-requests/corrections/test/DATA_TESTID.md` (57 data-testid)

### Documentation Firebase
- Firebase : `documentation/membership-requests/corrections/firebase/`

### Documentation Cloud Functions
- Cloud Functions : `documentation/membership-requests/corrections/functions/`
- Changelog Cloud Functions : `documentation/membership-requests/corrections/CHANGELOG_CLOUD_FUNCTIONS.md`

### Documentation Notifications
- Notifications : `documentation/membership-requests/corrections/notification/`
- Compatibilité UML : `documentation/membership-requests/corrections/notification/COMPATIBILITE_UML.md`

### Documentation Générale
- Workflow général : `documentation/general/WORKFLOW.md`
- Architecture : `documentation/architecture/ARCHITECTURE.md`
- Design System : `documentation/DESIGN_SYSTEM_ET_QUALITE_UI.md`

---

## 🚀 Ordre d'Implémentation Recommandé

1. **Utilitaires** (base solide)
2. **Services** (logique métier)
3. **Cloud Functions** (sécurité et atomicité)
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
- ✅ Utilitaires (securityCodeUtils, whatsAppUrlUtils, correctionUtils)
- ✅ Services (MembershipServiceV2, RegistrationService)
- ✅ Repositories (logique d'accès données)

**Test-After** — Recommandé pour :
- ✅ Composants UI (itération rapide, validation visuelle d'abord)
- ✅ Hooks React Query (orchestration, validation après intégration)

**Règle absolue** : Tous les tests doivent être écrits avant le commit final.

### Ordre de Priorité des Tests

1. **Tests unitaires utilitaires** (Phase 1) — Base solide
2. **Tests unitaires services** (Phase 2) — Logique métier
3. **Tests d'intégration** (Phase 2.5) — Flows complets
4. **Tests unitaires composants** (Phase 3) — UI isolée
5. **Tests E2E** (Phase 5) — Validation utilisateur complète

### Gestion des Data-testid

**Règle** : Ajouter les data-testid **pendant** l'implémentation des composants, pas après.

**Référence** : `documentation/membership-requests/corrections/test/DATA_TESTID.md` (57 data-testid documentés)

**Checklist** :
- [ ] Vérifier que chaque composant a ses data-testid
- [ ] Utiliser les noms exacts du fichier DATA_TESTID.md
- [ ] Tester les sélecteurs E2E après ajout

### Gestion des Indexes Firestore

**⚠️ CRITIQUE** : L'index `securityCode + securityCodeUsed` doit être ajouté dans `firestore.indexes.json` et déployé **avant** de tester les requêtes en production.

**Processus** :
1. Ajouter l'index dans `firestore.indexes.json`
2. Déployer en dev : `firebase deploy --only firestore:indexes`
3. Attendre construction (vérifier dans Firebase Console)
4. Tester les requêtes
5. Commit et PR (index déployé automatiquement en préprod/prod)

**Référence** : `documentation/membership-requests/corrections/firebase/FIRESTORE_INDEXES.md`

---

## 🎯 Points d'Attention

### Sécurité
- ✅ Code de sécurité : 6 chiffres, expiration 48h, usage unique
- ✅ Validation admin : `recordedBy` ne doit jamais être "Inconnu"
- ✅ Firestore Rules : Demandeur ne peut modifier que si code valide
- ✅ Storage Rules : Photos/documents protégés

### Performance
- ✅ Index Firestore : `securityCode + securityCodeUsed` (requête rapide)
- ✅ Cache React Query : Invalidation après mutations
- ✅ Lazy loading : Modals chargés à la demande

### UX
- ✅ Modal simplifié : Pas de WhatsApp dans le modal de corrections
- ✅ Actions dans dropdown : Garder la liste légère
- ✅ Feedback visuel : Toast, loading states, erreurs claires
- ✅ Responsive : Mobile-first, animations fluides

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
