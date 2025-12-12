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
exports.processScheduledNotifications = processScheduledNotifications;
const admin = __importStar(require("firebase-admin"));
// Initialiser Firebase Admin si pas déjà fait
if (!admin.apps.length) {
    admin.initializeApp();
}
const db = admin.firestore();
/**
 * Traite les notifications programmées qui doivent être envoyées
 */
async function processScheduledNotifications() {
    console.log('Démarrage du traitement des notifications programmées');
    const now = new Date();
    const notificationsRef = db.collection('notifications');
    // Récupérer les notifications programmées qui doivent être envoyées
    // (scheduledAt <= now et sentAt == null)
    const snapshot = await notificationsRef
        .where('scheduledAt', '<=', admin.firestore.Timestamp.fromDate(now))
        .where('sentAt', '==', null)
        .get();
    console.log(`Nombre de notifications programmées à traiter : ${snapshot.size}`);
    let processedCount = 0;
    let errorCount = 0;
    for (const doc of snapshot.docs) {
        try {
            // Marquer la notification comme envoyée
            await doc.ref.update({
                sentAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            processedCount++;
            console.log(`Notification ${doc.id} marquée comme envoyée`);
        }
        catch (error) {
            errorCount++;
            console.error(`Erreur lors du traitement de la notification ${doc.id}:`, error);
        }
    }
    console.log(`Traitement terminé : ${processedCount} traitées, ${errorCount} erreurs`);
}
//# sourceMappingURL=scheduledNotifications.js.map