import { onSchedule } from 'firebase-functions/v2/scheduler'
import { generateBirthdayNotifications } from './scheduled/birthdayNotifications'
import { processScheduledNotifications } from './scheduled/scheduledNotifications'
import { checkAndNotifyOverdueCommissions } from './scheduled/overdueCommissions'
import { checkAndNotifyCreditPaymentDue } from './scheduled/creditPaymentDue'
import { checkAndNotifyCIPaymentDue } from './scheduled/ciPaymentDue'
import { checkAndNotifyVehicleInsuranceExpiring } from './scheduled/vehicleInsuranceExpiring'
import { transformCreditSpecialeToFixe } from './scheduled/transformCreditSpeciale'
import { remindPendingCaisseSpecialeDemands, remindApprovedNotConvertedCaisseSpecialeDemands } from './scheduled/caisseSpecialeDemandReminders'
import { remindPendingCaisseImprevueDemands, remindApprovedNotConvertedCaisseImprevueDemands } from './scheduled/caisseImprevueDemandReminders'
import { verifySecurityCode } from './membership-requests/verifySecurityCode'
import { submitCorrections } from './membership-requests/submitCorrections'
import { renewSecurityCode } from './membership-requests/renewSecurityCode'

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

// Job quotidien à 11h00 pour transformer les crédits spéciaux en crédit fixe après 7 mois
export const dailyTransformCreditSpeciale = onSchedule(
  {
    schedule: '0 11 * * *', // 11h00 tous les jours
    timeZone: 'Africa/Libreville',
    memory: '512MiB',
    timeoutSeconds: 540, // 9 minutes max
  },
  async (event) => {
    console.log('Démarrage du job quotidien pour la transformation des crédits spéciaux en crédit fixe')
    await transformCreditSpecialeToFixe()
    console.log('Job terminé avec succès')
  }
)

// Job quotidien à 9h00 pour rappeler les demandes en attente (Caisse Spéciale)
export const dailyCaisseSpecialePendingReminders = onSchedule(
  {
    schedule: '0 9 * * *', // 9h00 tous les jours
    timeZone: 'Africa/Libreville',
    memory: '512MiB',
    timeoutSeconds: 540, // 9 minutes max
  },
  async (event) => {
    console.log('Démarrage du job quotidien pour les rappels de demandes en attente (Caisse Spéciale)')
    await remindPendingCaisseSpecialeDemands()
    console.log('Job terminé avec succès')
  }
)

// Job quotidien à 10h00 pour rappeler les demandes acceptées non converties (Caisse Spéciale)
export const dailyCaisseSpecialeApprovedNotConvertedReminders = onSchedule(
  {
    schedule: '0 10 * * *', // 10h00 tous les jours
    timeZone: 'Africa/Libreville',
    memory: '512MiB',
    timeoutSeconds: 540, // 9 minutes max
  },
  async (event) => {
    console.log('Démarrage du job quotidien pour les rappels de demandes acceptées non converties (Caisse Spéciale)')
    await remindApprovedNotConvertedCaisseSpecialeDemands()
    console.log('Job terminé avec succès')
  }
)

// Job quotidien à 11h00 pour rappeler les demandes en attente (Caisse Imprévue)
export const dailyCaisseImprevuePendingReminders = onSchedule(
  {
    schedule: '0 11 * * *', // 11h00 tous les jours
    timeZone: 'Africa/Libreville',
    memory: '512MiB',
    timeoutSeconds: 540, // 9 minutes max
  },
  async (event) => {
    console.log('Démarrage du job quotidien pour les rappels de demandes en attente (Caisse Imprévue)')
    await remindPendingCaisseImprevueDemands()
    console.log('Job terminé avec succès')
  }
)

// Job quotidien à 11h30 pour rappeler les demandes acceptées non converties (Caisse Imprévue)
export const dailyCaisseImprevueApprovedNotConvertedReminders = onSchedule(
  {
    schedule: '30 11 * * *', // 11h30 tous les jours
    timeZone: 'Africa/Libreville',
    memory: '512MiB',
    timeoutSeconds: 540, // 9 minutes max
  },
  async (event) => {
    console.log('Démarrage du job quotidien pour les rappels de demandes acceptées non converties (Caisse Imprévue)')
    await remindApprovedNotConvertedCaisseImprevueDemands()
    console.log('Job terminé avec succès')
  }
)

// ==================== CLOUD FUNCTIONS - MEMBERSHIP REQUESTS ====================

// Cloud Function pour vérifier un code de sécurité (transaction atomique)
export { verifySecurityCode }

// Cloud Function pour soumettre les corrections (transaction atomique)
export { submitCorrections }

// Cloud Function pour régénérer le code de sécurité (transaction atomique)
export { renewSecurityCode }

// Cloud Function pour synchroniser les demandes d'adhésion vers Algolia
export { syncToAlgolia } from './membership-requests/syncToAlgolia'
