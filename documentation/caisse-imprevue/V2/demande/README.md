# Documentation UML - Module Demandes Caisse Imprévue V2

> Documentation complète des diagrammes UML pour le module Demandes Caisse Imprévue V2

## 📁 Structure des Diagrammes

```
V2/demande/
├── USE_CASES.puml                    # Diagramme de use cases global
├── activite/                         # Diagrammes d'activité
│   ├── CreerDemande.puml
│   ├── ListerDemandes.puml
│   ├── VoirDetails.puml
│   ├── AccepterDemande.puml
│   ├── RefuserDemande.puml
│   ├── ReouvrirDemande.puml
│   ├── SupprimerDemande.puml
│   ├── ModifierDemande.puml
│   ├── CreerContrat.puml
│   ├── RechercherDemandes.puml
│   ├── FiltrerDemandes.puml
│   └── TrierDemandes.puml
├── sequence/                         # Diagrammes de séquence
│   ├── SEQ_CreerDemande.puml
│   ├── SEQ_ListerDemandes.puml
│   ├── SEQ_VoirDetails.puml
│   ├── SEQ_AccepterDemande.puml
│   ├── SEQ_RefuserDemande.puml
│   ├── SEQ_ReouvrirDemande.puml
│   ├── SEQ_SupprimerDemande.puml
│   ├── SEQ_ModifierDemande.puml
│   ├── SEQ_CreerContrat.puml
│   ├── SEQ_RechercherDemandes.puml
│   ├── SEQ_FiltrerDemandes.puml
│   └── SEQ_TrierDemandes.puml
└── README.md                         # Ce fichier
```

## 📊 Diagrammes Disponibles

### 1. Diagramme de Use Cases Global

**Fichier** : `USE_CASES.puml`

**Description** : Vue d'ensemble de tous les use cases du module, organisés par packages :
- Gestion des Demandes (création, liste, détails, modification, suppression)
- Actions sur Demandes (accepter, refuser, réouvrir, créer contrat)
- Recherche et Filtres (recherche, filtres, tri)
- Pagination (navigation, changement limite)
- Persistance et Cache (localStorage, cache React Query)
- Simulation (calculs, tableau récapitulatif)

### 2. Diagrammes d'Activité

#### 2.1. Créer une Demande (`CreerDemande.puml`)
**Description** : Workflow complet de création d'une demande en 3 étapes :
- Étape 1 : Sélection membre + Motif (avec persistance localStorage)
- Étape 2 : Sélection forfait + Fréquence (avec cache 30 min)
- Étape 3 : Contact d'urgence (exclusion automatique du membre)

**Points clés** :
- Persistance automatique (debounce 500ms)
- Cache forfaits (pas de refetch)
- Exclusion membre dans contact
- Scroll automatique
- Validation en temps réel

#### 2.2. Lister les Demandes (`ListerDemandes.puml`)
**Description** : Workflow de liste avec pagination, tri, recherche et filtres :
- Chargement avec cache (5 min)
- Ordre de priorité dans tab "Toutes"
- Recherche avec cache (2 min)
- Filtres multiples
- Tri par date ou alphabétique
- Pagination haut et bas

#### 2.3. Voir les Détails (`VoirDetails.puml`)
**Description** : Workflow d'affichage des détails complets :
- Chargement avec cache (10 min) + prefetch
- Affichage toutes les informations
- Simulation versements (DAILY vs MONTHLY)
- Tableau récapitulatif
- Actions contextuelles selon statut

#### 2.4. Accepter une Demande (`AccepterDemande.puml`)
**Description** : Workflow d'acceptation avec modal complet :
- Modal avec toutes les informations
- Validation raison (min 10 caractères)
- Optimistic update
- Invalidation cache

#### 2.5. Refuser une Demande (`RefuserDemande.puml`)
**Description** : Workflow de refus avec modal complet :
- Modal avec toutes les informations
- Validation motif (min 10 caractères)
- Optimistic update
- Boutons "Réouvrir" et "Supprimer" disponibles après

