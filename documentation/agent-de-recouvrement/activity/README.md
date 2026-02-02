# Diagrammes d'activité – Agent de recouvrement

## 📋 Vue d'ensemble

Ce dossier contient les diagrammes d'activité (workflow) pour chaque use case du module **Agent de recouvrement**.

## 📄 Fichiers

| Fichier | Use case | Description |
|---------|----------|-------------|
| [ListerAgents.puml](./ListerAgents.puml) | UC-AR-001 | Lister les agents (pagination, filtres Actifs/Tous/Inactifs/Anniversaires, vue cards/liste) |
| [StatsAgents.puml](./StatsAgents.puml) | UC-AR-009 | Statistiques (actifs, inactifs, total, hommes, femmes, anniversaires du mois) |
| [RechercherAgents.puml](./RechercherAgents.puml) | UC-AR-001 | Rechercher les agents (nom, prénom, numéro pièce, tel) |
| [VoirDetailsAgent.puml](./VoirDetailsAgent.puml) | UC-AR-008 | Voir les détails d'un agent |
| [NotificationsAgent.puml](./NotificationsAgent.puml) | UC-AR-008 | Notifications sur page détails (affichage complémentaire) |
| [CloudFunctionNotificationsAgent.puml](./CloudFunctionNotificationsAgent.puml) | — | Cloud Function : notifications avant/J/après (anniversaire + pièce) |
| [CreerAgent.puml](./CreerAgent.puml) | UC-AR-002 | Créer un agent de recouvrement (avec sexe) |
| [ModifierAgent.puml](./ModifierAgent.puml) | UC-AR-003 | Modifier un agent de recouvrement |
| [DesactiverAgent.puml](./DesactiverAgent.puml) | UC-AR-004 | Désactiver un agent de recouvrement |
| [SupprimerAgent.puml](./SupprimerAgent.puml) | UC-AR-010 | Supprimer un agent (irréversible, modal confirmation) |
| [SelectionnerAgentCredit.puml](./SelectionnerAgentCredit.puml) | UC-AR-005 | Sélectionner l'agent lors d'un paiement Crédit spéciale |
| [SelectionnerAgentCaisse.puml](./SelectionnerAgentCaisse.puml) | UC-AR-006 | Sélectionner l'agent lors d'une contribution Caisse spéciale |
| [SelectionnerAgentCI.puml](./SelectionnerAgentCI.puml) | UC-AR-007 | Sélectionner l'agent lors d'un versement Caisse imprévue |
| [GestionErreursAgents.puml](./GestionErreursAgents.puml) | — | Gestion des erreurs (validation, 404, réseau, règles métier) |

## 🔗 Correspondance Use Cases ↔ Activité

| UC | Diagramme activité |
|----|-------------------|
| UC-AR-001 Lister les agents | ListerAgents.puml, RechercherAgents.puml |
| UC-AR-008 Voir détails agent | VoirDetailsAgent.puml, NotificationsAgent.puml, CloudFunctionNotificationsAgent.puml |
| UC-AR-009 Stats agents | StatsAgents.puml |
| UC-AR-002 Créer un agent | CreerAgent.puml |
| UC-AR-003 Modifier un agent | ModifierAgent.puml |
| UC-AR-004 Désactiver un agent | DesactiverAgent.puml |
| UC-AR-010 Supprimer un agent | SupprimerAgent.puml |
| UC-AR-005 Sélectionner agent (Crédit spéciale) | SelectionnerAgentCredit.puml |
| UC-AR-006 Sélectionner agent (Caisse spéciale) | SelectionnerAgentCaisse.puml |
| UC-AR-007 Sélectionner agent (Caisse imprévue) | SelectionnerAgentCI.puml |

## 📖 Visualisation

Pour visualiser les diagrammes PlantUML :

- Extension VS Code : PlantUML
- En ligne : [PlantUML Server](https://www.plantuml.com/plantuml/uml/)
- CLI : `plantuml *.puml` (depuis ce dossier)
