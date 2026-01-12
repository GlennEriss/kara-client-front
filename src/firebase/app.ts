import { firebaseClientConfig, hasValidClientConfig } from './firebaseClientConfig';
import { initializeApp, getApp, getApps, type FirebaseApp } from 'firebase/app';

const setupFirebase = (): FirebaseApp => {
  // Toujours initialiser avec la config (qui peut être mock si les credentials ne sont pas disponibles)
  // Cela permet au build de passer même sans credentials réels
  if (getApps().length) return getApp();
  return initializeApp(firebaseClientConfig);
};

export const app = setupFirebase();

// Export pour vérifier si Firebase Client est initialisé avec de vraies credentials
export const isFirebaseClientInitialized = (): boolean => hasValidClientConfig();
