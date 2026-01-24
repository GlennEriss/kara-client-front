# Diagramme de séquence – Anniversaires V2

## Description

Le diagramme `main.puml` décrit les interactions entre les différents composants de la fonctionnalité Anniversaires V2 :

## Acteurs et participants

| Participant | Rôle |
|-------------|------|
| **Admin** | Utilisateur administrateur |
| **Page Anniversaires** | Composant page principal |
| **BirthdaysSearch** | Composant de recherche Algolia |
| **BirthdaysList** | Composant vue liste |
| **BirthdaysCalendar** | Composant vue calendrier |
| **useMemberBirthdays** | Hook pour liste paginée |
| **useBirthdaysByMonth** | Hook pour calendrier par mois |
| **useBirthdaySearch** | Hook pour recherche Algolia |
| **Algolia** | Service de recherche externe |
| **Firestore** | Base de données Firebase |
| **React Query Cache** | Cache côté client |

## Scénarios couverts

### 1. Initialisation
- Chargement initial de la liste paginée
- Deux requêtes Firestore parallèles (à venir + passés)
- Comptage via `getCountFromServer`

### 2. Recherche Algolia
- Saisie du terme de recherche
- Appel Algolia avec filtres (isActive, roles)
- Sélection d'un résultat → navigation vers le mois

### 3. Navigation calendrier avec cache
- Premier accès à un mois → fetch Firestore
- Retour sur un mois visité → cache hit (pas de fetch)
- Cache staleTime: 10 minutes

### 4. Filtres par mois
- Multi-sélection de mois (Janvier + Février)
- Requête Firestore avec `birthMonth IN [...]`
- Comptage filtré

### 5. Pagination
- Navigation page suivante/précédente
- Utilisation de curseur Firestore
- Stockage curseur pour navigation arrière

### 6. Export
- Utilise les données filtrées actuelles
- Génération Excel (xlsx) ou PDF (jsPDF)

## Flux de données

```
┌────────────┐     ┌─────────┐     ┌───────────┐     ┌───────────┐
│   Admin    │────▶│  Hook   │────▶│   Cache   │────▶│ Firestore │
└────────────┘     └─────────┘     └───────────┘     └───────────┘
      │                                   │
      │                                   ▼
      │            ┌─────────┐     ┌───────────┐
      └───────────▶│ Search  │────▶│  Algolia  │
                   └─────────┘     └───────────┘
```

## Visualisation

```bash
# Générer le PNG avec PlantUML
plantuml main.puml

# Ou via le serveur PlantUML
# https://www.plantuml.com/plantuml/png/...
```

## Fichiers associés

- [main.puml](./main.puml) - Diagramme PlantUML source
- [../README.md](../README.md) - Documentation principale
- [../activite/main.puml](../activite/main.puml) - Diagramme d'activité
- [../workflow/README.md](../workflow/README.md) - Workflow détaillé avec code
