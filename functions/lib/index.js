"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dailyCaisseImprevueApprovedNotConvertedReminders = exports.dailyCaisseImprevuePendingReminders = exports.dailyCaisseSpecialeApprovedNotConvertedReminders = exports.dailyCaisseSpecialePendingReminders = exports.dailyTransformCreditSpeciale = exports.dailyVehicleInsuranceExpiring = exports.dailyCIPaymentDue = exports.dailyCreditPaymentDue = exports.dailyOverdueCommissions = exports.hourlyScheduledNotifications = exports.dailyBirthdayNotifications = void 0;
const scheduler_1 = require("firebase-functions/v2/scheduler");
const birthdayNotifications_1 = require("./scheduled/birthdayNotifications");
const scheduledNotifications_1 = require("./scheduled/scheduledNotifications");
const overdueCommissions_1 = require("./scheduled/overdueCommissions");
const creditPaymentDue_1 = require("./scheduled/creditPaymentDue");
const ciPaymentDue_1 = require("./scheduled/ciPaymentDue");
const vehicleInsuranceExpiring_1 = require("./scheduled/vehicleInsuranceExpiring");
const transformCreditSpeciale_1 = require("./scheduled/transformCreditSpeciale");
const caisseSpecialeDemandReminders_1 = require("./scheduled/caisseSpecialeDemandReminders");
const caisseImprevueDemandReminders_1 = require("./scheduled/caisseImprevueDemandReminders");
// Job quotidien à 8h00 (heure locale Gabon, UTC+1)
// Format cron : "0 8 * * *" (tous les jours à 8h00)
exports.dailyBirthdayNotifications = (0, scheduler_1.onSchedule)({
    schedule: '0 8 * * *', // 8h00 tous les jours
    timeZone: 'Africa/Libreville', // Fuseau horaire du Gabon
    memory: '512MiB',
    timeoutSeconds: 540, // 9 minutes max
}, async (event) => {
    console.log('Démarrage du job quotidien pour les anniversaires');
    await (0, birthdayNotifications_1.generateBirthdayNotifications)();
    console.log('Job terminé avec succès');
});
// Job horaire pour traiter les notifications programmées
exports.hourlyScheduledNotifications = (0, scheduler_1.onSchedule)({
    schedule: '0 * * * *', // Toutes les heures
    timeZone: 'Africa/Libreville',
    memory: '256MiB',
    timeoutSeconds: 300, // 5 minutes max
}, async (event) => {
    console.log('Démarrage du job horaire pour notifications programmées');
    await (0, scheduledNotifications_1.processScheduledNotifications)();
    console.log('Job terminé avec succès');
});
// Job quotidien à 9h00 pour vérifier les commissions en retard (Placement)
exports.dailyOverdueCommissions = (0, scheduler_1.onSchedule)({
    schedule: '0 9 * * *', // 9h00 tous les jours
    timeZone: 'Africa/Libreville',
    memory: '512MiB',
    timeoutSeconds: 540, // 9 minutes max
}, async (event) => {
    console.log('Démarrage du job quotidien pour les commissions en retard');
    await (0, overdueCommissions_1.checkAndNotifyOverdueCommissions)();
    console.log('Job terminé avec succès');
});
// Job quotidien à 9h30 pour vérifier les échéances de paiement (Crédit Spéciale)
exports.dailyCreditPaymentDue = (0, scheduler_1.onSchedule)({
    schedule: '30 9 * * *', // 9h30 tous les jours
    timeZone: 'Africa/Libreville',
    memory: '512MiB',
    timeoutSeconds: 540, // 9 minutes max
}, async (event) => {
    console.log('Démarrage du job quotidien pour les échéances de paiement de crédit spéciale');
    await (0, creditPaymentDue_1.checkAndNotifyCreditPaymentDue)();
    console.log('Job terminé avec succès');
});
// Job quotidien à 10h00 pour vérifier les échéances de versement (Caisse Imprevue)
exports.dailyCIPaymentDue = (0, scheduler_1.onSchedule)({
    schedule: '0 10 * * *', // 10h00 tous les jours
    timeZone: 'Africa/Libreville',
    memory: '512MiB',
    timeoutSeconds: 540, // 9 minutes max
}, async (event) => {
    console.log('Démarrage du job quotidien pour les échéances de versement de caisse imprévue');
    await (0, ciPaymentDue_1.checkAndNotifyCIPaymentDue)();
    console.log('Job terminé avec succès');
});
// Job quotidien à 10h30 pour vérifier les assurances qui expirent (Véhicules)
exports.dailyVehicleInsuranceExpiring = (0, scheduler_1.onSchedule)({
    schedule: '30 10 * * *', // 10h30 tous les jours
    timeZone: 'Africa/Libreville',
    memory: '512MiB',
    timeoutSeconds: 540, // 9 minutes max
}, async (event) => {
    console.log('Démarrage du job quotidien pour les assurances véhicules qui expirent');
    await (0, vehicleInsuranceExpiring_1.checkAndNotifyVehicleInsuranceExpiring)();
    console.log('Job terminé avec succès');
});
// Job quotidien à 11h00 pour transformer les crédits spéciaux en crédit fixe après 7 mois
exports.dailyTransformCreditSpeciale = (0, scheduler_1.onSchedule)({
    schedule: '0 11 * * *', // 11h00 tous les jours
    timeZone: 'Africa/Libreville',
    memory: '512MiB',
    timeoutSeconds: 540, // 9 minutes max
}, async (event) => {
    console.log('Démarrage du job quotidien pour la transformation des crédits spéciaux en crédit fixe');
    await (0, transformCreditSpeciale_1.transformCreditSpecialeToFixe)();
    console.log('Job terminé avec succès');
});
// Job quotidien à 9h00 pour rappeler les demandes en attente (Caisse Spéciale)
exports.dailyCaisseSpecialePendingReminders = (0, scheduler_1.onSchedule)({
    schedule: '0 9 * * *', // 9h00 tous les jours
    timeZone: 'Africa/Libreville',
    memory: '512MiB',
    timeoutSeconds: 540, // 9 minutes max
}, async (event) => {
    console.log('Démarrage du job quotidien pour les rappels de demandes en attente (Caisse Spéciale)');
    await (0, caisseSpecialeDemandReminders_1.remindPendingCaisseSpecialeDemands)();
    console.log('Job terminé avec succès');
});
// Job quotidien à 10h00 pour rappeler les demandes acceptées non converties (Caisse Spéciale)
exports.dailyCaisseSpecialeApprovedNotConvertedReminders = (0, scheduler_1.onSchedule)({
    schedule: '0 10 * * *', // 10h00 tous les jours
    timeZone: 'Africa/Libreville',
    memory: '512MiB',
    timeoutSeconds: 540, // 9 minutes max
}, async (event) => {
    console.log('Démarrage du job quotidien pour les rappels de demandes acceptées non converties (Caisse Spéciale)');
    await (0, caisseSpecialeDemandReminders_1.remindApprovedNotConvertedCaisseSpecialeDemands)();
    console.log('Job terminé avec succès');
});
// Job quotidien à 11h00 pour rappeler les demandes en attente (Caisse Imprévue)
exports.dailyCaisseImprevuePendingReminders = (0, scheduler_1.onSchedule)({
    schedule: '0 11 * * *', // 11h00 tous les jours
    timeZone: 'Africa/Libreville',
    memory: '512MiB',
    timeoutSeconds: 540, // 9 minutes max
}, async (event) => {
    console.log('Démarrage du job quotidien pour les rappels de demandes en attente (Caisse Imprévue)');
    await (0, caisseImprevueDemandReminders_1.remindPendingCaisseImprevueDemands)();
    console.log('Job terminé avec succès');
});
// Job quotidien à 11h30 pour rappeler les demandes acceptées non converties (Caisse Imprévue)
exports.dailyCaisseImprevueApprovedNotConvertedReminders = (0, scheduler_1.onSchedule)({
    schedule: '30 11 * * *', // 11h30 tous les jours
    timeZone: 'Africa/Libreville',
    memory: '512MiB',
    timeoutSeconds: 540, // 9 minutes max
}, async (event) => {
    console.log('Démarrage du job quotidien pour les rappels de demandes acceptées non converties (Caisse Imprévue)');
    await (0, caisseImprevueDemandReminders_1.remindApprovedNotConvertedCaisseImprevueDemands)();
    console.log('Job terminé avec succès');
});
//# sourceMappingURL=index.js.map