import { NextResponse } from "next/server";
import { adminAuth } from "@/firebase/adminAuth";
import { adminFirestore } from "@/firebase/adminFirestore";
import { isAdminInitialized } from "@/firebase/admin";
import { firebaseAdminConfig } from "@/firebase/firebaseAdminConfig";
import * as admin from 'firebase-admin';

/**
 * Route de débogage pour vérifier la configuration Firebase Admin
 * 
 * GET /api/auth/check-user/debug
 * Returns: État de la configuration Firebase Admin
 */
export async function GET() {
  const adminFirestoreInfo: {
    available: boolean;
    connectionTest?: string;
    testDocExists?: boolean;
    error?: string;
  } = {
    available: !!adminFirestore,
  };

  const debugInfo = {
    timestamp: new Date().toISOString(),
    adminApp: {
      initialized: isAdminInitialized(),
      appsCount: admin.apps.length,
    },
    adminAuth: {
      available: !!adminAuth,
    },
    adminFirestore: adminFirestoreInfo,
    config: {
      hasProjectId: !!firebaseAdminConfig.projectId,
      hasClientEmail: !!firebaseAdminConfig.clientEmail,
      hasPrivateKey: !!firebaseAdminConfig.privateKey,
      projectId: firebaseAdminConfig.projectId,
      clientEmail: firebaseAdminConfig.clientEmail,
      privateKeyLength: firebaseAdminConfig.privateKey?.length || 0,
    },
    env: {
      nodeEnv: process.env.NODE_ENV,
      hasFirebaseProjectId: !!process.env.FIREBASE_PROJECT_ID,
      hasFirebaseClientEmail: !!process.env.FIREBASE_CLIENT_EMAIL,
      hasFirebasePrivateKey: !!process.env.FIREBASE_PRIVATE_KEY,
    },
  };

  // Test de connexion si disponible
  if (adminFirestore) {
    try {
      const testDoc = await adminFirestore.collection('_test').doc('connection').get();
      adminFirestoreInfo.connectionTest = 'success';
      adminFirestoreInfo.testDocExists = testDoc.exists;
    } catch (error: any) {
      adminFirestoreInfo.connectionTest = 'error';
      adminFirestoreInfo.error = error?.message;
    }
  }

  return NextResponse.json(debugInfo, { status: 200 });
}
