# État Cible du Module Register (APRÈS)

## Structure DDD Cible

```
src/domains/auth/registration/
├── entities/
│   ├── registration.types.ts          # Types métier
│   └── registration-form.types.ts      # Types formulaire
├── repositories/
│   ├── IRegistrationRepository.ts      # Interface repository
│   └── RegistrationRepository.ts       # Implémentation Firestore
├── services/
│   ├── IRegistrationService.ts        # Interface service
│   ├── RegistrationService.ts         # Logique métier principale
│   ├── IRegistrationCacheService.ts   # Interface cache
│   └── RegistrationCacheService.ts    # Gestion cache localStorage
├── hooks/
│   ├── useRegistration.ts               # Hook principal
│   ├── useRegistrationSteps.ts        # Gestion étapes
│   ├── useRegistrationValidation.ts   # Validation
│   └── index.ts
├── components/
│   ├── RegistrationFormV2.tsx         # Composant principal V2
│   ├── steps/
│   │   ├── IdentityStepV2.tsx
│   │   ├── AddressStepV2.tsx
│   │   ├── CompanyStepV2.tsx
│   │   ├── DocumentsStepV2.tsx
│   │   └── ConfirmationStepV2.tsx
│   └── index.ts
├── schemas/
│   └── registration.schema.ts         # Schémas Zod
└── __tests__/
    ├── services/
    ├── repositories/
    ├── hooks/
    └── integration/
```

## Architecture Cible

### Entities

#### `registration.types.ts`
```typescript
export interface RegistrationFormData {
  identity: IdentityFormData
  address: AddressFormData
  company: CompanyFormData
  documents: DocumentsFormData
}

export interface RegistrationStep {
  id: number
  title: string
  description: string
  isCompleted: boolean
  isValid: boolean
}

export interface RegistrationCache {
  formData: RegistrationFormData
  currentStep: number
  completedSteps: number[]
  timestamp: number
  membershipId?: string
}
```

### Repositories

#### `IRegistrationRepository.ts`
```typescript
export interface IRegistrationRepository {
  create(data: RegistrationFormData): Promise<string>
  getById(id: string): Promise<MembershipRequest | null>
  update(id: string, data: Partial<RegistrationFormData>): Promise<void>
  verifySecurityCode(requestId: string, code: string): Promise<boolean>
}
```

### Services

#### `IRegistrationService.ts`
```typescript
export interface IRegistrationService {
  submitRegistration(data: RegistrationFormData): Promise<string>
  validateStep(step: number, data: Partial<RegistrationFormData>): Promise<boolean>
  verifySecurityCode(requestId: string, code: string): Promise<boolean>
}
```

#### `IRegistrationCacheService.ts`
```typescript
export interface IRegistrationCacheService {
  save(data: RegistrationCache): void
  load(): RegistrationCache | null
  clear(): void
  hasValidCache(): boolean
  isExpired(): boolean
}
```

### Hooks

#### `useRegistration.ts`
- Hook principal qui orchestre le formulaire
- Utilise `RegistrationService` et `RegistrationCacheService`
- Gère l'état du formulaire avec `react-hook-form`

#### `useRegistrationSteps.ts`
- Gestion de la navigation entre les étapes
- Validation des étapes
- Persistance de l'état

#### `useRegistrationValidation.ts`
- Validation des champs
- Validation des étapes
- Messages d'erreur

## Flux de Données Cible

```
RegistrationPage
  └── RegistrationFormV2
      ├── useRegistration (hook principal)
      │   ├── RegistrationService (logique métier)
      │   │   └── RegistrationRepository (accès données)
      │   └── RegistrationCacheService (cache)
      ├── useRegistrationSteps (navigation)
      └── useRegistrationValidation (validation)
      │
      ├── IdentityStepV2
      ├── AddressStepV2
      ├── CompanyStepV2
      └── DocumentsStepV2
```

## Améliorations Apportées

### 1. Séparation des Responsabilités
- ✅ Logique métier dans les services
- ✅ Accès aux données dans les repositories
- ✅ Gestion du cache dans un service dédié
- ✅ Présentation dans les composants

### 2. Testabilité
- ✅ Services testables isolément
- ✅ Repositories mockables
- ✅ Hooks testables avec React Testing Library
- ✅ Composants testables avec E2E

### 3. Gestion d'Erreurs
- ✅ Erreurs typées et gérées correctement
- ✅ Messages d'erreur clairs pour l'utilisateur
- ✅ Retry automatique pour les erreurs réseau
- ✅ Logging des erreurs pour le debugging

### 4. Performance
- ✅ Optimisation des re-renders avec React.memo
- ✅ Lazy loading optimisé
- ✅ Debounce amélioré pour la sauvegarde
- ✅ Cache intelligent avec expiration

### 5. Maintenabilité
- ✅ Code modulaire et réutilisable
- ✅ Documentation complète
- ✅ Tests complets (80%+ couverture)
- ✅ Types TypeScript stricts

## Migration des Fonctionnalités

### Cache
- ✅ `RegistrationCacheService` gère le cache localStorage
- ✅ Expiration automatique du cache
- ✅ Versioning du cache pour migrations
- ✅ Sauvegarde automatique avec debounce

### Validation
- ✅ Validation par étape avec Zod
- ✅ Messages d'erreur clairs
- ✅ Validation croisée entre champs
- ✅ Validation asynchrone pour les vérifications serveur

### Navigation
- ✅ Navigation fluide entre les étapes
- ✅ Scroll automatique optimisé
- ✅ Persistance de l'état des étapes
- ✅ Blocage de navigation si étape invalide

### Soumission
- ✅ Soumission avec gestion d'erreurs complète
- ✅ Retry automatique en cas d'échec réseau
- ✅ Code de sécurité pour les corrections
- ✅ Confirmation de soumission

## Tests

### Tests Unitaires
- ✅ `RegistrationService.test.ts` - Logique métier
- ✅ `RegistrationRepository.test.ts` - Accès données
- ✅ `RegistrationCacheService.test.ts` - Gestion cache
- ✅ `useRegistration.test.tsx` - Hook principal
- ✅ `useRegistrationSteps.test.tsx` - Navigation
- ✅ `useRegistrationValidation.test.tsx` - Validation

### Tests d'Intégration
- ✅ `registration.integration.test.tsx` - Flux complet
- ✅ Tests de cache
- ✅ Tests de validation
- ✅ Tests de soumission

### Tests E2E
- ✅ `registration.spec.ts` - Scénarios utilisateur complets
- ✅ Tests de navigation
- ✅ Tests de validation
- ✅ Tests de soumission
- ✅ Tests de cache

## Couverture de Code

Objectif : **80% minimum** pour :
- `src/domains/auth/registration/services/**`
- `src/domains/auth/registration/repositories/**`
- `src/domains/auth/registration/hooks/**`
