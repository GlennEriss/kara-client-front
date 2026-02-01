# Règles Firestore - Clôture de contrat (Crédit spéciale)

> Règles de sécurité et validation pour les transitions DISCHARGED et CLOSED sur `creditContracts`

## 📋 Vue d'ensemble

Le flux de clôture modifie la collection `creditContracts` en trois étapes d'écriture :

1. **Phase 1 – Décharge** : `status` → `DISCHARGED` + `dischargeMotif`, `dischargedBy`, `dischargedAt`
2. **Phase 3 – Quittance signée** : `signedQuittanceUrl`, `signedQuittanceDocumentId`
3. **Phase 4 – Clôture** : `status` → `CLOSED` + `closedAt`, `closedBy`, `motifCloture`

## 🎯 Collection concernée

### `creditContracts`

**Règles actuelles** (dans `firestore.rules` lignes 505-511) :

```javascript
match /creditContracts/{contractId} {
  allow read: if isAdmin();
  allow write: if isAdmin();
}
```

Les règles actuelles autorisent toute écriture admin. Les validations métier sont faites côté application (CreditSpecialeService).

---

## 🔒 Règles renforcées (optionnel)

Pour renforcer la sécurité au niveau Firestore, on peut ajouter des validations sur les transitions de statut.

### Structure des champs de clôture

```typescript
// Champs ajoutés/modifiés lors du flux de clôture
interface CreditContractClosureFields {
  // Phase 1 - Décharge
  status: 'ACTIVE' | 'PARTIAL' | 'OVERDUE' | 'DISCHARGED' | 'CLOSED' | ...;
  dischargeMotif?: string;      // Obligatoire si status = DISCHARGED
  dischargedBy?: string;       // Admin UID
  dischargedAt?: Timestamp;
  
  // Phase 3 - Quittance signée
  signedQuittanceUrl?: string;
  signedQuittanceDocumentId?: string;
  
  // Phase 4 - Clôture
  closedAt?: Timestamp;
  closedBy?: string;           // Admin UID
  motifCloture?: string;      // Obligatoire si status = CLOSED
}
```

### Règles de validation des transitions

```javascript
// ============================================
// CRÉDIT SPÉCIALE - CONTRATS (avec validation clôture)
// ============================================

match /creditContracts/{contractId} {
  // LECTURE : Admin uniquement
  allow read: if isAdmin();
  
  // CRÉATION : Admin uniquement (inchangé)
  allow create: if isAdmin();
  
  // MISE À JOUR : Admin avec validation des transitions de clôture
  allow update: if isAdmin() && (
    // Transition vers DISCHARGED : motif obligatoire (min 10, max 500 caractères)
    (request.resource.data.status != 'DISCHARGED' || 
     (resource.data.status != 'DISCHARGED' &&
      request.resource.data.dischargeMotif is string &&
      request.resource.data.dischargeMotif.size() >= 10 &&
      request.resource.data.dischargeMotif.size() <= 500 &&
      request.resource.data.dischargedBy is string &&
      request.resource.data.dischargedBy == request.auth.uid &&
      request.resource.data.dischargedAt is timestamp)) &&
    
    // Transition vers CLOSED : contrat doit être DISCHARGED, motif obligatoire
    (request.resource.data.status != 'CLOSED' || 
     (resource.data.status == 'DISCHARGED' &&
      request.resource.data.signedQuittanceUrl is string &&
      request.resource.data.signedQuittanceUrl.size() > 0 &&
      request.resource.data.motifCloture is string &&
      request.resource.data.motifCloture.size() >= 10 &&
      request.resource.data.motifCloture.size() <= 500 &&
      request.resource.data.closedBy is string &&
      request.resource.data.closedBy == request.auth.uid &&
      request.resource.data.closedAt is timestamp))
  );
  
  // SUPPRESSION : Admin uniquement
  allow delete: if isAdmin();
}
```

### Explications

| Transition | Conditions |
|------------|-------------|
| → DISCHARGED | `dischargeMotif` 10–500 caractères, `dischargedBy` = admin UID, `dischargedAt` timestamp |
| → CLOSED | Contrat déjà DISCHARGED, `signedQuittanceUrl` non vide, `motifCloture` 10–500 caractères, `closedBy` = admin UID, `closedAt` timestamp |

---

## 📁 Collection `documents`

Les quittances (remplie et signée) sont enregistrées dans la collection `documents` avec les types :

- `CREDIT_SPECIALE_QUITTANCE` : quittance remplie (générée puis téléchargée)
- `CREDIT_SPECIALE_QUITTANCE_SIGNED` : quittance signée (uploadée par l’admin)

**Règles actuelles** (dans `firestore.rules` lignes 293-298) :

```javascript
match /documents/{documentId} {
  allow read: if isAdmin() || 
                 (isAuthenticated() && resource.data.memberId == request.auth.uid);
  allow write: if isAdmin();
}
```

Ces règles suffisent pour le flux de clôture : seuls les admins créent et lisent ces documents.

---

## 🚀 Déploiement

### Option 1 : Conserver les règles actuelles

Les règles actuelles (`allow write: if isAdmin()`) sont suffisantes si la validation métier est bien faite dans `CreditSpecialeService`.

### Option 2 : Activer les règles renforcées

1. Remplacer la section `creditContracts` dans `firestore.rules` par les règles ci-dessus.
2. Tester localement :
   ```bash
   firebase emulators:start --only firestore
   ```
3. Déployer :
   ```bash
   firebase deploy --only firestore:rules
   ```

---

## ⚠️ Points d’attention

- **Validation côté app** : Même avec des règles renforcées, la logique métier (montant restant = 0, quittance signée obligatoire, etc.) reste dans le service.
- **Compatibilité** : Les règles renforcées peuvent bloquer des mises à jour partielles (ex. correction d’un champ sans toucher au statut). À adapter selon les besoins.
- **Longueurs** : `dischargeMotif` et `motifCloture` : 10–500 caractères, alignés avec les autres motifs du projet.

---

**Références** : [ANALYSE_CLOTURE_CONTRAT.md](../ANALYSE_CLOTURE_CONTRAT.md) | [sequence/UC_ClotureContrat_sequence.puml](../sequence/UC_ClotureContrat_sequence.puml)
