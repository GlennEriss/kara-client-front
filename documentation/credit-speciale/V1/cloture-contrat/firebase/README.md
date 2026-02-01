# Documentation Firebase - Clôture de contrat (Crédit spéciale)

> Configuration Firestore et Storage nécessaire pour le use case de clôture de contrat

## 📋 Table des matières

1. [Vue d'ensemble](#vue-densemble)
2. [Collections Firestore](#collections-firestore)
3. [Règles Firestore](#règles-firestore)
4. [Règles Storage](#règles-storage)
5. [Index Firestore](#index-firestore)

## Vue d'ensemble

Le flux de clôture de contrat implique :

- **Phase 1** : Validation du remboursement final (décharge) → mise à jour `creditContracts`
- **Phase 2** : Téléchargement quittance remplie → création document + upload Storage
- **Phase 3** : Téléversement quittance signée → création document + mise à jour contrat
- **Phase 4** : Clôture du contrat → mise à jour `creditContracts`

## Collections Firestore

| Collection | Opérations | Champs impactés |
|------------|------------|------------------|
| `creditContracts` | read, update | `status`, `dischargeMotif`, `dischargedBy`, `dischargedAt`, `signedQuittanceUrl`, `signedQuittanceDocumentId`, `closedAt`, `closedBy`, `motifCloture` |
| `documents` | read, create | `type` (CREDIT_SPECIALE_QUITTANCE, CREDIT_SPECIALE_QUITTANCE_SIGNED), `contractId`, `memberId`, `path`, `url` |

## Fichiers de documentation

- **README.md** : Ce fichier (vue d'ensemble)
- **FIRESTORE_RULES.md** : Règles de sécurité Firestore pour `creditContracts` (transitions DISCHARGED, CLOSED)
- **STORAGE_RULES.md** : Règles Storage pour les quittances (PDF)
- **INDEXES.md** : Index Firestore nécessaires pour les requêtes du flux

## Intégration avec les règles existantes

Les règles et index de ce use case **complètent** les configurations déjà présentes dans :

- `firestore.rules` : section `creditContracts` (lignes 505-511)
- `storage.rules` : section `contracts-ci` (lignes 145-186)
- `firestore.indexes.json` : index `creditContracts` existants

---

**Référence** : [ANALYSE_CLOTURE_CONTRAT.md](../ANALYSE_CLOTURE_CONTRAT.md)  
**Date** : 2026-02-01
