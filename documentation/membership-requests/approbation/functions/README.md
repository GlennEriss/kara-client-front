# Cloud Functions - Approbation d'une Demande d'Adhésion

> Documentation des Cloud Functions nécessaires pour l'approbation d'une demande d'adhésion

---

## 📋 Vue d'ensemble

**Question** : Faut-il créer des Cloud Functions pour l'approbation ?

**Réponse** : **OUI**, une Cloud Function callable est recommandée pour garantir l'atomicité et la sécurité des opérations.

---

## 🎯 Pourquoi une Cloud Function ?

### Avantages d'une Cloud Function Callable

1. **Atomicité** :
   - Toutes les opérations (création Auth, users, subscription, update status) dans une seule transaction
   - Rollback automatique en cas d'erreur
   - Pas de risque de données incohérentes

2. **Sécurité** :
   - Privilèges admin Firebase directement disponibles
   - Pas besoin de gérer les tokens admin côté client
   - Validation côté serveur garantie

3. **Cohérence** :
   - Même pattern que `submitCorrections` (déjà implémenté)
   - Architecture uniforme pour les opérations critiques

4. **Isolation** :
   - Logique métier isolée du code client
   - Facilite les tests et la maintenance

### Inconvénients d'une API Route

1. **Atomicité limitée** :
   - Firestore batch a des limites (500 opérations, mais pas de transactions cross-collection)
   - Pas de rollback automatique si Firebase Auth échoue après Firestore

2. **Sécurité** :
   - Nécessite de gérer les tokens admin côté serveur
   - Risque d'exposition des credentials

3. **Complexité** :
   - Gestion manuelle du rollback
   - Plus de code à maintenir

---

## 🔧 Cloud Functions à Créer

### 1. `approveMembershipRequest` (Callable)

**Type** : Callable Function (HTTPS)

**Objectif** : Approuver une demande d'adhésion de manière atomique

**Opérations** :
1. Validation de la demande (paiement, statut)
2. Génération email et mot de passe
3. Création utilisateur Firebase Auth
4. Création document `users`
5. Création abonnement `subscriptions`
6. Mise à jour statut `membership-requests`
7. Archivage document PDF (si fourni)
8. Création notification

**Rollback** : Si une étape échoue, annuler toutes les opérations précédentes

**Fichier** : `functions/src/membership-requests/approveMembershipRequest.ts`

---

## 📊 Structure de la Cloud Function

### Signature

```typescript
export const approveMembershipRequest = onCall(
  {
    region: 'europe-west1',
    memory: '512MiB',
    timeoutSeconds: 60,
  },
  async (request) => {
    // Validation
    // Opérations atomiques
    // Rollback en cas d'erreur
  }
)
```

### Paramètres d'Entrée

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

### Réponse

```typescript
interface ApproveMembershipRequestOutput {
  success: true
  matricule: string
  email: string
  password: string  // Retourné UNIQUEMENT dans la réponse (HTTPS)
  subscriptionId: string
  companyId?: string
  professionId?: string
}
```

---

## 🔄 Flux d'Exécution

### 1. Validation

```typescript
// Vérifier que la demande existe
const membershipRequest = await db.collection('membership-requests').doc(requestId).get()

if (!membershipRequest.exists) {
  throw new HttpsError('not-found', 'Demande non trouvée')
}

// Vérifier que la demande est payée
if (!membershipRequest.data()?.isPaid) {
  throw new HttpsError('failed-precondition', 'La demande doit être payée')
}

// Vérifier que la demande a le statut 'pending'
if (membershipRequest.data()?.status !== 'pending') {
  throw new HttpsError('failed-precondition', 'La demande doit être en attente')
}

// Vérifier les permissions admin
if (!request.auth || !request.auth.token.role || !['Admin', 'SuperAdmin', 'Secretary'].includes(request.auth.token.role)) {
  throw new HttpsError('permission-denied', 'Permissions insuffisantes')
}
```

### 2. Génération Email et Mot de Passe

```typescript
// Générer email
const firstName = membershipRequest.data().identity.firstName.toLowerCase().replace(/[^a-z]/g, '')
const lastName = membershipRequest.data().identity.lastName.toLowerCase().replace(/[^a-z]/g, '')
const matriculeDigits = matricule.replace(/\D/g, '').slice(0, 4)
const generatedEmail = `${firstName}${lastName}${matriculeDigits}@kara.ga`

// Générer mot de passe sécurisé
const temporaryPassword = generateSecurePassword(12)  // 12+ caractères, aléatoire
```

### 3. Opérations Atomiques avec Rollback

