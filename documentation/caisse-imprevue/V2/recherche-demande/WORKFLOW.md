# WORKFLOW.md — Implémentation de la recherche des demandes Caisse Imprévue V2

> **Objectif** : Workflow reproductible pour implémenter la recherche paginée avec `searchableText` (nom, prénom, matricule).
> **Référence** : `documentation/general/WORKFLOW.md` (workflow général KARA)

---

# PARTIE 0 — SKILLS OBLIGATOIRES

> **À respecter tout au long de l'implémentation.**

Avant et pendant chaque phase, appliquer les guidelines des skills suivants :

| Skill | Usage |
|-------|-------|
| **vercel-react-best-practices** | Composants React, data fetching, performance, re-renders, bundle |
| **vercel-composition-patterns** | Architecture composants, state management, composition (DemandSearchV2, ListDemandesV2) |
| **web-design-guidelines** | UI/UX, accessibilité, design system |
| **security-review** | Validation des entrées (searchQuery), règles Firestore, données sensibles |

**Règle** : Consulter chaque skill avant d'implémenter les composants, hooks et repositories concernés.

---

# PARTIE 1 — CONTEXTE ET RÉFÉRENCES

## 1.1 Contexte métier

La recherche des demandes Caisse Imprévue permet aux admins KARA de filtrer les demandes par **nom**, **prénom** ou **matricule** via un champ de recherche intégré à la liste principale. La recherche est **côté serveur**, **paginée** et combinée avec les onglets de statut, les filtres (fréquence) et le tri (date, A-Z, Z-A).

## 1.2 Documentation de référence

| Document | Contenu |
|----------|---------|
| [RECHERCHE_ANALYSE.md](./RECHERCHE_ANALYSE.md) | Analyse détaillée, cahier des charges, contraintes Firestore |
| [activite/RechercherDemandes.puml](./activite/RechercherDemandes.puml) | Workflow recherche avec searchableText, debounce, pagination |
| [sequence/SEQ_RechercherDemandes.puml](./sequence/SEQ_RechercherDemandes.puml) | Séquence ListDemandesV2 → useCaisseImprevueDemands → getPaginated |
| [firebase/INDEXES.md](./firebase/INDEXES.md) | Matrice des 16 index composites requis |
| [firebase/indexes.recherche.json](./firebase/indexes.recherche.json) | Définition JSON des index à fusionner |
| [tests/README.md](./tests/README.md) | Plan des tests (unitaires, intégration, E2E) |

## 1.3 Fichiers impactés (résumé)

| Fichier | Modification |
|---------|--------------|
| `src/utils/demandSearchableText.ts` | **Nouveau** — `generateDemandSearchableText()` |
| `entities/demand.types.ts` | Ajouter `searchableText?: string` |
| `repositories/DemandCIRepository.ts` | `create()` : searchableText. `getPaginated()` : searchQuery. `update()` : searchableText si membre modifié |
| `components/demandes/ListDemandesV2.tsx` | État `searchQuery`, `effectiveFilters`, connecter DemandSearchV2 |
| `components/demandes/filters/DemandSearchV2.tsx` | Composant contrôlé (value, onChange), debounce 300ms |
| `firestore.indexes.json` | Fusionner les 16 index de `indexes.recherche.json` |
| `scripts/migrate-demands-searchable-text.ts` | **Nouveau** — Migration des demandes existantes |
| `hooks/useDemandSearch.ts` | **À supprimer** ou déprécier |

---

# PARTIE 2 — BRANCHING ET CONVENTIONS

## 2.1 Branche

Depuis `develop` :

```bash
git checkout develop
git pull
git checkout -b feat/caisse-imprevue-search-searchable-text
```

## 2.2 Convention de commits

