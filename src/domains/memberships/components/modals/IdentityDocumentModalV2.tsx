'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Download, ZoomIn, ZoomOut, RotateCw, Maximize2, X, IdCard, FileImage, AlertCircle, CheckCircle2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import type { MembershipRequest } from '../../entities'

interface IdentityDocumentModalV2Props {
  isOpen: boolean
  onClose: () => void
  request: MembershipRequest
}

type ViewMode = 'single' | 'split' | 'fullscreen'
type ImageView = 'front' | 'back'

export function IdentityDocumentModalV2({
  isOpen,
  onClose,
  request,
}: IdentityDocumentModalV2Props) {
  const [viewMode, setViewMode] = useState<ViewMode>('single')
  const [currentView, setCurrentView] = useState<ImageView>('front')
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [isDownloading, setIsDownloading] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  const hasFrontPhoto = !!request.documents?.documentPhotoFrontURL
  const hasBackPhoto = !!request.documents?.documentPhotoBackURL
  const hasBothPhotos = hasFrontPhoto && hasBackPhoto

  // Réinitialiser l'état quand le modal s'ouvre
  useEffect(() => {
    if (isOpen) {
      setViewMode(hasBothPhotos ? 'split' : 'single')
      setCurrentView('front')
      setZoom(1)
      setRotation(0)
    }
  }, [isOpen, hasBothPhotos])

  // Gestion du plein écran
  useEffect(() => {
    if (isFullscreen) {
      document.documentElement.requestFullscreen?.()
    } else {
      if (document.fullscreenElement) {
        document.exitFullscreen?.()
      }
    }

    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        setIsFullscreen(false)
      }
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [isFullscreen])

  // Navigation au clavier
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false)
        return
      }
      if (e.key === 'ArrowLeft' && hasBothPhotos && currentView === 'back') {
        setCurrentView('front')
      }
      if (e.key === 'ArrowRight' && hasBothPhotos && currentView === 'front') {
        setCurrentView('back')
      }
      if (e.key === '+' || e.key === '=') {
        setZoom(prev => Math.min(prev + 0.1, 3))
      }
      if (e.key === '-') {
        setZoom(prev => Math.max(prev - 0.1, 0.5))
      }
      if (e.key === 'r' || e.key === 'R') {
        setRotation(prev => (prev + 90) % 360)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, hasBothPhotos, currentView, isFullscreen])

  const handleDownloadImage = useCallback(async (url: string, filename: string) => {
    setIsDownloading(true)
    
    try {
      toast.loading('📥 Téléchargement en cours...', {
        id: 'image-download',
        duration: 3000,
      })

      const response = await fetch(url)
      if (!response.ok) throw new Error('Erreur de téléchargement')
      
      const blob = await response.blob()
      const downloadUrl = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = downloadUrl
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(downloadUrl)
      
      toast.success('✅ Image téléchargée !', {
        id: 'image-download',
        description: `Fichier : ${filename}`,
        duration: 3000,
      })
    } catch (error) {
      console.error('Erreur lors du téléchargement:', error)
      toast.error('❌ Erreur lors du téléchargement', {
        id: 'image-download',
        description: 'Impossible de télécharger l\'image',
        duration: 4000,
      })
    } finally {
      setIsDownloading(false)
    }
  }, [])

  const getImageUrl = (view: ImageView): string | null => {
    if (view === 'front') {
      return request.documents?.documentPhotoFrontURL || null
    }
    return request.documents?.documentPhotoBackURL || null
  }

  const getImageFilename = (view: ImageView): string => {
    const lastName = request.identity?.lastName || 'Membre'
    const firstName = request.identity?.firstName || ''
    const suffix = view === 'front' ? 'recto' : 'verso'
    return `document_${suffix}_${lastName}_${firstName}.jpg`
  }

  const formatDate = (dateString?: string): string => {
    if (!dateString) return 'Non renseigné'
    try {
      return new Date(dateString).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
    } catch {
      return 'Date invalide'
    }
  }

  const getDocumentTypeLabel = (type?: string): string => {
    const labels: Record<string, string> = {
      'NIP': 'Carte Nationale d\'Identité (NIP)',
      'PASSPORT': 'Passeport',
      'DRIVING_LICENSE': 'Permis de conduire',
      'OTHER': 'Autre',
    }
    return labels[type || ''] || type || 'Non renseigné'
  }

  // Composant pour afficher une image avec zoom et rotation
  const ImageViewer = ({ url, alt, label, badgeColor, isMobile = false }: { url: string; alt: string; label: string; badgeColor: string; isMobile?: boolean }) => (
    <div className={cn(
      'relative w-full flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl overflow-hidden group',
      isMobile ? 'min-h-[40vh] max-h-[50vh]' : 'min-h-[400px] max-h-[600px]'
    )}>
      <img
        src={url}
        alt={alt}
        className={cn(
          'max-w-full max-h-full object-contain transition-all duration-300',
          'cursor-zoom-in hover:shadow-2xl',
          isMobile && 'max-h-[50vh]'
        )}
        style={{
          transform: `scale(${zoom}) rotate(${rotation}deg)`,
          transition: 'transform 0.3s ease',
        }}
        onClick={() => setZoom(prev => prev < 2 ? prev + 0.2 : 1)}
      />
      
      {/* Badge de label */}
      <div className={cn(
        'absolute top-4 left-4 px-3 py-1.5 rounded-lg shadow-lg backdrop-blur-sm',
        'flex items-center gap-2 text-white text-sm font-semibold',
        badgeColor
      )}>
        <FileImage className="w-4 h-4" />
        <span>{label}</span>
      </div>

      {/* Indicateur de zoom */}
      {zoom !== 1 && (
        <div className="absolute top-4 right-4 px-3 py-1.5 bg-black/70 text-white text-xs font-medium rounded-lg backdrop-blur-sm">
          {Math.round(zoom * 100)}%
        </div>
      )}
    </div>
  )

  // État vide
  const EmptyState = ({ message, isMobile = false }: { message: string; isMobile?: boolean }) => (
    <div className={cn(
      'flex flex-col items-center justify-center space-y-4 p-8',
      isMobile ? 'min-h-[40vh]' : 'min-h-[400px]'
    )}>
      <div className="w-24 h-24 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center shadow-inner">
        <AlertCircle className="w-12 h-12 text-gray-400" />
      </div>
      <div className="text-center">
        <h3 className="text-lg font-bold text-gray-900 mb-2">
          Document non disponible
        </h3>
        <p className="text-sm text-gray-600">
          {message}
        </p>
      </div>
    </div>
  )

  // Détecter mobile
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={cn(
        '!w-[95vw] !max-w-[1400px] max-h-[95vh] overflow-y-auto',
        'bg-gradient-to-br from-white to-gray-50/50 border-0 shadow-2xl',
        'flex flex-col',
        isFullscreen && '!max-w-full !w-full !h-full !max-h-full'
      )}>
        {/* Header - Fixe en haut */}
        <DialogHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-kara-primary-dark to-kara-primary-dark/90 shadow-lg flex-shrink-0">
              <IdCard className="h-5 w-5 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-xl font-bold bg-gradient-to-r from-kara-primary-dark to-kara-primary-dark/80 bg-clip-text text-transparent">
                Pièce d'Identité
              </DialogTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="secondary" className="bg-kara-primary-light/20 text-kara-primary-dark text-xs">
                  {request.identity?.firstName} {request.identity?.lastName}
                </Badge>
                {request.documents?.identityDocumentNumber && (
                  <Badge variant="outline" className="text-xs font-mono">
                    {request.documents.identityDocumentNumber}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Actions toolbar */}
          <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
            {/* Mode de vue (si les deux photos existent, desktop uniquement) */}
            {hasBothPhotos && !isMobile && (
              <div className="flex items-center bg-gray-100 rounded-lg p-1">
                <Button
                  variant={viewMode === 'single' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => {
                    setViewMode('single')
                    setCurrentView('front')
                  }}
                  className={cn(
                    'h-8 px-3 text-xs',
                    viewMode === 'single'
                      ? 'bg-kara-primary-dark hover:bg-kara-primary-dark/90 text-white'
                      : 'hover:bg-gray-200'
                  )}
                >
                  Une seule
                </Button>
                <Button
                  variant={viewMode === 'split' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('split')}
                  className={cn(
                    'h-8 px-3 text-xs',
                    viewMode === 'split'
                      ? 'bg-kara-primary-dark hover:bg-kara-primary-dark/90 text-white'
                      : 'hover:bg-gray-200'
                  )}
                >
                  Côte à côte
                </Button>
              </div>
            )}

            {/* Contrôles d'image (zoom, rotation) */}
            {viewMode === 'single' && (hasFrontPhoto || hasBackPhoto) && (
              <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setZoom(prev => Math.max(prev - 0.1, 0.5))}
                  disabled={zoom <= 0.5}
                  className="h-8 w-8 p-0"
                  title="Zoom arrière (ou -)"
                >
                  <ZoomOut className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setZoom(1)}
                  className="h-8 px-2 text-xs"
                  title="Réinitialiser zoom"
                >
                  {Math.round(zoom * 100)}%
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setZoom(prev => Math.min(prev + 0.1, 3))}
                  disabled={zoom >= 3}
                  className="h-8 w-8 p-0"
                  title="Zoom avant (ou +)"
                >
                  <ZoomIn className="w-4 h-4" />
                </Button>
                <div className="w-px h-6 bg-gray-300 mx-1" />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setRotation(prev => (prev + 90) % 360)}
                  className="h-8 w-8 p-0"
                  title="Rotation (R)"
                >
                  <RotateCw className="w-4 h-4" />
                </Button>
              </div>
            )}

            {/* Plein écran */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="h-8 w-8 p-0 border-kara-primary-dark/30 hover:bg-kara-primary-dark/10"
              title="Plein écran (F11)"
            >
              <Maximize2 className="w-4 h-4 text-kara-primary-dark" />
            </Button>

            {/* Téléchargement */}
            {viewMode === 'single' && getImageUrl(currentView) && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const url = getImageUrl(currentView)!
                  handleDownloadImage(url, getImageFilename(currentView))
                }}
                disabled={isDownloading}
                className="h-8 px-3 border-kara-primary-dark text-kara-primary-dark hover:bg-kara-primary-dark hover:text-white"
              >
                <Download className="w-4 h-4 mr-1.5" />
                <span className="text-xs">Télécharger</span>
              </Button>
            )}
          </div>
        </DialogHeader>

        {/* Contenu principal - Scrollable */}
        <div className="flex-1 min-h-0 space-y-4">
          {viewMode === 'split' && hasBothPhotos && !isMobile ? (
            // Vue côte à côte (desktop uniquement)
            <div className="grid grid-cols-2 gap-4">
              <div>
                {hasFrontPhoto ? (
                  <ImageViewer
                    url={request.documents.documentPhotoFrontURL!}
                    alt="Recto du document d'identité"
                    label="Recto"
                    badgeColor="bg-gradient-to-r from-blue-500 to-indigo-600"
                    isMobile={false}
                  />
                ) : (
                  <EmptyState message="Le recto du document n'est pas disponible" isMobile={false} />
                )}
              </div>
              <div>
                {hasBackPhoto ? (
                  <ImageViewer
                    url={request.documents.documentPhotoBackURL!}
                    alt="Verso du document d'identité"
                    label="Verso"
                    badgeColor="bg-gradient-to-r from-emerald-500 to-teal-600"
                    isMobile={false}
                  />
                ) : (
                  <EmptyState message="Le verso du document n'est pas disponible" isMobile={false} />
                )}
              </div>
            </div>
          ) : (
            // Vue unique (mobile ou desktop)
            <div className="relative">
              {currentView === 'front' ? (
                hasFrontPhoto ? (
                  <ImageViewer
                    url={request.documents.documentPhotoFrontURL!}
                    alt="Recto du document d'identité"
                    label="Recto"
                    badgeColor="bg-gradient-to-r from-blue-500 to-indigo-600"
                    isMobile={isMobile}
                  />
                ) : (
                  <EmptyState message="Le recto du document d'identité n'a pas été fourni" isMobile={isMobile} />
                )
              ) : (
                hasBackPhoto ? (
                  <ImageViewer
                    url={request.documents.documentPhotoBackURL!}
                    alt="Verso du document d'identité"
                    label="Verso"
                    badgeColor="bg-gradient-to-r from-emerald-500 to-teal-600"
                    isMobile={isMobile}
                  />
                ) : (
                  <EmptyState message="Le verso du document d'identité n'a pas été fourni" isMobile={isMobile} />
                )
              )}

              {/* Navigation recto/verso (si les deux existent) */}
              {hasBothPhotos && (
                <div className="flex items-center justify-center mt-4 gap-2">
                  <Button
                    variant={currentView === 'front' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => {
                      setCurrentView('front')
                      setZoom(1)
                      setRotation(0)
                    }}
                    className={cn(
                      'h-8 px-4 text-xs',
                      currentView === 'front'
                        ? 'bg-kara-primary-dark hover:bg-kara-primary-dark/90 text-white'
                        : 'hover:bg-gray-100'
                    )}
                  >
                    ← Recto
                  </Button>
                  <div className="w-px h-4 bg-gray-300" />
                  <Button
                    variant={currentView === 'back' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => {
                      setCurrentView('back')
                      setZoom(1)
                      setRotation(0)
                    }}
                    className={cn(
                      'h-8 px-4 text-xs',
                      currentView === 'back'
                        ? 'bg-kara-primary-dark hover:bg-kara-primary-dark/90 text-white'
                        : 'hover:bg-gray-100'
                    )}
                  >
                    Verso →
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Informations du document - Toujours accessible par scroll */}
        <div className="mt-4 p-4 bg-gradient-to-br from-gray-50 to-white rounded-xl border border-gray-100 shadow-sm flex-shrink-0">
          <div className="flex items-center gap-2 mb-3">
            <IdCard className="h-4 w-4 text-kara-primary-dark" />
            <h4 className="font-bold text-sm text-gray-900">
              Informations du document
            </h4>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-600 font-medium block mb-1">Type:</span>
              <span className="font-semibold text-gray-900">
                {getDocumentTypeLabel(request.documents?.identityDocument)}
              </span>
            </div>
            <div>
              <span className="text-gray-600 font-medium block mb-1">Numéro:</span>
              <span className="font-semibold text-gray-900 font-mono">
                {request.documents?.identityDocumentNumber || 'Non renseigné'}
              </span>
            </div>
            <div>
              <span className="text-gray-600 font-medium block mb-1">Émis le:</span>
              <span className="font-semibold text-gray-900">
                {formatDate(request.documents?.issuingDate)}
              </span>
            </div>
            <div>
              <span className="text-gray-600 font-medium block mb-1">Expire le:</span>
              <span className="font-semibold text-gray-900">
                {formatDate(request.documents?.expirationDate)}
              </span>
            </div>
          </div>
          
          {/* Statut des photos */}
          <div className="mt-3 pt-3 border-t border-gray-200 flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              {hasFrontPhoto ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              ) : (
                <AlertCircle className="w-4 h-4 text-amber-600" />
              )}
              <span className={hasFrontPhoto ? 'text-emerald-700' : 'text-amber-700'}>
                Recto {hasFrontPhoto ? 'disponible' : 'manquant'}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              {hasBackPhoto ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              ) : (
                <AlertCircle className="w-4 h-4 text-amber-600" />
              )}
              <span className={hasBackPhoto ? 'text-emerald-700' : 'text-amber-700'}>
                Verso {hasBackPhoto ? 'disponible' : 'manquant'}
              </span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