```typescript
const rollbackActions: Array<() => Promise<void>> = []

try {
  // 1. Créer utilisateur Firebase Auth
  const userRecord = await adminAuth.createUser({
    uid: matricule,
    email: generatedEmail,
    password: temporaryPassword,
    disabled: false
  })
  rollbackActions.push(() => adminAuth.deleteUser(userRecord.uid))

  // 2. Créer document users
  await db.collection('users').doc(matricule).set(userData)
  rollbackActions.push(() => db.collection('users').doc(matricule).delete())

  // 3. Créer abonnement
  const subscriptionRef = await db.collection('subscriptions').add(subscriptionData)
  rollbackActions.push(() => subscriptionRef.delete())

  // 4. Mettre à jour statut avec traçabilité
  await db.collection('membership-requests').doc(requestId).update({
    status: 'approved',
    approvedBy: adminId,  // ID de l'admin qui a approuvé (obligatoire)
    approvedAt: admin.firestore.FieldValue.serverTimestamp(),  // Date d'approbation (obligatoire)
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  })

  // 5. Archivage document PDF (si fourni)
  if (adhesionPdfURL) {
    await db.collection('documents').add({
      type: 'ADHESION',
      format: 'pdf',
      libelle: `Fiche d'adhésion - ${matricule}`,
      memberId: matricule,
      url: adhesionPdfURL,
      // ...
    })
  }

  // 6. Créer notification
  await createApprovalNotification(requestId, matricule, memberName, generatedEmail, adminId)

  // Succès : retourner les identifiants
  return {
    success: true,
    matricule,
    email: generatedEmail,
    password: temporaryPassword,
    subscriptionId: subscriptionRef.id,
    companyId,
    professionId,
  }

} catch (error) {
  // Rollback : exécuter toutes les actions de rollback en ordre inverse
  console.error('Erreur lors de l\'approbation, rollback en cours...', error)
  
  for (const rollbackAction of rollbackActions.reverse()) {
    try {
      await rollbackAction()
    } catch (rollbackError) {
      console.error('Erreur lors du rollback:', rollbackError)
      // Logger pour intervention manuelle
    }
  }

  throw new HttpsError('internal', 'Erreur lors de l\'approbation', error)
}
```

---

## 🔄 Comparaison avec API Route

### Option 1 : Cloud Function Callable (Recommandée)

**Avantages** :
- ✅ Atomicité garantie avec rollback
- ✅ Privilèges admin natifs
- ✅ Cohérence avec `submitCorrections`
- ✅ Isolation de la logique métier

**Inconvénients** :
- ⚠️ Légèrement plus complexe à déployer
- ⚠️ Nécessite Firebase Functions config

### Option 2 : API Route Next.js

**Avantages** :
- ✅ Plus simple à développer (dans le même repo)
- ✅ Pas besoin de déployer séparément

**Inconvénients** :
- ❌ Atomicité limitée (pas de transaction cross-collection)
- ❌ Rollback manuel plus complexe
- ❌ Gestion des tokens admin nécessaire

---

## 📝 Implémentation Recommandée

### Structure des Fichiers

```
functions/src/membership-requests/
├── approveMembershipRequest.ts  # Cloud Function callable
├── submitCorrections.ts         # Existant
├── verifySecurityCode.ts        # Existant
├── renewSecurityCode.ts         # Existant
└── syncToAlgolia.ts             # Existant
```

### Exports dans `functions/src/index.ts`

```typescript
import { approveMembershipRequest } from './membership-requests/approveMembershipRequest'

export { approveMembershipRequest }
```

---

## 🔒 Sécurité

### Validation des Permissions

```typescript
// Vérifier que l'utilisateur est authentifié
if (!request.auth) {
  throw new HttpsError('unauthenticated', 'Utilisateur non authentifié')
}

// Vérifier que l'utilisateur est admin
const userRole = request.auth.token.role
if (!userRole || !['Admin', 'SuperAdmin', 'Secretary'].includes(userRole)) {
  throw new HttpsError('permission-denied', 'Permissions insuffisantes')
}
```

### Validation des Données

```typescript
// Valider les paramètres d'entrée
if (!requestId || !adminId || !membershipType) {
  throw new HttpsError('invalid-argument', 'Paramètres manquants')
}

if (!['adherant', 'bienfaiteur', 'sympathisant'].includes(membershipType)) {
  throw new HttpsError('invalid-argument', 'Type de membre invalide')
}
```

### Gestion du Mot de Passe

```typescript
// Le mot de passe est retourné UNIQUEMENT dans la réponse HTTPS
// Il n'est JAMAIS stocké en Firestore
// Firebase Auth gère le stockage sécurisé
```

---

## 🧪 Tests

### Tests Unitaires

**Fichier** : `functions/src/membership-requests/__tests__/approveMembershipRequest.test.ts`

**Cas à tester** :
1. Approbation réussie
2. Demande non trouvée
3. Demande non payée
4. Demande déjà approuvée
5. Permissions insuffisantes
6. Rollback en cas d'erreur
7. Génération email/mot de passe

### Tests d'Intégration

**Cas à tester** :
1. Flux complet d'approbation
2. Vérification création utilisateur Auth
3. Vérification création document users
4. Vérification création abonnement
5. Vérification notification

---

## 📊 Monitoring et Logging

### Logs à Inclure

```typescript
console.log(`[approveMembershipRequest] Début approbation: ${requestId}`)
console.log(`[approveMembershipRequest] Admin: ${adminId}`)
console.log(`[approveMembershipRequest] Matricule: ${matricule}`)
console.log(`[approveMembershipRequest] Email généré: ${generatedEmail}`)
console.log(`[approveMembershipRequest] Approbation réussie`)
console.error(`[approveMembershipRequest] Erreur:`, error)
console.log(`[approveMembershipRequest] Rollback effectué`)
```

### Métriques à Surveiller

- Nombre d'approbations par jour
- Taux d'erreur
- Temps d'exécution moyen
- Nombre de rollbacks

---

## 🎯 Recommandation Finale

**Utiliser une Cloud Function Callable** pour :

1. **Garantir l'atomicité** : Toutes les opérations dans une seule transaction avec rollback
2. **Sécurité** : Privilèges admin natifs, pas d'exposition de credentials
3. **Cohérence** : Même pattern que `submitCorrections`
4. **Maintenabilité** : Logique métier isolée, facile à tester

**Ne PAS utiliser d'API Route** car :
- Atomicité limitée (pas de transaction cross-collection)
- Rollback manuel complexe
- Risque de données incohérentes

---

## 📚 Références

- **submitCorrections** : `functions/src/membership-requests/submitCorrections.ts` (référence pour la structure)
- **Firebase Functions v2** : https://firebase.google.com/docs/functions/v2
- **Callable Functions** : https://firebase.google.com/docs/functions/callable
- **Firebase Admin SDK** : https://firebase.google.com/docs/admin/setup
