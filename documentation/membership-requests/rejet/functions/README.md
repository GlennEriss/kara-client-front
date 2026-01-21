# Cloud Functions - Fonctionnalité Rejet

> Documentation des Cloud Functions nécessaires pour le rejet d'une demande d'adhésion et les actions post-rejet

---

## 📋 Vue d'ensemble

**Question** : Faut-il créer des Cloud Functions pour le rejet et les actions post-rejet ?

**Réponse** : **OUI**, certaines opérations nécessitent des Cloud Functions pour garantir la sécurité, l'atomicité et les meilleures pratiques.

---

## 🔴 Cas OBLIGATOIRES nécessitant des Cloud Functions

### 1. **Notification de Rejet au Demandeur** ⚠️ OPTIONNEL / NON PRIORITAIRE

**⚠️ NOTE IMPORTANTE** : Cette fonctionnalité est **optionnelle** et **non prioritaire** pour le moment. Elle peut être implémentée dans une phase ultérieure.

**Objectif** :
- Envoyer automatiquement une notification (email/SMS) au demandeur lors du rejet
- L'envoi d'email/SMS doit être fait côté serveur pour des raisons de sécurité

**Solution : Cloud Function trigger (optionnel)**

Déclenchée automatiquement lors de la mise à jour du statut à `'rejected'` :

```typescript
// functions/src/membership-requests/onMembershipRequestRejected.ts
import * as admin from 'firebase-admin'
import { onDocumentUpdated } from 'firebase-functions/v2/firestore'

export const onMembershipRequestRejected = onDocumentUpdated(
  {
    document: 'membership-requests/{requestId}',
    region: 'europe-west1',
    memory: '256MiB',
    timeoutSeconds: 30,
  },
  async (event) => {
    const beforeData = event.data.before.data()
    const afterData = event.data.after.data()
    
    // Vérifier que le statut a changé pour 'rejected'
    if (beforeData.status !== 'rejected' && afterData.status === 'rejected') {
      const requestId = event.params.requestId
      const request = afterData
      
      // Envoyer notification email/SMS au demandeur
      await sendRejectionNotification(request, request.motifReject)
    }
  }
)
```

**Option B : Cloud Function Callable**

Appelée explicitement depuis le client après le rejet :

```typescript
// functions/src/membership-requests/notifyRejection.ts
import * as admin from 'firebase-admin'
import { onCall } from 'firebase-functions/v2/https'

export const notifyRejection = onCall(
  {
    region: 'europe-west1',
    memory: '256MiB',
    timeoutSeconds: 30,
  },
  async (request) => {
    const { requestId } = request.data
    
    // Récupérer la demande
    const membershipRequestDoc = await admin.firestore()
      .collection('membership-requests')
      .doc(requestId)
      .get()
    
    if (!membershipRequestDoc.exists) {
      throw new HttpsError('not-found', 'Demande non trouvée')
    }
    
    const membershipRequest = membershipRequestDoc.data()!
    
    if (membershipRequest.status !== 'rejected') {
      throw new HttpsError('failed-precondition', 'La demande n\'est pas rejetée')
    }
    
    // Envoyer notification email/SMS
    await sendRejectionNotification(membershipRequest, membershipRequest.motifReject)
    
    return { success: true }
  }
)
```

**Pourquoi optionnel** :
- ✅ **Sécurité** : Pas d'exposition des clés API email/SMS côté client
- ✅ **Fiabilité** : Gestion d'erreur robuste côté serveur
- ✅ **Découplage** : Notification ne bloque pas l'action principale
- ✅ **Retry** : Possibilité de réessayer en cas d'échec

**Recommandation** : **Implémentation dans une phase ultérieure** - Pour l'instant, créer une version minimale (placeholder) avec logging uniquement

**Implémentation Progressive** :
- **Phase 1 (Actuelle)** : Version minimale avec logging uniquement
- **Phase 2 (Futur)** : Implémentation complète avec notifications email/SMS

---

### 2. **Suppression Définitive du Dossier** ⚠️ RECOMMANDÉ

**Problème actuel** :
- Suppression Firestore peut se faire côté client (via Firestore Rules)
- Suppression Storage nécessite des privilèges admin (impossible côté client)
- Pas de garantie d'atomicité entre Firestore et Storage
- Pas de logging d'audit côté serveur

