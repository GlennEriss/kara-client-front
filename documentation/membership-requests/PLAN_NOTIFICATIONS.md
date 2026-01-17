# Plan de Notifications - Module Membership Requests

Ce document définit le plan complet des notifications pour le module de gestion des demandes d'adhésion, incluant les notifications aux admins et aux demandeurs.

---

## Vue d'ensemble

### Objectifs
- ✅ Notifier les **admins** lors des actions importantes
- ✅ Notifier les **demandeurs** lors des changements de statut de leur demande
- ✅ Envoyer des **notifications multi-canaux** (in-app, email, WhatsApp)
- ✅ Assurer la **traçabilité** de toutes les actions

### Canaux de notification
1. **In-App** : Notifications dans l'interface admin
2. **Email** : Envoi d'emails aux demandeurs (optionnel, à implémenter)
3. **WhatsApp** : Envoi de messages WhatsApp pour les corrections (prioritaire)

---

## Types de Notifications

### 1. Notifications Admin (In-App)

Les admins reçoivent des notifications dans l'interface pour :

| Action | Type de notification | Description |
|--------|---------------------|-------------|
| **Nouvelle demande** | `new_request` | Une nouvelle demande d'adhésion a été soumise |
| **Paiement enregistré** | `payment_received` | Un paiement a été enregistré pour une demande |
| **Rappel en attente** | `reminder` | Une demande est en attente depuis X jours |

**Destination :** Collection `notifications` avec `module: 'memberships'`

---

### 2. Notifications Demandeur

Les demandeurs reçoivent des notifications lors des changements de statut :

| Action | Type de notification | Canaux | Description |
|--------|---------------------|--------|-------------|
| **Demande créée** | `request_created` | In-App (futur) | Confirmation de soumission |
| **Corrections demandées** | `corrections_requested` | **In-App + WhatsApp** | Demande de corrections avec lien et code |
| **Demande approuvée** | `request_approved` | In-App (futur) + **WhatsApp** | Approbation avec matricule |
| **Demande rejetée** | `request_rejected` | In-App (futur) + **WhatsApp** | Rejet avec motif |
| **Paiement confirmé** | `payment_confirmed` | In-App (futur) | Confirmation de paiement |

**Destination :** Collection `notifications` avec `module: 'memberships'` + **WhatsApp** (pour corrections, approbation, rejet)

---

## Détail par Action

### 1. Approbation d'une Demande (`approve`)

#### Notifications envoyées :

**A. Notification Admin (In-App)**
```typescript
{
  module: 'memberships',
  entityId: requestId,
  type: 'status_update',
  title: 'Demande approuvée',
  message: `La demande de ${memberName} a été approuvée. Matricule: ${matricule}`,
  metadata: {
    requestId,
    memberName,
    matricule,
    membershipType,
    approvedBy: adminId,
  }
}
```

**B. Notification Demandeur (In-App - futur)**
```typescript
{
  module: 'memberships',
  entityId: requestId,
  type: 'request_approved',
  title: 'Votre demande d\'adhésion a été approuvée',
  message: `Votre demande d'adhésion a été approuvée. Votre matricule est: ${matricule}`,
  metadata: {
    requestId,
    matricule,
    membershipType,
  }
}
```

**C. Message WhatsApp (Optionnel - si numéro disponible)**
```
Bonjour {name},

Votre demande d'adhésion a été approuvée !

Votre matricule: {matricule}

Cordialement,
KARA Mutuelle
```

**Quand :** Après création réussie de l'utilisateur Firebase et mise à jour du statut

---

### 2. Rejet d'une Demande (`reject`)

#### Notifications envoyées :

**A. Notification Admin (In-App)**
```typescript
{
  module: 'memberships',
  entityId: requestId,
  type: 'status_update',
  title: 'Demande rejetée',
  message: `La demande de ${memberName} a été rejetée.${reason ? ` Motif: ${reason}` : ''}`,
  metadata: {
    requestId,
    memberName,
    reason,
    rejectedBy: adminId,
  }
}
```

**B. Notification Demandeur (In-App - futur)**
```typescript
{
  module: 'memberships',
  entityId: requestId,
  type: 'request_rejected',
  title: 'Votre demande d\'adhésion a été rejetée',
  message: `Votre demande d'adhésion a été rejetée.${reason ? ` Motif: ${reason}` : ''}`,
  metadata: {
    requestId,
    reason,
  }
}
```

**C. Message WhatsApp (Optionnel - si numéro disponible)**
```
Bonjour {name},

Votre demande d'adhésion a été rejetée.

{motif: Motif: {reason}}

