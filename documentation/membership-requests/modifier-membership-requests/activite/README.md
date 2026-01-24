## Diagrammes d'activité – Modifier une demande d'adhésion

Ce dossier décrit, sous forme de **diagrammes d’activité PlantUML**, les grands flux de la fonctionnalité `modifier-membership-requests`.

Les fichiers `.puml` seront référencés depuis ce README lorsqu’ils seront ajoutés.

### 1. Flux principal – Ouverture et sauvegarde

**But** : décrire le parcours standard d’un admin qui modifie une demande.

- **Acteurs**
  - Admin (utilisateur back‑office).
  - UI `MembershipRequestsPageV2` + `MemberDetailsModal` (mode édition).
  - `MembershipFormService` / `MembershipRepositoryV2`.
- **Étapes clés**
  - L’admin ouvre la **liste des demandes**.
  - Il clique sur **« Ouvrir la fiche / Modifier »**.
  - L’application charge la demande et pré‑remplit la fiche.
  - L’admin modifie les champs autorisés.
  - Il clique sur **« Enregistrer les modifications »**.
  - Le service de domaine valide les données et appelle le repository.
  - L’UI affiche un **toast de succès** et rafraîchit la liste / les détails.

### 2. Gestion des erreurs de validation

**But** : montrer comment sont gérées les erreurs lors de la sauvegarde.

- Validation côté formulaire (Zod / React Hook Form).
- Validation côté service (`MembershipFormService`) :
  - Nom obligatoire.
  - Adresse cohérente (IDs d’adresse + champs textes).
  - Pièces obligatoires (document d’identité, etc.) selon le statut.
- Gestion des erreurs :
  - Retour d’un message formaté par `MembershipErrorHandler`.
  - Affichage dans l’UI (toasts + erreurs de champ).

### 3. Mise à jour / remplacement des documents

**But** : décrire la mise à jour des **photos** et **pièces d’identité**.

- Chargement de la demande existante (URL Storage actuelle).
- L’admin remplace une photo ou un document :
  - Upload vers Firebase Storage.
  - Mise à jour des métadonnées dans Firestore via `MembershipRepositoryV2`.
- Optionnel : suppression de l’ancienne ressource Storage (si politique de nettoyage activée).

### 4. Cas particuliers

- Demande déjà **approuvée** : champs restreints, ou redirection vers un flow spécifique (à préciser).
- Demande en **corrections** : articulation avec le workflow corrections (ne pas casser le lien demandeur).
- Gestion des **conflits** : deux admins modifient la même demande en parallèle (à documenter si nécessaire).
