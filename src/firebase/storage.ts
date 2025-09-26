import { getStorage, connectStorageEmulator } from 'firebase/storage';
import { app } from './app';

let storageInstance: ReturnType<typeof getStorage> | null = null;

export const getStorageInstance = () => {
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

export {
  ref,
  uploadBytes,
  deleteObject,
  getDownloadURL,
  updateMetadata
} from 'firebase/storage';