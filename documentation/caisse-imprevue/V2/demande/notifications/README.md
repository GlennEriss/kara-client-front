# Notifications - Module Demandes Caisse Imprévue V2

> Documentation complète des notifications nécessaires pour le module Demandes Caisse Imprévue V2

## 📋 Vue d'ensemble

Ce document identifie **toutes les notifications nécessaires** pour le module Demandes Caisse Imprévue V2, incluant les notifications directes (créées lors des actions) et les notifications planifiées (scheduled).

**Module** : `caisse_imprevue`  
**Collection** : `caisseImprevueDemands`

---

## 🎯 Types de Notifications Identifiées

### Notifications Directes (Créées lors des Actions)

| ID | Type | Déclencheur | Destinataire | Priorité | Automatique ? |
|----|------|-------------|--------------|----------|---------------|
| **NOTIF-CI-001** | `caisse_imprevue_demand_created` | Création d'une demande | Tous les admins | Haute | ✅ Oui |
| **NOTIF-CI-002** | `caisse_imprevue_demand_approved` | Acceptation d'une demande | Membre + Tous les admins | Haute | ✅ Oui |
| **NOTIF-CI-003** | `caisse_imprevue_demand_rejected` | Refus d'une demande | Membre + Tous les admins | Moyenne | ✅ Oui |
| **NOTIF-CI-004** | `caisse_imprevue_demand_reopened` | Réouverture d'une demande | Tous les admins | Moyenne | ✅ Oui |
| **NOTIF-CI-005** | `caisse_imprevue_demand_converted` | Conversion en contrat | Membre + Tous les admins | Haute | ✅ Oui |
| **NOTIF-CI-006** | `caisse_imprevue_demand_deleted` | Suppression d'une demande | Tous les admins | Basse | ✅ Oui |

### Notifications Planifiées (Scheduled)

| ID | Type | Déclencheur | Destinataire | Priorité | Fréquence |
|----|------|-------------|--------------|----------|-----------|
| **NOTIF-CI-007** | `caisse_imprevue_demand_pending_reminder` | Demande en attente (J+3, J+7, J+14) | Tous les admins | Variable | Quotidienne |
| **NOTIF-CI-008** | `caisse_imprevue_demand_approved_not_converted` | Demande acceptée non convertie (J+7, J+14) | Tous les admins | Variable | Quotidienne |

---

## 📝 Détails des Notifications

### 1. **NOTIF-CI-001** : Nouvelle Demande Créée

**Déclencheur** : Admin crée une nouvelle demande via `CaisseImprevueService.createDemand()`

**Quand** : Statut initial `PENDING`, document créé dans Firestore

**Destinataire** : Tous les admins (notification globale)

**Type** : `caisse_imprevue_demand_created`

**Contenu** :
- **Titre** : "Nouvelle demande de contrat Caisse Imprévue"
- **Message** : `Une nouvelle demande a été créée par {adminName} pour {memberName}`
- **Métadonnées** :
  ```typescript
  {
    demandId: string,
    memberId: string,
    memberName: string,
    memberFirstName: string,
    memberLastName: string,
    cause: string, // Motif de la demande
    subscriptionCIID: string,
    subscriptionCICode: string,
    subscriptionCIAmountPerMonth: number,
    paymentFrequency: 'DAILY' | 'MONTHLY',
    desiredDate: string,
    createdBy: string,
    createdByName: string,
    createdAt: Date
  }
  ```

**Priorité** : Haute (nouvelle demande nécessite traitement)

**Action suggérée** : Lien vers `/caisse-imprevue/demandes/{demandId}`

**Intégration** :
```typescript
// Dans CaisseImprevueService.createDemand()
await this.notificationService.createNotification({
  module: 'caisse_imprevue',
  entityId: demandId,
  type: 'caisse_imprevue_demand_created',
  title: 'Nouvelle demande de contrat Caisse Imprévue',
  message: `Une nouvelle demande a été créée par ${adminName} pour ${memberName}`,
  metadata: {
    demandId,
    memberId,
    memberName,
    memberFirstName,
    memberLastName,
    cause,
    subscriptionCIID,
    subscriptionCICode,
    subscriptionCIAmountPerMonth,
    paymentFrequency,
    desiredDate,
    createdBy: adminId,
    createdByName: adminName,
    createdAt: new Date()
  }
})
```