Cordialement,
KARA Mutuelle
```

**Quand :** Après mise à jour du statut vers `rejected`

---

### 3. Demande de Corrections (`request_corrections`)

#### Notifications envoyées :

**A. Notification Admin (In-App)**
```typescript
{
  module: 'memberships',
  entityId: requestId,
  type: 'status_update',
  title: 'Corrections demandées',
  message: `Des corrections ont été demandées pour la demande de ${memberName}`,
  metadata: {
    requestId,
    memberName,
    securityCode,
    correctionLink,
    reviewedBy: adminId,
  }
}
```

**B. Notification Demandeur (In-App - futur)**
```typescript
{
  module: 'memberships',
  entityId: requestId,
  type: 'corrections_requested',
  title: 'Corrections demandées pour votre demande',
  message: `Des corrections ont été demandées pour votre demande d'adhésion. Code: ${securityCode}`,
  metadata: {
    requestId,
    securityCode,
    correctionLink,
    corrections,
  }
}
```

**C. Message WhatsApp (PRIORITAIRE - obligatoire si numéro disponible)**
```
Bonjour {name},

Votre demande d'adhésion nécessite des corrections.

Corrections à apporter:
{corrections}

Lien de correction: {link}
Code de sécurité: {code}

Cordialement,
KARA Mutuelle
```

**Quand :** Après génération du code de sécurité et mise à jour du statut vers `under_review`

**Action utilisateur :** Bouton "Envoyer via WhatsApp" dans le modal de corrections

---

### 4. Enregistrement d'un Paiement (`pay`)

#### Notifications envoyées :

**A. Notification Admin (In-App)**
```typescript
{
  module: 'memberships',
  entityId: requestId,
  type: 'payment_received',
  title: 'Paiement enregistré',
  message: `Un paiement de ${amount} ${currency} a été enregistré pour la demande de ${memberName}`,
  metadata: {
    requestId,
    memberName,
    amount,
    paymentMode,
    paymentDate,
    recordedBy: adminId,
  }
}
```

**B. Notification Demandeur (In-App - futur)**
```typescript
{
  module: 'memberships',
  entityId: requestId,
  type: 'payment_confirmed',
  title: 'Paiement confirmé',
  message: `Votre paiement de ${amount} ${currency} a été enregistré.`,
  metadata: {
    requestId,
    amount,
    paymentMode,
    paymentDate,
  }
}
```

**Quand :** Après enregistrement réussi du paiement dans Firestore

---

## Implémentation

### Service de Notifications

Le service `NotificationService` doit être étendu avec les méthodes suivantes :

```typescript
class NotificationService {
  /**
   * Notification d'approbation
   */
  async sendApprovalNotifications(
    requestId: string,
    memberName: string,
    matricule: string,
    membershipType: string,
    adminId: string,
    phoneNumber?: string
  ): Promise<void> {
    // 1. Notification admin (In-App)
    await this.createNotification({
      module: 'memberships',
      entityId: requestId,
      type: 'status_update',
      title: 'Demande approuvée',
      message: `La demande de ${memberName} a été approuvée. Matricule: ${matricule}`,
      metadata: { requestId, memberName, matricule, membershipType, approvedBy: adminId },
    })
    
    // 2. Notification demandeur (In-App - futur)
    // À implémenter quand le système de notifications pour les demandeurs sera en place
    
    // 3. WhatsApp (optionnel)
    if (phoneNumber) {
      await this.sendWhatsAppMessage(
        phoneNumber,
        MEMBERSHIP_REQUEST_WHATSAPP.APPROVAL_MESSAGE(memberName, matricule)
      )
    }
  }
  
  /**
   * Notification de rejet
   */
  async sendRejectionNotifications(
    requestId: string,
    memberName: string,
    reason: string | undefined,
    adminId: string,
    phoneNumber?: string
  ): Promise<void> {
    // 1. Notification admin (In-App)
    await this.createNotification({
      module: 'memberships',
      entityId: requestId,
      type: 'status_update',
      title: 'Demande rejetée',
      message: `La demande de ${memberName} a été rejetée.${reason ? ` Motif: ${reason}` : ''}`,
      metadata: { requestId, memberName, reason, rejectedBy: adminId },
    })
    
    // 2. Notification demandeur (In-App - futur)
    // À implémenter
    
    // 3. WhatsApp (optionnel)
    if (phoneNumber) {
      await this.sendWhatsAppMessage(
        phoneNumber,
        MEMBERSHIP_REQUEST_WHATSAPP.REJECTION_MESSAGE(memberName, reason)
      )
    }
  }
  
  /**
   * Notification de corrections (PRIORITAIRE pour WhatsApp)
   */
  async sendCorrectionRequestNotifications(
    requestId: string,
    memberName: string,
    corrections: string,
    correctionLink: string,
    securityCode: string,
    adminId: string,
    phoneNumber?: string
  ): Promise<void> {
    // 1. Notification admin (In-App)
    await this.createNotification({
      module: 'memberships',
      entityId: requestId,
      type: 'status_update',
      title: 'Corrections demandées',
      message: `Des corrections ont été demandées pour la demande de ${memberName}`,
      metadata: { requestId, memberName, securityCode, correctionLink, reviewedBy: adminId },
    })
    
    // 2. Notification demandeur (In-App - futur)
    // À implémenter
    
    // 3. WhatsApp (OBLIGATOIRE si numéro disponible)
    if (phoneNumber) {
      await this.sendWhatsAppMessage(
        phoneNumber,
        MEMBERSHIP_REQUEST_WHATSAPP.CORRECTION_MESSAGE(memberName, corrections, correctionLink, securityCode)
      )
    }
  }
  
