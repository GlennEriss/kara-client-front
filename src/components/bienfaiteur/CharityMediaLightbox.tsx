'use client'

import React, { useEffect } from 'react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { X, ChevronLeft, ChevronRight, Download, Video } from 'lucide-react'
import Image from 'next/image'
import { CharityMedia } from '@/types/types'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { toast } from 'sonner'

interface CharityMediaLightboxProps {
  isOpen: boolean
  onClose: () => void
  media: CharityMedia | null
  allMedia: CharityMedia[]
  onPrevious?: () => void
  onNext?: () => void
  currentIndex?: number
}

export default function CharityMediaLightbox({
  isOpen,
  onClose,
  media,
  allMedia,
  onPrevious,
  onNext,
  currentIndex = 0
}: CharityMediaLightboxProps) {
  // Navigation au clavier
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      } else if (e.key === 'ArrowLeft' && onPrevious) {
        onPrevious()
      } else if (e.key === 'ArrowRight' && onNext) {
        onNext()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose, onPrevious, onNext])

  if (!media) return null

  const handleDownload = async () => {
    try {
      toast.info('Téléchargement en cours...')
      const response = await fetch(media.url)
      const blob = await response.blob()
      const downloadUrl = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = downloadUrl
      link.download = media.title || `media-${media.id}.${media.type === 'photo' ? 'jpg' : 'mp4'}`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(downloadUrl)
      toast.success('Téléchargement réussi!')
    } catch (error) {
      toast.error('Erreur lors du téléchargement')
    }
  }

  const safeDate = media.createdAt instanceof Date 
    ? media.createdAt 
    : new Date(media.createdAt)
  const formattedDate = !isNaN(safeDate.getTime()) 
    ? format(safeDate, 'dd MMMM yyyy', { locale: fr })
    : 'Date inconnue'

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl w-[95vw] h-[95vh] p-0 gap-0 bg-black/95">
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between p-4 bg-gradient-to-b from-black/80 to-transparent">
          <div className="flex-1 min-w-0">
            {media.title && (
              <h3 className="text-white font-semibold text-lg truncate">{media.title}</h3>
            )}
            {media.description && (
              <p className="text-gray-300 text-sm line-clamp-2">{media.description}</p>
            )}
            <p className="text-gray-400 text-xs mt-1">{formattedDate}</p>
          </div>
          <div className="flex items-center gap-2 ml-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDownload}
              className="text-white hover:bg-white/20"
            >
              <Download className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-white hover:bg-white/20"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Navigation précédent */}
        {onPrevious && allMedia.length > 1 && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onPrevious}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-50 text-white hover:bg-white/20 rounded-full w-12 h-12"
          >
            <ChevronLeft className="w-6 h-6" />
          </Button>
        )}

        {/* Contenu média */}
        <div className="flex items-center justify-center h-full w-full p-4">
          {media.type === 'photo' ? (
            <div className="relative w-full h-full flex items-center justify-center">
              <Image
                src={media.url}
                alt={media.title || 'Photo'}
                fill
                className="object-contain"
                priority
              />
            </div>
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <video
                src={media.url}
                controls
                className="max-w-full max-h-full"
                autoPlay
              >
                Votre navigateur ne supporte pas la lecture de vidéos.
              </video>
            </div>
          )}
        </div>

        {/* Navigation suivant */}
        {onNext && allMedia.length > 1 && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-50 text-white hover:bg-white/20 rounded-full w-12 h-12"
          >
            <ChevronRight className="w-6 h-6" />
          </Button>
        )}

        {/* Footer avec compteur */}
        {allMedia.length > 1 && (
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent text-center">
            <p className="text-white text-sm">
              {currentIndex + 1} / {allMedia.length}
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