---

### 2. **NOTIF-CI-002** : Demande Acceptée

**Déclencheur** : Admin accepte une demande via `CaisseImprevueService.approveDemand()`

**Quand** : Statut passe de `PENDING` → `APPROVED`

**Destinataire** : 
- Le membre concerné (si connecté)
- Tous les admins (notification globale)

**Type** : `caisse_imprevue_demand_approved`

**Contenu** :
- **Titre** : "Demande acceptée"
- **Message** : `Votre demande de contrat Caisse Imprévue a été acceptée. Raison : {decisionReason}`
- **Métadonnées** :
  ```typescript
  {
    demandId: string,
    memberId: string,
    memberName: string,
    decisionMadeBy: string,
    decisionMadeByName: string,
    decisionReason: string, // Min 10, max 500 caractères
    decisionDate: Date,
    subscriptionCIID: string,
    subscriptionCICode: string,
    subscriptionCIAmountPerMonth: number,
    paymentFrequency: 'DAILY' | 'MONTHLY',
    desiredDate: string
  }
  ```

**Priorité** : Haute (décision importante)

**Action suggérée** : Lien vers `/caisse-imprevue/demandes/{demandId}` avec suggestion de créer le contrat

**Intégration** :
```typescript
// Dans CaisseImprevueService.approveDemand()
// Notification pour le membre (si connecté)
if (memberId) {
  await this.notificationService.createNotification({
    module: 'caisse_imprevue',
    entityId: demandId,
    type: 'caisse_imprevue_demand_approved',
    title: 'Demande acceptée',
    message: `Votre demande de contrat Caisse Imprévue a été acceptée. Raison : ${decisionReason}`,
    metadata: {
      demandId,
      memberId,
      memberName,
      decisionMadeBy: adminId,
      decisionMadeByName: adminName,
      decisionReason,
      decisionDate: new Date(),
      subscriptionCIID,
      subscriptionCICode,
      subscriptionCIAmountPerMonth,
      paymentFrequency,
      desiredDate
    }
  })
}

// Notification globale pour tous les admins
await this.notificationService.createNotification({
  module: 'caisse_imprevue',
  entityId: demandId,
  type: 'caisse_imprevue_demand_approved',
  title: 'Demande acceptée',
  message: `La demande ${demandId.slice(-6)} de ${memberName} a été acceptée par ${adminName}`,
  metadata: {
    demandId,
    memberId,
    memberName,
    decisionMadeBy: adminId,
    decisionMadeByName: adminName,
    decisionReason,
    decisionDate: new Date()
  }
})
```

---

### 3. **NOTIF-CI-003** : Demande Refusée

**Déclencheur** : Admin refuse une demande via `CaisseImprevueService.rejectDemand()`

**Quand** : Statut passe de `PENDING` → `REJECTED`

**Destinataire** : 
- Le membre concerné (si connecté)
- Tous les admins (notification globale)

**Type** : `caisse_imprevue_demand_rejected`

**Contenu** :
- **Titre** : "Demande refusée"
- **Message** : `Votre demande de contrat Caisse Imprévue a été refusée. Motif : {decisionReason}`
- **Métadonnées** :
  ```typescript
  {
    demandId: string,
    memberId: string,
    memberName: string,
    decisionMadeBy: string,
    decisionMadeByName: string,
    decisionReason: string, // Min 10, max 500 caractères
    decisionDate: Date,
    cause: string // Motif original de la demande
  }
  ```

**Priorité** : Moyenne

**Action suggérée** : Lien vers `/caisse-imprevue/demandes/{demandId}` avec possibilité de réouvrir

