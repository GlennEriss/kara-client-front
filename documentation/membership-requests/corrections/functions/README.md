# Cloud Functions - Fonctionnalité Corrections

## 📋 Vue d'ensemble

Ce dossier documente les **Cloud Functions Firebase** nécessaires pour la fonctionnalité de corrections. Seuls les cas qui nécessitent **OBLIGATOIREMENT** une exécution côté serveur sont documentés ici.

---

## 🔴 Cas OBLIGATOIRES nécessitant des Cloud Functions

### 1. **Vérification du Code de Sécurité** ⚠️ CRITIQUE

**Problème de sécurité actuel** :
- La vérification est faite côté client (`RegistrationRepository.verifySecurityCode()`)
- Un utilisateur malveillant pourrait bypasser la vérification en modifiant le code client
- La vérification n'est pas atomique et peut être contournée

**Solution : Cloud Function obligatoire**

```typescript
// functions/src/membership-requests/verifySecurityCode.ts
import * as admin from 'firebase-admin'
import { onCall } from 'firebase-functions/v2/https'

export const verifySecurityCode = onCall(
  {
    memory: '256MiB',
    timeoutSeconds: 10,
  },
  async (request) => {
    // Vérification de l'authentification (optionnel pour corrections publiques)
    // Mais on peut ajouter une vérification de rate limiting
    
    const { requestId, code } = request.data
    
    if (!requestId || !code) {
      throw new Error('requestId et code sont requis')
    }
    
    // Valider le format du code (6 chiffres)
    if (!/^\d{6}$/.test(code)) {
      return { isValid: false, reason: 'FORMAT_INVALID' }
    }
    
    const db = admin.firestore()
    const requestRef = db.collection('membership-requests').doc(requestId)
    
    // Transaction atomique pour vérifier et marquer comme utilisé
    return await db.runTransaction(async (transaction) => {
      const doc = await transaction.get(requestRef)
      
      if (!doc.exists) {
        return { isValid: false, reason: 'REQUEST_NOT_FOUND' }
      }
      
      const data = doc.data()!
      
      // Vérifier le code
      if (data.securityCode !== code) {
        return { isValid: false, reason: 'CODE_INCORRECT' }
      }
      
      // Vérifier si déjà utilisé
      if (data.securityCodeUsed === true) {
        return { isValid: false, reason: 'CODE_ALREADY_USED' }
      }
      
      // Vérifier l'expiration
      if (data.securityCodeExpiry) {
        const expiry = data.securityCodeExpiry.toDate()
        if (expiry < new Date()) {
          return { isValid: false, reason: 'CODE_EXPIRED' }
        }
      }
      
      // Vérifier le statut
      if (data.status !== 'under_review') {
        return { isValid: false, reason: 'INVALID_STATUS' }
      }
      
      // Code valide - marquer comme vérifié (mais pas encore utilisé)
      // L'utilisation se fera lors de la soumission des corrections
      transaction.update(requestRef, {
        securityCodeVerifiedAt: admin.firestore.FieldValue.serverTimestamp(),
      })
      
      return { 
        isValid: true,
        requestData: {
          reviewNote: data.reviewNote,
          // Retourner les données nécessaires pour pré-remplir le formulaire
        }
      }
    })
  }
)
```

**Pourquoi obligatoire** :
- ✅ Sécurité : Impossible de bypasser côté client
- ✅ Atomicité : Transaction garantit l'intégrité
- ✅ Rate limiting : Peut être ajouté côté serveur
- ✅ Audit : Logs côté serveur pour traçabilité

---

### 2. **Marquage du Code comme Utilisé lors de la Soumission** ⚠️ CRITIQUE

**Problème de sécurité actuel** :
- Le marquage est fait via un `updateDoc` côté client
- **Race condition** : Un utilisateur pourrait soumettre plusieurs fois avant que le code soit marqué comme utilisé
- Pas de transaction atomique garantissant l'unicité

**Solution : Cloud Function obligatoire**

