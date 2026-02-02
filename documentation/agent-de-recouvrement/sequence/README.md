# Diagrammes de séquence – Agent de recouvrement

## 📋 Vue d'ensemble

Ce dossier contient les diagrammes de séquence pour chaque activité du module **Agent de recouvrement**. Chaque diagramme décrit les interactions entre les acteurs et les composants du système pour un cas d'usage donné.

## 📄 Fichiers

| Fichier | Activité associée | Description |
|---------|-------------------|-------------|
| [SEQ_CreerAgent.puml](./SEQ_CreerAgent.puml) | CreerAgent.puml | Séquence création d'un agent (Admin → Modal → Hook → Service → Repo → Firestore) |
| [SEQ_ModifierAgent.puml](./SEQ_ModifierAgent.puml) | ModifierAgent.puml | Séquence modification d'un agent (chargement + mise à jour) |
| [SEQ_DesactiverAgent.puml](./SEQ_DesactiverAgent.puml) | DesactiverAgent.puml | Séquence désactivation d'un agent (confirmation + update actif=false) |
| [SEQ_SupprimerAgent.puml](./SEQ_SupprimerAgent.puml) | SupprimerAgent.puml | Séquence suppression d'un agent (confirmation irréversible + deleteDoc) |
| [SEQ_ListerAgents.puml](./SEQ_ListerAgents.puml) | ListerAgents.puml | Séquence listage (stats + liste paginée + filtres/recherche/tri) |
| [SEQ_StatsAgents.puml](./SEQ_StatsAgents.puml) | StatsAgents.puml | Séquence chargement des statistiques (cache 2 min) |
| [SEQ_RechercherAgents.puml](./SEQ_RechercherAgents.puml) | RechercherAgents.puml | Séquence recherche (debounce + recherche combinée + pagination) |
| [SEQ_VoirDetailsAgent.puml](./SEQ_VoirDetailsAgent.puml) | VoirDetailsAgent.puml | Séquence affichage détails d'un agent (404 si introuvable) |
| [SEQ_NotificationsAgent.puml](./SEQ_NotificationsAgent.puml) | NotificationsAgent.puml | Séquence notifications sur page détails (affichage complémentaire) |
| [SEQ_CloudFunctionNotificationsAgent.puml](./SEQ_CloudFunctionNotificationsAgent.puml) | CloudFunctionNotificationsAgent.puml | Séquence Cloud Function (notifications avant/J/après) |
| [SEQ_SelectionnerAgentCredit.puml](./SEQ_SelectionnerAgentCredit.puml) | SelectionnerAgentCredit.puml | Séquence sélection agent lors paiement Crédit spéciale |
| [SEQ_SelectionnerAgentCaisse.puml](./SEQ_SelectionnerAgentCaisse.puml) | SelectionnerAgentCaisse.puml | Séquence sélection agent lors contribution Caisse spéciale |
| [SEQ_SelectionnerAgentCI.puml](./SEQ_SelectionnerAgentCI.puml) | SelectionnerAgentCI.puml | Séquence sélection agent lors versement Caisse imprévue |
| [SEQ_GestionErreursAgents.puml](./SEQ_GestionErreursAgents.puml) | GestionErreursAgents.puml | Séquences de gestion des erreurs (validation, 404, réseau, règles métier) |

## 🔗 Correspondance Activité ↔ Séquence

| Diagramme activité | Diagramme séquence |
|--------------------|--------------------|
| CreerAgent.puml | SEQ_CreerAgent.puml |
| ModifierAgent.puml | SEQ_ModifierAgent.puml |
| DesactiverAgent.puml | SEQ_DesactiverAgent.puml |
| SupprimerAgent.puml | SEQ_SupprimerAgent.puml |
| ListerAgents.puml | SEQ_ListerAgents.puml |
| StatsAgents.puml | SEQ_StatsAgents.puml |
| RechercherAgents.puml | SEQ_RechercherAgents.puml |
| VoirDetailsAgent.puml | SEQ_VoirDetailsAgent.puml |
| SelectionnerAgentCredit.puml | SEQ_SelectionnerAgentCredit.puml |
| SelectionnerAgentCaisse.puml | SEQ_SelectionnerAgentCaisse.puml |
| SelectionnerAgentCI.puml | SEQ_SelectionnerAgentCI.puml |
| GestionErreursAgents.puml | SEQ_GestionErreursAgents.puml |
| NotificationsAgent.puml | SEQ_NotificationsAgent.puml |
| CloudFunctionNotificationsAgent.puml | SEQ_CloudFunctionNotificationsAgent.puml |

## 📖 Visualisation

Pour visualiser les diagrammes PlantUML :

- Extension VS Code : PlantUML
- En ligne : [PlantUML Server](https://www.plantuml.com/plantuml/uml/)
- CLI : `plantuml *.puml` (depuis ce dossier)
