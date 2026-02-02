/**
 * @module upload-image.db
 * Upload images to Firebase Storage for membership registration
 */

import { ref, uploadBytes, getDownloadURL, deleteObject, updateMetadata } from '@/firebase/storage';
import { getStorageInstance } from '@/firebase/storage';

interface Image {
  file: File;
  path: string;
}

export const uploadProfilePhoto = async (file: File, userId: string): Promise<{ url: string; path: string }> => {
  try {
    // Get storage instance (this ensures emulator connection)
    const storage = getStorageInstance();

    const timestamp = Date.now();
    const fileName = `${timestamp}_profile-photo.jpg`;
    const filePath = `membership-photos/${fileName}`;

    const storageRef = ref(storage, filePath);
    
    // Upload the file
    const snapshot = await uploadBytes(storageRef, file);

    // Get download URL
    const downloadURL = await getDownloadURL(snapshot.ref);
    
    return {
      url: downloadURL,
      path: filePath
    };
  } catch (error: any) {
    console.error('❌ Upload de photo de profil échoué:');
    console.error('   Type:', error?.constructor?.name);
    console.error('   Code:', error?.code);
    console.error('   Message:', error?.message);
    console.error('   Stack:', error?.stack);
    
    // Vérifier les erreurs spécifiques
    if (error?.code === 'storage/unauthorized' || error?.code === 'storage/permission-denied') {
      console.error('   ⚠️ ERREUR DE PERMISSIONS STORAGE:');
      console.error('      - Vérifiez que Firebase Storage est activé dans Firebase Console');
      console.error('      - Vérifiez que les règles Storage sont déployées: firebase deploy --only storage');
      console.error('      - Vérifiez que les règles autorisent l\'upload sur membership-photos/');
    } else if (error?.code === 'storage/object-not-found' || error?.message?.includes('bucket')) {
      console.error('   ⚠️ PROBLÈME DE CONFIGURATION STORAGE:');
      console.error('      - Vérifiez que le Storage bucket est configuré dans Firebase Console');
      console.error('      - Vérifiez la variable NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET');
    } else if (error?.code === 'storage/quota-exceeded') {
      console.error('   ⚠️ QUOTA STORAGE DÉPASSÉ');
    }
    
    console.error('   Détails complets de l\'erreur:', error);
    console.error('🔍 Error details:', {
      code: error.code,
      message: error.message,
      stack: error.stack,
      url: error.url
    });
    
    // If it's an unauthorized error, try to force emulator connection
    if (error.code === 'storage/unauthorized') {
      try {
        const storage = getStorageInstance();
        
        // Try upload again without metadata
        const timestamp = Date.now();
        const fileName = `${timestamp}_profile-photo.jpg`;
        const filePath = `membership-photos/${fileName}`;
        const storageRef = ref(storage, filePath);
        
        const snapshot = await uploadBytes(storageRef, file);
        const downloadURL = await getDownloadURL(snapshot.ref);
        
        return {
          url: downloadURL,
          path: filePath
        };
      } catch (retryError: any) {
        console.error('❌ Retry also failed:', retryError);
        throw new Error(`Failed to upload profile photo: ${retryError.message}`);
      }
    }
    
    throw new Error(`Failed to upload profile photo: ${error.message}`);
  }
};

/**
 * Upload document photo (recto/verso) to Firebase Storage
 * @param file - The image file to upload
 * @param userId - User identifier for organizing files
 * @param documentType - Type of document (recto/verso)
 * @returns Promise with url and path of uploaded file
 */
export const uploadDocumentPhoto = async (
  file: File, 
  userId: string, 
  documentType: 'recto' | 'verso'
): Promise<{ url: string; path: string }> => {
  try {
    // Get storage instance
    const storage = getStorageInstance();
    
    const timestamp = Date.now();
    const fileName = `${timestamp}_document-${documentType}.webp`;
    const filePath = `membership-documents/${userId}/${fileName}`;

    const storageRef = ref(storage, filePath);
    
    // Upload the file
    const snapshot = await uploadBytes(storageRef, file);

    // Get download URL
    const downloadURL = await getDownloadURL(snapshot.ref);
    
    return {
      url: downloadURL,
      path: filePath
    };
  } catch (error: any) {
    console.error(`❌ Upload de document ${documentType} échoué:`);
    console.error('   Type:', error?.constructor?.name);
    console.error('   Code:', error?.code);
    console.error('   Message:', error?.message);
    console.error('   Stack:', error?.stack);
    
    // Vérifier les erreurs spécifiques
    if (error?.code === 'storage/unauthorized' || error?.code === 'storage/permission-denied') {
      console.error('   ⚠️ ERREUR DE PERMISSIONS STORAGE:');
      console.error('      - Vérifiez que Firebase Storage est activé dans Firebase Console');
      console.error('      - Vérifiez que les règles Storage sont déployées: firebase deploy --only storage');
      console.error('      - Vérifiez que les règles autorisent l\'upload sur membership-documents/');
    } else if (error?.code === 'storage/object-not-found' || error?.message?.includes('bucket')) {
      console.error('   ⚠️ PROBLÈME DE CONFIGURATION STORAGE:');
      console.error('      - Vérifiez que le Storage bucket est configuré dans Firebase Console');
      console.error('      - Vérifiez la variable NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET');
    }
    
    console.error(`   Détails complets de l'erreur (${documentType}):`, error);
    
    // If it's an unauthorized error, try to force emulator connection
    if (error.code === 'storage/unauthorized') {
      try {
        const storage = getStorageInstance();
        
        // Try upload again
        const timestamp = Date.now();
        const fileName = `${timestamp}_document-${documentType}.webp`;
        const filePath = `membership-documents/${userId}/${fileName}`;
        const storageRef = ref(storage, filePath);
        
        const snapshot = await uploadBytes(storageRef, file);
        const downloadURL = await getDownloadURL(snapshot.ref);
        
        return {
          url: downloadURL,
          path: filePath
        };
      } catch (retryError: any) {
        console.error('❌ Document retry also failed:', retryError);
        throw new Error(`Failed to upload ${documentType} document photo: ${retryError.message}`);
      }
    }
    
    throw new Error(`Failed to upload ${documentType} document photo: ${error.message}`);
  }
};

