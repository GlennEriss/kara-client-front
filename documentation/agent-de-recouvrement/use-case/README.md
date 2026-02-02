# Use Cases – Agent de recouvrement

## 📋 Vue d'ensemble

Ce dossier contient le diagramme de cas d'utilisation (use case) du module **Agent de recouvrement**.

## 📄 Fichier

| Fichier | Description |
|---------|-------------|
| [UC_AgentRecouvrement.puml](./UC_AgentRecouvrement.puml) | Diagramme PlantUML des use cases du module |

## 🎯 Use cases

### Gestion des agents

| ID | Use case | Acteur | Description |
|----|----------|--------|-------------|
| UC-AR-001 | Lister les agents | Admin | Afficher la liste des agents de recouvrement actifs |
| UC-AR-002 | Créer un agent | Admin | Créer un nouvel agent (nom, prénom, sexe, pièce d'identité, date/lieu de naissance, tel1, tel2) |
| UC-AR-003 | Modifier un agent | Admin | Modifier les informations d'un agent existant |
| UC-AR-004 | Désactiver un agent | Admin | Désactiver un agent sans supprimer l'historique |

### Traçabilité lors des versements

| ID | Use case | Acteur | Contexte |
|----|----------|--------|----------|
| UC-AR-005 | Sélectionner l'agent (Crédit spéciale) | Admin | Modal `CreditPaymentModal` – paiement d'échéance |
| UC-AR-006 | Sélectionner l'agent (Caisse spéciale) | Admin | Formulaire paiement contributions |
| UC-AR-007 | Sélectionner l'agent (Caisse imprévue) | Admin | Formulaire versement `DailyCIContract` |
| UC-AR-008 | Voir détails agent | Admin | Page détails `/admin/agents-recouvrement/[id]` |
| UC-AR-009 | Stats agents | Admin | Stats : Total, Actifs, Inactifs, Hommes, Femmes |

## 🔗 Relations

- **UC-SELECT-*** → UC-LIST : Chaque sélection d'agent inclut le chargement de la liste des agents actifs
- **UC-EDIT** / **UC-DEACTIVATE** → UC-LIST : Modification et désactivation s'effectuent après sélection dans la liste

## 📂 Diagrammes d'activité

Chaque use case dispose d'un diagramme d'activité dédié dans [`../activity/`](../activity/).

## 📖 Visualisation

Pour visualiser le diagramme PlantUML :

- Extension VS Code : PlantUML
- En ligne : [PlantUML Server](https://www.plantuml.com/plantuml/uml/)
- CLI : `plantuml UC_AgentRecouvrement.puml`
