# Règles Storage - Approbation d'une Demande d'Adhésion

> Documentation des règles Storage nécessaires pour l'upload du PDF d'adhésion

---

## 📋 Vue d'ensemble

L'approbation nécessite l'upload d'un PDF d'adhésion vers Firebase Storage. Ce PDF est ensuite archivé dans la collection Firestore `documents`.

**Chemin Storage** : `membership-adhesion-pdfs/{fileName}`

**Format** : PDF uniquement

**Taille maximale** : 10 MB

---

## 🔐 Règles Storage

**Fichier** : `storage.rules` (lignes 75-89)

### Règle Actuelle

```javascript
// ==========================================
// PDFs D'ADHÉSION (MEMBERSHIP-ADHESION-PDFS)
// ==========================================
// PDFs générés lors de l'approbation - CONFIDENTIELS

match /membership-adhesion-pdfs/{fileName} {
  // Lecture : Admins uniquement
  allow read: if isAdmin();
  
  // Écriture : Admins uniquement avec validation (PDF, max 10MB)
  allow write: if isAdmin() && isPDF() && isPDFSizeValid();
  
  // Suppression : Admin uniquement
  allow delete: if isAdmin();
}
```

---

## ✅ État Actuel

**État** : ✅ **Suffisant** - Les règles existantes sont parfaitement adaptées à l'approbation.

### Fonctions Utilitaires Utilisées

```javascript
// Vérifie si l'utilisateur est admin
function isAdmin() {
  return isAuthenticated() && 
         request.auth.token.role in ['Admin', 'SuperAdmin', 'Secretary'];
}

// Vérifie si le fichier est un PDF
function isPDF() {
  return request.resource.contentType == 'application/pdf';
}

// Limite de taille : 10 MB pour les PDFs
function isPDFSizeValid() {
  return request.resource.size < 10 * 1024 * 1024;
}
```

---

## 📝 Détails des Règles

### 1. Lecture (Read)

**Règle** : `allow read: if isAdmin();`

**Description** : Seuls les admins peuvent lire les PDFs d'adhésion.

**Justification** : Les PDFs d'adhésion contiennent des informations confidentielles et ne doivent être accessibles qu'aux admins.

**État** : ✅ **Correct**

---

### 2. Écriture (Write)

**Règle** : `allow write: if isAdmin() && isPDF() && isPDFSizeValid();`

**Description** : Seuls les admins peuvent uploader des PDFs d'adhésion, avec validation :
- Le fichier doit être un PDF (`contentType == 'application/pdf'`)
- La taille doit être inférieure à 10 MB

**Justification** :
- Seuls les admins peuvent approuver des demandes et uploader les PDFs
- Validation du format pour éviter les fichiers malveillants
- Limite de taille pour éviter les abus de stockage

**État** : ✅ **Correct**

---

### 3. Suppression (Delete)

**Règle** : `allow delete: if isAdmin();`

**Description** : Seuls les admins peuvent supprimer les PDFs d'adhésion.

**Justification** : Les PDFs d'adhésion sont des documents importants et ne doivent être supprimés que par les admins.

**État** : ✅ **Correct**

---

## 🔄 Workflow d'Upload

### 1. Upload par l'Admin

**Contexte** : L'admin approuve une demande d'adhésion et upload le PDF d'adhésion.

**Processus** :
1. Admin sélectionne le PDF dans le modal d'approbation
2. Validation côté client (format PDF, taille < 10MB)
3. Upload vers Firebase Storage : `membership-adhesion-pdfs/{fileName}`
4. Récupération de l'URL et des métadonnées
5. Passage de l'URL à la Cloud Function `approveMembershipRequest`
6. Archivage dans Firestore collection `documents` par la Cloud Function

**Nom de fichier** : `{firstName}_{lastName}_{YYYY}-{YYYY}.pdf`

**Exemple** : `Jean_Dupont_2024-2025.pdf`

---

### 2. Archivage dans Firestore

**Collection** : `documents`

**Document créé** :
```typescript
{
  type: 'ADHESION',
  format: 'pdf',
  libelle: `Fiche d'adhésion - ${matricule}`,
  memberId: matricule,
  url: adhesionPdfURL,  // URL depuis Storage
  path: adhesionPdfPath,  // Chemin dans Storage
  size: fileSize,
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
  createdBy: adminId,
  updatedBy: adminId
}
```

**État** : ✅ **Géré par la Cloud Function**

---

## 🔒 Sécurité

### Points de Sécurité

1. **Accès restreint** : Seuls les admins peuvent uploader/lire/supprimer
2. **Validation du format** : Seuls les PDFs sont acceptés
3. **Limite de taille** : 10 MB maximum pour éviter les abus
4. **Authentification requise** : `isAdmin()` vérifie l'authentification et le rôle

### Protection contre les Abus

- **Format** : Validation stricte du `contentType` (PDF uniquement)
- **Taille** : Limite de 10 MB pour éviter les uploads volumineux
- **Permissions** : Seuls les admins peuvent uploader

---

## 📝 Résumé

### ✅ Déjà en Place
- ✅ Règles pour upload PDF (admin uniquement)
- ✅ Validation du format (PDF uniquement)
- ✅ Validation de la taille (max 10 MB)
- ✅ Règles pour lecture (admin uniquement)
- ✅ Règles pour suppression (admin uniquement)

### ⚠️ Aucune Modification Nécessaire
Les règles Storage existantes sont parfaitement adaptées à l'approbation.

---

## 🧪 Tests des Règles

### Scénarios à Tester

1. **Upload réussi** :
   - Admin authentifié peut uploader un PDF < 10 MB
   - Le fichier est correctement stocké dans `membership-adhesion-pdfs/`

2. **Protection contre uploads non autorisés** :
   - Utilisateur non admin ne peut pas uploader
   - Utilisateur non authentifié ne peut pas uploader

3. **Validation du format** :
   - Upload d'un fichier non-PDF est rejeté
   - Upload d'un PDF > 10 MB est rejeté

4. **Lecture** :
   - Admin peut lire les PDFs uploadés
   - Utilisateur non admin ne peut pas lire

5. **Suppression** :
   - Admin peut supprimer les PDFs
   - Utilisateur non admin ne peut pas supprimer

---

## 📖 Références

- **Fichier de règles** : `storage.rules`
- **Documentation Cloud Function** : `../functions/README.md`
- **Flux d'approbation** : `../FLUX_APPROBATION.md`
- **Documentation Storage** : `../../firebase/STORAGE.md` (si existe)
