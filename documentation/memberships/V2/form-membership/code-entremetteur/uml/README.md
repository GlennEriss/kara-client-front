# Diagrammes UML – Code Entremetteur

## Description

Ce dossier contient les **diagrammes UML** (PlantUML) décrivant la fonctionnalité de recherche et saisie du code entremetteur dans le formulaire d'ajout de membre.

## Diagrammes disponibles

### 1. `use-case-v1.puml` - Use Case V1 (Actuel)

**Description** : Diagramme de use case décrivant le flux actuel (V1) où l'admin doit naviguer manuellement vers la liste des membres pour trouver le code entremetteur.

**Acteurs** :
- **Admin KARA** : Utilisateur administrateur

**Use cases principaux** :
- `UC-MEM-FORM-001` : Ajouter un nouveau membre
- `UC-MEM-FORM-002` : Saisir le code entremetteur (champ texte simple)
- `UC-MEM-FORM-003` : Valider le format du code

**Points clés** :
- Flux interrompu : navigation vers liste des membres
- Risques d'erreurs de copie
- Perte de temps (30-60 secondes)

### 2. `use-case-v2.puml` - Use Case V2 (Nouvelle Solution)

**Description** : Diagramme de use case décrivant la nouvelle solution (V2) avec recherche en temps réel et autocomplétion.

**Acteurs** :
- **Admin KARA** : Utilisateur administrateur
- **Système** : Système de recherche (Algolia)

**Use cases principaux** :
- `UC-MEM-FORM-002-V2` : Rechercher un membre entremetteur (autocomplétion)
- `UC-MEM-FORM-003-V2` : Sélectionner un membre (dans les résultats)
- `UC-MEM-FORM-004-V2` : Remplir automatiquement le code
- `UC-INFRA-SEARCH-001` : Rechercher des membres (via Algolia)

**Points clés** :
- Recherche en temps réel (2 caractères minimum)
- Affichage formaté : "Nom Prénom (Code)"
- Remplissage automatique
- Rapidité (2 secondes au lieu de 30-60)

### 3. `activite.puml` - Diagramme d'activité

**Description** : Diagramme d'activité décrivant le flux complet de recherche et sélection du code entremetteur.

**Flux principal** :
1. Admin accède au formulaire d'ajout
2. Admin arrive à l'étape 1 (Identité)
3. Admin commence à taper le nom/prénom
4. Système recherche en temps réel (Algolia)
5. Affichage des résultats formatés
6. Admin sélectionne un membre
7. Remplissage automatique du code
8. Validation du format

**Points clés** :
- Déclenchement après 2 caractères
- Debounce de 300ms
- Formatage des résultats
- Validation automatique

### 4. `sequence.puml` - Diagramme de séquence

**Description** : Diagramme de séquence décrivant les interactions entre les composants lors de la recherche et sélection.

**Participants** :
- **Admin** : Utilisateur
- **IdentityStepV2** : Composant étape 1
- **IntermediaryCodeSearch** : Composant de recherche
- **useIntermediaryCodeSearch** : Hook React Query
- **MembersAlgoliaSearchService** : Service Algolia
- **Algolia** : Service externe
- **React Query Cache** : Cache côté client
- **Form (react-hook-form)** : Gestion du formulaire

**Séquences principales** :
1. **Initialisation** : Chargement du formulaire
2. **Recherche en temps réel** : Saisie → Algolia → Cache → Affichage
3. **Sélection** : Clic → Remplissage → Validation
4. **Continuation** : Validation étape 1 → Navigation étape 2

**Points clés** :
- Utilisation du cache React Query
- Debounce pour limiter les appels
- Validation automatique du format
- Intégration avec react-hook-form

## Visualisation

### Génération des diagrammes

```bash
# Installer PlantUML (si nécessaire)
# Via Homebrew (macOS)
brew install plantuml

# Via npm
npm install -g node-plantuml

# Générer les PNG
plantuml use-case-v1.puml
plantuml use-case-v2.puml
plantuml activite.puml
plantuml sequence.puml
```

### Visualisation en ligne

Les diagrammes peuvent être visualisés en ligne via :
- [PlantUML Online Server](https://www.plantuml.com/plantuml/uml/)
- Extension VS Code : "PlantUML"
- Extension Cursor : "PlantUML"

## Fichiers associés

- [../README.md](../README.md) - Documentation principale
- [../problem-solution.md](../problem-solution.md) - Problématique et solution
- [../firebase/firestore-regles.md](../firebase/firestore-regles.md) - Règles Firestore
- [../firebase/firestore-indexes.md](../firebase/firestore-indexes.md) - Index Firestore
- [../tests/README.md](../tests/README.md) - Plan de tests

## Conventions

### Style PlantUML

- **Acteurs** : Style `awesome`
- **Use cases** : Fond `LightBlue`, Bordure `DarkBlue` (V1) ou `LightGreen`, Bordure `DarkGreen` (V2)
- **Packages** : Style `rectangle`
- **Notes** : Utilisées pour expliquer les flux et points clés

### Nomenclature

- **Use cases** : Format `UC-MEM-FORM-XXX` ou `UC-MEM-FORM-XXX-V2`
- **Participants** : Noms des composants réels (ex: `IdentityStepV2`)
- **Acteurs** : Rôles métier (ex: `Admin KARA`)

## Notes importantes

### Architecture respectée

Les diagrammes respectent l'architecture mise en place :
- **Domaine** : `memberships`
- **Couches** : Components → Hooks → Services → Repositories
- **Technologies** : Algolia, React Query, react-hook-form

### Relations avec autres diagrammes

Ces diagrammes complètent les diagrammes existants :
- [../../activite/main.puml](../../activite/main.puml) - Flux principal du formulaire
- [../../sequence/main.puml](../../sequence/main.puml) - Séquence de soumission
