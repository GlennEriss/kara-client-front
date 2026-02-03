# Organisation des Diagrammes - Membership Requests

## 📁 Structure par Use Case

Les diagrammes sont maintenant organisés par **use case** dans des dossiers dédiés. Chaque use case contient deux sous-dossiers :
- `activite/` : Diagrammes d'activité (workflows)
- `sequence/` : Diagrammes de séquence (interactions)

## 🗂️ Use Cases

### 1. **consultation/**
Consultation et visualisation des demandes d'adhésion.

**Diagrammes :**
- `Voir_Details` : Consulter les détails d'une demande
- `Fiche_Adhesion` : Générer et télécharger la fiche d'adhésion (PDF)
- `Voir_Piece_Identite` : Visualiser le recto/verso de la pièce d'identité

### 2. **approbation/**
Approbation d'une demande d'adhésion.

**Diagrammes :**
- `Approuver` : Workflow d'approbation complète
- `SEQ_Approuver` : Séquence d'interactions pour l'approbation

### 3. **rejet/**
Rejet d'une demande d'adhésion.

**Diagrammes :**
- `Rejeter` : Workflow de rejet
- `SEQ_Rejeter` : Séquence d'interactions pour le rejet

### 4. **paiement/**
Enregistrement des paiements.

**Diagrammes :**
- `Payer` : Workflow d'enregistrement d'un paiement
- `SEQ_Payer` : Séquence d'interactions pour le paiement

### 5. **corrections/**
Demande et gestion des corrections.

**Diagrammes :**
- `Admin_Demander_Corrections_V2` : Admin demande des corrections (V2)
- `Demandeur_Modifier_Corrections_Detaille` : Demandeur modifie les corrections
- `Flux_Complet_Corrections_V2` : Flux complet du cycle de corrections
- `Demander_Corrections` : Workflow de demande de corrections (ancien)
- `SEQ_Demander_Corrections` : Séquence pour demander des corrections
- `SEQ_Renouveler_Code` : Renouveler le code de sécurité

**Sous-dossiers :**
- `activite/` : Diagrammes d'activité
- `sequence/` : Diagrammes de séquence
- `firebase/` : Règles Firestore/Storage et index
- `wireframes/` : Wireframes UI/UX détaillés

### 6. **notifications/**
Gestion des notifications.

**Diagrammes :**
- Voir `notifications/activite/` et `notifications/sequence/`

### 7. **recherche-filtres/**
Recherche, filtrage et navigation.

**Diagrammes :**
- `Recherche` : Workflow de recherche
- `Filtres` : Application des filtres
- `Pagination` : Navigation par pagination
- `Liste_Dossiers` : Chargement de la liste des dossiers

### 8. **autres/**
Fonctionnalités diverses.

**Diagrammes :**
- `Statistiques` : Calcul et affichage des statistiques
- `Legende_Architecture` : Légende de l'architecture refactorisée

### 9. **doublons/**
Détection et consultation des dossiers en doublon (même téléphone, email ou numéro de pièce d'identité).

**Diagrammes :**
- `DetecterEtConsulterDoublons` : Flux détection, alerte et consultation onglet Doublons
- `SEQ_ConsulterDoublons` : Séquence (Domain Component → Hook → Service → Repository)

**Sous-dossiers :**
- `activite/` : Diagrammes d'activité
- `sequence/` : Diagrammes de séquence
- `wireframes/` : Alerte et onglet Doublons (tabs, sections par type d'attribut)
- `workflow/` : Phases d'implémentation

## 📝 Convention de Nommage

- **Diagrammes d'activité** : Nom du workflow (ex: `Approuver.puml`)
- **Diagrammes de séquence** : Préfixe `SEQ_` + nom (ex: `SEQ_Approuver.puml`)
- **Fichiers V2** : Suffixe `_V2` pour les diagrammes de la nouvelle architecture

## 🔍 Comment Utiliser

1. **Naviguer par use case** : Allez dans le dossier correspondant à votre use case
2. **Choisir le type** : `activite/` pour les workflows, `sequence/` pour les interactions
3. **Ouvrir le fichier** : Chaque diagramme est dans son propre fichier `.puml`

## 📚 Fichiers Principaux (Anciens)

Les fichiers principaux `DIAGRAMMES_ACTIVITE.puml` et `DIAGRAMMES_SEQUENCE.puml` sont conservés pour référence mais ne doivent plus être modifiés. Tous les nouveaux diagrammes doivent être créés dans les dossiers par use case.

## 🛠️ Migration

La migration a été effectuée automatiquement via le script `organize_diagrams.py`. Chaque diagramme a été extrait et placé dans le bon dossier selon son use case.
