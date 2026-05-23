# Tests E2E - KARA Association

Ce dossier contient les tests End-to-End (E2E) utilisant Playwright.

## 🚀 Installation

```bash
# Installer Playwright et ses navigateurs
pnpm install
npx playwright install
```

## 📝 Structure

```
e2e/
├── auth.setup.ts          # Configuration d'authentification (s'exécute avant les tests)
├── geographie.spec.ts     # Tests pour le module Géographie
└── README.md              # Ce fichier
```

## 🔧 Configuration

Les tests sont configurés dans `playwright.config.ts` à la racine du projet.

### Variables d'environnement

Pour les tests avec authentification, vous pouvez définir :

```bash
E2E_AUTH_EMAIL=admin@kara.test
E2E_AUTH_PASSWORD=admin123
```

Par défaut, les tests utilisent `admin@kara.test` / `admin123`.

## ▶️ Exécution des tests

```bash
# Exécuter tous les tests
pnpm test:e2e

# Exécuter les tests en mode UI (interactif)
pnpm test:e2e:ui

# Exécuter un test spécifique
pnpm test:e2e geographie

# Exécuter les tests en mode debug
pnpm test:e2e:debug
```

## 🔍 Tests disponibles

### Géographie (`geographie.spec.ts`)
- Affichage de la page de géographie
- Création d'une province
- Affichage des listes
- Navigation entre les onglets
- Formulaire d'inscription publique

## 📋 Bonnes pratiques

1. **Tests isolés** : Chaque test doit être indépendant
2. **Sélecteurs robustes** : Utiliser `data-testid` quand possible
3. **Timeouts** : Utiliser des timeouts raisonnables (5-10s pour les interactions)
4. **Assertions claires** : Vérifier l'état attendu explicitement
5. **Nettoyage** : Les tests doivent nettoyer après eux (ou utiliser des données de test)

## 🔐 Authentification

L'authentification est gérée automatiquement via `auth.setup.ts`. L'état d'authentification est sauvegardé dans `playwright/.auth/admin.json` et réutilisé pour tous les tests.

Pour les tests de pages publiques (comme `/register`), créer des fichiers `*.public.spec.ts` qui ne nécessitent pas d'authentification.

## 📊 Rapports

Après l'exécution des tests, un rapport HTML est généré :

```bash
npx playwright show-report
```

## 🐛 Debugging

Pour déboguer un test :

```bash
# Mode debug avec UI
pnpm test:e2e:debug geographie

# Mode headless avec console
DEBUG=pw:api pnpm test:e2e geographie
```

## 📚 Documentation

- [Documentation Playwright](https://playwright.dev/)
- [Best Practices](https://playwright.dev/docs/best-practices)
- [API Reference](https://playwright.dev/docs/api/class-playwright)
