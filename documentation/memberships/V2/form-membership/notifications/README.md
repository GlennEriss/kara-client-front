## Notifications – Formulaire membre (V2)

### 1. Toasts UI (feedback immédiat)

Les toasts sont utilisés pour informer l’admin lors d’actions sur le formulaire.

#### 1.1 Scénarios de toasts recommandés

- **Création rapide de référentiels (modals)**
  - `toast.success` après création réussie d’une province, commune, entreprise, profession.
  - `toast.error` si la création échoue (erreur réseau, validation, etc.).
- **Navigation entre steps**
  - Optionnel : `toast.info` lors du passage à l’étape suivante (si besoin de feedback UX).
- **Soumission du formulaire**
  - `toast.success` après soumission réussie : "Demande d'adhésion créée avec succès".
  - `toast.error` si la soumission échoue (erreur validation, upload, réseau).
- **Sauvegarde de brouillon** (si implémenté)
  - `toast.success` : "Brouillon sauvegardé".

> Les toasts restent locaux à la page et ne créent pas de documents `notifications` en base.

### 2. Notifications système (Firestore `notifications`)

Ces notifications sont stockées en base et visibles dans le centre de notifications global.

#### 2.1 Types d’événements pertinents pour `form-membership`

- **Création d’une demande d’adhésion**
  - `new_request` : nouvelle demande d’adhésion créée.
  - Déclenchement : après création réussie d’une `MembershipRequest` (via `MembershipFormService.submitNewMembership()` ou Cloud Function `createMembershipRequest`).
  - Cible : Admins (pour qu’ils puissent traiter la nouvelle demande).
  - Message : "Une nouvelle demande d'adhésion a été soumise par {nom} {prénom}".

- **Soumission de corrections**
  - `corrections_submitted` : corrections soumises pour une demande existante.
  - Déclenchement : après appel réussi de `submitCorrections` (Cloud Function).
  - Cible : Admins.
  - Message : "Des corrections ont été soumises pour la demande {dossierId}".

> Les types exacts (`NotificationType`) devront être ajoutés dans `src/types/types.ts` si non existants.

### 3. Déclencheurs des notifications (backend)

Les événements suivants peuvent déclencher des notifications système :

- **Création d’une demande d’adhésion**
  - Si création via Cloud Function `createMembershipRequest` :
    - La fonction crée directement la notification `new_request` après création réussie.
  - Si création côté client via `MembershipRepositoryV2.create()` :
    - Option 1 : Trigger Firestore `onCreate` sur `membershipRequests` qui crée la notification.
    - Option 2 : Le service `MembershipFormService` appelle `NotificationService.createMembershipRequestNotification()` après création.

- **Soumission de corrections**
  - La Cloud Function `submitCorrections` (déjà existante) crée une notification `corrections_submitted` après succès.

### 4. Intégration dans le formulaire

Le formulaire lui‑même ne crée pas directement de notifications système, mais :

- **Après soumission réussie** :
  - Le formulaire peut afficher un toast de succès.
  - Une notification système `new_request` est créée (via Cloud Function ou trigger) pour informer les autres admins.
- **Après création rapide d’un référentiel** :
  - Un toast de succès est affiché.
  - Pas de notification système (action locale, pas d’impact global).

### 5. Checklist d’alignement avec le système de notifications global

- [ ] Vérifier dans `documentation/notifications/*` que les types suivants existent (ou les ajouter) :
  - `new_request` (déjà existant pour `membership-requests`).
  - `corrections_submitted` (déjà existant).
- [ ] S’assurer que la création de `MembershipRequest` (via `MembershipFormService` ou Cloud Function) déclenche bien une notification `new_request`.
- [ ] Vérifier que `submitCorrections` (Cloud Function) crée bien une notification `corrections_submitted`.
- [ ] Ajouter des toasts UI pour tous les scénarios de feedback utilisateur (création référentiels, soumission, erreurs).