**Intégration** :
```typescript
// Dans CaisseImprevueService.rejectDemand()
// Notification pour le membre (si connecté)
if (memberId) {
  await this.notificationService.createNotification({
    module: 'caisse_imprevue',
    entityId: demandId,
    type: 'caisse_imprevue_demand_rejected',
    title: 'Demande refusée',
    message: `Votre demande de contrat Caisse Imprévue a été refusée. Motif : ${decisionReason}`,
    metadata: {
      demandId,
      memberId,
      memberName,
      decisionMadeBy: adminId,
      decisionMadeByName: adminName,
      decisionReason,
      decisionDate: new Date(),
      cause: demand.cause
    }
  })
}

// Notification globale pour tous les admins
await this.notificationService.createNotification({
  module: 'caisse_imprevue',
  entityId: demandId,
  type: 'caisse_imprevue_demand_rejected',
  title: 'Demande refusée',
  message: `La demande ${demandId.slice(-6)} de ${memberName} a été refusée par ${adminName}`,
  metadata: {
    demandId,
    memberId,
    memberName,
    decisionMadeBy: adminId,
    decisionMadeByName: adminName,
    decisionReason,
    decisionDate: new Date()
  }
})
```

---

### 4. **NOTIF-CI-004** : Demande Réouverte

**Déclencheur** : Admin réouvre une demande refusée via `CaisseImprevueService.reopenDemand()`

**Quand** : Statut passe de `REJECTED` → `REOPENED`

**Destinataire** : Tous les admins (notification globale)

**Type** : `caisse_imprevue_demand_reopened`

**Contenu** :
- **Titre** : "Demande réouverte"
- **Message** : `La demande ${demandId.slice(-6)} de {memberName} a été réouverte par {adminName}. Raison : {reopenReason}`
- **Métadonnées** :
  ```typescript
  {
    demandId: string,
    memberId: string,
    memberName: string,
    reopenedBy: string,
    reopenedByName: string,
    reopenReason: string, // Min 10, max 500 caractères
    reopenedDate: Date,
    previousStatus: 'REJECTED',
    originalDecisionReason?: string // Motif de refus initial
  }
  ```

**Priorité** : Moyenne

**Action suggérée** : Lien vers `/caisse-imprevue/demandes/{demandId}`

**Intégration** :
```typescript
// Dans CaisseImprevueService.reopenDemand()
await this.notificationService.createNotification({
  module: 'caisse_imprevue',
  entityId: demandId,
  type: 'caisse_imprevue_demand_reopened',
  title: 'Demande réouverte',
  message: `La demande ${demandId.slice(-6)} de ${memberName} a été réouverte par ${adminName}. Raison : ${reopenReason}`,
  metadata: {
    demandId,
    memberId,
    memberName,
    reopenedBy: adminId,
    reopenedByName: adminName,
    reopenReason,
    reopenedDate: new Date(),
    previousStatus: 'REJECTED',
    originalDecisionReason: demand.decisionReason
  }
})
```

---

### 5. **NOTIF-CI-005** : Demande Convertie en Contrat

**Déclencheur** : Admin crée un contrat depuis une demande acceptée via `CaisseImprevueService.createContractFromDemand()`

**Quand** : Statut passe de `APPROVED` → `CONVERTED`, `contractId` est défini

**Destinataire** : 
- Le membre concerné (si connecté)
- Tous les admins (notification globale)

**Type** : `caisse_imprevue_demand_converted`

**Contenu** :
- **Titre** : "Contrat créé depuis votre demande"
- **Message** : `Votre demande a été convertie en contrat. Le contrat {contractId} est maintenant actif.`
- **Métadonnées** :
  ```typescript
  {
    demandId: string,
    contractId: string,
    memberId: string,
    memberName: string,
    convertedBy: string,
    convertedByName: string,
    convertedDate: Date,
    subscriptionCIID: string,
    subscriptionCICode: string,
    subscriptionCIAmountPerMonth: number,
    paymentFrequency: 'DAILY' | 'MONTHLY',
    startDate: string
  }
  ```

**Priorité** : Haute (action finale importante)

**Action suggérée** : Lien vers `/caisse-imprevue/contrats/{contractId}`

