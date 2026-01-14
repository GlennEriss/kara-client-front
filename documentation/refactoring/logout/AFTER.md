# État Cible du Module Logout - APRÈS Refactoring

## 🎯 Objectifs

1. Respecter l'architecture : Services → Hooks → Components
2. Centraliser la logique de logout dans un service
3. Créer un hook React réutilisable
4. Avoir une suite de tests complète
5. Améliorer la gestion d'erreurs

## 📋 Structure Cible

### Architecture

```
src/domains/auth/
├── services/
│   ├── ILogoutService.ts      # Interface
│   └── LogoutService.ts       # Implémentation
├── hooks/
│   ├── useLogout.ts           # Hook React
│   └── index.ts               # Export barrel
└── __tests__/
    ├── services/
    │   └── LogoutService.test.ts
    ├── hooks/
    │   └── useLogout.test.tsx
    └── integration/
        └── logout.integration.test.tsx
```

## ✅ Améliorations Prévues

### 1. Service LogoutService

- Méthode `logout()` qui :
  - Déconnecte Firebase
  - Supprime le cookie
  - Retourne un résultat (succès/erreur)
  - Gère les erreurs proprement

### 2. Hook useLogout

- Hook React qui :
  - Utilise `LogoutService` via `ServiceFactory`
  - Gère l'état de chargement
  - Gère les erreurs
  - Fournit une fonction `logout()` à utiliser dans les composants

### 3. Composants

- `AppSidebar` utilise `useLogout()`
- `auth-utils.ts` utilise `LogoutService` (pour compatibilité)

### 4. Tests

- Tests unitaires pour `LogoutService`
- Tests unitaires pour `useLogout`
- Tests d'intégration
- Tests E2E

## 🔄 Migration

1. Créer `ILogoutService` et `LogoutService`
2. Intégrer dans `ServiceFactory`
3. Créer `useLogout` hook
4. Refactoriser `AppSidebar`
5. Mettre à jour `auth-utils.ts`
6. Créer les tests
7. Supprimer l'ancien code
