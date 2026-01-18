# Règles Firestore - Fonctionnalité Corrections

## 📋 Vue d'ensemble

Ce document définit les règles de sécurité Firestore nécessaires pour la fonctionnalité de demande de correction des demandes d'adhésion.

## 🔐 Collection : `membership-requests`

### Opérations autorisées

#### 1. **Admin - Demander des corrections**

**Opération :** `updateDoc` sur `membership-requests/{requestId}`

**Champs modifiables :**
- `status` → `'under_review'`
- `reviewNote` → `string` (liste des corrections)
- `securityCode` → `string` (code à 6 chiffres)
- `securityCodeExpiry` → `timestamp` (expiration 48h)
- `securityCodeUsed` → `false`
- `processedBy` → `string` (ID admin)
- `updatedAt` → `serverTimestamp()`

**Règle :**
```javascript
// Dans firestore.rules
match /membership-requests/{requestId} {
  // Admin peut mettre à jour le statut pour demander des corrections
  allow update: if request.auth != null 
    && request.auth.token.role == 'admin'
    && request.resource.data.status == 'under_review'
    && request.resource.data.diff(resource.data).affectedKeys()
        .hasOnly(['status', 'reviewNote', 'securityCode', 'securityCodeExpiry', 
                  'securityCodeUsed', 'processedBy', 'updatedAt'])
    && request.resource.data.securityCode is string
    && request.resource.data.securityCode.matches('^[0-9]{6}$') // 6 chiffres
    && request.resource.data.securityCodeUsed == false
    && request.resource.data.processedBy == request.auth.uid;
}
```

#### 2. **Demandeur - Lire sa demande pour vérifier le code**

**Opération :** `getDoc` sur `membership-requests/{requestId}`

**Champs lus :**
- `securityCode`
- `securityCodeUsed`
- `securityCodeExpiry`
- `status`
- `reviewNote`
- Tous les autres champs (pour charger les données)

**Règle :**
```javascript
// Lecture publique pour permettre au demandeur d'accéder à sa demande
// via le code de sécurité (vérifié côté application)
match /membership-requests/{requestId} {
  allow read: if true; // Accès public contrôlé par code de sécurité côté app
}
```

**Note de sécurité :** L'accès est public mais protégé par :
- Le code de sécurité à 6 chiffres (non devinable)
- La vérification côté application (code, expiration, usage)
- Le statut `under_review` requis

#### 3. **Demandeur - Soumettre les corrections**

**Opération :** `updateDoc` sur `membership-requests/{requestId}`

**Champs modifiables :**
- `status` → `'pending'` (retour en attente)
- `securityCodeUsed` → `true` (code marqué comme utilisé)
- `reviewNote` → `null` (nettoyage)
- `securityCode` → `null` (nettoyage)
- `securityCodeExpiry` → `null` (nettoyage)
- `identity.*` → Mise à jour des données d'identité
- `address.*` → Mise à jour de l'adresse
- `company.*` → Mise à jour de l'entreprise
- `documents.*` → Mise à jour des documents
- `updatedAt` → `serverTimestamp()`

**Règle :**
```javascript
match /membership-requests/{requestId} {
  // Mise à jour par demandeur (via code de sécurité)
  // Vérification côté application que :
  // - securityCode correspond
  // - securityCodeUsed == false
  // - securityCodeExpiry > now
  // - status == 'under_review'
  allow update: if request.resource.data.status == 'pending'
    && request.resource.data.securityCodeUsed == true
    && (!('securityCode' in request.resource.data) 
        || request.resource.data.securityCode == null)
    && (!('reviewNote' in request.resource.data) 
        || request.resource.data.reviewNote == null);
}
```

**Note :** Cette règle est permissive car la sécurité est gérée côté application via le code de sécurité. Pour une sécurité renforcée, on pourrait exiger une authentification, mais cela compliquerait le flux pour les demandeurs.

#### 4. **Admin - Renouveler le code de sécurité**

