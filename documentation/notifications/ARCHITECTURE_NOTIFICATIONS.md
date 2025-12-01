# Architecture détaillée – Système de notifications

Ce document décrit **en détail** comment le système de notifications sera mis en place, géré et intégré dans l'application. Il complète [`ANALYSE_NOTIFICATIONS.md`](./ANALYSE_NOTIFICATIONS.md) et [`realisationAfaire.md`](./realisationAfaire.md).

## 1. Structure Firestore

### 1.1. Collection principale

- **Nom de la collection** : `notifications`
- **Structure d'un document** :
  ```typescript
  {
    id: string (auto-généré par Firestore)
    module: 'memberships' | 'vehicule' | 'caisse_speciale' | 'bienfaiteur'
    entityId: string (ID de la ressource : memberId, contractId, vehicleId, etc.)
    type: string (code fonctionnel : 'birthday_reminder', 'new_request', 'status_update', etc.)
    title: string
    message: string
    isRead: boolean
    createdAt: Timestamp
    scheduledAt?: Timestamp (pour notifications programmées)
    sentAt?: Timestamp (quand la notification a été "envoyée")
    metadata?: Record<string, any> (paramètres spécifiques par module)
    // Champs optionnels selon le module
    requestId?: string (pour MembershipNotification)
    memberId?: string (pour notifications liées à un membre)
  }
  ```

### 1.2. Indexes Firestore nécessaires

Pour optimiser les requêtes, créer les indexes composites suivants :

1. **Index pour récupérer les notifications non lues d'un admin** :
   - Collection : `notifications`
   - Champs : `isRead` (Ascending), `createdAt` (Descending)
   - Utilisation : récupérer toutes les notifications non lues, triées par date

2. **Index pour filtrer par module et statut** :
   - Collection : `notifications`
   - Champs : `module` (Ascending), `isRead` (Ascending), `createdAt` (Descending)
   - Utilisation : récupérer les notifications d'un module spécifique

3. **Index pour les notifications programmées** :
   - Collection : `notifications`
   - Champs : `scheduledAt` (Ascending), `sentAt` (Ascending)
   - Utilisation : récupérer les notifications à envoyer (jobs planifiés)

### 1.3. Règles de sécurité Firestore

- Les admins peuvent lire toutes les notifications
- Seuls les services backend (via Admin SDK) peuvent créer/modifier les notifications
- Les admins peuvent mettre à jour uniquement `isRead` (marquer comme lu)

## 2. Repositories (`src/repositories/notifications/`)

### 2.1. Interface `INotificationRepository`

```typescript
interface INotificationRepository extends IRepository {
  // CRUD de base
  create(notification: Omit<Notification, 'id' | 'createdAt'>): Promise<Notification>
  getById(id: string): Promise<Notification | null>
  update(id: string, updates: Partial<Notification>): Promise<Notification | null>
  delete(id: string): Promise<void>
  
  // Requêtes spécifiques
  getUnreadCount(): Promise<number>
  getUnreadNotifications(limit?: number): Promise<Notification[]>
  getNotificationsByModule(module: NotificationModule, filters?: NotificationFilters): Promise<Notification[]>
  getPaginatedNotifications(filters?: NotificationFilters, page?: number, limit?: number): Promise<PaginatedNotifications>
  
  // Mutations
  markAsRead(id: string): Promise<void>
  markAllAsRead(): Promise<void>
  markAsReadByModule(module: NotificationModule): Promise<void>
  
  // Notifications programmées
  getScheduledNotifications(beforeDate: Date): Promise<Notification[]>
  markAsSent(id: string): Promise<void>
}
```

### 2.2. Implémentation `NotificationRepository`

- **Fichier** : `src/repositories/notifications/NotificationRepository.ts`
- **Méthodes principales** :
  - `create()` : crée une notification dans Firestore avec `createdAt` automatique
  - `getUnreadNotifications()` : requête avec `where('isRead', '==', false)` + `orderBy('createdAt', 'desc')`
  - `getPaginatedNotifications()` : pagination avec `limit()` et `startAfter()` pour les curseurs
  - `markAsRead()` : `updateDoc()` pour mettre à jour uniquement `isRead: true`
  - `getScheduledNotifications()` : pour les jobs, récupère les notifications avec `scheduledAt <= beforeDate` et `sentAt == null`

