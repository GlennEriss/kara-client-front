# Flux de Rejet - Détails Complets

> Documentation détaillée du flux de rejet d'une demande d'adhésion

---

## 📋 Vue d'ensemble

**Objectif** : Rejeter une demande d'adhésion avec un motif justificatif et notifier le demandeur.

**Acteurs** :
- **Admin KARA** : Rejette la demande avec un motif
- **Système** : Met à jour le statut et envoie la notification
- **Demandeur** : Reçoit la notification de rejet

---

## 🔄 Flux Complet

### 1. Prérequis

- La demande doit avoir le statut `'pending'` ou `'under_review'`
- La demande ne peut pas être déjà rejetée (`status !== 'rejected'`)
- L'admin doit être authentifié et avoir les permissions nécessaires
- Le bouton "Rejeter" est visible uniquement si :
  - `status === 'pending'` OU `status === 'under_review'`
  - `status !== 'rejected'`

### 2. Ouverture du Modal de Rejet

**Déclencheur** : Clic sur le bouton "Rejeter" dans l'interface

**Composant** : `RejectModalV2`

**Données affichées** :
- Nom du demandeur : `{firstName} {lastName}`
- Message d'avertissement : "Vous êtes sur le point de rejeter la demande de {nom}."

### 3. Saisie du Motif de Rejet

**Champ** : Textarea obligatoire

**Règles de validation** :
- **Obligatoire** : Le champ ne peut pas être vide
- **Longueur minimale** : 10 caractères (après trim)
- **Longueur maximale** : 500 caractères (constante `MAX_REJECTION_REASON_LENGTH`)

**Validation côté client** :
- Affichage du compteur de caractères : `{length} / {maxLength} caractères`
- Message d'erreur si < 10 caractères : "Minimum 10 caractères requis"
- Bouton "Rejeter" désactivé si validation échoue
- Couleur d'avertissement (amber) si longueur < 10 caractères

**Placeholder** :
```
Indiquez le motif de rejet de cette demande...
```

### 4. Confirmation du Rejet

**Boutons disponibles** :
- **"Annuler"** : Ferme le modal sans action
- **"Rejeter"** : Confirme le rejet (désactivé si validation échoue)

**État de chargement** :
- Pendant le traitement : Bouton affiche "Rejet en cours..." avec spinner
- Le modal ne peut pas être fermé pendant le chargement

### 5. Appel du Service

**Méthode** : `MembershipServiceV2.rejectMembershipRequest(params)`

**Paramètres** :
```typescript
{
  requestId: string        // ID de la demande d'adhésion
  adminId: string          // ID de l'admin qui rejette
  reason: string           // Motif de rejet (texte libre, 10-500 caractères)
}
```

### 6. Validations Service

**Étape 1 : Validation du motif**
```typescript
// Vérifier que le motif n'est pas vide
if (!reason || reason.trim().length === 0) {
  throw new Error('Un motif de rejet est requis')
}

// Vérifier longueur minimale
const minLength = 10
if (reason.trim().length < minLength) {
  throw new Error(`Le motif de rejet doit contenir au moins ${minLength} caractères`)
}

// Vérifier longueur maximale
const maxLength = MEMBERSHIP_REQUEST_VALIDATION.MAX_REJECTION_REASON_LENGTH // 500
if (reason.length > maxLength) {
  throw new Error(`Le motif de rejet ne peut pas dépasser ${maxLength} caractères`)
}
```

