# Cloud Functions – Détection des doublons

Spécification de la Cloud Function `detectDuplicates` pour la détection automatique des doublons.

---

## 1. Fonction principale : `onMembershipRequestWrite`

### Déclencheur

```typescript
export const onMembershipRequestWrite = onDocumentWritten(
  'membership-requests/{requestId}',
  async (event) => { ... }
)
```

> **Garde anti-boucle** : si une mise à jour ne touche **que** `isDuplicate`, `duplicateGroupIds` et/ou les champs normalisés, **sortir immédiatement** (pas de recalcul) afin d'éviter les boucles de triggers. La détection doit être relancée uniquement si `identity.contacts`, `identity.email` ou `documents.identityDocumentNumber` changent.

### Comportement

| Événement | Action |
|-----------|--------|
| **Création** | Normaliser les champs, détecter les doublons, créer les groupes |
| **Mise à jour** | Recalculer les doublons si téléphone/email/pièce a changé |
| **Suppression** | Retirer le dossier des groupes, supprimer les groupes vides |

---

## 2. Algorithme de détection

### Étape 1 : Normalisation

```typescript
function normalizeEmail(email?: string): string | null {
  if (!email) return null
  return email.trim().toLowerCase()
}

function normalizeDocNumber(docNumber?: string): string | null {
  if (!docNumber) return null
  return docNumber.trim().toUpperCase().replace(/\s+/g, '')
}

function normalizePhone(phone?: string): string | null {
  if (!phone) return null
  // Retirer espaces, tirets, garder uniquement les chiffres et le +
  return phone.replace(/[\s\-\(\)]/g, '')
}
```

### Étape 2 : Requêtes de détection

```typescript
async function findDuplicates(
  requestId: string,
  contacts: string[],
  normalizedEmail: string | null,
  normalizedDocNumber: string | null
): Promise<DuplicateMatches> {
  const db = getFirestore()
  const collection = db.collection('membership-requests')
  
  const matches: DuplicateMatches = {
    byPhone: new Map<string, string[]>(),
    byEmail: [],
    byIdentityDoc: []
  }
  
  // Détection par téléphone (pour chaque numéro)
  for (const phone of contacts) {
    const normalized = normalizePhone(phone)
    if (!normalized) continue
    
    const snapshot = await collection
      .where('identity.contacts', 'array-contains', normalized)
      .get()
    
    const otherIds = snapshot.docs
      .map(doc => doc.id)
      .filter(id => id !== requestId)
    
    if (otherIds.length > 0) {
      matches.byPhone.set(normalized, otherIds)
    }
  }
  
  // Détection par email
  if (normalizedEmail) {
    const snapshot = await collection
      .where('normalizedEmail', '==', normalizedEmail)
      .get()
    
    matches.byEmail = snapshot.docs
      .map(doc => doc.id)
      .filter(id => id !== requestId)
  }
  
  // Détection par numéro de pièce
  if (normalizedDocNumber) {
    const snapshot = await collection
      .where('normalizedIdentityDocNumber', '==', normalizedDocNumber)
      .get()
    
    matches.byIdentityDoc = snapshot.docs
      .map(doc => doc.id)
      .filter(id => id !== requestId)
  }
  
  return matches
}
```

### Étape 3 : Gestion des groupes

```typescript
async function updateDuplicateGroups(
  requestId: string,
  matches: DuplicateMatches,
  normalizedEmail: string | null,
  normalizedDocNumber: string | null
): Promise<string[]> {
  const db = getFirestore()
  const groupsCollection = db.collection('duplicate-groups')
  const groupIds: string[] = []
  
  // Groupes par téléphone (la valeur est la clé du Map)
  for (const [phone, otherIds] of matches.byPhone) {
    const groupId = await upsertGroup(groupsCollection, {
      type: 'phone',
      value: phone,
      requestIds: [requestId, ...otherIds]
    })
    groupIds.push(groupId)
  }
  
  // Groupe par email
  if (normalizedEmail && matches.byEmail.length > 0) {
    const groupId = await upsertGroup(groupsCollection, {
      type: 'email',
      value: normalizedEmail,
      requestIds: [requestId, ...matches.byEmail]
    })
    groupIds.push(groupId)
  }
  
  // Groupe par pièce d'identité
  if (normalizedDocNumber && matches.byIdentityDoc.length > 0) {
    const groupId = await upsertGroup(groupsCollection, {
      type: 'identityDocument',
      value: normalizedDocNumber,
      requestIds: [requestId, ...matches.byIdentityDoc]
    })
    groupIds.push(groupId)
  }
  
  return groupIds
}

async function upsertGroup(
  collection: CollectionReference,
  data: { type: string; value: string; requestIds: string[] }
): Promise<string> {
  // Recommandé : utiliser une transaction pour éviter les conflits concurrents
  // et recalculer requestCount à partir de requestIds.length.
  const existing = await collection
    .where('type', '==', data.type)
    .where('value', '==', data.value)
    .limit(1)
    .get()

  if (!existing.empty) {
    const doc = existing.docs[0]
    const currentIds = doc.data().requestIds || []
    const mergedIds = [...new Set([...currentIds, ...data.requestIds])]

    await doc.ref.update({
      requestIds: mergedIds,
      requestCount: mergedIds.length,
      updatedAt: FieldValue.serverTimestamp()
    })

    return doc.id
  }

  const newDoc = await collection.add({
    type: data.type,
    value: data.value,
    requestIds: data.requestIds,
    requestCount: data.requestIds.length,
    detectedAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    resolvedAt: null,
    resolvedBy: null
  })

  return newDoc.id
}
```

