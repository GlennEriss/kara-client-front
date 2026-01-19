# Implémentation de la Cloud Function `approveMembershipRequest`

> Guide d'implémentation détaillé de la Cloud Function pour l'approbation d'une demande d'adhésion

---

## 📋 Vue d'ensemble

**Fichier** : `functions/src/membership-requests/approveMembershipRequest.ts`

**Type** : Callable Function (HTTPS)

**Objectif** : Approuver une demande d'adhésion de manière atomique avec rollback automatique

---

## 🔧 Structure Complète

### Imports

```typescript
import * as admin from 'firebase-admin'
import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore, Timestamp } from 'firebase-admin/firestore'

// Initialiser Firebase Admin si pas déjà fait
if (!admin.apps.length) {
  admin.initializeApp()
}

const db = getFirestore()
const auth = getAuth()
```

### Signature de la Fonction

```typescript
export const approveMembershipRequest = onCall(
  {
    region: 'europe-west1',
    memory: '512MiB',
    timeoutSeconds: 60,
    cors: true,
  },
  async (request) => {
    // Implémentation complète
  }
)
```

---

## 📥 Paramètres d'Entrée

### Interface TypeScript

```typescript
interface ApproveMembershipRequestInput {
  requestId: string
  adminId: string
  membershipType: 'adherant' | 'bienfaiteur' | 'sympathisant'
  companyId?: string | null
  professionId?: string | null
  adhesionPdfURL: string  // Obligatoire
}
```

### Validation

```typescript
const { requestId, adminId, membershipType, companyId, professionId, adhesionPdfURL } = request.data

// Validation des paramètres obligatoires
if (!requestId || typeof requestId !== 'string') {
  throw new HttpsError('invalid-argument', 'requestId est requis et doit être une chaîne')
}

if (!adminId || typeof adminId !== 'string') {
  throw new HttpsError('invalid-argument', 'adminId est requis et doit être une chaîne')
}

if (!membershipType || !['adherant', 'bienfaiteur', 'sympathisant'].includes(membershipType)) {
  throw new HttpsError('invalid-argument', 'membershipType est requis et doit être valide')
}

if (!adhesionPdfURL || typeof adhesionPdfURL !== 'string') {
  throw new HttpsError('invalid-argument', 'adhesionPdfURL est requis (PDF obligatoire)')
}
```

---

## 🔐 Validation des Permissions

```typescript
// Vérifier que l'utilisateur est authentifié
if (!request.auth) {
  throw new HttpsError('unauthenticated', 'Utilisateur non authentifié')
}

// Vérifier que l'utilisateur est admin
const userRole = request.auth.token.role
if (!userRole || !['Admin', 'SuperAdmin', 'Secretary'].includes(userRole)) {
  throw new HttpsError('permission-denied', 'Permissions insuffisantes. Seuls les admins peuvent approuver.')
}

// Vérifier que l'adminId correspond à l'utilisateur authentifié
if (request.auth.uid !== adminId) {
  throw new HttpsError('permission-denied', 'L\'adminId ne correspond pas à l\'utilisateur authentifié')
}
```

---

## ✅ Validation de la Demande

```typescript
const requestRef = db.collection('membership-requests').doc(requestId)
const requestDoc = await requestRef.get()

if (!requestDoc.exists) {
  throw new HttpsError('not-found', 'Demande d\'adhésion non trouvée')
}

const membershipRequest = requestDoc.data()!

// Vérifier que la demande est payée
if (!membershipRequest.isPaid) {
  throw new HttpsError('failed-precondition', 'La demande doit être payée avant approbation')
}

// Vérifier que la demande a le statut 'pending'
if (membershipRequest.status !== 'pending') {
  throw new HttpsError('failed-precondition', `La demande doit être en attente. Statut actuel: ${membershipRequest.status}`)
}

const matricule = membershipRequest.matricule || requestId
```

---

## 🔑 Génération Email et Mot de Passe

