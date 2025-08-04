'use client'
// Dépendance requise pour l'export PDF:
// npm install jspdf
// ou
// yarn add jspdf

import React, { useState, useRef } from 'react'
import Image from 'next/image'
import { Download, FileText, Calendar, MapPin, Check, User, Phone, Home, Briefcase, CreditCard, Loader2 } from 'lucide-react'
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

interface MemberDetailsModalProps {
  isOpen: boolean
  onClose: () => void
  request: MembershipRequest
}

const MemberDetailsModal: React.FC<MemberDetailsModalProps> = ({ 
  isOpen, 
  onClose, 
  request 
}) => {
  const [isExporting, setIsExporting] = useState(false)
  const printRef = useRef<HTMLDivElement>(null)
  const formatDate = (date: Date | string | any) => {
    if (!date) return 'Non défini'
    
    try {
      let dateObj: Date
      
      if (date instanceof Date) {
        dateObj = date
      } else if (typeof date === 'string') {
        dateObj = new Date(date)
      } else if (date.toDate && typeof date.toDate === 'function') {
        dateObj = date.toDate()
      } else {
        dateObj = new Date(date)
      }
      
      return new Intl.DateTimeFormat('fr-FR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).format(dateObj)
    } catch (error) {
      return 'Date invalide'
    }
  }

  // Fonction pour formater l'adresse complète
  const formatFullAddress = () => {
    const { address } = request
    const parts = [
      address.district,
      address.arrondissement,
      address.city,
      address.province
    ].filter(Boolean)
    return parts.join(', ') || 'Non renseignée'
  }

  const handleExportPDF = async () => {
    setIsExporting(true)
    
    try {
      // Création manuelle du PDF avec jsPDF
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      })

      let yPosition = 20

      // Couleurs
      const primaryColor: [number, number, number] = [34, 77, 98] // #224D62
      const accentColor: [number, number, number] = [203, 177, 113] // #CBB171

      // En-tête avec titre
      pdf.setFontSize(24)
      pdf.setTextColor(...primaryColor)
      pdf.text('FICHE D\'ADHÉSION', 105, yPosition, { align: 'center' })
      
      yPosition += 10
      pdf.setFontSize(18)
      pdf.setTextColor(...accentColor)
      pdf.text('CONTRACTUELLE INDIVIDUELLE', 105, yPosition, { align: 'center' })
      
      yPosition += 15
      pdf.setTextColor(0, 0, 0)
      pdf.text('Mutuelle KARA', 105, yPosition, { align: 'center' })

      yPosition += 20

      // Section: Informations Personnelles
      pdf.setFontSize(16)
      pdf.setTextColor(...primaryColor)
      pdf.text('INFORMATIONS PERSONNELLES DU MEMBRE', 20, yPosition)
      
      yPosition += 10
      pdf.setDrawColor(...primaryColor)
      pdf.line(20, yPosition, 190, yPosition) // Ligne de séparation
      
      yPosition += 10

      // Données personnelles - Colonne 1
      pdf.setFontSize(11)
      pdf.setTextColor(0, 0, 0)
      
      const leftCol = 25
      const rightCol = 110
      
      // Nom
      pdf.text('Nom(s):', leftCol, yPosition)
      pdf.text((request.identity?.lastName?.toUpperCase() || '________________'), leftCol + 25, yPosition)
      
      // Prénom
      pdf.text('Prénom(s):', rightCol, yPosition)
      pdf.text((request.identity?.firstName?.toUpperCase() || '________________'), rightCol + 30, yPosition)
      
      yPosition += 8
      
      // Lieu de naissance
      pdf.text('Lieu de Naissance:', leftCol, yPosition)
      pdf.text((request.identity?.birthPlace?.toUpperCase() || '________________'), leftCol + 40, yPosition)
      
      // Date de naissance
      pdf.text('Date de Naissance:', rightCol, yPosition)
      pdf.text((formatDate(request.identity?.birthDate) || '__/__/__'), rightCol + 40, yPosition)
      
      yPosition += 8
      
      // Nationalité
      pdf.text('Nationalité:', leftCol, yPosition)
      pdf.text((request.identity?.nationality?.toUpperCase() || '________________'), leftCol + 30, yPosition)
      
      // N° CNI
      pdf.text('N°CNI/PASS/CS:', rightCol, yPosition)
      pdf.text((request.documents?.identityDocumentNumber || '________________'), rightCol + 35, yPosition)
      
      yPosition += 8
      
      // Téléphone
      pdf.text('Téléphone:', leftCol, yPosition)
      pdf.text((request.identity.contacts[0] || '________________'), leftCol + 25, yPosition)
      
      // Matricule
      pdf.text('Matricule:', rightCol, yPosition)
      pdf.text((request.id || '________________'), rightCol + 25, yPosition)
      
      yPosition += 8
      
      // Profession
      pdf.text('Profession:', leftCol, yPosition)
      pdf.text((request.company.profession || '________________'), leftCol + 25, yPosition)
      
      yPosition += 8
      
      // Employeur
      pdf.text('Employeur:', leftCol, yPosition)
      pdf.text((request.company.companyName || '________________'), leftCol + 25, yPosition)
      
      yPosition += 8
      
      // Adresse
      pdf.text('Adresse:', leftCol, yPosition)
      const address = formatFullAddress()
      const addressLines = pdf.splitTextToSize(address, 160)
      pdf.text(addressLines, leftCol + 20, yPosition)
      
      yPosition += Math.max(8, addressLines.length * 4)

      // Section: Mode de Règlement
      yPosition += 10
      pdf.setFontSize(16)
      pdf.setTextColor(...primaryColor)
      pdf.text('MODE DE RÈGLEMENT', 20, yPosition)
      
      yPosition += 10
      pdf.line(20, yPosition, 190, yPosition)
      
      yPosition += 15
      
      // Options A, B, C, D, E
      const options = ['A', 'B', 'C', 'D', 'E']
      const startX = 30
      const spacing = 30
      
      pdf.setFontSize(12)
      options.forEach((option, index) => {
        const x = startX + (index * spacing)
        pdf.rect(x, yPosition - 5, 8, 8) // Carré
        pdf.text(option, x + 2, yPosition)
        pdf.text(`Option ${option}`, x - 5, yPosition + 12)
      })

      yPosition += 25

      // Section: Engagement contractuel
      pdf.setFontSize(14)
      pdf.setTextColor(...primaryColor)
      pdf.text('ENGAGEMENT CONTRACTUEL', 20, yPosition)
      
      yPosition += 10
      pdf.line(20, yPosition, 190, yPosition)
      
      yPosition += 10
      pdf.setFontSize(10)
      pdf.setTextColor(0, 0, 0)
      
      const engagementText = `J'adhère contractuellement à la Mutuelle KARA conformément aux dispositions y afférentes, je m'engage à respecter l'intégralité des dispositions Réglementaires qui la structurent et pour lesquelles je confirme avoir pris connaissance avant d'apposer ma signature.`
      
      const textLines = pdf.splitTextToSize(engagementText, 170)
      pdf.text(textLines, 20, yPosition)
      
      yPosition += textLines.length * 4 + 15

      // Section: Signatures
      pdf.setFontSize(12)
      pdf.setTextColor(...primaryColor)
      pdf.text('Signature de l\'adhérent suivi de "lu et approuvé"', 25, yPosition)
      pdf.text('Signature et cachet du Secrétariat Exécutif', 120, yPosition)
      
      yPosition += 10
      
      // Zones de signature
      pdf.setDrawColor(100, 100, 100)
      pdf.setLineDashPattern([2, 2], 0)
      pdf.rect(25, yPosition, 70, 20) // Zone signature gauche
      pdf.rect(120, yPosition, 70, 20) // Zone signature droite
      
      yPosition += 25
      
      // Dates
      const currentDate = formatDate(new Date())
      pdf.setLineDashPattern([], 0)
      pdf.setFontSize(10)
      pdf.text(`Date: ${currentDate}`, 25, yPosition)
      pdf.text('Date: ___/___/____', 120, yPosition)

      // Nouvelle page pour le contrat de confidentialité
      pdf.addPage()
      yPosition = 20

      // Contrat de confidentialité
      pdf.setFontSize(20)
      pdf.setTextColor(...primaryColor)
      pdf.text('CONTRAT DE CONFIDENTIALITÉ', 105, yPosition, { align: 'center' })
      
      yPosition += 15
      pdf.setFontSize(12)
      pdf.setTextColor(0, 0, 0)
      pdf.text('Entre LA MUTUELLE KARA', 105, yPosition, { align: 'center' })
      yPosition += 8
      pdf.text('ET', 105, yPosition, { align: 'center' })
      
      yPosition += 15
      
      // Informations du bénéficiaire
      pdf.text(`Nom : ${request.identity?.lastName?.toUpperCase() || 'Non renseigné'}`, 30, yPosition)
      pdf.text(`Prénom : ${request.identity?.firstName?.toUpperCase() || 'Non renseigné'}`, 120, yPosition)
      yPosition += 8
      pdf.text('Qualité : _____________', 30, yPosition)
      pdf.text(`N° de téléphone : ${request.identity.contacts[0] || 'Non renseigné'}`, 120, yPosition)

      yPosition += 20

      // Articles du contrat
      pdf.setFontSize(14)
      pdf.setTextColor(...primaryColor)
      pdf.text('Articles du Contrat', 20, yPosition)
      
      yPosition += 10
      pdf.setFontSize(10)
      pdf.setTextColor(0, 0, 0)

      const articles = [
        {
          title: 'Article 1',
          text: 'Il est préalablement établi l\'obligation de réserve d\'un membre de la Mutuelle exerçant ou pas une fonction au sein du bureau et le respect des différents codes qui s\'imposent à son statut.'
        },
        {
          title: 'Article 2', 
          text: 'Le bénéficiaire des informations reconnaît que tous les droits relatifs à l\'information obtenue existent et ne peuvent être divulgués et communiqués que par le donneur.'
        },
        {
          title: 'Article 3',
          text: 'Le bénéficiaire accepte les conditions de confidentialité des informations reçues et s\'engage à les respecter.'
        },
        {
          title: 'Article 4',
          text: 'Cet engagement dans l\'hypothèse d\'une vulgarisation d\'informations avérées ou à des fins diffamatoires faites par le receveur est passible d\'une sanction pénale et vaut radiation de la Mutuelle.'
        },
        {
          title: 'Article 5',
          text: 'Il est interdit à tout bénéficiaire des services de la Mutuelle Kara de contracter un service supplémentaire qui ne lui est pas accessible par un prête-nom ou toute autre personne qui accepterait une telle manœuvre.'
        }
      ]

      articles.forEach(article => {
        pdf.setFontSize(11)
        pdf.setTextColor(...accentColor)
        pdf.text(article.title, 20, yPosition)
        
        yPosition += 6
        pdf.setFontSize(9)
        pdf.setTextColor(0, 0, 0)
        const articleLines = pdf.splitTextToSize(article.text, 170)
        pdf.text(articleLines, 20, yPosition)
        
        yPosition += articleLines.length * 3 + 8
      })

      // Signatures finales
      yPosition += 10
      pdf.setFontSize(11)
      pdf.setTextColor(...primaryColor)
      pdf.text('Signature du BÉNÉFICIAIRE "lu et approuvé"', 30, yPosition)
      pdf.text('Signature du SECRÉTAIRE EXÉCUTIF', 120, yPosition)
      
      yPosition += 10
      pdf.setDrawColor(100, 100, 100)
      pdf.setLineDashPattern([2, 2], 0)
      pdf.rect(30, yPosition, 60, 15)
      pdf.rect(120, yPosition, 60, 15)

      yPosition += 20
      pdf.setLineDashPattern([], 0)
      pdf.setFontSize(9)
      pdf.text('Fait à _________________ le ____/____/____', 105, yPosition, { align: 'center' })

      // Informations de contact en bas
      yPosition += 20
      pdf.setFontSize(10)
      pdf.setTextColor(...primaryColor)
      pdf.text('Mutuelle KARA - Intégrité - Solidarité - Dynamisme', 105, yPosition, { align: 'center' })
      yPosition += 5
      pdf.setFontSize(8)
      pdf.text('Siège: Awougou, Owendo | Tél: 066-95-13-14 / 074-36-97-29 | E-mail: mutuellekara@gmail.com', 105, yPosition, { align: 'center' })

      // Génération du nom de fichier et téléchargement
      const fileName = `Fiche_Adhesion_${request.identity.lastName}_${request.identity.firstName}_${new Date().toISOString().split('T')[0]}.pdf`
      pdf.save(fileName)

      console.log('PDF généré avec succès:', fileName)
      
    } catch (error) {
      console.error('Erreur lors de la génération du PDF:', error)
      alert('Erreur lors de la génération du PDF. Veuillez réessayer.')
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="!w-[90vw] !max-w-[1200px] max-h-[90vh] overflow-auto">
        <DialogHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <DialogTitle className="text-xl font-semibold text-[#224D62]">
            Fiche d'Adhésion Contractuelle
          </DialogTitle>
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleExportPDF}
            disabled={isExporting}
            className="flex items-center space-x-1 mr-4 border-[#224D62] text-[#224D62] hover:bg-[#224D62] hover:text-white disabled:opacity-50"
          >
            {isExporting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Génération...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>Export PDF</span>
              </>
            )}
          </Button>
        </DialogHeader>

        {/* Contenu de la fiche d'adhésion */}
        <div ref={printRef} className="bg-white p-8 rounded-lg border shadow-sm space-y-8">
          
          {/* En-tête officiel avec logo */}
          <div className="text-center border-b-2 border-[#224D62] pb-6">
            <div className="flex justify-center mb-4">
              <DefaultLogo size="lg" />
            </div>
            <h1 className="text-3xl font-bold text-[#224D62] mb-2">
              FICHE D'ADHÉSION
            </h1>
            <h2 className="text-xl font-semibold text-[#CBB171]">
              CONTRACTUELLE INDIVIDUELLE
            </h2>
          </div>

          {/* Types de membres */}
          <div className="bg-gradient-to-r from-[#224D62]/5 to-[#CBB171]/5 p-6 rounded-lg">
            <div className="flex justify-center space-x-12">
              <div className="flex items-center space-x-2">
                <div className="w-5 h-5 border-2 border-[#224D62] rounded flex items-center justify-center">
                  <Check className="w-3 h-3 text-[#224D62]" />
                </div>
                <span className="font-medium text-[#224D62]">Membre Adhérent</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-5 h-5 border-2 border-gray-400 rounded"></div>
                <span className="text-gray-600">Membre Sympathisant</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-5 h-5 border-2 border-gray-400 rounded"></div>
                <span className="text-gray-600">Membre Bienfaiteur</span>
              </div>
            </div>
          </div>

          {/* Informations Personnelles du Membre */}
          <Card className="border-[#224D62]/20">
            <CardHeader className="bg-[#224D62] text-white rounded-t-lg">
              <CardTitle className="text-lg flex items-center space-x-2">
                <User className="w-5 h-5" />
                <span>Informations Personnelles du Membre</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex">
                    <label className="w-32 font-medium text-[#224D62]">Nom(s):</label>
                    <span className="flex-1 border-b border-dotted border-gray-400 px-2">
                      {request.identity?.lastName?.toUpperCase() || '_'.repeat(30)}
                    </span>
                  </div>
                  <div className="flex">
                    <label className="w-32 font-medium text-[#224D62]">Lieu de Naissance:</label>
                    <span className="flex-1 border-b border-dotted border-gray-400 px-2">
                      {request.identity?.birthPlace?.toUpperCase() || '_'.repeat(20)}
                    </span>
                  </div>
                  <div className="flex">
                    <label className="w-32 font-medium text-[#224D62]">Nationalité:</label>
                    <span className="flex-1 border-b border-dotted border-gray-400 px-2">
                      {request.identity?.nationality?.toUpperCase() || '_'.repeat(15)}
                    </span>
                  </div>
                  <div className="flex items-center">
                    <Phone className="w-4 h-4 text-[#CBB171] mr-2" />
                    <label className="w-28 font-medium text-[#224D62]">Téléphone:</label>
                    <span className="flex-1 border-b border-dotted border-gray-400 px-2">
                      {request.identity.contacts[0] || '_'.repeat(20)}
                    </span>
                  </div>
                  <div className="flex">
                    <label className="w-32 font-medium text-[#224D62]">Profession:</label>
                    <span className="flex-1 border-b border-dotted border-gray-400 px-2">
                      {request.company.profession || '_'.repeat(20)}
                    </span>
                  </div>
                  <div className="flex">
                    <label className="w-32 font-medium text-[#224D62]">Employeur:</label>
                    <span className="flex-1 border-b border-dotted border-gray-400 px-2">
                      {request.company.companyName || '_'.repeat(25)}
                    </span>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="flex">
                    <label className="w-32 font-medium text-[#224D62]">Prénom(s):</label>
                    <span className="flex-1 border-b border-dotted border-gray-400 px-2">
                      {request.identity?.firstName?.toUpperCase() || '_'.repeat(25)}
                    </span>
                  </div>
                  <div className="flex">
                    <label className="w-32 font-medium text-[#224D62]">Date de Naissance:</label>
                    <span className="flex-1 border-b border-dotted border-gray-400 px-2">
                      {formatDate(request.identity?.birthDate) || '_'.repeat(15)}
                    </span>
                  </div>
                  <div className="flex">
                    <label className="w-32 font-medium text-[#224D62]">N°CNI/PASS/CS:</label>
                    <span className="flex-1 border-b border-dotted border-gray-400 px-2">
                      {request.documents?.identityDocumentNumber || '_'.repeat(20)}
                    </span>
                  </div>
                  <div className="flex items-center">
                    <Home className="w-4 h-4 text-[#CBB171] mr-2" />
                    <label className="w-28 font-medium text-[#224D62]">Adresse:</label>
                    <span className="flex-1 border-b border-dotted border-gray-400 px-2">
                      {formatFullAddress()}
                    </span>
                  </div>
                  <div className="flex">
                    <label className="w-32 font-medium text-[#224D62]">Matricule:</label>
                    <span className="flex-1 border-b border-dotted border-gray-400 px-2">
                      {request.id || '_'.repeat(15)}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Mode de Règlement */}
          <Card className="border-[#CBB171]/20">
            <CardHeader className="bg-[#CBB171] text-white rounded-t-lg">
              <CardTitle className="text-lg flex items-center space-x-2">
                <CreditCard className="w-5 h-5" />
                <span>Mode de Règlement</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-5 gap-8">
                {['A', 'B', 'C', 'D', 'E'].map((option) => (
                  <div key={option} className="text-center">
                    <div className="w-12 h-12 border-2 border-[#224D62] rounded-lg flex items-center justify-center mx-auto mb-2">
                      <span className="text-xl font-bold text-[#224D62]">{option}</span>
                    </div>
                    <label className="text-sm text-gray-600">Option {option}</label>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Engagement contractuel */}
          <div className="bg-[#224D62]/5 p-6 rounded-lg border border-[#224D62]/20">
            <p className="text-justify leading-relaxed text-gray-800">
              <strong>J'adhère contractuellement à la Mutuelle KARA</strong> conformément aux dispositions y afférentes, 
              je m'engage à respecter l'intégralité des dispositions Réglementaires qui la structurent et pour lesquelles 
              je confirme avoir pris connaissance avant d'apposer ma signature.
            </p>
          </div>

          {/* Section signatures */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card className="border-[#224D62]/20">
              <CardHeader>
                <CardTitle className="text-sm text-[#224D62]">
                  Signature de l'adhérent suivi de la mention "lu et approuvé"
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-24 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center mb-4">
                  <span className="text-gray-400 text-sm">Zone de signature</span>
                </div>
                <div className="flex">
                  <label className="font-medium text-gray-600 mr-2">Date:</label>
                  <div className="flex space-x-2">
                    <span className="border-b border-dotted border-gray-400 px-2 w-16 text-center">
                      {formatDate(new Date()).split('/')[0]}
                    </span>
                    <span>/</span>
                    <span className="border-b border-dotted border-gray-400 px-2 w-16 text-center">
                      {formatDate(new Date()).split('/')[1]}
                    </span>
                    <span>/</span>
                    <span className="border-b border-dotted border-gray-400 px-2 w-20 text-center">
                      {formatDate(new Date()).split('/')[2]}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-[#CBB171]/20">
              <CardHeader>
                <CardTitle className="text-sm text-[#CBB171]">
                  Signature et cachet du Secrétariat Exécutif
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-24 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center mb-4">
                  <span className="text-gray-400 text-sm">Zone de signature et cachet</span>
                </div>
                <div className="flex">
                  <label className="font-medium text-gray-600 mr-2">Date:</label>
                  <div className="flex space-x-2">
                    <span className="border-b border-dotted border-gray-400 px-2 w-16 text-center">__</span>
                    <span>/</span>
                    <span className="border-b border-dotted border-gray-400 px-2 w-16 text-center">__</span>
                    <span>/</span>
                    <span className="border-b border-dotted border-gray-400 px-2 w-20 text-center">____</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Informations de contact KARA */}
          <div className="bg-gradient-to-r from-[#224D62] to-[#224D62]/90 text-white p-6 rounded-lg">
            <div className="text-center space-y-2">
              <h3 className="text-lg font-bold">Mutuelle KARA</h3>
              <p className="text-[#CBB171] font-medium">Intégrité - Solidarité - Dynamisme</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 text-sm">
                <div>
                  <p><strong>Siège:</strong> Awougou, Owendo</p>
                </div>
                <div>
                  <p><strong>Tél:</strong> 066-95-13-14 / 074-36-97-29</p>
                </div>
                <div>
                  <p><strong>E-mail:</strong> mutuellekara@gmail.com</p>
                </div>
              </div>
              <p className="text-xs mt-4 opacity-80">
                R.D N°:0650 /MIS/SG/DGELP/DPPALC/KMOG
              </p>
            </div>
          </div>

          {/* CONTRAT DE CONFIDENTIALITÉ */}
          <div className="bg-gray-50 p-8 rounded-lg border border-gray-200">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-[#224D62] mb-4">
                CONTRAT DE CONFIDENTIALITÉ
              </h2>
              <div className="text-lg text-gray-700 mb-4">
                <p>Entre <strong>LA MUTUELLE KARA</strong></p>
                <p className="mt-2">ET</p>
              </div>
              <div className="bg-white p-4 rounded-lg border inline-block">
                <div className="grid grid-cols-2 gap-4 text-left">
                  <div>
                    <span className="font-medium text-[#224D62]">Nom :</span>
                    <span className="ml-2">{request.identity?.lastName?.toUpperCase() || 'Non renseigné'}</span>
                  </div>
                  <div>
                    <span className="font-medium text-[#224D62]">Prénom :</span>
                    <span className="ml-2">{request.identity?.firstName?.toUpperCase() || 'Non renseigné'}</span>
                  </div>
                  <div>
                    <span className="font-medium text-[#224D62]">Qualité :</span>
                    <span className="ml-2">_____________</span>
                  </div>
                  <div>
                    <span className="font-medium text-[#224D62]">N° de téléphone :</span>
                    <span className="ml-2">{request.identity.contacts[0]}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-white p-6 rounded-lg border">
                <h3 className="text-lg font-semibold text-[#224D62] mb-4">Articles du Contrat</h3>
                <div className="space-y-4 text-sm text-gray-700 leading-relaxed">
                  <div>
                    <h4 className="font-semibold text-[#CBB171] mb-2">Article 1</h4>
                    <p>Il est préalablement établi l'obligation de réserve d'un membre de la Mutuelle exerçant ou pas une fonction au sein du bureau et le respect des différents codes qui s'imposent à son statut.</p>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold text-[#CBB171] mb-2">Article 2</h4>
                    <p>Le bénéficiaire des informations reconnaît que tous les droits relatifs à l'information obtenue existent et ne peuvent être divulgués et communiqués que par le donneur.</p>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold text-[#CBB171] mb-2">Article 3</h4>
                    <p>Le bénéficiaire accepte les conditions de confidentialité des informations reçues et s'engage à les respecter.</p>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold text-[#CBB171] mb-2">Article 4</h4>
                    <p>Cet engagement dans l'hypothèse d'une vulgarisation d'informations avérées ou à des fins diffamatoires faites par le receveur est passible d'une sanction pénale et vaut radiation de la Mutuelle.</p>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold text-[#CBB171] mb-2">Article 5</h4>
                    <p>Il est interdit à tout bénéficiaire des services de la Mutuelle Kara de contracter un service supplémentaire qui ne lui est pas accessible par un prête-nom ou toute autre personne qui accepterait une telle manœuvre. Le coupable perdra son Épargne en cours, s'exposera à la radiation au sein de la Mutuelle et s'exposera aux poursuites judiciaires.</p>
                  </div>
                </div>
              </div>

              {/* Signatures pour le contrat de confidentialité */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-4 rounded-lg border">
                  <h4 className="font-medium text-[#224D62] mb-3 text-sm">
                    Signature du BÉNÉFICIAIRE suivi de la mention "lu et approuvé"
                  </h4>
                  <div className="h-20 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
                    <span className="text-gray-400 text-xs">Zone de signature</span>
                  </div>
                </div>
                
                <div className="bg-white p-4 rounded-lg border">
                  <h4 className="font-medium text-[#CBB171] mb-3 text-sm">
                    Signature du SECRÉTAIRE EXÉCUTIF
                  </h4>
                  <div className="h-20 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
                    <span className="text-gray-400 text-xs">Zone de signature</span>
                  </div>
                </div>
              </div>

              <div className="text-center">
                <p className="text-sm text-gray-600">
                  Fait à _________________ le ____/____/____
                </p>
              </div>
            </div>
          </div>

          {/* Statut de la demande */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <Check className="w-5 h-5 text-green-600 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-medium text-green-800">Statut de la Demande</h4>
                <p className="text-sm text-green-600 mt-1">
                  Cette fiche d'adhésion a été générée automatiquement à partir des informations 
                  fournies lors de la demande d'adhésion en ligne.
                </p>
                <div className="mt-3 flex items-center space-x-4 text-xs text-green-600">
                  <span>• Informations vérifiées ✓</span>
                  <span>• Documents joints ✓</span>
                  <span>• En attente de validation ⏳</span>
                </div>
              </div>
            </div>
          </div>

          {/* Note légale */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <p className="text-xs text-amber-800">
              <strong>Note importante :</strong> Cette fiche d'adhésion doit être signée et retournée 
              au secrétariat de KARA pour finaliser votre adhésion. Toutes les informations fournies 
              sont soumises à vérification et doivent être exactes et complètes.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default MemberDetailsModal