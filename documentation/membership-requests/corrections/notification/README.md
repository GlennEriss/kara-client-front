# Notifications - Fonctionnalité "Demander des Corrections"

## 📋 Vue d'ensemble

Ce document identifie **toutes les notifications nécessaires** pour la fonctionnalité "Demander des Corrections" (Membership Requests).

**Use Case** : UC-MEM-006 - Demander des corrections à une demande d'adhésion

**Module** : `memberships`

---

## 🎯 Types de Notifications Identifiées

### 1. **NOTIF-CORR-001** : Corrections Demandées (Admin → Admin)

**Déclencheur** : Admin demande des corrections via `MembershipServiceV2.requestCorrections()`

**Quand** : Statut passe de `pending` → `under_review`

**Destinataire** : Autres admins (tous les admins sauf celui qui a demandé les corrections)

**Type** : `corrections_requested`

**Contenu** :
- **Titre** : "Corrections demandées"
- **Message** : `{adminName} a demandé des corrections pour la demande de {memberName}`
- **Métadonnées** :
  ```typescript
  {
    requestId: string,
    memberName: string,
    adminName: string,
    adminId: string,
    securityCode: string,
    expiryDate: Date,
    correctionsCount: number
  }
  ```

**Priorité** : Moyenne

**Action suggérée** : Lien vers `/membership-requests/{requestId}`

---

### 2. **NOTIF-CORR-002** : Corrections Soumises (Demandeur → Admin)

**Déclencheur** : Demandeur soumet ses corrections via Cloud Function `submitCorrections`

**Quand** : Statut passe de `under_review` → `pending`

