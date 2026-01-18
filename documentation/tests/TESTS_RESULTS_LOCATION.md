# Emplacement des Rapports de Tests — KARA

## 📊 Rapports de Couverture

### Localisation
Les rapports de couverture sont générés dans le dossier **`coverage/`** à la racine du projet après l'exécution de `pnpm test:coverage`.

### Structure
```
coverage/
├── index.html              # Rapport HTML principal (ouvrir dans le navigateur)
├── coverage-summary.json   # Résumé JSON de la couverture
├── lcov.info              # Format LCOV (pour CI/CD)
└── [dossiers par module]   # Rapports détaillés par fichier
```

### Accès
1. **Rapport HTML interactif** :
   ```bash
   # Ouvrir dans le navigateur
   open coverage/index.html
   # ou
   npx serve coverage
   ```

2. **Résumé JSON** :
   ```bash
   cat coverage/coverage-summary.json
   ```

3. **Résumé texte** (dans le terminal) :
   Le résumé s'affiche directement après `pnpm test:coverage`

### Seuils de Couverture
- **Lignes** : ≥ 80%
- **Fonctions** : ≥ 80%
- **Branches** : ≥ 80%
- **Statements** : ≥ 80%

---

## 📝 Résultats des Tests

### Localisation
Les résultats des tests sont stockés dans **`tests/results/`** (gitignored).

### Structure
```
tests/results/
├── test-report.md          # Rapport consolidé Markdown (généré automatiquement)
├── unit-tests.json         # Résultats tests unitaires (JSON)
├── e2e-tests.json         # Résultats tests E2E (JSON)
└── coverage-summary.json   # Copie du résumé de couverture
```

### Génération

#### Tests Unitaires avec Couverture JSON
```bash
pnpm test:coverage:json
# Génère: tests/results/unit-tests.json
# Génère: coverage/coverage-summary.json
```

#### Tests E2E avec Sortie JSON
```bash
pnpm test:e2e:json
# Génère: tests/results/e2e-tests.json
```

#### Rapport Consolidé
```bash
pnpm test:all:report
# Génère: tests/results/test-report.md
# Combine: unit-tests.json + e2e-tests.json + coverage-summary.json
```

---

## 🔍 Consultation des Rapports

### 1. Rapport HTML de Couverture (Recommandé)
```bash
# Ouvrir le rapport HTML interactif
open coverage/index.html
```

**Avantages** :
- ✅ Interface visuelle interactive
- ✅ Navigation par fichier/dossier
- ✅ Détails ligne par ligne
- ✅ Filtres par seuil de couverture

### 2. Rapport Consolidé Markdown
```bash
# Lire le rapport consolidé
cat tests/results/test-report.md
# ou
code tests/results/test-report.md
```

**Contenu** :
- Résumé des tests unitaires (passés/échoués)
- Résumé des tests E2E
- Couverture de code par métrique
- Couverture par module
- Statut global (ready/not ready)

### 3. Résumé Terminal
Après chaque exécution de `pnpm test:coverage`, un résumé s'affiche directement dans le terminal :
```
Test Files  1 failed | 15 passed (16)
     Tests  3 failed | 141 passed (144)
```

---

## 📋 Commandes Utiles

### Tests avec Couverture
```bash
# Tests unitaires avec couverture (HTML + JSON)
pnpm test:coverage

# Tests unitaires avec sortie JSON uniquement
pnpm test:coverage:json

# Tous les tests avec rapport consolidé
pnpm test:all:report
```

### Consultation
```bash
# Ouvrir le rapport HTML
open coverage/index.html

# Voir le rapport consolidé
cat tests/results/test-report.md

# Voir le résumé JSON
cat coverage/coverage-summary.json | jq '.total'
```

---

## ⚠️ Notes Importantes

1. **Dossier `coverage/`** : Gitignored, généré localement
2. **Dossier `tests/results/`** : Gitignored, contient les résultats JSON
3. **Rapport HTML** : Le plus détaillé, à consulter en priorité
4. **Rapport Markdown** : Utile pour un aperçu rapide ou pour CI/CD

---

## 🎯 Workflow Recommandé

1. **Développement** :
   ```bash
   pnpm test:coverage
   open coverage/index.html  # Vérifier la couverture
   ```

2. **Avant Commit** :
   ```bash
   pnpm test:all:report
   cat tests/results/test-report.md  # Vérifier le statut global
   ```

3. **CI/CD** :
   - Les rapports sont générés automatiquement
   - Consultables dans les artifacts GitHub Actions
