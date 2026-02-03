# Tests – Simulation Caisse Spéciale (Standard) V2

> Documentation des plans de tests pour le module Simulation (Standard / Standard Charitable).

## Vue d’ensemble

Ce dossier décrit les cas de tests pour le module Simulation, alignés sur les diagrammes d’activité et de séquence et sur l’architecture domains (`domains/financial/caisse-speciale`).

**Module** : Simulation Caisse Spéciale (Standard)  
**Package cible** : `src/domains/financial/caisse-speciale/`  
**Aucune collection dédiée** : lecture seule de `caisseSettings`.

---

## Structure

```
tests/
├── README.md                 # Ce fichier (vue d'ensemble)
├── TESTS_UNITAIRES.md        # Plan des tests unitaires (service, hook, calcul bonus)
├── TESTS_INTEGRATION.md      # Plan des tests d'intégration (formulaire → service → tableau)
└── TESTS_E2E.md              # Plan des tests E2E (parcours simulation + export / WhatsApp)
```

---

## Types de tests

### 1. Tests unitaires

**Objectif** : Tester en isolation le calcul d’échéancier, les bonus et la validation.

**Cibles prioritaires :**
- **CaisseSpecialeSimulationService** : `runSimulation(params)` – calcul des lignes (date échéance, taux bonus, bonus FCFA) à partir de `bonusTable` ; cas « aucun paramètre actif ».
- **useSimulationRun** (hook) : appel au service, format des données retournées, gestion erreur.
- **Schéma Zod** du formulaire : montant > 0, durée 1–12, date valide.

**Référence** : [TESTS_UNITAIRES.md](./TESTS_UNITAIRES.md)

---

### 2. Tests d’intégration

**Objectif** : Tester le flux formulaire → hook → service → repository (lecture `caisseSettings`) → affichage tableau.

**Scénarios :**
- Soumission formulaire valide → récupération paramètres actifs → calcul → tableau avec bon nombre de lignes et colonnes.
- Type STANDARD vs STANDARD_CHARITABLE → paramètres différents → bonus différents.
- Aucun paramètre actif pour le type → message d’erreur, pas de tableau.
- Export PDF / Excel : appel au service d’export avec les `rows` du tableau, génération Blob, pas d’appel Firestore en écriture.

**Référence** : [TESTS_INTEGRATION.md](./TESTS_INTEGRATION.md)

---

### 3. Tests E2E (optionnel)

**Objectif** : Parcours utilisateur complet dans le navigateur.

**Scénarios :**
- Accès à `/caisse-speciale/simulation` → formulaire visible.
- Saisie type + montant + durée + date → clic « Lancer la simulation » → tableau affiché avec totaux et boutons Export / Partager WhatsApp.
- Clic « Exporter en PDF » → téléchargement d’un fichier PDF.
- Clic « Partager sur WhatsApp » → ouverture d’un lien WhatsApp (vérification d’URL ou fenêtre).

**Framework** : Playwright.

**Référence** : [TESTS_E2E.md](./TESTS_E2E.md)

---

## Conventions

- **Unitaires** : `should [comportement] when [condition]`.
- **Intégration** : `should [flux complet]`.
- **E2E** : `[P0-SIM-XX] devrait [action]`.
- Structure **AAA** (Arrange, Act, Assert) pour tous les tests.

---

## Commandes

```bash
# Tests unitaires (domaine caisse-speciale simulation)
pnpm test src/domains/financial/caisse-speciale

# Avec couverture
pnpm test --coverage src/domains/financial/caisse-speciale

# E2E (si dossier e2e/caisse-speciale/simulation)
pnpm test:e2e e2e/caisse-speciale/simulation
```

---

## Références

- [README.md](../README.md) – Contexte du module
- [activite/](../activite/README.md), [sequence/](../sequence/README.md) – Diagrammes
- [workflow/WORKFLOW.md](../workflow/WORKFLOW.md) – Tâches et Definition of Done
- [documentation/tests/](../../../../tests/README.md) – Stratégie tests globale
