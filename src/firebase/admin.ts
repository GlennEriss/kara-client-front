import * as admin from 'firebase-admin';
import { firebaseAdminConfig } from './firebaseAdminConfig';

// Vérifier si les credentials Firebase Admin sont disponibles
const hasValidCredentials = 
  firebaseAdminConfig.projectId && 
  firebaseAdminConfig.clientEmail && 
  firebaseAdminConfig.privateKey;

export const adminApp = hasValidCredentials
  ? (admin.apps.length === 0
      ? admin.initializeApp({
          credential: admin.credential.cert(
            firebaseAdminConfig as admin.ServiceAccount
          ),
        })
      : admin.apps[0])
  : null;

// Export pour vérifier si l'admin est disponible
export const isAdminInitialized = (): boolean => adminApp !== null;