**Intégration** :
```typescript
// Dans CaisseImprevueService.createContractFromDemand()
// Notification pour le membre (si connecté)
if (memberId) {
  await this.notificationService.createNotification({
    module: 'caisse_imprevue',
    entityId: contractId,
    type: 'caisse_imprevue_demand_converted',
    title: 'Contrat créé depuis votre demande',
    message: `Votre demande a été convertie en contrat. Le contrat ${contractId} est maintenant actif.`,
    metadata: {
      demandId,
      contractId,
      memberId,
      memberName,
      convertedBy: adminId,
      convertedByName: adminName,
      convertedDate: new Date(),
      subscriptionCIID,
      subscriptionCICode,
      subscriptionCIAmountPerMonth,
      paymentFrequency,
      startDate
    }
  })
}

// Notification globale pour tous les admins
await this.notificationService.createNotification({
  module: 'caisse_imprevue',
  entityId: contractId,
  type: 'caisse_imprevue_demand_converted',
  title: 'Contrat créé depuis une demande',
  message: `La demande ${demandId.slice(-6)} de ${memberName} a été convertie en contrat ${contractId}`,
  metadata: {
    demandId,
    contractId,
    memberId,
    memberName,
    convertedBy: adminId,
    convertedByName: adminName,
    convertedDate: new Date()
  }
})
```

---

### 6. **NOTIF-CI-006** : Demande Supprimée

**Déclencheur** : Admin supprime une demande refusée via `CaisseImprevueService.deleteDemand()`

**Quand** : Document supprimé de Firestore (seulement si `status === 'REJECTED'`)

**Destinataire** : Tous les admins (notification globale)

**Type** : `caisse_imprevue_demand_deleted`

**Contenu** :
- **Titre** : "Demande supprimée"
- **Message** : `La demande ${demandId.slice(-6)} de {memberName} a été supprimée par {adminName}`
- **Métadonnées** :
  ```typescript
  {
    demandId: string,
    memberId: string,
    memberName: string,
    deletedBy: string,
    deletedByName: string,
    deletedDate: Date,
    previousStatus: 'REJECTED',
    originalDecisionReason?: string // Motif de refus initial
  }
  ```

**Priorité** : Basse (action de nettoyage)

**Action suggérée** : Aucune (document supprimé)

**Intégration** :
```typescript
// Dans CaisseImprevueService.deleteDemand()
// Créer la notification AVANT la suppression
await this.notificationService.createNotification({
  module: 'caisse_imprevue',
  entityId: demandId,
  type: 'caisse_imprevue_demand_deleted',
  title: 'Demande supprimée',
  message: `La demande ${demandId.slice(-6)} de ${memberName} a été supprimée par ${adminName}`,
  metadata: {
    demandId,
    memberId,
    memberName,
    deletedBy: adminId,
    deletedByName: adminName,
    deletedDate: new Date(),
    previousStatus: 'REJECTED',
    originalDecisionReason: demand.decisionReason
  }
})

// Puis supprimer le document
await this.repository.delete(demandId)
```

---

### 7. **NOTIF-CI-007** : Rappel Demande en Attente

**Déclencheur** : Cloud Function programmée `remindPendingCaisseImprevueDemands()`

**Quand** : Demande en statut `PENDING` depuis 3, 7 ou 14 jours

**Destinataire** : Tous les admins (notification globale)

**Type** : `caisse_imprevue_demand_pending_reminder`

**Contenu** :
- **Titre** : `Demande en attente depuis {daysPending} jour(s)`
- **Message** : `La demande {demandId.slice(-6)} de {memberName} est en attente depuis {daysPending} jour(s).`
- **Métadonnées** :
  ```typescript
  {
    demandId: string,
    daysPending: number, // 3, 7 ou 14
    createdAt: Date,
    memberId: string,
    memberName: string,
    reminderLevel: 'normal' | 'warning' | 'urgent', // 3j, 7j, 14j
    notificationDate: string // YYYY-MM-DD pour déduplication
  }
  ```

**Priorité** : Variable selon `reminderLevel`
- `normal` (3 jours) : Basse
- `warning` (7 jours) : Moyenne
- `urgent` (14 jours) : Haute

**Fréquence** : Quotidienne à 8h00 (heure locale)

**Déduplication** : Une seule notification par demande et par jour (J+3, J+7, J+14)

**Fichier** : `functions/src/scheduled/caisseImprevueDemandReminders.ts`

**Statut** : ✅ Déjà implémenté

---

### 8. **NOTIF-CI-008** : Rappel Demande Acceptée Non Convertie

**Déclencheur** : Cloud Function programmée `remindApprovedNotConvertedCaisseImprevueDemands()`

**Quand** : Demande en statut `APPROVED` sans `contractId` depuis 7 ou 14 jours

