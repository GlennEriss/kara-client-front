import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore';
import { app } from './app';

export const db = getFirestore(app);

if (process.env.NODE_ENV === 'development') {
  connectFirestoreEmulator(db, '127.0.0.1', 8080, { mockUserToken: { user_id: 'test-user' } });
}

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
  Timestamp
} from 'firebase/firestore';
