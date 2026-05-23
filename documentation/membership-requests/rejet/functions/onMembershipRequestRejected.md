# Cloud Function : onMembershipRequestRejected

> Cloud Function Trigger qui envoie automatiquement une notification au demandeur lors du rejet d'une demande d'adhésion

---

## 📋 Vue d'ensemble

**Type** : Firestore Trigger (Document Updated)

**Objectif** : Envoyer automatiquement une notification (email/SMS) au demandeur lorsqu'une demande d'adhésion est rejetée

**Déclencheur** : Mise à jour d'un document dans `membership-requests/{requestId}` avec `status = 'rejected'`

**⚠️ PRIORITÉ** : **Optionnel / Non prioritaire** - Les notifications email/SMS au demandeur peuvent être implémentées dans une phase ultérieure

---

## 🔧 Configuration

### Signature

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
    maxInstances: 10,
  },
  async (event) => {
    // Logique de notification
  }
)
```

### Paramètres de Configuration

- **document** : `'membership-requests/{requestId}'` - Document Firestore à surveiller
- **region** : `'europe-west1'` - Région d'exécution (Europe)
- **memory** : `256MiB` - Mémoire allouée (suffisant pour envoi email/SMS)
- **timeoutSeconds** : `30` - Timeout maximal (30 secondes)
- **maxInstances** : `10` - Nombre maximum d'instances simultanées

---

## 🔄 Flux d'Exécution

### 1. Détection du Changement de Statut

```typescript
const beforeData = event.data.before.data()
const afterData = event.data.after.data()

// Vérifier que le statut a changé pour 'rejected'
if (beforeData.status !== 'rejected' && afterData.status === 'rejected') {
  // Le dossier vient d'être rejeté
  // Continuer avec la notification
}
```

### 2. Récupération des Données

```typescript
const requestId = event.params.requestId
const membershipRequest = afterData

// Données nécessaires pour la notification
const {
  matricule,
  identity: {
    firstName,
    lastName,
    email,
    contacts // Pour SMS/WhatsApp
  },
  motifReject,
  processedBy,
  processedAt
} = membershipRequest
```

### 3. Envoi de Notification Email ⚠️ OPTIONNEL

**⚠️ NOTE** : Cette fonctionnalité est **optionnelle** et peut être implémentée dans une phase ultérieure. Elle n'est pas une priorité pour le moment.

```typescript
// ⚠️ OPTIONNEL - À implémenter dans une phase ultérieure
// import { sendEmail } from '@/utils/email' // À créer/utiliser

// const emailSubject = 'Votre demande d\'adhésion KARA a été rejetée'
// const emailBody = `
// Bonjour ${firstName} ${lastName},
//
// Votre demande d'adhésion KARA (matricule: ${matricule}) a été rejetée.
//
// Motif de rejet:
// ${motifReject}
//
// Pour toute question, veuillez contacter notre service client.
//
// Cordialement,
// L'équipe KARA Association
// `

// try {
//   if (email) {
//     await sendEmail({
//       to: email,
//       subject: emailSubject,
//       body: emailBody,
//       html: formatEmailBody(firstName, lastName, matricule, motifReject)
//     })
//     console.log(`[onMembershipRequestRejected] Email envoyé à ${email}`)
//   }
// } catch (error) {
//   console.error(`[onMembershipRequestRejected] Erreur envoi email:`, error)
//   // Ne pas faire échouer la fonction si l'email échoue
// }
```

### 4. Envoi de Notification SMS ⚠️ OPTIONNEL

**⚠️ NOTE** : Cette fonctionnalité est **optionnelle** et peut être implémentée dans une phase ultérieure. Elle n'est pas une priorité pour le moment.

```typescript
// ⚠️ OPTIONNEL - À implémenter dans une phase ultérieure
// import { sendSMS } from '@/utils/sms' // À créer/utiliser

// const smsMessage = `Bonjour ${firstName},\n\nVotre demande d'adhésion KARA (${matricule}) a été rejetée.\n\nMotif: ${motifReject}\n\nCordialement, KARA Association`

