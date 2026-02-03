## Workflow d'implémentation – Générer identifiant (V2)

### Objectif

Implémenter la fonctionnalité « Générer identifiant » : bouton sur la liste des membres → modal de confirmation (recopie du matricule) → réinitialisation du mot de passe à la valeur du matricule → génération d’un PDF (matricule, identifiant, mot de passe).

### Séquence d'implémentation (ordre recommandé)

#### Phase 0 : Branche Git

0. **Créer la branche de travail**
   - [ ] Partir de `develop` à jour : `git checkout develop && git pull origin develop`.
   - [ ] Créer une branche dédiée : `git checkout -b feature/generer-identifiant` (ou `feat/memberships-generer-identifiant`).
   - [ ] Toutes les étapes suivantes se font sur cette branche jusqu’à la merge request vers `develop`.

#### Phase 1 : Backend / Auth

1. **Mise à jour du mot de passe côté serveur**
   - [ ] Exposer une **route API** (ex. `POST /api/auth/admin/reset-member-password`) ou une **Cloud Function** réservée aux admins.
   - [ ] Vérifier que l’appelant est admin (session / token).
   - [ ] Paramètres : `memberId` (ou `uid`), `newPassword` (matricule).
   - [ ] Utiliser **Firebase Admin** : `admin.auth().updateUser(uid, { password: newPassword })`.
   - [ ] Retourner succès ou erreur (ex. membre introuvable, permissions).
   - [ ] Documenter dans `firebase/README.md` et éventuellement `functions/README.md`.

#### Phase 2 : Domaine membership – Service et repository

2. **Repository / données membre**
   - [ ] S’assurer que le **MemberRepository** (ou équivalent) expose une méthode pour récupérer un membre par id (`getById(memberId)`) avec au minimum `matricule`, `email` (ou identifiant de connexion), `uid` si nécessaire.
   - [ ] Pas de nouveau repository dédié si le domaine memberships a déjà un repository membre.

3. **Service GenererIdentifiantService**
   - [ ] Créer `domains/memberships/services/GenererIdentifiantService.ts` (ou chemin aligné avec la structure du projet).
   - [ ] Méthode : `resetPasswordAndGeneratePdf(memberId: string, matricule: string)`.
   - [ ] Étapes du service :
     1. Récupérer le membre (repository) pour avoir `uid`, `email`/identifiant, `matricule`.
     2. Appeler la route API / Cloud Function pour mettre à jour le mot de passe avec `matricule`.
     3. En cas de succès, construire les données du PDF (matricule, identifiant, mot de passe) et les retourner (ou appeler le générateur PDF dans le service et retourner le blob).
   - [ ] Gestion d’erreurs : propager les erreurs (membre introuvable, échec auth) pour affichage dans le modal.

#### Phase 3 : Génération PDF

4. **Template PDF identifiants membre**
   - [ ] Créer un document PDF avec **@react-pdf/renderer** (ex. `IdentifiantsMembrePDF.tsx` dans `domains/memberships/components/` ou `shared/`).
   - [ ] Contenu : **Matricule**, **Identifiant** (email ou matricule selon politique), **Mot de passe** (valeur du matricule).
   - [ ] Mise en page claire (titres, valeurs, éventuellement logo KARA). S’inspirer des autres PDF du projet (ex. `CaisseSpecialePDF.tsx`, `MemberDetailsModal`).
   - [ ] Exposer une fonction ou composant qui prend `{ matricule, identifiant, mot de passe }` et retourne un blob (ex. `pdf(<Document>).toBlob()`).

#### Phase 4 : Hook et modal

5. **Hook useGenererIdentifiant**
   - [ ] Créer `domains/memberships/hooks/useGenererIdentifiant.ts`.
   - [ ] Entrées : `memberId`, `matricule` (du membre), optionnellement callback de succès/erreur.
   - [ ] État : `isLoading`, `error`, `resetError`.
   - [ ] Action : `submitGenererIdentifiant(matriculeSaisi: string)` :
     - Valider que `matriculeSaisi === matricule` (sinon retourner erreur).
     - Appeler le service `resetPasswordAndGeneratePdf(memberId, matricule)`.
     - Sur succès : retourner le blob PDF (ou les données pour génération côté client).
   - [ ] Utiliser le service via la factory / injection en vigueur dans le projet.

6. **Modal GenererIdentifiantModal**
   - [ ] Composant modal (Dialog shadcn) avec :
     - Titre : « Réinitialiser le mot de passe du membre » (ou « Générer identifiant »).
     - Message explicatif.
     - Affichage du matricule du membre (lecture seule).
     - Champ de saisie : « Recopiez le matricule du membre » (obligatoire).
     - Bouton « Annuler » (ferme le modal).
     - Bouton « Accepter » / « Confirmer » : désactivé tant que la saisie ≠ matricule ; au clic, appelle le hook puis déclenche téléchargement du PDF et fermeture.
   - [ ] Gestion des états : chargement (bouton désactivé + spinner), erreur (message sous le formulaire ou toast).
   - [ ] Téléchargement du PDF : déclencher un lien de téléchargement (blob URL) ou ouvrir dans un nouvel onglet / BlobProvider selon le choix UX.

#### Phase 5 : Intégration dans la liste des membres

7. **Bouton sur la liste**
   - [ ] Dans le composant qui affiche un membre (carte ou ligne) sur `/memberships`, ajouter un bouton ou une action **« Générer identifiant »**.
   - [ ] Au clic : ouvrir `GenererIdentifiantModal` avec `memberId` et `matricule` du membre.
   - [ ] S’assurer que seuls les admins voient cette action (contrôle de permission côté UI et côté API).

#### Phase 6 : Tests et documentation

8. **Tests**
   - [ ] **Service** : test unitaire de `GenererIdentifiantService` (mock du repository et de l’API auth, vérifier l’enchaînement et la gestion d’erreurs).
   - [ ] **Hook** : test unitaire de `useGenererIdentifiant` (validation matricule, appel service, états loading/error).
   - [ ] **Modal** : test d’intégration ou composant (ouverture, saisie, bouton désactivé/activé, soumission, téléchargement ou callback).
   - [ ] **E2E** (optionnel) : parcours complet depuis la liste jusqu’au téléchargement du PDF (avec mock de l’API auth si besoin).
   - [ ] Détail dans `tests/README.md`.

9. **Documentation**
   - [ ] Mettre à jour ce workflow avec les cases cochées.
   - [ ] Vérifier les diagrammes `activite/main.puml` et `sequence/SEQ_GenererIdentifiant.puml` après implémentation.
   - [ ] Compléter `firebase/README.md` (Auth, éventuelle Cloud Function).

### Dépendances

- **Liste des membres** : `liste-memberships` (bouton d’action par membre).
- **Auth** : route API ou Cloud Function avec Firebase Admin pour `updateUser` password.
- **PDF** : `@react-pdf/renderer` (déjà dans le projet). Voir `.cursor/skills/react-pdf/SKILL.md`.

### Références

- Spécification : `../README.md`
- Diagramme d’activité : `../activite/main.puml`
- Diagramme de séquence (domains) : `../sequence/SEQ_GenererIdentifiant.puml`
