# Règles Firestore et Storage – Module Caisse Spéciale

> Documentation des règles nécessaires pour les pages `/caisse-speciale`, `/caisse-speciale/demandes` et sous-pages

---

## Collections Firestore

### caisseContracts (page principale /caisse-speciale)

**Collection** : `caisseContracts`

**Description** : Contrats Caisse Spéciale (liste, détails, versements).

| Opération | Condition |
|-----------|-----------|
| Lecture | Admin uniquement |
| Écriture | Admin uniquement |

**Sous-collection** : `caisseContracts/{contractId}/refunds`
- Remboursements (retrait anticipé, remboursement final)
- Lecture/écriture : Admin uniquement

---

### caisseSpecialeDemands (page /caisse-speciale/demandes)

**Fichier** : `firestore.rules` (racine du projet)

**Collection** : `caisseSpecialeDemands`

**Description** : Demandes de contrats Caisse Spéciale (liste, création, approbation, refus, réouverture, conversion).

| Opération | Condition |
|-----------|-----------|
| Lecture | Admin uniquement |
| Création | Admin + validation des champs (memberId, caisseType, monthlyAmount, monthsPlanned, desiredDate, status=PENDING, createdBy) |
| Mise à jour | Admin uniquement |
| Suppression | Admin + statut REJECTED uniquement |

**Champs validés à la création** :
- `memberId` : string requis
- `contractType` : 'INDIVIDUAL'
- `caisseType` : 'STANDARD' | 'JOURNALIERE' | 'LIBRE'
- `monthlyAmount` : nombre, 1000–10 000 000
- `monthsPlanned` : nombre, 1–120
- `desiredDate` : string non vide
- `status` : 'PENDING'
- `createdBy` : UID de l'utilisateur connecté

---

## Chemins Storage

### caisse/{contractId}/payments/{paymentId}/{fileName} (page contrat CS)

**Chemin** : `caisse/{contractId}/payments/{paymentId}/{fileName}`

**Description** : Preuves de paiement (images) uploadées lors de l'enregistrement d'un versement (pay(), updatePaymentContribution()).

| Opération | Condition |
|-----------|-----------|
| Lecture | Admin uniquement |
| Écriture | Admin + image + max 5 MB |
| Suppression | Admin uniquement |

---

### caisse/{contractId}/payments/{paymentId}/contributions/{fileName}

**Description** : Preuves de paiement pour contributions de groupe (payGroup()).

| Opération | Condition |
|-----------|-----------|
| Lecture | Admin uniquement |
| Écriture | Admin + image + max 5 MB |
| Suppression | Admin uniquement |

---

### caisse/{contractId}/refunds/{refundId}/{fileName}

**Description** : Documents de preuve pour remboursements (markRefundPaid()).

| Opération | Condition |
|-----------|-----------|
| Lecture | Admin uniquement |
| Écriture | Admin + PDF ou image + max 5 MB |
| Suppression | Admin uniquement |

---

### contract-documents/{contractId}/{refundId}/{fileName}

**Description** : PDFs de remboursement final/anticipé uploadés via PdfDocumentModal (StandardContract, DailyContract, FreeContract).

| Opération | Condition |
|-----------|-----------|
| Lecture | Admin uniquement |
| Écriture | Admin + PDF + max 10 MB |
| Suppression | Admin uniquement |

---

### contracts/{contractId}/{fileName} (page /caisse-speciale)

**Chemin** : `contracts/{contractId}/{fileName}`

**Description** : PDFs de contrats signés uploadés via ContractPdfUploadModal (ListContracts).

| Opération | Condition |
|-----------|-----------|
| Lecture | Admin uniquement |
| Écriture | Admin + PDF + max 10 MB |
| Suppression | Admin uniquement |

---

### emergency-contacts/

**Fichier** : `storage.rules` (racine du projet)

**Chemin** : `emergency-contacts/{fileName}`

**Description** : Photos de pièces d'identité des contacts d'urgence (formulaires de création de contrat CS).

| Opération | Condition |
|-----------|-----------|
| Lecture | Admin uniquement |
| Écriture | Admin + image (jpeg/jpg/png/webp) + max 5 MB |
| Suppression | Admin uniquement |

---

## Collections déjà couvertes (utilisées par la page)

- **members** : Lecture par utilisateur authentifié (recherche membre, infos)
- **admins** : Lecture publique (noms des décideurs)
- **notifications** : Création par admin (notifications de demande)
- **caisseContracts** : Lecture/écriture admin (conversion demande → contrat)