**Destinataire** : Tous les admins (notification globale)

**Type** : `caisse_imprevue_demand_approved_not_converted`

**Contenu** :
- **Titre** : `Demande acceptée non convertie depuis {daysSinceApproval} jour(s)`
- **Message** : `La demande {demandId.slice(-6)} de {memberName} a été acceptée il y a {daysSinceApproval} jour(s) mais n'a pas encore été convertie en contrat.`
- **Métadonnées** :
  ```typescript
  {
    demandId: string,
    daysSinceApproval: number, // 7 ou 14
    approvedAt: Date,
    memberId: string,
    memberName: string,
    reminderLevel: 'warning' | 'urgent', // 7j, 14j
    notificationDate: string // YYYY-MM-DD pour déduplication
  }
  ```

**Priorité** : Variable selon `reminderLevel`
- `warning` (7 jours) : Moyenne
- `urgent` (14 jours) : Haute

**Fréquence** : Quotidienne à 8h00 (heure locale)

**Déduplication** : Une seule notification par demande et par jour (J+7, J+14)

**Fichier** : `functions/src/scheduled/caisseImprevueDemandReminders.ts`

**Statut** : ✅ Déjà implémenté

---

## 🔧 Format des Notifications

**Le format respecte la classe `Notification` du système global** :

```typescript
interface Notification {
  id: string                           // Auto-généré par Firestore
  module: 'caisse_imprevue'             // NotificationModule.caisse_imprevue
  entityId: string                      // demandId ou contractId
  type: NotificationType                // Type de notification (voir ci-dessous)
  title: string                          // Titre de la notification
  message: string                        // Message descriptif
  isRead: boolean                        // État de lecture
  createdAt: Date                        // Date de création
  scheduledAt?: Date                     // Pour notifications programmées (NOTIF-CI-007, 008)
  sentAt?: Date                          // Date d'envoi (optionnel)
  metadata?: Record<string, any>         // Métadonnées spécifiques
}
```

### Types de Notifications

Les types suivants sont **déjà définis** dans `src/types/types.ts` :

```typescript
type NotificationType =
  | 'caisse_imprevue_demand_created'              // NOTIF-CI-001
  | 'caisse_imprevue_demand_approved'             // NOTIF-CI-002
  | 'caisse_imprevue_demand_rejected'            // NOTIF-CI-003
  | 'caisse_imprevue_demand_reopened'            // NOTIF-CI-004
  | 'caisse_imprevue_demand_converted'           // NOTIF-CI-005
  | 'caisse_imprevue_demand_deleted'             // NOTIF-CI-006 (à ajouter si non présent)
  | 'caisse_imprevue_demand_pending_reminder'    // NOTIF-CI-007
  | 'caisse_imprevue_demand_approved_not_converted' // NOTIF-CI-008
```

---

## 🔧 Intégration dans le Code

### NotificationService Extension

Ajouter une méthode dédiée dans `NotificationService` (optionnel, pour centraliser) :

```typescript
async createCaisseImprevueDemandNotification(
  demandId: string,
  type: 'caisse_imprevue_demand_created' | 'caisse_imprevue_demand_approved' | ...,
  memberName?: string,
  adminName?: string,
  metadata?: Record<string, any>
): Promise<Notification> {
  return this.repository.create({
    module: 'caisse_imprevue',
    entityId: demandId,
    type,
    title: '...',
    message: '...',
    isRead: false,
    createdAt: new Date(),
    metadata: { demandId, memberName, adminName, ...metadata }
  })
}
```

### Points d'Intégration dans CaisseImprevueService

1. **`createDemand()`** → Créer `NOTIF-CI-001`
2. **`approveDemand()`** → Créer `NOTIF-CI-002`
3. **`rejectDemand()`** → Créer `NOTIF-CI-003`
4. **`reopenDemand()`** → Créer `NOTIF-CI-004`
5. **`createContractFromDemand()`** → Créer `NOTIF-CI-005`
6. **`deleteDemand()`** → Créer `NOTIF-CI-006`

### Cloud Functions (Notifications Planifiées)

**Fichier** : `functions/src/scheduled/caisseImprevueDemandReminders.ts`

