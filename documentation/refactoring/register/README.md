# Refactoring du Module Register

## Objectifs

Refactoriser le formulaire d'inscription (`/register`) selon l'architecture Domain-Driven Design (DDD) pour :

1. **Corriger les bugs existants** : Le formulaire présente de nombreux bugs à identifier et corriger
2. **Améliorer la maintenabilité** : Séparer la logique métier de la présentation
3. **Améliorer la testabilité** : Créer des tests unitaires, d'intégration et E2E complets
4. **Atteindre 80% de couverture de code** pour le module refactorisé
5. **Améliorer l'expérience utilisateur** : Corriger les problèmes de validation, navigation et soumission

## Structure Actuelle (AVANT)

```
src/
├── components/register/
│   ├── Register.tsx          # Composant principal (596 lignes)
│   ├── Step1.tsx             # Étape 1: Identité
│   ├── Step2.tsx             # Étape 2: Adresse
│   ├── Step3.tsx             # Étape 3: Entreprise
│   ├── Step4.tsx             # Étape 4: Documents
│   ├── Step5.tsx             # Étape 5: Confirmation
│   └── register.data.ts      # Données statiques
├── providers/
│   └── RegisterProvider.tsx   # Provider avec toute la logique métier (982 lignes)
├── schemas/
│   └── schemas.ts             # Schémas de validation Zod
└── hooks/register/
    ├── useRegisterForm.ts
    ├── useStep1Form.ts
    └── useStep2Form.ts
```

## Structure Cible (APRÈS)

```
src/domains/auth/registration/
├── entities/
│   ├── registration.types.ts          # Types TypeScript
│   └── registration-form.types.ts     # Types du formulaire
├── repositories/
│   ├── IRegistrationRepository.ts     # Interface
│   └── RegistrationRepository.ts      # Implémentation Firestore
├── services/
│   ├── IRegistrationService.ts        # Interface
│   ├── RegistrationService.ts         # Logique métier
│   ├── IRegistrationCacheService.ts   # Interface cache
│   └── RegistrationCacheService.ts    # Gestion du cache localStorage
├── hooks/
│   ├── useRegistration.ts              # Hook principal
│   ├── useRegistrationSteps.ts        # Gestion des étapes
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
│   └── registration.schema.ts          # Schémas Zod
└── __tests__/
    ├── services/
    ├── repositories/
    ├── hooks/
    └── integration/
```

## Bugs Identifiés à Corriger

### 1. Validation
- [ ] Validation des étapes qui ne fonctionne pas correctement
- [ ] Messages d'erreur qui ne s'affichent pas
- [ ] Validation croisée entre les champs qui échoue

### 2. Navigation
- [ ] Navigation entre les étapes qui peut être bloquée
- [ ] Scroll automatique qui ne fonctionne pas toujours
- [ ] État des étapes complétées qui n'est pas persisté correctement

### 3. Cache
- [ ] Sauvegarde automatique qui ne fonctionne pas toujours
- [ ] Restauration du cache qui peut échouer
- [ ] Expiration du cache qui n'est pas gérée correctement

### 4. Soumission
- [ ] Soumission qui peut échouer silencieusement
- [ ] Gestion des erreurs de soumission insuffisante
- [ ] Code de sécurité pour les corrections qui ne fonctionne pas

### 5. UX/UI
- [ ] Indicateurs de chargement qui ne s'affichent pas
- [ ] Messages de succès/erreur qui ne sont pas clairs
- [ ] Responsive design qui peut être amélioré

## Plan de Migration

### Phase 1: Analyse et Documentation
- [x] Créer la documentation (README.md, BEFORE.md, AFTER.md)
- [ ] Identifier tous les bugs existants
- [ ] Documenter les problèmes identifiés

### Phase 2: Création de la Structure DDD
- [ ] Créer les entités (`entities/`)
- [ ] Créer les repositories (`repositories/`)
- [ ] Créer les services (`services/`)
- [ ] Créer les hooks (`hooks/`)
- [ ] Créer les schémas (`schemas/`)

### Phase 3: Migration des Composants
- [ ] Créer les composants V2 (`components/`)
- [ ] Migrer la logique métier vers les services
- [ ] Migrer la gestion d'état vers les hooks
- [ ] Mettre à jour les imports dans l'application

### Phase 4: Tests
- [ ] Tests unitaires pour les services
- [ ] Tests unitaires pour les repositories
- [ ] Tests unitaires pour les hooks
- [ ] Tests d'intégration
- [ ] Tests E2E
- [ ] Atteindre 80% de couverture

### Phase 5: Nettoyage
- [ ] Supprimer les fichiers legacy
- [ ] Mettre à jour la documentation
- [ ] Vérifier que tout fonctionne

## Notes

- Le formulaire utilise actuellement `react-hook-form` avec `zod` pour la validation
- Le cache est géré via `localStorage` avec expiration
- La soumission crée une `MembershipRequest` dans Firestore
- Le système de correction utilise un code de sécurité
