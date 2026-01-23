# Diagramme d'activité – Anniversaires V2

## Description

Le diagramme `main.puml` décrit le flux d'activités de la fonctionnalité Anniversaires V2, incluant :

1. **Initialisation** : Chargement de la liste paginée avec deux requêtes Firestore (anniversaires à venir + passés)
2. **Recherche Algolia** : Recherche par nom/prénom/matricule avec navigation vers le mois d'anniversaire
3. **Navigation entre vues** : Basculement entre liste et calendrier avec cache React Query
4. **Filtrage par mois** : Multi-sélection de mois avec gestion de la limite Firestore (10 valeurs max pour 'in')
5. **Pagination** : Navigation entre pages avec curseur Firestore
6. **Export** : Génération de fichiers Excel et PDF

## Points clés du flux

### Recherche Algolia
- Utilise l'index `members-{env}` existant
- Retourne `birthMonth` pour navigation automatique vers le mois
- Mise en surbrillance du membre trouvé

### Cache React Query
- **Liste** : `['birthdays', 'list', { page, months }]` - staleTime 5 min
- **Calendrier** : `['birthdays', 'calendar', month, year]` - staleTime 10 min
- Navigation entre mois = cache hit si déjà visité

### Stratégie de pagination circulaire
1. Query 1 : `birthDayOfYear >= aujourd'hui` (anniversaires à venir)
2. Query 2 : `birthDayOfYear < aujourd'hui` (anniversaires passés)
3. Merge : Query1 + Query2 pour ordre chronologique correct

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
- [../sequence/main.puml](../sequence/main.puml) - Diagramme de séquence