### Étape 4 : Marquage des dossiers

```typescript
async function markRequestsAsDuplicates(
  requestIds: string[],
  groupId: string
): Promise<void> {
  const db = getFirestore()
  const batch = db.batch()
  
  for (const requestId of requestIds) {
    const ref = db.collection('membership-requests').doc(requestId)
    batch.update(ref, {
      isDuplicate: true,
      duplicateGroupIds: FieldValue.arrayUnion(groupId)
    })
  }
  
  await batch.commit()
}
```

---

## 3. Gestion de la suppression / modification

```typescript
async function cleanupOldGroups(
  requestId: string,
  oldGroupIds: string[]
): Promise<void> {
  const db = getFirestore()
  const groupsCollection = db.collection('duplicate-groups')
  
  for (const groupId of oldGroupIds) {
    const groupRef = groupsCollection.doc(groupId)
    const groupDoc = await groupRef.get()
    
    if (!groupDoc.exists) continue
    
    const data = groupDoc.data()
    const newRequestIds = (data.requestIds || []).filter(id => id !== requestId)
    
    if (newRequestIds.length <= 1) {
      // Supprimer le groupe (0 ou 1 membre restant)
      await groupRef.delete()
      
      // Si 1 membre restant, retirer isDuplicate de ce dossier
      if (newRequestIds.length === 1) {
        await db.collection('membership-requests').doc(newRequestIds[0]).update({
          isDuplicate: false,
          duplicateGroupIds: FieldValue.arrayRemove(groupId)
        })
      }
    } else {
      // Mettre à jour le groupe
      await groupRef.update({
        requestIds: newRequestIds,
        requestCount: newRequestIds.length,
        updatedAt: FieldValue.serverTimestamp()
      })
    }
  }
}
```

---

## 4. Résolution d'un groupe (post-traitement)

Lorsque l'admin marque un groupe comme résolu (`resolvedAt`, `resolvedBy`), il faut :

- Retirer `groupId` des `duplicateGroupIds` des demandes concernées.
- Recalculer `isDuplicate` : `true` uniquement si la demande appartient encore à un autre groupe **non résolu**.

Ce nettoyage peut être déclenché par une Cloud Function dédiée (`onDuplicateGroupResolved`) sur la collection `duplicate-groups`.

---

## 5. Script de migration initiale

Pour les données existantes, exécuter une fonction callable ou un script :

```typescript
export const migrateExistingDuplicates = onCall(async (request) => {
  // Vérifier que l'appelant est admin
  if (!request.auth || !isAdmin(request.auth.uid)) {
    throw new HttpsError('permission-denied', 'Admin only')
  }
  
  const db = getFirestore()
  const snapshot = await db.collection('membership-requests').get()
  
  let processed = 0
  let duplicatesFound = 0
  
  for (const doc of snapshot.docs) {
    const data = doc.data()
    
    // Normaliser les champs
    const normalizedEmail = normalizeEmail(data.identity?.email)
    const normalizedDocNumber = normalizeDocNumber(data.documents?.identityDocumentNumber)
    const normalizedContacts = (data.identity?.contacts || []).map(normalizePhone).filter(Boolean)
    
    await doc.ref.update({
      normalizedEmail,
      normalizedIdentityDocNumber: normalizedDocNumber,
      // Décision : stocker les contacts au format normalisé (canonique).
      'identity.contacts': normalizedContacts
    })
    
    // Détecter les doublons
    const matches = await findDuplicates(doc.id, normalizedContacts, normalizedEmail, normalizedDocNumber)
    const hasMatches = matches.byPhone.size > 0 || matches.byEmail.length > 0 || matches.byIdentityDoc.length > 0
    
    if (hasMatches) {
      const groupIds = await updateDuplicateGroups(
        doc.id,
        matches,
        normalizedEmail,
        normalizedDocNumber
      )
      await doc.ref.update({
        isDuplicate: true,
        duplicateGroupIds: groupIds
      })
      duplicatesFound++
    }
    
    processed++
  }
  
  return { processed, duplicatesFound }
})
```

---

## 6. Fichiers à créer

| Fichier | Description |
|---------|-------------|
| `functions/src/membership-requests/detectDuplicates.ts` | Cloud Function principale (onMembershipRequestWrite) |
| `functions/src/membership-requests/onDuplicateGroupResolved.ts` | Cloud Function résolution (trigger sur update duplicate-groups) |
| `functions/src/membership-requests/duplicates/normalize.ts` | Fonctions de normalisation |
| `functions/src/membership-requests/duplicates/detection.ts` | Logique de détection |
| `functions/src/membership-requests/duplicates/groups.ts` | Gestion des groupes |
| `functions/src/membership-requests/migrateExistingDuplicates.ts` | Script de migration (callable) |

---

## 7. Tests

- **Unitaires** : normalisation, détection avec mocks Firestore.
- **Intégration** : création d'une demande → vérification du groupe créé → suppression → vérification du nettoyage.
- **Edge cases** : valeurs vides, mise à jour sans changement de champs de détection, plusieurs doublons en cascade.