### 2.3. Mapping Firestore ↔ TypeScript

- Conversion `Timestamp` ↔ `Date` pour `createdAt`, `scheduledAt`, `sentAt`
- Gestion des champs optionnels (`metadata`, `scheduledAt`, etc.)
- Validation des données avant insertion

## 3. Services (`src/services/notifications/`)

### 3.1. `NotificationService`

- **Fichier** : `src/services/notifications/NotificationService.ts`
- **Responsabilités** :
  - Orchestrer les repositories
  - Appliquer les règles métier (validation, formatage des messages)
  - Créer les notifications selon les règles métier de chaque module

**Méthodes principales** :

```typescript
class NotificationService {
  // Création de notifications
  createNotification(params: CreateNotificationParams): Promise<Notification>
  createBirthdayNotification(memberId: string, daysUntil: number): Promise<Notification>
  createMembershipRequestNotification(requestId: string, type: 'new_request' | 'status_update'): Promise<Notification>
  
  // Lecture
  getUnreadCount(): Promise<number>
  getUnreadNotifications(limit?: number): Promise<Notification[]>
  getNotifications(filters?: NotificationFilters): Promise<Notification[]>
  
  // Mutations
  markAsRead(id: string): Promise<void>
  markAllAsRead(): Promise<void>
  
  // Utilitaires
  formatNotificationMessage(type: string, metadata: any): string
  shouldCreateNotification(type: string, context: any): boolean
}
```

### 3.2. Règles métier de création

- **Anniversaires** :
  - Créer une notification J-2 si `daysUntil === 2`
  - Créer une notification J si `daysUntil === 0`
  - Créer une notification J+1 si `daysUntil === -1` (hier)
  - Titre : "Anniversaire de [Prénom] [Nom]"
  - Message : "L'anniversaire de [Prénom] [Nom] est [aujourd'hui | dans 2 jours | était hier]"
  - **Métadonnées** : stocker `memberId`, `birthDate`, `daysUntil`, `age` dans `metadata`
  - **Éviter les doublons** : vérifier qu'une notification du même type pour le même membre et le même jour n'existe pas déjà

- **Demandes d'adhésion** :
  - Créer une notification `new_request` quand une demande est créée
  - Créer une notification `status_update` quand le statut change
  - Titre : "Nouvelle demande d'adhésion" ou "Statut de demande modifié"
  - Message : inclure le nom du membre et le nouveau statut

### 3.3. Méthode spécialisée : `createBirthdayNotification()`

