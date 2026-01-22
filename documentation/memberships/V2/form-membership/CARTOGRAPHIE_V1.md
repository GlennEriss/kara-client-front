# Cartographie V1 – Formulaire membre

## 1. Composants principaux

### 1.1. `Register.tsx` (`src/components/register/Register.tsx`)
- **Rôle** : Container principal du formulaire multi-étapes
- **Fonctionnalités** :
  - Gestion de la navigation entre étapes (Step1 → Step4)
  - Affichage de la progression
  - Boutons de navigation (Précédent, Suivant, Soumettre)
  - Gestion du mode correction (Step5 pour code de sécurité)
  - Sauvegarde/chargement du cache (localStorage)
- **Dépendances** :
  - `RegisterProvider` (contexte global du formulaire)
  - Composants Step (lazy-loaded)
  - `useRegister()` hook du provider

### 1.2. `Step1.tsx` – Identité
- **Rôle** : Saisie des informations personnelles
- **Champs** :
  - Civilité, Nom, Prénom
  - Date de naissance, Lieu de naissance
  - Genre, Nationalité
  - Email, Contacts (téléphone)
  - Photo (upload)
  - Statut marital, Conjoint
  - Lieu de prière, Religion
  - Code intermédiaire
  - Véhicule (hasCar)
- **Validation** : Schéma Zod (`registerSchema.identity`)
- **Hooks utilisés** : Aucun hook externe spécifique

### 1.3. `Step2.tsx` – Adresse
- **Rôle** : Saisie de l'adresse de résidence
- **Champs** :
  - Province (Select avec tri alphabétique)
  - Ville/Commune (Select, dépend de Province)
  - Arrondissement (Select, dépend de Commune)
  - Quartier (Select, dépend de Arrondissement)
  - Informations complémentaires (textarea)
- **État actuel** :
  - ✅ **Modals de création rapide INTÉGRÉES** : `AddProvinceModal`, `AddCommuneModal`, `AddDistrictModal`, `AddQuarterModal`
  - ✅ Tri alphabétique des provinces implémenté
  - ✅ Utilisation de `useIsAdminContext()` pour afficher les modals uniquement côté admin
  - ✅ Invalidation des caches React Query après création
  - ⚠️ Les Select ne sont pas des Combobox avec recherche (utilisent `Select` de shadcn/ui)
- **Hooks utilisés** :
  - `useProvinces()`, `useDepartments()`, `useDistricts()`, `useQuarters()` depuis `@/domains/infrastructure/geography/hooks/useGeographie`
  - `useIsAdminContext()` pour détecter le contexte admin
  - `useQueryClient()` pour invalider les caches

### 1.4. `Step3.tsx` – Entreprise
- **Rôle** : Saisie des informations professionnelles
- **Champs** :
  - Employé (Switch)
  - Nom de l'entreprise (Combobox avec recherche)
  - Adresse de l'entreprise (Province, Ville, District avec modals)
  - Profession (Combobox avec recherche)
  - Ancienneté (Input avec suggestions)
- **État actuel** :
  - ✅ **Modals de création rapide INTÉGRÉES** : `AddCompanyModal`, `AddProfessionModal`
  - ✅ **Combobox avec recherche** : `CompanyCombobox`, `ProfessionCombobox` (depuis `domains/infrastructure/references/components/forms/`)
  - ✅ Utilisation de `useIsAdminContext()` pour afficher les modals uniquement côté admin
  - ✅ Invalidation des caches React Query après création
  - ✅ Modals géographie également intégrées pour l'adresse de l'entreprise
- **Hooks utilisés** :
  - `CompanyCombobox` et `ProfessionCombobox` (composants avec hooks internes)
  - `useProvinces()`, `useDepartments()`, `useDistricts()`, `useQuarters()` pour l'adresse entreprise
  - `useIsAdminContext()` pour détecter le contexte admin
  - `useQueryClient()` pour invalider les caches