**Étape 2 : Vérification de l'existence de la demande**
```typescript
const request = await this.repository.getById(requestId)
if (!request) {
  throw new Error(`Demande d'adhésion ${requestId} introuvable`)
}
```

### 7. Mise à Jour Firestore

**Collection** : `membership-requests/{requestId}`

**Méthode** : `MembershipRepositoryV2.updateStatus()`

**Données mises à jour** :
```typescript
{
  status: 'rejected',
  motifReject: reason.trim(),              // Motif de rejet (obligatoire)
  processedBy: adminId,                    // ID de l'admin qui a rejeté
  processedAt: new Date(),                 // Date de rejet
  updatedAt: serverTimestamp(),            // Date de mise à jour
}
```

**Champs de traçabilité** :
- `processedBy` : ID de l'admin qui a rejeté (obligatoire pour audit)
- `processedAt` : Date et heure du rejet (obligatoire pour audit)
- `motifReject` : Motif du rejet (obligatoire, 10-500 caractères)

### 8. Envoi de Notifications

#### 8.1. Notification Firestore pour Admins ✅ OBLIGATOIRE

**Collection** : `notifications/{notificationId}`

**Type de notification** : `membership_rejected`

**Destinataire** : Tous les admins

**Structure** :
```typescript
{
  type: 'membership_rejected',
  module: 'memberships',
  entityId: requestId,
  title: 'Demande d\'adhésion rejetée',
  message: `${adminName} a rejeté la demande de ${memberName}. Motif: ${reason}`,
  metadata: {
    requestId: requestId,
    memberName: `${firstName} ${lastName}`,
    adminName: string,
    adminId: adminId,
    status: 'rejected',
    motifReject: reason,
    processedAt: Date,
    processedBy: adminId,
  },
  isRead: false,
  createdAt: serverTimestamp(),
}
```

**Création** : Via `NotificationService.createRejectionNotification()` après le rejet

**Affichage** : Notification Bell pour tous les admins

#### 8.2. Notification au Demandeur ⚠️ OPTIONNEL / NON PRIORITAIRE

**⚠️ NOTE** : Les notifications email/SMS automatiques au demandeur sont **optionnelles** et **non prioritaires** pour le moment. Elles peuvent être implémentées dans une phase ultérieure.

**Bouton WhatsApp Manuel ✅ Disponible** :
- Bouton "Envoyer WhatsApp" dans les actions post-rejet
- Permet à l'admin d'informer manuellement le demandeur
- Sélection du numéro WhatsApp (si plusieurs numéros)
- Message template avec motif de rejet (modifiable)
- Ouvre WhatsApp Web avec message prérempli
- Voir `wireframes/MODAL_WHATSAPP_REJET.md` pour les détails

**Envoi Email/SMS Automatique ⚠️ OPTIONNEL - Phase ultérieure** :

**⚠️ OPTIONNEL - À implémenter dans une phase ultérieure** : Envoi automatique d'un email/SMS au demandeur via Cloud Function Trigger `onMembershipRequestRejected`

**Template Email** :
- Sujet : "Votre demande d'adhésion KARA a été rejetée"
- Corps : Contenu du motif de rejet
- Signature : KARA Mutuelle

**Template SMS/WhatsApp** :
```typescript
`Bonjour ${firstName},\n\n` +
`Votre demande d'adhésion a été rejetée.\n\n` +
`Motif: ${reason}\n\n` +
`Cordialement,\nKARA Mutuelle`
```

### 9. Invalidation du Cache React Query

**Queries invalidées** :
```typescript
queryClient.invalidateQueries({ 
  queryKey: ['membershipRequests'] 
})

queryClient.invalidateQueries({ 
  queryKey: ['membershipRequest', requestId] 
})