**Fonctions** :
- `remindPendingCaisseImprevueDemands()` → Créer `NOTIF-CI-007`
- `remindApprovedNotConvertedCaisseImprevueDemands()` → Créer `NOTIF-CI-008`

**Planification** :
- Exécution quotidienne à 8h00 (heure locale, UTC+1)

**Statut** : ✅ Déjà implémenté

---

## 📊 Récapitulatif des Notifications

### Notifications Directes

| ID | Type | Déclencheur | Destinataire | Priorité | Statut |
|----|------|-------------|--------------|----------|--------|
| **NOTIF-CI-001** | `caisse_imprevue_demand_created` | `createDemand()` | Tous les admins | Haute | ❌ À implémenter |
| **NOTIF-CI-002** | `caisse_imprevue_demand_approved` | `approveDemand()` | Membre + Admins | Haute | ❌ À implémenter |
| **NOTIF-CI-003** | `caisse_imprevue_demand_rejected` | `rejectDemand()` | Membre + Admins | Moyenne | ❌ À implémenter |
| **NOTIF-CI-004** | `caisse_imprevue_demand_reopened` | `reopenDemand()` | Tous les admins | Moyenne | ❌ À implémenter |
| **NOTIF-CI-005** | `caisse_imprevue_demand_converted` | `createContractFromDemand()` | Membre + Admins | Haute | ❌ À implémenter |
| **NOTIF-CI-006** | `caisse_imprevue_demand_deleted` | `deleteDemand()` | Tous les admins | Basse | ❌ À implémenter |

### Notifications Planifiées

| ID | Type | Déclencheur | Destinataire | Priorité | Statut |
|----|------|-------------|--------------|----------|--------|
| **NOTIF-CI-007** | `caisse_imprevue_demand_pending_reminder` | Cloud Function (J+3, J+7, J+14) | Tous les admins | Variable | ✅ Implémenté |
| **NOTIF-CI-008** | `caisse_imprevue_demand_approved_not_converted` | Cloud Function (J+7, J+14) | Tous les admins | Variable | ✅ Implémenté |

---

## ✅ Checklist d'Implémentation

### Notifications Directes

- [ ] Intégrer `NOTIF-CI-001` dans `CaisseImprevueService.createDemand()`
- [ ] Intégrer `NOTIF-CI-002` dans `CaisseImprevueService.approveDemand()`
- [ ] Intégrer `NOTIF-CI-003` dans `CaisseImprevueService.rejectDemand()`
- [ ] Intégrer `NOTIF-CI-004` dans `CaisseImprevueService.reopenDemand()`
- [ ] Intégrer `NOTIF-CI-005` dans `CaisseImprevueService.createContractFromDemand()`
- [ ] Intégrer `NOTIF-CI-006` dans `CaisseImprevueService.deleteDemand()`

### Notifications Planifiées

- [x] Vérifier que `remindPendingCaisseImprevueDemands()` est déployée
- [x] Vérifier que `remindApprovedNotConvertedCaisseImprevueDemands()` est déployée
- [ ] Vérifier la planification (quotidienne à 8h00)

### Types et Validation

- [x] Vérifier que tous les types sont définis dans `src/types/types.ts`
- [ ] Ajouter `caisse_imprevue_demand_deleted` si non présent
- [ ] Vérifier que `NotificationService` est injecté dans `CaisseImprevueService`

---

## 📚 Références

- **Architecture des notifications** : [`../../notifications/ARCHITECTURE_NOTIFICATIONS.md`](../../notifications/ARCHITECTURE_NOTIFICATIONS.md)
- **Système de notifications global** : [`../../notifications/README.md`](../../notifications/README.md)
- **Solutions proposées V2** : [`../SOLUTIONS_PROPOSEES.md`](../SOLUTIONS_PROPOSEES.md)
- **Documentation V1** : [`../../V1/DEMANDES_CAISSE_IMPREVUE.md`](../../V1/DEMANDES_CAISSE_IMPREVUE.md)
- **Cloud Functions** : [`functions/src/scheduled/caisseImprevueDemandReminders.ts`](../../../../functions/src/scheduled/caisseImprevueDemandReminders.ts)

---

**Date de création** : 2026-01-27  
**Version** : V2  
**Auteur** : Senior Dev
