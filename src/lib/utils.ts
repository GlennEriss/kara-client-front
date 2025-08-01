import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Configuration pour la compression d'images
export interface ImageCompressionOptions {
  maxWidth: number
  maxHeight: number
  quality: number
  format: 'webp' | 'jpeg' | 'png'
}

// Presets pour différents types d'images
export const IMAGE_COMPRESSION_PRESETS = {
  profile: {
    maxWidth: 400,
    maxHeight: 400,
    quality: 0.85,
    format: 'webp' as const
  },
  document: {
    maxWidth: 1200,
    maxHeight: 1600,
    quality: 0.90,
    format: 'webp' as const
  }
} as const

/**
 * Compresse et convertit une image en WebP
 * @param file - Fichier image à compresser
 * @param options - Options de compression
 * @returns Promise<string> - Data URL de l'image compressée
 */
export function compressImage(
  file: File,
  options: ImageCompressionOptions
): Promise<string> {
  return new Promise((resolve, reject) => {
    // Vérifier que c'est bien une image
    if (!file.type.startsWith('image/')) {
      reject(new Error('Le fichier doit être une image'))
      return
    }

    const img = new Image()
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')

    if (!ctx) {
      reject(new Error('Impossible de créer le contexte canvas'))
      return
    }

    img.onload = () => {
      // Calculer les nouvelles dimensions en préservant le ratio
      let { width, height } = img
      const maxWidth = options.maxWidth
      const maxHeight = options.maxHeight

      // Redimensionner si nécessaire
      if (width > maxWidth || height > maxHeight) {
        const aspectRatio = width / height

        if (width > height) {
          width = maxWidth
          height = width / aspectRatio
        } else {
          height = maxHeight
          width = height * aspectRatio
        }

        // S'assurer qu'on ne dépasse pas les limites
        if (width > maxWidth) {
          width = maxWidth
          height = width / aspectRatio
        }
        if (height > maxHeight) {
          height = maxHeight
          width = height * aspectRatio
        }
      }

      // Définir la taille du canvas
      canvas.width = width
      canvas.height = height

      // Dessiner l'image redimensionnée
      ctx.drawImage(img, 0, 0, width, height)

      // Convertir en WebP ou format demandé
      const mimeType = `image/${options.format}`
      const dataUrl = canvas.toDataURL(mimeType, options.quality)

      // Vérifier la taille finale (limite 2MB pour être sûr)
      const sizeInBytes = (dataUrl.length * 3) / 4 - 2 // Approximation base64
      const maxSizeInBytes = 2 * 1024 * 1024 // 2MB

      if (sizeInBytes > maxSizeInBytes) {
        // Si trop gros, réduire la qualité
        const newQuality = Math.max(0.5, options.quality * 0.8)
        const reducedDataUrl = canvas.toDataURL(mimeType, newQuality)
        resolve(reducedDataUrl)
      } else {
        resolve(dataUrl)
      }
    }

    img.onerror = () => {
      reject(new Error('Erreur lors du chargement de l\'image'))
    }

    // Charger l'image
    img.src = URL.createObjectURL(file)
  })
}

/**
 * Obtient des informations sur l'image compressée
 * @param dataUrl - Data URL de l'image
 * @returns Informations sur l'image (taille, format, etc.)
 */
export function getImageInfo(dataUrl: string) {
  // Calculer la taille approximative en bytes
  const sizeInBytes = (dataUrl.length * 3) / 4 - 2
  const sizeInKB = Math.round(sizeInBytes / 1024)
  const sizeInMB = Math.round((sizeInBytes / (1024 * 1024)) * 100) / 100

  // Extraire le format
  const formatMatch = dataUrl.match(/data:image\/([^;]+)/)
  const format = formatMatch ? formatMatch[1].toUpperCase() : 'UNKNOWN'

  return {
    sizeInBytes,
    sizeInKB,
    sizeInMB,
    format,
    sizeText: sizeInMB >= 1 ? `${sizeInMB} MB` : `${sizeInKB} KB`
  }
}
