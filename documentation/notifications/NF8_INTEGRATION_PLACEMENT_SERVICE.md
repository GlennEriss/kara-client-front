# NF8 – Intégration dans PlacementService

Ce document décrit l'intégration du système de notifications dans le **PlacementService** pour créer automatiquement des notifications lors des événements liés aux placements (échéances de commissions, retraits anticipés, etc.).

## 1. Contexte

Le module **Placement** gère les placements financiers effectués par les bienfaiteurs. Plusieurs événements nécessitent des notifications automatiques pour informer les administrateurs et assurer le suivi des échéances.

### 1.1. Cas d'usage

- **Rappel d'échéance de commission** : Notifier les admins avant chaque date d'échéance de commission (selon la documentation placement, ligne 17 : "Notifier automatiquement avant chaque échéance de commission")
- **Commission en retard** : Notifier les admins si une commission n'a pas été payée après la date d'échéance
- **Placement activé** : Notifier les admins lorsqu'un placement passe de "Draft" à "Active" (contrat téléversé)
- **Demande de retrait anticipé** : Notifier les admins lorsqu'un bienfaiteur demande un retrait anticipé
- **Placement terminé** : Notifier les admins lorsqu'un placement est complété (toutes les commissions payées)

### 1.2. Types de notifications

- `commission_due_reminder` : Rappel avant échéance de commission (notifications programmées)
- `commission_overdue` : Commission en retard (non payée après la date d'échéance)
- `placement_activated` : Placement activé (contrat téléversé, passage de Draft à Active)
- `early_exit_request` : Demande de retrait anticipé enregistrée
- `placement_completed` : Placement terminé (toutes les commissions payées)

## 2. Architecture

### 2.1. Structure actuelle

Le service de gestion des placements utilise actuellement :
- `src/services/placement/PlacementService.ts` : Service métier pour les placements
- `src/repositories/placement/PlacementRepository.ts` : Repository pour les opérations Firestore
- `src/hooks/usePlacements.ts` : Hooks React Query
- Le système de notifications existe déjà (`NotificationService`, `NotificationRepository`)

### 2.2. Approche d'intégration

L'intégration se fera directement dans le **PlacementService** existant :
- Injecter `NotificationService` dans le constructeur de `PlacementService`
- Créer des méthodes privées pour générer les notifications selon les événements
- Appeler ces méthodes aux moments appropriés dans le flux métier

**Référence** : Voir `NF7_INTEGRATION_MEMBERSHIP_SERVICE.md` pour un exemple similaire.

## 3. Implémentation

### 3.1. Modification du PlacementService

**Fichier** : `src/services/placement/PlacementService.ts`

```typescript
import { ServiceFactory } from '@/factories/ServiceFactory'
import { NotificationService } from '@/services/notifications/NotificationService'
import type { Placement, CommissionPaymentPlacement, EarlyExitPlacement } from '@/types/types'

export class PlacementService {
  constructor(
    private placementRepository: PlacementRepository,
    private documentService: DocumentService,
    private documentRepository: IDocumentRepository,
    private memberRepository: IMemberRepository,
    private notificationService?: NotificationService // Optionnel pour éviter dépendance circulaire
  ) {
    // Initialiser NotificationService si non fourni
    if (!this.notificationService) {
      this.notificationService = ServiceFactory.getNotificationService()
    }
  }

  /**
   * Crée un placement et génère les notifications si nécessaire
   */
  async createPlacement(data: Omit<Placement, 'id' | 'createdAt' | 'updatedAt' | 'status'>, adminId: string): Promise<Placement> {
    // ... logique existante de création ...
    
    // Notification optionnelle : placement créé (peut être omise si pas nécessaire)
    // await this.notifyPlacementCreated(placement, adminId)
    
    return placement
  }

  /**
   * Active un placement (téléversement du contrat) et génère les notifications
   */
  async uploadPlacementDocument(
    file: File,
    placementId: string,
    benefactorId: string,
    documentType: PlacementDocumentType,
    adminId: string
  ): Promise<{ documentId: string; placement: Placement }> {
    // ... logique existante d'upload ...
    
    const existingPlacement = await this.placementRepository.getById(placementId)
    
    // Si le placement passe de Draft à Active, notifier
    if (documentType === 'PLACEMENT_CONTRACT' && existingPlacement?.status === 'Draft') {
      const updatedPlacement = await this.placementRepository.update(placementId, {
        status: 'Active',
        contractDocumentId: document.id,
        updatedBy: adminId,
      })
      
      // Générer les commissions
      await this.generateCommissions(updatedPlacement, adminId)
      
      // Notifier l'activation du placement
      await this.notifyPlacementActivated(updatedPlacement, adminId)
      
      // Planifier les notifications d'échéance de commissions
      await this.scheduleCommissionReminders(updatedPlacement, adminId)
      
      return { documentId: document.id, placement: updatedPlacement }
    }
    
    // ... reste de la logique ...
  }

  /**
   * Enregistre une demande de retrait anticipé et génère une notification
   */
  async requestEarlyExit(
    placementId: string,
    payload: Pick<EarlyExitPlacement, 'commissionDue' | 'payoutAmount'>,
    adminId: string
  ): Promise<EarlyExitPlacement> {
    // ... logique existante ...
    
    // Notifier la demande de retrait anticipé
    await this.notifyEarlyExitRequest(placementId, earlyExit, adminId)
    
    return earlyExit
  }

  /**
   * Marque une commission comme payée et vérifie si le placement est terminé
   */
  async payCommission(
    placementId: string,
    commissionId: string,
    data: Partial<CommissionPaymentPlacement>,
    adminId: string
  ): Promise<CommissionPaymentPlacement> {
    // ... logique existante ...
    
    // Vérifier si toutes les commissions sont payées
    const allCommissions = await this.placementRepository.listCommissions(placementId)
    const allPaid = allCommissions.every(c => c.status === 'Paid')
    
    if (allPaid) {
      const placement = await this.placementRepository.getById(placementId)
      if (placement && placement.status === 'Active') {
        // Marquer le placement comme terminé
        await this.placementRepository.update(placementId, {
          status: 'Closed',
          updatedBy: adminId,
        })
        
        // Notifier la complétion du placement
        await this.notifyPlacementCompleted(placement, adminId)
      }
    }
    
    return commission
  }

  // ========== Méthodes privées de notification ==========

  /**
   * Notifie l'activation d'un placement (contrat téléversé)
   */
  private async notifyPlacementActivated(placement: Placement, adminId: string): Promise<void> {
    try {
      const member = await this.memberRepository.getMemberById(placement.benefactorId)
      const memberName = member ? `${member.firstName} ${member.lastName}` : placement.benefactorId

      await this.notificationService!.createNotification({
        module: 'placement',
        entityId: placement.id,
        type: 'placement_activated',
        title: 'Placement activé',
        message: `Le placement #${placement.id.slice(0, 8)} de ${memberName} a été activé. Montant : ${placement.amount.toLocaleString()} FCFA, Taux : ${placement.rate}%, Période : ${placement.periodMonths} mois.`,
        metadata: {
          placementId: placement.id,
          benefactorId: placement.benefactorId,
          amount: placement.amount,
          rate: placement.rate,
          periodMonths: placement.periodMonths,
          payoutMode: placement.payoutMode,
        },
      })
    } catch (error) {
      console.error('Erreur lors de la création de la notification d\'activation:', error)
    }
  }

  /**
   * Planifie les notifications de rappel pour chaque échéance de commission
   */
  private async scheduleCommissionReminders(placement: Placement, adminId: string): Promise<void> {
    try {
      const commissions = await this.placementRepository.listCommissions(placement.id)
      const member = await this.memberRepository.getMemberById(placement.benefactorId)
      const memberName = member ? `${member.firstName} ${member.lastName}` : placement.benefactorId

      for (const commission of commissions) {
        // Créer une notification programmée pour J-3 (3 jours avant l'échéance)
        const reminderDate = new Date(commission.dueDate)
        reminderDate.setDate(reminderDate.getDate() - 3)

        // Ne créer la notification que si la date de rappel est dans le futur
        if (reminderDate > new Date()) {
          await this.notificationService!.createNotification({
            module: 'placement',
            entityId: placement.id,
            type: 'commission_due_reminder',
            title: 'Rappel : Échéance de commission',
            message: `Échéance de commission pour le placement #${placement.id.slice(0, 8)} de ${memberName}. Montant : ${commission.amount.toLocaleString()} FCFA. Date d'échéance : ${commission.dueDate.toLocaleDateString('fr-FR')}.`,
            metadata: {
              placementId: placement.id,
              commissionId: commission.id,
              benefactorId: placement.benefactorId,
              dueDate: commission.dueDate.toISOString(),
              amount: commission.amount,
              daysBefore: 3,
            },
            scheduledAt: reminderDate,
          })
        }

        // Optionnel : Créer une notification pour le jour J (échéance)
        const dueDate = new Date(commission.dueDate)
        dueDate.setHours(9, 0, 0, 0) // 9h du matin le jour de l'échéance

        if (dueDate > new Date()) {
          await this.notificationService!.createNotification({
            module: 'placement',
            entityId: placement.id,
            type: 'commission_due_reminder',
            title: 'Échéance de commission aujourd\'hui',
            message: `Échéance de commission aujourd'hui pour le placement #${placement.id.slice(0, 8)} de ${memberName}. Montant : ${commission.amount.toLocaleString()} FCFA.`,
            metadata: {
              placementId: placement.id,
              commissionId: commission.id,
              benefactorId: placement.benefactorId,
              dueDate: commission.dueDate.toISOString(),
              amount: commission.amount,
              daysBefore: 0,
            },
            scheduledAt: dueDate,
          })
        }
      }
    } catch (error) {
      console.error('Erreur lors de la planification des rappels de commission:', error)
    }
  }

  /**
   * Notifie une demande de retrait anticipé
   */
  private async notifyEarlyExitRequest(
    placementId: string,
    earlyExit: EarlyExitPlacement,
    adminId: string
  ): Promise<void> {
    try {
      const placement = await this.placementRepository.getById(placementId)
      if (!placement) return

      const member = await this.memberRepository.getMemberById(placement.benefactorId)
      const memberName = member ? `${member.firstName} ${member.lastName}` : placement.benefactorId

      await this.notificationService!.createNotification({
        module: 'placement',
        entityId: placementId,
        type: 'early_exit_request',
        title: 'Demande de retrait anticipé',
        message: `Demande de retrait anticipé pour le placement #${placement.id.slice(0, 8)} de ${memberName}. Commission due : ${earlyExit.commissionDue.toLocaleString()} FCFA, Montant à verser : ${earlyExit.payoutAmount.toLocaleString()} FCFA.`,
        metadata: {
          placementId: placement.id,
          earlyExitId: earlyExit.id,
          benefactorId: placement.benefactorId,
          commissionDue: earlyExit.commissionDue,
          payoutAmount: earlyExit.payoutAmount,
          requestedAt: earlyExit.requestedAt.toISOString(),
        },
      })
    } catch (error) {
      console.error('Erreur lors de la création de la notification de retrait anticipé:', error)
    }
  }

  /**
   * Notifie la complétion d'un placement (toutes commissions payées)
   */
  private async notifyPlacementCompleted(placement: Placement, adminId: string): Promise<void> {
    try {
      const member = await this.memberRepository.getMemberById(placement.benefactorId)
      const memberName = member ? `${member.firstName} ${member.lastName}` : placement.benefactorId

      await this.notificationService!.createNotification({
        module: 'placement',
        entityId: placement.id,
        type: 'placement_completed',
        title: 'Placement terminé',
        message: `Le placement #${placement.id.slice(0, 8)} de ${memberName} est terminé. Toutes les commissions ont été payées. Montant total : ${placement.amount.toLocaleString()} FCFA.`,
        metadata: {
          placementId: placement.id,
          benefactorId: placement.benefactorId,
          amount: placement.amount,
          completedAt: new Date().toISOString(),
        },
      })
    } catch (error) {
      console.error('Erreur lors de la création de la notification de complétion:', error)
    }
  }

  /**
   * Vérifie et notifie les commissions en retard (à appeler via un job planifié)
   */
  async checkAndNotifyOverdueCommissions(): Promise<void> {
    try {
      const allPlacements = await this.placementRepository.getAll()
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      for (const placement of allPlacements) {
        if (placement.status !== 'Active') continue

        const commissions = await this.placementRepository.listCommissions(placement.id)
        const overdueCommissions = commissions.filter(
          (c) => c.status === 'Due' && new Date(c.dueDate) < today
        )

        for (const commission of overdueCommissions) {
          // Vérifier qu'une notification n'existe pas déjà pour cette commission en retard
          const existingNotifications = await this.notificationService!.getNotificationsByModule('placement', {
            type: 'commission_overdue',
          })

          const alreadyNotified = existingNotifications.some(
            (n) => n.metadata?.commissionId === commission.id && n.metadata?.placementId === placement.id
          )

          if (!alreadyNotified) {
            const member = await this.memberRepository.getMemberById(placement.benefactorId)
            const memberName = member ? `${member.firstName} ${member.lastName}` : placement.benefactorId

            const daysOverdue = Math.floor(
              (today.getTime() - new Date(commission.dueDate).getTime()) / (1000 * 60 * 60 * 24)
            )

            await this.notificationService!.createNotification({
              module: 'placement',
              entityId: placement.id,
              type: 'commission_overdue',
              title: 'Commission en retard',
              message: `La commission du placement #${placement.id.slice(0, 8)} de ${memberName} est en retard de ${daysOverdue} jour(s). Montant : ${commission.amount.toLocaleString()} FCFA. Date d'échéance : ${commission.dueDate.toLocaleDateString('fr-FR')}.`,
              metadata: {
                placementId: placement.id,
                commissionId: commission.id,
                benefactorId: placement.benefactorId,
                dueDate: commission.dueDate.toISOString(),
                amount: commission.amount,
                daysOverdue: daysOverdue,
              },
            })
          }
        }
      }
    } catch (error) {
      console.error('Erreur lors de la vérification des commissions en retard:', error)
    }
  }
}
```

### 3.2. Mise à jour du ServiceFactory

**Fichier** : `src/factories/ServiceFactory.ts`

Le `PlacementService` est déjà créé via `ServiceFactory.getPlacementService()`. Il faut s'assurer que `NotificationService` est injecté dans le constructeur :

```typescript
static getPlacementService(): PlacementService {
  const key = 'PlacementService'
  if (!this.services.has(key)) {
    const placementRepository = RepositoryFactory.getPlacementRepository()
    const documentRepository = RepositoryFactory.getDocumentRepository()
    const documentService = new DocumentService(documentRepository)
    const memberRepository = RepositoryFactory.getMemberRepository()
    const notificationService = this.getNotificationService() // Ajouter cette ligne
    
    this.services.set(key, new PlacementService(
      placementRepository,
      documentService,
      documentRepository,
      memberRepository,
      notificationService // Injecter NotificationService
    ))
  }
  return this.services.get(key) as PlacementService
}
```

### 3.3. Ajout des types de notifications dans types.ts

**Fichier** : `src/types/types.ts`

S'assurer que le type `NotificationModule` inclut `'placement'` et que `NotificationType` inclut les types spécifiques au placement :

```typescript
export type NotificationModule = 
  | 'memberships' 
  | 'vehicule' 
  | 'caisse_speciale' 
  | 'bienfaiteur'
  | 'placement' // Ajouter ce module

