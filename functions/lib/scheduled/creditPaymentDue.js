"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkAndNotifyCreditPaymentDue = checkAndNotifyCreditPaymentDue;
const admin = __importStar(require("firebase-admin"));
// Initialiser Firebase Admin si pas déjà fait
if (!admin.apps.length) {
    admin.initializeApp();
}
const db = admin.firestore();
/**
 * Vérifie et notifie les échéances de paiement pour les crédits spéciaux
 */
async function checkAndNotifyCreditPaymentDue() {
    console.log('Démarrage de la vérification des échéances de paiement de crédit spéciale');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const threeDaysFromNow = new Date(today);
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
    try {
        // Récupérer tous les contrats actifs
        const contractsRef = db.collection('creditContracts');
        const activeContractsSnapshot = await contractsRef
            .where('status', 'in', ['ACTIVE', 'PARTIAL'])
            .get();
        console.log(`Nombre de contrats actifs : ${activeContractsSnapshot.size}`);
        let notifiedCount = 0;
        let errorCount = 0;
        for (const contractDoc of activeContractsSnapshot.docs) {
            try {
                const contract = contractDoc.data();
                const contractId = contractDoc.id;
                if (!contract.nextDueAt)
                    continue;
                const dueDate = contract.nextDueAt?.toDate ? contract.nextDueAt.toDate() : new Date(contract.nextDueAt);
                dueDate.setHours(0, 0, 0, 0);
                // Vérifier si l'échéance est dans 3 jours ou aujourd'hui
                if (dueDate >= today && dueDate <= threeDaysFromNow) {
                    const daysUntil = Math.floor((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                    // Vérifier qu'une notification n'existe pas déjà pour cette échéance
                    const notificationsRef = db.collection('notifications');
                    const todayStr = today.toISOString().split('T')[0];
                    const existingNotificationsSnapshot = await notificationsRef
                        .where('module', '==', 'credit_speciale')
                        .where('type', '==', 'reminder')
                        .where('metadata.contractId', '==', contractId)
                        .where('metadata.notificationDate', '==', todayStr)
                        .where('metadata.daysUntil', '==', daysUntil)
                        .get();
                    if (existingNotificationsSnapshot.empty) {
                        // Créer la notification
                        const monthlyAmount = contract.monthlyPaymentAmount || 0;
                        const monthlyAmountFormatted = typeof monthlyAmount === 'number' ? monthlyAmount.toLocaleString('fr-FR') : String(monthlyAmount);
                        const message = daysUntil === 0
                            ? `Échéance de paiement aujourd'hui pour le contrat de crédit ${contract.creditType} de ${contract.clientFirstName} ${contract.clientLastName}. Montant : ${monthlyAmountFormatted} FCFA.`
                            : `Échéance de paiement dans ${daysUntil} jour(s) pour le contrat de crédit ${contract.creditType} de ${contract.clientFirstName} ${contract.clientLastName}. Montant : ${monthlyAmountFormatted} FCFA.`;
                        await notificationsRef.add({
                            module: 'credit_speciale',
                            entityId: contractId,
                            type: 'reminder',
                            title: daysUntil === 0 ? 'Échéance de paiement aujourd\'hui' : `Échéance de paiement dans ${daysUntil} jour(s)`,
                            message,
                            isRead: false,
                            metadata: {
                                contractId,
                                clientId: contract.clientId,
                                creditType: contract.creditType,
                                monthlyPaymentAmount: monthlyAmount,
                                dueDate: dueDate.toISOString(),
                                daysUntil,
                                notificationDate: todayStr,
                            },
                            createdAt: admin.firestore.FieldValue.serverTimestamp(),
                        });
                        notifiedCount++;
                        console.log(`Notification créée pour échéance de paiement : ${contractId} (J${daysUntil >= 0 ? '-' : '+'}${Math.abs(daysUntil)})`);
                    }
                }
            }
            catch (error) {
                errorCount++;
                console.error(`Erreur lors du traitement du contrat ${contractDoc.id}:`, error);
            }
        }
        console.log(`Vérification terminée : ${notifiedCount} notifications créées, ${errorCount} erreurs`);
    }
    catch (error) {
        console.error('Erreur lors de la vérification des échéances de paiement:', error);
        throw error;
    }
}
//# sourceMappingURL=creditPaymentDue.js.map