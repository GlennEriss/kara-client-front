import { connectFirestoreEmulator, getFirestore, type Firestore } from 'firebase/firestore';
import { app } from './app';

// Toujours créer db (même avec config mock pour le build)
export const db: Firestore = getFirestore(app);

/* if (process.env.NODE_ENV === 'development') {
  connectFirestoreEmulator(db, '127.0.0.1', 8080, { mockUserToken: { user_id: 'test-user' } });
} */

// Helper pour vérifier si Firestore utilise de vraies credentials
export const isFirestoreAvailable = (): boolean => {
  return !!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
};

export {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  updateDoc,
  addDoc,
  getDocs,
  getDoc,
  doc,
  or,
  deleteDoc,
  documentId,
  serverTimestamp,
  limit,
  limitToLast,
  QueryDocumentSnapshot,
  setDoc,
  FieldValue,
  getCountFromServer,
  startAfter,
  startAt,
  increment,
  collectionGroup,
  QuerySnapshot,
  runTransaction,
  arrayUnion,
  writeBatch,
  Timestamp,
  DocumentSnapshot
} from 'firebase/firestore';
