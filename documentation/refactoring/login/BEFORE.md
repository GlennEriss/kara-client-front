# État Actuel du Module Login - AVANT Refactoring

## 📋 Structure Actuelle

### Composants
- `src/components/login/AdminLogin.tsx` - Login pour les admins
- `src/components/login/LoginMembership.tsx` - Login multi-étapes pour les membres
- `src/components/login/LoginMembershipWithEmailAndPassword.tsx` - Login simple avec email/password

### Hooks
- `src/hooks/login/useLogin.ts` - Hook principal pour le login membre
- `src/hooks/useAuth.ts` - Hook pour l'état d'authentification (dupliqué avec `src/hooks/auth/useAuth.ts`)

### Services
- `src/services/login/LoginService.ts` - Service de login (singleton)

### Schemas
- `src/schemas/login.schema.ts` - Schema Zod pour la validation

### Médiateurs
- `src/mediators/LoginMediator.ts` - Médiateur pour le formulaire
- `src/factories/LoginMediatorFactory.ts` - Factory pour créer le médiateur

## 🔴 Problèmes Identifiés

### 1. Architecture
- ❌ Pas de Repository pour les utilisateurs (accès direct à l'API)
- ❌ Service utilise un singleton au lieu d'être injecté via ServiceFactory
- ❌ Logique métier mélangée dans les composants (AdminLogin.tsx)
- ❌ Duplication de code entre AdminLogin et LoginMembershipWithEmailAndPassword

### 2. Design System
- ⚠️ Couleurs en dur dans les composants (#10b981, #ef4444)
- ⚠️ Pas d'utilisation cohérente des couleurs KARA
- ⚠️ Responsive à vérifier

### 3. Tests
- ❌ Aucun test unitaire pour LoginService
- ❌ Aucun test unitaire pour useLogin
- ❌ Tests E2E incomplets (problème d'authentification)

### 4. Code Quality
- ⚠️ Gestion d'erreurs inconsistante
- ⚠️ Accès direct à `auth.currentUser` avec cast `any`
- ⚠️ Parsing JSON manuel des custom attributes
- ⚠️ Cookie géré manuellement dans le hook

### 5. Sécurité
- ⚠️ Vérification utilisateur via API avant login (peut être optimisé)
- ⚠️ Gestion des tokens à améliorer

## 📊 Flux Actuel

1. Utilisateur remplit le formulaire (matricule, email, password)
2. Validation Zod côté client
3. `useLogin` appelle `LoginService.signIn()`
4. `LoginService` :
   - Vérifie l'existence de l'utilisateur via API `/api/firebase/auth/get-user/by-uid`
   - Tente la connexion Firebase avec `signInWithEmailAndPassword`
   - Vérifie que l'UID correspond au matricule
   - Retourne le token ID
5. Le hook sauvegarde le token dans un cookie
6. Vérification du rôle et redirection

## 🔍 Points d'Amélioration

1. **Créer un UserRepository** pour gérer l'accès aux utilisateurs
2. **Refactoriser LoginService** pour utiliser le repository
3. **Unifier les composants de login** (AdminLogin vs LoginMembership)
4. **Améliorer la gestion des erreurs** avec des types d'erreurs spécifiques
5. **Créer des tests complets** (unitaires, intégration, E2E)
6. **Respecter le design system** (couleurs KARA, shadcn UI)
7. **Améliorer la sécurité** (gestion des tokens, rate limiting)
