## Workflow d'implémentation – Générer identifiant (V2)

### Objectif

Implémenter la fonctionnalité « Générer identifiant » : bouton sur la liste des membres → modal de confirmation (recopie du matricule) → réinitialisation du mot de passe à la valeur du matricule → génération d’un PDF (matricule, identifiant, mot de passe).

### Séquence d'implémentation (ordre recommandé)

#### Phase 0 : Branche Git

0. **Créer la branche de travail**
   - [x] Partir de `develop` à jour : `git checkout develop && git pull origin develop`.
   - [x] Créer une branche dédiée : `git checkout -b feature/generer-identifiant` (ou `feat/memberships-generer-identifiant`).
   - [x] Toutes les étapes suivantes se font sur cette branche jusqu’à la merge request vers `develop`.

#### Phase 1 : Backend / Auth

1. **Mise à jour du mot de passe côté serveur**
   - [x] Exposer une **route API** (ex. `POST /api/auth/admin/reset-member-password`) ou une **Cloud Function** réservée aux admins.
   - [ ] Vérifier que l’appelant est admin (session / token) — à renforcer en production.
   - [x] Paramètres : `memberId` (ou `uid`), `newPassword` (matricule).
   - [x] Utiliser **Firebase Admin** : `admin.auth().updateUser(uid, { password: newPassword })`.
   - [x] Retourner succès ou erreur (ex. membre introuvable, permissions).
   - [x] Documenter dans `firebase/README.md` et éventuellement `functions/README.md`.

#### Phase 2 : Domaine membership – Service et repository

2. **Repository / données membre**
   - [x] S’assurer que le **MemberRepository** (ou équivalent) expose une méthode pour récupérer un membre par id (`getById(memberId)`) avec au minimum `matricule`, `email` (ou identifiant de connexion), `uid` si nécessaire.
   - [x] Pas de nouveau repository dédié si le domaine memberships a déjà un repository membre.

3. **Service GenererIdentifiantService**
   - [x] Créer `domains/memberships/services/GenererIdentifiantService.ts` (ou chemin aligné avec la structure du projet).
   - [x] Méthode : `resetPasswordAndGetPdfData(memberId: string, matricule: string)` (retourne données PDF).
   - [x] Étapes du service :
     1. Récupérer le membre (repository) pour avoir `uid`, `email`/identifiant, `matricule`.
     2. Appeler la route API / Cloud Function pour mettre à jour le mot de passe avec `matricule`.
     3. En cas de succès, construire les données du PDF (matricule, identifiant, mot de passe) et les retourner.
   - [x] Gestion d’erreurs : propager les erreurs (membre introuvable, échec auth) pour affichage dans le modal.

#### Phase 3 : Génération PDF

4. **Template PDF identifiants membre**
   - [x] Créer un document PDF avec **@react-pdf/renderer** (`IdentifiantsMembrePDF.tsx` dans `domains/memberships/components/`).
   - [x] Contenu : **Matricule**, **Identifiant** (email ou matricule selon politique), **Mot de passe** (valeur du matricule).
   - [x] Mise en page claire (titres, valeurs). S’inspirer des autres PDF du projet.
   - [x] Génération du blob dans le modal via `pdf(<IdentifiantsMembrePDF data={...} />).toBlob()`.

#### Phase 4 : Hook et modal

5. **Hook useGenererIdentifiant**
   - [x] Créer `domains/memberships/hooks/useGenererIdentifiant.ts`.
   - [x] Entrées : `memberId`, `matricule` (du membre), optionnellement callback de succès/erreur.
   - [x] État : `isLoading`, `error`, `resetError`.
   - [x] Action : `submitGenererIdentifiant(matriculeSaisi: string)` : validation matricule, appel service, retour des données PDF.
   - [x] Utiliser le service via `GenererIdentifiantService.getInstance()`.

6. **Modal GenererIdentifiantModal**
   - [x] Composant modal (Dialog shadcn) avec titre, message, matricule en lecture seule, champ de recopie, Annuler / Accepter.
   - [x] Bouton « Accepter » désactivé tant que la saisie ≠ matricule.
   - [x] Gestion des états : chargement (spinner), erreur (message sous le formulaire).
   - [x] Téléchargement du PDF via blob URL après succès.

#### Phase 5 : Intégration dans la liste des membres

7. **Bouton sur la liste**
   - [x] Dans le composant qui affiche un membre (carte ou ligne) sur `/memberships`, ajouter une action **« Générer identifiant »** (menu dropdown carte + bouton tableau).
   - [x] Au clic : ouvrir `GenererIdentifiantModal` avec `memberId` et `matricule` du membre.
   - [ ] S’assurer que seuls les admins voient cette action (la page `/memberships` est déjà protégée ; renforcer côté API si besoin).

#### Phase 6 : Tests et documentation

8. **Tests**
   - [x] **Service** : test unitaire `GenererIdentifiantService.test.ts` (mock user.db + fetch, cas nominal, email absent, membre introuvable, erreur API).
   - [x] **Hook** : test unitaire `useGenererIdentifiant.test.tsx` (validation matricule, appel service, erreur, resetError).
   - [ ] **Modal** : test d’intégration ou composant (optionnel).
   - [ ] **E2E** (optionnel).
   - [x] Détail dans `tests/README.md`.

9. **Documentation**
   - [x] Mettre à jour ce workflow avec les cases cochées.
   - [x] Vérifier les diagrammes `activite/main.puml` et `sequence/SEQ_GenererIdentifiant.puml` après implémentation.
   - [x] Compléter `firebase/README.md` (Auth, route API).

### Dépendances

- **Liste des membres** : `liste-memberships` (bouton d’action par membre).
- **Auth** : route API ou Cloud Function avec Firebase Admin pour `updateUser` password.
- **PDF** : `@react-pdf/renderer` (déjà dans le projet). Voir `.cursor/skills/react-pdf/SKILL.md`.

### Références

- Spécification : `../README.md`
- Diagramme d’activité : `../activite/main.puml`
- Diagramme de séquence (domains) : `../sequence/SEQ_GenererIdentifiant.puml`
