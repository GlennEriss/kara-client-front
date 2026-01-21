# Cloud Function : deleteMembershipRequest

> Cloud Function Callable qui supprime définitivement une demande d'adhésion rejetée avec nettoyage complet (Firestore + Storage)

---

## 📋 Vue d'ensemble

**Type** : HTTP Callable Function

**Objectif** : Supprimer définitivement une demande d'adhésion rejetée avec :
- Suppression du document Firestore
- Suppression des fichiers Storage (photos, pièces d'identité)
- Création d'un log d'audit
- Validation de sécurité (matricule)

---

## 🔧 Configuration

### Signature

```typescript
// functions/src/membership-requests/deleteMembershipRequest.ts
import * as admin from 'firebase-admin'
import { getStorage } from 'firebase-admin/storage'
import { onCall, HttpsError } from 'firebase-functions/v2/https'

export const deleteMembershipRequest = onCall(
  {
    region: 'europe-west1',
    memory: '512MiB',
    timeoutSeconds: 60,
    maxInstances: 10,
  },
  async (request) => {
    // Logique de suppression
  }
)
```

### Paramètres de Configuration

- **region** : `'europe-west1'` - Région d'exécution (Europe)
- **memory** : `512MiB` - Mémoire allouée (plus élevée pour gestion Storage)
- **timeoutSeconds** : `60` - Timeout maximal (60 secondes pour suppression fichiers)
- **maxInstances** : `10` - Nombre maximum d'instances simultanées

---

## 📥 Paramètres d'Entrée

```typescript
interface DeleteMembershipRequestInput {
  requestId: string          // ID de la demande d'adhésion
  confirmedMatricule: string // Matricule confirmé pour validation de sécurité
}
```

---

## 📤 Réponse

```typescript
interface DeleteMembershipRequestOutput {
  success: true
  requestId: string
  filesDeleted: number       // Nombre de fichiers Storage supprimés
  deletedAt: string          // Date de suppression (ISO string)
}
```

---

## 🔄 Flux d'Exécution

### 1. Validation des Permissions

```typescript
// Vérifier que l'utilisateur est authentifié
if (!request.auth) {
  throw new HttpsError('unauthenticated', 'Utilisateur non authentifié')
}

// Vérifier que l'utilisateur est admin
const userRole = request.auth.token.role
if (!userRole || !['Admin', 'SuperAdmin', 'Secretary'].includes(userRole)) {
  throw new HttpsError('permission-denied', 'Permissions insuffisantes. Seuls les administrateurs peuvent supprimer des demandes.')
}
```

### 2. Validation des Paramètres

```typescript
const { requestId, confirmedMatricule } = request.data

if (!requestId || !confirmedMatricule) {
  throw new HttpsError('invalid-argument', 'requestId et confirmedMatricule sont requis')
}

if (typeof requestId !== 'string' || typeof confirmedMatricule !== 'string') {
  throw new HttpsError('invalid-argument', 'requestId et confirmedMatricule doivent être des chaînes de caractères')
}
```

### 3. Récupération de la Demande

```typescript
const db = admin.firestore()
const membershipRequestRef = db.collection('membership-requests').doc(requestId)
const membershipRequestDoc = await membershipRequestRef.get()

if (!membershipRequestDoc.exists) {
  throw new HttpsError('not-found', `Demande d'adhésion ${requestId} introuvable`)
}

const membershipRequest = membershipRequestDoc.data()!
```

### 4. Validation du Statut

```typescript
// Vérifier que le statut est 'rejected'
if (membershipRequest.status !== 'rejected') {
  throw new HttpsError(
    'failed-precondition',
    `Seules les demandes rejetées peuvent être supprimées. Statut actuel: ${membershipRequest.status}`
  )
}
```

### 5. Validation du Matricule

```typescript
// Vérifier que le matricule confirmé correspond au matricule du dossier
if (confirmedMatricule !== membershipRequest.matricule) {
  throw new HttpsError(
    'permission-denied',
    'Le matricule confirmé ne correspond pas au matricule du dossier. Suppression annulée pour des raisons de sécurité.'
  )
}
```

### 6. Logging d'Audit AVANT Suppression

```typescript
// Créer un document d'audit AVANT suppression pour historique
const auditLog = {
  action: 'membership_request_deleted',
  requestId,
  matricule: membershipRequest.matricule,
  memberName: `${membershipRequest.identity.firstName} ${membershipRequest.identity.lastName}`,
  deletedBy: request.auth.uid,
  deletedByName: request.auth.token.name || 'Admin', // Si disponible
  deletedAt: admin.firestore.FieldValue.serverTimestamp(),
  reason: 'Suppression définitive d\'une demande rejetée',
  metadata: {
    status: membershipRequest.status,
    motifReject: membershipRequest.motifReject,
    processedAt: membershipRequest.processedAt,
    processedBy: membershipRequest.processedBy,
    createdAt: membershipRequest.createdAt,
    // Ne pas sauvegarder toutes les données personnelles pour respecter RGPD
    // Seulement les données nécessaires pour audit
  }
}