- `feat(caisse-imprevue): add generateDemandSearchableText utility`
- `feat(caisse-imprevue): add searchableText to DemandCIRepository.create`
- `feat(caisse-imprevue): add searchQuery to getPaginated`
- `feat(caisse-imprevue): integrate DemandSearchV2 with ListDemandesV2`
- `feat(firestore): add composite indexes for demand search`
- `chore(caisse-imprevue): add migration script for searchableText`
- `test(caisse-imprevue): add search unit and integration tests`
- `test(e2e): add search E2E tests for caisse-imprevue`

---

# PARTIE 3 — PHASES D'IMPLÉMENTATION

## Phase 0 — Préparation (avant codage)

### Checklist

- [ ] Lire [README.md](./README.md) (vue d'ensemble, architecture)
- [ ] Lire [RECHERCHE_ANALYSE.md](./RECHERCHE_ANALYSE.md) en entier
- [ ] Consulter les skills : vercel-react-best-practices, vercel-composition-patterns, web-design-guidelines, security-review
- [ ] Valider l’ordre des champs dans `searchableText` : `lastName firstName matricule` (recommandé)
- [ ] Vérifier que `searchQuery` est déjà dans `DemandFilters` (ou l’ajouter)
- [ ] Créer la branche `feat/caisse-imprevue-search-searchable-text`

---

## Phase 1 — Utilitaires et entités

### 1.1 Créer `generateDemandSearchableText`

**Fichier** : `src/utils/demandSearchableText.ts`

```typescript
export function generateDemandSearchableText(
  lastName: string,
  firstName: string,
  matricule: string
): string {
  return [lastName, firstName, matricule]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}
```

**Référence** : `BaseGeographyRepository.generateSearchableText()` ou `scripts/migrate-searchable-text.ts` (géographie).

### 1.2 Mettre à jour les types

**Fichier** : `entities/demand.types.ts` (ou équivalent)

- Ajouter `searchableText?: string` à l’interface de la demande Caisse Imprévue.

### 1.3 Tests unitaires (TDD recommandé)

- [ ] Créer `src/utils/__tests__/demandSearchableText.test.ts`
- [ ] Vérifier : lowercase, accents, trim, concaténation
- [ ] Référence : [tests/TESTS_UNITAIRES.md](./tests/TESTS_UNITAIRES.md)

---

## Phase 2 — Index Firestore

### 2.1 Fusionner les index

**Action** : Fusionner le contenu de `firebase/indexes.recherche.json` dans `firestore.indexes.json` (racine du projet).

```bash
# Depuis la racine du projet
# Option : script Node ou fusion manuelle du tableau "indexes"
```

**Référence** : [firebase/README.md](./firebase/README.md)

### 2.2 Déployer en dev

```bash
firebase use dev  # ou kara-mutuelle-dev
firebase deploy --only firestore:indexes
```

### 2.3 Vérifier

- [ ] Vérifier dans Firebase Console > Firestore > Indexes que les index sont en cours de construction
- [ ] Attendre la fin de la construction (quelques minutes)

---

## Phase 3 — Repository (backend)

### 3.1 `DemandCIRepository.create()`

- [ ] Importer `generateDemandSearchableText`
- [ ] Calculer `searchableText` à partir de `memberLastName`, `memberFirstName`, `memberMatricule`
- [ ] Ajouter `searchableText` au document avant `setDoc`

### 3.2 `DemandCIRepository.getPaginated()`

- [ ] Si `filters.searchQuery` défini et `length >= 2` :
  - Normaliser la query (lowercase, trim, accents)
  - Ajouter `where('searchableText', '>=', normalizedQuery)`
  - Ajouter `where('searchableText', '<=', normalizedQuery + '\uf8ff')`
  - Ajouter `orderBy('searchableText', 'asc')` en premier (obligatoire pour la range)
  - Puis `orderBy` selon tri (createdAt ou memberLastName/memberFirstName)
- [ ] Respecter l’ordre des contraintes (equality → range → orderBy) pour les index

**Référence** : [sequence/SEQ_RechercherDemandes.puml](./sequence/SEQ_RechercherDemandes.puml) (lignes 89–111)

### 3.3 `DemandCIRepository.update()`

- [ ] Si un futur `UpdateCaisseImprevueDemandInput` modifie `memberLastName`, `memberFirstName` ou `memberMatricule` : recalculer `searchableText` et mettre à jour le document.

### 3.4 Tests unitaires

- [ ] Tests `create()` : vérifier que `searchableText` est présent
- [ ] Tests `getPaginated()` : searchQuery seul, searchQuery + statut, searchQuery + fréquence, pagination
- [ ] Référence : [tests/TESTS_UNITAIRES.md](./tests/TESTS_UNITAIRES.md)

---

## Phase 4 — Frontend (composants et hooks)

### 4.1 `DemandSearchV2`

- [ ] Passer en **composant contrôlé** : props `value` et `onChange`
- [ ] Utiliser `useDebounce(value, 300)` pour le debounce
- [ ] Supprimer l’usage de `useDemandSearch` (hook séparé)
- [ ] Placeholder : "Rechercher par nom, prénom ou matricule..."

**Référence** : [activite/RechercherDemandes.puml](./activite/RechercherDemandes.puml) (lignes 11–12)

### 4.2 `ListDemandesV2`

- [ ] État local : `searchQuery` (string)
- [ ] `effectiveFilters = { ...filters, status: activeTab, searchQuery: debouncedQuery }`
- [ ] Passer `searchQuery` à `DemandSearchV2` : `value={searchQuery}` et `onChange={setSearchQuery}`
- [ ] Quand `searchQuery` change : `page = 1` (reset pagination)
- [ ] Passer `effectiveFilters` à `useCaisseImprevueDemands(effectiveFilters, pagination, sort)`

**Référence** : [sequence/SEQ_RechercherDemandes.puml](./sequence/SEQ_RechercherDemandes.puml)

### 4.3 `useDemandSearch`

- [ ] Supprimer le fichier ou le marquer comme déprécié
- [ ] Vérifier qu’aucun autre composant ne l’utilise

### 4.4 Tests d’intégration

- [ ] ListDemandesV2 + DemandSearchV2 : searchQuery → effectiveFilters → refetch
- [ ] Recherche + tab statut : filtrage combiné
- [ ] Cache React Query : queryKey inclut searchQuery
- [ ] Référence : [tests/TESTS_INTEGRATION.md](./tests/TESTS_INTEGRATION.md)

---

## Phase 5 — Migration des données

### 5.1 Script de migration

**Fichier** : `scripts/migrate-demands-searchable-text.ts`

- [ ] Parcourir la collection `caisseImprevueDemands`
- [ ] Pour chaque document sans `searchableText` : calculer à partir de `memberLastName`, `memberFirstName`, `memberMatricule`
- [ ] Mettre à jour le document avec `searchableText`
- [ ] S’inspirer de `scripts/migrate-searchable-text.ts` (géographie)

### 5.2 Exécution

```bash
pnpm tsx scripts/migrate-demands-searchable-text.ts dev
```

- [ ] Exécuter sur **dev** avant les tests E2E
- [ ] Vérifier que les demandes existantes ont bien `searchableText`

---

## Phase 6 — Tests

### 6.1 Tests unitaires

```bash
pnpm test src/utils/__tests__/demandSearchableText.test.ts
pnpm test src/domains/financial/caisse-imprevue/__tests__/
```

- [ ] Tous les tests passent
- [ ] Référence : [tests/TESTS_UNITAIRES.md](./tests/TESTS_UNITAIRES.md)

### 6.2 Tests d’intégration

```bash
pnpm test src/domains/financial/caisse-imprevue/__tests__/integration/
```

- [ ] Référence : [tests/TESTS_INTEGRATION.md](./tests/TESTS_INTEGRATION.md)

### 6.3 Tests E2E

```bash
# Prérequis : pnpm dev en arrière-plan, Firebase Cloud (dev)
pnpm test:e2e e2e/caisse-imprevue-v2/search.spec.ts
```

- [ ] Recherche par nom (Dupont, François)
- [ ] Recherche + tab En attente
- [ ] Pagination avec recherche
- [ ] Effacer recherche → liste complète
- [ ] Debounce 300ms
- [ ] Référence : [tests/TESTS_E2E.md](./tests/TESTS_E2E.md), [tests/DATA_TESTID.md](./tests/DATA_TESTID.md)

---

## Phase 7 — Validation finale

### 7.1 Tests locaux (obligatoire avant commit)

```bash
pnpm lint
pnpm typecheck
pnpm test --run
pnpm build
pnpm test:e2e
```

- [ ] Tous les tests passent

### 7.2 PR vers `develop`

- [ ] Use case / diagrammes à jour (activité, séquence)
- [ ] Documentation complète (RECHERCHE_ANALYSE, README)
- [ ] Index Firestore fusionnés et déployés
- [ ] Script de migration documenté et exécuté sur dev
- [ ] CI vert (incluant E2E)

### 7.3 Préprod

- [ ] Exécuter le script de migration sur préprod
- [ ] Smoke test manuel : recherche par nom, pagination, tabs
- [ ] Tests E2E préprod si configurés

---

# PARTIE 4 — ORDRE D’EXÉCUTION RECOMMANDÉ

```
Phase 0 (Préparation)
    ↓
Phase 1 (Utils + types)
    ↓
Phase 2 (Index Firestore)  ← Déployer tôt pour éviter erreurs à l’exécution
    ↓
Phase 3 (Repository)
    ↓
Phase 4 (Frontend)
    ↓
Phase 5 (Migration dev)
    ↓
Phase 6 (Tests)
    ↓
Phase 7 (Validation + PR)
```

---

# PARTIE 5 — DEFINITION OF DONE (DoD)

- [ ] Skills respectés (vercel-react-best-practices, vercel-composition-patterns, web-design-guidelines, security-review)
- [ ] `generateDemandSearchableText` créé et testé
- [ ] `DemandCIRepository.create()` ajoute `searchableText`
- [ ] `DemandCIRepository.getPaginated()` gère `searchQuery` avec contraintes Firestore
- [ ] 16 index composites dans `firestore.indexes.json` et déployés
- [ ] `DemandSearchV2` en composant contrôlé avec debounce 300ms
- [ ] `ListDemandesV2` intègre la recherche (effectiveFilters, searchQuery)
- [ ] Script de migration exécuté sur dev (et préprod avant release)
- [ ] Tests unitaires passent
- [ ] Tests d’intégration passent
- [ ] Tests E2E passent (recherche, pagination, tabs)
- [ ] `useDemandSearch` supprimé ou déprécié
- [ ] Documentation à jour (RECHERCHE_ANALYSE, README, diagrammes)
- [ ] CI vert
- [ ] Préprod validée

---

# PARTIE 6 — RÉFÉRENCES CROISÉES

| Élément | Référence |
|---------|-----------|
| Workflow général KARA | `documentation/general/WORKFLOW.md` |
| Analyse recherche | [RECHERCHE_ANALYSE.md](./RECHERCHE_ANALYSE.md) |
| Diagramme activité | [activite/RechercherDemandes.puml](./activite/RechercherDemandes.puml) |
| Diagramme séquence | [sequence/SEQ_RechercherDemandes.puml](./sequence/SEQ_RechercherDemandes.puml) |
| Index Firestore | [firebase/INDEXES.md](./firebase/INDEXES.md), [firebase/indexes.recherche.json](./firebase/indexes.recherche.json) |
| Tests | [tests/README.md](./tests/README.md), [tests/TESTS_UNITAIRES.md](./tests/TESTS_UNITAIRES.md), [tests/TESTS_INTEGRATION.md](./tests/TESTS_INTEGRATION.md), [tests/TESTS_E2E.md](./tests/TESTS_E2E.md) |
| Module Demandes | [../demande/README.md](../demande/README.md) |

---

**Date de création** : 2026-01-28  
**Version** : V2  
**Référence** : RECHERCHE_ANALYSE.md, documentation/general/WORKFLOW.md