```typescript
// functions/src/membership-requests/submitCorrections.ts
import * as admin from 'firebase-admin'
import { onCall } from 'firebase-functions/v2/https'

export const submitCorrections = onCall(
  {
    memory: '512MiB',
    timeoutSeconds: 30,
  },
  async (request) => {
    const { requestId, code, formData } = request.data
    
    if (!requestId || !code || !formData) {
      throw new Error('requestId, code et formData sont requis')
    }
    
    const db = admin.firestore()
    const requestRef = db.collection('membership-requests').doc(requestId)
    
    // Transaction atomique pour :
    // 1. Vérifier le code
    // 2. Marquer comme utilisé
    // 3. Mettre à jour les données
    // 4. Remettre le statut à 'pending'
    return await db.runTransaction(async (transaction) => {
      const doc = await transaction.get(requestRef)
      
      if (!doc.exists) {
        throw new Error('Demande introuvable')
      }
      
      const data = doc.data()!
      
      // Vérifications de sécurité
      if (data.status !== 'under_review') {
        throw new Error('La demande n\'est pas en cours de correction')
      }
      
      if (data.securityCode !== code) {
        throw new Error('Code de sécurité incorrect')
      }
      
      if (data.securityCodeUsed === true) {
        throw new Error('Code de sécurité déjà utilisé')
      }
      
      if (data.securityCodeExpiry) {
        const expiry = data.securityCodeExpiry.toDate()
        if (expiry < new Date()) {
          throw new Error('Code de sécurité expiré')
        }
      }
      
      // Mise à jour atomique
      transaction.update(requestRef, {
        status: 'pending',
        securityCodeUsed: true,
        securityCode: admin.firestore.FieldValue.delete(),
        securityCodeExpiry: admin.firestore.FieldValue.delete(),
        reviewNote: admin.firestore.FieldValue.delete(),
        // Mettre à jour les données du formulaire
        identity: formData.identity,
        address: formData.address,
        company: formData.company,
        documents: formData.documents,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      })
      
      return { success: true }
    })
  }
)
```

**Pourquoi obligatoire** :
- ✅ **Atomicité** : Transaction garantit que le code ne peut être utilisé qu'une seule fois
- ✅ **Race condition** : Évite les soumissions multiples simultanées
- ✅ **Sécurité** : Impossible de bypasser côté client
- ✅ **Intégrité** : Garantit que toutes les opérations réussissent ou échouent ensemble

---

### 3. **Nettoyage Automatique des Codes Expirés** 📅 RECOMMANDÉ

**Problème actuel** :
- Les codes expirés restent dans la base de données
- Pas de nettoyage automatique
- Peut causer des problèmes de performance et de sécurité

**Solution : Cloud Function planifiée (job)**

```typescript
// functions/src/scheduled/cleanExpiredSecurityCodes.ts
import * as admin from 'firebase-admin'
import { onSchedule } from 'firebase-functions/v2/scheduler'

export const cleanExpiredSecurityCodes = onSchedule(
  {
    schedule: '0 2 * * *', // Tous les jours à 2h00
    timeZone: 'Africa/Libreville',
    memory: '512MiB',
    timeoutSeconds: 540,
  },
  async (event) => {
    console.log('Démarrage du nettoyage des codes de sécurité expirés')
    
    const db = admin.firestore()
    const now = admin.firestore.Timestamp.now()
    
    // Récupérer toutes les demandes avec codes expirés
    const expiredQuery = db.collection('membership-requests')
      .where('status', '==', 'under_review')
      .where('securityCodeExpiry', '<', now)
      .where('securityCodeUsed', '==', false)
    
    const snapshot = await expiredQuery.get()
    
    console.log(`Nombre de codes expirés à nettoyer : ${snapshot.size}`)
    
    let cleanedCount = 0
    let errorCount = 0
    
    const batch = db.batch()
    let batchCount = 0
    
    for (const doc of snapshot.docs) {
      try {
        // Nettoyer les champs de correction expirés
        batch.update(doc.ref, {
          securityCode: admin.firestore.FieldValue.delete(),
          securityCodeExpiry: admin.firestore.FieldValue.delete(),
          reviewNote: admin.firestore.FieldValue.delete(),
          // Optionnel : remettre le statut à 'pending' si on veut
          // status: 'pending',
        })
        
        batchCount++
        
        // Firestore limite les batches à 500 opérations
        if (batchCount >= 500) {
          await batch.commit()
          cleanedCount += batchCount
          batchCount = 0
        }
      } catch (error) {
        errorCount++
        console.error(`Erreur lors du nettoyage de ${doc.id}:`, error)
      }
    }
    
    // Commiter le dernier batch
    if (batchCount > 0) {
      await batch.commit()
      cleanedCount += batchCount
    }
    
    console.log(`Nettoyage terminé : ${cleanedCount} codes nettoyés, ${errorCount} erreurs`)
  }
)
```

**Pourquoi recommandé** :
- ✅ **Performance** : Réduit la taille de la base de données
- ✅ **Sécurité** : Évite l'accumulation de codes expirés
- ✅ **Maintenance** : Automatise le nettoyage

---