```typescript
async createBirthdayNotification(
  memberId: string,
  memberFirstName: string,
  memberLastName: string,
  birthDate: Date,
  daysUntil: number
): Promise<Notification> {
  // Validation : daysUntil doit être -1, 0, ou 2
  if (![-1, 0, 2].includes(daysUntil)) {
    throw new Error(`Invalid daysUntil for birthday notification: ${daysUntil}`)
  }

  // Calculer l'âge
  const today = new Date()
  const currentYear = today.getFullYear()
  const birthYear = birthDate.getFullYear()
  const age = currentYear - birthYear - (daysUntil > 0 ? 1 : 0)

  // Déterminer le type de notification
  let type: NotificationType
  let message: string
  if (daysUntil === 2) {
    type = 'birthday_reminder'
    message = `L'anniversaire de ${memberFirstName} ${memberLastName} est dans 2 jours. Il/Elle aura ${age} ans.`
  } else if (daysUntil === 0) {
    type = 'birthday_reminder'
    message = `Aujourd'hui est l'anniversaire de ${memberFirstName} ${memberLastName}. Il/Elle fête ses ${age} ans aujourd'hui ! 🎉`
  } else { // daysUntil === -1
    type = 'birthday_reminder'
    message = `L'anniversaire de ${memberFirstName} ${memberLastName} était hier. Il/Elle a fêté ses ${age} ans.`
  }

  // Vérifier qu'une notification similaire n'existe pas déjà (éviter doublons)
  const existingNotifications = await this.repository.getNotificationsByModule('memberships', {
    type: 'birthday_reminder',
    // Filtrer par memberId dans metadata (requête Firestore sur metadata.memberId)
  })
  
  const todayStr = today.toISOString().split('T')[0] // Format YYYY-MM-DD
  const alreadyExists = existingNotifications.some(n => 
    n.metadata?.memberId === memberId && 
    n.metadata?.notificationDate === todayStr &&
    n.metadata?.daysUntil === daysUntil
  )

  if (alreadyExists) {
    console.log(`Notification d'anniversaire déjà créée pour ${memberId} (J${daysUntil >= 0 ? '-' : '+'}${Math.abs(daysUntil)})`)
    // Retourner la notification existante ou throw selon le besoin
    return existingNotifications.find(n => 
      n.metadata?.memberId === memberId && 
      n.metadata?.notificationDate === todayStr &&
      n.metadata?.daysUntil === daysUntil
    )!
  }

  // Créer la notification
  return await this.repository.create({
    module: 'memberships',
    entityId: memberId,
    type,
    title: `Anniversaire de ${memberFirstName} ${memberLastName}`,
    message,
    isRead: false,
    createdAt: new Date(),
    metadata: {
      memberId,
      memberFirstName,
      memberLastName,
      birthDate: birthDate.toISOString(),
      daysUntil,
      age,
      notificationDate: todayStr, // Pour éviter les doublons
    },
  })
}
```

### 3.3. Intégration avec les autres services

- `MembershipService` : appelle `NotificationService.createMembershipRequestNotification()` lors de la création/mise à jour d'une demande
- `MemberService` : (futur) appelle `NotificationService.createBirthdayNotification()` via un job planifié

## 4. Jobs planifiés (Cloud Functions / Cron)

### 4.1. Job quotidien pour les anniversaires

- **Fréquence** : Exécuté tous les jours à 8h00 (heure locale Gabon, UTC+1)
- **Fichier** : `functions/src/scheduled/birthdayNotifications.ts` (à créer côté backend)
- **Logique détaillée** :

```typescript
// Pseudo-code du job
export async function generateBirthdayNotifications() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  // 1. Récupérer tous les membres actifs avec birthDate valide
  const members = await memberRepository.getAll({ isActive: true })
  const membersWithBirthDate = members.filter(m => m.birthDate)
  
  const notificationService = new NotificationService()
  
  // 2. Pour chaque membre, calculer les jours jusqu'au prochain anniversaire
  for (const member of membersWithBirthDate) {
    const birthDate = new Date(member.birthDate)
    const currentYear = today.getFullYear()
    const birthMonth = birthDate.getMonth()
    const birthDay = birthDate.getDate()
    
    // Calculer le prochain anniversaire
    let nextBirthday = new Date(currentYear, birthMonth, birthDay)
    if (nextBirthday < today) {
      nextBirthday = new Date(currentYear + 1, birthMonth, birthDay)
    }
    
    // Calculer daysUntil
    const daysUntil = Math.ceil((nextBirthday.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    
    // 3. Créer les notifications selon les règles
    if (daysUntil === 2) {
      // Notification J-2
      await notificationService.createBirthdayNotification(
        member.id,
        member.firstName,
        member.lastName,
        birthDate,
        2
      )
    } else if (daysUntil === 0) {
      // Notification J (aujourd'hui)
      await notificationService.createBirthdayNotification(
        member.id,
        member.firstName,
        member.lastName,
        birthDate,
        0
      )
    } else if (daysUntil === -1) {
      // Notification J+1 (hier, pour rattrapage)
      // Vérifier d'abord qu'une notification J n'a pas déjà été créée hier
      const yesterday = new Date(today)
      yesterday.setDate(yesterday.getDate() - 1)
      
      const existingNotification = await notificationRepository.getNotificationsByModule('memberships', {
        type: 'birthday_reminder',
        // Filtrer par memberId et date
      })
      
      // Si aucune notification J n'a été créée hier, créer J+1
      const wasNotifiedYesterday = existingNotification.some(n => 
        n.metadata?.memberId === member.id &&
        n.metadata?.daysUntil === 0 &&
        n.createdAt.toDateString() === yesterday.toDateString()
      )
      
      if (!wasNotifiedYesterday) {
        await notificationService.createBirthdayNotification(
          member.id,
          member.firstName,
          member.lastName,
          birthDate,
          -1
        )
      }
    }
  }
}
```

**Points importants** :
- Le job s'exécute **une fois par jour** à 8h00
- Il calcule pour **tous les membres actifs** avec `birthDate` valide
- Il crée **automatiquement** les notifications J-2, J, et J+1 selon les règles
- La méthode `createBirthdayNotification()` vérifie les doublons avant de créer
- Les notifications sont créées avec toutes les métadonnées nécessaires (memberId, age, etc.)

### 4.1.1. Alternative côté client (temporaire)

Si les Cloud Functions ne sont pas encore disponibles, on peut créer un hook `useBirthdayNotificationsGenerator()` qui :

1. S'exécute au chargement de l'app (ou via un bouton admin "Générer les notifications d'anniversaires")
2. Récupère tous les membres avec `birthDate`
3. Calcule les `daysUntil` pour chaque membre
4. Appelle `NotificationService.createBirthdayNotification()` pour chaque cas (J-2, J, J+1)
5. Affiche un toast de progression

**Limitation** : Cette approche est moins optimale car elle s'exécute côté client et nécessite que l'admin soit connecté. Les jobs planifiés sont préférés.

### 4.2. Job pour les notifications programmées

- **Fréquence** : Exécuté toutes les heures
- **Logique** :
  1. Récupérer les notifications avec `scheduledAt <= now` et `sentAt == null`
  2. Marquer comme "envoyées" (`sentAt = now`)
  3. (Futur) Envoyer par email/SMS si nécessaire

### 4.3. Alternative côté client (temporaire)

Si les Cloud Functions ne sont pas encore disponibles, on peut :
- Créer un hook `useBirthdayNotifications()` qui s'exécute au chargement de l'app
- Calculer les anniversaires côté client
- Créer les notifications via le service (mais moins optimal que les jobs)

## 5. Hooks React (`src/hooks/notifications/`)

### 5.1. `useNotifications()`

- **Fichier** : `src/hooks/notifications/useNotifications.ts`
- **Responsabilité** : Récupérer toutes les notifications (ou filtrées)
- **Implémentation** :
  ```typescript
  export function useNotifications(filters?: NotificationFilters) {
    const notificationService = ServiceFactory.getNotificationService()
    
    return useQuery({
      queryKey: ['notifications', filters],
      queryFn: () => notificationService.getNotifications(filters),
      staleTime: 30 * 1000, // 30 secondes
      refetchInterval: 60 * 1000, // Rafraîchir toutes les minutes
    })
  }
  ```

### 5.2. `useUnreadNotifications()`

- **Fichier** : `src/hooks/notifications/useUnreadNotifications.ts`
- **Responsabilité** : Récupérer uniquement les notifications non lues
- **Implémentation** :
  ```typescript
  export function useUnreadNotifications(limit?: number) {
    const notificationService = ServiceFactory.getNotificationService()
    
    return useQuery({
      queryKey: ['notifications', 'unread', limit],
      queryFn: () => notificationService.getUnreadNotifications(limit),
      staleTime: 30 * 1000,
      refetchInterval: 60 * 1000,
    })
  }
  ```

### 5.3. `useUnreadCount()`

- **Fichier** : `src/hooks/notifications/useUnreadCount.ts`
- **Responsabilité** : Récupérer uniquement le nombre de notifications non lues (pour le badge)
- **Implémentation** :
  ```typescript
  export function useUnreadCount() {
    const notificationService = ServiceFactory.getNotificationService()
    
    return useQuery({
      queryKey: ['notifications', 'unreadCount'],
      queryFn: () => notificationService.getUnreadCount(),
      staleTime: 30 * 1000,
      refetchInterval: 60 * 1000,
    })
  }
  ```

### 5.4. `useMarkNotificationAsRead()`

- **Fichier** : `src/hooks/notifications/useMarkNotificationAsRead.ts`
- **Responsabilité** : Mutation pour marquer une notification comme lue
- **Implémentation** :
  ```typescript
  export function useMarkNotificationAsRead() {
    const notificationService = ServiceFactory.getNotificationService()
    const queryClient = useQueryClient()
    
    return useMutation({
      mutationFn: (id: string) => notificationService.markAsRead(id),
      onSuccess: () => {
        // Invalider les queries pour rafraîchir l'affichage
        queryClient.invalidateQueries({ queryKey: ['notifications'] })
      },
    })
  }
  ```

### 5.5. `useMarkAllNotificationsAsRead()`

- **Fichier** : `src/hooks/notifications/useMarkAllNotificationsAsRead.ts`
- **Responsabilité** : Mutation pour marquer toutes les notifications comme lues
- **Implémentation** : Similaire à `useMarkNotificationAsRead()`, mais appelle `markAllAsRead()`

## 6. Composant UI (`src/components/layout/NotificationBell.tsx`)

### 6.1. Structure du composant

- **Responsabilités** :
  - Afficher l'icône de cloche avec badge (nombre de non lues)
  - Ouvrir un dropdown au clic
  - Afficher la liste des notifications
  - Permettre de marquer comme lu (individuel ou global)

### 6.2. Hooks utilisés

- `useUnreadCount()` : pour le badge
- `useUnreadNotifications(limit: 50)` : pour la liste dans le dropdown
- `useMarkNotificationAsRead()` : pour marquer une notification comme lue
- `useMarkAllNotificationsAsRead()` : pour "Tout marquer comme lu"

### 6.3. États et interactions

- **État ouvert/fermé** : géré par `DropdownMenu` (shadcn)
- **Clic sur une notification** : appelle `markAsRead()` et invalide les queries
- **Bouton "Tout marquer comme lu"** : visible uniquement si `unreadCount > 0`
- **Scroll** : liste scrollable si plus de 10 notifications

### 6.4. Affichage des notifications

- **Format général** :
  - Titre en gras
  - Message (tronqué à 2 lignes)
  - Date formatée (ex. "15 Jan 2025 à 14:30")
  - Indicateur visuel pour non lues (fond bleu clair + bordure)
- **Groupement** : (optionnel) grouper par date (Aujourd'hui, Hier, Cette semaine, etc.)

### 6.5. Affichage spécifique des notifications d'anniversaires

- **Icône spéciale** : Afficher une icône 🎂 (Cake) pour les notifications de type `birthday_reminder`
- **Badge de priorité** :
  - **J-2** : Badge "Dans 2 jours" (couleur bleue)
  - **J** : Badge "Aujourd'hui" (couleur verte, plus visible)
  - **J+1** : Badge "Hier" (couleur grise)
- **Informations supplémentaires** :
  - Afficher l'âge du membre si disponible dans `metadata.age`
  - Afficher le matricule du membre si disponible
  - Lien cliquable vers la fiche membre (via `metadata.memberId`)
- **Format du message** :
  ```typescript
  // Exemple d'affichage dans NotificationBell
  {notification.type === 'birthday_reminder' && (
    <div className="flex items-center gap-2">
      <Cake className="h-4 w-4 text-pink-500" />
      <Badge variant={
        notification.metadata?.daysUntil === 0 ? 'default' :
        notification.metadata?.daysUntil === 2 ? 'secondary' : 'outline'
      }>
        {notification.metadata?.daysUntil === 0 ? 'Aujourd\'hui' :
         notification.metadata?.daysUntil === 2 ? 'Dans 2 jours' : 'Hier'}
      </Badge>
      {notification.metadata?.age && (
        <span className="text-xs text-gray-500">
          ({notification.metadata.age} ans)
        </span>
      )}
    </div>
  )}
  ```
- **Action au clic** : Rediriger vers la fiche membre (`/memberships/${metadata.memberId}`) ou vers l'onglet Anniversaires

## 7. Flux de données complet

### 7.1. Création d'une notification d'anniversaire (flux détaillé)

```
1. Job planifié (Cloud Function) s'exécute quotidiennement à 8h00
   ↓
2. Job récupère tous les membres actifs avec birthDate valide
   ↓
3. Pour chaque membre :
   a. Calcule birthDate, currentYear, birthMonth, birthDay
   b. Calcule nextBirthday (anniversaire de cette année ou l'année prochaine)
   c. Calcule daysUntil = (nextBirthday - today) en jours
   ↓
4. Si daysUntil === 2 :
   → Appelle NotificationService.createBirthdayNotification(memberId, firstName, lastName, birthDate, 2)
   ↓
5. Si daysUntil === 0 :
   → Appelle NotificationService.createBirthdayNotification(memberId, firstName, lastName, birthDate, 0)
   ↓
6. Si daysUntil === -1 :
   → Vérifie qu'une notification J n'a pas été créée hier
   → Si non, appelle NotificationService.createBirthdayNotification(..., -1)
   ↓
7. NotificationService.createBirthdayNotification() :
   a. Valide daysUntil (doit être -1, 0, ou 2)
   b. Calcule l'âge du membre
   c. Formate le titre et le message selon daysUntil
   d. Vérifie les doublons (même memberId + même notificationDate + même daysUntil)
   e. Si pas de doublon, crée la notification via NotificationRepository.create()
   ↓
8. NotificationRepository.create() :
   a. Crée le document dans Firestore collection 'notifications'
   b. Stocke toutes les métadonnées (memberId, age, daysUntil, etc.)
   ↓
9. (Côté client) Les hooks React Query :
   a. useUnreadCount() se rafraîchit automatiquement (refetchInterval: 60s)
   b. useUnreadNotifications() se rafraîchit automatiquement
   ↓
10. NotificationBell :
    a. Affiche le nouveau badge (nombre de non lues)
    b. Affiche la nouvelle notification dans le dropdown avec icône 🎂
    c. Affiche le badge de priorité (Aujourd'hui, Dans 2 jours, Hier)
    d. Affiche l'âge si disponible
```

### 7.2. Marquer comme lu

```
1. Utilisateur clique sur une notification
   ↓
2. NotificationBell appelle useMarkNotificationAsRead().mutate(id)
   ↓
3. Hook appelle NotificationService.markAsRead(id)
   ↓
4. NotificationService appelle NotificationRepository.update(id, { isRead: true })
   ↓
5. NotificationRepository met à jour le document Firestore
   ↓
6. Hook invalide les queries React Query
   ↓
7. NotificationBell se rafraîchit automatiquement (badge mis à jour)
```

## 8. Types TypeScript (`src/types/types.ts`)

### 8.1. Type de base `Notification`

```typescript
export type NotificationModule = 'memberships' | 'vehicule' | 'caisse_speciale' | 'bienfaiteur'

export type NotificationType = 
  | 'birthday_reminder' // Anniversaire (J-2, J, J+1)
  | 'new_request' // Nouvelle demande d'adhésion
  | 'status_update' // Changement de statut
  | 'reminder' // Rappel générique
  | 'contract_expiring' // Contrat qui expire
  | 'payment_due' // Paiement dû
  // ... autres types selon les modules

export interface Notification {
  id: string
  module: NotificationModule
  entityId: string // ID de la ressource (memberId, requestId, etc.)
  type: NotificationType
  title: string
  message: string
  isRead: boolean
  createdAt: Date
  scheduledAt?: Date
  sentAt?: Date
  metadata?: {
    // Métadonnées communes
    [key: string]: any
    
    // Métadonnées spécifiques aux anniversaires (si type === 'birthday_reminder')
    memberId?: string
    memberFirstName?: string
    memberLastName?: string
    birthDate?: string // ISO string
    daysUntil?: number // -1, 0, ou 2
    age?: number
    notificationDate?: string // YYYY-MM-DD pour éviter les doublons
  }
  
  // Champs spécifiques selon le module (optionnels, pour compatibilité)
  requestId?: string
  memberId?: string
  contractId?: string
}
```

### 8.2. Types pour les filtres et requêtes

```typescript
export interface NotificationFilters {
  module?: NotificationModule
  type?: NotificationType
  isRead?: boolean
  dateFrom?: Date
  dateTo?: Date
}

export interface PaginatedNotifications {
  data: Notification[]
  pagination: {
    currentPage: number
    totalPages: number
    totalItems: number
    itemsPerPage: number
    hasNextPage: boolean
    hasPrevPage: boolean
  }
}
```

### 8.3. Migration de `MembershipNotification`

- Garder `MembershipNotification` pour compatibilité
- Créer un mapper `MembershipNotification → Notification` si nécessaire
- À terme, migrer vers le type unifié `Notification`

## 9. Intégration dans les modules existants

### 9.1. Module Memberships

- **Service** : `MembershipService` appelle `NotificationService` lors de :
  - Création d'une demande (`createMembershipRequest()`)
  - Mise à jour du statut (`updateMembershipRequestStatus()`)
- **Jobs** : Job quotidien pour les anniversaires (voir section 4.1)
- **Calcul des anniversaires** :
  - Le calcul est fait dans le job planifié (Cloud Function)
  - Alternative : hook `useBirthdayNotificationsGenerator()` côté client (temporaire)
  - Le calcul utilise la même logique que `MemberBirthdaysList.tsx` (calcul de `daysUntil`)

### 9.2. Synchronisation avec la vue Anniversaires

- La vue `MemberBirthdaysList.tsx` (onglet Anniversaires) affiche les membres avec leurs anniversaires
- Les notifications d'anniversaires sont **indépendantes** de cette vue :
  - La vue affiche **tous** les anniversaires (passés, présents, futurs)
  - Les notifications alertent uniquement sur J-2, J, J+1
- **Lien entre les deux** :
  - Cliquer sur une notification d'anniversaire peut rediriger vers l'onglet Anniversaires
  - L'onglet Anniversaires peut afficher un indicateur si une notification existe pour un membre donné

### 9.2. Module Véhicules

- **Service** : `VehicleInsuranceService` appelle `NotificationService` lors de :
  - Expiration proche d'une assurance (30 jours avant)
  - Assurance expirée

### 9.3. Module Caisse Spéciale

- **Service** : `CaisseSpecialeService` appelle `NotificationService` lors de :
  - Échéance de paiement approchante
  - Paiement en retard

## 10. Tests et validation

### 10.1. Tests unitaires

- `NotificationRepository` : tester les requêtes Firestore (mocks)
- `NotificationService` : tester la logique métier (formatage, validation)
- Hooks : tester les mutations et invalidations de queries

### 10.2. Tests d'intégration

- Tester le flux complet : création → affichage → marquer comme lu
- Tester les jobs planifiés (simulation)

## 11. Évolutions futures

- **Notifications en temps réel** : utiliser Firestore `onSnapshot()` pour les mises à jour instantanées
- **Notifications par email/SMS** : intégrer des services externes
- **Préférences utilisateur** : permettre à l'admin de choisir quelles notifications recevoir
- **Notifications groupées** : grouper plusieurs notifications similaires (ex. "5 nouveaux membres aujourd'hui")

## 12. Références

- **Architecture globale** : [`../architecture/ARCHITECTURE.md`](../architecture/ARCHITECTURE.md)
- **Analyse fonctionnelle** : [`./ANALYSE_NOTIFICATIONS.md`](./ANALYSE_NOTIFICATIONS.md)
- **Backlog d'implémentation** : [`./realisationAfaire.md`](./realisationAfaire.md)
- **Types** : `src/types/types.ts`

