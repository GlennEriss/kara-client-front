# Règles Storage - Fonctionnalité Corrections

## 📋 Vue d'ensemble

Ce document définit les règles de sécurité Firebase Storage nécessaires pour la fonctionnalité de correction des demandes d'adhésion.

## 🔐 Bucket : Documents et Photos

### Cas d'usage

La fonctionnalité de correction permet au demandeur de :
1. **Modifier ses photos** (photo de profil, pièce d'identité recto/verso)
2. **Modifier ses documents** (si nécessaire)

### Structure des chemins

```
membership-requests/
  {requestId}/
    photos/
      profile.jpg
      identity-front.jpg
      identity-back.jpg
    documents/
      ...
```

## 🔒 Règles Storage

### 1. **Upload de photos par demandeur (correction)**

**Chemin :** `membership-requests/{requestId}/photos/{fileName}`

**Règle :**
```javascript
match /membership-requests/{requestId}/photos/{fileName} {
  // Upload autorisé si :
  // - Le fichier est une image (jpg, jpeg, png, webp)
  // - Taille max 5MB
  // - Le demandeur a un code de sécurité valide (vérifié côté app)
  allow write: if request.resource.size < 5 * 1024 * 1024 // 5MB
    && request.resource.contentType.matches('image/(jpeg|jpg|png|webp)')
    && fileName.matches('^(profile|identity-front|identity-back)\\.(jpg|jpeg|png|webp)$');
  
  // Lecture publique (pour affichage)
  allow read: if true;
  
  // Suppression autorisée (pour remplacer)
  allow delete: if true; // Sécurité gérée côté app via code
}
```

### 2. **Upload de documents par demandeur (correction)**

**Chemin :** `membership-requests/{requestId}/documents/{fileName}`

**Règle :**
```javascript
match /membership-requests/{requestId}/documents/{fileName} {
  // Upload autorisé si :
  // - Le fichier est un PDF ou une image
  // - Taille max 10MB
  allow write: if request.resource.size < 10 * 1024 * 1024 // 10MB
    && (request.resource.contentType == 'application/pdf'
        || request.resource.contentType.matches('image/(jpeg|jpg|png|webp)'));
  
  // Lecture publique
  allow read: if true;
  
  // Suppression autorisée
  allow delete: if true;
}
```

## 🔒 Règles complètes (extrait)

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    
    // ============================================
    // MEMBERSHIP REQUESTS - PHOTOS
    // ============================================
    match /membership-requests/{requestId}/photos/{fileName} {
      // Validation du type de fichier
      function isValidImage() {
        return request.resource.contentType.matches('image/(jpeg|jpg|png|webp)')
          && fileName.matches('^(profile|identity-front|identity-back)\\.(jpg|jpeg|png|webp)$');
      }
      
      // Validation de la taille
      function isValidSize() {
        return request.resource.size < 5 * 1024 * 1024; // 5MB
      }
      
      // Lecture publique (pour affichage)
      allow read: if true;
      
      // Upload (sécurité gérée côté app via code de sécurité)
      allow write: if isValidImage() && isValidSize();
      
      // Suppression (pour remplacer)
      allow delete: if true;
    }
    
    // ============================================
    // MEMBERSHIP REQUESTS - DOCUMENTS
    // ============================================
    match /membership-requests/{requestId}/documents/{fileName} {
      // Validation du type de fichier
      function isValidDocument() {
        return request.resource.contentType == 'application/pdf'
          || request.resource.contentType.matches('image/(jpeg|jpg|png|webp)');
      }
      
      // Validation de la taille
      function isValidSize() {
        return request.resource.size < 10 * 1024 * 1024; // 10MB
      }
      
      // Lecture publique
      allow read: if true;
      
      // Upload
      allow write: if isValidDocument() && isValidSize();
      
      // Suppression
      allow delete: if true;
    }
  }
}
```

## ⚠️ Notes de sécurité

1. **Sécurité côté application :**
   - Les règles Storage sont permissives car la sécurité est gérée via le code de sécurité côté application
   - Sans le code, impossible de connaître le `requestId`
   - Le code est à usage unique et expire après 48h

2. **Validation des fichiers :**
   - Types de fichiers autorisés : images (jpg, jpeg, png, webp) et PDF
   - Taille maximale : 5MB pour photos, 10MB pour documents
   - Noms de fichiers validés (pour éviter les injections)

3. **Accès public :**
   - La lecture est publique pour permettre l'affichage des photos/documents
   - L'écriture est contrôlée par le code de sécurité (vérifié côté app)

4. **Recommandations :**
   - Pour une sécurité renforcée, on pourrait exiger une authentification
   - Mais cela compliquerait le flux pour les demandeurs (nécessité de créer un compte)
   - Le code de sécurité à 6 chiffres + expiration + usage unique est un bon compromis
