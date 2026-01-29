# Remboursements – Module Caisse Imprévue

## 1. Contexte et périmètre

Ce document décrit le **workflow des remboursements** pour les contrats Caisse Imprévue (CI), incluant :
- Retrait anticipé (avant la fin du contrat)
- Remboursement final (à l’issue de tous les versements)
- Statuts des demandes de remboursement
- Logique d’activation des boutons
- Actions disponibles pour l’administrateur

## 2. Types de remboursement

### 2.1. Retrait anticipé (EARLY)

- **Définition** : Le membre demande à récupérer ses versements avant la fin du contrat.
- **Condition d’activation** : Au moins **1 mois/jour payé** et **tous les mois/jours ne sont pas encore payés**.
- **Effet** : Le contrat passe au statut `CANCELED` (résilié).

### 2.2. Remboursement final (FINAL)

- **Définition** : Le membre demande le remboursement à l’issue de tous les versements prévus.
- **Condition d’activation** : **Tous les mois/jours sont payés** (nombre de versements payés ≥ durée du contrat).
- **Effet** : Le contrat passe au statut `FINISHED` (terminé).

## 3. Ordre d’activation des boutons

| Situation | Retrait anticipé | Remboursement final |
|-----------|------------------|---------------------|
| 0 mois payé | Désactivé | Désactivé |
| 1 à N-1 mois payés | **Activé** | Désactivé |
| Tous les N mois payés | Désactivé | **Activé** |

**Formule de calcul** (à utiliser dans le code) :

```typescript
const totalMonths = contract.subscriptionCIDuration || 0
const paidCount = payments.filter(p => p.status === 'PAID').length
const allPaid = totalMonths > 0 && paidCount >= totalMonths

const canEarly = paidCount >= 1 && !allPaid && contract.status !== 'CANCELED' && contract.status !== 'FINISHED'
const canFinal = allPaid && contract.status !== 'CANCELED' && contract.status !== 'FINISHED'
```

**Important** : Ne pas utiliser `payments.length` pour déterminer si tous les mois sont payés. `payments.length` ne contient que les mois ayant un enregistrement de paiement (mois payés). La durée totale du contrat est `subscriptionCIDuration`.

## 4. Statuts d’une demande de remboursement

Une demande de remboursement (retrait anticipé ou final) suit le cycle suivant :

| Statut | Libellé UI | Signification |
|--------|------------|---------------|
| `PENDING` | En attente | Demande créée par le membre, en attente d’approbation par l’administrateur |
| `APPROVED` | Approuvé | Demande validée par l’admin, en attente du versement effectif au membre |
| `PAID` | Payé | Remboursement effectué au membre |
| `ARCHIVED` | Archivé | Demande annulée ou archivée |

### 4.1. Cycle de vie

```
PENDING → APPROVED → PAID
    ↓
ARCHIVED (annulation)
```

### 4.2. Explication du statut « En attente »

**« En attente »** signifie que le membre a soumis une demande de remboursement, mais qu’elle n’a pas encore été validée par un administrateur.

- **PENDING** : « En attente d’approbation par l’administrateur »
- **APPROVED** : « En attente du versement effectif au membre »

## 5. Actions de l’administrateur

### 5.1. Pour une demande en statut PENDING

- **Approuver** : Passe le statut à `APPROVED`.
- **Document de remboursement** : Génère et télécharge le PDF de remboursement.

### 5.2. Pour une demande en statut APPROVED

- **Marquer comme payé** : Passe le statut à `PAID` une fois le versement effectué au membre.

## 6. Structure des données

### 6.1. Stockage Firestore

- **Collection** : `contractsCI/{contractId}/earlyRefunds`
- **Types** : `EARLY` (retrait anticipé) et `FINAL` (remboursement final)

### 6.2. Champs principaux

```typescript
interface EarlyRefundCI | FinalRefundCI {
  id: string
  contractId: string
  type: 'EARLY' | 'FINAL'
  status: 'PENDING' | 'APPROVED' | 'PAID' | 'ARCHIVED'
  amountNominal: number
  amountBonus: number
  deadlineAt: Date
  reason?: string
  documentId?: string
  createdAt: Date
  updatedAt: Date
  approvedAt?: Date   // Rempli lors du passage à APPROVED
  paidAt?: Date      // Rempli lors du passage à PAID
}
```

## 7. Références

- **Composants** : `MonthlyCIContract.tsx`, `DailyCIContract.tsx`
- **Base de données** : `src/db/caisse/refunds.db.ts` (`listRefundsCI`, `updateRefundCI`)
- **Modals** : `EarlyRefundCIModal`, `FinalRefundCIModal`, `RemboursementCIPDFModal`
- **Analyse contrats** : [`ANALYSE_CAISSE_IMPREVUE_CONTRATS.md`](./ANALYSE_CAISSE_IMPREVUE_CONTRATS.md)
