# Recherche des Demandes Caisse Imprévue V2

> Documentation de la fonctionnalité de recherche des demandes avec `searchableText` (nom, prénom, matricule).

## 📖 Ordre de lecture pour l'implémentation

1. **README.md** (ce fichier) — Vue d'ensemble, architecture, diagrammes
2. **WORKFLOW.md** — Pilote les tâches d'implémentation (phases, checklists, DoD)

> Lire le README en premier pour comprendre le contexte, puis suivre le WORKFLOW pour exécuter les tâches.

## 📁 Structure

```
recherche-demande/
├── README.md                    # Ce fichier
├── RECHERCHE_ANALYSE.md         # Analyse détaillée et cahier des charges
├── WORKFLOW.md                  # Workflow d'implémentation complet
├── activite/                    # Diagrammes d'activité
│   └── RechercherDemandes.puml  # Workflow recherche searchableText + pagination
├── sequence/                    # Diagrammes de séquence
│   └── SEQ_RechercherDemandes.puml  # Interactions recherche intégrée à la liste
├── firebase/                    # Index Firestore pour la recherche
│   ├── INDEXES.md
│   ├── indexes.recherche.json
│   └── README.md
└── tests/                       # Tests unitaires, intégration, E2E
    ├── README.md
    ├── TESTS_UNITAIRES.md
    ├── TESTS_INTEGRATION.md
    ├── TESTS_E2E.md
    ├── DATA_TESTID.md
    └── FIXTURES.md
```

## 📋 Vue d'ensemble

La recherche des demandes Caisse Imprévue utilise un champ **searchableText** agrégé (nom + prénom + matricule) pour permettre une recherche côté serveur paginée, intégrée à la liste principale.

### Points clés

- **searchableText** : Concaténation normalisée (lowercase, sans accents) de `memberLastName`, `memberFirstName`, `memberMatricule`
- **Recherche par préfixe** : Firestore `where('searchableText', '>=', X)` et `where('searchableText', '<=', X + '\uf8ff')`
- **Une seule source** : `useCaisseImprevueDemands` avec `searchQuery` dans les filters
- **Pagination cursor-based** : `limit(pageSize)` + `startAfter(cursor)`
- **Tabs** : Recherche appliquée dans le tab actif (Toutes, En attente, Acceptées, Refusées, Réouverte)
- **Filtres combinés** : Recherche + statut + fréquence de paiement + tri (date, A-Z, Z-A)

### Architecture

```
ListDemandesV2
  ├── searchQuery (état local, debounce 300ms)
  ├── effectiveFilters = { ...filters, searchQuery }
  └── useCaisseImprevueDemands(effectiveFilters, pagination, sort)
        └── DemandCIRepository.getPaginated(filters avec searchQuery)
              └── Firestore : where searchableText + where status + orderBy + limit + startAfter
```

## 📊 Diagrammes

### Diagramme d'activité

**Fichier** : `activite/RechercherDemandes.puml`

Décrit le workflow complet :
- Saisie avec debounce 300ms
- Normalisation query (lowercase, trim)
- Intégration avec tabs (statut)
- Combinaison avec filtres (fréquence) et tri (date, A-Z, Z-A)
- Pagination cursor-based
- Requête Firestore sur searchableText (pas de filtre côté client)

### Diagramme de séquence

**Fichier** : `sequence/SEQ_RechercherDemandes.puml`

Décrit les interactions :
- DemandSearchV2 (composant contrôlé value/onChange)
- ListDemandesV2 (état searchQuery → effectiveFilters)
- useCaisseImprevueDemands (un seul hook, searchQuery dans filters)
- DemandCIRepository.getPaginated (searchableText côté serveur)
- Firestore (where searchableText, pagination, index composites)

## 🔗 Liens

- **Workflow d'implémentation** (pilote les tâches) : [WORKFLOW.md](./WORKFLOW.md)
- **Analyse complète** : [RECHERCHE_ANALYSE.md](./RECHERCHE_ANALYSE.md)
- **Module Demandes** : [../demande/README.md](../demande/README.md)
- **Index Firestore recherche** : [firebase/INDEXES.md](./firebase/INDEXES.md)
- **Tests** : [tests/README.md](./tests/README.md)

## 🛠 Visualisation

```bash
# Générer les images PlantUML
cd documentation/caisse-imprevue/V2/recherche-demande
plantuml activite/*.puml sequence/*.puml
```

---

**Date de création** : 2026-01-28  
**Version** : V2  
**Référence** : RECHERCHE_ANALYSE.md
