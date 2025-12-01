# NF7 – Intégration dans MembershipService

Ce document décrit l'intégration du système de notifications dans le **MembershipService** pour créer automatiquement des notifications lors de la création et de la mise à jour de demandes d'adhésion.

## 1. Contexte

Le module **Memberships** gère les demandes d'adhésion (`MembershipRequest`). Lors de certaines actions (création, changement de statut), il est nécessaire de notifier les administrateurs.

### 1.1. Cas d'usage

- **Nouvelle demande d'adhésion** : Notifier les admins qu'une nouvelle demande a été soumise
- **Changement de statut** : Notifier les admins lorsqu'une demande passe de "pending" à "approved" ou "rejected"
- **Rappels** : Notifier les admins pour les demandes en attente depuis longtemps

### 1.2. Types de notifications

- `new_request` : Nouvelle demande d'adhésion créée
- `status_update` : Statut d'une demande modifié
- `reminder` : Rappel pour une demande en attente

## 2. Architecture

### 2.1. Structure actuelle

Le service de gestion des membres/demandes d'adhésion utilise actuellement :
- `src/db/membership.db.ts` : Opérations de base de données
- `src/hooks/useMembershipRequests.ts` : Hooks React Query
- Pas de service dédié `MembershipService` actuellement

### 2.2. Approche d'intégration

Deux approches possibles :

#### Option A : Créer un MembershipService
- Créer `src/services/memberships/MembershipService.ts`
- Déplacer la logique métier depuis `membership.db.ts`
- Intégrer `NotificationService` dans ce nouveau service

#### Option B : Intégrer directement dans les fonctions existantes
- Modifier `src/db/membership.db.ts` pour appeler `NotificationService`
- Moins propre architecturalement, mais plus rapide à implémenter

**Recommandation** : Option A (créer un service dédié) pour respecter l'architecture du projet.

## 3. Implémentation

### 3.1. Création du MembershipService

**Fichier** : `src/services/memberships/MembershipService.ts`

```typescript
import { RepositoryFactory } from '@/factories/RepositoryFactory'
import { ServiceFactory } from '@/factories/ServiceFactory'
import { NotificationService } from '@/services/notifications/NotificationService'
import {
  MembershipRequest,
  MembershipRequestStatus,
} from '@/types/types'

export class MembershipService {
  private notificationService: NotificationService

  constructor() {
    this.notificationService = ServiceFactory.getNotificationService()
  }

  /**
   * Crée une nouvelle demande d'adhésion et envoie une notification
   */
  async createMembershipRequest(
    requestData: Omit<MembershipRequest, 'id' | 'createdAt' | 'updatedAt' | 'status'>
  ): Promise<MembershipRequest> {
    // 1. Créer la demande (logique existante depuis membership.db.ts)
    const { createMembershipRequest } = await import('@/db/membership.db')
    const newRequest = await createMembershipRequest(requestData)

    // 2. Créer une notification pour les admins
    try {
      await this.notificationService.createMembershipRequestNotification(
        newRequest.id,
        'new_request',
        `${requestData.identity.firstName} ${requestData.identity.lastName}`,
        undefined
      )
    } catch (error) {
      // Ne pas faire échouer la création de la demande si la notification échoue
      console.error('Erreur lors de la création de la notification:', error)
    }

    return newRequest
  }

  /**
   * Met à jour le statut d'une demande d'adhésion et envoie une notification
   */
  async updateMembershipRequestStatus(
    requestId: string,
    newStatus: MembershipRequestStatus,
    adminId: string,
    adminComments?: string
  ): Promise<MembershipRequest | null> {
    // 1. Mettre à jour le statut (logique existante depuis membership.db.ts)
    const { updateMembershipRequestStatus } = await import('@/db/membership.db')
    const updatedRequest = await updateMembershipRequestStatus(
      requestId,
      newStatus,
      adminId,
      adminComments
    )

    if (!updatedRequest) {
      return null
    }

    // 2. Créer une notification pour les admins
    try {
      const memberName = updatedRequest.identity
        ? `${updatedRequest.identity.firstName} ${updatedRequest.identity.lastName}`
        : undefined

      const statusLabel = this.getStatusLabel(newStatus)

      await this.notificationService.createMembershipRequestNotification(
        requestId,
        'status_update',
        memberName,
        statusLabel
      )
    } catch (error) {
      // Ne pas faire échouer la mise à jour si la notification échoue
      console.error('Erreur lors de la création de la notification:', error)
    }

    return updatedRequest
  }

  /**
   * Récupère le libellé d'un statut
   */
  private getStatusLabel(status: MembershipRequestStatus): string {
    const labels: Record<MembershipRequestStatus, string> = {
      pending: 'En attente',
      under_review: 'En cours d\'examen',
      approved: 'Approuvée',
      rejected: 'Rejetée',
    }
    return labels[status] || status
  }
}
```

### 3.2. Ajout dans ServiceFactory

**Fichier** : `src/factories/ServiceFactory.ts`

```typescript
import { MembershipService } from '@/services/memberships/MembershipService'

export class ServiceFactory {
  // ... autres services ...

  /**
   * Obtient le service de gestion des membres/demandes d'adhésion
   */
  static getMembershipService(): MembershipService {
    const key = 'MembershipService'
    if (!this.services.has(key)) {
      this.services.set(key, new MembershipService())
    }
    return this.services.get(key)
  }
}
```

### 3.3. Modification des hooks existants

**Fichier** : `src/hooks/useMembershipRequests.ts`

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ServiceFactory } from '@/factories/ServiceFactory'
import { MembershipRequestStatus } from '@/types/types'

// ... hooks existants ...

