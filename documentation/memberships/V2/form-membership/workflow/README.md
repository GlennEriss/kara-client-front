## Workflow d'implémentation – Formulaire membre (V2)

### Objectif
Refondre le formulaire d'adhésion (`Register` + `Step1`–`Step4`) pour améliorer l'expérience admin (modals de création rapide, combobox avec recherche/tri) tout en conservant l'UI/UX existante et en alignant la logique sur les services de domaine `memberships`.

### Séquence d'implémentation (ordre recommandé)

#### Phase 1 : Fondations & cartographie ✅ **TERMINÉ**
1. **Cartographier V1**
   - [x] Analyser `src/components/register/Register.tsx` et `Step1.tsx`–`Step4.tsx`.
   - [x] Noter les hooks utilisés (`useProvinces`, `useDepartments`, `useDistricts`, `useQuarters` depuis `useGeographie`).
   - [x] Identifier les points de friction (création de référentiels nécessitant navigation vers `/geographie`, `/companies`, `/jobs`).
   - [x] Vérifier l'état actuel des modals (✅ **DÉJÀ INTÉGRÉES** dans Step2 et Step3).
   - [x] Document créé : `CARTOGRAPHIE_V1.md`
2. **Définir les contrats de données V2**
   - [x] Définir le type `MembershipFormData` (réutilise `RegisterFormData` existant dans `@/types/types.ts`).
   - [x] Identifier les services de domaine à utiliser (`GeographyService`, `CompanyService`, `ProfessionService`, `MembershipFormService`).

#### Phase 2 : Service de domaine `MembershipFormService` ✅ **TERMINÉ**
3. **Créer le service** (`src/domains/memberships/services/MembershipFormService.ts`)
   - [x] Méthode `submitNewMembership(formData)` :
     - [x] Crée une `MembershipRequest` via `MembershipRepositoryV2.create()`.
     - [x] **Upload des documents via `DocumentRepository`** : Les photos (profil, documents recto/verso) sont uploadées via `DocumentRepository.uploadImage()`.
     - [x] **Gestion centralisée des erreurs** : Utilise `MembershipErrorHandler` pour normaliser et formater les erreurs.
     - [x] Gère les erreurs et retourne un résultat typé (`SubmitMembershipResult`).
     - [x] Supprime le brouillon après soumission réussie.
4. **Créer le gestionnaire d'erreurs** (`src/domains/memberships/services/MembershipErrorHandler.ts`)
   - [x] Normalise les erreurs de différentes sources (Firebase, Firestore, Storage, etc.).
   - [x] Fournit des messages utilisateur-friendly et cohérents.
   - [x] Catégorise les erreurs (validation, permissions, réseau, etc.).
   - [x] Log les erreurs de manière cohérente.
   - [x] Méthode `submitCorrection(formData, requestId, securityCode)` :
     - [x] Appelle la Cloud Function `submitCorrections`.
     - [x] Gère les erreurs Firebase Functions de manière typée.
     - [x] Supprime le brouillon après soumission réussie.
   - [x] Méthode `saveDraft(formData)` / `loadDraft()` :
     - [x] Persistance locale (localStorage) avec expiration (7 jours).
     - [x] Nettoyage automatique des fichiers non sérialisables.
     - [x] Méthodes utilitaires : `hasDraft()`, `clearDraft()`, `getDraftAge()`.
5. **Tests unitaires du service**
   - [ ] Mock du repository (`MembershipRepositoryV2.create()`).
   - [ ] Mock de Firebase Functions (`submitCorrections`).
   - [ ] Mock du gestionnaire d'erreurs (`MembershipErrorHandler`).
   - [ ] Cas heureux : soumission réussie.
   - [ ] Cas erreur : validation échoue, upload échoue, etc.
   - [ ] Tests des brouillons (sauvegarde, chargement, expiration).
   - [ ] Tests de gestion des erreurs : vérifier que les erreurs sont normalisées correctement.

#### Phase 3 : Modals de création rapide (référentiels) ✅ **DÉJÀ INTÉGRÉES**
5. **Vérifier/améliorer les modals géographie existantes**
   - [x] `AddProvinceModal` (✅ intégrée dans Step2).
   - [x] `AddCommuneModal` (✅ intégrée dans Step2).
   - [x] `AddDistrictModal` (✅ intégrée dans Step2).
   - [x] `AddQuarterModal` (✅ intégrée dans Step2).
   - [x] Vérifier que toutes invalident bien les caches React Query après création (✅ confirmé dans le code).
   - [ ] Vérifier que toutes sélectionnent automatiquement la nouvelle valeur dans la combobox (à tester).
6. **Créer/améliorer les modals référentiels pro**
   - [x] `AddCompanyModal` (✅ intégrée dans Step3).
   - [x] `AddProfessionModal` (✅ intégrée dans Step3).
   - [x] Intégration avec `CompanyService` / `ProfessionService` (✅ via `CompanyCombobox` et `ProfessionCombobox`).
   - [x] Invalidation des caches + sélection automatique (✅ confirmé dans le code).
7. **Tests unitaires des modals**
   - [ ] Vérifier l'ouverture/fermeture.
   - [ ] Vérifier la création d'une nouvelle entité.
   - [ ] Vérifier l'invalidation des caches React Query.
   - [ ] Vérifier la sélection automatique dans la combobox parente.

