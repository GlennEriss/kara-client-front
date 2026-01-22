## Tests – Formulaire membre (V2)

### 1. Tests unitaires

#### 1.1 Service `MembershipFormService`

- [ ] `submitNewMembership(formData)` :
  - [ ] Crée une `MembershipRequest` avec les bonnes données.
  - [ ] Upload les documents (photos, pièces d’identité) correctement.
  - [ ] Gère les erreurs de validation (retourne erreur typée).
  - [ ] Gère les erreurs d’upload (retourne erreur typée).
- [ ] `submitCorrection(formData, requestId)` :
  - [ ] Appelle la Cloud Function `submitCorrections` avec les bonnes données.
  - [ ] Met à jour les documents si nécessaire.
- [ ] `saveDraft(formData)` / `loadDraft()` :
  - [ ] Sauvegarde et charge correctement les brouillons (localStorage ou Firestore selon implémentation).

#### 1.2 Schémas de validation

- [ ] `MembershipIdentitySchema` (Step 1) :
  - [ ] Validation des champs obligatoires (nom, prénom, date de naissance, etc.).
  - [ ] Validation des formats (email, téléphone, date).
  - [ ] Messages d’erreur clairs.
- [ ] `MembershipAddressSchema` (Step 2) :
  - [ ] Validation de la cascade (province → ville → arrondissement → quartier).
  - [ ] Champs optionnels vs obligatoires.
- [ ] `MembershipCompanySchema` (Step 3) :
  - [ ] Validation des champs entreprise/profession.
- [ ] `MembershipDocumentsSchema` (Step 4) :
  - [ ] Validation des uploads (taille, type de fichier).

#### 1.3 Modals de création rapide

- [ ] `AddProvinceModal`, `AddCommuneModal`, `AddDistrictModal`, `AddQuarterModal` :
  - [ ] Ouverture/fermeture correcte.
  - [ ] Création d’une nouvelle entité géographique.
  - [ ] Invalidation des caches React Query après création.
  - [ ] Sélection automatique de la nouvelle valeur dans la combobox parente.
- [ ] `AddCompanyModal`, `AddProfessionModal` :
  - [ ] Même pattern que les modals géographie.

#### 1.4 Steps / composants de formulaire

- [ ] `MembershipFormStepIdentity` :
  - [ ] Affichage des champs d’identité.
  - [ ] Validation en temps réel (affichage des erreurs).
  - [ ] Navigation vers Step2 si valide.
- [ ] `MembershipFormStepAddress` :
  - [ ] Cascade Province → Ville → Arrondissement → Quartier.
  - [ ] Ouverture des modals de création rapide (boutons `+`).
  - [ ] Tri alphabétique dans les combobox.
  - [ ] Recherche dans les combobox (si implémentée).
- [ ] `MembershipFormStepCompany` :
  - [ ] Affichage des champs entreprise/profession.
  - [ ] Ouverture des modals `AddCompanyModal`, `AddProfessionModal`.
  - [ ] Tri alphabétique dans les combobox.
- [ ] `MembershipFormStepDocuments` :
  - [ ] Upload de fichiers (photos, pièces d’identité).
  - [ ] Affichage des erreurs d’upload (taille, type).
  - [ ] Prévisualisation des fichiers uploadés.

### 2. Tests d’intégration

Fichier cible : `src/domains/memberships/__tests__/integration/membership-form.integration.test.tsx`

- [ ] **INT-FORM-01 – Parcours complet du formulaire**
  - Remplir Step1 (identité) → Step2 (adresse) → Step3 (entreprise) → Step4 (documents).
  - Soumettre le formulaire.
  - Vérifier que la `MembershipRequest` est créée avec les bonnes données.
  - Vérifier la redirection vers la liste des membres (ou page de confirmation).

- [ ] **INT-FORM-02 – Création rapide d’une province depuis Step2**
  - Ouvrir `AddProvinceModal` depuis Step2.
  - Créer une nouvelle province.
  - Vérifier que la province apparaît dans la combobox et est sélectionnée automatiquement.

- [ ] **INT-FORM-03 – Création rapide d’une entreprise depuis Step3**
  - Ouvrir `AddCompanyModal` depuis Step3.
  - Créer une nouvelle entreprise.
  - Vérifier que l’entreprise apparaît dans la combobox et est sélectionnée automatiquement.

- [ ] **INT-FORM-04 – Validation des étapes**
  - Tenter de passer à Step2 sans remplir les champs obligatoires de Step1.
  - Vérifier que les erreurs sont affichées et que la navigation est bloquée.
  - Remplir les champs obligatoires → vérifier que la navigation vers Step2 fonctionne.

- [ ] **INT-FORM-05 – Sauvegarde/chargement de brouillon** (si implémenté)
  - Remplir Step1 et Step2.
  - Quitter le formulaire (ou déclencher sauvegarde automatique).
  - Revenir sur le formulaire.
  - Vérifier que les données Step1 et Step2 sont pré‑remplies.

- [ ] **INT-FORM-06 – Soumission avec erreur**
  - Simuler une erreur backend lors de la soumission.
  - Vérifier l’affichage d’un message d’erreur clair.
  - Vérifier que le formulaire reste sur Step4 (pas de redirection).

- [ ] **INT-FORM-07 – Cascade géographique**
  - Sélectionner une province → vérifier que les villes se chargent.
  - Sélectionner une ville → vérifier que les arrondissements se chargent.
  - Sélectionner un arrondissement → vérifier que les quartiers se chargent.

### 3. Tests E2E (Playwright – à planifier)

Scénarios cibles sur `/memberships/add` :

- [ ] Navigation vers `/memberships/add` depuis la liste des membres.
- [ ] Remplissage complet du formulaire (Step1 → Step4) avec création rapide d’une province et d’une entreprise.
- [ ] Soumission du formulaire et vérification de la création de la demande d’adhésion.
- [ ] Vérification de la redirection après soumission réussie.

### 4. Attributs `data-testid` recommandés

- `data-testid="membership-form-page"` : conteneur principal.
- `data-testid="membership-form-step-{n}"` : chaque step (ex. `step-1`, `step-2`).
- `data-testid="membership-form-next-button"`, `membership-form-prev-button` : boutons navigation.
- `data-testid="membership-form-submit-button"` : bouton de soumission.
- `data-testid="add-province-modal"`, `add-company-modal`, etc. : modals de création rapide.
- `data-testid="membership-form-error"` : messages d’erreur.

### 5. Couverture cible

- **Service `MembershipFormService`** : ≥80% (méthodes principales).
- **Schémas de validation** : ≥80% (cas limites, formats invalides).
- **Modals de création rapide** : ≥80% (ou validées via tests d’intégration).
- **Steps** : ≥80% (ou validées via tests d’intégration).
- **Intégration** : tous les scénarios INT-FORM-01 → 07 couverts.
- **E2E** : au moins 2–3 scénarios utilisateur critiques (parcours complet, création rapide, validation).

