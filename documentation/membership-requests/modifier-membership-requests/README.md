## Modifier une demande d'adhésion (`modifier-membership-requests`)

### Objectif fonctionnel

Permettre à un **admin** de **modifier une demande d'adhésion existante** directement depuis le back‑office, sans passer par le workflow de corrections côté demandeur (lien + code de sécurité).

### Contexte

- Le formulaire `/memberships/add` et le workflow de corrections couvrent surtout le **demandeur**.
- Les administrateurs ont besoin d’un mode **édition directe** pour :
  - Corriger des erreurs de saisie évidentes (typos, mauvais téléphone, mauvaise orthographe…).
  - Mettre à jour certaines informations administratives après vérification de pièces.
  - Régulariser une demande sans renvoyer systématiquement le dossier en corrections.

### Portée de la fonctionnalité

- **Points d’entrée**
  - Depuis la **liste des demandes** (`/membership-requests` – `MembershipRequestsPageV2`) via une action **« Modifier »** dans le **dropdown d’actions** de chaque ligne.
  - Cette action redirige vers une **nouvelle route** :  
    `GET /memberships/update/{requestId}`.
- **Comportement de `/memberships/update/{requestId}`**
  - Réutilise le **même formulaire** que `/memberships/add` (mêmes composants, mêmes validations).
  - Charge les données de la `MembershipRequest` correspondant à `requestId`.
  - Pré‑remplit le formulaire avec ces données.
  - Au submit :
    - met à jour la `MembershipRequest` existante (via `MembershipRepositoryV2` / `MembershipFormService`),
    - **ne crée pas** une nouvelle demande.
- **Surface éditable**
  - **Identité** : nom, prénom, email, contacts, date/lieu de naissance (dans les limites légales).
  - **Adresse** : pilotée par `useAddressCascade` (province → commune → arrondissement → quartier).
  - **Entreprise / Profession** : lien avec `Company` / `Profession` existantes.
  - **Pièces jointes** : remplacement de photo / document d’identité si besoin.
  - **Métadonnées de la demande** : champs internes non visibles par le demandeur (tags, commentaires internes…).

### Non‑objectifs (V1 de la fonctionnalité)

- **Ne pas** :
  - Modifier l’historique des paiements (couvert par le module paiement).
  - Modifier directement l’adhésion finale (`memberships`) une fois la demande approuvée (cas séparé).
  - Casser la traçabilité : toute modification critique devra être **journalisée** (voir section Firebase / audit).

### Architecture cible (adaptée à l’existant)

- **UI / pages**
  - `MembershipRequestsPageV2` : ajout d’une entrée « Modifier » dans le **menu d’actions** de chaque demande.
  - **Nouvelle page** `/memberships/update` :
    - réutilise le formulaire d’adhésion existant (`/memberships/add`),
    - sait se mettre en **mode création** (pas de `requestId`) ou **mode modification** (avec `requestId`).
- **Hooks**
  - `useMembershipRequestsV2` : fournit les données et l’ID de la demande à modifier (pour construire l’URL).
  - Hooks déjà utilisés par le formulaire d’adhésion (validation, upload, etc.) restent identiques.
- **Services / repositories**
  - `MembershipFormService` :
    - conserve `submitNewMembership` (création),
    - est étendu avec une méthode `updateMembershipRequest` (mise à jour d’une demande existante).
  - `MembershipRepositoryV2` : expose une opération d’update pour la collection des demandes.

### Analyse Technique et Stratégie d'Implémentation

#### 1. Gestion des fichiers (Photos et Documents)

Lors de la modification d'une demande, les fichiers (photo de profil, pièces d'identité) peuvent être remplacés.

*   **Problème** : Si une nouvelle photo est uploadée sans supprimer l'ancienne, le stockage accumule des fichiers orphelins (coût, "déchets").
*   **Options de suppression** :
    1.  **Suppression Synchrone (Repository)** : Le backend (ici le Repository client) supprime l'ancien fichier juste avant ou après l'upload du nouveau.
        *   *Avantages* : Immédiat, simple à implémenter sans toucher au backend serveur (Cloud Functions).
        *   *Inconvénients* : Ralentit légèrement l'opération utilisateur, risque d'incohérence si l'opération échoue à moitié (mais rare).
    2.  **Suppression Asynchrone (Cloud Function)** : Un trigger `onUpdate` Firestore détecte le changement d'URL et supprime l'ancien fichier.
        *   *Avantages* : Robuste, invisible pour l'utilisateur.
        *   *Inconvénients* : Nécessite un déploiement de Cloud Functions (hors périmètre frontend pur).
*   **Stratégie Retenue (V1)** : **Suppression Synchrone dans le Repository**.
    *   Le `MembershipRepositoryV2` détecte si une nouvelle photo est fournie.
    *   Il récupère le chemin de l'ancienne photo (`photoPath`).
    *   Il appelle le `DocumentRepository` pour supprimer l'ancien fichier.
    *   Il upload le nouveau fichier.

#### 2. Mapping des Données (Modèle vs Formulaire)

Le modèle de données Firestore (`MembershipRequest`) diffère légèrement du schéma de validation du formulaire (`RegisterFormData`), notamment pour les fichiers.

| Champ Modèle (`MembershipRequest`) | Champ Formulaire (`RegisterFormData`) | Action Requise |
| :--- | :--- | :--- |
| `identity.photoURL` | `identity.photo` | **Mapping à l'initialisation** |
| `documents.documentPhotoFrontURL` | `documents.documentPhotoFront` | **Mapping à l'initialisation** |
| `documents.documentPhotoBackURL` | `documents.documentPhotoBack` | **Mapping à l'initialisation** |

> **Important** : Le composant `Register` attend des propriétés `photo`, `documentPhotoFront`, etc. Si on lui passe `photoURL` sans le mapper vers `photo`, le champ restera vide.

#### 3. Optimisation des Mises à jour (Delta)

*   **Données Textuelles** : Firestore optimise nativement les opérations `updateDoc`. Si on envoie des données identiques à celles existantes, aucune écriture physique (ou minime) n'est comptabilisée (« no-op »). Il n'est donc pas strictement nécessaire de calculer un diff complexe côté client pour les champs texte.
*   **Fichiers** : L'upload ne doit se faire que si le fichier a changé.
    *   Si le formulaire renvoie une **URL (string)** : c'est l'image existante, **pas d'action**.
    *   Si le formulaire renvoie un **Fichier (File/Blob) ou DataURL** : c'est une nouvelle image, **upload + suppression ancienne**.

---

### Documentation associée
- `activite/README.md` : diagrammes d’activité (ouverture depuis détails → édition → sauvegarde).
- `sequence/README.md` : diagrammes de séquence (Admin → UI → Service → Repository → Firestore / Storage).
- `workflow/README.md` : plan d’implémentation par phases (cartographie V1, service d’update, UI, tests).
- `tests/README.md` : plan de tests unitaires, intégration et E2E.
- `firebase/README.md` : règles Firestore / Storage et détails de l'implémentation stockage.
- `notifications/README.md` : scénarios de notification éventuels après modification (optionnel).
