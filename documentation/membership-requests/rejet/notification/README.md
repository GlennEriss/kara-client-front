# Notifications - Fonctionnalité "Rejet d'une Demande d'Adhésion"

## 📋 Vue d'ensemble

Ce document identifie **toutes les notifications nécessaires** pour la fonctionnalité de rejet d'une demande d'adhésion et les actions post-rejet.

**Use Case** : UC-MEM-XXX - Rejeter une demande d'adhésion

**Module** : `memberships`

---

## 🎯 Types de Notifications Identifiées

### 1. **NOTIF-REJET-001** : Envoi WhatsApp au Demandeur (Admin → Demandeur) ⚠️ OPTIONNEL

**Déclencheur** : Admin clique sur bouton "Envoyer WhatsApp" dans l'interface (après rejet)

**Quand** : Après qu'une demande a été rejetée (`status = 'rejected'`)

**Destinataire** : Le demandeur (via WhatsApp)

**Type** : Action manuelle via interface admin (pas d'envoi automatique)

**Interface** : Bouton WhatsApp dans les actions disponibles sur demande rejetée

**Composant** : `RejectWhatsAppModalV2` (similaire à `SendWhatsAppModalV2` des corrections)

**Fonctionnement** :
1. Admin clique sur bouton "Envoyer WhatsApp" (visible si `status = 'rejected'`)
2. Modal `RejectWhatsAppModalV2` s'ouvre
3. **Si plusieurs numéros** : Select pour choisir le numéro WhatsApp
4. **Si un seul numéro** : Affiche directement le numéro
5. Message template prérempli avec motif de rejet (modifiable)
6. Admin peut modifier le message avant envoi
7. Bouton "Envoyer" qui ouvre WhatsApp avec le message vers le numéro sélectionné

**Template de Message WhatsApp** :
```
Bonjour {firstName},

Votre demande d'adhésion KARA (matricule: {matricule}) a été rejetée.

Motif de rejet:
{motifReject}

Pour toute question, veuillez contacter notre service client.

Cordialement,
KARA Mutuelle
```

**Priorité** : Optionnel (non prioritaire pour l'instant)

**Note** : 
- L'envoi email/SMS automatique via Cloud Function est **optionnel** et non prioritaire (voir `functions/onMembershipRequestRejected.md`)
- Pour l'instant, utiliser le bouton WhatsApp dans l'interface admin (similaire à celui des corrections)

---

### 2. **NOTIF-REJET-002** : Demande Rejetée (Admin → Admin)

**Déclencheur** : Admin rejette une demande via `MembershipServiceV2.rejectMembershipRequest()`

**Quand** : Statut passe de `pending` ou `under_review` → `rejected`

**Destinataire** : Tous les admins (ou seulement les autres admins sauf celui qui a rejeté ?)

**Type** : `membership_rejected` (nouveau type) ou `status_update` (type générique)

**Contenu** :
- **Titre** : "Demande d'adhésion rejetée"
- **Message** : `{adminName} a rejeté la demande de {memberName}. Motif: {motifReject}`
- **Métadonnées** :
  ```typescript
  {
    requestId: string,
    memberName: string,
    adminName: string,
    adminId: string,
    status: 'rejected',
    motifReject: string,
    processedAt: Date,
    processedBy: string
  }
  ```

**Priorité** : Moyenne

**Action suggérée** : Lien vers `/membership-requests/{requestId}`

**Note** : Créée dans Firestore pour affichage dans le centre de notifications des admins

---

### 3. **NOTIF-REJET-003** : Dossier Réouvert (Admin → Admin)

**Déclencheur** : Admin réouvre un dossier rejeté via `MembershipServiceV2.reopenMembershipRequest()`

**Quand** : Statut passe de `rejected` → `under_review`

**Destinataire** : Tous les admins (ou seulement les autres admins sauf celui qui a réouvert ?)

**Type** : `membership_reopened` (nouveau type) ou `status_update` (type générique)

**Contenu** :
- **Titre** : "Dossier réouvert"
- **Message** : `{adminName} a réouvert le dossier de {memberName}. Motif: {reopenReason}`
- **Métadonnées** :
  ```typescript
  {
    requestId: string,
    memberName: string,
    adminName: string,
    adminId: string,
    status: 'under_review',
    reopenReason: string,
    reopenedAt: Date,
    reopenedBy: string,
    previousStatus: 'rejected',
    previousMotifReject: string
  }
  ```

**Priorité** : Haute (la demande revient en attente, nécessite une revue)

**Action suggérée** : Lien vers `/membership-requests/{requestId}`

---

### 4. **NOTIF-REJET-004** : Dossier Supprimé (Admin → Admin) ⚠️ OPTIONNEL

**Déclencheur** : Admin supprime définitivement un dossier rejeté via Cloud Function `deleteMembershipRequest`

**Quand** : Dossier rejeté supprimé définitivement

**Destinataire** : Tous les admins (ou seulement les super admins ?)

**Type** : `membership_deleted` (nouveau type)

**Contenu** :
- **Titre** : "Dossier supprimé définitivement"
- **Message** : `{adminName} a supprimé définitivement le dossier de {memberName} (matricule: {matricule})`
- **Métadonnées** :
  ```typescript
  {
    requestId: string,
    memberName: string,
    matricule: string,
    adminName: string,
    adminId: string,
    deletedAt: Date,
    deletedBy: string,
    reason: 'Suppression définitive d\'une demande rejetée',
    metadata: {
      status: 'rejected',
      motifReject: string,
      processedAt: Date,
      processedBy: string
    }
  }
  ```

**Priorité** : Haute (action critique, audit important)

**Action suggérée** : Aucune (le dossier n'existe plus), affichage dans historique/audit

**Note** : Cette notification peut servir de log d'audit pour traçabilité

---

## 📊 Récapitulatif des Notifications

| ID | Type | Déclencheur | Destinataire | Priorité | Automatique ? | Format |
|----|------|-------------|--------------|----------|---------------|--------|
| **NOTIF-REJET-001** | WhatsApp au demandeur | Bouton admin (manuel) | Demandeur | 🟢 Optionnel | ❌ Non (manuel) | WhatsApp Web |
| **NOTIF-REJET-002** | `membership_rejected` | Service client | Tous les admins | Moyenne | ✅ Oui | Firestore |
| **NOTIF-REJET-003** | `membership_reopened` | Service client | Tous les admins | Haute | ✅ Oui | Firestore |
| **NOTIF-REJET-004** | `membership_deleted` | Cloud Function | Tous les admins | Haute | ✅ Oui (Optionnel) | Firestore + Audit |

---

## 🔧 Format des Notifications Firestore

**Le format respecte la classe `Notification` du diagramme de classes** :

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
  metadata?: Record<string, any>       // Métadonnées spécifiques
  requestId?: string                   // ID de la demande (pour compatibilité)
}
```

### Types de Notifications à Ajouter dans l'Enum

Les types suivants doivent être **ajoutés à l'enum `NotificationType`** :

```typescript
export type NotificationType =
  | 'birthday_reminder'
  | 'new_request'
  | 'status_update'
  | 'reminder'
  | 'membership_approved'      // Existant (approbation)
  | 'membership_rejected'      // ⭐ NOUVEAU - NOTIF-REJET-002
  | 'membership_reopened'      // ⭐ NOUVEAU - NOTIF-REJET-003
  | 'membership_deleted'       // ⭐ NOUVEAU - NOTIF-REJET-004 (optionnel)
  | 'corrections_requested'    // Existant (corrections)
  | 'corrections_submitted'    // Existant (corrections)
  | ...
```

---

## 🔧 Intégration dans le Code

### NotificationService Extension

Ajouter des méthodes dédiées dans `NotificationService` :

```typescript
/**
 * Crée une notification pour le rejet d'une demande d'adhésion
 */
async createRejectionNotification(
  requestId: string,
  memberName: string,
  adminName: string,
  adminId: string,
  motifReject: string,
  processedAt: Date
): Promise<Notification> {
  return this.repository.create({
    module: 'memberships',
    entityId: requestId,
    type: 'membership_rejected',
    title: 'Demande d\'adhésion rejetée',
    message: `${adminName} a rejeté la demande de ${memberName}. Motif: ${motifReject}`,
    isRead: false,
    createdAt: new Date(),
    metadata: {
      requestId,
      memberName,
      adminName,
      adminId,
      status: 'rejected',
      motifReject,
      processedAt: processedAt.toISOString(),
    },
  })
}

/**
 * Crée une notification pour la réouverture d'un dossier rejeté
 */
async createReopeningNotification(
  requestId: string,
  memberName: string,
  adminName: string,
  adminId: string,
  reopenReason: string,
  reopenedAt: Date,
  previousMotifReject?: string
): Promise<Notification> {
  return this.repository.create({
    module: 'memberships',
    entityId: requestId,
    type: 'membership_reopened',
    title: 'Dossier réouvert',
    message: `${adminName} a réouvert le dossier de ${memberName}. Motif: ${reopenReason}`,
    isRead: false,
    createdAt: new Date(),
    metadata: {
      requestId,
      memberName,
      adminName,
      adminId,
      status: 'under_review',
      reopenReason,
      reopenedAt: reopenedAt.toISOString(),
      reopenedBy: adminId,
      previousStatus: 'rejected',
      previousMotifReject,
    },
  })
}

/**
 * Crée une notification pour la suppression définitive d'un dossier
 */
async createDeletionNotification(
  requestId: string,
  memberName: string,
  matricule: string,
  adminName: string,
  adminId: string,
  deletedAt: Date,
  previousMotifReject?: string
): Promise<Notification> {
  return this.repository.create({
    module: 'memberships',
    entityId: requestId,
    type: 'membership_deleted',
    title: 'Dossier supprimé définitivement',
    message: `${adminName} a supprimé définitivement le dossier de ${memberName} (matricule: ${matricule})`,
    isRead: false,
    createdAt: new Date(),
    metadata: {
      requestId,
      memberName,
      matricule,
      adminName,
      adminId,
      deletedAt: deletedAt.toISOString(),
      deletedBy: adminId,
      reason: 'Suppression définitive d\'une demande rejetée',
      previousStatus: 'rejected',
      previousMotifReject,
    },
  })
}
```

### Points d'Intégration

1. **MembershipServiceV2.rejectMembershipRequest()** → Créer `NOTIF-REJET-002`
2. **Bouton WhatsApp dans interface admin** → Envoyer `NOTIF-REJET-001` (WhatsApp - manuel)
3. **MembershipServiceV2.reopenMembershipRequest()** → Créer `NOTIF-REJET-003`
4. **Cloud Function deleteMembershipRequest** → Créer `NOTIF-REJET-004` (optionnel)

**Note** : L'envoi email/SMS automatique via Cloud Function (`onMembershipRequestRejected`) est **optionnel** et non prioritaire pour l'instant.

---

## 📱 Affichage dans l'Interface

### 1. Notification Bell

**Composant** : `src/components/layout/NotificationBell.tsx`

#### NOTIF-REJET-002 : Demande Rejetée

```
┌─────────────────────────────────────────┐
│  🚫 Demande d'adhésion rejetée          │
│                                         │
│  Admin a rejeté la demande de Jean    │
│  Dupont. Motif: [motif de rejet]      │
│                                         │
│  Il y a 5 minutes                       │
└─────────────────────────────────────────┘
```

#### NOTIF-REJET-003 : Dossier Réouvert

```
┌─────────────────────────────────────────┐
│  🔄 Dossier réouvert                    │
│                                         │
│  Admin a réouvert le dossier de Jean  │
│  Dupont. Motif: [motif de réouverture] │
│                                         │
│  Il y a 2 minutes                       │
└─────────────────────────────────────────┘
```

#### NOTIF-REJET-004 : Dossier Supprimé

```
┌─────────────────────────────────────────┐
│  🗑️ Dossier supprimé définitivement     │
│                                         │
│  Admin a supprimé le dossier de Jean  │
│  Dupont (MK-2024-001234)               │
│                                         │
│  Il y a 1 heure                         │
└─────────────────────────────────────────┘
```

### 2. Navigation au Clic

**Actions** :
- **NOTIF-REJET-002** : Rediriger vers `/membership-requests/{requestId}` (dossier rejeté)
- **NOTIF-REJET-003** : Rediriger vers `/membership-requests/{requestId}` (dossier réouvert)
- **NOTIF-REJET-004** : Aucune action (dossier supprimé), affichage dans historique/audit

### 3. Badge de Notification

**Affichage** : Badge rouge avec le nombre de notifications non lues

**Mise à jour** : Automatique via React Query

---

## 🔄 Flux de Notifications

### Flux 1 : Rejet d'une Demande

1. Admin rejette la demande via `RejectModalV2`
2. Service `MembershipServiceV2.rejectMembershipRequest()` met à jour Firestore
3. Service crée notification Firestore pour admins (`NOTIF-REJET-002`)
4. Admins voient la notification dans Notification Bell
5. **(Optionnel)** Admin clique sur bouton "Envoyer WhatsApp" pour notifier le demandeur (`NOTIF-REJET-001`)
6. **(Optionnel)** Modal `RejectWhatsAppModalV2` s'ouvre avec sélection du numéro et message template
7. **(Optionnel)** Admin envoie le message via WhatsApp

**Note** : L'envoi email/SMS automatique via Cloud Function est **optionnel** et non prioritaire pour l'instant.

### Flux 2 : Réouverture d'un Dossier

1. Admin réouvre le dossier via `ReopenModalV2`
2. Service `MembershipServiceV2.reopenMembershipRequest()` met à jour Firestore
3. Service crée notification Firestore pour admins (`NOTIF-REJET-003`)
4. Admins voient la notification dans Notification Bell

### Flux 3 : Suppression d'un Dossier

1. Admin supprime le dossier via `DeleteModalV2`
2. Cloud Function `deleteMembershipRequest` supprime Firestore + Storage
3. Cloud Function crée notification Firestore pour admins (`NOTIF-REJET-004`)
4. Cloud Function crée log d'audit dans `audit-logs`
5. Admins voient la notification dans Notification Bell

---

## 📝 Questions à Déterminer

1. **Destinataires pour NOTIF-REJET-002** : Notifier tous les admins ou seulement ceux qui suivent la demande ?
2. **Destinataires pour NOTIF-REJET-003** : Notifier tous les admins ou seulement ceux qui suivent la demande ?
3. **Destinataires pour NOTIF-REJET-004** : Notifier tous les admins ou seulement les super admins ?
4. **NOTIF-REJET-004** : Est-ce nécessaire ? Ou seul le log d'audit suffit-il ?
5. **NOTIF-REJET-001** : Format du message WhatsApp (actuellement template avec motif de rejet, modifiable)

---

## 🔒 Sécurité

### Règles Firestore

**Lecture** : Seuls les admins peuvent lire les notifications

**Écriture** : Seuls les admins peuvent créer des notifications (via le service ou Cloud Function)

**Exemple de règle** :
```javascript
match /notifications/{notificationId} {
  allow read: if isAdmin()
  allow create: if isAdmin() || isCloudFunction()
  allow update: if isAdmin()
  allow delete: if isAdmin()
}
```

### Protection des Données Personnelles

- **Email/SMS** : Envoyés uniquement au demandeur concerné
- **Notifications Firestore** : Ne contiennent pas de données sensibles (pas de mots de passe, etc.)
- **Logs d'audit** : Peuvent contenir des informations pour traçabilité, mais respectent le RGPD

---

## 🎨 Personnalisation

### Messages Personnalisés

**Option 1** : Message générique
```typescript
message: `${adminName} a rejeté la demande de ${memberName}.`
```

**Option 2** : Message détaillé
```typescript
message: `${adminName} a rejeté la demande de ${memberName} (${matricule}). Motif: ${motifReject}`
```

### Badges ou Icônes

**Options** :
- 🚫 Rouge pour rejet (`membership_rejected`)
- 🔄 Bleu pour réouverture (`membership_reopened`)
- 🗑️ Gris/Rouge pour suppression (`membership_deleted`)

---

## 📊 Collection Firestore

**Collection** : `notifications`

**Structure** :
```typescript
notifications/
  {notificationId}/
    - id: string
    - module: 'memberships'
    - entityId: string  // requestId
    - type: 'membership_rejected' | 'membership_reopened' | 'membership_deleted'
    - title: string
    - message: string
    - isRead: boolean
    - createdAt: Timestamp
    - metadata: {
        requestId: string
        memberName: string
        adminName: string
        adminId: string
        // ... autres métadonnées spécifiques
      }
```

---

## 📚 Références

- **Workflow Rejet** : `../FLUX_REJET.md`
- **Actions Post-Rejet** : `../ACTIONS_POST_REJET.md`
- **Cloud Functions** : `../functions/README.md`
- **NotificationService** : `src/services/notifications/NotificationService.ts`
- **NotificationBell** : `src/components/layout/NotificationBell.tsx`
- **Types** : `src/types/types.ts` (interface Notification)
- **Documentation Corrections** : `../corrections/notification/README.md` (référence)
- **Documentation Approbation** : `../approbation/notification/README.md` (référence)

---

**Note** : Ce document sera mis à jour lors de l'implémentation pour refléter les décisions prises sur les questions ouvertes.