export type NotificationType = 
  | 'birthday_reminder'
  | 'new_request'
  | 'status_update'
  | 'reminder'
  | 'commission_due_reminder'    // Nouveau : rappel avant échéance
  | 'commission_overdue'         // Nouveau : commission en retard
  | 'placement_activated'        // Nouveau : placement activé
  | 'early_exit_request'         // Nouveau : demande retrait anticipé
  | 'placement_completed'        // Nouveau : placement terminé
```

## 4. Jobs planifiés

### 4.1. Vérification des commissions en retard

Un job planifié (Cloud Functions ou cron) doit appeler `checkAndNotifyOverdueCommissions()` quotidiennement pour détecter et notifier les commissions en retard.

**Référence** : Voir `NF6_JOBS_PLANIFIES.md` pour l'implémentation des jobs planifiés.

### 4.2. Envoi des notifications programmées

Un job planifié doit récupérer et "envoyer" les notifications avec `scheduledAt <= now` et `sentAt == null`, puis mettre à jour `sentAt`.

**Référence** : Voir `NF6_JOBS_PLANIFIES.md` pour l'implémentation.

## 5. Cas d'usage détaillés

### 5.1. Activation d'un placement (téléversement du contrat)

**Flux** :
1. Admin téléverse le contrat de placement
2. `PlacementService.uploadPlacementDocument()` est appelé avec `PLACEMENT_CONTRACT`
3. Le placement passe de "Draft" à "Active"
4. Les commissions sont générées automatiquement
5. Une notification `placement_activated` est créée
6. Les notifications de rappel d'échéance sont planifiées (J-3 et J)

**Code d'exemple** :
```typescript
const placementService = ServiceFactory.getPlacementService()
await placementService.uploadPlacementDocument(
  contractFile,
  placementId,
  benefactorId,
  'PLACEMENT_CONTRACT',
  adminId
)
// Les notifications sont créées automatiquement
```

### 5.2. Rappel d'échéance de commission

**Flux** :
1. Lors de l'activation du placement, les notifications sont planifiées avec `scheduledAt`
2. Un job planifié récupère les notifications avec `scheduledAt <= now` et `sentAt == null`
3. La notification est "envoyée" (mise à jour de `sentAt`)
4. Les admins voient la notification dans leur centre de notifications

**Exemple de notification** :
- **Titre** : "Rappel : Échéance de commission"
- **Message** : "Échéance de commission pour le placement #I496ZaBb de Jean Dupont. Montant : 2 000 FCFA. Date d'échéance : 10/01/2026."
- **Métadonnées** : `placementId`, `commissionId`, `dueDate`, `amount`, `daysBefore: 3`

### 5.3. Commission en retard

**Flux** :
1. Un job planifié appelle `checkAndNotifyOverdueCommissions()` quotidiennement
2. Pour chaque commission avec `status === 'Due'` et `dueDate < today`
3. Vérifier qu'une notification n'existe pas déjà
4. Créer une notification `commission_overdue`
5. Les admins sont notifiés pour suivre le paiement

**Exemple de notification** :
- **Titre** : "Commission en retard"
- **Message** : "La commission du placement #I496ZaBb de Jean Dupont est en retard de 5 jour(s). Montant : 2 000 FCFA. Date d'échéance : 10/01/2026."
- **Métadonnées** : `placementId`, `commissionId`, `daysOverdue: 5`

### 5.4. Demande de retrait anticipé

**Flux** :
1. Admin enregistre une demande de retrait anticipé
2. `PlacementService.requestEarlyExit()` est appelé
3. Une notification `early_exit_request` est créée immédiatement
4. Les admins sont notifiés pour traiter la demande

**Exemple de notification** :
- **Titre** : "Demande de retrait anticipé"
- **Message** : "Demande de retrait anticipé pour le placement #I496ZaBb de Jean Dupont. Commission due : 2 000 FCFA, Montant à verser : 102 000 FCFA."
- **Métadonnées** : `placementId`, `earlyExitId`, `commissionDue`, `payoutAmount`

### 5.5. Placement terminé

**Flux** :
1. Admin paie la dernière commission
2. `PlacementService.payCommission()` détecte que toutes les commissions sont payées
3. Le placement passe à "Closed"
4. Une notification `placement_completed` est créée
5. Les admins sont notifiés que le placement est terminé

**Exemple de notification** :
- **Titre** : "Placement terminé"
- **Message** : "Le placement #I496ZaBb de Jean Dupont est terminé. Toutes les commissions ont été payées. Montant total : 100 000 FCFA."
- **Métadonnées** : `placementId`, `amount`, `completedAt`

## 6. Gestion des erreurs

### 6.1. Stratégie

Les erreurs de notification **ne doivent pas** faire échouer les opérations principales (activation, paiement, etc.). On utilise un try/catch pour isoler les erreurs de notification.

### 6.2. Logging

Toutes les erreurs de notification doivent être loggées :
```typescript
try {
  await this.notificationService!.createNotification(...)
} catch (error) {
  console.error('Erreur lors de la création de la notification:', error)
  // Optionnel : envoyer à un service de monitoring (Sentry, etc.)
}
```

### 6.3. Éviter les doublons

Pour les notifications programmées (rappels d'échéance), vérifier qu'une notification similaire n'existe pas déjà en utilisant les métadonnées (`placementId`, `commissionId`, `daysBefore`).

## 7. Tests

### 7.1. Tests unitaires

```typescript
describe('PlacementService - Notifications', () => {
  it('devrait créer une notification lors de l\'activation d\'un placement', async () => {
    const service = new PlacementService(...)
    const mockNotificationService = jest.spyOn(service, 'notificationService')
    
    await service.uploadPlacementDocument(...)
    
    expect(mockNotificationService.createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        module: 'placement',
        type: 'placement_activated',
      })
    )
  })

  it('devrait planifier les rappels d\'échéance lors de l\'activation', async () => {
    // Test que les notifications sont créées avec scheduledAt correct
  })
})
```

### 7.2. Tests d'intégration

- Vérifier que les notifications sont créées dans Firestore
- Vérifier que le badge de notifications se met à jour dans l'UI
- Vérifier que les notifications s'affichent correctement dans `NotificationBell`
- Vérifier que les jobs planifiés récupèrent et envoient les notifications programmées

## 8. Évolutions futures

### 8.1. Notifications personnalisables

Permettre aux admins de configurer :
- Le nombre de jours avant l'échéance pour les rappels (actuellement J-3)
- Les types de notifications à recevoir
- Les canaux de notification (SMS, email en plus des notifications in-app)

### 8.2. Notifications pour les bienfaiteurs

À terme, permettre aux bienfaiteurs de recevoir des notifications :
- Rappel d'échéance de commission
- Confirmation de paiement de commission
- Notification de retrait anticipé validé

### 8.3. Notifications de rappel récurrentes

Pour les commissions en retard, créer des notifications récurrentes (tous les X jours) jusqu'à ce que la commission soit payée.

## 9. Références

- **Architecture globale** : [`../architecture/ARCHITECTURE.md`](../architecture/ARCHITECTURE.md)
- **Architecture notifications** : [`./ARCHITECTURE_NOTIFICATIONS.md`](./ARCHITECTURE_NOTIFICATIONS.md)
- **Backlog notifications** : [`./realisationAfaire.md`](./realisationAfaire.md)
- **Jobs planifiés** : [`./NF6_JOBS_PLANIFIES.md`](./NF6_JOBS_PLANIFIES.md)
- **Module placement** : [`../placement/placement.md`](../placement/placement.md)
- **Intégration memberships** : [`./NF7_INTEGRATION_MEMBERSHIP_SERVICE.md`](./NF7_INTEGRATION_MEMBERSHIP_SERVICE.md)

