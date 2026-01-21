# Règles Firestore - Fonctionnalité Rejet

## 📋 Vue d'ensemble

Ce document définit les règles de sécurité Firestore nécessaires pour la fonctionnalité de rejet d'une demande d'adhésion et les actions post-rejet.

---

## 🔐 Collection : `membership-requests`

### État Actuel des Règles

Les règles existantes permettent déjà :
- ✅ **Lecture** : Publique (nécessaire pour corrections via code de sécurité)
- ✅ **Création** : Publique avec validation des champs requis
- ✅ **Mise à jour** : Admin ou demandeur avec code de sécurité valide
- ✅ **Suppression** : Admin uniquement

### Modifications Nécessaires pour le Rejet

Les règles existantes permettent déjà la mise à jour par admin, mais nous devons ajouter des **validations spécifiques** pour garantir l'intégrité des données lors du rejet, de la réouverture et de la suppression.

---

## 1. Rejet d'une Demande (status → 'rejected')

### Opération
`updateDoc` sur `membership-requests/{requestId}`

### Champs modifiables
- `status` → `'rejected'`
- `motifReject` → `string` (obligatoire, 10-500 caractères)
- `processedBy` → `string` (ID de l'admin qui a rejeté, obligatoire)
- `processedAt` → `timestamp` (Date de rejet, obligatoire)
- `updatedAt` → `serverTimestamp()`

### Règle Actuelle
```javascript
// Ligne 119-135 dans firestore.rules
allow update: if (
  // Cas 1: Admin - avec validation pour l'approbation
  (isAdmin() && (
    // Si le statut passe à 'approved', approvedBy et approvedAt doivent être présents
    (request.resource.data.status == 'approved' &&
     request.resource.data.approvedBy is string &&
     request.resource.data.approvedBy != null &&
     request.resource.data.approvedAt is timestamp &&
     request.resource.data.approvedAt != null) ||
    // Sinon, mise à jour normale par admin
    (request.resource.data.status != 'approved')
  ))
  // ... autres cas (demandeur avec code)
)
```

### Validation Recommandée pour le Rejet

**Option 1 : Ajouter validation explicite (Recommandée)**

```javascript
// Dans firestore.rules, modifier la section "MISE À JOUR" pour admin
allow update: if (
  // Cas 1: Admin - avec validation pour l'approbation ET le rejet
  (isAdmin() && (
    // Si le statut passe à 'approved', approvedBy et approvedAt doivent être présents
    (request.resource.data.status == 'approved' &&
     request.resource.data.approvedBy is string &&
     request.resource.data.approvedBy != null &&
     request.resource.data.approvedAt is timestamp &&
     request.resource.data.approvedAt != null &&
     // Protection : si déjà approuvé, empêcher la modification de approvedBy/approvedAt
     (resource.data.status != 'approved' ||
      (request.resource.data.approvedBy == resource.data.approvedBy &&
       request.resource.data.approvedAt == resource.data.approvedAt))) ||
    // Si le statut passe à 'rejected', processedBy, processedAt et motifReject doivent être présents
    (request.resource.data.status == 'rejected' &&
     request.resource.data.processedBy is string &&
     request.resource.data.processedBy != null &&
     request.resource.data.processedBy == request.auth.uid && // Admin qui rejette
     request.resource.data.processedAt is timestamp &&
     request.resource.data.processedAt != null &&
     request.resource.data.motifReject is string &&
     request.resource.data.motifReject.size() >= 10 && // Minimum 10 caractères
     request.resource.data.motifReject.size() <= 500 && // Maximum 500 caractères
     // Protection : si déjà rejeté, empêcher la modification de processedBy/processedAt/motifReject
     (resource.data.status != 'rejected' ||
      (request.resource.data.processedBy == resource.data.processedBy &&
       request.resource.data.motifReject == resource.data.motifReject))) ||
    // Sinon, mise à jour normale par admin
    (request.resource.data.status != 'approved' && request.resource.data.status != 'rejected')
  ))
  // ... autres cas (demandeur avec code)
)
```

**Option 2 : Laisser la validation côté application (État actuel)**

Les règles existantes permettent déjà la mise à jour par admin. La validation des champs `processedBy`, `processedAt` et `motifReject` est gérée par le service `MembershipServiceV2.rejectMembershipRequest()`.

**Recommandation** : Utiliser **Option 1** pour renforcer la sécurité au niveau Firestore, mais **Option 2** est suffisante si la validation côté application est stricte.

---

## 2. Réouverture d'un Dossier (status: 'rejected' → 'under_review')

### Opération
`updateDoc` sur `membership-requests/{requestId}`

### Champs modifiables
- `status` → `'under_review'`
- `reopenedBy` → `string` (ID de l'admin qui a réouvert, obligatoire)
- `reopenedAt` → `timestamp` (Date de réouverture, obligatoire)
- `reopenReason` → `string` (Motif de réouverture, obligatoire, 10-500 caractères)
- `motifReject` → Conservé (ne pas supprimer, pour historique)
- `updatedAt` → `serverTimestamp()`

### Validation Recommandée

```javascript
// Ajouter dans la section "MISE À JOUR" pour admin
// Si le statut passe de 'rejected' à 'pending' (réouverture)
(resource.data.status == 'rejected' &&
 request.resource.data.status == 'under_review' &&
 request.resource.data.reopenedBy is string &&
 request.resource.data.reopenedBy != null &&
 request.resource.data.reopenedBy == request.auth.uid && // Admin qui réouvre
 request.resource.data.reopenedAt is timestamp &&
 request.resource.data.reopenedAt != null &&
 request.resource.data.reopenReason is string &&
 request.resource.data.reopenReason.size() >= 10 && // Minimum 10 caractères
 request.resource.data.reopenReason.size() <= 500 && // Maximum 500 caractères &&
 // Conserver le motifReject (ne pas le supprimer)
 request.resource.data.motifReject == resource.data.motifReject)
```

### Règle Complète avec Réouverture

```javascript
allow update: if (
  // Cas 1: Admin - avec validation pour l'approbation, le rejet ET la réouverture
  (isAdmin() && (
    // Si le statut passe à 'approved', approvedBy et approvedAt doivent être présents
    (request.resource.data.status == 'approved' &&
     request.resource.data.approvedBy is string &&
     request.resource.data.approvedBy != null &&
     request.resource.data.approvedAt is timestamp &&
     request.resource.data.approvedAt != null &&
     (resource.data.status != 'approved' ||
      (request.resource.data.approvedBy == resource.data.approvedBy &&
       request.resource.data.approvedAt == resource.data.approvedAt))) ||
    // Si le statut passe à 'rejected', processedBy, processedAt et motifReject doivent être présents
    (request.resource.data.status == 'rejected' &&
     request.resource.data.processedBy is string &&
     request.resource.data.processedBy != null &&
     request.resource.data.processedBy == request.auth.uid &&
     request.resource.data.processedAt is timestamp &&
     request.resource.data.processedAt != null &&
     request.resource.data.motifReject is string &&
     request.resource.data.motifReject.size() >= 10 &&
     request.resource.data.motifReject.size() <= 500 &&
     (resource.data.status != 'rejected' ||
      (request.resource.data.processedBy == resource.data.processedBy &&
       request.resource.data.motifReject == resource.data.motifReject))) ||
    // Si le statut passe de 'rejected' à 'pending' (réouverture)
    (resource.data.status == 'rejected' &&
     request.resource.data.status == 'under_review' &&
     request.resource.data.reopenedBy is string &&
     request.resource.data.reopenedBy != null &&
     request.resource.data.reopenedBy == request.auth.uid &&
     request.resource.data.reopenedAt is timestamp &&
     request.resource.data.reopenedAt != null &&
     request.resource.data.reopenReason is string &&
     request.resource.data.reopenReason.size() >= 10 &&
     request.resource.data.reopenReason.size() <= 500 &&
     request.resource.data.motifReject == resource.data.motifReject) ||
    // Sinon, mise à jour normale par admin
    (request.resource.data.status != 'approved' && 
     request.resource.data.status != 'rejected' &&
     !(resource.data.status == 'rejected' && request.resource.data.status == 'under_review'))
  ))
  // ... autres cas (demandeur avec code)
)
```

---

## 3. Suppression d'un Dossier

### Opération
`deleteDoc` sur `membership-requests/{requestId}`

### Règle Actuelle
```javascript
// Ligne 165-166 dans firestore.rules
// SUPPRESSION : Admin uniquement
allow delete: if isAdmin();
```

### État
✅ **Suffisant** - Les admins peuvent déjà supprimer les demandes.

**Note** : La suppression définitive avec nettoyage Storage nécessite des privilèges admin (via Cloud Function). Voir `functions/deleteMembershipRequest.md`.

### Validation Recommandée (Optionnel)

Si on veut renforcer la sécurité pour n'autoriser la suppression que des demandes rejetées :

```javascript
// SUPPRESSION : Admin uniquement, et seulement si le statut est 'rejected'
allow delete: if isAdmin() && resource.data.status == 'rejected';
```

**Recommandation** : Garder la règle actuelle (admin uniquement) et gérer la validation du statut côté application/Cloud Function. Cela donne plus de flexibilité.

---

## 4. Collection : `notifications`

### Création de Notifications

**Règle** : Admin ou Cloud Function peut créer des notifications

```javascript
match /notifications/{notificationId} {
  // Lecture : Admin uniquement
  allow read: if isAdmin();
  
  // Écriture : Admin ou Cloud Function
  allow create: if isAdmin() || request.auth == null; // Cloud Function (pas d'auth)
  allow update: if isAdmin();
  allow delete: if isAdmin();
}
```

**État** : ✅ Les règles existantes doivent déjà couvrir cette collection (à vérifier dans `firestore.rules`).

---

## 5. Collection : `audit-logs`

### Création de Logs d'Audit

**Règle** : Seulement Cloud Function (pas d'auth) peut créer des logs d'audit

```javascript
match /audit-logs/{logId} {
  // Lecture : Admin uniquement
  allow read: if isAdmin();
  
  // Écriture : Cloud Function uniquement (pas d'auth)
  allow create: if request.auth == null; // Cloud Function uniquement
  allow update: if false; // Pas de mise à jour
  allow delete: if isAdmin() && request.auth.token.role == 'SuperAdmin'; // Suppression super admin uniquement
}
```

**État** : ⚠️ Cette collection doit être ajoutée si elle n'existe pas encore dans `firestore.rules`.

---

## 📋 Récapitulatif des Modifications Nécessaires

| Collection | Modification | Priorité | Statut |
|------------|--------------|----------|--------|
| `membership-requests` | Ajouter validation rejet (processedBy, processedAt, motifReject) | 🟡 P1 | Recommandé |
| `membership-requests` | Ajouter validation réouverture (reopenedBy, reopenedAt, reopenReason) | 🟡 P1 | Recommandé |
| `membership-requests` | Suppression admin uniquement | ✅ P0 | **Déjà implémenté** |
| `notifications` | Création admin ou Cloud Function | ✅ P0 | **Déjà implémenté** (à vérifier) |
| `audit-logs` | Création Cloud Function uniquement | 🟡 P2 | **À ajouter** |

---

## 🔒 Sécurité

### Validations Côté Firestore vs Côté Application

**Côté Firestore** :
- ✅ Empêche les mises à jour malveillantes
- ✅ Double couche de sécurité
- ❌ Plus complexe à maintenir

**Côté Application** :
- ✅ Plus facile à tester et déboguer
- ✅ Validation plus flexible (messages d'erreur personnalisés)
- ❌ Peut être bypassé si code malveillant

**Recommandation** : Utiliser les **deux couches** pour une sécurité maximale :
- Validation stricte côté application (principale)
- Validation basique côté Firestore (backup)

---

## 📝 Notes Importantes

1. **Validation de longueur** : Les règles Firestore peuvent valider la longueur minimale/maximale des chaînes, mais la validation exacte (10-500 caractères) est mieux gérée côté application.

2. **Traçabilité** : Les champs `processedBy` et `reopenedBy` doivent correspondre à `request.auth.uid` pour garantir que l'admin qui effectue l'action est bien celui enregistré.

3. **Protection contre modification** : Une fois qu'une demande est rejetée (`status = 'rejected'`), empêcher la modification de `processedBy`, `processedAt` et `motifReject` pour maintenir l'intégrité de l'audit.

4. **Motif de rejet conservé** : Lors de la réouverture, le `motifReject` initial doit être conservé pour l'historique.

---

## 📚 Références

- **Règles Firestore existantes** : `firestore.rules` (lignes 89-167)
- **Flux de rejet** : `../FLUX_REJET.md`
- **Actions post-rejet** : `../ACTIONS_POST_REJET.md`
- **Cloud Functions** : `../functions/README.md`
- [Documentation Firebase Security Rules](https://firebase.google.com/docs/rules)
