# Refactoring du Module Logout

## 📋 Objectif

Refactoriser le module logout selon le workflow défini dans `documentation/WORKFLOW.md` pour :
- Améliorer la qualité du code
- Respecter l'architecture (Services → Hooks → Components)
- Adhérer au design system (couleurs KARA, shadcn UI)
- Créer une suite de tests complète (unitaires, intégration, E2E)
- Améliorer la maintenabilité et la scalabilité

## 🎯 Problèmes Identifiés

1. **Architecture** : Le logout est dispersé dans `src/lib/auth-utils.ts` et `AppSidebar.tsx`
2. **Pas de service** : Pas de service dédié pour le logout
3. **Pas de hook** : Pas de hook React pour gérer le logout
4. **Tests** : Absence de tests unitaires et d'intégration
5. **Gestion d'erreurs** : Gestion d'erreurs inconsistante
6. **Code dupliqué** : Logique de logout dupliquée dans plusieurs endroits

## 📁 Structure Actuelle

```
src/
├── lib/
│   └── auth-utils.ts          # Fonction logout() globale
├── components/
│   └── layout/
│       └── AppSidebar.tsx     # handleLogout() inline
└── domains/
    └── auth/                   # Domaine auth existant
        ├── services/
        │   └── LoginService.ts # Service de login uniquement
        └── hooks/
            └── useLogin.ts    # Hook de login uniquement
```

## 📝 Structure Cible

```
src/
└── domains/
    └── auth/
        ├── services/
        │   ├── ILogoutService.ts    # Interface du service logout
        │   └── LogoutService.ts     # Service de logout
        ├── hooks/
        │   ├── useLogout.ts         # Hook pour le logout
        │   └── index.ts             # Export barrel
        └── __tests__/
            ├── services/
            │   └── LogoutService.test.ts
            ├── hooks/
            │   └── useLogout.test.tsx
            └── integration/
                └── logout.integration.test.tsx
```

## 🔄 Étapes de Refactoring

1. **Créer ILogoutService et LogoutService**
2. **Intégrer LogoutService dans ServiceFactory**
3. **Créer le hook useLogout**
4. **Refactoriser AppSidebar pour utiliser useLogout**
5. **Mettre à jour auth-utils.ts pour utiliser LogoutService**
6. **Créer les tests unitaires**
7. **Créer les tests d'intégration**
8. **Créer les tests E2E**

## ✅ Fonctionnalités à Préserver

- Déconnexion Firebase
- Suppression du cookie d'authentification
- Redirection vers la page de login
- Gestion des erreurs
- Support production/development (secure cookie)
