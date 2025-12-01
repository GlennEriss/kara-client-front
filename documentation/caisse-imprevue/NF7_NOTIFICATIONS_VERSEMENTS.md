# NF7 – Notifications de versements programmés (Caisse Imprévue)

## 1. Contexte

Ce document décrit l'implémentation des notifications automatiques pour les versements programmés dans le module Caisse Imprévue. Les notifications sont générées pour alerter l'admin des versements à effectuer :
- **J-1** : 1 jour avant la date d'échéance
- **J** : Le jour de l'échéance
- **J+1** : 1 jour après l'échéance (si le versement n'a pas encore été effectué)

## 2. Architecture

### 2.1. Structure des données

Les versements sont stockés dans la sous-collection `contractsCI/{contractId}/payments` avec la structure suivante :

```typescript
interface PaymentCI {
  id: string
  contractId: string
  monthIndex: number
  dueDate: Date
  amount: number
  status: 'DUE' | 'PAID' | 'PARTIAL'
  paidAt?: Date
  accumulatedAmount: number
  proofUrl?: string
  createdAt: Date
  updatedAt: Date
}
```

### 2.2. Structure des notifications

Les notifications de versement suivent le modèle unifié défini dans [`../notifications/ARCHITECTURE_NOTIFICATIONS.md`](../notifications/ARCHITECTURE_NOTIFICATIONS.md) :

```typescript
interface Notification {
  id: string
  module: 'caisse_imprevue'
  entityId: string // contractId
  type: 'payment_due'
  title: string
  message: string
  isRead: boolean
  createdAt: Date
  scheduledAt?: Date
  sentAt?: Date
  metadata: {
    contractId: string
    paymentFrequency: 'DAILY' | 'MONTHLY'
    dueDate: string // ISO string
    amount: number
    monthIndex: number
    daysUntil: number // -1, 0, ou 1
    memberId?: string
    memberFirstName?: string
    memberLastName?: string
  }
}
```

## 3. Implémentation

### 3.1. Cloud Function (Job planifié)

**Fichier** : `functions/src/scheduled/caisseImprevuePaymentNotifications.ts`

```typescript
import * as functions from 'firebase-functions'
import * as admin from 'firebase-admin'
import { NotificationService } from '../services/NotificationService'

/**
 * Job planifié qui s'exécute quotidiennement à 8h00
 * Vérifie les versements programmés et crée les notifications appropriées
 */
export const checkCaisseImprevuePaymentNotifications = functions
  .region('us-central1')
  .pubsub.schedule('0 8 * * *') // Tous les jours à 8h00 UTC
  .timeZone('Africa/Libreville') // Fuseau horaire du Gabon
  .onRun(async (context) => {
    const db = admin.firestore()
    const notificationService = new NotificationService()
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    console.log(`[CI Payment Notifications] Début du job - ${today.toISOString()}`)

    try {
      // 1. Récupérer tous les contrats actifs
      const contractsSnapshot = await db
        .collection('contractsCI')
        .where('status', '==', 'ACTIVE')
        .get()

      console.log(`[CI Payment Notifications] ${contractsSnapshot.size} contrats actifs trouvés`)

      let notificationsCreated = 0

      // 2. Pour chaque contrat, vérifier les versements programmés
      for (const contractDoc of contractsSnapshot.docs) {
        const contract = contractDoc.data()
        const contractId = contractDoc.id

        try {
          // Récupérer tous les versements du contrat
          const paymentsSnapshot = await db
            .collection('contractsCI')
            .doc(contractId)
            .collection('payments')
            .where('status', 'in', ['DUE', 'PARTIAL'])
            .get()

          for (const paymentDoc of paymentsSnapshot.docs) {
            const payment = paymentDoc.data()
            const dueDate = payment.dueDate?.toDate()
            
            if (!dueDate) continue

            // Normaliser la date d'échéance (sans heures)
            const dueDateNormalized = new Date(dueDate)
            dueDateNormalized.setHours(0, 0, 0, 0)

            // Calculer les jours jusqu'à l'échéance
            const diffTime = dueDateNormalized.getTime() - today.getTime()
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))

            // Vérifier si on doit créer une notification (J-1, J, ou J+1)
            if (diffDays === 1) {
              // J-1 : Versement prévu demain
              await createPaymentNotification(
                notificationService,
                contract,
                contractId,
                payment,
                paymentDoc.id,
                1,
                'Versement à effectuer demain',
                `Un versement de ${formatAmount(payment.amount || payment.targetAmount)} FCFA est prévu demain pour le contrat ${contractId.slice(-6)} de ${contract.memberFirstName} ${contract.memberLastName} (${contract.paymentFrequency === 'DAILY' ? 'journalier' : 'mensuel'})`
              )
              notificationsCreated++
            } else if (diffDays === 0) {
              // J : Versement prévu aujourd'hui
              await createPaymentNotification(
                notificationService,
                contract,
                contractId,
                payment,
                paymentDoc.id,
                0,
                'Versement à effectuer aujourd\'hui',
                `Un versement de ${formatAmount(payment.amount || payment.targetAmount)} FCFA est prévu aujourd'hui pour le contrat ${contractId.slice(-6)} de ${contract.memberFirstName} ${contract.memberLastName} (${contract.paymentFrequency === 'DAILY' ? 'journalier' : 'mensuel'})`
              )
              notificationsCreated++
            } else if (diffDays === -1) {
              // J+1 : Versement en retard (était prévu hier et n'est pas encore payé)
              await createPaymentNotification(
                notificationService,
                contract,
                contractId,
                payment,
                paymentDoc.id,
                -1,
                'Versement en retard',
                `Un versement de ${formatAmount(payment.amount || payment.targetAmount)} FCFA était prévu hier pour le contrat ${contractId.slice(-6)} de ${contract.memberFirstName} ${contract.memberLastName} (${contract.paymentFrequency === 'DAILY' ? 'journalier' : 'mensuel'}) et n'a pas encore été effectué`
              )
              notificationsCreated++
            }
          }
        } catch (error) {
          console.error(`[CI Payment Notifications] Erreur pour le contrat ${contractId}:`, error)
          // Continuer avec le contrat suivant
        }
      }

      console.log(`[CI Payment Notifications] ${notificationsCreated} notifications créées`)
      return { success: true, notificationsCreated }
    } catch (error) {
      console.error('[CI Payment Notifications] Erreur générale:', error)
      throw error
    }
  })