#### 2.6. Réouvrir une Demande (`ReouvrirDemande.puml`)
**Description** : Workflow de réouverture d'une demande refusée :
- Modal avec motif de refus précédent
- Validation raison (min 10 caractères)
- Historique des statuts

#### 2.7. Supprimer une Demande (`SupprimerDemande.puml`)
**Description** : Workflow de suppression avec confirmation :
- Modal destructive (rouge)
- Confirmation explicite (checkbox)
- Action irréversible

#### 2.8. Modifier une Demande (`ModifierDemande.puml`)
**Description** : Workflow de modification avec formulaire pré-rempli :
- Modal avec formulaire 3 étapes
- Données pré-remplies
- Même structure que création
- Validation en temps réel

#### 2.9. Créer un Contrat (`CreerContrat.puml`)
**Description** : Workflow de création de contrat depuis demande acceptée :
- Modal de confirmation
- Création contrat + mise à jour demande
- Transaction atomique

#### 2.10. Rechercher des Demandes (`RechercherDemandes.puml`)
**Description** : Workflow de recherche avec cache :
- Debounce 300ms
- Normalisation query
- Cache 2 min
- Recherche par préfixe Firestore

#### 2.11. Filtrer les Demandes (`FiltrerDemandes.puml`)
**Description** : Workflow de filtrage multiple :
- Filtres combinables
- Reset pagination
- Cache par combinaison

#### 2.12. Trier les Demandes (`TrierDemandes.puml`)
**Description** : Workflow de tri :
- Tri par date ou alphabétique
- Ordre croissant/décroissant
- Ordre de priorité dans tab "Toutes"

### 3. Diagrammes de Séquence

Chaque diagramme d'activité a son correspondant en diagramme de séquence, détaillant les interactions entre les composants, hooks, services, repositories et Firestore.

**Points communs** :
- Interactions détaillées entre composants
- Gestion du cache React Query
- Optimistic updates
- Invalidation cache intelligente
- Gestion d'erreurs

## 🎯 Points Clés des Diagrammes

### Architecture
- **Séparation des couches** : Components → Hooks → Services → Repositories → Firestore
- **Cache React Query** : Stratégie différenciée selon le type de données
- **Optimistic Updates** : Mise à jour UI immédiate avec rollback en cas d'erreur

### Performance
- **Cache intelligent** : staleTime et gcTime adaptés
- **Prefetch** : Préchargement détails au survol
- **Debounce** : Recherche et sauvegarde formulaire
- **Pagination serveur** : Cursor-based avec startAfter

### UX
- **Persistance** : localStorage avec expiration 24h
- **Scroll automatique** : À chaque changement d'étape
- **Validation temps réel** : Feedback immédiat
- **Loading states** : États de chargement appropriés

## 📖 Utilisation

### Visualiser les Diagrammes

Les diagrammes PlantUML peuvent être visualisés avec :
- **VS Code** : Extension "PlantUML"
- **IntelliJ/WebStorm** : Plugin PlantUML intégré
- **En ligne** : http://www.plantuml.com/plantuml/uml/
- **CLI** : `plantuml *.puml`

### Générer les Images

```bash
# Installer PlantUML (si pas déjà fait)
# macOS
brew install plantuml

# Générer toutes les images
cd documentation/caisse-imprevue/V2/demande
plantuml *.puml activite/*.puml sequence/*.puml
```

## 🔄 Mise à Jour

Les diagrammes doivent être mis à jour si :
- Nouvelle fonctionnalité ajoutée
- Changement dans le flux d'interaction
- Modification de l'architecture
- Ajout/suppression de composants

## 📚 Références

- **Documentation solution** : `SOLUTIONS_PROPOSEES.md`
- **Critique** : `CRITIQUE_CODE_ET_DESIGN.md`
- **Architecture** : `documentation/architecture/PLAN_MIGRATION_DOMAINS.md`

---

**Date de création** : 2026-01-27  
**Version** : V2  
**Auteur** : Senior Architecte / Senior Dev
