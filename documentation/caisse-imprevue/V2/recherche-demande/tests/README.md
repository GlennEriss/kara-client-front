# Tests - Recherche des Demandes (searchableText)

> Documentation des tests unitaires, d'intégration et E2E pour la recherche avec `searchableText`.

## 📁 Structure

```
recherche-demande/tests/
├── README.md              # Ce fichier
├── TESTS_UNITAIRES.md     # Plan des tests unitaires (~31 tests)
├── TESTS_INTEGRATION.md   # Plan des tests d'intégration (~8 tests)
├── TESTS_E2E.md           # Plan des tests E2E (~14 tests)
├── DATA_TESTID.md         # data-testid pour la recherche
└── FIXTURES.md            # Fixtures pour les tests de recherche
```

## 📋 Vue d'ensemble

| Type | Fichier | Nombre | Framework | Priorité |
|------|---------|--------|-----------|----------|
| **Unitaires** | TESTS_UNITAIRES.md | ~31 | Vitest | P0 |
| **Intégration** | TESTS_INTEGRATION.md | ~8 | Vitest + RTL | P0 |
| **E2E** | TESTS_E2E.md | ~14 | Playwright | P0 |
| **TOTAL** | | **~53 tests** | | |

## 🎯 Couverture

### Tests unitaires

- **generateDemandSearchableText** : Normalisation (lowercase, accents, trim)
- **DemandCIRepository.create** : Ajout de searchableText
- **DemandCIRepository.getPaginated** : searchQuery, combinaisons (statut, fréquence), pagination
- **DemandSearchV2** : Composant contrôlé (value, onChange), clear
- **useDebounce** : Délai 300ms

### Tests d'intégration

- **ListDemandesV2 + DemandSearchV2** : searchQuery → effectiveFilters → useCaisseImprevueDemands
- **Recherche + tab statut** : Filtrage combiné
- **Recherche + filtre fréquence** : Filtrage combiné
- **Cache React Query** : queryKey, invalidation
- **Pagination** : Reset page, cursor-based

### Tests E2E

- **Recherche par nom** : Dupont, François (accents)
- **Recherche + tabs** : En attente, Toutes
- **Pagination** : Page 2, total correct
- **Effacer recherche** : Liste complète
- **Debounce** : 300ms
- **< 2 caractères** : Pas de filtre

## 🔗 Références

- **Workflow d'implémentation** : [../WORKFLOW.md](../WORKFLOW.md)
- **Analyse** : [../RECHERCHE_ANALYSE.md](../RECHERCHE_ANALYSE.md)
- **Diagramme activité** : [../activite/RechercherDemandes.puml](../activite/RechercherDemandes.puml)
- **Diagramme séquence** : [../sequence/SEQ_RechercherDemandes.puml](../sequence/SEQ_RechercherDemandes.puml)
- **Module Demandes** : [../../demande/tests/](../../demande/tests/) (TESTS_UNITAIRES.md, TESTS_INTEGRATION.md, TESTS_E2E.md)
- **data-testid** : [../../demande/tests/DATA_TESTID.md](../../demande/tests/DATA_TESTID.md)

## 🛠 Exécution

```bash
# Tests unitaires
pnpm test src/utils/__tests__/demandSearchableText.test.ts
pnpm test src/domains/financial/caisse-imprevue/__tests__/

# Tests d'intégration
pnpm test src/domains/financial/caisse-imprevue/__tests__/integration/

# Tests E2E
pnpm exec playwright test e2e/caisse-imprevue-v2/search.spec.ts
```

## ✅ Checklist avant implémentation

- [ ] Créer `src/utils/demandSearchableText.ts`
- [ ] Créer `src/utils/__tests__/demandSearchableText.test.ts`
- [ ] Modifier DemandCIRepository (create + getPaginated)
- [ ] Modifier DemandSearchV2 (composant contrôlé)
- [ ] Modifier ListDemandesV2 (état searchQuery)
- [ ] Créer fixtures avec searchableText
- [ ] Créer `e2e/caisse-imprevue-v2/search.spec.ts`
- [ ] Déployer les index Firestore (firebase/firestore.indexes.json)
- [ ] Exécuter le script de migration searchableText

---

**Date de création** : 2026-01-28  
**Version** : V2  
**Référence** : RECHERCHE_ANALYSE.md