/**
 * Crée une notification de versement programmé
 */
async function createPaymentNotification(
  notificationService: NotificationService,
  contract: any,
  contractId: string,
  payment: any,
  paymentId: string,
  daysUntil: number,
  title: string,
  message: string
) {
  const todayStr = new Date().toISOString().split('T')[0]
  const dueDateStr = payment.dueDate?.toDate()?.toISOString().split('T')[0] || ''

  // Vérifier si une notification existe déjà pour ce versement et ce jour
  const existingNotifications = await notificationService.getNotificationsByModule('caisse_imprevue', {
    type: 'payment_due',
    searchQuery: contractId, // Filtrer par contractId dans les métadonnées
  })

  const alreadyExists = existingNotifications.some(n =>
    n.metadata?.contractId === contractId &&
    n.metadata?.monthIndex === payment.monthIndex &&
    n.metadata?.notificationDate === todayStr &&
    n.metadata?.daysUntil === daysUntil
  )

  if (alreadyExists) {
    console.log(`[CI Payment Notifications] Notification déjà créée pour le contrat ${contractId}, versement ${paymentId}, J${daysUntil >= 0 ? '-' : '+'}${Math.abs(daysUntil)}`)
    return
  }

  // Créer la notification
  await notificationService.createNotification({
    module: 'caisse_imprevue',
    entityId: contractId,
    type: 'payment_due',
    title,
    message,
    metadata: {
      contractId,
      paymentFrequency: contract.paymentFrequency,
      dueDate: dueDateStr,
      amount: payment.amount || payment.targetAmount || 0,
      monthIndex: payment.monthIndex,
      daysUntil,
      memberId: contract.memberId,
      memberFirstName: contract.memberFirstName,
      memberLastName: contract.memberLastName,
      notificationDate: todayStr,
    },
  })

  console.log(`[CI Payment Notifications] Notification créée: ${title} pour le contrat ${contractId}`)
}

/**
 * Formate un montant en FCFA
 */
function formatAmount(amount: number): string {
  return new Intl.NumberFormat('fr-FR').format(amount)
}
```

### 3.2. Service de notifications

Le service `NotificationService` doit être étendu pour supporter les requêtes par métadonnées. La méthode `getNotificationsByModule` doit être capable de filtrer par `contractId` dans les métadonnées.

**Note** : Si le filtrage par métadonnées n'est pas supporté directement par Firestore, il faudra :
1. Récupérer toutes les notifications du module
2. Filtrer côté client par `metadata.contractId`

### 3.3. Intégration dans le service CaisseImprevueService

Une méthode helper peut être ajoutée dans `CaisseImprevueService` pour créer manuellement des notifications de versement (utile pour les tests ou les cas spéciaux) :

```typescript
/**
 * Crée une notification de versement programmé
 * (Principalement utilisé par le job planifié, mais peut être appelé manuellement)
 */
