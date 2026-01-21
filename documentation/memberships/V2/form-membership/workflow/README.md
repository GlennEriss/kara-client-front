## Workflow d’implémentation – Formulaire membre (V2)

### Objectif
Refondre le formulaire d’adhésion (`Register` + `Step1`–`Step4`) pour améliorer l’expérience admin (modals de création rapide, combobox avec recherche/tri) tout en conservant l’UI/UX existante et en alignant la logique sur les services de domaine `memberships`.

### Séquence d'implémentation (ordre recommandé)

#### Phase 1 : Fondations & cartographie ⏳ **À FAIRE**
1. **Cartographier V1**
   - [ ] Analyser `src/components/register/Register.tsx` et `Step1.tsx`–`Step4.tsx`.
   - [ ] Noter les hooks utilisés (`useAddresses`, `useCompanies`, `useProfessions`).
   - [ ] Identifier les points de friction (création de référentiels nécessitant navigation vers `/geographie`, `/companies`, `/jobs`).
   - [ ] Vérifier l’état actuel des modals (certaines existent déjà dans `domains/infrastructure/geography/components/modals/`).
2. **Définir les contrats de données V2**
   - [ ] Définir le type `MembershipFormData` (structure des données du formulaire).
   - [ ] Identifier les services de domaine à utiliser (`GeographyService`, `CompanyService`, `ProfessionService`, `MembershipFormService`).

#### Phase 2 : Service de domaine `MembershipFormService` ⏳ **À FAIRE**
3. **Créer le service** (`src/domains/memberships/services/MembershipFormService.ts`)
   - [ ] Méthode `submitNewMembership(formData)` :
     - [ ] Crée une `MembershipRequest` via `MembershipRepositoryV2`.
     - [ ] Upload des documents via `DocumentRepository`.
     - [ ] Gère les erreurs et retourne un résultat typé.
   - [ ] Méthode `submitCorrection(formData, requestId)` :
     - [ ] Appelle la Cloud Function `submitCorrections`.
     - [ ] Met à jour les documents si nécessaire.
   - [ ] Méthode `saveDraft(formData)` / `loadDraft()` :
     - [ ] Persistance locale (localStorage) ou Firestore selon stratégie V2.
4. **Tests unitaires du service**
   - [ ] Mock des repositories (membership, documents).
   - [ ] Cas heureux : soumission réussie.
   - [ ] Cas erreur : validation échoue, upload échoue, etc.

#### Phase 3 : Modals de création rapide (référentiels) ⏳ **À FAIRE**
5. **Vérifier/améliorer les modals géographie existantes**
   - [ ] `AddProvinceModal` (déjà dans `domains/infrastructure/geography/components/modals/`).
   - [ ] `AddCommuneModal` (déjà existante).
   - [ ] `AddDistrictModal` (déjà existante).
   - [ ] `AddQuarterModal` (déjà existante).
   - [ ] Vérifier que toutes invalident bien les caches React Query après création.
   - [ ] Vérifier que toutes sélectionnent automatiquement la nouvelle valeur dans la combobox.
6. **Créer/améliorer les modals référentiels pro**
   - [ ] `AddCompanyModal` (`domains/infrastructure/references/components/modals/`).
   - [ ] `AddProfessionModal` (idem).
   - [ ] Intégration avec `CompanyService` / `ProfessionService`.
   - [ ] Invalidation des caches + sélection automatique.
7. **Tests unitaires des modals**
   - [ ] Vérifier l’ouverture/fermeture.
   - [ ] Vérifier la création d’une nouvelle entité.
   - [ ] Vérifier l’invalidation des caches React Query.
   - [ ] Vérifier la sélection automatique dans la combobox parente.