try {
  await db.collection('audit-logs').add(auditLog)
  console.log(`[deleteMembershipRequest] Log d'audit créé pour ${requestId}`)
} catch (error) {
  console.error(`[deleteMembershipRequest] Erreur création log d'audit:`, error)
  // Ne pas faire échouer la suppression si le log échoue
  // Mais logger pour intervention manuelle
}
```

### 7. Suppression des Fichiers Storage

```typescript
const storage = getStorage()
const bucket = storage.bucket()
const filesToDelete: string[] = []

// Collecter les chemins des fichiers à supprimer
if (membershipRequest.identity?.photo) {
  filesToDelete.push(membershipRequest.identity.photo)
}

if (membershipRequest.documents?.documentPhotoFront) {
  filesToDelete.push(membershipRequest.documents.documentPhotoFront)
}

if (membershipRequest.documents?.documentPhotoBack) {
  filesToDelete.push(membershipRequest.documents.documentPhotoBack)
}

// Supprimer les fichiers Storage
let filesDeletedCount = 0
const filesDeletionErrors: string[] = []

for (const filePath of filesToDelete) {
  try {
    const file = bucket.file(filePath)
    const [exists] = await file.exists()
    
    if (exists) {
      await file.delete()
      filesDeletedCount++
      console.log(`[deleteMembershipRequest] Fichier Storage supprimé: ${filePath}`)
    } else {
      console.warn(`[deleteMembershipRequest] Fichier Storage introuvable: ${filePath}`)
    }
  } catch (error: any) {
    filesDeletionErrors.push(`${filePath}: ${error.message}`)
    console.error(`[deleteMembershipRequest] Erreur lors de la suppression de ${filePath}:`, error)
    // Ne pas faire échouer la suppression si un fichier ne peut pas être supprimé
    // Logger pour intervention manuelle
  }
}

if (filesDeletionErrors.length > 0) {
  console.warn(`[deleteMembershipRequest] Erreurs lors de la suppression de fichiers:`, filesDeletionErrors)
  // Optionnel : Notifier les admins pour intervention manuelle
}
```

### 8. Suppression du Document Firestore

```typescript
try {
  await membershipRequestRef.delete()
  console.log(`[deleteMembershipRequest] Document Firestore supprimé: ${requestId}`)
} catch (error: any) {
  console.error(`[deleteMembershipRequest] Erreur suppression Firestore:`, error)
  throw new HttpsError('internal', `Erreur lors de la suppression du document: ${error.message}`)
}
```

### 9. Logging Final

```typescript
console.log(`[deleteMembershipRequest] Suppression terminée avec succès`)
console.log(`[deleteMembershipRequest] RequestId: ${requestId}`)
console.log(`[deleteMembershipRequest] Matricule: ${membershipRequest.matricule}`)
console.log(`[deleteMembershipRequest] Nom: ${membershipRequest.identity.firstName} ${membershipRequest.identity.lastName}`)
console.log(`[deleteMembershipRequest] Supprimé par: ${request.auth.uid}`)
console.log(`[deleteMembershipRequest] Fichiers supprimés: ${filesDeletedCount}/${filesToDelete.length}`)