**Solution : Cloud Function callable obligatoire**

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
  },
  async (request) => {
    // Validation des permissions
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Utilisateur non authentifié')
    }
    
    const userRole = request.auth.token.role
    if (!userRole || !['Admin', 'SuperAdmin', 'Secretary'].includes(userRole)) {
      throw new HttpsError('permission-denied', 'Permissions insuffisantes')
    }
    
    const { requestId, confirmedMatricule } = request.data
    
    if (!requestId || !confirmedMatricule) {
      throw new HttpsError('invalid-argument', 'requestId et confirmedMatricule sont requis')
    }
    
    const db = admin.firestore()
    const storage = getStorage()
    
    // Récupérer la demande
    const membershipRequestRef = db.collection('membership-requests').doc(requestId)
    const membershipRequestDoc = await membershipRequestRef.get()
    
    if (!membershipRequestDoc.exists) {
      throw new HttpsError('not-found', 'Demande non trouvée')
    }
    
    const membershipRequest = membershipRequestDoc.data()!
    
    // Vérifier que le statut est 'rejected'
    if (membershipRequest.status !== 'rejected') {
      throw new HttpsError('failed-precondition', 'Seules les demandes rejetées peuvent être supprimées')
    }
    
    // Vérifier le matricule
    if (confirmedMatricule !== membershipRequest.matricule) {
      throw new HttpsError('permission-denied', 'Le matricule confirmé ne correspond pas au matricule du dossier')
    }
    
    // Logging d'audit AVANT suppression
    console.log(`[deleteMembershipRequest] Suppression demandée par ${request.auth.uid}`)
    console.log(`[deleteMembershipRequest] RequestId: ${requestId}`)
    console.log(`[deleteMembershipRequest] Matricule: ${membershipRequest.matricule}`)
    console.log(`[deleteMembershipRequest] Nom: ${membershipRequest.identity.firstName} ${membershipRequest.identity.lastName}`)
    
    // Créer un document d'audit AVANT suppression (optionnel)
    await db.collection('audit-logs').add({
      action: 'membership_request_deleted',
      requestId,
      matricule: membershipRequest.matricule,
      memberName: `${membershipRequest.identity.firstName} ${membershipRequest.identity.lastName}`,
      deletedBy: request.auth.uid,
      deletedAt: admin.firestore.FieldValue.serverTimestamp(),
      reason: 'Suppression définitive d\'une demande rejetée',
      // Optionnel : sauvegarder les données principales pour historique
      metadata: {
        status: membershipRequest.status,
        motifReject: membershipRequest.motifReject,
        processedAt: membershipRequest.processedAt,
        processedBy: membershipRequest.processedBy,
      }
    })
    
    // Supprimer les documents Storage (si existent)
    const filesToDelete: string[] = []
    
    // Photo
    if (membershipRequest.identity?.photo) {
      filesToDelete.push(membershipRequest.identity.photo)
    }
    
    // Pièces d'identité
    if (membershipRequest.documents?.documentPhotoFront) {
      filesToDelete.push(membershipRequest.documents.documentPhotoFront)
    }
    
    if (membershipRequest.documents?.documentPhotoBack) {
      filesToDelete.push(membershipRequest.documents.documentPhotoBack)
    }
    
    // Supprimer les fichiers Storage
    for (const filePath of filesToDelete) {
      try {
        const file = storage.bucket().file(filePath)
        const [exists] = await file.exists()
        if (exists) {
          await file.delete()
          console.log(`[deleteMembershipRequest] Fichier Storage supprimé: ${filePath}`)
        }
      } catch (error) {
        console.error(`[deleteMembershipRequest] Erreur lors de la suppression de ${filePath}:`, error)
        // Ne pas faire échouer la suppression si un fichier ne peut pas être supprimé
        // Logger pour intervention manuelle
      }
    }
    
    // Supprimer le document Firestore
    await membershipRequestRef.delete()
    
    console.log(`[deleteMembershipRequest] Demande supprimée avec succès: ${requestId}`)
    
    return {
      success: true,
      requestId,
      filesDeleted: filesToDelete.length
    }
  }
)
```

**Pourquoi obligatoire** :
- ✅ **Sécurité** : Privilèges admin requis pour Storage
- ✅ **Atomicité** : Gestion cohérente de Firestore + Storage
- ✅ **Audit** : Logging d'audit côté serveur
- ✅ **Fiabilité** : Gestion d'erreur robuste

---

## 🟡 Cas RECOMMANDÉS (peuvent rester côté client)

### 1. **Réouverture du Dossier**

**Pourquoi pas obligatoire** :
- ✅ Mise à jour Firestore simple (vérifiée par Firestore Rules)
- ✅ Pas besoin de privilèges admin spéciaux
- ✅ Opération atomique native Firestore

**Recommandation** : Peut rester côté client, mais Cloud Function serait plus sécurisée pour :
- Validation stricte côté serveur
- Logging d'audit
- Notification automatique (si nécessaire)

**Si Cloud Function** :

```typescript
// functions/src/membership-requests/reopenMembershipRequest.ts
export const reopenMembershipRequest = onCall(
  {
    region: 'europe-west1',
    memory: '256MiB',
    timeoutSeconds: 30,
  },
  async (request) => {
    // Validation des permissions
    // Validation du statut (doit être 'rejected')
    // Validation du motif (10-500 caractères)
    // Mise à jour avec traçabilité
    // Optionnel : Notification
  }
)
```

### 2. **Notification de Réouverture**

**Pourquoi pas obligatoire** :
- ✅ Moins critique que la notification de rejet
- ✅ Peut être faite côté client via NotificationService

**Recommandation** : Peut rester côté client, mais Cloud Function serait plus sécurisée pour l'envoi d'email/SMS

---

## 📊 Résumé des Cloud Functions Nécessaires

| Fonction | Type | Priorité | Obligatoire | Justification |
|----------|------|----------|-------------|---------------|
| `onMembershipRequestRejected` | Firestore Trigger | 🟢 P2 | ❌ **Optionnel** | Notification automatique au demandeur (email/SMS) - Non prioritaire |
| `deleteMembershipRequest` | HTTP Callable | 🔴 P0 | ✅ **OUI** | Suppression Storage nécessite privilèges admin |
| `reopenMembershipRequest` | HTTP Callable | 🟡 P2 | ❌ **Non** | Peut rester côté client, mais recommandé pour audit |

---

## 🔒 Sécurité

### Pourquoi les Cloud Functions sont nécessaires

1. **Notification de rejet** :
   - ❌ Côté client : Exposition des clés API email/SMS
   - ✅ Côté serveur : Sécurité garantie, pas d'exposition

2. **Suppression définitive** :
   - ❌ Côté client : Impossible de supprimer Storage (privilèges admin requis)
   - ✅ Côté serveur : Privilèges admin natifs, nettoyage complet

3. **Audit et Logging** :
   - ❌ Côté client : Logs peuvent être manipulés
   - ✅ Côté serveur : Logs fiables, traçabilité garantie

---

## 📁 Structure des Fichiers

```
functions/src/membership-requests/
├── approveMembershipRequest.ts      # Existant (approbation)
├── submitCorrections.ts              # Existant (corrections)
├── verifySecurityCode.ts             # Existant (corrections)
├── renewSecurityCode.ts              # Existant (corrections)
├── syncToAlgolia.ts                  # Existant (recherche)
├── onMembershipRequestRejected.ts   # ⭐ À créer (notification rejet)
├── deleteMembershipRequest.ts        # ⭐ À créer (suppression)
└── reopenMembershipRequest.ts        # ⭐ À créer (réouverture - optionnel)
```

---

## 🚀 Implémentation

### Étape 1 : Créer les fonctions

1. ✅ Créer `functions/src/membership-requests/deleteMembershipRequest.ts` (obligatoire)
2. ⏳ Créer `functions/src/membership-requests/onMembershipRequestRejected.ts` (optionnel - version minimale avec logging uniquement)
3. (Optionnel) Créer `functions/src/membership-requests/reopenMembershipRequest.ts`

### Étape 2 : Exporter dans index.ts

```typescript
// functions/src/index.ts
export { deleteMembershipRequest } from './membership-requests/deleteMembershipRequest'
// Optionnel - Phase ultérieure :
// export { onMembershipRequestRejected } from './membership-requests/onMembershipRequestRejected'
// export { reopenMembershipRequest } from './membership-requests/reopenMembershipRequest'
```

### Étape 3 : Adapter le code client

**Pour la suppression** :
```typescript
// Avant (côté client - ne fonctionne pas pour Storage)
await repository.delete(requestId)