```typescript
// Générer email : {firstName}{lastName}{4premiersChiffresMatricule}@kara.ga
const rawFirstName = (membershipRequest.identity.firstName || '').toString()
const rawLastName = (membershipRequest.identity.lastName || '').toString()
const firstName = rawFirstName.toLowerCase().replace(/[^a-z]/g, '')
const lastName = rawLastName.toLowerCase().replace(/[^a-z]/g, '')
const matriculeDigits = matricule.replace(/\D/g, '').slice(0, 4)
const namePart = (firstName + lastName) || 'member'
const generatedEmail = `${namePart}${matriculeDigits}@kara.ga`

// Générer mot de passe sécurisé (12+ caractères)
function generateSecurePassword(length: number = 12): string {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*'
  const randomValues = new Uint8Array(length)
  crypto.getRandomValues(randomValues)
  return Array.from(randomValues, byte => charset[byte % charset.length]).join('')
}

const temporaryPassword = generateSecurePassword(12)
```

---

## 🔄 Opérations Atomiques avec Rollback

### Structure du Rollback

```typescript
const rollbackActions: Array<() => Promise<void>> = []
let subscriptionRef: admin.firestore.DocumentReference | null = null
let documentRef: admin.firestore.DocumentReference | null = null

try {
  // ... opérations ...
} catch (error) {
  // Rollback en ordre inverse
  console.error('[approveMembershipRequest] Erreur, rollback en cours...', error)
  
  for (const rollbackAction of rollbackActions.reverse()) {
    try {
      await rollbackAction()
    } catch (rollbackError) {
      console.error('[approveMembershipRequest] Erreur lors du rollback:', rollbackError)
      // Logger pour intervention manuelle
    }
  }
  
  throw new HttpsError('internal', 'Erreur lors de l\'approbation', { originalError: error.message })
}
```

### 1. Création Utilisateur Firebase Auth

```typescript
console.log(`[approveMembershipRequest] Création utilisateur Auth: ${matricule}`)

let userRecord: admin.auth.UserRecord

try {
  // Vérifier si l'utilisateur existe déjà
  try {
    userRecord = await auth.getUser(matricule)
    console.log(`[approveMembershipRequest] Utilisateur Auth existant: ${matricule}`)
  } catch (error: any) {
    if (error.code === 'auth/user-not-found') {
      // Créer l'utilisateur
      userRecord = await auth.createUser({
        uid: matricule,
        email: generatedEmail,
        password: temporaryPassword,
        disabled: false,
        emailVerified: false,
      })
      console.log(`[approveMembershipRequest] Utilisateur Auth créé: ${matricule}`)
      
      // Ajouter action de rollback
      rollbackActions.push(async () => {
        console.log(`[approveMembershipRequest] Rollback: Suppression utilisateur Auth ${matricule}`)
        await auth.deleteUser(matricule)
      })
    } else {
      throw error
    }
  }
} catch (error: any) {
  console.error('[approveMembershipRequest] Erreur création utilisateur Auth:', error)
  throw new HttpsError('internal', 'Erreur lors de la création de l\'utilisateur Firebase Auth', { error: error.message })
}
```

### 2. Création Document Utilisateur (Firestore)