if (filesDeletionErrors.length > 0) {
  console.warn(`[deleteMembershipRequest] Fichiers non supprimés (intervention manuelle requise):`, filesDeletionErrors)
}
```

### 10. Retour de la Réponse

```typescript
return {
  success: true,
  requestId,
  filesDeleted: filesDeletedCount,
  deletedAt: new Date().toISOString(),
  warnings: filesDeletionErrors.length > 0 
    ? `Certains fichiers n'ont pas pu être supprimés. Intervention manuelle requise.`
    : undefined
}
```

---

## 🔒 Sécurité

### Validations de Sécurité

1. **Authentification** : Utilisateur doit être authentifié
2. **Permissions** : Utilisateur doit être Admin/SuperAdmin/Secretary
3. **Statut** : Seules les demandes rejetées peuvent être supprimées
4. **Matricule** : Validation par matricule obligatoire (double confirmation)
5. **Logging** : Log d'audit créé avant suppression

### Gestion des Erreurs

```typescript
try {
  // Suppression fichiers Storage
  await file.delete()
} catch (error) {
  // Ne pas faire échouer la suppression si un fichier ne peut pas être supprimé
  // Logger pour intervention manuelle
  console.error(`[deleteMembershipRequest] Erreur suppression fichier:`, error)
}
```

---

## 📊 Logging et Audit

### Logs à Inclure

```typescript
console.log(`[deleteMembershipRequest] Début suppression: ${requestId}`)
console.log(`[deleteMembershipRequest] Supprimé par: ${request.auth.uid}`)
console.log(`[deleteMembershipRequest] Matricule: ${membershipRequest.matricule}`)
console.log(`[deleteMembershipRequest] Nom: ${membershipRequest.identity.firstName} ${membershipRequest.identity.lastName}`)
console.log(`[deleteMembershipRequest] Log d'audit créé`)
console.log(`[deleteMembershipRequest] Fichiers Storage supprimés: ${filesDeletedCount}`)
console.log(`[deleteMembershipRequest] Document Firestore supprimé`)
console.log(`[deleteMembershipRequest] Suppression terminée avec succès`)
console.error(`[deleteMembershipRequest] Erreur:`, error)
```

### Log d'Audit

Le log d'audit est créé dans la collection `audit-logs` AVANT la suppression :

```typescript
{
  action: 'membership_request_deleted',
  requestId: string,
  matricule: string,
  memberName: string,
  deletedBy: string,
  deletedByName: string,
  deletedAt: Timestamp,
  reason: string,
  metadata: {
    status: string,
    motifReject: string,
    processedAt: Timestamp,
    processedBy: string,
    createdAt: Timestamp,
  }
}
```

---

## 🧪 Tests

### Tests Unitaires

**Fichier** : `functions/src/membership-requests/__tests__/deleteMembershipRequest.test.ts`

**Cas à tester** :
1. Suppression réussie (Firestore + tous les fichiers Storage)
2. Suppression réussie avec fichiers Storage partiels (certains fichiers manquants)
3. Suppression réussie sans fichiers Storage
4. Demande non trouvée
5. Demande non rejetée (statut différent de 'rejected')
6. Matricule incorrect
7. Permissions insuffisantes (utilisateur non admin)
8. Utilisateur non authentifié
9. Paramètres manquants
10. Erreur suppression Storage (ne doit pas faire échouer)
11. Erreur suppression Firestore (doit faire échouer)
12. Création log d'audit réussie
13. Erreur création log d'audit (ne doit pas faire échouer)

### Tests d'Intégration

**Cas à tester** :
1. Flux complet : Suppression Firestore + Storage + Audit
2. Vérification suppression Firestore
3. Vérification suppression Storage
4. Vérification création log d'audit
5. Vérification validation matricule

---

## 🚀 Déploiement

### Export dans index.ts

```typescript
// functions/src/index.ts
export { deleteMembershipRequest } from './membership-requests/deleteMembershipRequest'
```

### Déploiement

```bash
cd functions
npm run build
firebase deploy --only functions:deleteMembershipRequest
```

---

## 📚 Références

- **Firebase Functions v2 - Callable Functions** : https://firebase.google.com/docs/functions/callable
- **Firebase Admin SDK - Firestore** : https://firebase.google.com/docs/admin/setup
- **Firebase Admin SDK - Storage** : https://firebase.google.com/docs/storage/admin/start
- **HttpsError** : https://firebase.google.com/docs/reference/functions/functions.https.HttpsError