**Destinataire** : Tous les admins (ou seulement l'admin qui a demandé les corrections ?)

**Type** : `corrections_submitted`

**Contenu** :
- **Titre** : "Corrections soumises"
- **Message** : `{memberName} a soumis ses corrections pour la demande #{requestId}`
- **Métadonnées** :
  ```typescript
  {
    requestId: string,
    memberName: string,
    submittedAt: Date,
    wasExpired: boolean, // Si le code était sur le point d'expirer
    previousAdminId: string // Admin qui avait demandé les corrections
  }
  ```

**Priorité** : Haute (la demande revient en attente, nécessite une revue)

**Action suggérée** : Lien vers `/membership-requests/{requestId}`

---

### 3. **NOTIF-CORR-003** : Code de Sécurité Expiré (Système → Admin)

**Déclencheur** : Cloud Function programmée (scheduled) vérifie les codes expirés

**Quand** : `securityCodeExpiry < Date.now()` ET `securityCodeUsed === false` ET `status === 'under_review'`

**Destinataire** : Admin qui a demandé les corrections (`processedBy`)

**Type** : `security_code_expired`

**Contenu** :
- **Titre** : "Code de sécurité expiré"
- **Message** : `Le code de sécurité pour les corrections de {memberName} (demande #{requestId}) a expiré`
- **Métadonnées** :
  ```typescript
  {
    requestId: string,
    memberName: string,
    expiredAt: Date,
    adminId: string,
    daysSinceRequest: number
  }
  ```

**Priorité** : Moyenne

**Action suggérée** : Lien vers `/membership-requests/{requestId}` avec suggestion de régénérer le code

---

### 4. **NOTIF-CORR-004** : Rappel Avant Expiration du Code (Système → Admin)

**Déclencheur** : Cloud Function programmée (scheduled) vérifie les codes proches de l'expiration

**Quand** : `securityCodeExpiry` dans moins de 24h ET `securityCodeUsed === false` ET `status === 'under_review'`

**Destinataire** : Admin qui a demandé les corrections (`processedBy`)

**Type** : `security_code_expiring_soon`

**Contenu** :
- **Titre** : "Code de sécurité expirant bientôt"
- **Message** : `Le code de sécurité pour les corrections de {memberName} (demande #{requestId}) expire dans {hoursRemaining}h`
- **Métadonnées** :
  ```typescript
  {
    requestId: string,
    memberName: string,
    expiresAt: Date,
    hoursRemaining: number,
    adminId: string
  }
  ```

**Priorité** : Basse (rappel informatif)

**Action suggérée** : Lien vers `/membership-requests/{requestId}`

**Note** : Envoyer une seule fois, pas de rappel répété toutes les heures

---

### 5. **NOTIF-CORR-005** : Code Régénéré (Admin → Admin)

**Déclencheur** : Admin régénère le code de sécurité via `MembershipServiceV2.renewSecurityCode()`

**Quand** : Nouveau code généré, `securityCodeExpiry` mis à jour

**Destinataire** : Autres admins (ou seulement ceux qui suivent cette demande ?)

**Type** : `security_code_renewed`

**Contenu** :
- **Titre** : "Code de sécurité régénéré"
- **Message** : `{adminName} a régénéré le code de sécurité pour les corrections de {memberName} (demande #{requestId})`
- **Métadonnées** :
  ```typescript
  {
    requestId: string,
    memberName: string,
    adminName: string,
    adminId: string,
    newExpiryDate: Date
  }
  ```

**Priorité** : Basse (informative)

**Action suggérée** : Lien vers `/membership-requests/{requestId}`

---

## 📊 Récapitulatif des Notifications

| ID | Type | Déclencheur | Destinataire | Priorité | Automatique ? |
|----|------|-------------|--------------|----------|---------------|
| **NOTIF-CORR-001** | `corrections_requested` | Admin demande corrections | Autres admins | Moyenne | ✅ Oui |
| **NOTIF-CORR-002** | `corrections_submitted` | Demandeur soumet corrections | Tous les admins | **Haute** | ✅ Oui |
| **NOTIF-CORR-003** | `security_code_expired` | Code expiré (Cloud Function) | Admin demandeur | Moyenne | ✅ Oui (scheduled) |
| **NOTIF-CORR-004** | `security_code_expiring_soon` | Code expirant < 24h (Cloud Function) | Admin demandeur | Basse | ✅ Oui (scheduled) |
| **NOTIF-CORR-005** | `security_code_renewed` | Admin régénère code | Autres admins | Basse | ✅ Oui |

---

## 🔧 Format des Notifications

**Le format respecte la classe `Notification` du diagramme de classes** (`documentation/uml/classes/CLASSES_SHARED.puml`) :

```typescript
interface Notification {
  id: string                           // Auto-généré par Firestore
  module: 'memberships'                // NotificationModule.memberships
  entityId: string                     // requestId (ID de la demande)
  type: NotificationType               // Type de notification (voir ci-dessous)
  title: string                        // Titre de la notification
  message: string                      // Message descriptif
  isRead: boolean                      // État de lecture
  createdAt: Date                      // Date de création
  scheduledAt?: Date                   // Pour notifications programmées (NOTIF-CORR-003, 004)
  sentAt?: Date                        // Date d'envoi (optionnel)
  metadata?: Record<string, any>       // Métadonnées spécifiques (memberName, adminName, etc.)
  requestId?: string                   // ID de la demande (pour compatibilité)
}
```

### Types de Notifications à Ajouter dans l'Enum

Les types suivants doivent être **ajoutés à l'enum `NotificationType`** dans `CLASSES_SHARED.puml` :

```plantuml
enum NotificationType {
  birthday_reminder
  new_request
  status_update
  reminder
  contract_expiring
  payment_due
  contract_created
  contract_finished
  contract_canceled
  commission_due_reminder
  commission_overdue
  placement_activated
  corrections_requested        // ⭐ NOUVEAU - NOTIF-CORR-001
  corrections_submitted        // ⭐ NOUVEAU - NOTIF-CORR-002
  security_code_expired        // ⭐ NOUVEAU - NOTIF-CORR-003
  security_code_expiring_soon  // ⭐ NOUVEAU - NOTIF-CORR-004
  security_code_renewed        // ⭐ NOUVEAU - NOTIF-CORR-005
  ...
}
```

## 🔧 Intégration dans le Code

### NotificationService Extension

Ajouter une méthode dédiée dans `NotificationService` :

```typescript
async createCorrectionNotification(
  requestId: string,
  type: 'corrections_requested' | 'corrections_submitted' | 'security_code_expired' | 'security_code_expiring_soon' | 'security_code_renewed',
  memberName?: string,
  adminName?: string,
  metadata?: Record<string, any>
): Promise<Notification> {
  // Le format respecte automatiquement la classe Notification du diagramme
  return this.repository.create({
    module: 'memberships',
    entityId: requestId,
    type,
    title: '...',
    message: '...',
    isRead: false,
    createdAt: new Date(),
    metadata: { requestId, memberName, adminName, ...metadata }
  })
}
```

### Points d'Intégration

1. **MembershipServiceV2.requestCorrections()** → Créer `NOTIF-CORR-001`
2. **Cloud Function submitCorrections** → Créer `NOTIF-CORR-002`
3. **Cloud Function Scheduled (cron)** → Créer `NOTIF-CORR-003` et `NOTIF-CORR-004`
4. **MembershipServiceV2.renewSecurityCode()** → Créer `NOTIF-CORR-005`

---

## 📝 Questions à Déterminer

1. **Destinataires pour NOTIF-CORR-001** : Notifier tous les admins ou seulement ceux qui suivent la demande ?
2. **Destinataires pour NOTIF-CORR-002** : Notifier tous les admins ou seulement l'admin qui a demandé les corrections ?
3. **Fréquence de NOTIF-CORR-003** : Vérifier toutes les heures ou une fois par jour ?
4. **Fréquence de NOTIF-CORR-004** : Envoyer 24h avant ET 12h avant, ou seulement une fois ?
5. **Notification demandeur** : Doit-on aussi notifier le demandeur quand les corrections sont demandées (en plus du WhatsApp) ?

---

## 📚 Références

- **Workflow Corrections** : `../workflow-use-case-corrections.md`
- **Système de Notifications** : `../../notifications/ANALYSE_NOTIFICATIONS.md`
- **Diagrammes de Séquence** : `../sequence/DIAGRAMMES_SEQUENCE_CORRECTIONS.puml`
- **Cloud Functions** : `../functions/README.md`

---

**Note** : Ce document sera mis à jour lors de l'implémentation pour refléter les décisions prises sur les questions ouvertes.