async createPaymentDueNotification(
  contractId: string,
  paymentId: string,
  monthIndex: number,
  dueDate: Date,
  amount: number,
  daysUntil: number
): Promise<void> {
  const contract = await this.getContractCIById(contractId)
  if (!contract) {
    throw new Error(`Contrat ${contractId} introuvable`)
  }

  const frequencyLabel = contract.paymentFrequency === 'DAILY' ? 'journalier' : 'mensuel'
  const todayStr = new Date().toISOString().split('T')[0]
  const dueDateStr = dueDate.toISOString().split('T')[0]

  let title: string
  let message: string

  if (daysUntil === 1) {
    title = 'Versement à effectuer demain'
    message = `Un versement de ${new Intl.NumberFormat('fr-FR').format(amount)} FCFA est prévu demain pour le contrat ${contractId.slice(-6)} de ${contract.memberFirstName} ${contract.memberLastName} (${frequencyLabel})`
  } else if (daysUntil === 0) {
    title = 'Versement à effectuer aujourd\'hui'
    message = `Un versement de ${new Intl.NumberFormat('fr-FR').format(amount)} FCFA est prévu aujourd'hui pour le contrat ${contractId.slice(-6)} de ${contract.memberFirstName} ${contract.memberLastName} (${frequencyLabel})`
  } else { // daysUntil === -1
    title = 'Versement en retard'
    message = `Un versement de ${new Intl.NumberFormat('fr-FR').format(amount)} FCFA était prévu hier pour le contrat ${contractId.slice(-6)} de ${contract.memberFirstName} ${contract.memberLastName} (${frequencyLabel}) et n'a pas encore été effectué`
  }

  await this.notificationService.createNotification({
    module: 'caisse_imprevue',
    entityId: contractId,
    type: 'payment_due',
    title,
    message,
    metadata: {
      contractId,
      paymentFrequency: contract.paymentFrequency,
      dueDate: dueDateStr,
      amount,
      monthIndex,
      daysUntil,
      memberId: contract.memberId,
      memberFirstName: contract.memberFirstName,
      memberLastName: contract.memberLastName,
      notificationDate: todayStr,
    },
  })
}
```

## 4. Règles de gestion

### 4.1. Déduplication

- Une seule notification par versement et par jour (J-1, J, ou J+1)
- La vérification se fait via `metadata.notificationDate` et `metadata.daysUntil`
- Si une notification existe déjà pour un versement donné et un jour donné, elle n'est pas recréée

### 4.2. Conditions de création

**Notification J-1** :
- Le versement a `status: 'DUE'` ou `status: 'PARTIAL'`
- La `dueDate` est demain (J+1)
- Aucune notification J-1 n'existe déjà pour ce versement aujourd'hui

**Notification J** :
- Le versement a `status: 'DUE'` ou `status: 'PARTIAL'`
- La `dueDate` est aujourd'hui
- Aucune notification J n'existe déjà pour ce versement aujourd'hui

**Notification J+1** :
- Le versement a `status: 'DUE'` ou `status: 'PARTIAL'`
- La `dueDate` était hier
- Aucune notification J+1 n'existe déjà pour ce versement aujourd'hui

### 4.3. Exclusion

- Les versements avec `status: 'PAID'` ne génèrent pas de notifications
- Seuls les contrats avec `status: 'ACTIVE'` sont traités

## 5. Déploiement

### 5.1. Configuration Firestore

**Index nécessaire** :
```
Collection: contractsCI/{contractId}/payments
Champs: status (Ascending), dueDate (Ascending)
```

### 5.2. Déploiement de la Cloud Function

```bash
# Dans le dossier functions/
npm run deploy --only functions:checkCaisseImprevuePaymentNotifications
```

### 5.3. Vérification

Après le déploiement, vérifier :
1. Que la fonction est bien déployée dans Firebase Console
2. Que le trigger cron est configuré (tous les jours à 8h00)
3. Que les notifications sont créées correctement dans Firestore

## 6. Tests

### 6.1. Tests manuels

1. **Créer un contrat avec un versement prévu demain** :
   - Vérifier qu'une notification J-1 est créée le jour précédent

2. **Créer un contrat avec un versement prévu aujourd'hui** :
   - Vérifier qu'une notification J est créée le jour même

3. **Laisser un versement impayé** :
   - Vérifier qu'une notification J+1 est créée le jour suivant

### 6.2. Tests automatisés

Créer des tests unitaires pour :
- La logique de calcul des jours jusqu'à l'échéance
- La déduplication des notifications
- La création des notifications avec les bonnes métadonnées

## 7. Monitoring

### 7.1. Logs

La Cloud Function génère des logs pour :
- Le nombre de contrats traités
- Le nombre de notifications créées
- Les erreurs éventuelles

### 7.2. Alertes

Configurer des alertes pour :
- Échec de la fonction (exception non gérée)
- Aucune notification créée pendant plusieurs jours (anomalie)

## 8. Références

- **Architecture des notifications** : [`../notifications/ARCHITECTURE_NOTIFICATIONS.md`](../notifications/ARCHITECTURE_NOTIFICATIONS.md)
- **Jobs planifiés généraux** : [`../notifications/NF6_JOBS_PLANIFIES.md`](../notifications/NF6_JOBS_PLANIFIES.md)
- **Analyse des contrats CI** : [`./ANALYSE_CAISSE_IMPREVUE_CONTRATS.md`](./ANALYSE_CAISSE_IMPREVUE_CONTRATS.md)
- **Réalisation à faire** : [`./realisationAfaire_contrats.md`](./realisationAfaire_contrats.md)