### 1.5. `Step4.tsx` – Documents
- **Rôle** : Upload des pièces d'identité
- **Champs** :
  - Type de document (Select)
  - Numéro de document
  - Date d'émission
  - Date d'expiration
  - Lieu d'émission
  - Photos recto/verso du document
- **Hooks utilisés** :
  - Upload via `createFile` depuis `@/db/upload-image.db`

### 1.6. `Step5.tsx` – Code de sécurité (corrections)
- **Rôle** : Vérification du code de sécurité pour les corrections
- **Champs** :
  - Code de sécurité (Input)
- **Fonctionnalités** :
  - Vérification via `verifySecurityCode()` du provider

## 2. Provider et contexte

### 2.1. `RegisterProvider.tsx` (`src/providers/RegisterProvider.tsx`)
- **Rôle** : Contexte global du formulaire
- **État géré** :
  - `currentStep` : étape actuelle (1-5)
  - `completedSteps` : étapes complétées
  - `form` : instance react-hook-form
  - `isLoading`, `isSubmitting` : états de chargement
  - `isCacheLoaded` : cache chargé depuis localStorage
  - `isSubmitted` : formulaire soumis
  - `correctionRequest` : demande de correction en cours
  - `securityCodeInput` : code de sécurité saisi
- **Méthodes exposées** :
  - `nextStep()` : validation + passage à l'étape suivante
  - `prevStep()` : retour à l'étape précédente
  - `submitForm()` : soumission du formulaire
  - `resetForm()` : réinitialisation
  - `saveToCache()` / `hasCachedData()` / `clearCache()` : gestion du cache
  - `validateCurrentStep()` : validation de l'étape courante
  - `verifySecurityCode()` : vérification du code de sécurité
- **Soumission** :
  - Appel direct à `createMembershipRequest` (probablement depuis `@/db/membership.db` ou service)
  - Upload des documents via `createFile`

## 3. Hooks et services utilisés

### 3.1. Géographie
- **Hook** : `useAddresses()` (à vérifier dans `@/hooks/useGeographie`)
- **Problème** : Pas de modal de création rapide intégrée
- **Solution V2** : Utiliser les modals existantes dans `domains/infrastructure/geography/components/modals/`

### 3.2. Entreprises
- **Hook** : `useCompanies()` (à vérifier dans `@/hooks/useCompanies`)
- **Problème** : Pas de modal de création rapide
- **Solution V2** : Créer `AddCompanyModal` dans `domains/infrastructure/references/components/modals/`

### 3.3. Professions
- **Hook** : `useProfessions()` (à vérifier dans `@/hooks/useJobs`)
- **Problème** : Pas de modal de création rapide
- **Solution V2** : Créer `AddProfessionModal` dans `domains/infrastructure/references/components/modals/`

## 4. Points de friction identifiés (RÉSOLUS en partie)

### 4.1. Création de référentiels ✅ **RÉSOLU**
- **Province/Commune/Arrondissement/Quartier** :
  - ✅ Modals de création rapide intégrées dans Step2
  - ✅ Invalidation automatique des caches
  - ⚠️ Les Select ne sont pas des Combobox avec recherche (amélioration possible)

### 4.2. Création d'entreprise ✅ **RÉSOLU**
- **Entreprise** :
  - ✅ Modal de création rapide intégrée dans Step3
  - ✅ Combobox avec recherche (`CompanyCombobox`)
  - ✅ Invalidation automatique des caches

### 4.3. Création de profession ✅ **RÉSOLU**
- **Profession** :
  - ✅ Modal de création rapide intégrée dans Step3
  - ✅ Combobox avec recherche (`ProfessionCombobox`)
  - ✅ Invalidation automatique des caches

### 4.4. Sélection dans les combobox ⚠️ **PARTIELLEMENT RÉSOLU**
- **État actuel** :
  - ✅ Combobox avec recherche pour Entreprise et Profession
  - ⚠️ Select simples (sans recherche) pour Province/Commune/Arrondissement/Quartier dans Step2
  - ✅ Tri alphabétique des provinces implémenté
  - ⚠️ Pas de tri systématique pour tous les Select

