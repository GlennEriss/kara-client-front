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
exports.checkAndNotifyVehicleInsuranceExpiring = checkAndNotifyVehicleInsuranceExpiring;
const admin = __importStar(require("firebase-admin"));
// Initialiser Firebase Admin si pas déjà fait
if (!admin.apps.length) {
    admin.initializeApp();
}
const db = admin.firestore();
/**
 * Vérifie et notifie les assurances véhicules qui expirent bientôt
 */
async function checkAndNotifyVehicleInsuranceExpiring() {
    console.log('Démarrage de la vérification des assurances véhicules qui expirent');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const thirtyDaysFromNow = new Date(today);
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    const sevenDaysFromNow = new Date(today);
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
    try {
        // Récupérer toutes les assurances actives ou qui expirent bientôt
        const insurancesRef = db.collection('vehicleInsurances');
        const insurancesSnapshot = await insurancesRef
            .where('status', 'in', ['active', 'expires_soon'])
            .get();
        console.log(`Nombre d'assurances à vérifier : ${insurancesSnapshot.size}`);
        let notifiedCount = 0;
        let errorCount = 0;
        for (const insuranceDoc of insurancesSnapshot.docs) {
            try {
                const insurance = insuranceDoc.data();
                const insuranceId = insuranceDoc.id;
                if (!insurance.endDate)
                    continue;
                const endDate = insurance.endDate?.toDate ? insurance.endDate.toDate() : new Date(insurance.endDate);
                endDate.setHours(0, 0, 0, 0);
                // Calculer les jours jusqu'à expiration
                const daysUntil = Math.floor((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                // Notifier pour J-30, J-7, J (aujourd'hui), et J+1 (expirée)
                const shouldNotify = daysUntil === 30 || daysUntil === 7 || daysUntil === 0 || daysUntil === -1;
                if (shouldNotify) {
                    // Vérifier qu'une notification n'existe pas déjà pour cette date
                    const notificationsRef = db.collection('notifications');
                    const todayStr = today.toISOString().split('T')[0];
                    const existingNotificationsSnapshot = await notificationsRef
                        .where('module', '==', 'vehicule')
                        .where('type', '==', 'contract_expiring')
                        .where('metadata.insuranceId', '==', insuranceId)
                        .where('metadata.notificationDate', '==', todayStr)
                        .where('metadata.daysUntil', '==', daysUntil)
                        .get();
                    if (existingNotificationsSnapshot.empty) {
                        const holderName = insurance.holderType === 'member'
                            ? `${insurance.memberFirstName || ''} ${insurance.memberLastName || ''}`.trim()
                            : `${insurance.nonMemberFirstName || ''} ${insurance.nonMemberLastName || ''}`.trim();
                        let title;
                        let message;
                        if (daysUntil === 30) {
                            title = 'Assurance expire dans 30 jours';
                            message = `L'assurance véhicule de ${holderName} (${insurance.plateNumber}) expire dans 30 jours (${endDate.toLocaleDateString('fr-FR')}).`;
                        }
                        else if (daysUntil === 7) {
                            title = 'Assurance expire dans 7 jours';
                            message = `L'assurance véhicule de ${holderName} (${insurance.plateNumber}) expire dans 7 jours (${endDate.toLocaleDateString('fr-FR')}).`;
                        }
                        else if (daysUntil === 0) {
                            title = 'Assurance expire aujourd\'hui';
                            message = `L'assurance véhicule de ${holderName} (${insurance.plateNumber}) expire aujourd'hui (${endDate.toLocaleDateString('fr-FR')}).`;
                        }
                        else {
                            // daysUntil === -1
                            title = 'Assurance expirée';
                            message = `L'assurance véhicule de ${holderName} (${insurance.plateNumber}) a expiré hier (${endDate.toLocaleDateString('fr-FR')}).`;
                        }
                        await notificationsRef.add({
                            module: 'vehicule',
                            entityId: insuranceId,
                            type: 'contract_expiring',
                            title,
                            message,
                            isRead: false,
                            metadata: {
                                insuranceId,
                                holderType: insurance.holderType,
                                memberId: insurance.memberId,
                                plateNumber: insurance.plateNumber,
                                endDate: endDate.toISOString(),
                                daysUntil,
                                notificationDate: todayStr,
                            },
                            createdAt: admin.firestore.FieldValue.serverTimestamp(),
                        });
                        notifiedCount++;
                        console.log(`Notification créée pour assurance expirant : ${insuranceId} (J${daysUntil >= 0 ? '-' : '+'}${Math.abs(daysUntil)})`);
                    }
                }
            }
            catch (error) {
                errorCount++;
                console.error(`Erreur lors du traitement de l'assurance ${insuranceDoc.id}:`, error);
            }
        }
        console.log(`Vérification terminée : ${notifiedCount} notifications créées, ${errorCount} erreurs`);
    }
    catch (error) {
        console.error('Erreur lors de la vérification des assurances qui expirent:', error);
        throw error;
    }
}
//# sourceMappingURL=vehicleInsuranceExpiring.js.map