```typescript
console.log(`[approveMembershipRequest] Création document users: ${matricule}`)

// Convertir membershipType en UserRole
function membershipTypeToRole(membershipType: string): string {
  switch (membershipType) {
    case 'adherant':
      return 'Adherant'
    case 'bienfaiteur':
      return 'Bienfaiteur'
    case 'sympathisant':
      return 'Sympathisant'
    default:
      return 'Adherant'
  }
}

const userRole = membershipTypeToRole(membershipType)

// Préparer les données utilisateur
const userData = {
  matricule,
  firstName: membershipRequest.identity.firstName,
  lastName: membershipRequest.identity.lastName,
  birthDate: membershipRequest.identity.birthDate,
  birthPlace: membershipRequest.identity.birthPlace,
  contacts: membershipRequest.identity.contacts || [],
  gender: membershipRequest.identity.gender,
  email: generatedEmail,  // Email généré (pas le mot de passe)
  nationality: membershipRequest.identity.nationality,
  hasCar: membershipRequest.identity.hasCar || false,
  address: membershipRequest.address,
  photoURL: membershipRequest.identity.photoURL,
  photoPath: membershipRequest.identity.photoPath,
  identityDocument: membershipRequest.documents.identityDocument,
  identityDocumentNumber: membershipRequest.documents.identityDocumentNumber,
  subscriptions: [],  // Sera mis à jour après création de l'abonnement
  dossier: requestId,  // Référence vers la demande
  membershipType,
  roles: [userRole],
  isActive: true,
  companyId: companyId || null,
  professionId: professionId || null,
  createdAt: Timestamp.now(),
  updatedAt: Timestamp.now(),
}

// Créer le document users
await db.collection('users').doc(matricule).set(userData)
console.log(`[approveMembershipRequest] Document users créé: ${matricule}`)

// Ajouter action de rollback
rollbackActions.push(async () => {
  console.log(`[approveMembershipRequest] Rollback: Suppression document users ${matricule}`)
  await db.collection('users').doc(matricule).delete()
})
```

### 3. Création Abonnement

```typescript
console.log(`[approveMembershipRequest] Création abonnement pour: ${matricule}`)

// Calculer les dates (1 an de validité)
const startDate = Timestamp.now()
const endDate = new Date(startDate.toDate())
endDate.setFullYear(endDate.getFullYear() + 1)

const subscriptionData = {
  memberId: matricule,
  membershipType,
  startDate,
  endDate: Timestamp.fromDate(endDate),
  status: 'active',
  adhesionPdfURL,  // URL du PDF d'adhésion (obligatoire)
  createdAt: Timestamp.now(),
  updatedAt: Timestamp.now(),
}

// Créer l'abonnement
subscriptionRef = await db.collection('subscriptions').add(subscriptionData)
console.log(`[approveMembershipRequest] Abonnement créé: ${subscriptionRef.id}`)

// Ajouter action de rollback
rollbackActions.push(async () => {
  if (subscriptionRef) {
    console.log(`[approveMembershipRequest] Rollback: Suppression abonnement ${subscriptionRef.id}`)
    await subscriptionRef.delete()
  }
})

// Mettre à jour le document users avec l'ID de l'abonnement
await db.collection('users').doc(matricule).update({
  subscriptions: admin.firestore.FieldValue.arrayUnion(subscriptionRef.id),
  updatedAt: Timestamp.now(),
})
```

### 4. Mise à Jour Statut de la Demande

```typescript
console.log(`[approveMembershipRequest] Mise à jour statut demande: ${requestId}`)

await requestRef.update({
  status: 'approved',
  approvedBy: adminId,  // ID de l'admin qui a approuvé (obligatoire pour traçabilité)
  approvedAt: Timestamp.now(),  // Date d'approbation (obligatoire pour traçabilité)
  updatedAt: Timestamp.now(),
})

console.log(`[approveMembershipRequest] Statut mis à jour: approved`)
console.log(`[approveMembershipRequest] Approuvé par: ${adminId} à ${new Date().toISOString()}`)
```

**Traçabilité de l'approbation** :
- `approvedBy` : Enregistre l'ID de l'admin qui a effectué l'approbation
- `approvedAt` : Enregistre la date et l'heure exacte de l'approbation
- Ces champs sont obligatoires et permettent d'auditer les approbations

### 5. Archivage Document PDF

```typescript
console.log(`[approveMembershipRequest] Archivage document PDF: ${adhesionPdfURL}`)

// Extraire le nom du fichier depuis l'URL
const fileName = adhesionPdfURL.split('/').pop() || `adhesion_${matricule}.pdf`

// Créer le document dans la collection documents
const documentData = {
  type: 'ADHESION',
  format: 'pdf',
  libelle: `Fiche d'adhésion - ${matricule}`,
  memberId: matricule,
  url: adhesionPdfURL,
  path: adhesionPdfURL,  // Chemin dans Firebase Storage
  fileName,
  size: null,  // Taille en bytes (optionnel, peut être récupérée depuis Storage)
  createdAt: Timestamp.now(),
  updatedAt: Timestamp.now(),
}

