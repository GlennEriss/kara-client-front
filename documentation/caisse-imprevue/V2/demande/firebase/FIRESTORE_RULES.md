# Règles Firestore - Module Demandes Caisse Imprévue V2

> Documentation complète des règles de sécurité Firestore pour les collections `caisseImprevueDemands` et `contractsCI`

## 📋 Vue d'ensemble

Les règles Firestore garantissent la sécurité des données en contrôlant qui peut lire, créer, modifier et supprimer les documents.

## 🎯 Collections Concernées

### 1. `caisseImprevueDemands`
Collection principale des demandes de contrats Caisse Imprévue.

### 2. `contractsCI`
Collection des contrats Caisse Imprévue créés depuis les demandes acceptées.

### 3. `subscriptionsCI`
Collection des forfaits Caisse Imprévue (lecture uniquement pour les utilisateurs authentifiés).

---

## 🔒 Règles pour `caisseImprevueDemands`

### Structure du Document

```typescript
interface CaisseImprevueDemand {
  id: string
  memberId: string
  memberFirstName: string
  memberLastName: string
  memberEmail?: string
  memberContacts?: string[]
  
  cause: string // Motif de la demande (min 10, max 500 caractères)
  
  subscriptionCIID: string
  subscriptionCICode: string
  subscriptionCIAmountPerMonth: number
  subscriptionCIDuration: number
  subscriptionCISupportMax?: number
  
  paymentFrequency: 'DAILY' | 'MONTHLY'
  desiredDate: string // ISO date string
  
  emergencyContact: {
    memberId?: string
    lastName: string
    firstName?: string
    phone1: string
    phone2?: string
    relationship: string
    typeId: string
    idNumber: string
    documentPhotoUrl?: string
  }
  
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CONVERTED' | 'REOPENED'
  
  decisionReason?: string // Raison d'acceptation/refus (min 10, max 500)
  decisionMadeBy?: string // Admin ID
  decisionDate?: Timestamp
  
  reopenReason?: string // Raison de réouverture
  reopenedBy?: string // Admin ID
  reopenedDate?: Timestamp
  previousStatus?: string // Statut avant réouverture
  
  contractId?: string // ID du contrat créé (si CONVERTED)
  convertedDate?: Timestamp
  
  priority?: number // Pour tri par priorité (1=PENDING, 2=APPROVED, ...)
  
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

### Règles Complètes (V2 - Améliorées)

```javascript
match /caisseImprevueDemands/{demandId} {
  // ============================================
  // LECTURE
  // ============================================
  // Admins et utilisateurs authentifiés peuvent lire
  // (nécessaire pour afficher les forfaits dans le formulaire)
  allow read: if isAdmin() || isAuthenticated();
  
  // ============================================
  // CRÉATION
  // ============================================
  allow create: if isAdmin() && 
    // Validation membre
    request.resource.data.memberId is string &&
    request.resource.data.memberId.size() > 0 &&
    request.resource.data.memberFirstName is string &&
    request.resource.data.memberFirstName.size() > 0 &&
    request.resource.data.memberLastName is string &&
    request.resource.data.memberLastName.size() > 0 &&
    
    // ✅ Validation motif (obligatoire, min 10, max 500) - NOUVEAU V2
    request.resource.data.cause is string &&
    request.resource.data.cause.size() >= 10 &&
    request.resource.data.cause.size() <= 500 &&
    
    // Validation forfait
    request.resource.data.subscriptionCIID is string &&
    request.resource.data.subscriptionCIID.size() > 0 &&
    request.resource.data.subscriptionCICode is string &&
    request.resource.data.subscriptionCICode.size() > 0 &&
    request.resource.data.subscriptionCIAmountPerMonth is number &&
    request.resource.data.subscriptionCIAmountPerMonth > 0 &&
    request.resource.data.subscriptionCIDuration is number &&
    request.resource.data.subscriptionCIDuration > 0 &&
    
    // Validation fréquence
    request.resource.data.paymentFrequency in ['DAILY', 'MONTHLY'] &&
    
    // Validation date souhaitée
    request.resource.data.desiredDate is string &&
    request.resource.data.desiredDate.size() > 0 &&
    
    // ✅ Validation contact d'urgence (obligatoire) - NOUVEAU V2
    request.resource.data.emergencyContact is map &&
    request.resource.data.emergencyContact.lastName is string &&
    request.resource.data.emergencyContact.lastName.size() > 0 &&
    request.resource.data.emergencyContact.phone1 is string &&
    request.resource.data.emergencyContact.phone1.size() > 0 &&
    request.resource.data.emergencyContact.relationship is string &&
    request.resource.data.emergencyContact.relationship.size() > 0 &&
    request.resource.data.emergencyContact.typeId is string &&
    request.resource.data.emergencyContact.typeId.size() > 0 &&
    request.resource.data.emergencyContact.idNumber is string &&
    request.resource.data.emergencyContact.idNumber.size() > 0 &&
    
    // Validation statut initial
    request.resource.data.status == 'PENDING' &&
    
    // Validation createdBy
    request.resource.data.createdBy is string &&
    request.resource.data.createdBy == request.auth.uid &&
    
    // Validation dates
    request.resource.data.createdAt is timestamp &&
    request.resource.data.updatedAt is timestamp &&
    
    // Pas de champs de décision à la création
    !('decisionReason' in request.resource.data) &&
    !('decisionMadeBy' in request.resource.data) &&
    !('decisionDate' in request.resource.data) &&
    !('contractId' in request.resource.data) &&
    !('convertedDate' in request.resource.data) &&
    !('reopenReason' in request.resource.data) &&
    !('reopenedBy' in request.resource.data) &&
    !('reopenedDate' in request.resource.data);
  
  // ============================================
  // MODIFICATION
  // ============================================
  allow update: if isAdmin() && 
    // Ne peut pas modifier createdBy et createdAt
    request.resource.data.createdBy == resource.data.createdBy &&
    request.resource.data.createdAt == resource.data.createdAt &&
    
    // Validation updatedBy
    request.resource.data.updatedBy is string &&
    request.resource.data.updatedBy == request.auth.uid &&
    
    // Validation membre (si modifié)
    (!('memberId' in request.resource.data) || 
     (request.resource.data.memberId is string && 
      request.resource.data.memberId.size() > 0)) &&
    
    // ✅ Validation motif (si modifié, min 10, max 500) - NOUVEAU V2
    (!('cause' in request.resource.data) || 
     (request.resource.data.cause is string &&
      request.resource.data.cause.size() >= 10 &&
      request.resource.data.cause.size() <= 500)) &&
    
    // ✅ Validation contact d'urgence (si modifié) - NOUVEAU V2
    (!('emergencyContact' in request.resource.data) || 
     (request.resource.data.emergencyContact is map &&
      request.resource.data.emergencyContact.lastName is string &&
      request.resource.data.emergencyContact.lastName.size() > 0 &&
      request.resource.data.emergencyContact.phone1 is string &&
      request.resource.data.emergencyContact.phone1.size() > 0 &&
      request.resource.data.emergencyContact.relationship is string &&
      request.resource.data.emergencyContact.relationship.size() > 0 &&
      request.resource.data.emergencyContact.typeId is string &&
      request.resource.data.emergencyContact.typeId.size() > 0 &&
      request.resource.data.emergencyContact.idNumber is string &&
      request.resource.data.emergencyContact.idNumber.size() > 0)) &&
    
    // Validation statut (transitions autorisées)
    request.resource.data.status is string &&
    request.resource.data.status in ['PENDING', 'APPROVED', 'REJECTED', 'CONVERTED', 'REOPENED'] &&
    
    // ✅ Validation transition PENDING → APPROVED - AMÉLIORÉ V2
    (request.resource.data.status != 'APPROVED' || 
     (resource.data.status == 'PENDING' &&
      request.resource.data.decisionReason is string &&
      request.resource.data.decisionReason.size() >= 10 &&
      request.resource.data.decisionReason.size() <= 500 &&
      request.resource.data.decisionMadeBy is string &&
      request.resource.data.decisionMadeBy == request.auth.uid &&
      request.resource.data.decisionDate is timestamp)) &&
    
    // ✅ Validation transition PENDING → REJECTED - AMÉLIORÉ V2
    (request.resource.data.status != 'REJECTED' || 
     (resource.data.status == 'PENDING' &&
      request.resource.data.decisionReason is string &&
      request.resource.data.decisionReason.size() >= 10 &&
      request.resource.data.decisionReason.size() <= 500 &&
      request.resource.data.decisionMadeBy is string &&
      request.resource.data.decisionMadeBy == request.auth.uid &&
      request.resource.data.decisionDate is timestamp)) &&
    
    // ✅ Validation transition REJECTED → REOPENED - NOUVEAU V2
    (request.resource.data.status != 'REOPENED' || 
     (resource.data.status == 'REJECTED' &&
      request.resource.data.reopenReason is string &&
      request.resource.data.reopenReason.size() >= 10 &&
      request.resource.data.reopenReason.size() <= 500 &&
      request.resource.data.reopenedBy is string &&
      request.resource.data.reopenedBy == request.auth.uid &&
      request.resource.data.reopenedDate is timestamp &&
      request.resource.data.previousStatus == 'REJECTED')) &&
    
    // ✅ Validation transition APPROVED → CONVERTED - NOUVEAU V2
    (request.resource.data.status != 'CONVERTED' || 
     (resource.data.status == 'APPROVED' &&
      request.resource.data.contractId is string &&
      request.resource.data.contractId.size() > 0 &&
      request.resource.data.convertedDate is timestamp)) &&
    
    // updatedAt doit être mis à jour
    request.resource.data.updatedAt is timestamp &&
    request.resource.data.updatedAt > resource.data.updatedAt;
  
  // ============================================
  // SUPPRESSION
  // ============================================
  // ✅ Seulement les demandes REJECTED peuvent être supprimées - NOUVEAU V2
  allow delete: if isAdmin() && 
    resource.data.status == 'REJECTED';
}
```

### Explications des Règles

#### Lecture
- **Admins** : Peuvent lire toutes les demandes
- **Utilisateurs authentifiés** : Peuvent lire les demandes (pour affichage dans les formulaires)

#### Création
- **Seulement admins** : Seuls les admins peuvent créer des demandes
- **Validation stricte** : Tous les champs obligatoires doivent être présents et valides
- **Motif** : Min 10, max 500 caractères
- **Contact d'urgence** : Obligatoire avec tous les champs requis
- **Statut initial** : Toujours `PENDING`
- **Pas de décision** : Les champs de décision ne doivent pas être présents à la création

#### Modification
- **Seulement admins** : Seuls les admins peuvent modifier
- **Validation conditionnelle** : Si un champ est modifié, il doit être valide
- **Transitions de statut** : Seules les transitions logiques sont autorisées :
  - `PENDING` → `APPROVED` (avec raison d'acceptation)
  - `PENDING` → `REJECTED` (avec motif de refus)
  - `REJECTED` → `REOPENED` (avec raison de réouverture)
  - `APPROVED` → `CONVERTED` (avec contractId)
- **updatedAt** : Doit être mis à jour et supérieur à la valeur précédente

#### Suppression
- **Seulement admins** : Seuls les admins peuvent supprimer
- **Seulement REJECTED** : Seules les demandes refusées peuvent être supprimées

---

## 🔒 Règles pour `contractsCI`

### Structure du Document

```typescript
interface ContractCI {
  id: string
  demandId: string // ID de la demande source
  memberId: string
  memberFirstName: string
  memberLastName: string
  
