# Diagrammes d'activité – Demandes Caisse Spéciale V2

Ce dossier contient les diagrammes d'activité (workflows) pour la partie Demandes du module Caisse Spéciale, dans le cadre de la nouvelle architecture domaine.

## Fichiers

| Fichier | Description | Points couverts |
|---------|-------------|-----------------|
| [ListerDemandes.puml](./ListerDemandes.puml) | Lister avec stats, tabs, pagination, recherche, filtres, Actualiser | C.0, C.1, C.5 |
| [FiltrerDemandes.puml](./FiltrerDemandes.puml) | Filtrer par statut, date, type caisse, recherche (pagination page 1) | C.2, C.3, C.4 |
| [RechercherDemandes.puml](./RechercherDemandes.puml) | Recherche par nom, prénom, matricule (combinée avec filtres, paginée) | C.3, C.8 |
| [CreerDemande.puml](./CreerDemande.puml) | Créer via PAGE (pas modal), createdBy, 3 searchableText | C.0, C.6, C.7, C.8 |
| [AccepterDemande.puml](./AccepterDemande.puml) | Accepter + traçabilité (approvedBy, approvedAt) | Traçabilité |
| [RefuserDemande.puml](./RefuserDemande.puml) | Refuser + traçabilité (rejectedBy, rejectedAt) | Traçabilité |
| [ReouvrirDemande.puml](./ReouvrirDemande.puml) | Réouvrir + traçabilité (reopenedBy, reopenedAt) | Traçabilité |
| [ConvertirContrat.puml](./ConvertirContrat.puml) | Convertir + traçabilité (convertedBy, convertedAt) | Traçabilité |
| [VoirDetails.puml](./VoirDetails.puml) | Détails, tableau versements, export PDF/Excel | 2.1, 2.2, 2.3 |
| [ExporterDetailsDemande.puml](./ExporterDetailsDemande.puml) | Export PDF détails complets (détails + tableau versements) | Export PDF |

## Points critiques intégrés

- **C.0** : Contact d'urgence obligatoire à la création, affiché sur liste et détails
- **C.1** : Statistiques EN PREMIER, chargées une seule fois
- **C.2** : Filtres (statut, type caisse, dates)
- **C.3** : Recherche par nom, prénom, matricule (combinée avec filtres)
- **C.4** : Filtres par date (création, date souhaitée)
- **C.5** : Vue Liste = vrai tableau (colonnes comme membership-requests)
- **C.6** : Création via PAGE /demandes/nouvelle (pas de modal)
- **C.7** : Traçabilité createdBy (admin créateur)
- **C.8** : 3 searchableText (nom, prénom, matricule en premier) pour recherche Firestore
- **Traçabilité** : approvedBy/At, rejectedBy/At, reopenedBy/At, convertedBy/At sur chaque action

## Références

- [POINTS_PROBLEMATIQUES.md](../points-problematiques/POINTS_PROBLEMATIQUES.md)
- [DEMANDES_CAISSE_SPECIALE.md](../../V1/DEMANDES_CAISSE_SPECIALE.md)