documentRef = await db.collection('documents').add(documentData)
console.log(`[approveMembershipRequest] Document archivé: ${documentRef.id}`)

// Ajouter action de rollback
rollbackActions.push(async () => {
  if (documentRef) {
    console.log(`[approveMembershipRequest] Rollback: Suppression document ${documentRef.id}`)
    await documentRef.delete()
  }
})
```

### 6. Création Notification

```typescript
console.log(`[approveMembershipRequest] Création notification d'approbation`)

const memberName = `${membershipRequest.identity.firstName} ${membershipRequest.identity.lastName}`

const notificationData = {
  module: 'memberships',
  entityId: requestId,
  type: 'status_update',
  title: 'Demande d\'adhésion approuvée',
  message: `La demande de ${memberName} a été approuvée. Matricule: ${matricule}`,
  isRead: false,
  createdAt: Timestamp.now(),
  metadata: {
    requestId,
    memberId: matricule,
    memberName,
    email: generatedEmail,
    status: 'approved',
    approvedBy: adminId,
    approvedAt: Timestamp.now(),
  },
}

await db.collection('notifications').add(notificationData)
console.log(`[approveMembershipRequest] Notification créée`)
```

### 7. Retour de la Réponse

```typescript
console.log(`[approveMembershipRequest] Approbation réussie: ${matricule}`)

return {
  success: true,
  matricule,
  email: generatedEmail,
  password: temporaryPassword,  // Retourné UNIQUEMENT dans la réponse HTTPS
  subscriptionId: subscriptionRef!.id,
  companyId: companyId || null,
  professionId: professionId || null,
}
```

---

## 🔄 Gestion des Erreurs et Rollback

### Structure Complète du Try-Catch

```typescript
const rollbackActions: Array<() => Promise<void>> = []
let subscriptionRef: admin.firestore.DocumentReference | null = null
let documentRef: admin.firestore.DocumentReference | null = null
let userCreated = false

try {
  // ... toutes les opérations ...
  
  // Si on arrive ici, tout s'est bien passé
  return {
    success: true,
    matricule,
    email: generatedEmail,
    password: temporaryPassword,
    subscriptionId: subscriptionRef!.id,
    companyId: companyId || null,
    professionId: professionId || null,
  }
  
} catch (error: any) {
  console.error('[approveMembershipRequest] Erreur lors de l\'approbation:', error)
  console.error('[approveMembershipRequest] Stack:', error.stack)
  
  // Rollback en ordre inverse
  console.log(`[approveMembershipRequest] Début rollback (${rollbackActions.length} actions)`)
  
  for (const rollbackAction of rollbackActions.reverse()) {
    try {
      await rollbackAction()
    } catch (rollbackError: any) {
      console.error('[approveMembershipRequest] Erreur lors du rollback:', rollbackError)
      // Logger pour intervention manuelle
      // TODO: Envoyer une alerte (email, Slack, etc.)
    }
  }
  
  console.log('[approveMembershipRequest] Rollback terminé')
  
  // Relancer l'erreur avec un message approprié
  if (error instanceof HttpsError) {
    throw error
  }
  
  throw new HttpsError('internal', 'Erreur lors de l\'approbation de la demande', {
    originalError: error.message,
    requestId,
    matricule,
  })
}
```

---

## 📊 Logging Complet

### Logs à Inclure

```typescript
// Début
console.log(`[approveMembershipRequest] === Début approbation ===`)
console.log(`[approveMembershipRequest] RequestId: ${requestId}`)
console.log(`[approveMembershipRequest] AdminId: ${adminId}`)
console.log(`[approveMembershipRequest] MembershipType: ${membershipType}`)