// Après (Cloud Function)
import { getFunctions, httpsCallable } from 'firebase/functions'

const functions = getFunctions()
const deleteMembershipRequest = httpsCallable(functions, 'deleteMembershipRequest')

await deleteMembershipRequest({ 
  requestId, 
  confirmedMatricule 
})
```

**Pour la notification** :
- Option A (Trigger) : Aucune modification côté client nécessaire (automatique)
- Option B (Callable) : Appeler après le rejet côté client

### Étape 4 : Déployer

```bash
cd functions
npm run build
firebase deploy --only functions:onMembershipRequestRejected,functions:deleteMembershipRequest,functions:reopenMembershipRequest
```

---

## 🧪 Tests

### Tests Unitaires

**Fichier** : `functions/src/membership-requests/__tests__/deleteMembershipRequest.test.ts`

**Cas à tester** :
1. Suppression réussie
2. Demande non trouvée
3. Demande non rejetée
4. Matricule incorrect
5. Permissions insuffisantes
6. Suppression des fichiers Storage

### Tests d'Intégration

**Cas à tester** :
1. Flux complet de suppression
2. Vérification suppression Firestore
3. Vérification suppression Storage
4. Vérification création log d'audit

---

## 📚 Références

- **Firebase Functions v2** : https://firebase.google.com/docs/functions/v2
- **Callable Functions** : https://firebase.google.com/docs/functions/callable
- **Firestore Triggers** : https://firebase.google.com/docs/functions/firestore-events
- **Firebase Admin SDK** : https://firebase.google.com/docs/admin/setup
- **Firebase Storage Admin** : https://firebase.google.com/docs/storage/admin/start