  /**
   * Notification de paiement
   */
  async sendPaymentNotifications(
    requestId: string,
    memberName: string,
    amount: number,
    currency: string,
    paymentMode: string,
    adminId: string
  ): Promise<void> {
    // Notification admin (In-App)
    await this.createNotification({
      module: 'memberships',
      entityId: requestId,
      type: 'payment_received',
      title: 'Paiement enregistré',
      message: `Un paiement de ${amount} ${currency} a été enregistré pour la demande de ${memberName}`,
      metadata: { requestId, memberName, amount, paymentMode, recordedBy: adminId },
    })
    
    // Notification demandeur (In-App - futur)
    // À implémenter
  }
  
  /**
   * Envoie un message WhatsApp (à implémenter)
   */
  private async sendWhatsAppMessage(phoneNumber: string, message: string): Promise<void> {
    // TODO: Intégrer avec l'API WhatsApp Business
    // Pour l'instant, générer l'URL WhatsApp Web
    const whatsappUrl = `${MEMBERSHIP_REQUEST_WHATSAPP.BASE_URL}/${phoneNumber}?text=${encodeURIComponent(message)}`
    // Logger l'URL pour le moment
    console.log('WhatsApp URL:', whatsappUrl)
    // Dans l'UI, ouvrir cette URL dans une nouvelle fenêtre
  }
}
```

---

## Intégration dans les Services

### MembershipApprovalService
```typescript
async approveRequest(params: ApprovalParams): Promise<ApprovalResult> {
  // ... logique d'approbation ...
  
  // Envoyer les notifications
  await this.notificationService.sendApprovalNotifications(
    requestId,
    `${request.identity.firstName} ${request.identity.lastName}`,
    matricule,
    membershipType,
    adminId,
    request.identity.contacts?.[0] // Premier numéro de téléphone
  )
  
  return { success: true, matricule }
}
```

### MembershipRejectionService
```typescript
async rejectRequest(params: RejectionParams): Promise<void> {
  // ... logique de rejet ...
  
  // Envoyer les notifications
  await this.notificationService.sendRejectionNotifications(
    requestId,
    `${request.identity.firstName} ${request.identity.lastName}`,
    reason,
    adminId,
    request.identity.contacts?.[0]
  )
}
```

### MembershipCorrectionService
```typescript
async requestCorrections(params: CorrectionParams): Promise<CorrectionResult> {
  // ... logique de correction ...
  
  const correctionLink = `${MEMBERSHIP_REQUEST_ROUTES.CORRECTION(requestId)}`
  
  // Envoyer les notifications
  await this.notificationService.sendCorrectionRequestNotifications(
    requestId,
    `${request.identity.firstName} ${request.identity.lastName}`,
    corrections,
    correctionLink,
    securityCode,
    adminId,
    request.identity.contacts?.[0]
  )
  
  return { securityCode, correctionLink }
}
```

### MembershipPaymentService
```typescript
async registerPayment(params: PaymentParams): Promise<void> {
  // ... logique de paiement ...
  
  // Envoyer les notifications
  await this.notificationService.sendPaymentNotifications(
    requestId,
    `${request.identity.firstName} ${request.identity.lastName}`,
    amount,
    'XAF',
    paymentMode,
    adminId
  )
}
```

---

## Checklist d'Implémentation

### Phase 1 : Notifications In-App (Priorité 1)
- [x] Service `NotificationService` existant
- [ ] Étendre `NotificationService` avec les nouvelles méthodes
- [ ] Intégrer dans `MembershipApprovalService`
- [ ] Intégrer dans `MembershipRejectionService`
- [ ] Intégrer dans `MembershipCorrectionService`
- [ ] Intégrer dans `MembershipPaymentService`

### Phase 2 : Notifications WhatsApp (Priorité 2)
- [ ] Créer fonction utilitaire `sendWhatsAppMessage` dans `NotificationService`
- [ ] Ajouter bouton "Envoyer via WhatsApp" dans le modal de corrections
- [ ] Générer l'URL WhatsApp avec le message pré-rempli
- [ ] Tester l'envoi via WhatsApp Web
- [ ] (Futur) Intégrer avec WhatsApp Business API

### Phase 3 : Notifications Demandeur In-App (Priorité 3)
- [ ] Créer système de notifications pour les demandeurs (collection séparée ou champ `userId`)
- [ ] Implémenter les notifications demandeur dans `NotificationService`
- [ ] Créer interface de consultation des notifications côté demandeur
- [ ] Tester le flux complet

---

## Références

- `src/services/notifications/NotificationService.ts` - Service de notifications
- `src/constantes/membership-requests.ts` - Constantes (messages WhatsApp, etc.)
- `documentation/membership-requests/DIAGRAMMES_ACTIVITE_NOTIFICATIONS.puml` - Diagrammes d'activité
- `documentation/membership-requests/DIAGRAMMES_SEQUENCE_NOTIFICATIONS.puml` - Diagrammes de séquence
