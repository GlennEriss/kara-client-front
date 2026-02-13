# Firebase – Demandes Credit Fixe

> Configuration Firebase necessaire pour le sous-module Demandes Credit Fixe.

## Structure

| Fichier | Contenu |
|---|---|
| `firestore-rules.md` | Regles de securite Firestore pour la collection `creditDemands` |
| `firestore-indexes.md` | Index composites necessaires pour les requetes filtrees |

## Collection Firestore

| Collection | Description |
|---|---|
| `creditDemands` | Stocke toutes les demandes de credit (SPECIALE, FIXE, AIDE). Le type FIXE est filtre via le champ `creditType = 'FIXE'`. |

## Storage

Aucune regle Storage specifique n'est necessaire pour les demandes Credit Fixe.
Les demandes ne stockent pas de fichiers dans Firebase Storage.

## Cloud Functions

Aucune Cloud Function n'est necessaire pour les demandes Credit Fixe.
Toute la logique (creation, validation, suppression, notifications) est geree cote client via le service `CreditFixeDemandService`.
