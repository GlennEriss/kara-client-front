import { getAuth, Auth } from 'firebase-admin/auth';
import { App } from 'firebase-admin/app';
import { adminApp, isAdminInitialized } from './admin';

// Créer adminAuth seulement si adminApp est initialisé
export const adminAuth: Auth | null = adminApp ? getAuth(adminApp as App) : null;

// Helper pour vérifier si l'auth admin est disponible
export const isAdminAuthAvailable = (): boolean => adminAuth !== null;