queryClient.invalidateQueries({ 
  queryKey: ['notifications'] 
})
```

**Impact** :
- Rafraîchissement automatique de la liste des demandes
- Mise à jour du statut dans l'interface
- Actualisation des statistiques

### 10. Affichage du Résultat

**Toast de succès** :
- Type : `success` (ou `error` selon le design)
- Titre : "🚫 Demande rejetée avec succès"
- Description : `La demande de ${firstName} ${lastName} a été rejetée.`
- Durée : 4000ms

**Actions post-rejet** :
- Fermeture automatique du modal
- Mise à jour de l'interface (statut, badge, etc.)
- Désactivation des actions possibles sur cette demande (read-only)

---

## 🔒 Sécurité

### Permissions

- **Seuls les admins** peuvent rejeter une demande
- Vérification de l'authentification dans le service
- Validation des permissions côté Firestore Rules

### Traçabilité

- Enregistrement obligatoire de :
  - Qui a rejeté (`processedBy`)
  - Quand (`processedAt`)
  - Pourquoi (`motifReject`)

### Validation des Données

- **Côté client** : Validation en temps réel dans le modal
- **Côté serveur** : Validation stricte dans le service
- **Double validation** : Empêche les données invalides

---

## 📊 Collections Firestore Utilisées

- `membership-requests` : Demande d'adhésion (mise à jour)
- `notifications` : Notifications (création - TODO)

---

## 🎯 Points d'Attention

1. **Documents Uploadés** :
   - Les documents uploadés ne sont **PAS** supprimés lors du rejet
   - Conservation pour audit et historique (conforme aux règles métier)

2. **Impossibilité de Réouverture** :
   - Une demande rejetée ne peut pas être réouverte directement
   - Le demandeur doit créer une nouvelle demande si nécessaire

3. **Notification au Demandeur** :
   - ✅ **Bouton WhatsApp** : Bouton "Envoyer WhatsApp" disponible dans les actions sur demande rejetée
   - ⚠️ **Optionnel / Non prioritaire** : L'envoi email/SMS automatique via Cloud Function est optionnel et non prioritaire (voir `functions/onMembershipRequestRejected.md`)
   - Le demandeur est informé via WhatsApp si l'admin envoie manuellement le message
   - Sélection du numéro WhatsApp (si plusieurs numéros disponibles)
   - Message template avec motif de rejet (modifiable)
   - Voir `wireframes/MODAL_WHATSAPP_REJET.md` pour les détails

4. **Validation du Motif** :
   - Le motif est obligatoire et doit être informatif (minimum 10 caractères)
   - Maximum 500 caractères pour éviter les abus

---

## 🔄 Cas d'Erreur

### Erreur : Motif vide
- **Message** : "Un motif de rejet est requis"
- **Action** : Le modal reste ouvert, affichage de l'erreur

### Erreur : Motif trop court
- **Message** : "Le motif de rejet doit contenir au moins 10 caractères"
- **Action** : Le modal reste ouvert, affichage de l'erreur

### Erreur : Motif trop long
- **Message** : "Le motif de rejet ne peut pas dépasser 500 caractères"
- **Action** : Le modal reste ouvert, affichage de l'erreur

### Erreur : Demande introuvable
- **Message** : "Demande d'adhésion {requestId} introuvable"
- **Action** : Toast d'erreur, modal reste ouvert

### Erreur : Permissions insuffisantes
- **Message** : "Vous n'avez pas la permission de rejeter cette demande"
- **Action** : Toast d'erreur, modal fermé

### Erreur : Demande déjà rejetée
- **Cas** : Tentative de rejeter une demande déjà rejetée
- **Action** : Le bouton "Rejeter" doit être désactivé (validation UI)

---

## 📝 Prochaines Étapes

1. ✅ Documentation du flux détaillé
2. ⏳ Implémenter l'envoi de notification au demandeur (optionnel/non prioritaire - phase ultérieure)
3. ⏳ Ajouter les tests unitaires
4. ⏳ Ajouter les tests d'intégration
5. ⏳ Ajouter les tests E2E
6. ⏳ Vérifier/améliorer les règles Firebase

---

## 📖 Références

- **Code service** : `src/domains/memberships/services/MembershipServiceV2.ts` (lignes 135-174)
- **Code modal** : `src/domains/memberships/components/modals/RejectModalV2.tsx`
- **Code repository** : `src/domains/memberships/repositories/MembershipRepositoryV2.ts` (méthode `updateStatus`)
- **Constantes** : `src/constantes/membership-requests.ts`
- **Workflow Approbation** : `documentation/membership-requests/approbation/FLUX_APPROBATION.md`
