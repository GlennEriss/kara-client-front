# Diagrammes UML - Step2 Adresse

Ce dossier contient les diagrammes UML documentant la fonctionnalité de saisie d'adresse dans le formulaire d'adhésion.

## 📊 Diagrammes disponibles

### 1. `use-case-v1.puml`
**Use Case - Version actuelle (avec bugs)**

Décrit le fonctionnement actuel de la fonctionnalité avec les problèmes identifiés :
- Flux de sélection en cascade (Province → Commune → District → Quarter)
- Création de nouvelles entités via modals
- **Bugs documentés** : commune créée mais non visible, problèmes de cache React Query

### 2. `use-case-v2.puml`
**Use Case - Version solution (avec pattern Cascading Dependent Selection)**

Décrit la solution proposée avec le pattern optimisé :
- Même flux de sélection en cascade
- Création avec **Optimistic Update** et **Context-Aware Cache Update**
- **Nouvelles fonctionnalités** : synchronisation cache-formulaire, réinitialisation en cascade
- **Stratégies de cache** : Chargement complet vs recherche selon le volume (voir [CACHE-ET-CAS-CRITIQUES.md](../CACHE-ET-CAS-CRITIQUES.md))

### 3. `activite.puml`
**Diagramme d'Activité - Création d'une commune (V2)**

Détaille le processus complet de création d'une commune avec le pattern :
1. **Recherche** : Recherche de commune (min 2 chars, debounce 300ms, limit 50)
2. **Context Check** : Vérification du contexte parent
3. **Optimistic Update** : Mise à jour immédiate du cache de recherche
4. **Invalidation** : Invalidation ciblée des queries de recherche
5. **Refetch** : Refetch explicite des queries de recherche actives
6. **Selection** : Sélection dans le formulaire
7. **Cascade Reset** : Réinitialisation des niveaux enfants
8. **UI Update** : Mise à jour de l'interface avec résultats de recherche
9. **Cascade Children** : Mise à jour des composants enfants (districts: chargement complet, quarters: recherche)

### 4. `sequence.puml`
**Diagramme de Séquence - Création d'une commune (V2)**

Montre l'interaction entre les différents composants lors de la création :
- **Acteurs** : Admin, Step2, CommuneCombobox, AddCommuneModal
- **Hooks** : useCascadingEntityCreation, useAddressCascade
- **Services** : GeographieService, Firestore
- **Cache** : React Query Cache avec stratégies adaptées

**Stratégies de cache documentées** :
- Provinces : Chargement complet (9, cache 30 min)
- Départements : Chargement par province (~50-60, cache 30 min)
- Communes : **Recherche uniquement** (min 2 chars, limit 50, cache 5 min)
- Districts : Chargement complet (max 7, cache 30 min)
- Quarters : **Recherche uniquement** (min 2 chars, limit 50, cache 5 min)

## 🎯 Objectif

Ces diagrammes servent à :
- **Documenter** le fonctionnement actuel et les problèmes
- **Expliquer** la solution proposée avec le pattern Cascading Dependent Selection
- **Guider** l'implémentation de la solution
- **Faciliter** la compréhension pour les développeurs

## 📝 Utilisation

Pour visualiser les diagrammes :

1. **Avec PlantUML** :
   ```bash
   plantuml use-case-v1.puml
   plantuml use-case-v2.puml
   plantuml activite.puml
   plantuml sequence.puml
   ```

2. **Avec VS Code** :
   - Installer l'extension "PlantUML"
   - Ouvrir un fichier `.puml`
   - Appuyer sur `Alt+D` pour prévisualiser

3. **En ligne** :
   - Copier le contenu dans [PlantUML Online Server](http://www.plantuml.com/plantuml/uml/)

## 🔗 Liens

- [Documentation principale](../README.md)
- [Pattern Cascading Dependent Selection](../README.md#-design-pattern--cascading-dependent-selection-avec-optimistic-updates)
- [Gestion du Cache et Cas Critiques](../CACHE-ET-CAS-CRITIQUES.md) : **Important** - Stratégies de chargement et cache
