# Règles Storage - Module Demandes Caisse Imprévue V2

> Documentation complète des règles de sécurité Firebase Storage pour les documents et photos des demandes

## 📋 Vue d'ensemble

Les règles Storage contrôlent l'upload, la lecture et la suppression des fichiers (photos de documents d'identité) pour les contacts d'urgence des demandes Caisse Imprévue.

## 🎯 Structure des Chemins

### Documents d'Identité des Contacts d'Urgence

```
caisse-imprevue-documents/
  {demandId}/
    {contactId}/
      document-photo.{jpg|jpeg|png|webp}
```

**Exemple** :
```
caisse-imprevue-documents/
  demand-123/
    contact-456/
      document-photo.jpg
```

### Structure Alternative (Optionnelle)

Si on veut organiser par membre :
```
caisse-imprevue-documents/
  {memberId}/
    {demandId}/
      {contactId}/
        document-photo.{jpg|jpeg|png|webp}
```

---

## 🔒 Règles Storage Complètes

### Règles pour Documents d'Identité

```javascript
// ============================================
// CAISSE IMPRÉVUE - DOCUMENTS CONTACTS D'URGENCE
// ============================================
match /caisse-imprevue-documents/{demandId}/{contactId}/{fileName} {
  // ============================================
  // LECTURE
  // ============================================
  // Lecture publique (nécessaire pour afficher dans les formulaires et détails)
  // La sécurité est gérée côté application (seuls les admins accèdent)
  allow read: if true;
  
  // ============================================
  // ÉCRITURE (UPLOAD)
  // ============================================
  // Upload autorisé si :
  // - Le fichier est une image (jpeg, jpg, png, webp)
  // - Taille max 5 MB
  // - Nom de fichier valide
  allow write: if 
    // Validation type de fichier
    request.resource.contentType.matches('image/(jpeg|jpg|png|webp)') &&
    
    // Validation taille (max 5 MB)
    request.resource.size < 5 * 1024 * 1024 &&
    
    // Validation nom de fichier
    fileName.matches('^document-photo\\.(jpg|jpeg|png|webp)$');
  
  // ============================================
  // SUPPRESSION
  // ============================================
  // Suppression autorisée (pour permettre le remplacement)
  // Sécurité gérée côté application
  allow delete: if true;
}
```

### Règles avec Validation Admin (Option Plus Sûre)

Si on veut restreindre l'upload aux admins uniquement :

```javascript
match /caisse-imprevue-documents/{demandId}/{contactId}/{fileName} {
  // Lecture : Publique (pour affichage)
  allow read: if true;
  
  // Écriture : Admins uniquement avec validation
  allow write: if isAdmin() && 
    request.resource.contentType.matches('image/(jpeg|jpg|png|webp)') &&
    request.resource.size < 5 * 1024 * 1024 &&
    fileName.matches('^document-photo\\.(jpg|jpeg|png|webp)$');
  
  // Suppression : Admins uniquement
  allow delete: if isAdmin();
}
```

---

## 📝 Règles Complètes à Ajouter dans storage.rules

### Emplacement

Ajouter après les autres règles (membership-photos, documents, etc.), avant la règle par défaut.

### Code Complet

```javascript
// ============================================
// CAISSE IMPRÉVUE - DOCUMENTS CONTACTS D'URGENCE
// ============================================
// Documents d'identité des contacts d'urgence uploadés lors de la création de demande
// Structure : caisse-imprevue-documents/{demandId}/{contactId}/{fileName}

match /caisse-imprevue-documents/{demandId}/{contactId}/{fileName} {
  // Fonction de validation du type de fichier
  function isValidImage() {
    return request.resource.contentType.matches('image/(jpeg|jpg|png|webp)');
  }
  
  // Fonction de validation de la taille
  function isValidSize() {
    return request.resource.size < 5 * 1024 * 1024; // 5 MB
  }
  
  // Fonction de validation du nom de fichier
  function isValidFileName() {
    return fileName.matches('^document-photo\\.(jpg|jpeg|png|webp)$');
  }
  
  // ============================================
  // LECTURE
  // ============================================
  // Lecture publique (nécessaire pour afficher dans les formulaires et détails)
  // La sécurité est gérée côté application (seuls les admins accèdent)
  allow read: if true;
  
  // ============================================
  // ÉCRITURE (UPLOAD)
  // ============================================
  // Upload autorisé si :
  // - Le fichier est une image valide
  // - Taille max 5 MB
  // - Nom de fichier valide
  // Note: Upload public car effectué lors de la création de demande par admin
  // La sécurité est gérée côté application (seuls les admins peuvent créer des demandes)
  allow write: if isValidImage() && isValidSize() && isValidFileName();
  
  // ============================================
  // SUPPRESSION
  // ============================================
  // Suppression autorisée (pour permettre le remplacement lors de la modification)
  // Sécurité gérée côté application
  allow delete: if true;
}
```

