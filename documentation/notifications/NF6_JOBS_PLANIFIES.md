# NF6 – Jobs planifiés (Cloud Functions)

Ce document décrit l'implémentation des **jobs planifiés** pour générer automatiquement les notifications, notamment les notifications d'anniversaires.

## 1. Contexte

Les notifications d'anniversaires doivent être générées automatiquement selon les règles suivantes :
- **J-2** : Notification 2 jours avant l'anniversaire
- **J** : Notification le jour de l'anniversaire
- **J+1** : Notification 1 jour après (pour rattrapage si la notification J n'a pas été créée)

Ces notifications doivent être créées **automatiquement** via des jobs planifiés (Cloud Functions) qui s'exécutent quotidiennement.

## 2. Architecture

### 2.1. Structure des fichiers

```
functions/
  src/
    scheduled/
      birthdayNotifications.ts    # Job quotidien pour les anniversaires
      scheduledNotifications.ts    # Job horaire pour notifications programmées
    index.ts                       # Point d'entrée des Cloud Functions
```

### 2.2. Dépendances

- **Firebase Admin SDK** : Pour accéder à Firestore avec les privilèges admin
- **Cloud Functions** : Pour exécuter les jobs selon un planning (cron)
- **NotificationService** : Service backend pour créer les notifications

## 3. Job quotidien pour les anniversaires

### 3.1. Configuration du trigger

**Fichier** : `functions/src/index.ts`

```typescript
import { onSchedule } from 'firebase-functions/v2/scheduler'
import { generateBirthdayNotifications } from './scheduled/birthdayNotifications'

// Job quotidien à 8h00 (heure locale Gabon, UTC+1)
// Format cron : "0 8 * * *" (tous les jours à 8h00)
export const dailyBirthdayNotifications = onSchedule(
  {
    schedule: '0 8 * * *', // 8h00 tous les jours
    timeZone: 'Africa/Libreville', // Fuseau horaire du Gabon
    memory: '512MiB',
    timeoutSeconds: 540, // 9 minutes max
  },
  async (event) => {
    console.log('Démarrage du job quotidien pour les anniversaires')
    await generateBirthdayNotifications()
    console.log('Job terminé avec succès')
  }
)
```

### 3.2. Implémentation du job

**Fichier** : `functions/src/scheduled/birthdayNotifications.ts`

```typescript
import * as admin from 'firebase-admin'
import { NotificationService } from '../../services/notifications/NotificationService'
import { NotificationRepository } from '../../repositories/notifications/NotificationRepository'

// Initialiser Firebase Admin si pas déjà fait
if (!admin.apps.length) {
  admin.initializeApp()
}

const db = admin.firestore()

/**
 * Récupère tous les membres actifs avec birthDate valide
 */
async function getAllActiveMembersWithBirthDate(): Promise<Array<{
  id: string
  firstName: string
  lastName: string
  birthDate: Date
}>> {
  const usersRef = db.collection('users')
  const snapshot = await usersRef
    .where('isActive', '==', true)
    .where('birthDate', '!=', null)
    .get()

  const members: Array<{
    id: string
    firstName: string
    lastName: string
    birthDate: Date
  }> = []

  snapshot.forEach((doc) => {
    const data = doc.data()
    if (data.birthDate) {
      const birthDate = data.birthDate.toDate ? data.birthDate.toDate() : new Date(data.birthDate)
      members.push({
        id: doc.id,
        firstName: data.firstName || '',
        lastName: data.lastName || '',
        birthDate,
      })
    }
  })

  return members
}

/**
 * Calcule le nombre de jours jusqu'au prochain anniversaire
 */
function calculateDaysUntilBirthday(birthDate: Date, today: Date): number {
  const currentYear = today.getFullYear()
  const birthMonth = birthDate.getMonth()
  const birthDay = birthDate.getDate()

  // Calculer le prochain anniversaire
  let nextBirthday = new Date(currentYear, birthMonth, birthDay)
  if (nextBirthday < today) {
    nextBirthday = new Date(currentYear + 1, birthMonth, birthDay)
  }

  // Calculer daysUntil
  const diffTime = nextBirthday.getTime() - today.getTime()
  const daysUntil = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  return daysUntil
}

/**
 * Vérifie si une notification J a été créée hier pour un membre
 */
async function wasNotifiedYesterday(
  memberId: string,
  yesterday: Date,
  notificationRepository: NotificationRepository
): Promise<boolean> {
  const notifications = await notificationRepository.getNotificationsByModule('memberships', {
    type: 'birthday_reminder',
  })

  const yesterdayStr = yesterday.toISOString().split('T')[0]

  return notifications.some(
    (n) =>
      n.metadata?.memberId === memberId &&
      n.metadata?.daysUntil === 0 &&
      n.createdAt.toISOString().split('T')[0] === yesterdayStr
  )
}

/**
 * Job principal : génère les notifications d'anniversaires
 */
export async function generateBirthdayNotifications(): Promise<void> {
  console.log('Démarrage de la génération des notifications d\'anniversaires')

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  // Initialiser les services
  const notificationRepository = new NotificationRepository()
  const notificationService = new NotificationService(notificationRepository)

  // 1. Récupérer tous les membres actifs avec birthDate valide
  const members = await getAllActiveMembersWithBirthDate()
  console.log(`Nombre de membres avec date de naissance : ${members.length}`)

  let createdCount = 0
  let skippedCount = 0
  let errorCount = 0

  // 2. Pour chaque membre, calculer les jours jusqu'au prochain anniversaire
  for (const member of members) {
    try {
      const daysUntil = calculateDaysUntilBirthday(member.birthDate, today)

      // 3. Créer les notifications selon les règles
      if (daysUntil === 2) {
        // Notification J-2
        await notificationService.createBirthdayNotification(
          member.id,
          member.firstName,
          member.lastName,
          member.birthDate,
          2
        )
        createdCount++
        console.log(`Notification J-2 créée pour ${member.firstName} ${member.lastName}`)
      } else if (daysUntil === 0) {
        // Notification J (aujourd'hui)
        await notificationService.createBirthdayNotification(
          member.id,
          member.firstName,
          member.lastName,
          member.birthDate,
          0
        )
        createdCount++
        console.log(`Notification J créée pour ${member.firstName} ${member.lastName}`)
      } else if (daysUntil === -1) {
        // Notification J+1 (hier, pour rattrapage)
        // Vérifier d'abord qu'une notification J n'a pas déjà été créée hier
        const wasNotified = await wasNotifiedYesterday(
          member.id,
          yesterday,
          notificationRepository
        )

        if (!wasNotified) {
          await notificationService.createBirthdayNotification(
            member.id,
            member.firstName,
            member.lastName,
            member.birthDate,
            -1
          )
          createdCount++
          console.log(`Notification J+1 créée pour ${member.firstName} ${member.lastName}`)
        } else {
          skippedCount++
          console.log(
            `Notification J+1 ignorée pour ${member.firstName} ${member.lastName} (déjà notifié hier)`
          )
        }
      } else {
        skippedCount++
      }
    } catch (error) {
      errorCount++
      console.error(
        `Erreur lors de la création de notification pour ${member.firstName} ${member.lastName}:`,
        error
      )
    }
  }

  console.log(`Job terminé : ${createdCount} créées, ${skippedCount} ignorées, ${errorCount} erreurs`)
}

/**
 * Fonction de test (pour exécution manuelle)
 */
export async function testBirthdayNotifications(): Promise<void> {
  console.log('=== TEST : Génération des notifications d\'anniversaires ===')
  await generateBirthdayNotifications()
  console.log('=== TEST TERMINÉ ===')
}
```

## 4. Job horaire pour notifications programmées

### 4.1. Configuration du trigger

**Fichier** : `functions/src/index.ts`

```typescript
import { onSchedule } from 'firebase-functions/v2/scheduler'
import { processScheduledNotifications } from './scheduled/scheduledNotifications'

// Job horaire pour traiter les notifications programmées
export const hourlyScheduledNotifications = onSchedule(
  {
    schedule: '0 * * * *', // Toutes les heures
    timeZone: 'Africa/Libreville',
    memory: '256MiB',
    timeoutSeconds: 300, // 5 minutes max
  },
  async (event) => {
    console.log('Démarrage du job horaire pour notifications programmées')
    await processScheduledNotifications()
    console.log('Job terminé avec succès')
  }
)
```

### 4.2. Implémentation du job

**Fichier** : `functions/src/scheduled/scheduledNotifications.ts`

```typescript
import * as admin from 'firebase-admin'
import { NotificationRepository } from '../../repositories/notifications/NotificationRepository'

// Initialiser Firebase Admin si pas déjà fait
if (!admin.apps.length) {
  admin.initializeApp()
}

/**
 * Traite les notifications programmées qui doivent être envoyées
 */
export async function processScheduledNotifications(): Promise<void> {
  console.log('Démarrage du traitement des notifications programmées')

  const now = new Date()
  const notificationRepository = new NotificationRepository()

  // Récupérer les notifications programmées à envoyer
  const scheduledNotifications = await notificationRepository.getScheduledNotifications(now)

  console.log(`Nombre de notifications programmées à traiter : ${scheduledNotifications.length}`)

  let processedCount = 0
  let errorCount = 0

  for (const notification of scheduledNotifications) {
    try {
      // Marquer la notification comme envoyée
      await notificationRepository.markAsSent(notification.id)
      processedCount++
      console.log(`Notification ${notification.id} marquée comme envoyée`)
    } catch (error) {
      errorCount++
      console.error(`Erreur lors du traitement de la notification ${notification.id}:`, error)
    }
  }

  console.log(`Job terminé : ${processedCount} traitées, ${errorCount} erreurs`)
}
```

## 5. Déploiement

### 5.1. Configuration Firebase

**Fichier** : `firebase.json`

```json
{
  "functions": {
    "source": "functions",
    "runtime": "nodejs20",
    "predeploy": ["npm --prefix \"$RESOURCE_DIR\" run build"]
  }
}
```

### 5.2. Dépendances

**Fichier** : `functions/package.json`

```json
{
  "dependencies": {
    "firebase-admin": "^12.0.0",
    "firebase-functions": "^5.0.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "typescript": "^5.0.0"
  }
}
```

### 5.3. Commandes de déploiement

```bash
# Déployer toutes les fonctions
firebase deploy --only functions

# Déployer uniquement les jobs planifiés
firebase deploy --only functions:dailyBirthdayNotifications,functions:hourlyScheduledNotifications

# Tester localement (avec Firebase Emulator)
firebase emulators:start --only functions
```

## 6. Tests

### 6.1. Test local

```typescript
// Dans functions/src/index.ts (temporairement)
import { testBirthdayNotifications } from './scheduled/birthdayNotifications'

// Appeler manuellement pour tester
testBirthdayNotifications()
```

### 6.2. Test en production

- Vérifier les logs Cloud Functions dans la console Firebase
- Vérifier que les notifications sont créées dans Firestore
- Vérifier que le badge de notifications se met à jour dans l'interface

## 7. Monitoring et logs

### 7.1. Logs importants

- Nombre de membres traités
- Nombre de notifications créées
- Nombre de notifications ignorées (doublons)
- Erreurs éventuelles

### 7.2. Alertes

Configurer des alertes dans Firebase Console pour :
- Échecs de jobs
- Temps d'exécution anormalement long
- Nombre de notifications créées anormalement bas/élevé

## 8. Évolutions futures

- **Notifications par email/SMS** : Intégrer des services externes (SendGrid, Twilio) dans les jobs
- **Notifications groupées** : Grouper plusieurs notifications similaires
- **Préférences utilisateur** : Respecter les préférences de notification de chaque admin
- **Rétry automatique** : Réessayer automatiquement en cas d'échec

## 9. Références

- **Architecture globale** : [`../architecture/ARCHITECTURE.md`](../architecture/ARCHITECTURE.md)
- **Architecture notifications** : [`./ARCHITECTURE_NOTIFICATIONS.md`](./ARCHITECTURE_NOTIFICATIONS.md)
- **Backlog** : [`./realisationAfaire.md`](./realisationAfaire.md)
- **Documentation Firebase Functions** : https://firebase.google.com/docs/functions
- **Documentation Firebase Scheduler** : https://firebase.google.com/docs/functions/schedule-functions

