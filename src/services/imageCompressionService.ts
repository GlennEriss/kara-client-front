import imageCompression from 'browser-image-compression'

/**
 * Service de compression d'images
 */
export class ImageCompressionService {
  /**
   * Compresse une image avec des options optimisées
   * @param file - Le fichier image à compresser
   * @param maxSizeMB - Taille maximale en MB (par défaut 1 MB)
   * @param maxWidthOrHeight - Largeur ou hauteur maximale en pixels (par défaut 1920px)
   * @returns Le fichier image compressé
   */
  static async compressImage(
    file: File,
    maxSizeMB: number = 1,
    maxWidthOrHeight: number = 1920
  ): Promise<File> {
    try {
      console.log('🖼️ Compression de l\'image...')
      console.log('📊 Taille originale:', (file.size / 1024 / 1024).toFixed(2), 'MB')

      const options = {
        maxSizeMB: maxSizeMB, // Taille maximale en MB
        maxWidthOrHeight: maxWidthOrHeight, // Dimension maximale
        useWebWorker: true, // Utiliser un Web Worker pour ne pas bloquer le thread principal
        fileType: file.type as any, // Conserver le type de fichier original
        initialQuality: 0.85, // Qualité initiale (0.85 = 85%)
      }

      // Compression de l'image
      const compressedFile = await imageCompression(file, options)

      console.log('✅ Compression réussie!')
      console.log('📊 Taille compressée:', (compressedFile.size / 1024 / 1024).toFixed(2), 'MB')
      console.log('📉 Réduction:', (((file.size - compressedFile.size) / file.size) * 100).toFixed(1), '%')

      return compressedFile
    } catch (error) {
      console.error('❌ Erreur lors de la compression:', error)
      // En cas d'erreur, retourner le fichier original
      return file
    }
  }

  /**
   * Compresse une image pour un document d'identité
   * Utilise des paramètres optimisés pour la lisibilité des documents
   * @param file - Le fichier image à compresser
   * @returns Le fichier image compressé
   */
  static async compressDocumentImage(file: File): Promise<File> {
    try {
      console.log('📄 Compression d\'image de document...')
      console.log('📊 Taille originale:', (file.size / 1024 / 1024).toFixed(2), 'MB')

      const options = {
        maxSizeMB: 0.8, // Limite à 800 KB pour documents
        maxWidthOrHeight: 1600, // Résolution suffisante pour lire les documents
        useWebWorker: true,
        fileType: file.type as any,
        initialQuality: 0.9, // Qualité élevée pour la lisibilité des textes
      }

      const compressedFile = await imageCompression(file, options)

      console.log('✅ Compression de document réussie!')
      console.log('📊 Taille compressée:', (compressedFile.size / 1024 / 1024).toFixed(2), 'MB')
      console.log('📉 Réduction:', (((file.size - compressedFile.size) / file.size) * 100).toFixed(1), '%')

      return compressedFile
    } catch (error) {
      console.error('❌ Erreur lors de la compression du document:', error)
      return file
    }
  }

  /**
   * Vérifie si un fichier est une image valide
   * @param file - Le fichier à vérifier
   * @returns true si le fichier est une image valide
   */
  static isValidImageFile(file: File): boolean {
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    return validTypes.includes(file.type)
  }

  /**
   * Formate la taille d'un fichier en string lisible
   * @param bytes - Taille en bytes
   * @returns String formaté (ex: "1.5 MB")
   */
  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes'
    
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
  }
}

