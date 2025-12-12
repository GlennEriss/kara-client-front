import { onSchedule } from 'firebase-functions/v2/scheduler'
import { generateBirthdayNotifications } from './scheduled/birthdayNotifications'
import { processScheduledNotifications } from './scheduled/scheduledNotifications'
import { checkAndNotifyOverdueCommissions } from './scheduled/overdueCommissions'
import { checkAndNotifyCreditPaymentDue } from './scheduled/creditPaymentDue'
import { checkAndNotifyCIPaymentDue } from './scheduled/ciPaymentDue'
import { checkAndNotifyVehicleInsuranceExpiring } from './scheduled/vehicleInsuranceExpiring'

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

// Job quotidien à 9h00 pour vérifier les commissions en retard (Placement)
export const dailyOverdueCommissions = onSchedule(
  {
    schedule: '0 9 * * *', // 9h00 tous les jours
    timeZone: 'Africa/Libreville',
    memory: '512MiB',
    timeoutSeconds: 540, // 9 minutes max
  },
  async (event) => {
    console.log('Démarrage du job quotidien pour les commissions en retard')
    await checkAndNotifyOverdueCommissions()
    console.log('Job terminé avec succès')
  }
)

// Job quotidien à 9h30 pour vérifier les échéances de paiement (Crédit Spéciale)
export const dailyCreditPaymentDue = onSchedule(
  {
    schedule: '30 9 * * *', // 9h30 tous les jours
    timeZone: 'Africa/Libreville',
    memory: '512MiB',
    timeoutSeconds: 540, // 9 minutes max
  },
  async (event) => {
    console.log('Démarrage du job quotidien pour les échéances de paiement de crédit spéciale')
    await checkAndNotifyCreditPaymentDue()
    console.log('Job terminé avec succès')
  }
)

// Job quotidien à 10h00 pour vérifier les échéances de versement (Caisse Imprevue)
export const dailyCIPaymentDue = onSchedule(
  {
    schedule: '0 10 * * *', // 10h00 tous les jours
    timeZone: 'Africa/Libreville',
    memory: '512MiB',
    timeoutSeconds: 540, // 9 minutes max
  },
  async (event) => {
    console.log('Démarrage du job quotidien pour les échéances de versement de caisse imprévue')
    await checkAndNotifyCIPaymentDue()
    console.log('Job terminé avec succès')
  }
)

// Job quotidien à 10h30 pour vérifier les assurances qui expirent (Véhicules)
export const dailyVehicleInsuranceExpiring = onSchedule(
  {
    schedule: '30 10 * * *', // 10h30 tous les jours
    timeZone: 'Africa/Libreville',
    memory: '512MiB',
    timeoutSeconds: 540, // 9 minutes max
  },
  async (event) => {
    console.log('Démarrage du job quotidien pour les assurances véhicules qui expirent')
    await checkAndNotifyVehicleInsuranceExpiring()
    console.log('Job terminé avec succès')
  }
)

