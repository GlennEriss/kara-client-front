'use client'
import React, { useState, useEffect } from 'react'
import { X, Download, Eye, EyeOff, IdCard, FileImage } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { MembershipRequest } from '@/types/types'
import { toast } from 'sonner'

// Hook pour détecter le mobile uniquement
const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkDevice = () => {
      setIsMobile(window.innerWidth < 1024) // lg breakpoint
    }
    
    checkDevice()
    window.addEventListener('resize', checkDevice)
    
    return () => window.removeEventListener('resize', checkDevice)
  }, [])

  return isMobile
}

interface MemberIdentityModalProps {
  isOpen: boolean
  onClose: () => void
  request: MembershipRequest
}

const MemberIdentityModal: React.FC<MemberIdentityModalProps> = ({ 
  isOpen, 
  onClose, 
  request 
}) => {
  const [showFront, setShowFront] = useState(true)
  const [isDownloading, setIsDownloading] = useState(false)
  const isMobile = useIsMobile()

  // Fonction pour télécharger une image
  const handleDownloadImage = async (url: string, filename: string) => {
    setIsDownloading(true)
    
    try {
      toast.loading('📥 Téléchargement en cours...', {
        id: 'image-download',
        duration: 3000,
      })

      const response = await fetch(url)
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
  }

  const hasFrontPhoto = !!request.documents.documentPhotoFrontURL
  const hasBackPhoto = !!request.documents.documentPhotoBackURL

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="!w-[95vw] !max-w-[1200px] lg:max-w-[1200px] max-h-[95vh] lg:max-h-[95vh] overflow-hidden bg-gradient-to-br from-white to-gray-50/50 border-0 shadow-2xl">
        {/* Header - responsive pour mobile uniquement */}
        <DialogHeader className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-3 lg:space-y-0 pb-3 lg:pb-4 border-b border-gray-200">
          <div className="flex items-center space-x-2 lg:space-x-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-[#234D65] to-[#2c5a73] shadow-lg flex-shrink-0">
              <IdCard className="h-4 w-4 lg:h-5 lg:w-5 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-lg lg:text-xl font-bold bg-gradient-to-r from-[#234D65] to-[#2c5a73] bg-clip-text text-transparent">
                Document d'Identité
              </DialogTitle>
              <Badge variant="secondary" className="bg-blue-100 text-blue-700 text-xs lg:text-sm mt-1 lg:mt-0">
                {request.identity.firstName} {request.identity.lastName}
              </Badge>
            </div>
          </div>
          
          <div className="flex items-center justify-between lg:justify-end space-x-2 lg:space-x-2">
            {/* Boutons de navigation */}
            {hasFrontPhoto && hasBackPhoto && (
              <div className="flex items-center bg-gray-100 rounded-lg p-1">
                <Button
                  variant={showFront ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setShowFront(true)}
                  className={`h-8 px-2 lg:px-3 text-xs ${
                    showFront 
                      ? 'bg-[#224D62] hover:bg-[#224D62]/90 text-white' 
                      : 'hover:bg-gray-200'
                  }`}
                >
                  Recto
                </Button>
                <Button
                  variant={!showFront ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setShowFront(false)}
                  className={`h-8 px-2 lg:px-3 text-xs ${
                    !showFront 
                      ? 'bg-[#224D62] hover:bg-[#224D62]/90 text-white' 
                      : 'hover:bg-gray-200'
                  }`}
                >
                  Verso
                </Button>
              </div>
            )}

            {/* Bouton de téléchargement */}
            {((showFront && hasFrontPhoto) || (!showFront && hasBackPhoto)) && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  const url = showFront 
                    ? request.documents.documentPhotoFrontURL! 
                    : request.documents.documentPhotoBackURL!
                  const filename = showFront 
                    ? `document_recto_${request.identity.lastName}_${request.identity.firstName}.jpg`
                    : `document_verso_${request.identity.lastName}_${request.identity.firstName}.jpg`
                  handleDownloadImage(url, filename)
                }}
                disabled={isDownloading}
                className="border-[#224D62] text-[#224D62] hover:bg-[#224D62] hover:text-white disabled:opacity-50 h-8 px-2 lg:px-3 lg:mr-4"
              >
                <Download className="w-3 h-3 lg:w-4 lg:h-4 lg:mr-1" />
                <span className="hidden lg:inline">Télécharger</span>
              </Button>
            )}
          </div>
        </DialogHeader>

        {/* Affichage des photos - optimisé mobile */}
        <div className="flex-1 h-[calc(95vh-200px)] lg:h-[calc(95vh-120px)] flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100/50 rounded-xl overflow-hidden">
          {showFront ? (
            // Photo recto
            hasFrontPhoto ? (
              <div className="relative w-full h-full flex items-center justify-center p-4 lg:p-0">
                <img
                  src={request.documents.documentPhotoFrontURL || ''}
                  alt="Recto du document d'identité"
                  className="max-w-full max-h-full object-contain rounded-lg shadow-xl transition-transform duration-300 hover:scale-105"
                  style={{ maxWidth: '95%', maxHeight: '95%' }}
                />
                <div className="absolute top-6 left-6 lg:top-4 lg:left-4">
                  <Badge className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg">
                    <FileImage className="w-3 h-3 mr-1" />
                    Recto
                  </Badge>
                </div>
              </div>
            ) : (
              <div className="text-center space-y-4 p-6">
                <div className="w-24 h-24 lg:w-32 lg:h-32 mx-auto bg-gradient-to-br from-gray-200 to-gray-300 rounded-xl flex items-center justify-center shadow-inner">
                  <EyeOff className="w-8 h-8 lg:w-12 lg:h-12 text-gray-400" />
                </div>
                <div>
                  <h3 className="text-lg lg:text-xl font-bold text-gray-900 mb-2">
                    Aucune photo recto
                  </h3>
                  <p className="text-sm lg:text-base text-gray-600 leading-relaxed">
                    Le recto du document d'identité n'a pas été fourni
                  </p>
                </div>
              </div>
            )
          ) : (
            // Photo verso
            hasBackPhoto ? (
              <div className="relative w-full h-full flex items-center justify-center p-4 lg:p-0">
                <img
                  src={request.documents.documentPhotoBackURL || ''}
                  alt="Verso du document d'identité"
                  className="max-w-full max-h-full object-contain rounded-lg shadow-xl transition-transform duration-300 hover:scale-105"
                  style={{ maxWidth: '95%', maxHeight: '95%' }}
                />
                <div className="absolute top-6 left-6 lg:top-4 lg:left-4">
                  <Badge className="bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg">
                    <FileImage className="w-3 h-3 mr-1" />
                    Verso
                  </Badge>
                </div>
              </div>
            ) : (
              <div className="text-center space-y-4 p-6">
                <div className="w-24 h-24 lg:w-32 lg:h-32 mx-auto bg-gradient-to-br from-gray-200 to-gray-300 rounded-xl flex items-center justify-center shadow-inner">
                  <EyeOff className="w-8 h-8 lg:w-12 lg:h-12 text-gray-400" />
                </div>
                <div>
                  <h3 className="text-lg lg:text-xl font-bold text-gray-900 mb-2">
                    Aucune photo verso
                  </h3>
                  <p className="text-sm lg:text-base text-gray-600 leading-relaxed">
                    Le verso du document d'identité n'a pas été fourni
                  </p>
                </div>
              </div>
            )
          )}
        </div>

        {/* Informations du document - responsive */}
        <div className="mt-3 lg:mt-4 p-3 lg:p-4 bg-gradient-to-br from-gray-50 to-white rounded-xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 mb-2 lg:mb-3">
            <IdCard className="h-4 w-4 text-[#234D65]" />
            <h4 className="font-bold text-sm lg:text-base text-gray-900">
              Informations du document
            </h4>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 lg:gap-4 text-xs lg:text-sm">
            <div className="flex items-center justify-between lg:block">
              <span className="text-gray-600 font-medium">Type:</span>
              <span className="ml-2 font-bold text-gray-900">{request.documents.identityDocument}</span>
            </div>
            <div className="flex items-center justify-between lg:block">
              <span className="text-gray-600 font-medium">Numéro:</span>
              <span className="ml-2 font-bold text-gray-900 font-mono">{request.documents.identityDocumentNumber}</span>
            </div>
            <div className="flex items-center justify-between lg:block">
              <span className="text-gray-600 font-medium">Émis le:</span>
              <span className="ml-2 font-bold text-gray-900">
                {new Date(request.documents.issuingDate).toLocaleDateString('fr-FR')}
              </span>
            </div>
            <div className="flex items-center justify-between lg:block">
              <span className="text-gray-600 font-medium">Expire le:</span>
              <span className="ml-2 font-bold text-gray-900">
                {new Date(request.documents.expirationDate).toLocaleDateString('fr-FR')}
              </span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default MemberIdentityModal