#### Phase 4 : Refactor des steps (Step2, Step3) ⏳ **À FAIRE**
8. **Améliorer `MembershipFormStepAddress`** (refactor de `Step2.tsx`)
   - [ ] S’assurer que les combobox ont recherche + tri alphabétique systématique.
   - [ ] Intégrer les modals de création rapide (boutons `+`).
   - [ ] Centraliser la logique de cascade Province → Ville → Arrondissement → Quartier dans un hook/service.
   - [ ] Utiliser `useIsAdminContext` pour afficher les modals uniquement côté admin.
9. **Améliorer `MembershipFormStepCompany`** (refactor de `Step3.tsx`)
   - [ ] Intégrer `CompanySelect` et `ProfessionSelect` avec recherche + tri.
   - [ ] Intégrer `AddCompanyModal` et `AddProfessionModal`.
   - [ ] Utiliser `useIsAdminContext` pour les modals.
10. **Refactor `MembershipFormStepIdentity`** (Step1) et `MembershipFormStepDocuments` (Step4)
    - [ ] Step1 : s’assurer que la validation est centralisée dans un schéma (`MembershipIdentitySchema`).
    - [ ] Step4 : s’assurer que l’upload de documents utilise `DocumentRepository` / `StorageService`.

#### Phase 5 : Intégration avec `Register` et `RegisterProvider` ⏳ **À FAIRE**
11. **Adapter `Register` pour utiliser `MembershipFormService`**
    - [ ] Remplacer les appels directs à `createMembershipRequest` par `MembershipFormService.submitNewMembership`.
    - [ ] Gérer les erreurs de soumission via le service.
12. **Adapter `RegisterProvider` si nécessaire**
    - [ ] S’assurer que le provider expose bien `useIsAdminContext` ou un flag équivalent.
    - [ ] Documenter l’API du provider côté domaine `memberships/form`.

#### Phase 6 : Tests d’intégration ⏳ **À FAIRE**
13. **Créer les tests d’intégration** (`src/domains/memberships/__tests__/integration/membership-form.integration.test.tsx`)
    - [ ] Scénario **INT-FORM-01** : remplissage complet du formulaire (Step1 → Step4) et soumission réussie.
    - [ ] Scénario **INT-FORM-02** : création rapide d’une province depuis Step2 → vérifier sélection automatique.
    - [ ] Scénario **INT-FORM-03** : création rapide d’une entreprise depuis Step3 → vérifier sélection automatique.
    - [ ] Scénario **INT-FORM-04** : validation des étapes (erreurs affichées, navigation bloquée si invalide).
    - [ ] Scénario **INT-FORM-05** : sauvegarde/chargement de brouillon (si implémenté).
    - [ ] Scénario **INT-FORM-06** : soumission avec erreur (affichage message d’erreur).

#### Phase 7 : Documentation & finalisation ⏳ **À FAIRE**
14. **Mettre à jour la documentation**
    - [ ] Mettre à jour ce `workflow/README.md` avec les cases cochées.
    - [ ] Compléter `firebase/README.md` (collections/index pour création `membershipRequests`, upload documents).
    - [ ] Compléter `tests/README.md` (checklist détaillée des tests créés).
    - [ ] Compléter `functions/README.md` (Cloud Functions liées : `submitCorrections` déjà existante).
    - [ ] Compléter `notifications/README.md` (notifications après création d’une demande d’adhésion).
    - [ ] Ajouter/mettre à jour les diagrammes `activite/*.puml` et `sequence/*.puml`.

### Priorités
- **Critique** : Phase 2 (service `MembershipFormService`) + Phase 3 (modals de création rapide).
- **Important** : Phase 4 (refactor steps) + Phase 5 (intégration Register) + Phase 6 (tests intégration).
- **Finalisation** : Phase 7 (docs, diagrammes).

### Suivi
- Utiliser cette checklist comme référence pendant l’implémentation.
- Chaque phase peut être réalisée dans une PR distincte pour faciliter les reviews.
- Noter que certaines modals géographie existent déjà (`AddProvinceModal`, `AddCommuneModal`, etc.) : vérifier leur état avant de les recréer.

