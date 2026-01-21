## Cloud Functions – Formulaire membre (V2)

### 1. Fonctions existantes utilisées

#### 1.1 `submitCorrections` (callable) – déjà existante

- **Fichier** : `functions/src/membership-requests/submitCorrections.ts`
- **Utilisation** : Appelée par `MembershipFormService.submitCorrection()` quand l’admin soumet des corrections à une demande d’adhésion existante.
- **Signature** :
  ```typescript
  submitCorrections(data: {
    requestId: string
    corrections: {
      identity?: {...}
      address?: {...}
      company?: {...}
      documents?: {...}
    }
    securityCode: string
  }): Promise<{ success: boolean }>
  ```
- **Fonctionnalités** :
  - Vérifie le code de sécurité.
  - Met à jour la demande d’adhésion avec les corrections.
  - Crée une notification pour les admins.
- **Note** : Cette fonction est déjà utilisée pour le workflow de corrections des demandes d’adhésion (voir `membership-requests`).

### 2. Fonctions à créer (recommandations V2)

#### 2.1 `createMembershipRequest` (callable) ⏳ **À CRÉER** (optionnel)

**Objectif** : Déporter la création de `membershipRequests` côté serveur pour :
- Centraliser la logique de validation métier.
- Gérer les transactions atomiques (création demande + upload documents + création éventuelle de `User`).
- Appliquer des règles de sécurité strictes.

- **Signature proposée** :
  ```typescript
  createMembershipRequest(data: {
    identity: {...}
    address: {...}
    company: {...}
    documents: {
      identityDocument?: { type: string, url: string }
      photo?: { url: string }
    }
  }): Promise<{ requestId: string, dossierId: string }>
  ```
- **Implémentation** :
  - Valide les données (schémas Zod côté serveur).
  - Crée le document `membershipRequests` dans Firestore.
  - Crée les documents liés dans `documents` (si URLs fournies).
  - Génère un `dossierId` unique.
  - Crée une notification pour les admins (`new_request`).
- **Avantages** :
  - Sécurité : validation côté serveur, pas de manipulation côté client.
  - Cohérence : transactions atomiques.
  - Traçabilité : logs centralisés côté serveur.

> **Note** : Si la création se fait déjà directement depuis le client via `MembershipRepositoryV2.create()`, cette fonction peut être optionnelle. Elle devient nécessaire si on veut centraliser la validation ou gérer des transactions complexes.

### 3. Architecture d’intégration avec le domaine `memberships`

- Le formulaire (`MembershipFormService`) peut :
  - **Option A** : Appeler directement `MembershipRepositoryV2.create()` depuis le client (plus simple, mais validation côté client).
  - **Option B** : Appeler la Cloud Function `createMembershipRequest` (plus sécurisé, validation côté serveur).
- Les modals de création rapide (référentiels) :
  - Créent directement les entités via les repositories/services de domaine (`GeographyService.createProvince()`, `CompanyService.create()`, etc.).
  - Pas besoin de Cloud Functions pour ces opérations simples.

### 4. Checklist d’implémentation (Cloud Functions liées à `form-membership`)

- [ ] Décider si `createMembershipRequest` (Cloud Function) est nécessaire ou si on garde la création directe côté client.
- [ ] Si Cloud Function nécessaire :
  - [ ] Implémenter `createMembershipRequest` (callable).
  - [ ] Ajouter la validation côté serveur (schémas Zod).
  - [ ] Gérer les transactions atomiques (création demande + documents).
  - [ ] Créer une notification `new_request` après création réussie.
  - [ ] Tester avec données réelles.
- [ ] Vérifier que `submitCorrections` (déjà existante) est bien utilisée par `MembershipFormService.submitCorrection()`.