/**
 * Hook pour créer une demande d'adhésion (avec notification)
 */
export function useCreateMembershipRequest() {
  const queryClient = useQueryClient()
  const membershipService = ServiceFactory.getMembershipService()

  return useMutation({
    mutationFn: (requestData: Omit<MembershipRequest, 'id' | 'createdAt' | 'updatedAt' | 'status'>) =>
      membershipService.createMembershipRequest(requestData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['membershipRequests'] })
      queryClient.invalidateQueries({ queryKey: ['notifications'] }) // Rafraîchir les notifications
    },
  })
}

/**
 * Hook pour mettre à jour le statut d'une demande (avec notification)
 */
export function useUpdateMembershipRequestStatus() {
  const queryClient = useQueryClient()
  const membershipService = ServiceFactory.getMembershipService()

  return useMutation({
    mutationFn: ({
      requestId,
      newStatus,
      adminId,
      adminComments,
    }: {
      requestId: string
      newStatus: MembershipRequestStatus
      adminId: string
      adminComments?: string
    }) =>
      membershipService.updateMembershipRequestStatus(requestId, newStatus, adminId, adminComments),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['membershipRequests'] })
      queryClient.invalidateQueries({ queryKey: ['notifications'] }) // Rafraîchir les notifications
    },
  })
}
```

### 3.4. Migration progressive

Si `MembershipService` n'existe pas encore, voici une approche de migration progressive :

1. **Phase 1** : Créer `MembershipService` avec les méthodes de base
2. **Phase 2** : Migrer progressivement les appels depuis `membership.db.ts` vers `MembershipService`
3. **Phase 3** : Ajouter les notifications dans `MembershipService`
4. **Phase 4** : Mettre à jour tous les composants pour utiliser `MembershipService` au lieu de `membership.db.ts`

## 4. Cas d'usage détaillés

### 4.1. Création d'une nouvelle demande

**Flux** :
1. Utilisateur soumet un formulaire d'adhésion
2. `MembershipService.createMembershipRequest()` est appelé
3. La demande est créée dans Firestore
4. Une notification `new_request` est créée automatiquement
5. Les admins voient la notification dans leur centre de notifications

**Code d'exemple** :
```typescript
const membershipService = ServiceFactory.getMembershipService()
const newRequest = await membershipService.createMembershipRequest({
  identity: { firstName: 'Jean', lastName: 'Dupont', ... },
  // ... autres champs
})
// La notification est créée automatiquement
```

### 4.2. Mise à jour du statut

**Flux** :
1. Admin approuve/rejette une demande
2. `MembershipService.updateMembershipRequestStatus()` est appelé
3. Le statut est mis à jour dans Firestore
4. Une notification `status_update` est créée automatiquement
5. Les admins voient la notification dans leur centre de notifications

**Code d'exemple** :
```typescript
const membershipService = ServiceFactory.getMembershipService()
await membershipService.updateMembershipRequestStatus(
  requestId,
  'approved',
  adminId,
  'Demande approuvée après vérification'
)
// La notification est créée automatiquement
```

## 5. Gestion des erreurs

### 5.1. Stratégie

Les erreurs de notification **ne doivent pas** faire échouer les opérations principales (création/mise à jour de demande). On utilise un try/catch pour isoler les erreurs de notification.

### 5.2. Logging

Toutes les erreurs de notification doivent être loggées pour debugging :
```typescript
try {
  await this.notificationService.createMembershipRequestNotification(...)
} catch (error) {
  console.error('Erreur lors de la création de la notification:', error)
  // Optionnel : envoyer à un service de monitoring (Sentry, etc.)
}
```

## 6. Tests

### 6.1. Tests unitaires

```typescript
describe('MembershipService', () => {
  it('devrait créer une notification lors de la création d\'une demande', async () => {
    const service = new MembershipService()
    const mockNotificationService = jest.spyOn(service, 'notificationService')
    
    await service.createMembershipRequest(mockRequestData)
    
    expect(mockNotificationService.createMembershipRequestNotification).toHaveBeenCalledWith(
      expect.any(String),
      'new_request',
      expect.any(String),
      undefined
    )
  })
})
```

### 6.2. Tests d'intégration

- Vérifier que les notifications sont créées dans Firestore
- Vérifier que le badge de notifications se met à jour dans l'UI
- Vérifier que les notifications s'affichent correctement dans `NotificationBell`

## 7. Évolutions futures

### 7.1. Notifications de rappel

Ajouter un job planifié pour créer des notifications de rappel pour les demandes en attente depuis plus de X jours :

```typescript
async createReminderNotification(requestId: string, daysPending: number): Promise<Notification> {
  return this.notificationService.createNotification({
    module: 'memberships',
    entityId: requestId,
    type: 'reminder',
    title: 'Rappel : Demande en attente',
    message: `Une demande d'adhésion est en attente depuis ${daysPending} jours.`,
  })
}
```

### 7.2. Notifications personnalisées

Permettre aux admins de choisir quelles notifications recevoir (préférences utilisateur).

## 8. Références

- **Architecture globale** : [`../architecture/ARCHITECTURE.md`](../architecture/ARCHITECTURE.md)
- **Architecture notifications** : [`./ARCHITECTURE_NOTIFICATIONS.md`](./ARCHITECTURE_NOTIFICATIONS.md)
- **Backlog** : [`./realisationAfaire.md`](./realisationAfaire.md)
- **Module memberships** : [`../memberships/ANALYSE_MEMBERSHIPS.md`](../memberships/ANALYSE_MEMBERSHIPS.md)
- **Notifications memberships** : [`../memberships/notifications.md`](../memberships/notifications.md)