/**
 * Generic file upload function that can be used for various file types.
 */
export async function createFile(file: File, ownerId: string, location: string): Promise<{ url: string; path: string }> {
  try {
    const storage = getStorageInstance();
    
    const timestamp = Date.now();
    const fileName = `${timestamp}_${file.name}`;
    const filePath = `${location}/${fileName}`;
    
    const fileRef = ref(storage, filePath);
    
    // File metadata including owner information
    const metadata = {
      customMetadata: {
        owner: ownerId,
        status: 'InProgress'
      },
    };

    // Upload the file with metadata
    await uploadBytes(fileRef, file, metadata);

    // Get the download URL after upload
    const fileURL = await getDownloadURL(fileRef);

    return { url: fileURL, path: filePath };
  } catch (error) {
    console.error("File upload failed:", error);
    throw new Error("Failed to upload file");
  }
}

/**
 * Updates the status of a file to "Archived" in cloud storage metadata.
 */
export async function updateFileStatus(filePath: string, newStatus: string = 'Archived'): Promise<void> {
  try {
    const storage = getStorageInstance();

    // Reference to the file in storage
    const fileRef = ref(storage, filePath);

    // Update the custom metadata status
    const newMetadata = {
      customMetadata: {
        status: newStatus,
        updatedAt: new Date().toISOString()
      },
    };

    // Apply the updated metadata to the file
    await updateMetadata(fileRef, newMetadata);
  } catch (error) {
    console.error("Failed to update file status:", error);
    throw new Error("Failed to update file metadata");
  }
}

/** Validation upload photo agent (security-review: size 5MB, types jpeg/png/webp) */
const AGENT_PHOTO_MAX_SIZE = 5 * 1024 * 1024
const AGENT_PHOTO_ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
const AGENT_PHOTO_ALLOWED_EXT = ['.jpg', '.jpeg', '.png', '.webp']

export function validateAgentPhotoFile(file: File): void {
  if (file.size > AGENT_PHOTO_MAX_SIZE) {
    throw new Error('Le fichier est trop volumineux (max 5 MB)')
  }
  if (!AGENT_PHOTO_ALLOWED_TYPES.includes(file.type)) {
    throw new Error('Type de fichier invalide. Utilisez jpeg, png ou webp')
  }
  const ext = file.name.toLowerCase().match(/\.[^.]+$/)?.[0]
  if (!ext || !AGENT_PHOTO_ALLOWED_EXT.includes(ext)) {
    throw new Error('Extension invalide. Utilisez .jpg, .jpeg, .png ou .webp')
  }
}

/**
 * Upload photo agent de recouvrement
 * Chemin: agents-recouvrement/{agentId}/photo.{ext}
 */
export async function uploadAgentPhoto(file: File, agentId: string): Promise<{ url: string; path: string }> {
  validateAgentPhotoFile(file)
  const storage = getStorageInstance()
  const ext = file.name.toLowerCase().match(/\.[^.]+$/)?.[0] || '.jpg'
  const filePath = `agents-recouvrement/${agentId}/photo${ext}`
  const storageRef = ref(storage, filePath)
  const snapshot = await uploadBytes(storageRef, file)
  const url = await getDownloadURL(snapshot.ref)
  return { url, path: filePath }
}

/**
 * Deletes a file from Firebase Storage.
 */
export async function deleteFile(filePath: string): Promise<void> {
  try {
    const storage = getStorageInstance();

    // Reference to the file in storage
    const fileRef = ref(storage, filePath);

    // Delete the file
    await deleteObject(fileRef);
  } catch (error) {
    console.error("Failed to delete file:", error);
    throw new Error("Failed to delete file");
  }
}