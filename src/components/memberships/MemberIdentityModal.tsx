'use client'
import React from 'react'
import Image from 'next/image'
import { Download, FileText, Calendar, MapPin } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DefaultLogo } from '@/components/logo/Logo'
import type { MembershipRequest } from '@/types/types'

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
  const formatDate = (date: Date | string | any) => {
    if (!date) return 'Non défini'
    
    try {
      // Gestion des différents types de dates
      let dateObj: Date
      
      if (date instanceof Date) {
        dateObj = date
      } else if (typeof date === 'string') {
        dateObj = new Date(date)
      } else if (date.toDate && typeof date.toDate === 'function') {
        // Firestore Timestamp
        dateObj = date.toDate()
      } else {
        dateObj = new Date(date)
      }
      
      return new Intl.DateTimeFormat('fr-FR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }).format(dateObj)
    } catch (error) {
      return 'Date invalide'
    }
  }

  const handleExportPDF = () => {
    // TODO: Implémenter l'export PDF
    console.log('Export PDF pièce d\'identité pour:', request.id)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="!w-[50vw] !max-w-[95vw] max-h-[90vh] overflow-auto">
        <DialogHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <DialogTitle className="text-xl font-semibold">
            Pièce d'Identité
          </DialogTitle>
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleExportPDF}
            className="flex items-center space-x-1 mr-4"
          >
            <Download className="w-4 h-4" />
            <span>Export PDF</span>
          </Button>
        </DialogHeader>

        {/* Contenu du document d'identité */}
        <div className="bg-white p-12 rounded-lg border shadow-sm space-y-10">
          {/* En-tête avec logo */}
          <div className="flex justify-between items-start border-b pb-6">
            <div className="flex items-center space-x-4">
              <DefaultLogo size="md" />
              <div>
                <h2 className="text-xl font-bold text-gray-800">KARA</h2>
                <p className="text-sm text-gray-600">Vérification des Documents d'Identité</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">Date: {formatDate(new Date())}</p>
              <p className="text-sm text-gray-600">Dossier: {request.id}</p>
            </div>
          </div>

          {/* Informations du demandeur */}
          <div className="bg-gray-50 p-6 rounded-lg">
            <h3 className="text-xl font-semibold text-gray-800 mb-6">
              Informations du Demandeur
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-6 text-sm">
              <div>
                <label className="font-medium text-gray-600">Nom complet</label>
                <p className="text-gray-800">{request.identity.firstName} {request.identity.lastName}</p>
              </div>
              <div>
                <label className="font-medium text-gray-600">Date de naissance</label>
                <p className="text-gray-800">{formatDate(request.identity.birthDate)}</p>
              </div>
              <div>
                <label className="font-medium text-gray-600">Lieu de naissance</label>
                <p className="text-gray-800">{request.identity.birthPlace}</p>
              </div>
              <div>
                <label className="font-medium text-gray-600">Nationalité</label>
                <p className="text-gray-800">{request.identity.nationality}</p>
              </div>
            </div>
          </div>

          {/* Informations sur le document */}
          <div className="space-y-6">
            <h3 className="text-xl font-semibold text-gray-800 border-b pb-3">
              Informations du Document d'Identité
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-8">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center space-x-2">
                    <FileText className="w-4 h-4" />
                    <span>Type de Document</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="font-medium">{request.documents.identityDocument}</p>
                  <p className="text-sm text-gray-600">N° {request.documents.identityDocumentNumber}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center space-x-2">
                    <Calendar className="w-4 h-4" />
                    <span>Dates</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div>
                    <p className="text-xs text-gray-600">Délivré le</p>
                    <p className="text-sm font-medium">{formatDate(request.documents.issuingDate)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Expire le</p>
                    <p className="text-sm font-medium">{formatDate(request.documents.expirationDate)}</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center space-x-2">
                    <MapPin className="w-4 h-4" />
                    <span>Lieu de Délivrance</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="font-medium">{request.documents.issuingPlace}</p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Photos du document */}
          <div className="space-y-6">
            <h3 className="text-xl font-semibold text-gray-800 border-b pb-3">
              Photos du Document
            </h3>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Photo recto */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Recto du Document</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="relative w-full h-80 lg:h-96 bg-gray-100 rounded-lg overflow-hidden border-2 border-dashed border-gray-300">
                    {request.documents.documentPhotoFrontURL ? (
                      <Image
                        src={request.documents.documentPhotoFrontURL}
                        alt="Recto du document d'identité"
                        fill
                        className="object-contain"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <div className="text-center">
                          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                          <p className="text-sm text-gray-500">Aucune photo recto</p>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Photo verso */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Verso du Document</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="relative w-full h-80 lg:h-96 bg-gray-100 rounded-lg overflow-hidden border-2 border-dashed border-gray-300">
                    {request.documents.documentPhotoBackURL ? (
                      <Image
                        src={request.documents.documentPhotoBackURL}
                        alt="Verso du document d'identité"
                        fill
                        className="object-contain"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <div className="text-center">
                          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                          <p className="text-sm text-gray-500">Aucune photo verso</p>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Statut de vérification */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <FileText className="w-5 h-5 text-blue-600 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-medium text-blue-800">Statut de Vérification</h4>
                <p className="text-sm text-blue-600 mt-1">
                  Ce document a été soumis dans le cadre de la demande d'adhésion et est en cours de vérification 
                  par l'équipe administrative KARA.
                </p>
                <div className="mt-3 flex items-center space-x-4 text-xs text-blue-600">
                  <span>• Document d'identité requis ✓</span>
                  <span>• Photos lisibles {request.documents.documentPhotoFrontURL ? '✓' : '⚠'}</span>
                  <span>• Informations cohérentes ✓</span>
                </div>
              </div>
            </div>
          </div>

          {/* Note de sécurité */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <p className="text-xs text-amber-800">
              <strong>Note de confidentialité :</strong> Ces informations sont strictement confidentielles 
              et ne doivent être consultées que par le personnel autorisé de KARA dans le cadre du processus 
              d'adhésion. Toute divulgation non autorisée est strictement interdite.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default MemberIdentityModal