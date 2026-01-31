# Diagrammes de séquence – Demandes Caisse Spéciale V2

Ce dossier contient les diagrammes de séquence pour la partie Demandes du module Caisse Spéciale. **Les diagrammes de séquence sont alignés avec les diagrammes d'activité** : ils détaillent la même logique avec les interactions entre composants.

## Fichiers

| Fichier | Description | Référence activité | Points couverts |
|---------|-------------|-------------------|-----------------|
| [SEQ_ListerDemandes.puml](./SEQ_ListerDemandes.puml) | Chargement liste, stats AVANT tabs, Nouvelle Demande → page, Actualiser | ListerDemandes.puml | C.1, C.5, C.6 |
| [SEQ_FiltrerDemandes.puml](./SEQ_FiltrerDemandes.puml) | Recherche (3 searchableText), filtres date, filtre statut, pagination | FiltrerDemandes.puml, RechercherDemandes.puml | C.2, C.3, C.4, C.8 |
| [SEQ_CreerDemande.puml](./SEQ_CreerDemande.puml) | Création via PAGE (pas modal), createdBy, 3 searchableText | CreerDemande.puml | C.0, C.6, C.7, C.8 |
| [SEQ_AccepterDemande.puml](./SEQ_AccepterDemande.puml) | Acceptation + traçabilité (approvedBy, approvedAt) | AccepterDemande.puml | Traçabilité |
| [SEQ_RefuserDemande.puml](./SEQ_RefuserDemande.puml) | Refus + traçabilité (rejectedBy, rejectedAt) | RefuserDemande.puml | Traçabilité |
| [SEQ_ReouvrirDemande.puml](./SEQ_ReouvrirDemande.puml) | Réouverture + traçabilité (reopenedBy, reopenedAt) | ReouvrirDemande.puml | Traçabilité |
| [SEQ_ConvertirContrat.puml](./SEQ_ConvertirContrat.puml) | Conversion + traçabilité (convertedBy, convertedAt) | ConvertirContrat.puml | Traçabilité |
| [SEQ_VoirDetails.puml](./SEQ_VoirDetails.puml) | Détails, tableau versements, export PDF/Excel | VoirDetails.puml | 2.1, 2.2, 2.3 |
| [SEQ_ExporterDetailsDemande.puml](./SEQ_ExporterDetailsDemande.puml) | Export PDF détails complets (détails + tableau versements) | ExporterDetailsDemande.puml | Export PDF |

## Alignement activité ↔ séquence

Chaque diagramme de séquence correspond à un (ou plusieurs) diagramme(s) d'activité. La logique est identique ; le diagramme de séquence ajoute le détail des interactions (composants, hooks, services, Firestore).

## Architecture domaine

- **Page** → **Composant** → **Hook** → **Service** → **Repository** → **Firestore**
- **React Query** pour le cache (staleTime : stats 2 min, liste 30 s)
- **useMember** pour afficher les infos du membre
- **Traçabilité** : approvedBy/At, rejectedBy/At, reopenedBy/At, convertedBy/At sur chaque action

## Références

- [POINTS_PROBLEMATIQUES.md](../points-problematiques/POINTS_PROBLEMATIQUES.md)
- [Diagrammes d'activité](../activite/README.md)