  subscriptionCIID: string
  subscriptionCICode: string
  subscriptionCIAmountPerMonth: number
  subscriptionCIDuration: number
  
  paymentFrequency: 'DAILY' | 'MONTHLY'
  startDate: string // ISO date string
  
  status: 'ACTIVE' | 'SUSPENDED' | 'TERMINATED' | 'COMPLETED'
  
  emergencyContact: { ... } // Même structure que demande
  
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

### Règles Complètes (V2)

```javascript
match /contractsCI/{contractId} {
  // ============================================
  // LECTURE
  // ============================================
  // Admins et utilisateurs authentifiés peuvent lire
  allow read: if isAdmin() || isAuthenticated();
  
  // ============================================
  // CRÉATION
  // ============================================
  allow create: if isAdmin() && 
    // Validation demande source
    request.resource.data.demandId is string &&
    request.resource.data.demandId.size() > 0 &&
    
    // Validation membre
    request.resource.data.memberId is string &&
    request.resource.data.memberId.size() > 0 &&
    request.resource.data.memberFirstName is string &&
    request.resource.data.memberFirstName.size() > 0 &&
    request.resource.data.memberLastName is string &&
    request.resource.data.memberLastName.size() > 0 &&
    
    // Validation forfait
    request.resource.data.subscriptionCIID is string &&
    request.resource.data.subscriptionCIID.size() > 0 &&
    request.resource.data.subscriptionCICode is string &&
    request.resource.data.subscriptionCICode.size() > 0 &&
    request.resource.data.subscriptionCIAmountPerMonth is number &&
    request.resource.data.subscriptionCIAmountPerMonth > 0 &&
    request.resource.data.subscriptionCIDuration is number &&
    request.resource.data.subscriptionCIDuration > 0 &&
    
    // Validation fréquence
    request.resource.data.paymentFrequency in ['DAILY', 'MONTHLY'] &&
    
    // Validation date de début
    request.resource.data.startDate is string &&
    request.resource.data.startDate.size() > 0 &&
    
    // Validation statut initial
    request.resource.data.status == 'ACTIVE' &&
    
    // Validation createdBy
    request.resource.data.createdBy is string &&
    request.resource.data.createdBy == request.auth.uid &&
    
    // Validation dates
    request.resource.data.createdAt is timestamp &&
    request.resource.data.updatedAt is timestamp;
  
  // ============================================
  // MODIFICATION
  // ============================================
  allow update: if isAdmin() && 
    // Ne peut pas modifier createdBy et createdAt
    request.resource.data.createdBy == resource.data.createdBy &&
    request.resource.data.createdAt == resource.data.createdAt &&
    
    // Validation updatedBy
    request.resource.data.updatedBy is string &&
    request.resource.data.updatedBy == request.auth.uid &&
    
    // Validation statut (transitions autorisées)
    request.resource.data.status is string &&
    request.resource.data.status in ['ACTIVE', 'SUSPENDED', 'TERMINATED', 'COMPLETED'] &&
    
    // updatedAt doit être mis à jour
    request.resource.data.updatedAt is timestamp &&
    request.resource.data.updatedAt > resource.data.updatedAt;
  
  // ============================================
  // SUPPRESSION
  // ============================================
  allow delete: if isAdmin();
}
```

---

## 🔒 Règles pour `subscriptionsCI` (Forfaits)

### Règles Complètes

```javascript
match /subscriptionsCI/{subscriptionId} {
  // ============================================
  // LECTURE
  // ============================================
  // ✅ Admins et utilisateurs authentifiés peuvent lire les forfaits
  // (nécessaire pour afficher les forfaits dans le formulaire Step 2)
  allow read: if isAdmin() || isAuthenticated();
  
  // ============================================
  // ÉCRITURE
  // ============================================
  // Seulement admins peuvent créer/modifier/supprimer les forfaits
  allow write: if isAdmin();
}
```

**Statut** : ✅ **À VÉRIFIER/MODIFIER** dans `firestore.rules`

**Note** : La règle de lecture doit être `isAdmin() || isAuthenticated()` et non `isAdmin()` uniquement, car les utilisateurs authentifiés doivent pouvoir voir les forfaits dans le formulaire de création de demande.

---

## 📝 Règles Complètes à Ajouter dans firestore.rules

### Emplacement

Ajouter après la section des autres collections, avant la règle par défaut.

### Code Complet (V2 - Amélioré)

```javascript
// ============================================
// CAISSE IMPRÉVUE - DEMANDES (V2)
// ============================================
match /caisseImprevueDemands/{demandId} {
  // LECTURE : Admins et utilisateurs authentifiés
  allow read: if isAdmin() || isAuthenticated();
  
  // CRÉATION : Admin uniquement avec validation stricte
  allow create: if isAdmin() && 
    // Validation membre
    request.resource.data.memberId is string &&
    request.resource.data.memberId.size() > 0 &&
    request.resource.data.memberFirstName is string &&
    request.resource.data.memberFirstName.size() > 0 &&
    request.resource.data.memberLastName is string &&
    request.resource.data.memberLastName.size() > 0 &&
    
    // ✅ Validation motif (obligatoire, min 10, max 500) - NOUVEAU V2
    request.resource.data.cause is string &&
    request.resource.data.cause.size() >= 10 &&
    request.resource.data.cause.size() <= 500 &&
    
    // Validation forfait
    request.resource.data.subscriptionCIID is string &&
    request.resource.data.subscriptionCIID.size() > 0 &&
    request.resource.data.subscriptionCICode is string &&
    request.resource.data.subscriptionCICode.size() > 0 &&
    request.resource.data.subscriptionCIAmountPerMonth is number &&
    request.resource.data.subscriptionCIAmountPerMonth > 0 &&
    request.resource.data.subscriptionCIDuration is number &&
    request.resource.data.subscriptionCIDuration > 0 &&
    
    // Validation fréquence
    request.resource.data.paymentFrequency in ['DAILY', 'MONTHLY'] &&
    
    // Validation date souhaitée
    request.resource.data.desiredDate is string &&
    request.resource.data.desiredDate.size() > 0 &&
    
    // ✅ Validation contact d'urgence (obligatoire) - NOUVEAU V2
    request.resource.data.emergencyContact is map &&
    request.resource.data.emergencyContact.lastName is string &&
    request.resource.data.emergencyContact.lastName.size() > 0 &&
    request.resource.data.emergencyContact.phone1 is string &&
    request.resource.data.emergencyContact.phone1.size() > 0 &&
    request.resource.data.emergencyContact.relationship is string &&
    request.resource.data.emergencyContact.relationship.size() > 0 &&
    request.resource.data.emergencyContact.typeId is string &&
    request.resource.data.emergencyContact.typeId.size() > 0 &&
    request.resource.data.emergencyContact.idNumber is string &&
    request.resource.data.emergencyContact.idNumber.size() > 0 &&
    
    // Validation statut initial
    request.resource.data.status == 'PENDING' &&
    
    // Validation createdBy
    request.resource.data.createdBy is string &&
    request.resource.data.createdBy == request.auth.uid &&
    
    // Validation dates
    request.resource.data.createdAt is timestamp &&
    request.resource.data.updatedAt is timestamp &&
    
    // Pas de champs de décision à la création
    !('decisionReason' in request.resource.data) &&
    !('decisionMadeBy' in request.resource.data) &&
    !('decisionDate' in request.resource.data) &&
    !('contractId' in request.resource.data) &&
    !('convertedDate' in request.resource.data) &&
    !('reopenReason' in request.resource.data) &&
    !('reopenedBy' in request.resource.data) &&
    !('reopenedDate' in request.resource.data);
  
  // MODIFICATION : Admin uniquement avec validation des transitions
  allow update: if isAdmin() && 
    // Ne peut pas modifier createdBy et createdAt
    request.resource.data.createdBy == resource.data.createdBy &&
    request.resource.data.createdAt == resource.data.createdAt &&
    
    // Validation updatedBy
    request.resource.data.updatedBy is string &&
    request.resource.data.updatedBy == request.auth.uid &&
    
    // Validation motif (si modifié)
    (!('cause' in request.resource.data) || 
     (request.resource.data.cause is string &&
      request.resource.data.cause.size() >= 10 &&
      request.resource.data.cause.size() <= 500)) &&
    
    // Validation contact d'urgence (si modifié)
    (!('emergencyContact' in request.resource.data) || 
     (request.resource.data.emergencyContact is map &&
      request.resource.data.emergencyContact.lastName is string &&
      request.resource.data.emergencyContact.lastName.size() > 0 &&
      request.resource.data.emergencyContact.phone1 is string &&
      request.resource.data.emergencyContact.phone1.size() > 0 &&
      request.resource.data.emergencyContact.relationship is string &&
      request.resource.data.emergencyContact.typeId is string &&
      request.resource.data.emergencyContact.idNumber is string)) &&
    
    // Validation statut
    request.resource.data.status is string &&
    request.resource.data.status in ['PENDING', 'APPROVED', 'REJECTED', 'CONVERTED', 'REOPENED'] &&
    
    // Transition PENDING → APPROVED
    (request.resource.data.status != 'APPROVED' || 
     (resource.data.status == 'PENDING' &&
      request.resource.data.decisionReason is string &&
      request.resource.data.decisionReason.size() >= 10 &&
      request.resource.data.decisionReason.size() <= 500 &&
      request.resource.data.decisionMadeBy is string &&
      request.resource.data.decisionMadeBy == request.auth.uid &&
      request.resource.data.decisionDate is timestamp)) &&
    
    // Transition PENDING → REJECTED
    (request.resource.data.status != 'REJECTED' || 
     (resource.data.status == 'PENDING' &&
      request.resource.data.decisionReason is string &&
      request.resource.data.decisionReason.size() >= 10 &&
      request.resource.data.decisionReason.size() <= 500 &&
      request.resource.data.decisionMadeBy is string &&
      request.resource.data.decisionMadeBy == request.auth.uid &&
      request.resource.data.decisionDate is timestamp)) &&
    
    // Transition REJECTED → REOPENED
    (request.resource.data.status != 'REOPENED' || 
     (resource.data.status == 'REJECTED' &&
      request.resource.data.reopenReason is string &&
      request.resource.data.reopenReason.size() >= 10 &&
      request.resource.data.reopenReason.size() <= 500 &&
      request.resource.data.reopenedBy is string &&
      request.resource.data.reopenedBy == request.auth.uid &&
      request.resource.data.reopenedDate is timestamp &&
      request.resource.data.previousStatus == 'REJECTED')) &&
    
    // Transition APPROVED → CONVERTED
    (request.resource.data.status != 'CONVERTED' || 
     (resource.data.status == 'APPROVED' &&
      request.resource.data.contractId is string &&
      request.resource.data.contractId.size() > 0 &&
      request.resource.data.convertedDate is timestamp)) &&
    
    // updatedAt doit être mis à jour
    request.resource.data.updatedAt is timestamp &&
    request.resource.data.updatedAt > resource.data.updatedAt;
  
  // SUPPRESSION : Seulement les demandes REJECTED
  allow delete: if isAdmin() && resource.data.status == 'REJECTED';
}

// ============================================
// CAISSE IMPRÉVUE - CONTRATS
// ============================================
match /contractsCI/{contractId} {
  allow read: if isAdmin() || isAuthenticated();
  
  allow create: if isAdmin() && 
    request.resource.data.demandId is string &&
    request.resource.data.memberId is string &&
    request.resource.data.subscriptionCIID is string &&
    request.resource.data.paymentFrequency in ['DAILY', 'MONTHLY'] &&
    request.resource.data.status == 'ACTIVE' &&
    request.resource.data.createdAt is timestamp &&
    request.resource.data.updatedAt is timestamp;
  
  allow update: if isAdmin() && 
    request.resource.data.status in ['ACTIVE', 'SUSPENDED', 'TERMINATED', 'COMPLETED'] &&
    request.resource.data.updatedAt is timestamp &&
    request.resource.data.updatedAt > resource.data.updatedAt;
  
  allow delete: if isAdmin();
}
```

---

## 🚀 Déploiement

### Méthode 1 : Via Firebase Console

1. Accéder à Firebase Console → Firestore → Règles
2. Copier-coller les règles complètes
3. Cliquer sur "Publier"

### Méthode 2 : Via CLI Firebase

```bash
# Tester les règles localement
firebase emulators:start --only firestore

# Déployer les règles
firebase deploy --only firestore:rules
```

### Méthode 3 : Via GitHub Actions (si configuré)

Les règles sont déployées automatiquement lors du déploiement.

---

## ✅ Validation des Règles

### Tester les Règles Localement

```bash
# Démarrer l'émulateur
firebase emulators:start --only firestore

# Tester avec les tests unitaires
npm run test:firestore-rules
```

### Vérifier les Règles en Production

1. Créer une demande via l'application
2. Vérifier dans Firebase Console que le document est créé
3. Tester les modifications (accepter, refuser, etc.)
4. Vérifier que les règles bloquent les actions non autorisées

---

## ⚠️ Points d'Attention

### Validation Stricte

- **Tous les champs obligatoires** doivent être validés
- **Longueurs min/max** pour les champs texte (cause, decisionReason)
- **Types de données** : Vérifier que les types correspondent (string, number, timestamp, map)

### Transitions de Statut

Les transitions doivent être **logiques** :
- `PENDING` → `APPROVED` : Nécessite raison d'acceptation
- `PENDING` → `REJECTED` : Nécessite motif de refus
- `REJECTED` → `REOPENED` : Nécessite raison de réouverture
- `APPROVED` → `CONVERTED` : Nécessite contractId

### Sécurité

- **Seuls les admins** peuvent créer/modifier/supprimer
- **Utilisateurs authentifiés** peuvent lire (pour affichage)
- **Validation côté serveur** : Les règles Firestore sont la dernière ligne de défense

---

## 📚 Références

- **Documentation Firestore Rules** : https://firebase.google.com/docs/firestore/security/get-started
- **Syntaxe Rules** : https://firebase.google.com/docs/firestore/security/rules-conditions
- **Validation des données** : https://firebase.google.com/docs/firestore/security/rules-conditions#data_validation

---

**Date de création** : 2026-01-27  
**Version** : V2  
**Auteur** : Senior Dev