#### Phase 4 : Refactor des steps (Step2, Step3) ✅ **TERMINÉ**
8. **Améliorer `MembershipFormStepAddress`** (refactor de `Step2.tsx`)
   - [x] Intégrer les modals de création rapide (boutons `+`) (✅ déjà fait).
   - [x] Utiliser `useIsAdminContext` pour afficher les modals uniquement côté admin (✅ déjà fait).
   - [x] Tri alphabétique des provinces (✅ déjà fait).
   - [x] Convertir les Select en Combobox avec recherche (✅ **TERMINÉ** - ProvinceCombobox, CommuneCombobox, DistrictCombobox, QuarterCombobox créés).
   - [x] Centraliser la logique de cascade Province → Ville → Arrondissement → Quartier dans un hook/service (✅ **TERMINÉ** - Hook `useAddressCascade` créé).
   - [x] Refactor Step1 et Step4 (validation centralisée, upload documents) (✅ **TERMINÉ** - Hooks `useDocumentUpload` et `useStep4Validation` créés).
9. **Améliorer `MembershipFormStepCompany`** (refactor de `Step3.tsx`)
   - [x] Intégrer `CompanyCombobox` et `ProfessionCombobox` avec recherche + tri (✅ déjà fait).
   - [x] Intégrer `AddCompanyModal` et `AddProfessionModal` (✅ déjà fait).
   - [x] Utiliser `useIsAdminContext` pour les modals (✅ déjà fait).
10. **Refactor `MembershipFormStepIdentity`** (Step1) et `MembershipFormStepDocuments` (Step4)
    - [ ] Step1 : s'assurer que la validation est centralisée dans un schéma (`MembershipIdentitySchema`).
    - [ ] Step4 : s'assurer que l'upload de documents utilise `DocumentRepository` / `StorageService`.

#### Phase 5 : Intégration avec `Register` et `RegisterProvider` ✅ **TERMINÉ**
11. **Adapter `Register` pour utiliser `MembershipFormService`**
   - [x] Remplacer les appels directs à `createMembershipRequest` par `MembershipFormService.submitNewMembership`.
   - [x] Remplacer les appels à `updateMembershipRequest` par `MembershipFormService.submitCorrection`.
   - [x] Gérer les erreurs de soumission via le service (résultats typés `SubmitMembershipResult` et `SubmitCorrectionResult`).
   - [x] Intégrer la sauvegarde de brouillon via `MembershipFormService.saveDraft()`.
   - [x] **Utiliser `MembershipRepositoryV2`** : Le service utilise maintenant le repository V2 pour créer les demandes.
12. **Adapter `RegisterProvider` si nécessaire**
   - [x] S'assurer que le provider expose bien `useIsAdminContext` ou un flag équivalent (✅ `useIsAdminContext` est utilisé dans Step2 et Step3).
   - [x] Centraliser la logique de soumission dans `MembershipFormService`.
   - [ ] Documenter l'API du provider côté domaine `memberships/form` (optionnel).

#### Phase 6 : Tests d'intégration ⏳ **REPORTÉ**
13. **Créer les tests d'intégration** (`src/domains/memberships/__tests__/integration/membership-form.integration.test.tsx`)
    - [ ] Scénario **INT-FORM-01** : remplissage complet du formulaire (Step1 → Step4) et soumission réussie.
    - [ ] Scénario **INT-FORM-02** : création rapide d'une province depuis Step2 → vérifier sélection automatique.
    - [ ] Scénario **INT-FORM-03** : création rapide d'une entreprise depuis Step3 → vérifier sélection automatique.
    - [ ] Scénario **INT-FORM-04** : validation des étapes (erreurs affichées, navigation bloquée si invalide).
    - [ ] Scénario **INT-FORM-05** : sauvegarde/chargement de brouillon (si implémenté).
    - [ ] Scénario **INT-FORM-06** : soumission avec erreur (affichage message d'erreur).
    
    **Note** : Les tests d'intégration seront réalisés plus tard. Priorité donnée aux améliorations UX (Combobox).

#### Phase 7 : Documentation & finalisation ⏳ **À FAIRE**
14. **Mettre à jour la documentation**
    - [x] Mettre à jour ce `workflow/README.md` avec les cases cochées.
    - [ ] Compléter `firebase/README.md` (collections/index pour création `membershipRequests`, upload documents).
    - [ ] Compléter `tests/README.md` (checklist détaillée des tests créés).
    - [ ] Compléter `functions/README.md` (Cloud Functions liées : `submitCorrections` déjà existante).
    - [ ] Compléter `notifications/README.md` (notifications après création d'une demande d'adhésion).
    - [ ] Ajouter/mettre à jour les diagrammes `activite/*.puml` et `sequence/*.puml`.

### Priorités
- **Critique** : Phase 2 (service `MembershipFormService`) - Les modals sont déjà intégrées (Phase 3 ✅).
- **Important** : Phase 4 (améliorations Step2) + Phase 5 (intégration Register) + Phase 6 (tests intégration).
- **Finalisation** : Phase 7 (docs, diagrammes).

### Suivi
- Utiliser cette checklist comme référence pendant l'implémentation.
- Chaque phase peut être réalisée dans une PR distincte pour faciliter les reviews.
- **Note importante** : Les modals de création rapide sont **déjà intégrées** dans Step2 et Step3. La Phase 3 est donc largement terminée. La priorité est maintenant sur la Phase 2 (service `MembershipFormService`).

### État actuel
- ✅ Phase 1 : Cartographie terminée
- ✅ Phase 3 : Modals déjà intégrées (Step2 et Step3)
- ⚠️ Phase 4 : Partiellement fait (modals intégrées, mais Select pas encore convertis en Combobox)
- ⏳ Phase 2 : Service `MembershipFormService` à créer (priorité 1)
- ⏳ Phase 5 : Intégration avec Register/Provider
- ⏳ Phase 6 : Tests d'intégration
- ⏳ Phase 7 : Documentation finale
