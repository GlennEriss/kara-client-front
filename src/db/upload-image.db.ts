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
    
    console.log('🔍 Storage instance details:');
    console.log('  - App name:', storage.app.name);
    console.log('  - Storage bucket:', storage.app.options.storageBucket);
    console.log('  - Project ID:', storage.app.options.projectId);
    
    // Check if we're connected to emulator
    const isEmulator = storage.app.options.storageBucket?.includes('localhost') || 
                      storage.app.options.storageBucket?.includes('127.0.0.1') ||
                      storage.app.options.storageBucket?.includes('emulator');
    
    console.log('🔍 Emulator check:', {
      bucket: storage.app.options.storageBucket,
      isEmulator,
      nodeEnv: process.env.NODE_ENV
    });

    const timestamp = Date.now();
    const fileName = `${timestamp}_profile-photo.jpg`;
    const filePath = `membership-photos/${fileName}`;
    
    console.log('📁 Uploading to path:', filePath);
    console.log('📄 File details:', {
      name: file.name,
      size: file.size,
      type: file.type
    });

    const storageRef = ref(storage, filePath);
    
    console.log('🚀 Starting upload...');
    console.log('🔗 Storage ref:', storageRef.fullPath);
    
    // Upload the file
    const snapshot = await uploadBytes(storageRef, file);
    
    console.log('✅ Upload successful!');
    console.log('📊 Upload completed');

    // Get download URL
    const downloadURL = await getDownloadURL(snapshot.ref);
    
    console.log('🔗 Download URL:', downloadURL);
    
    return {
      url: downloadURL,
      path: filePath
    };
  } catch (error: any) {
    console.error('❌ Upload failed:', error);
    console.error('🔍 Error details:', {
      code: error.code,
      message: error.message,
      stack: error.stack,
      url: error.url
    });
    
    // If it's an unauthorized error, try to force emulator connection
    if (error.code === 'storage/unauthorized') {
      console.log('🔄 Unauthorized error detected, trying to force emulator connection...');
      
      try {
        const storage = getStorageInstance();
        console.log('🔧 Forced storage instance creation');
        
        // Try upload again without metadata
        const timestamp = Date.now();
        const fileName = `${timestamp}_profile-photo.jpg`;
        const filePath = `membership-photos/${fileName}`;
        const storageRef = ref(storage, filePath);
        
        console.log('🔄 Retrying upload without metadata...');
        const snapshot = await uploadBytes(storageRef, file);
        const downloadURL = await getDownloadURL(snapshot.ref);
        
        console.log('✅ Retry successful!');
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