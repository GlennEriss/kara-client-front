# Diagrammes d'activité – Contrats Caisse Spéciale V2

Ce dossier contient les diagrammes d'activité (workflows) pour la partie Contrats du module Caisse Spéciale, dans le cadre de la nouvelle architecture domaine.

## Fichiers

| Fichier | Description | Points couverts |
|---------|-------------|-----------------|
| [ListerContrats.puml](./ListerContrats.puml) | Lister avec stats globales, tabs (badges mobile), pagination haut/bas, actions, export | C.0, C.1 |
| [FiltrerContrats.puml](./FiltrerContrats.puml) | Filtres actifs (statut, type contrat, type caisse, dates création/échéance, overdueOnly) | C.4 |
| [RechercherContrats.puml](./RechercherContrats.puml) | Recherche Firestore + filtres actifs + pagination | C.2, C.3 |
| [VoirDetailsContrat.puml](./VoirDetailsContrat.puml) | Détails contrat + accès versements | C.5, C.6 |
| [CreerContrat.puml](./CreerContrat.puml) | Création via page /contrats/nouveau (wizard) | C.0 |
| [TeleverserContratPDF.puml](./TeleverserContratPDF.puml) | Upload PDF signé (contrat) | C.5 |
| [ConsulterVersements.puml](./ConsulterVersements.puml) | Historique versements + actions | C.6 |
| [ExporterListeContrats.puml](./ExporterListeContrats.puml) | Export liste (Excel/CSV/PDF) | C.6 |
| [ExporterVersements.puml](./ExporterVersements.puml) | Export versements (Excel/PDF) | C.6 |

## Points critiques intégrés

- **C.0** : Pagination Firestore, pas de chargement complet
- **C.1** : Statistiques globales et cache, non recalculées côté client
- **C.2** : Recherche Firestore (noms, matricule) via champs dénormalisés
- **C.3** : Affichage membre/groupe fiable (join contrôlée)
- **C.4** : Filtres complets (statut, type, caisse, dates, retard)
- **C.5** : Détails accessibles même sans PDF
- **C.6** : Exports + versements standardisés

## Références

- [POINTS_PROBLEMATIQUES.md](../points-problematiques/POINTS_PROBLEMATIQUES.md)
- [ANALYSE_CAISSE_SPECIALE.md](../../V1/ANALYSE_CAISSE_SPECIALE.md)
