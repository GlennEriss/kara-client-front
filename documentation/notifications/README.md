# Système de Notifications - Documentation Technique

> Documentation centralisée du système de notifications pour le projet KARA.

## Table des matières

1. [Vue d'ensemble](#vue-densemble)
2. [Architecture](#architecture)
3. [Types de notifications](#types-de-notifications)
4. [Modules et entités](#modules-et-entités)
5. [Structure des fichiers](#structure-des-fichiers)
6. [API et interfaces](#api-et-interfaces)
7. [Hooks React](#hooks-react)
8. [Jobs planifiés](#jobs-planifiés)
9. [Firestore](#firestore)
10. [Utilisation](#utilisation)

---

## Vue d'ensemble

Le système de notifications de KARA est un système **multi-modules** qui permet de :

- **Alerter** les admins sur des événements importants (nouvelles demandes, échéances, anniversaires)
- **Suivre** l'état des processus métier (approbations, rejets, rappels)
- **Planifier** des notifications automatiques via des jobs Cloud Functions

### Caractéristiques principales

| Fonctionnalité | Description |
|----------------|-------------|
| **Multi-modules** | Notifications pour memberships, véhicule, caisse spéciale, crédit, placement, etc. |
| **Types variés** | Anniversaires, nouvelles demandes, changements de statut, rappels, échéances |
| **Lecture/Non-lue** | Système de marquage lu/non-lu avec compteur |
| **Métadonnées** | Données contextuelles pour chaque notification |
| **Jobs planifiés** | Génération automatique via Cloud Functions |
| **Anti-doublon** | Vérification avant création pour éviter les doublons |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                           FRONTEND                                   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐ │
│  │ NotificationBell│    │ Hooks React     │    │ Composants UI   │ │
│  │ (Badge + Liste) │◄───│ (useUnread...)  │◄───│ (Toast, etc.)   │ │
│  └────────┬────────┘    └────────┬────────┘    └─────────────────┘ │
│           │                      │                                  │
│           ▼                      ▼                                  │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │              NotificationService                              │  │
│  │  - createNotification()     - markAsRead()                    │  │
│  │  - createBirthdayNotification()  - markAllAsRead()            │  │
│  │  - createRejectionNotification() - getUnreadCount()           │  │
│  └────────────────────────────┬─────────────────────────────────┘  │
│                               │                                     │
│                               ▼                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │              NotificationRepository                           │  │
│  │  - create()                 - getById()                       │  │
│  │  - getUnreadNotifications() - markAsRead()                    │  │
│  │  - getNotificationsByModule() - markAllAsRead()               │  │
│  └────────────────────────────┬─────────────────────────────────┘  │
│                               │                                     │
└───────────────────────────────┼─────────────────────────────────────┘
                                │
                                ▼
┌───────────────────────────────────────────────────────────────────┐
│                         FIRESTORE                                  │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │  Collection: notifications                                   │  │
│  │  - module, entityId, type, title, message                    │  │
│  │  - isRead, createdAt, scheduledAt, sentAt, metadata          │  │
│  └─────────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────────┘
                                ▲
                                │
┌───────────────────────────────┼─────────────────────────────────────┐
│                         CLOUD FUNCTIONS                             │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  Jobs Scheduled (Cron)                                       │   │
│  │  - dailyBirthdayNotifications (08:00)                        │   │
│  │  - dailyOverdueCommissions (09:00)                           │   │
│  │  - dailyCreditPaymentDue (09:30)                             │   │
│  │  - etc.                                                      │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Types de notifications

### NotificationModule

Modules supportés pour les notifications :

```typescript
type NotificationModule = 
  | 'memberships'      // Demandes d'adhésion, membres
  | 'vehicule'         // Véhicules, assurances
  | 'caisse_speciale'  // Caisse spéciale
  | 'caisse_imprevue'  // Caisse imprévue
  | 'bienfaiteur'      // Bienfaiteurs
  | 'placement'        // Placements
  | 'credit_speciale'  // Crédits spéciaux
```

### NotificationType

Types de notifications par catégorie :

#### Membres & Adhésions

| Type | Description | Métadonnées |
|------|-------------|-------------|
| `birthday_reminder` | Anniversaire (J-2, J, J+1) | `memberId`, `age`, `daysUntil` |
| `new_request` | Nouvelle demande d'adhésion | `requestId`, `memberName` |
| `status_update` | Changement de statut | `requestId`, `status` |
| `membership_rejected` | Demande rejetée | `requestId`, `motifReject`, `adminId` |
| `membership_reopened` | Dossier réouvert | `requestId`, `reopenReason` |
| `membership_deleted` | Dossier supprimé | `requestId`, `matricule` |

#### Placements

| Type | Description | Métadonnées |
|------|-------------|-------------|
| `placement_activated` | Placement activé | `placementId`, `memberId` |
| `commission_due_reminder` | Rappel avant échéance | `placementId`, `dueDate` |
| `commission_overdue` | Commission en retard | `placementId`, `daysOverdue` |
| `early_exit_request` | Demande retrait anticipé | `placementId` |
| `placement_completed` | Placement terminé | `placementId` |

#### Caisse Spéciale / Imprévue

| Type | Description | Métadonnées |
|------|-------------|-------------|
| `demand_created` | Nouvelle demande | `demandId`, `memberId` |
| `demand_approved` | Demande acceptée | `demandId`, `amount` |
| `demand_rejected` | Demande refusée | `demandId`, `motif` |
| `demand_converted` | Convertie en contrat | `demandId`, `contractId` |
| `demand_pending_reminder` | Rappel en attente | `demandId`, `daysPending` |

#### Crédits & Contrats

| Type | Description | Métadonnées |
|------|-------------|-------------|
| `contract_expiring` | Contrat qui expire | `contractId`, `expiryDate` |
| `contract_created` | Contrat créé | `contractId`, `memberId` |
| `contract_finished` | Contrat terminé | `contractId` |
| `contract_canceled` | Contrat résilié | `contractId`, `reason` |
| `payment_due` | Paiement dû | `contractId`, `amount`, `dueDate` |

#### Véhicules

| Type | Description | Métadonnées |
|------|-------------|-------------|
| `insurance_expiring` | Assurance expire bientôt | `vehicleId`, `expiryDate` |

---

## Structure des fichiers

```
src/
├── services/
│   └── notifications/
│       ├── NotificationService.ts          # Service principal
│       └── __tests__/
│           └── unit/
│               └── NotificationService.test.ts
│
├── repositories/
│   └── notifications/
│       ├── INotificationRepository.ts      # Interface
│       └── NotificationRepository.ts       # Implémentation Firestore
│
├── hooks/
│   └── notifications/
│       ├── index.ts                        # Barrel export
│       ├── useNotifications.ts             # Liste avec filtres
│       ├── useUnreadNotifications.ts       # Liste non lues
│       ├── useUnreadCount.ts               # Compteur badge
│       ├── useMarkNotificationAsRead.ts    # Marquer une comme lue
│       └── useMarkAllNotificationsAsRead.ts # Tout marquer comme lu
│
├── types/
│   └── types.ts                            # Types Notification, NotificationModule, etc.
│
└── components/
    └── layout/
        └── NotificationBell.tsx            # Composant UI (cloche)

functions/
└── src/
    ├── index.ts                            # Export des jobs
    └── scheduled/
        ├── birthdayNotifications.ts        # Job anniversaires
        ├── scheduledNotifications.ts       # Job notifications programmées
        ├── overdueCommissions.ts           # Job commissions en retard
        ├── creditPaymentDue.ts             # Job échéances crédit
        ├── ciPaymentDue.ts                 # Job échéances CI
        ├── vehicleInsuranceExpiring.ts     # Job assurances
        ├── caisseSpecialeDemandReminders.ts # Rappels CS
        └── caisseImprevueDemandReminders.ts # Rappels CI
```

---

## API et interfaces

### Interface Notification

```typescript
interface Notification {
  id: string
  module: NotificationModule
  entityId: string              // ID de la ressource (memberId, requestId, etc.)
  type: NotificationType
  title: string
  message: string
  isRead: boolean
  createdAt: Date
  scheduledAt?: Date            // Pour notifications programmées
  sentAt?: Date                 // Quand marquée comme envoyée
  metadata?: {
    [key: string]: any
    // Champs courants
    memberId?: string
    memberName?: string
    adminId?: string
    adminName?: string
    status?: string
    // Spécifique anniversaires
    age?: number
    daysUntil?: number
    birthDate?: string
    notificationDate?: string   // YYYY-MM-DD (anti-doublon)
  }
}
```

### Interface NotificationFilters

```typescript
interface NotificationFilters {
  module?: NotificationModule
  type?: NotificationType
  isRead?: boolean
  dateFrom?: Date
  dateTo?: Date
}
```

### NotificationService API

```typescript
class NotificationService {
  // Création
  createNotification(params: CreateParams): Promise<Notification>
  createBirthdayNotification(memberId, firstName, lastName, birthDate, daysUntil): Promise<Notification>
  createMembershipRequestNotification(requestId, type, memberName?, status?): Promise<Notification>
  createRejectionNotification(requestId, memberName, adminName, adminId, motif, processedAt): Promise<Notification>
  createReopeningNotification(requestId, memberName, adminName, adminId, reason, reopenedAt, prevMotif?): Promise<Notification>
  createDeletionNotification(requestId, memberName, matricule, adminName, adminId, deletedAt, prevMotif?): Promise<Notification>
  
  // Lecture
  getUnreadCount(): Promise<number>
  getUnreadNotifications(limit?: number): Promise<Notification[]>
  getNotifications(filters?: NotificationFilters): Promise<Notification[]>
  
  // Mutations
  markAsRead(id: string): Promise<void>
  markAllAsRead(): Promise<void>
  markAsReadByModule(module: NotificationModule): Promise<void>
  
  // Utilitaires
  formatNotificationMessage(type, metadata): string
  shouldCreateNotification(type, context): boolean
}
```

---

## Hooks React

### useUnreadCount

Récupère le nombre de notifications non lues (pour le badge).

```typescript
function useUnreadCount() {
  return useQuery({
    queryKey: ['notifications', 'unreadCount'],
    queryFn: () => notificationService.getUnreadCount(),
    staleTime: 30 * 1000,       // 30 secondes
    refetchInterval: 60 * 1000, // Rafraîchit toutes les 60s
  })
}

// Usage
const { data: count, isLoading } = useUnreadCount()
```

### useUnreadNotifications

Récupère la liste des notifications non lues.

```typescript
function useUnreadNotifications(limit: number = 50) {
  return useQuery({
    queryKey: ['notifications', 'unread', limit],
    queryFn: () => notificationService.getUnreadNotifications(limit),
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  })
}

// Usage
const { data: notifications, isLoading } = useUnreadNotifications(20)
```

### useNotifications

Récupère les notifications avec filtres optionnels.

```typescript
function useNotifications(filters?: NotificationFilters) {
  return useQuery({
    queryKey: ['notifications', filters],
    queryFn: () => notificationService.getNotifications(filters),
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  })
}

// Usage
const { data } = useNotifications({ module: 'memberships', isRead: false })
```

### useMarkNotificationAsRead

Mutation pour marquer une notification comme lue.

```typescript
function useMarkNotificationAsRead() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (id: string) => notificationService.markAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })
}

// Usage
const { mutate: markAsRead } = useMarkNotificationAsRead()
markAsRead('notification-id')
```

### useMarkAllNotificationsAsRead

Mutation pour marquer toutes les notifications comme lues.

```typescript
function useMarkAllNotificationsAsRead() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: () => notificationService.markAllAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })
}

// Usage
const { mutate: markAllAsRead } = useMarkAllNotificationsAsRead()
markAllAsRead()
```

---

## Jobs planifiés

### Planning quotidien

| Heure | Job | Module | Description |
|-------|-----|--------|-------------|
| 08:00 | `dailyBirthdayNotifications` | Membres | Anniversaires (J-2, J, J+1) |
| 09:00 | `dailyOverdueCommissions` | Placement | Commissions en retard |
| 09:00 | `dailyCaisseSpecialePendingReminders` | CS | Rappels demandes en attente |
| 09:30 | `dailyCreditPaymentDue` | Crédit | Échéances de paiement |
| 10:00 | `dailyCIPaymentDue` | CI | Échéances versements |
| 10:00 | `dailyCaisseSpecialeApprovedNotConvertedReminders` | CS | Rappels non converties |
| 10:30 | `dailyVehicleInsuranceExpiring` | Véhicule | Assurances expirantes (30j) |
| 11:00 | `dailyTransformCreditSpeciale` | Crédit | Transformation après 7 mois |
| 11:00 | `dailyCaisseImprevuePendingReminders` | CI | Rappels demandes en attente |
| 11:30 | `dailyCaisseImprevueApprovedNotConvertedReminders` | CI | Rappels non converties |
| */1h | `hourlyScheduledNotifications` | Global | Traitement notifications programmées |

### Job Anniversaires (détail)

Le job `dailyBirthdayNotifications` :

1. Récupère tous les membres actifs avec `birthDate` valide
2. Pour chaque membre, calcule `daysUntil` (jours jusqu'au prochain anniversaire)
3. Crée des notifications selon les règles :

| daysUntil | Notification | Message |
|-----------|--------------|---------|
| 2 | J-2 | "L'anniversaire de X est dans 2 jours. Il/Elle aura Y ans." |
| 0 | J | "Aujourd'hui est l'anniversaire de X. Il/Elle fête ses Y ans ! 🎉" |
| -1 | J+1 | "L'anniversaire de X était hier. Il/Elle a fêté ses Y ans." |

**Anti-doublon** : Vérifie `metadata.memberId + metadata.notificationDate + metadata.daysUntil` avant création.

---

## Firestore

### Collection `notifications`

```typescript
// Document structure
{
  id: string,                    // Auto-généré
  module: 'memberships',         // NotificationModule
  entityId: 'member-123',        // ID de la ressource
  type: 'birthday_reminder',     // NotificationType
  title: 'Anniversaire de Jean', // Titre affiché
  message: 'Jean fête ses 30 ans...', // Message complet
  isRead: false,                 // Statut de lecture
  createdAt: Timestamp,          // Date de création
  scheduledAt?: Timestamp,       // Date programmée (optionnel)
  sentAt?: Timestamp,            // Date d'envoi (optionnel)
  metadata: {                    // Métadonnées contextuelles
    memberId: 'member-123',
    memberFirstName: 'Jean',
    memberLastName: 'Dupont',
    birthDate: '1994-01-15T00:00:00.000Z',
    daysUntil: 0,
    age: 30,
    notificationDate: '2024-01-15'
  }
}
```

### Index composites

| Champs | Utilisation |
|--------|-------------|
| `isRead` ASC, `createdAt` DESC | Notifications non lues triées |
| `module` ASC, `isRead` ASC, `createdAt` DESC | Filtrage par module |
| `scheduledAt` ASC, `sentAt` ASC | Jobs notifications programmées |
| `module` ASC, `type` ASC, `createdAt` DESC | Filtrage par module et type |

### Règles de sécurité

```javascript
match /notifications/{notificationId} {
  // Lecture : admins uniquement
  allow read: if isAdmin();
  
  // Création : services backend (Admin SDK) uniquement
  allow create: if false; // Uniquement via Admin SDK
  
  // Mise à jour : admins peuvent modifier isRead
  allow update: if isAdmin() && 
    request.resource.data.diff(resource.data).affectedKeys().hasOnly(['isRead']);
  
  // Suppression : non autorisée côté client
  allow delete: if false;
}
```

---

## Utilisation

### Créer une notification manuellement

```typescript
import { ServiceFactory } from '@/factories/ServiceFactory'

const notificationService = ServiceFactory.getNotificationService()

// Notification générique
await notificationService.createNotification({
  module: 'memberships',
  entityId: 'request-123',
  type: 'status_update',
  title: 'Statut modifié',
  message: 'La demande de Jean Dupont a été approuvée.',
  metadata: {
    requestId: 'request-123',
    memberName: 'Jean Dupont',
    status: 'approved'
  }
})

// Notification de rejet
await notificationService.createRejectionNotification(
  'request-123',      // requestId
  'Jean Dupont',      // memberName
  'Admin User',       // adminName
  'admin-456',        // adminId
  'Documents incomplets', // motifReject
  new Date()          // processedAt
)
```

### Afficher dans un composant

```tsx
import { useUnreadNotifications, useMarkNotificationAsRead } from '@/hooks/notifications'

function NotificationList() {
  const { data: notifications, isLoading } = useUnreadNotifications(10)
  const { mutate: markAsRead } = useMarkNotificationAsRead()
  
  if (isLoading) return <Skeleton />
  
  return (
    <ul>
      {notifications?.map(notification => (
        <li 
          key={notification.id}
          onClick={() => markAsRead(notification.id)}
          className={notification.isRead ? 'opacity-50' : ''}
        >
          <strong>{notification.title}</strong>
          <p>{notification.message}</p>
          <span>{formatDate(notification.createdAt)}</span>
        </li>
      ))}
    </ul>
  )
}
```

### Afficher le badge

```tsx
import { useUnreadCount } from '@/hooks/notifications'
import { Bell } from 'lucide-react'

function NotificationBell() {
  const { data: count } = useUnreadCount()
  
  return (
    <div className="relative">
      <Bell className="h-6 w-6" />
      {count > 0 && (
        <span className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full text-xs px-1">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </div>
  )
}
```

---

## Documentation connexe

- [ANALYSE_NOTIFICATIONS.md](./ANALYSE_NOTIFICATIONS.md) - Analyse fonctionnelle
- [ARCHITECTURE_NOTIFICATIONS.md](./ARCHITECTURE_NOTIFICATIONS.md) - Architecture détaillée
- [NF6_JOBS_PLANIFIES.md](./NF6_JOBS_PLANIFIES.md) - Jobs planifiés
- [NOTIFICATIONS_ANNIVERSAIRES.md](./NOTIFICATIONS_ANNIVERSAIRES.md) - Spécification anniversaires
- [realisationAfaire.md](./realisationAfaire.md) - Backlog d'implémentation
- [Cloud Functions README](../../functions/README.md) - Documentation des Cloud Functions
