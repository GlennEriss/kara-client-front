/**
 * Carte de documents (PDF adhésion validé + pièces d'identité)
 */

'use client'

import { IdCard, Calendar, MapPin, FileText, ExternalLink, Download, AlertCircle } from 'lucide-react'
import Image from 'next/image'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ModernCard } from './shared/ModernCard'
import { InfoField } from './shared/InfoField'
import { formatDateDetailed, isDateExpired } from '../../utils/details'
import { toast } from 'sonner'
import type { MembershipRequest } from '../../entities'

interface DetailsDocumentsCardProps {
  request: MembershipRequest
  adhesionPdfUrlResolved?: string | null
  onViewAdhesionPdf?: () => void
}

export function DetailsDocumentsCard({ 
  request, 
  adhesionPdfUrlResolved,
  onViewAdhesionPdf 
}: DetailsDocumentsCardProps) {
  const handleViewAdhesionPdf = () => {
    if (adhesionPdfUrlResolved) {
      window.open(adhesionPdfUrlResolved, '_blank', 'noopener,noreferrer')
    } else if (onViewAdhesionPdf) {
      onViewAdhesionPdf()
    } else {
      toast.error('PDF non disponible', { 
        description: 'Aucun PDF d\'adhésion validé n\'a été trouvé pour cette demande' 
      })
    }
  }

  return (
    <ModernCard 
      title="Documents d'identité" 
      icon={IdCard} 
      iconColor="text-indigo-600" 
      className="bg-gradient-to-br from-indigo-50/30 to-indigo-100/20"
    >
      <div className="space-y-4 lg:space-y-6" data-testid="details-documents-card">
        {/* PDF Adhésion validé (si approuvé) */}
        {request.status === 'approved' && (
          <div className="p-3 lg:p-4 bg-gradient-to-r from-emerald-50 to-green-50 rounded-xl border border-emerald-200">
            <label className="text-xs font-semibold text-emerald-600 uppercase tracking-wider mb-2 block">
              PDF d'adhésion validé
            </label>
            {adhesionPdfUrlResolved ? (
              <Button
                onClick={handleViewAdhesionPdf}
                className="w-full bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300"
                data-testid="details-adhesion-pdf-button"
              >
                <FileText className="w-4 h-4 mr-2" />
                Ouvrir le PDF d'adhésion validé
              </Button>
            ) : onViewAdhesionPdf ? (
              <Button
                onClick={handleViewAdhesionPdf}
                className="w-full bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300"
                data-testid="details-adhesion-pdf-button"
              >
                <FileText className="w-4 h-4 mr-2" />
                Ouvrir le PDF d'adhésion validé
              </Button>
            ) : (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200">
                <p className="text-sm text-red-700">PDF non disponible</p>
              </div>
            )}
          </div>
        )}

        {/* Documents d'identité */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 lg:gap-4">
          <InfoField label="Type de document" value={request.documents.identityDocument} icon={IdCard} color="text-indigo-600" />
          <InfoField label="Numéro" value={request.documents.identityDocumentNumber} icon={IdCard} color="text-indigo-600" copyable />
          <InfoField label="Date d'émission" value={formatDateDetailed(request.documents.issuingDate)} icon={Calendar} color="text-green-600" />
          <InfoField 
            label="Date d'expiration" 
            value={
              <div className="flex items-center gap-2">
                <span>{formatDateDetailed(request.documents.expirationDate)}</span>
                {isDateExpired(request.documents.expirationDate) && (
                  <Badge variant="destructive" className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 border border-red-200">
                    <AlertCircle className="w-3 h-3 mr-1" />
                    Expirée
                  </Badge>
                )}
              </div>
            } 
            icon={Calendar} 
            color="text-red-600" 
          />
        </div>
        <InfoField label="Lieu d'émission" value={request.documents.issuingPlace} icon={MapPin} color="text-purple-600" />

        {/* Images des documents */}
        <div className="space-y-4">
          {request.documents.documentPhotoFrontURL && (
            <div className="space-y-3">
              <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <IdCard className="w-4 h-4 text-blue-600" />
                Recto du document
              </label>
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 rounded-xl z-10"></div>
                <Image
                  src={request.documents.documentPhotoFrontURL}
                  alt="Document recto"
                  width={400}
                  height={250}
                  className="w-full h-36 lg:h-48 object-cover rounded-xl border-2 border-gray-200 shadow-md group-hover:shadow-xl transition-all duration-300"
                  data-testid="details-identity-document-front"
                />
                <div className="absolute top-2 right-2 lg:top-3 lg:right-3 opacity-0 group-hover:opacity-100 transition-all duration-300 z-20 flex gap-1 lg:gap-2">
                  <Button
                    size="sm"
                    className="bg-white/90 hover:bg-white text-gray-700 border-0 shadow-lg h-8 lg:h-9 px-2 lg:px-3 text-xs"
                    onClick={() => window.open(request.documents.documentPhotoFrontURL!, '_blank')}
                  >
                    <ExternalLink className="w-3 h-3 lg:w-4 lg:h-4 lg:mr-1" />
                    <span className="hidden lg:inline">Voir</span>
                  </Button>
                  <Button
                    size="sm"
                    className="bg-white/90 hover:bg-white text-gray-700 border-0 shadow-lg h-8 lg:h-9 px-2 lg:px-3"
                    onClick={() => {
                      const link = document.createElement('a')
                      link.href = request.documents.documentPhotoFrontURL!
                      link.download = 'document-recto.jpg'
                      link.click()
                    }}
                  >
                    <Download className="w-3 h-3 lg:w-4 lg:h-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          {request.documents.documentPhotoBackURL && (
            <div className="space-y-3">
              <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <IdCard className="w-4 h-4 text-amber-600" />
                Verso du document
              </label>
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 rounded-xl z-10"></div>
                <Image
                  src={request.documents.documentPhotoBackURL}
                  alt="Document verso"
                  width={400}
                  height={250}
                  className="w-full h-36 lg:h-48 object-cover rounded-xl border-2 border-gray-200 shadow-md group-hover:shadow-xl transition-all duration-300"
                  data-testid="details-identity-document-back"
                />
                <div className="absolute top-2 right-2 lg:top-3 lg:right-3 opacity-0 group-hover:opacity-100 transition-all duration-300 z-20 flex gap-1 lg:gap-2">
                  <Button
                    size="sm"
                    className="bg-white/90 hover:bg-white text-gray-700 border-0 shadow-lg h-8 lg:h-9 px-2 lg:px-3 text-xs"
                    onClick={() => window.open(request.documents.documentPhotoBackURL!, '_blank')}
                  >
                    <ExternalLink className="w-3 h-3 lg:w-4 lg:h-4 lg:mr-1" />
                    <span className="hidden lg:inline">Voir</span>
                  </Button>
                  <Button
                    size="sm"
                    className="bg-white/90 hover:bg-white text-gray-700 border-0 shadow-lg h-8 lg:h-9 px-2 lg:px-3"
                    onClick={() => {
                      const link = document.createElement('a')
                      link.href = request.documents.documentPhotoBackURL!
                      link.download = 'document-verso.jpg'
                      link.click()
                    }}
                  >
                    <Download className="w-3 h-3 lg:w-4 lg:h-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </ModernCard>
  )
}
