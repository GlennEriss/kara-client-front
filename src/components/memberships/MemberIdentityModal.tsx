'use client'
import React, { useState } from 'react'
import { X, Download, Eye, EyeOff } from 'lucide-react'
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
      <DialogContent className="!w-[95vw] !max-w-[1200px] max-h-[95vh] overflow-hidden">
        <DialogHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div className="flex items-center space-x-3">
            <DialogTitle className="text-xl font-semibold text-[#224D62]">
              Document d'Identité
            </DialogTitle>
            <Badge variant="secondary" className="bg-blue-100 text-blue-700">
              {request.identity.firstName} {request.identity.lastName}
            </Badge>
          </div>
          
          <div className="flex items-center space-x-2">
            {/* Boutons de navigation */}
            {hasFrontPhoto && hasBackPhoto && (
              <div className="flex items-center bg-gray-100 rounded-lg p-1">
                <Button
                  variant={showFront ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setShowFront(true)}
                  className={`h-8 px-3 text-xs ${
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
                  className={`h-8 px-3 text-xs ${
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
                className="mr-4 border-[#224D62] text-[#224D62] hover:bg-[#224D62] hover:text-white disabled:opacity-50"
              >
                <Download className="w-4 h-4 mr-1" />
                Télécharger
              </Button>
            )}
          </div>
        </DialogHeader>

        {/* Affichage des photos */}
        <div className="flex-1 h-[calc(95vh-120px)] flex items-center justify-center bg-gray-50 rounded-lg overflow-hidden">
          {showFront ? (
            // Photo recto
            hasFrontPhoto ? (
              <div className="relative w-full h-full flex items-center justify-center">
                                 <img
                   src={request.documents.documentPhotoFrontURL || ''}
                   alt="Recto du document d'identité"
                   className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
                   style={{ maxWidth: '90%', maxHeight: '90%' }}
                 />
                <div className="absolute top-4 left-4">
                  <Badge className="bg-blue-500 text-white">
                    Recto
                  </Badge>
                </div>
              </div>
            ) : (
              <div className="text-center space-y-4">
                <div className="w-32 h-32 mx-auto bg-gray-200 rounded-lg flex items-center justify-center">
                  <EyeOff className="w-12 h-12 text-gray-400" />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Aucune photo recto
                  </h3>
                  <p className="text-gray-500">
                    Le recto du document d'identité n'a pas été fourni
                  </p>
                </div>
              </div>
            )
          ) : (
            // Photo verso
            hasBackPhoto ? (
              <div className="relative w-full h-full flex items-center justify-center">
                                 <img
                   src={request.documents.documentPhotoBackURL || ''}
                   alt="Verso du document d'identité"
                   className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
                   style={{ maxWidth: '90%', maxHeight: '90%' }}
                 />
                <div className="absolute top-4 left-4">
                  <Badge className="bg-green-500 text-white">
                    Verso
                  </Badge>
                </div>
              </div>
            ) : (
              <div className="text-center space-y-4">
                <div className="w-32 h-32 mx-auto bg-gray-200 rounded-lg flex items-center justify-center">
                  <EyeOff className="w-12 h-12 text-gray-400" />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Aucune photo verso
                  </h3>
                  <p className="text-gray-500">
                    Le verso du document d'identité n'a pas été fourni
                  </p>
                </div>
              </div>
            )
          )}
        </div>

        {/* Informations du document */}
        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
          <h4 className="font-semibold text-gray-900 mb-2">
            Informations du document
          </h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Type:</span>
              <span className="ml-2 font-medium">{request.documents.identityDocument}</span>
            </div>
            <div>
              <span className="text-gray-600">Numéro:</span>
              <span className="ml-2 font-medium">{request.documents.identityDocumentNumber}</span>
            </div>
            <div>
              <span className="text-gray-600">Émis le:</span>
              <span className="ml-2 font-medium">
                {new Date(request.documents.issuingDate).toLocaleDateString('fr-FR')}
              </span>
            </div>
            <div>
              <span className="text-gray-600">Expire le:</span>
              <span className="ml-2 font-medium">
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