## 🟡 Cas NON OBLIGATOIRES (peuvent rester côté client)

### 1. **Génération du Code de Sécurité**

**Pourquoi pas obligatoire** :
- ✅ Généré par un admin authentifié
- ✅ Les Firestore Rules vérifient que c'est un admin qui fait l'update
- ✅ Le code est aléatoire (1 000 000 de combinaisons possibles)
- ✅ Pas de risque de sécurité critique

**Recommandation** : Peut rester côté client, mais Cloud Function serait plus sécurisé pour :
- Garantir l'unicité du code (vérifier qu'il n'existe pas déjà)
- Ajouter de la traçabilité (logs serveur)

### 2. **Régénération du Code**

**Pourquoi pas obligatoire** :
- ✅ Seulement les admins peuvent régénérer (vérifié par Firestore Rules)
- ✅ Les Firestore Rules protègent l'opération

**Recommandation** : Peut rester côté client, mais Cloud Function serait plus sécurisé pour :
- Garantir l'invalidation atomique de l'ancien code
- Ajouter de la traçabilité

---

## 📊 Résumé des Cloud Functions Nécessaires

| Fonction | Type | Priorité | Obligatoire |
|----------|------|----------|-------------|
| `verifySecurityCode` | HTTP Callable | 🔴 P0 | ✅ **OUI** |
| `submitCorrections` | HTTP Callable | 🔴 P0 | ✅ **OUI** |
| `cleanExpiredSecurityCodes` | Scheduled | 🟡 P1 | ⚠️ **Recommandé** |

---

## 🔒 Sécurité

### Pourquoi les Cloud Functions sont obligatoires

1. **Vérification du code** :
   - ❌ Côté client : Peut être bypassé
   - ✅ Côté serveur : Impossible de bypasser

2. **Marquage comme utilisé** :
   - ❌ Côté client : Race condition possible
   - ✅ Côté serveur : Transaction atomique garantit l'unicité

3. **Atomicité** :
   - ❌ Côté client : Pas de garantie d'atomicité
   - ✅ Côté serveur : Transactions Firestore garantissent l'atomicité

---

## 📁 Structure des Fichiers

```
corrections/functions/
├── README.md                           # Ce fichier
├── verifySecurityCode.ts               # Vérification du code (OBLIGATOIRE)
├── submitCorrections.ts                # Soumission des corrections (OBLIGATOIRE)
└── cleanExpiredSecurityCodes.ts        # Nettoyage automatique (RECOMMANDÉ)
```

**Note** : Ces fonctions doivent être ajoutées dans `functions/src/` et exportées dans `functions/src/index.ts`

---

## 🚀 Implémentation

### Étape 1 : Créer les fonctions

1. Créer `functions/src/membership-requests/verifySecurityCode.ts`
2. Créer `functions/src/membership-requests/submitCorrections.ts`
3. Créer `functions/src/scheduled/cleanExpiredSecurityCodes.ts`

### Étape 2 : Exporter dans index.ts

```typescript
// functions/src/index.ts
export { verifySecurityCode } from './membership-requests/verifySecurityCode'
export { submitCorrections } from './membership-requests/submitCorrections'
export { cleanExpiredSecurityCodes } from './scheduled/cleanExpiredSecurityCodes'
```

### Étape 3 : Adapter le code client

- Remplacer `registrationService.verifySecurityCode()` par un appel à la Cloud Function
- Remplacer `registrationService.updateRegistration()` (pour corrections) par un appel à la Cloud Function

### Étape 4 : Déployer

```bash
cd functions
npm run build
firebase deploy --only functions:verifySecurityCode,functions:submitCorrections,functions:cleanExpiredSecurityCodes
```

---

## ⚠️ Impact sur le Code Client

### Avant (côté client)

```typescript
// ❌ Vérification côté client (peut être bypassé)
const isValid = await registrationService.verifySecurityCode(requestId, code)
```

### Après (Cloud Function)

```typescript
// ✅ Vérification côté serveur (sécurisé)
import { getFunctions, httpsCallable } from 'firebase/functions'

const functions = getFunctions()
const verifySecurityCode = httpsCallable(functions, 'verifySecurityCode')

const result = await verifySecurityCode({ requestId, code })
const isValid = result.data.isValid
```

---

## 📚 Références

- [Firebase Cloud Functions - Callable Functions](https://firebase.google.com/docs/functions/callable)
- [Firebase Cloud Functions - Scheduled Functions](https://firebase.google.com/docs/functions/schedule-functions)
- [Firestore Transactions](https://firebase.google.com/docs/firestore/manage-data/transactions)