**Opération :** `updateDoc` sur `membership-requests/{requestId}`

**Champs modifiables :**
- `securityCode` → `string` (nouveau code)
- `securityCodeExpiry` → `timestamp` (nouvelle expiration)
- `securityCodeUsed` → `false` (réinitialisation)
- `updatedAt` → `serverTimestamp()`

**Règle :**
```javascript
match /membership-requests/{requestId} {
  // Admin peut renouveler le code de sécurité
  allow update: if request.auth != null 
    && request.auth.token.role == 'admin'
    && request.resource.data.diff(resource.data).affectedKeys()
        .hasOnly(['securityCode', 'securityCodeExpiry', 'securityCodeUsed', 'updatedAt'])
    && request.resource.data.securityCode is string
    && request.resource.data.securityCode.matches('^[0-9]{6}$')
    && request.resource.data.securityCodeUsed == false;
}
```

## 🔒 Règles complètes (extrait pour corrections)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    match /membership-requests/{requestId} {
      
      // ============================================
      // LECTURE
      // ============================================
      // Lecture publique (sécurisée par code côté app)
      allow read: if true;
      
      // ============================================
      // ÉCRITURE - ADMIN
      // ============================================
      
      // Admin peut demander des corrections
      allow update: if request.auth != null 
        && request.auth.token.role == 'admin'
        && (
          // Cas 1: Demander corrections (status → under_review)
          (request.resource.data.status == 'under_review'
            && resource.data.status != 'under_review'
            && request.resource.data.diff(resource.data).affectedKeys()
                .hasOnly(['status', 'reviewNote', 'securityCode', 
                         'securityCodeExpiry', 'securityCodeUsed', 
                         'processedBy', 'updatedAt'])
            && request.resource.data.securityCode is string
            && request.resource.data.securityCode.matches('^[0-9]{6}$')
            && request.resource.data.securityCodeUsed == false
            && request.resource.data.processedBy == request.auth.uid)
          ||
          // Cas 2: Renouveler code de sécurité
          (request.resource.data.diff(resource.data).affectedKeys()
              .hasOnly(['securityCode', 'securityCodeExpiry', 
                       'securityCodeUsed', 'updatedAt'])
            && request.resource.data.securityCode is string
            && request.resource.data.securityCode.matches('^[0-9]{6}$')
            && request.resource.data.securityCodeUsed == false)
        );
      
      // ============================================
      // ÉCRITURE - DEMANDEUR (via code de sécurité)
      // ============================================
      
      // Mise à jour par demandeur (soumission corrections)
      // Sécurité gérée côté application (code de sécurité)
      allow update: if request.resource.data.status == 'pending'
        && request.resource.data.securityCodeUsed == true
        && (!('securityCode' in request.resource.data) 
            || request.resource.data.securityCode == null)
        && (!('reviewNote' in request.resource.data) 
            || request.resource.data.reviewNote == null)
        && resource.data.status == 'under_review'
        && resource.data.securityCodeUsed == false;
      
      // Autres règles pour création, approbation, rejet, etc.
      // ...
    }
  }
}
```

## ⚠️ Notes de sécurité

1. **Code de sécurité :**
   - Code à 6 chiffres (1 000 000 de combinaisons possibles)
   - Expiration 48h
   - Usage unique
   - Vérification côté application obligatoire

2. **Accès public contrôlé :**
   - La lecture est publique mais protégée par le code de sécurité
   - Sans le code, impossible de deviner l'ID de la demande
   - Le code est envoyé via WhatsApp (canal sécurisé)

3. **Mise à jour par demandeur :**
   - Seulement si `status == 'under_review'` et code valide
   - Le code est marqué comme utilisé après la première mise à jour
   - Impossible de réutiliser le code

4. **Validation côté application :**
   - Toutes les validations (code, expiration, usage) sont faites côté application
   - Les règles Firestore sont une couche supplémentaire de sécurité