// try {
//   // Récupérer le premier numéro de téléphone disponible
//   const phoneNumber = contacts?.[0] || identity.phoneNumber
//   
//   if (phoneNumber) {
//     await sendSMS({
//       to: phoneNumber,
//       message: smsMessage
//     })
//     console.log(`[onMembershipRequestRejected] SMS envoyé à ${phoneNumber}`)
//   }
// } catch (error) {
//   console.error(`[onMembershipRequestRejected] Erreur envoi SMS:`, error)
//   // Ne pas faire échouer la fonction si le SMS échoue
// }
```

### 5. Création de Notification Firestore

**Note** : Pour le moment, cette Cloud Function est principalement destinée à être un placeholder pour l'implémentation future des notifications email/SMS. Les notifications Firestore pour les admins sont déjà gérées côté client lors du rejet.

```typescript
// Pour l'instant, cette fonction peut rester vide ou contenir uniquement des logs
// Les notifications Firestore pour les admins sont gérées côté client dans
// MembershipServiceV2.rejectMembershipRequest()

console.log(`[onMembershipRequestRejected] Demande rejetée : ${requestId}`)
console.log(`[onMembershipRequestRejected] Matricule: ${matricule}`)
console.log(`[onMembershipRequestRejected] Nom: ${firstName} ${lastName}`)
console.log(`[onMembershipRequestRejected] Motif: ${motifReject}`)

// TODO: Implémenter l'envoi email/SMS dans une phase ultérieure
```

---

## ⚠️ État Actuel de l'Implémentation

**Statut** : **Placeholder** - Cette Cloud Function peut être créée mais reste **minimale** pour le moment.

**Implémentation actuelle** :
- ✅ Détection du changement de statut vers 'rejected'
- ✅ Logging des informations de rejet
- ⚠️ **Email/SMS : Optionnel** - À implémenter dans une phase ultérieure

**Recommandation** : Pour l'instant, créer une version simplifiée qui fait uniquement du logging. L'implémentation complète des notifications email/SMS peut être ajoutée plus tard.

---

## 📧 Format de l'Email (Futur - Optionnel)

### Version Texte

```
Bonjour {firstName} {lastName},

Votre demande d'adhésion KARA (matricule: {matricule}) a été rejetée.

Motif de rejet:
{motifReject}

Pour toute question, veuillez contacter notre service client.

Cordialement,
L'équipe KARA Association
```

### Version HTML

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Demande d'adhésion rejetée</title>
</head>
<body>
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <h2 style="color: #ef4444;">Votre demande d'adhésion KARA a été rejetée</h2>
    
    <p>Bonjour <strong>{firstName} {lastName}</strong>,</p>
    
    <p>Votre demande d'adhésion KARA (matricule: <strong>{matricule}</strong>) a été rejetée.</p>
    
    <div style="background-color: #fee2e2; padding: 15px; border-radius: 5px; margin: 20px 0;">
      <h3 style="color: #991b1b; margin-top: 0;">Motif de rejet :</h3>
      <p style="color: #7f1d1d;">{motifReject}</p>
    </div>
    
    <p>Pour toute question, veuillez contacter notre service client.</p>
    
    <p>Cordialement,<br>L'équipe KARA Association</p>
  </div>
</body>
</html>
```

---

## 📱 Format du SMS (Futur - Optionnel)

```
Bonjour {firstName},

Votre demande d'adhésion KARA ({matricule}) a été rejetée.

Motif: {motifReject}

Cordialement, KARA Association
```

**Limite** : 160 caractères (SMS standard) ou 1600 caractères (SMS long)

**⚠️ NOTE** : À implémenter dans une phase ultérieure

---

## 🔒 Sécurité

### Gestion des Erreurs

**Version actuelle (minimale)** :
```typescript
try {
  // Détection du changement de statut et logging uniquement
  const beforeData = event.data.before.data()
  const afterData = event.data.after.data()
  
  if (beforeData.status !== 'rejected' && afterData.status === 'rejected') {
    console.log(`[onMembershipRequestRejected] Demande rejetée : ${requestId}`)
    // TODO: Implémenter l'envoi email/SMS dans une phase ultérieure
  }
} catch (error) {
  console.error(`[onMembershipRequestRejected] Erreur:`, error)
  // Ne pas throw : ne pas faire échouer la fonction
}
```

