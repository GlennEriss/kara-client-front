/**
 * @module upload-file.db
 * Upload files to Firebase Storage for contract documents
 */

import { ref, uploadBytes, getDownloadURL, deleteObject, updateMetadata } from '@/firebase/storage';
import { getStorageInstance } from '@/firebase/storage';

interface FileUploadResult {
  url: string;
  path: string;
}

/**
 * Upload a PDF document for contract refunds
 * @param file - The PDF file to upload
 * @param contractId - Contract identifier
 * @param refundId - Refund identifier
 * @param documentType - Type of document (final_refund_document, etc.)
 * @returns Promise with url and path of uploaded file
 */
export const uploadContractDocument = async (
  file: File, 
  contractId: string, 
  refundId: string,
  documentType: 'final_refund_document' | 'early_refund_document' = 'final_refund_document'
): Promise<FileUploadResult> => {
  try {
    // Get storage instance
    const storage = getStorageInstance();
    
    console.log(`🔍 Uploading ${documentType} for contract:`, contractId, 'refund:', refundId);
    console.log('  - Storage instance details:');
    console.log('  - App name:', storage.app.name);
    console.log('  - Storage bucket:', storage.app.options.storageBucket);
    
    // Validate file type
    if (file.type !== 'application/pdf') {
      throw new Error('Seuls les fichiers PDF sont autorisés');
    }
    
    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      throw new Error('Le fichier ne doit pas dépasser 10MB');
    }
    
    const timestamp = Date.now();
    const fileName = `${timestamp}_${documentType}_${contractId}_${refundId}.pdf`;
    const filePath = `contract-documents/${contractId}/${refundId}/${fileName}`;
    
    console.log('📁 Uploading to path:', filePath);
    console.log('📄 File details:', {
      name: file.name,
      size: file.size,
      type: file.type,
      documentType,
      contractId,
      refundId
    });

    const storageRef = ref(storage, filePath);
    
    // File metadata including contract and refund information
    const metadata = {
      customMetadata: {
        contractId,
        refundId,
        documentType,
        uploadedAt: new Date().toISOString(),
        originalFileName: file.name,
        fileSize: file.size.toString()
      },
    };
    
    console.log('🚀 Starting document upload...');
    console.log('🔗 Storage ref:', storageRef.fullPath);
    
    // Upload the file with metadata
    const snapshot = await uploadBytes(storageRef, file, metadata);
    
    console.log(`✅ ${documentType} upload successful!`);
    console.log('📊 Upload completed');

    // Get download URL
    const downloadURL = await getDownloadURL(snapshot.ref);
    
    console.log('🔗 Download URL:', downloadURL);
    
    return {
      url: downloadURL,
      path: filePath
    };
  } catch (error: any) {
    console.error(`❌ ${documentType} upload failed:`, error);
    console.error('🔍 Error details:', {
      code: error.code,
      message: error.message,
      documentType,
      contractId,
      refundId
    });
    
    // If it's an unauthorized error, try to force emulator connection
    if (error.code === 'storage/unauthorized') {
      console.log('🔄 Unauthorized error detected, trying to force emulator connection...');
      
      try {
        const storage = getStorageInstance();
        console.log('🔧 Forced storage instance creation');
        
        // Try upload again without metadata
        const timestamp = Date.now();
        const fileName = `${timestamp}_${documentType}_${contractId}_${refundId}.pdf`;
        const filePath = `contract-documents/${contractId}/${refundId}/${fileName}`;
        const storageRef = ref(storage, filePath);
        
        console.log('🔄 Retrying document upload...');
        const snapshot = await uploadBytes(storageRef, file);
        const downloadURL = await getDownloadURL(snapshot.ref);
        
        console.log(`✅ ${documentType} retry successful!`);
        return {
          url: downloadURL,
          path: filePath
        };
      } catch (retryError: any) {
        console.error('❌ Document retry also failed:', retryError);
        throw new Error(`Failed to upload ${documentType}: ${retryError.message}`);
      }
    }
    
    throw new Error(`Failed to upload ${documentType}: ${error.message}`);
  }
};

/**
 * Upload a signed contract PDF to Firebase Storage
 * @param file - The PDF file to upload
 * @param contractId - The contract ID
 * @returns Promise<{ url: string; path: string }>
 */