## 5. Modals existantes ✅ **DÉJÀ INTÉGRÉES**

### 5.1. Géographie ✅
- `AddProvinceModal` : ✅ Intégrée dans Step2 (`domains/infrastructure/geography/components/modals/`)
- `AddCommuneModal` : ✅ Intégrée dans Step2
- `AddDistrictModal` : ✅ Intégrée dans Step2
- `AddQuarterModal` : ✅ Intégrée dans Step2
- **État** : Toutes fonctionnelles avec invalidation des caches React Query

### 5.2. Référentiels ✅
- `AddCompanyModal` : ✅ Intégrée dans Step3 (`domains/infrastructure/references/components/forms/`)
- `AddProfessionModal` : ✅ Intégrée dans Step3
- **État** : Toutes fonctionnelles avec invalidation des caches React Query

## 6. Services de domaine à utiliser (V2)

### 6.1. Géographie
- `GeographyService` : `domains/infrastructure/geography/services/GeographyService.ts`
- `GeographyRepository` : `domains/infrastructure/geography/repositories/GeographyRepository.ts`

### 6.2. Référentiels
- `CompanyService` : `domains/infrastructure/references/services/CompanyService.ts`
- `ProfessionService` : `domains/infrastructure/references/services/ProfessionService.ts`

### 6.3. Memberships
- `MembershipFormService` : À créer dans `domains/memberships/services/MembershipFormService.ts`
- `MembershipRepositoryV2` : Déjà existant dans `domains/memberships/repositories/MembershipRepositoryV2.ts`

## 7. Structure de données

### 7.1. `RegisterFormData` (déjà défini dans `@/types/types.ts`)
```typescript
export interface RegisterFormData {
  identity: {
    civility: string
    lastName: string
    firstName: string
    birthDate: string
    birthPlace: string
    birthCertificateNumber: string
    prayerPlace: string
    religion: string
    contacts: string[]
    email?: string
    gender: string
    nationality: string
    maritalStatus: string
    spouseLastName?: string
    spouseFirstName?: string
    spousePhone?: string
    intermediaryCode?: string
    hasCar: boolean
    photo?: string | File
    photoURL?: string | null
    photoPath?: string | null
  }
  address: {
    provinceId?: string
    communeId?: string
    districtId?: string
    quarterId?: string
    province: string
    city: string
    district: string
    arrondissement: string
    additionalInfo?: string
  }
  company: {
    isEmployed: boolean
    companyName?: string
    companyAddress?: {
      province?: string
      city?: string
      district?: string
    }
    profession?: string
    seniority?: string
  }
  documents: {
    identityDocument: string
    customDocumentType?: string
    identityDocumentNumber: string
    documentPhotoFront?: string | File
    documentPhotoBack?: string | File
    expirationDate: string
    issuingPlace: string
    issuingDate: string
    termsAccepted: boolean
    documentPhotoFrontURL?: string | null
    documentPhotoBackURL?: string | null
    documentPhotoFrontPath?: string | null
    documentPhotoBackPath?: string | null
  }
}
```

## 8. Routes et navigation

### 8.1. Routes actuelles
- `/memberships/add` : Page de création de membre (admin)
- `/geographie` : Page de gestion de la géographie
- `/companies` : Page de gestion des entreprises
- `/jobs` : Page de gestion des professions

### 8.2. Navigation problématique
- L'admin doit quitter `/memberships/add` pour créer des référentiels
- Perte de contexte lors du retour

## 9. Prochaines étapes (Phase 1)

- [x] Cartographier les composants V1
- [x] Identifier les hooks utilisés
- [x] Identifier les points de friction
- [ ] Vérifier l'état des modals géographie existantes
- [ ] Définir le type `MembershipFormData` V2 (peut réutiliser `RegisterFormData`)
- [ ] Identifier les services de domaine à utiliser
