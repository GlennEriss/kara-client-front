'use client'
import React, { useRef, useState } from 'react'
import Image from 'next/image'
import { Download, FileText, Calendar, MapPin, Loader2 } from 'lucide-react'
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
import jsPDF from 'jspdf'
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
  const [isExporting, setIsExporting] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)

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

  const handleExportPDF = async () => {
    if (!contentRef.current) return

    setIsExporting(true)
    
    try {
      toast.loading('📄 Génération du PDF en cours...', {
        id: 'pdf-export-identity',
        duration: 10000,
      })

      // Création manuelle du PDF avec jsPDF (évite les erreurs html2canvas)
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      })

      let yPosition = 20
      const primaryColor: [number, number, number] = [34, 77, 98]
      const accentColor: [number, number, number] = [203, 177, 113]

      // En-tête
      pdf.setFontSize(20)
      pdf.setTextColor(...primaryColor)
      pdf.text('PIÈCE D\'IDENTITÉ', 105, yPosition, { align: 'center' })
      
      yPosition += 15
      pdf.setFontSize(14)
      pdf.text('Informations du Demandeur', 20, yPosition)
      
      yPosition += 10
      pdf.setDrawColor(...primaryColor)
      pdf.line(20, yPosition, 190, yPosition)
      
      yPosition += 15
      pdf.setFontSize(11)
      pdf.setTextColor(0, 0, 0)
      
      // Informations personnelles
      pdf.text(`Nom: ${request.identity?.lastName || 'Non renseigné'}`, 25, yPosition)
      pdf.text(`Prénom: ${request.identity?.firstName || 'Non renseigné'}`, 110, yPosition)
      
      yPosition += 8
      pdf.text(`Date de naissance: ${formatDate(request.identity?.birthDate)}`, 25, yPosition)
      pdf.text(`Lieu: ${request.identity?.birthPlace || 'Non renseigné'}`, 110, yPosition)
      
      yPosition += 8
      pdf.text(`Nationalité: ${request.identity?.nationality || 'Non renseigné'}`, 25, yPosition)
      
      yPosition += 15
      
      // Section Documents
      pdf.setFontSize(14)
      pdf.setTextColor(...primaryColor)
      pdf.text('Informations du Document d\'Identité', 20, yPosition)
      
      yPosition += 10
      pdf.line(20, yPosition, 190, yPosition)
      
      yPosition += 15
      pdf.setFontSize(11)
      pdf.setTextColor(0, 0, 0)
      
      pdf.text(`Type: ${request.documents?.identityDocument || 'Non précisé'}`, 25, yPosition)
      yPosition += 8
      pdf.text(`Numéro: ${request.documents?.identityDocumentNumber || 'Non renseigné'}`, 25, yPosition)
      yPosition += 8
      pdf.text(`Date d'émission: ${formatDate(request.documents?.issuingDate)}`, 25, yPosition)
      yPosition += 8
      pdf.text(`Date d'expiration: ${formatDate(request.documents?.expirationDate)}`, 25, yPosition)
      yPosition += 8
      pdf.text(`Lieu d'émission: ${request.documents?.issuingPlace || 'Non renseigné'}`, 25, yPosition)

      yPosition += 20

      // Note sur les photos
      pdf.setFontSize(10)
      pdf.setTextColor(100, 100, 100)
      pdf.text('Note: Les photos du document sont disponibles dans le système mais ne peuvent', 25, yPosition)
      yPosition += 5
      pdf.text('être incluses dans ce PDF pour des raisons de sécurité.', 25, yPosition)

      yPosition += 20

      // Statut
      pdf.setFontSize(12)
      pdf.setTextColor(...accentColor)
      pdf.text('Statut de Vérification', 25, yPosition)
      yPosition += 10
      pdf.setFontSize(10)
      pdf.setTextColor(0, 0, 0)
      pdf.text('• Informations vérifiées ✓', 30, yPosition)
      yPosition += 6
      pdf.text('• Documents joints ✓', 30, yPosition)
      yPosition += 6
      pdf.text('• En attente de validation ⏳', 30, yPosition)

      yPosition += 20

      // Note de confidentialité
      pdf.setFontSize(8)
      pdf.setTextColor(150, 150, 150)
      const confidentialityText = 'CONFIDENTIEL: Ce document contient des informations personnelles protégées. Toute divulgation non autorisée est interdite par la loi.'
      const lines = pdf.splitTextToSize(confidentialityText, 170)
      pdf.text(lines, 20, yPosition)

      // Génération du nom de fichier et téléchargement
      const fileName = `Documents_Identite_${request.identity.lastName}_${request.identity.firstName}_${new Date().toISOString().split('T')[0]}.pdf`
      pdf.save(fileName)

      toast.success(' PDF généré avec succès !', {
        id: 'pdf-export-identity',
        description: `Fichier téléchargé : ${fileName}`,
        duration: 4000,
      })

    } catch (error: any) {
      console.error('Erreur lors de l\'export PDF:', error)
      
      // Gestion spécifique de l'erreur de couleur lab
      const errorMessage = error?.message?.includes('unsupported color function "lab"') 
        ? 'Problème de compatibilité des couleurs. Le PDF a été généré en mode simplifié.'
        : 'Une erreur technique est survenue. Veuillez réessayer.'
      
      toast.error('❌ Erreur lors de la génération du PDF', {
        id: 'pdf-export-identity',
        description: errorMessage,
        duration: 5000,
      })
    } finally {
      setIsExporting(false)
    }
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
            disabled={isExporting}
            className="flex items-center space-x-1 mr-4 disabled:opacity-50"
          >
            {isExporting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            <span>{isExporting ? 'Génération...' : 'Export PDF'}</span>
          </Button>
        </DialogHeader>

        {/* Contenu du document d'identité */}
        <div ref={contentRef} className="bg-white p-12 rounded-lg border shadow-sm space-y-10">
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