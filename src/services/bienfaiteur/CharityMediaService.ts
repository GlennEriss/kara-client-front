import { CharityMediaRepository } from '@/repositories/bienfaiteur/CharityMediaRepository'
import { CharityMedia } from '@/types/types'
import { ref, uploadBytes, getDownloadURL, deleteObject } from '@/firebase/storage'
import { getStorageInstance } from '@/firebase/storage'

/**
 * Upload une image de couverture pour un évènement de charité
 */
export async function uploadCharityEventCover(
  file: File,
  eventId?: string
): Promise<{ url: string; path: string }> {
  try {
    const storage = getStorageInstance()
    
    const timestamp = Date.now()
    const fileExtension = file.name.split('.').pop() || 'jpg'
    const fileName = eventId 
      ? `${eventId}_${timestamp}_cover.${fileExtension}`
      : `${timestamp}_cover.${fileExtension}`
    const filePath = `charity-events/covers/${fileName}`
    
    const storageRef = ref(storage, filePath)
    
    // Upload the file
    const snapshot = await uploadBytes(storageRef, file)
    
    // Get download URL
    const downloadURL = await getDownloadURL(snapshot.ref)
    
    return {
      url: downloadURL,
      path: filePath
    }
  } catch (error: any) {
    console.error('❌ Charity cover upload failed:', error)
    throw new Error(`Échec de l'upload de l'image: ${error.message}`)
  }
}

/**
 * Supprime une image de couverture
 */
export async function deleteCharityEventCover(filePath: string): Promise<void> {
  try {
    const storage = getStorageInstance()
    const storageRef = ref(storage, filePath)
    await deleteObject(storageRef)
  } catch (error: any) {
    console.error('❌ Charity cover deletion failed:', error)
    // Ne pas throw pour éviter de bloquer si le fichier n'existe plus
  }
}

export class CharityMediaService {
  /**
   * Récupère tous les médias d'un évènement
   */
  static async getEventMedia(eventId: string): Promise<CharityMedia[]> {
    return await CharityMediaRepository.getByEventId(eventId)
  }

  /**
   * Récupère un média par son ID
   */
  static async getMediaById(eventId: string, mediaId: string): Promise<CharityMedia | null> {
    return await CharityMediaRepository.getById(eventId, mediaId)
  }

  /**
   * Crée un nouveau média (upload + création du document)
   */
  static async createMedia(
    eventId: string,
    file: File,
    type: 'photo' | 'video',
    adminId: string,
    title?: string,
    description?: string,
    takenAt?: Date
  ): Promise<string> {
    try {
      const storage = getStorageInstance()
      const timestamp = Date.now()
      const fileExtension = file.name.split('.').pop() || (type === 'photo' ? 'jpg' : 'mp4')
      const fileName = `${eventId}_${timestamp}_${type}.${fileExtension}`
      const filePath = `charity-events/${eventId}/media/${fileName}`

      // Upload du fichier
      const storageRef = ref(storage, filePath)
      const snapshot = await uploadBytes(storageRef, file)
      const downloadURL = await getDownloadURL(snapshot.ref)

      // Pour les vidéos, on pourrait générer une miniature plus tard
      // Pour l'instant, on utilise la même URL
      const thumbnailUrl = type === 'photo' ? downloadURL : undefined
      const thumbnailPath = type === 'photo' ? filePath : undefined

      // Créer le document dans Firestore
      const mediaData: Omit<CharityMedia, 'id'> = {
        eventId,
        type,
        url: downloadURL,
        path: filePath,
        thumbnailUrl,
        thumbnailPath,
        title,
        description,
        takenAt: takenAt || new Date(),
        createdAt: new Date(),
        createdBy: adminId
      }

      return await CharityMediaRepository.create(eventId, mediaData)
    } catch (error: any) {
      console.error('Error creating media:', error)
      throw new Error(`Échec de l'upload du média: ${error.message}`)
    }
  }

  /**
   * Met à jour un média
   */
  static async updateMedia(
    eventId: string,
    mediaId: string,
    updates: Partial<CharityMedia>,
    adminId: string
  ): Promise<void> {
    const updateData = {
      ...updates,
      updatedAt: new Date(),
      updatedBy: adminId
    }

    await CharityMediaRepository.update(eventId, mediaId, updateData)
  }

  /**
   * Supprime un média (fichier + document)
   */
  static async deleteMedia(eventId: string, mediaId: string): Promise<void> {
    // Récupérer le média pour obtenir le chemin du fichier
    const media = await CharityMediaRepository.getById(eventId, mediaId)
    
    if (!media) {
      throw new Error('Media not found')
    }

    // Supprimer le fichier du storage
    try {
      const storage = getStorageInstance()
      
      // Supprimer le fichier principal
      if (media.path) {
        const fileRef = ref(storage, media.path)
        await deleteObject(fileRef)
      }

      // Supprimer la miniature si elle existe
      if (media.thumbnailPath && media.thumbnailPath !== media.path) {
        const thumbnailRef = ref(storage, media.thumbnailPath)
        await deleteObject(thumbnailRef)
      }
    } catch (error: any) {
      console.error('Error deleting media file:', error)
      // Continuer même si la suppression du fichier échoue
    }

    // Supprimer le document Firestore
    await CharityMediaRepository.delete(eventId, mediaId)
  }
}