export const uploadSignedContract = async (
  file: File,
  contractId: string
): Promise<{ url: string; path: string }> => {
  try {
    console.log('📄 Uploading signed contract for contract:', contractId)
    console.log('📄 File details:', {
      name: file.name,
      size: file.size,
      type: file.type
    })

    const storage = getStorageInstance()
    
    // Generate unique filename with timestamp
    const timestamp = Date.now()
    const fileName = `${timestamp}_signed_contract_${contractId}.pdf`
    const storagePath = `signed-contracts/${contractId}/${fileName}`

    console.log('📁 Uploading to path:', storagePath)

    // Create storage reference
    const storageRef = ref(storage, storagePath)
    console.log('🚀 Starting signed contract upload...')

    // Upload file with metadata
    const uploadResult = await uploadBytes(storageRef, file, {
      customMetadata: {
        contractId: contractId,
        uploadedAt: new Date().toISOString(),
        originalFileName: file.name,
        fileType: 'signed_contract',
        fileSize: file.size.toString()
      }
    })

    console.log('✅ Signed contract upload successful!')

    // Get download URL
    const downloadURL = await getDownloadURL(uploadResult.ref)
    console.log('🔗 Download URL:', downloadURL)

    return {
      url: downloadURL,
      path: storagePath
    }
  } catch (error: any) {
    console.error('❌ Failed to upload signed contract:', error)
    throw new Error(`Failed to upload signed contract: ${error.message}`)
  }
}

/**
 * Delete a contract document from Firebase Storage
 * @param filePath - Path of the file to delete
 * @returns Promise<void>
 */
export const deleteContractDocument = async (filePath: string): Promise<void> => {
  try {
    const storage = getStorageInstance();
    const fileRef = ref(storage, filePath);
    
    console.log('🗑️ Deleting contract document:', filePath);
    
    await deleteObject(fileRef);
    
    console.log('✅ Contract document deleted successfully');
  } catch (error: any) {
    console.error('❌ Failed to delete contract document:', error);
    console.error('🔍 Error details:', {
      code: error.code,
      message: error.message,
      filePath
    });
    
    // Don't throw error if file doesn't exist
    if (error.code === 'storage/object-not-found') {
      console.log('ℹ️ File not found, considering as already deleted');
      return;
    }
    
    throw new Error(`Failed to delete contract document: ${error.message}`);
  }
};

/**
 * Update the status of a contract document in cloud storage metadata
 * @param filePath - Path of the file
 * @param newStatus - New status (e.g., 'Archived', 'Replaced')
 * @returns Promise<void>
 */
export const updateContractDocumentStatus = async (
  filePath: string, 
  newStatus: string = 'Archived'
): Promise<void> => {
  try {
    const storage = getStorageInstance();
    const fileRef = ref(storage, filePath);

    // Update the custom metadata status
    const newMetadata = {
      customMetadata: {
        status: newStatus,
        updatedAt: new Date().toISOString()
      },
    };

    console.log('📝 Updating contract document status:', filePath, 'to:', newStatus);
    
    // Apply the updated metadata to the file
    await updateMetadata(fileRef, newMetadata);
    
    console.log('✅ Contract document status updated successfully');
  } catch (error: any) {
    console.error('❌ Failed to update contract document status:', error);
    throw new Error(`Failed to update contract document metadata: ${error.message}`);
  }
};

/**
 * Generic file upload function for contract-related files
 * @param file - The file to upload
 * @param contractId - Contract identifier
 * @param location - Storage location path
 * @param metadata - Additional metadata
 * @returns Promise with url and path of uploaded file
 */
export const uploadContractFile = async (
  file: File, 
  contractId: string, 
  location: string,
  metadata: Record<string, string> = {}
): Promise<FileUploadResult> => {
  try {
    const storage = getStorageInstance();
    
    const timestamp = Date.now();
    const fileName = `${timestamp}_${file.name}`;
    const filePath = `${location}/${contractId}/${fileName}`;
    
    const fileRef = ref(storage, filePath);
    
    // File metadata including contract information
    const fileMetadata = {
      customMetadata: {
        contractId,
        uploadedAt: new Date().toISOString(),
        originalFileName: file.name,
        fileSize: file.size.toString(),
        ...metadata
      },
    };

    console.log('📁 Uploading contract file:', filePath);
    console.log('📄 File details:', {
      name: file.name,
      size: file.size,
      type: file.type,
      contractId,
      location
    });

    // Upload the file with metadata
    await uploadBytes(fileRef, file, fileMetadata);

    // Get the download URL after upload
    const fileURL = await getDownloadURL(fileRef);

    console.log('✅ Contract file upload successful:', fileURL);

    return { url: fileURL, path: filePath };
  } catch (error: any) {
    console.error("❌ Contract file upload failed:", error);
    throw new Error(`Failed to upload contract file: ${error.message}`);
  }
};
