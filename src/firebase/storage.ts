import { getStorage, connectStorageEmulator, type FirebaseStorage } from 'firebase/storage';
import { app } from './app';

let storageInstance: FirebaseStorage | null = null;

export const getStorageInstance = (): FirebaseStorage => {
  if (!storageInstance) {
    storageInstance = getStorage(app);
    
    // Connect to emulator in development
    /* if (process.env.NODE_ENV === 'development') {
      try {
        console.log('🔧 Connecting storage to emulator...');
        connectStorageEmulator(storageInstance, "127.0.0.1", 9097);
        console.log('✅ Storage connected to emulator');
      } catch (error) {
        console.error('❌ Failed to connect storage to emulator:', error);
      }
    } */
  }
  
  return storageInstance;
};

export const storage = getStorageInstance();

// Helper pour vérifier si Storage utilise de vraies credentials
export const isStorageAvailable = (): boolean => {
  return !!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
};

export {
  ref,
  uploadBytes,
  deleteObject,
  getDownloadURL,
  updateMetadata
} from 'firebase/storage';
