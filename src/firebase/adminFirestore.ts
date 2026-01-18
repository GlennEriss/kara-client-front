import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { adminApp, isAdminInitialized } from './admin';

// Créer adminFirestore seulement si adminApp est initialisé
export const adminFirestore: Firestore | null = adminApp ? getFirestore(adminApp) : null;

// Helper pour vérifier si Firestore admin est disponible
export const isAdminFirestoreAvailable = (): boolean => adminFirestore !== null;