**Version future (avec email/SMS)** :
```typescript
try {
  // Envoi email (optionnel)
  if (email) {
    await sendEmail({ ... })
  }
} catch (error) {
  console.error(`[onMembershipRequestRejected] Erreur envoi email:`, error)
  // Ne pas throw : ne pas faire échouer la fonction si l'email échoue
}

try {
  // Envoi SMS (optionnel)
  if (phoneNumber) {
    await sendSMS({ ... })
  }
} catch (error) {
  console.error(`[onMembershipRequestRejected] Erreur envoi SMS:`, error)
  // Ne pas throw : ne pas faire échouer la fonction si le SMS échoue
}
```

### Rate Limiting (Futur - Optionnel)

Pour éviter le spam, implémenter un rate limiting lors de l'implémentation des notifications :
- Maximum 1 email/SMS par demande
- Vérifier si notification déjà envoyée (champ `rejectionNotificationSent`)

---

## 📊 Logging

### Logs à Inclure

```typescript
console.log(`[onMembershipRequestRejected] Déclenchement pour ${requestId}`)
console.log(`[onMembershipRequestRejected] Matricule: ${matricule}`)
console.log(`[onMembershipRequestRejected] Nom: ${firstName} ${lastName}`)
console.log(`[onMembershipRequestRejected] Email: ${email}`)
console.log(`[onMembershipRequestRejected] Email envoyé avec succès`)
console.log(`[onMembershipRequestRejected] SMS envoyé avec succès`)
console.error(`[onMembershipRequestRejected] Erreur:`, error)
```

### Métriques à Surveiller

- Nombre de notifications envoyées par jour
- Taux de succès email/SMS
- Taux d'erreur
- Temps d'exécution moyen

---

## 🧪 Tests

### Tests Unitaires

**Fichier** : `functions/src/membership-requests/__tests__/onMembershipRequestRejected.test.ts`

**Cas à tester** :
1. Notification envoyée avec succès (email + SMS)
2. Notification uniquement email (pas de SMS)
3. Notification uniquement SMS (pas d'email)
4. Aucune notification (pas d'email ni de SMS)
5. Erreur envoi email (ne doit pas faire échouer la fonction)
6. Erreur envoi SMS (ne doit pas faire échouer la fonction)
7. Statut non 'rejected' (ne doit pas envoyer de notification)
8. Statut déjà 'rejected' (ne doit pas envoyer de notification double)

### Tests d'Intégration

**Cas à tester** :
1. Flux complet : Rejet → Trigger → Email → SMS
2. Vérification du format email
3. Vérification du format SMS
4. Vérification rate limiting

---

## 🚀 Déploiement

### Export dans index.ts

```typescript
// functions/src/index.ts
export { onMembershipRequestRejected } from './membership-requests/onMembershipRequestRejected'
```

### Déploiement

```bash
cd functions
npm run build
firebase deploy --only functions:onMembershipRequestRejected
```

### Implémentation Progressive

**Phase 1 (Actuelle)** : Version minimale avec logging uniquement
- ✅ Détection du changement de statut
- ✅ Logging des informations de rejet
- ⚠️ Pas d'envoi email/SMS (optionnel pour l'instant)

**Phase 2 (Futur)** : Implémentation complète avec notifications
- ⏳ Envoi email au demandeur
- ⏳ Envoi SMS au demandeur (optionnel)
- ⏳ Rate limiting et protection contre le spam

**Recommandation** : Déployer la Phase 1 maintenant pour avoir la structure en place. Ajouter la Phase 2 dans une itération ultérieure.

---

## 📚 Références

- **Firebase Functions v2 - Firestore Triggers** : https://firebase.google.com/docs/functions/firestore-events
- **Firebase Functions v2 - Document Updated** : https://firebase.google.com/docs/functions/firestore-events#document-updated
- **Email Service** : À créer/utiliser dans une phase ultérieure (ex: SendGrid, Mailgun, etc.)
- **SMS Service** : À créer/utiliser dans une phase ultérieure (ex: Twilio, etc.)
- **Flux de rejet** : `../FLUX_REJET.md`
- **Actions post-rejet** : `../ACTIONS_POST_REJET.md`