### Version avec Restriction Admin (Recommandée)

```javascript
match /caisse-imprevue-documents/{demandId}/{contactId}/{fileName} {
  function isValidImage() {
    return request.resource.contentType.matches('image/(jpeg|jpg|png|webp)');
  }
  
  function isValidSize() {
    return request.resource.size < 5 * 1024 * 1024; // 5 MB
  }
  
  function isValidFileName() {
    return fileName.matches('^document-photo\\.(jpg|jpeg|png|webp)$');
  }
  
  // Lecture : Publique (pour affichage dans formulaires et détails)
  allow read: if true;
  
  // Écriture : Admins uniquement avec validation stricte
  allow write: if isAdmin() && 
    isValidImage() && 
    isValidSize() && 
    isValidFileName();
  
  // Suppression : Admins uniquement
  allow delete: if isAdmin();
}
```

---

## 🔍 Détails des Validations

### 1. Validation Type de Fichier

**Règle** :
```javascript
request.resource.contentType.matches('image/(jpeg|jpg|png|webp)')
```

**Types autorisés** :
- `image/jpeg`
- `image/jpg`
- `image/png`
- `image/webp`

**Types refusés** :
- `image/gif`
- `image/bmp`
- `application/pdf`
- Tous les autres types

### 2. Validation Taille

**Règle** :
```javascript
request.resource.size < 5 * 1024 * 1024 // 5 MB
```

**Limite** : 5 MB (5 242 880 octets)

**Raison** : Les photos de documents d'identité doivent être de taille raisonnable pour :
- Réduire les coûts de stockage
- Améliorer les performances de chargement
- Limiter l'utilisation de la bande passante

### 3. Validation Nom de Fichier

**Règle** :
```javascript
fileName.matches('^document-photo\\.(jpg|jpeg|png|webp)$')
```

**Noms autorisés** :
- `document-photo.jpg`
- `document-photo.jpeg`
- `document-photo.png`
- `document-photo.webp`

