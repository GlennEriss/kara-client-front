import * as admin from 'firebase-admin';
import { firebaseAdminConfig } from './firebaseAdminConfig';
export const adminApp =
  admin.apps.length === 0
    ? admin.initializeApp({
      credential: admin.credential.cert(
        firebaseAdminConfig as admin.ServiceAccount
      ),
    })
    : admin.apps[0];