// Validation
console.log(`[approveMembershipRequest] Validation: Demande trouvée, payée, statut pending`)

// Génération
console.log(`[approveMembershipRequest] Matricule: ${matricule}`)
console.log(`[approveMembershipRequest] Email généré: ${generatedEmail}`)

// Opérations
console.log(`[approveMembershipRequest] Création utilisateur Auth: ${matricule}`)
console.log(`[approveMembershipRequest] Création document users: ${matricule}`)
console.log(`[approveMembershipRequest] Création abonnement: ${subscriptionRef?.id}`)
console.log(`[approveMembershipRequest] Archivage document PDF: ${documentRef?.id}`)
console.log(`[approveMembershipRequest] Création notification`)

// Succès
console.log(`[approveMembershipRequest] === Approbation réussie ===`)

// Erreur
console.error(`[approveMembershipRequest] === Erreur ===`)
console.error(`[approveMembershipRequest] Message: ${error.message}`)
console.error(`[approveMembershipRequest] Stack: ${error.stack}`)
```

---

## 🧪 Tests

### Structure des Tests

**Fichier** : `functions/src/membership-requests/__tests__/approveMembershipRequest.test.ts`

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { approveMembershipRequest } from '../approveMembershipRequest'

describe('approveMembershipRequest', () => {
  // Tests unitaires
  // Tests d'intégration
  // Tests de rollback
})
```

### Cas de Test

1. **Approbation réussie** : Toutes les opérations réussissent
2. **Demande non trouvée** : Erreur `not-found`
3. **Demande non payée** : Erreur `failed-precondition`
4. **Demande déjà approuvée** : Erreur `failed-precondition`
5. **Permissions insuffisantes** : Erreur `permission-denied`
6. **Paramètres invalides** : Erreur `invalid-argument`
7. **Erreur création Auth** : Rollback complet
8. **Erreur création users** : Rollback Auth
9. **Erreur création subscription** : Rollback Auth + users
10. **Génération email/mot de passe** : Vérifier le format

---

## 📝 Code Complet (Structure)

```typescript
import * as admin from 'firebase-admin'
import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore, Timestamp } from 'firebase-admin/firestore'
import { randomBytes } from 'crypto'

if (!admin.apps.length) {
  admin.initializeApp()
}

const db = getFirestore()
const auth = getAuth()

function generateSecurePassword(length: number = 12): string {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*'
  const randomValues = randomBytes(length)
  return Array.from(randomValues, byte => charset[byte % charset.length]).join('')
}

function membershipTypeToRole(membershipType: string): string {
  switch (membershipType) {
    case 'adherant': return 'Adherant'
    case 'bienfaiteur': return 'Bienfaiteur'
    case 'sympathisant': return 'Sympathisant'
    default: return 'Adherant'
  }
}

export const approveMembershipRequest = onCall(
  {
    region: 'europe-west1',
    memory: '512MiB',
    timeoutSeconds: 60,
    cors: true,
  },
  async (request) => {
    // 1. Validation des paramètres
    // 2. Validation des permissions
    // 3. Validation de la demande
    // 4. Génération email et mot de passe
    // 5. Opérations atomiques avec rollback
    // 6. Retour de la réponse
  }
)
```

---

## 🚀 Déploiement

### Export dans `functions/src/index.ts`

```typescript
import { approveMembershipRequest } from './membership-requests/approveMembershipRequest'

export { approveMembershipRequest }
```

### Commandes de Déploiement

```bash
# Déployer uniquement cette fonction
firebase deploy --only functions:approveMembershipRequest

# Déployer toutes les fonctions
firebase deploy --only functions
```

---

## 📚 Références

- **submitCorrections** : `functions/src/membership-requests/submitCorrections.ts` (structure de référence)
- **Firebase Functions v2** : https://firebase.google.com/docs/functions/v2
- **Callable Functions** : https://firebase.google.com/docs/functions/callable
- **Firebase Admin SDK** : https://firebase.google.com/docs/admin/setup
