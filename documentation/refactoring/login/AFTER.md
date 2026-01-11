# État Cible du Module Login - APRÈS Refactoring

## 🎯 Objectifs

1. Respecter l'architecture : Repositories → Services → Hooks → Components
2. Adhérer au design system (couleurs KARA, shadcn UI, responsive)
3. Avoir une suite de tests complète (unitaires, intégration, E2E)
4. Améliorer la maintenabilité et la scalabilité
5. Unifier les différents composants de login

## 📋 Structure Cible

### Architecture Proposée

```
src/
├── domains/
│   └── auth/                          # Nouveau domaine auth
│       ├── entities/
│       │   └── user.types.ts          # Types pour les utilisateurs
│       ├── repositories/
│       │   ├── UserRepository.ts       # Repository pour les utilisateurs
│       │   └── IUserRepository.ts     # Interface du repository
│       ├── services/
│       │   ├── LoginService.ts         # Service de login (via ServiceFactory)
│       │   └── ILoginService.ts        # Interface du service
│       ├── hooks/
│       │   ├── useLogin.ts             # Hook pour le login
│       │   └── useAuth.ts              # Hook unifié pour l'auth
│       ├── schemas/
│       │   └── login.schema.ts        # Schemas Zod
│       ├── components/
│       │   ├── LoginForm.tsx          # Composant de formulaire unifié
│       │   └── LoginPage.tsx          # Page de login
│       └── __tests__/
│           ├── services/
│           │   └── LoginService.test.ts
│           ├── hooks/
│           │   └── useLogin.test.tsx
│           └── integration/
│               └── login.integration.test.tsx
```

## ✅ Améliorations Prévues

### 1. Architecture
- ✅ Créer `UserRepository` pour gérer l'accès aux utilisateurs
- ✅ Refactoriser `LoginService` pour utiliser le repository
- ✅ Utiliser `ServiceFactory` au lieu du singleton
- ✅ Séparer la logique métier des composants

### 2. Design System
- ✅ Utiliser les couleurs KARA (`--color-kara-primary-dark`, etc.)
- ✅ Utiliser les composants shadcn UI de manière cohérente
- ✅ Améliorer le responsive (mobile, tablette, desktop)
- ✅ Respecter le pattern de module défini dans `DESIGN_SYSTEM_MODULE_PATTERN.md`

### 3. Tests
- ✅ Tests unitaires pour `LoginService`
- ✅ Tests unitaires pour `useLogin`
- ✅ Tests d'intégration pour le flux complet
- ✅ Tests E2E fonctionnels

### 4. Code Quality
- ✅ Gestion d'erreurs avec des types spécifiques
- ✅ Utilisation de `useAuth` unifié
- ✅ Gestion des tokens améliorée
- ✅ Suppression des casts `any`

### 5. Sécurité
- ✅ Vérifications de sécurité améliorées
- ✅ Gestion des tokens optimisée
- ✅ Rate limiting (si nécessaire)

## 🔄 Flux Cible

1. Utilisateur remplit le formulaire (matricule, email, password)
2. Validation Zod côté client
3. `useLogin` appelle `LoginService.signIn()` (via ServiceFactory)
4. `LoginService` :
   - Utilise `UserRepository` pour vérifier l'existence de l'utilisateur
   - Tente la connexion Firebase avec `signInWithEmailAndPassword`
   - Vérifie que l'UID correspond au matricule
   - Retourne le token ID et les informations utilisateur
5. Le hook utilise `useAuth` pour mettre à jour l'état
6. Gestion du token améliorée (via un service dédié ou hook)
7. Vérification du rôle et redirection

## 📝 Checklist de Refactoring

- [ ] Créer le diagramme de use case
- [ ] Créer le diagramme de classes
- [ ] Créer `UserRepository` et `IUserRepository`
- [ ] Refactoriser `LoginService` pour utiliser le repository
- [ ] Intégrer `LoginService` dans `ServiceFactory`
- [ ] Unifier `useAuth` (supprimer la duplication)
- [ ] Refactoriser les composants selon le design system
- [ ] Créer les tests unitaires
- [ ] Créer les tests d'intégration
- [ ] Améliorer les tests E2E
- [ ] Vérifier le responsive
- [ ] Mettre à jour la documentation
