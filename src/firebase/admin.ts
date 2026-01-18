import * as admin from 'firebase-admin';
import { firebaseAdminConfig } from './firebaseAdminConfig';

// Vérifier si les credentials Firebase Admin sont disponibles
const hasValidCredentials = 
  firebaseAdminConfig.projectId && 
  firebaseAdminConfig.clientEmail && 
  firebaseAdminConfig.privateKey;

export const adminApp = hasValidCredentials
  ? (admin.apps.length === 0
      ? (() => {
          try {
            return admin.initializeApp({
              credential: admin.credential.cert(
                firebaseAdminConfig as admin.ServiceAccount
              ),
              projectId: firebaseAdminConfig.projectId,
            });
          } catch (error) {
            console.error('[admin.ts] Erreur lors de l\'initialisation Firebase Admin:', error);
            throw error;
          }
        })()
      : admin.apps[0])
  : null;

// Export pour vérifier si l'admin est disponible
export const isAdminInitialized = (): boolean => adminApp !== null;
