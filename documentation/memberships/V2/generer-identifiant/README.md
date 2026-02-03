## V2 – Générer identifiant / Réinitialiser mot de passe (`generer-identifiant`)

### 1. Contexte et objectif

Nouvelle fonctionnalité permettant à un administrateur de **réinitialiser le mot de passe d’un membre** à la valeur de son **matricule**, puis de **générer un PDF** contenant les identifiants de connexion (matricule, identifiant, mot de passe) à remettre au membre.

- **Point d’entrée** : un **bouton** sur la **liste des membres** (par membre ou dans les actions de la carte/ligne).
- **Flux** : clic → ouverture d’un **modal de confirmation** → saisie/recopie du matricule → acceptation → mise à jour du mot de passe → génération et téléchargement d’un **PDF**.

### 2. Comportement fonctionnel

#### 2.1 Déclenchement

- Sur la **liste des membres** (`/memberships`), chaque membre dispose d’une action **« Générer identifiant »** (ou « Réinitialiser mot de passe »).
- Au clic, un **modal** s’ouvre.

#### 2.2 Modal de confirmation

Le modal :

1. **Titre** : « Réinitialiser le mot de passe du membre » (ou équivalent).
2. **Message** : explication que le mot de passe sera remplacé par le **matricule** du membre.
3. **Champ obligatoire** : l’admin doit **recopier/coller le matricule** du membre (pour éviter les erreurs de cible).
4. **Validation** : le matricule saisi doit être **strictement égal** au matricule du membre concerné.
5. **Boutons** :
   - **Annuler** : ferme le modal sans rien faire.
   - **Accepter** (ou « Confirmer ») : désactivé tant que le matricule saisi ne correspond pas ; une fois valide, déclenche le flux de réinitialisation puis génération du PDF.

#### 2.3 Après acceptation

1. **Mise à jour du mot de passe** : le mot de passe du compte membre (Firebase Auth ou backend) est mis à jour à la **valeur du matricule** du membre.
2. **Génération du PDF** : un document PDF est généré contenant :
   - **Matricule** du membre
   - **Identifiant** (login : email ou matricule selon la politique d’auth du projet)
   - **Mot de passe** (égal au matricule après réinitialisation)
3. **Téléchargement** : le PDF est proposé au téléchargement (ou ouverture dans un nouvel onglet / modal de prévisualisation).
4. **Feedback** : message de succès et fermeture du modal.

### 3. Données et contrats

- **Entrées** : `memberId` (ou référence du membre), `matricule` du membre (affiché dans le modal, à recopier).
- **Sorties** : PDF avec `{ matricule, identifiant, mot de passe }`.
- **Identifiant** : à aligner avec la politique d’authentification (ex. email du membre, ou matricule comme login).
- **Mot de passe** : après réinitialisation = matricule (en clair dans le PDF pour remise au membre).

### 4. Architecture (domains)

La fonctionnalité s’intègre dans le domaine **memberships** et s’appuie sur :

- **Domaine membership** : composant liste (bouton), modal, hook d’action, service de réinitialisation, génération PDF.
- **Domaine auth** (ou API/Cloud Function) : mise à jour du mot de passe (Firebase Admin ou route API sécurisée).
- **Shared** : composants UI (Dialog, Button, Input), génération PDF (@react-pdf/renderer).

Les diagrammes de **séquence** utilisent explicitement l’architecture par domaines (Domain Component, Domain Hook, Domain Service, Domain Repository). Voir `sequence/README.md` et `sequence/SEQ_GenererIdentifiant.puml`.

### 5. Fichiers de documentation

| Dossier / Fichier | Description |
|-------------------|-------------|
| `activite/` | Diagrammes d’activité (flux du modal, validation, génération PDF). |
| `sequence/` | Diagrammes de séquence avec architecture domains. |
| `workflow/` | Phases d’implémentation recommandées. |
| `firebase/` | Collections / Auth utilisés, règles, index si besoin. |
| `tests/` | Stratégie de tests (unitaires, intégration, E2E). |
| `wireframes/` | Maquettes du modal (desktop / mobile). |
| `functions/` | Si une Cloud Function est utilisée pour la réinitialisation. |
| `notifications/` | Optionnel (notification au membre après réinitialisation). |

### 6. Dépendances techniques

- **Liste des membres** : la fonctionnalité est exposée depuis la liste (`liste-memberships`). Le bouton peut être ajouté sur chaque carte/ligne membre.
- **Auth** : mise à jour du mot de passe via **Firebase Admin** (côté serveur) ou **route API** protégée admin. Pas de mise à jour directe depuis le client pour un autre utilisateur.
- **PDF** : génération côté client avec **@react-pdf/renderer** (déjà utilisé dans le projet). Voir `.cursor/skills/react-pdf/SKILL.md`.

### 7. Sécurité

- **Réservé aux admins** : seuls les utilisateurs ayant le rôle admin peuvent accéder à cette action.
- **Confirmation par matricule** : obligation de recopier le matricule pour limiter les réinitialisations par erreur.
- **Mise à jour du mot de passe** : effectuée côté serveur (API ou Cloud Function) avec vérification de l’identité de l’admin et du membre cible.
- **PDF** : contient des données sensibles (mot de passe en clair) ; à remettre au membre de manière sécurisée (remise en main propre ou canal sécurisé).

### 8. Mapping des composants (à créer)

| Élément | Emplacement prévu |
|--------|--------------------|
| Bouton « Générer identifiant » | Liste des membres (carte/ligne membre) – domaine memberships |
| Modal de confirmation | `domains/memberships/components/GenererIdentifiantModal.tsx` (ou équivalent) |
| Hook d’action | `domains/memberships/hooks/useGenererIdentifiant.ts` |
| Service réinitialisation + PDF | `domains/memberships/services/GenererIdentifiantService.ts` (ou scinder Auth + PDF) |
| Repository / API | Appel API ou domaine auth pour `updatePassword(memberId, newPassword)` |
| Template PDF | `domains/memberships/components/IdentifiantsMembrePDF.tsx` (@react-pdf/renderer) |

> Ce README sert de référence pour le workflow d’implémentation (`workflow/README.md`), les diagrammes (`activite/`, `sequence/`) et les tests (`tests/README.md`).
