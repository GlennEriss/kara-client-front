# Diagrammes de séquence – Contrats Caisse Spéciale V2

Ce dossier contient les diagrammes de séquence pour la partie Contrats du module Caisse Spéciale. **Les diagrammes de séquence sont alignés avec les diagrammes d'activité** : ils détaillent la même logique avec les interactions entre composants.

## Fichiers

| Fichier | Description | Référence activité | Points couverts |
|---------|-------------|-------------------|-----------------|
| [SEQ_ListerContrats.puml](./SEQ_ListerContrats.puml) | Liste paginée + stats + pagination haut/bas | ListerContrats.puml | C.0, C.1 |
| [SEQ_FiltrerContrats.puml](./SEQ_FiltrerContrats.puml) | Filtres + pagination | FiltrerContrats.puml | C.4 |
| [SEQ_RechercherContrats.puml](./SEQ_RechercherContrats.puml) | Recherche Firestore | RechercherContrats.puml | C.2, C.3 |
| [SEQ_VoirDetailsContrat.puml](./SEQ_VoirDetailsContrat.puml) | Détails contrat + CTA PDF | VoirDetailsContrat.puml | C.5 |
| [SEQ_CreerContrat.puml](./SEQ_CreerContrat.puml) | Création contrat (wizard) | CreerContrat.puml | C.0 |
| [SEQ_TeleverserContratPDF.puml](./SEQ_TeleverserContratPDF.puml) | Upload PDF signé | TeleverserContratPDF.puml | C.5 |
| [SEQ_ConsulterVersements.puml](./SEQ_ConsulterVersements.puml) | Historique versements | ConsulterVersements.puml | C.6 |
| [SEQ_ExporterListeContrats.puml](./SEQ_ExporterListeContrats.puml) | Export liste | ExporterListeContrats.puml | C.6 |
| [SEQ_ExporterVersements.puml](./SEQ_ExporterVersements.puml) | Export versements | ExporterVersements.puml | C.6 |

## Alignement activité ↔ séquence

Chaque diagramme de séquence correspond à un (ou plusieurs) diagramme(s) d'activité. La logique est identique ; le diagramme de séquence ajoute le détail des interactions (composants, hooks, services, Firestore).

## Architecture domaine

- **Page** → **Domain Component** → **Domain Hook** → **Domain Service** → **Domain Repository** → **Firestore**
- **React Query** pour le cache (staleTime : stats 2 min, liste 30 s)
- **useMember / useGroup** pour les informations d'affichage

## Références

- [POINTS_PROBLEMATIQUES.md](../points-problematiques/POINTS_PROBLEMATIQUES.md)
- [Diagrammes d'activité](../activite/README.md)
