# Diagrammes de sequence - Dashboard

Ce dossier contient les sequences principales du dashboard en mode tabs-first.

## Fichiers

| Fichier | Description | Reference activite |
|---|---|---|
| `SEQ_ChargerDashboard.puml` | Chargement initial avec tab par defaut (`executive`), cache et fallback Cloud Function. | `dashboard/activite/DashboardPilotageActivite.puml` |
| `SEQ_ChangerFiltresDashboard.puml` | Changement de filtres **ou de tab module** et rechargement du contenu cible. | `dashboard/activite/DashboardPilotageActivite.puml` |

## Architecture appliquee

- Page/Component
- Tabs UI
- Hook React Query
- Service d'agregation
- Repository snapshot Firestore
- Cloud Function dashboard
- Collections source Firestore

