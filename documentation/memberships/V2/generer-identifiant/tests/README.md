## Tests – Générer identifiant (V2)

### 1. Tests unitaires

#### 1.1 GenererIdentifiantService

- [ ] **resetPasswordAndGeneratePdf(memberId, matricule)** :
  - [ ] Cas nominal : membre trouvé, API auth retourne succès → retourne les données PDF (ou blob).
  - [ ] Membre introuvable (repository retourne null/undefined) → erreur propagée.
  - [ ] Échec de l’API auth (ex. uid invalide) → erreur propagée avec message exploitable.
  - [ ] Vérifier que les données passées au générateur PDF sont correctes (matricule, identifiant = email ou matricule, mot de passe = matricule).

#### 1.2 useGenererIdentifiant (hook)

- [ ] **Validation du matricule** :
  - [ ] Si `matriculeSaisi !== matricule` → retour d’erreur ou état d’erreur, pas d’appel au service.
  - [ ] Si `matriculeSaisi === matricule` → appel au service.
- [ ] **États** :
  - [ ] Pendant l’appel : `isLoading === true`.
  - [ ] Succès : retour du PDF (ou callback), `isLoading === false`, `error` null.
  - [ ] Erreur : `error` renseigné, `isLoading === false`.
- [ ] **Reset d’erreur** : `resetError()` ou équivalent pour réinitialiser le message d’erreur dans le modal.

#### 1.3 IdentifiantsMembrePDF (génération PDF)

- [ ] Le document généré contient bien les trois champs : matricule, identifiant, mot de passe.
- [ ] Optionnel : test de snapshot ou vérification du contenu du blob (taille > 0, type `application/pdf`).

### 2. Tests d'intégration

- [ ] **Modal + Hook + Service (mocks)** :
  - [ ] Ouverture du modal avec `memberId` et `matricule` → champ vide, bouton « Accepter » désactivé.
  - [ ] Saisie d’un matricule incorrect → bouton reste désactivé (ou erreur affichée selon UX).
  - [ ] Saisie du bon matricule → bouton « Accepter » activé.
  - [ ] Clic « Accepter » → appel du service (mock), puis callback de succès (téléchargement ou état).
  - [ ] Clic « Annuler » → fermeture sans appel au service.
- [ ] **Erreur API** : mock du service en erreur → message d’erreur affiché dans le modal, modal reste ouverte.

### 3. Tests E2E (optionnel)

- [ ] Parcours complet : connexion admin → liste des membres → clic « Générer identifiant » sur un membre → saisie du matricule → Accepter → vérifier que le PDF est téléchargé (ou qu’un blob est créé).
- [ ] Gérer le mock de l’API de réinitialisation du mot de passe pour ne pas modifier un vrai compte en environnement de test.

### 4. Attributs data-testid recommandés

- `data-testid="generer-identifiant-button"` : bouton d’ouverture du modal (sur la carte/ligne membre).
- `data-testid="generer-identifiant-modal"` : conteneur du modal.
- `data-testid="generer-identifiant-matricule-input"` : champ de saisie du matricule.
- `data-testid="generer-identifiant-submit"` : bouton « Accepter ».
- `data-testid="generer-identifiant-cancel"` : bouton « Annuler ».
- `data-testid="generer-identifiant-error"` : zone d’affichage de l’erreur.

### 5. Couverture cible

- Service : chemins nominal et erreurs (membre introuvable, auth échouée).
- Hook : validation + états loading/success/error.
- Modal : comportement du formulaire et des boutons (tests composant ou intégration avec mocks).