**Noms refusés** :
- `photo.jpg` (pas de préfixe)
- `document-photo.pdf` (mauvais type)
- `document-photo` (pas d'extension)
- `document_photo.jpg` (underscore au lieu de tiret)

---

## 📊 Comparaison des Approches

### Approche 1 : Upload Public avec Validation

**Avantages** :
- Plus simple à implémenter
- Pas besoin de gérer les tokens d'authentification côté client
- Fonctionne même si l'utilisateur n'est pas connecté (peu probable dans notre cas)

**Inconvénients** :
- Moins sécurisé (n'importe qui peut uploader si connaît le chemin)
- Dépend de la sécurité côté application

**Recommandation** : ✅ **Utiliser cette approche** si la sécurité côté application est robuste.

### Approche 2 : Upload Restreint aux Admins

**Avantages** :
- Plus sécurisé (double couche : Storage + Application)
- Empêche les uploads non autorisés même si quelqu'un contourne l'application

**Inconvénients** :
- Plus complexe (gestion des tokens)
- Nécessite que l'utilisateur soit authentifié

**Recommandation** : ✅ **Utiliser cette approche** pour une sécurité maximale.

---

## 🚀 Déploiement

### Méthode 1 : Via Firebase Console

1. Accéder à Firebase Console → Storage → Règles
2. Copier-coller les règles complètes
3. Cliquer sur "Publier"

### Méthode 2 : Via CLI Firebase

```bash
# Tester les règles localement
firebase emulators:start --only storage

# Déployer les règles
firebase deploy --only storage
```

### Méthode 3 : Via GitHub Actions (si configuré)

Les règles sont déployées automatiquement lors du déploiement.

---

## ✅ Validation des Règles

### Tester les Règles Localement

```bash
# Démarrer l'émulateur
firebase emulators:start --only storage

# Tester avec les tests unitaires
npm run test:storage-rules
```

### Scénarios de Test

#### Test 1 : Upload Image Valide
```javascript
// ✅ Doit réussir
const file = new File(['...'], 'document-photo.jpg', { type: 'image/jpeg' })
// Taille < 5 MB
await uploadBytes(ref, file)
```

#### Test 2 : Upload Image Trop Grande
```javascript
// ❌ Doit échouer
const file = new File([...], 'document-photo.jpg', { type: 'image/jpeg' })
// Taille > 5 MB
await uploadBytes(ref, file) // Erreur : File too large
```

#### Test 3 : Upload PDF
```javascript
// ❌ Doit échouer
const file = new File(['...'], 'document-photo.pdf', { type: 'application/pdf' })
await uploadBytes(ref, file) // Erreur : Invalid file type
```

#### Test 4 : Upload avec Mauvais Nom
```javascript
// ❌ Doit échouer
const file = new File(['...'], 'photo.jpg', { type: 'image/jpeg' })
await uploadBytes(ref, file) // Erreur : Invalid file name
```

---

## 🔐 Sécurité Côté Application

Même avec des règles Storage permissives, la sécurité doit être gérée côté application :

### 1. Validation Avant Upload

```typescript
// domains/financial/caisse-imprevue/services/CaisseImprevueService.ts
async uploadContactDocument(
  demandId: string,
  contactId: string,
  file: File
): Promise<string> {
  // Validation côté application
  if (!file.type.startsWith('image/')) {
    throw new Error('Le fichier doit être une image')
  }
  
  if (file.size > 5 * 1024 * 1024) {
    throw new Error('Le fichier ne doit pas dépasser 5 MB')
  }
  
  if (!file.name.match(/^document-photo\.(jpg|jpeg|png|webp)$/)) {
    throw new Error('Nom de fichier invalide')
  }
  
  // Vérifier que l'utilisateur est admin
  if (!isAdmin()) {
    throw new Error('Seuls les admins peuvent uploader des documents')
  }
  
  // Upload
  const storageRef = ref(storage, `caisse-imprevue-documents/${demandId}/${contactId}/${file.name}`)
  await uploadBytes(storageRef, file)
  
  // Retourner l'URL
  return await getDownloadURL(storageRef)
}
```

### 2. Optimisation des Images

```typescript
// Optimiser l'image avant upload (réduire la taille)
import { compressImage } from '@/shared/utils/image-compression'

const optimizedFile = await compressImage(file, {
  maxWidth: 1920,
  maxHeight: 1920,
  quality: 0.8,
  maxSize: 5 * 1024 * 1024 // 5 MB
})

await uploadBytes(storageRef, optimizedFile)
```

---

## 📊 Coûts Storage

### Estimation des Coûts

**Taille moyenne d'une photo de document** : ~500 KB (après optimisation)

**Nombre de demandes par mois** : 100 (estimation)

**Stockage mensuel** : 100 × 500 KB = 50 MB

**Coût Storage** : 
- 5 GB gratuits
- Au-delà : $0.026/GB/mois

**Pour 50 MB** : Gratuit (dans la limite gratuite)

### Optimisation

- **Compression** : Réduire la qualité à 0.8
- **Redimensionnement** : Max 1920x1920px
- **Format WebP** : Utiliser WebP pour une meilleure compression

---

## ⚠️ Points d'Attention

### Taille Maximale

- **5 MB** : Limite raisonnable pour les photos de documents
- **Validation côté client** : Afficher un message si le fichier est trop grand
- **Compression** : Compresser automatiquement avant upload

### Types de Fichiers

- **Images uniquement** : JPEG, JPG, PNG, WebP
- **Pas de PDF** : Les PDFs ne sont pas autorisés pour les photos de documents
- **Validation MIME type** : Vérifier le `contentType`, pas seulement l'extension

### Nom de Fichier

- **Format strict** : `document-photo.{ext}`
- **Pas d'espaces** : Utiliser des tirets
- **Extension obligatoire** : Doit correspondre au type MIME

### Sécurité

- **Double validation** : Côté Storage ET côté application
- **Permissions** : Seuls les admins peuvent créer des demandes (donc uploader)
- **Audit** : Logger tous les uploads pour traçabilité

---

## 📚 Références

- **Documentation Storage Rules** : https://firebase.google.com/docs/storage/security/get-started
- **Syntaxe Rules** : https://firebase.google.com/docs/storage/security/rules-conditions
- **Validation des fichiers** : https://firebase.google.com/docs/storage/security/rules-conditions#file_validation
- **Coûts Storage** : https://firebase.google.com/pricing

---

**Date de création** : 2026-01-27  
**Version** : V2  
**Auteur** : Senior Dev
