# Comment Lancer les Tests - Module Géographie

## 📋 Commandes à Exécuter

### 1. Installer les dépendances (si pas encore fait)

```bash
pnpm install
```

Cette commande installera :
- `vitest` et ses dépendances
- `@testing-library/react`, `@testing-library/jest-dom`
- `@vitejs/plugin-react`
- `jsdom`

---

### 2. Tests Unitaires (Vitest)

```bash
# Mode watch (développement - se relance automatiquement)
pnpm test

# Exécution unique (pour CI/commits)
pnpm test:run

# Avec couverture de code
pnpm test:coverage
```

**Note** : Les tests unitaires utilisent des mocks et sont rapides (pas besoin de `pnpm dev`).

---

### 3. Tests E2E (Playwright)

**⚠️ IMPORTANT** : Les tests E2E nécessitent que le serveur de développement soit lancé.

```bash
# Terminal 1 : Lancer le serveur de développement
pnpm dev

# Terminal 2 : Lancer les tests E2E
pnpm test:e2e

# Ou en mode UI interactif
pnpm test:e2e:ui

# Ou en mode debug
pnpm test:e2e:debug

# Ou en mode headed (navigateur visible)
pnpm test:e2e:headed
```

---

### 4. Checklist Complète (selon le workflow)

Avant de commit, exécuter dans l'ordre :

```bash
# 1. Linter
pnpm lint

# 2. Type check
pnpm typecheck

# 3. Tests unitaires
pnpm test:run

# 4. Build
pnpm build

# 5. Tests E2E (si flux critique)
pnpm test:e2e
```

---

## 🐛 Dépannage

### Erreur : "Cannot find module 'vitest'"

```bash
pnpm install
```

### Erreur : "Cannot find module '@testing-library/react'"

```bash
pnpm install
```

### Erreur lors des tests E2E : "Connection refused"

Vérifier que `pnpm dev` est lancé dans un autre terminal.

### Tests E2E échouent avec "Missing or insufficient permissions"

Déployer les règles Firestore :
```bash
firebase deploy --only firestore:rules --project kara-gabon-dev
```

---

## 📊 Résultats Attendus

### Tests Unitaires

```
✓ src/domains/infrastructure/geography/__tests__/hooks/useGeographie.test.ts
  ✓ useProvinces
    ✓ devrait appeler le service pour récupérer les provinces
  ✓ useProvince
    ✓ devrait récupérer une province par ID
  ✓ useProvinceMutations
    ✓ devrait créer une province

✓ src/domains/infrastructure/geography/__tests__/services/GeographieService.test.ts
  ✓ GeographieService - Provinces
    ✓ createProvince
      ✓ devrait créer une province avec un code unique
      ✓ devrait rejeter si le code existe déjà
    ✓ updateProvince
      ✓ devrait mettre à jour une province existante
      ✓ devrait rejeter si la province n'existe pas
    ✓ deleteProvince
      ✓ devrait supprimer une province sans départements
      ✓ devrait rejeter si la province a des départements
    ✓ getAllProvinces
      ✓ devrait retourner toutes les provinces

Test Files  2 passed (2)
     Tests  9 passed (9)
```

### Tests E2E

```
Running 12 tests using 1 worker

✓ e2e/geographie.spec.ts:10:3 › Module Géographie - Affichage et Navigation › devrait afficher le header avec titre et description (2s)
✓ e2e/geographie.spec.ts:23:3 › Module Géographie - Affichage et Navigation › devrait afficher les statistiques (5 cards) (1s)
✓ e2e/geographie.spec.ts:44:3 › Module Géographie - Affichage et Navigation › devrait afficher tous les onglets (1s)
✓ e2e/geographie.spec.ts:60:3 › Module Géographie - Affichage et Navigation › devrait naviguer entre les onglets (2s)
✓ e2e/geographie.spec.ts:74:3 › Module Géographie - Provinces › devrait afficher la liste des provinces (1s)
✓ e2e/geographie.spec.ts:81:3 › Module Géographie - Provinces › devrait afficher le bouton "Nouvelle Province" avec la couleur KARA (1s)
✓ e2e/geographie.spec.ts:103:3 › Module Géographie - Provinces › devrait ouvrir le modal de création de province (1s)
✓ e2e/geographie.spec.ts:120:3 › Module Géographie - Provinces › devrait créer une nouvelle province (3s)
✓ e2e/geographie.spec.ts:159:3 › Module Géographie - Provinces › devrait afficher les boutons d'action (1s)
✓ e2e/geographie.spec.ts:167:3 › Module Géographie - Provinces › devrait permettre de rechercher des provinces (1s)
✓ e2e/geographie.spec.ts:185:3 › Module Géographie - Départements › devrait afficher la liste des départements (1s)
✓ e2e/geographie.spec.ts:192:3 › Module Géographie - Départements › devrait ouvrir le modal de création de département (1s)
✓ e2e/geographie.spec.ts:207:3 › Module Géographie - Design et Responsive › devrait respecter le design system (1s)
✓ e2e/geographie.spec.ts:219:3 › Module Géographie - Design et Responsive › devrait être responsive (mobile) (2s)
✓ e2e/geographie.spec.ts:231:3 › Module Géographie - Design et Responsive › devrait être responsive (tablette) (2s)
✓ e2e/geographie.spec.ts:244:3 › Géographie - Formulaire d'inscription public › devrait afficher les champs de géographie dans le formulaire public (2s)

16 passed (30s)
```

---

## 📝 Notes

- Les tests unitaires sont rapides (< 1 seconde)
- Les tests E2E prennent plus de temps (~30 secondes)
- Les tests E2E nécessitent une connexion Firebase (projet dev ou émulateur)
- Tous les tests doivent passer avant de commit (voir WORKFLOW.md)
