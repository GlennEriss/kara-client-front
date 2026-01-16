'use client'

import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { FileText, Download, Loader2, User, DollarSign, Phone } from 'lucide-react'
import { ContractCI, CONTRACT_CI_STATUS_LABELS } from '@/types/types'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import ContractCIView from './ContractCIView'
import { getNationalityName } from '@/constantes/nationality'
import { getDocumentTypeLabel } from '@/domains/infrastructure/documents/constants/document-types'
import { Badge } from '@/components/ui/badge'

interface DownloadContractCIModalProps {
  isOpen: boolean
  onClose: () => void
  contract: ContractCI | null
}

export default function DownloadContractCIModal({
  isOpen,
  onClose,
  contract
}: DownloadContractCIModalProps) {
  const [isGenerating, setIsGenerating] = useState(false)

  // Fonction helper pour charger une image en base64
  const loadImageAsBase64 = (url: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (url.startsWith('data:')) {
        resolve(url)
        return
      }

      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = img.width
        canvas.height = img.height
        const ctx = canvas.getContext('2d')
        if (ctx) {
          ctx.drawImage(img, 0, 0)
          resolve(canvas.toDataURL('image/png'))
        } else {
          reject(new Error('Impossible de créer le contexte canvas'))
        }
      }
      img.onerror = () => reject(new Error('Erreur de chargement de l\'image'))
      img.src = url
    })
  }

  const generatePDF = async () => {
    if (!contract) return

    setIsGenerating(true)

    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      })

      const pageWidth = doc.internal.pageSize.getWidth()
      const pageHeight = doc.internal.pageSize.getHeight()
      let yPos = 20

      // ===== EN-TÊTE =====
      // Logo KARA
      try {
        const logoBase64 = await loadImageAsBase64('/Logo-Kara.webp')
        doc.addImage(logoBase64, 'PNG', (pageWidth - 25) / 2, yPos, 25, 25)
        yPos += 30
      } catch (error) {
        console.error('Erreur chargement logo:', error)
        yPos += 10
      }

      // Photo du membre si disponible
      if (contract.memberPhotoUrl) {
        try {
          const photoBase64 = await loadImageAsBase64(contract.memberPhotoUrl)
          doc.addImage(photoBase64, 'PNG', 165, 70, 30, 36)
        } catch (error) {
          console.error('Erreur chargement photo membre:', error)
        }
      }

      // Titre
      doc.setFontSize(20)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(35, 77, 101) // #234D65
      doc.text('MUTUELLE KARA', pageWidth / 2, yPos, { align: 'center' })
      yPos += 8

      doc.setFontSize(16)
      doc.text('VOLET ENTRAIDE', pageWidth / 2, yPos, { align: 'center' })
      yPos += 15

      doc.setTextColor(0, 0, 0)

      // ===== INFOS PERSONNELLES =====
      doc.setFontSize(14)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(35, 77, 101)
      doc.text('Informations personnelles du membre :', 20, yPos)
      yPos += 8

      doc.setFontSize(11)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(0, 0, 0)

      const leftCol = 20
      const rightCol = 110

      doc.text(`Matricule : ${contract.memberId}`, leftCol, yPos)
      doc.text(`Sexe : ${contract.memberGender || '—'}`, rightCol, yPos)
      yPos += 6

      doc.text(`Nom : ${contract.memberLastName}`, leftCol, yPos)
      doc.text(`Prénom : ${contract.memberFirstName}`, rightCol, yPos)
      yPos += 6

      doc.text(`Date de naissance : ${contract.memberBirthDate || '—'}`, leftCol, yPos)
      doc.text(`Nationalité : ${getNationalityName(contract.memberNationality)}`, rightCol, yPos)
      yPos += 6

      doc.text(`Téléphone 1 : ${contract.memberContacts?.[0] || '—'}`, leftCol, yPos)
      doc.text(`Téléphone 2 : ${contract.memberContacts?.[1] || '—'}`, rightCol, yPos)
      yPos += 6

      doc.text(`Quartier : ${contract.memberAddress || '—'}`, leftCol, yPos)
      doc.text(`Profession : ${contract.memberProfession || '—'}`, rightCol, yPos)
      yPos += 12

      // ===== CONTACT D'URGENCE =====
      doc.setFontSize(14)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(35, 77, 101)
      doc.text('Informations concernant le contact d\'urgence :', 20, yPos)
      yPos += 8

      doc.setFontSize(11)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(0, 0, 0)

      doc.text(`Nom : ${contract.emergencyContact.lastName}`, leftCol, yPos)
      doc.text(`Prénom : ${contract.emergencyContact.firstName || '—'}`, rightCol, yPos)
      yPos += 6

      doc.text(`Liens : ${contract.emergencyContact.relationship}`, leftCol, yPos)
      doc.text(`Téléphone : ${contract.emergencyContact.phone1}`, rightCol, yPos)
      yPos += 6

      if (contract.emergencyContact.phone2) {
        doc.text(`Téléphone secondaire : ${contract.emergencyContact.phone2}`, leftCol, yPos)
        yPos += 6
      }

      doc.text(`Type de document : ${contract.emergencyContact.typeId ? getDocumentTypeLabel(contract.emergencyContact.typeId) : '—'}`, leftCol, yPos)
      doc.text(`N°CNI/PASS/CS : ${contract.emergencyContact.idNumber || '—'}`, rightCol, yPos)
      yPos += 12

      // ===== TEXTE DU CONTRAT =====
      doc.setFontSize(11)
      doc.setFont('helvetica', 'normal')
      
      const textWidth = pageWidth - 40
      const text1 = `Dans le cadre d'une démarche purement sociale, l'association KARA lance le volet « Entraide », qui est un contrat sous lequel l'association garantit des prestations destinées à octroyer des fonds monétaires à l'adhérent au cours de l'année.`
      const lines1 = doc.splitTextToSize(text1, textWidth)
      doc.text(lines1, 20, yPos)
      yPos += lines1.length * 5 + 4

      const text2 = `Au titre de la présente garantie, l'association KARA s'engage, en contrepartie d'une prime mensuelle (${contract.subscriptionCIAmountPerMonth.toLocaleString('fr-FR')} FCFA), à octroyer à l'adhérent un montant compris entre 30 000 et 150 000 FCFA à taux nul (0%) remboursable dans une durée définie. Ce prêt est dit : accompagnement régulier.`
      const lines2 = doc.splitTextToSize(text2, textWidth)
      doc.text(lines2, 20, yPos)
      yPos += lines2.length * 5 + 8

      // ===== CLAUSES =====
      doc.setFontSize(14)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(35, 77, 101)
      doc.text('Les clauses du contrat :', 20, yPos)
      yPos += 8

      doc.setFontSize(11)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(0, 0, 0)

      const clauses = [
        "L'adhérent : Est un membre de la mutuelle qui souscrit au Volet Entraide.",
        "Le nominal : Correspond au versement mensuel sous 12 mois.",
        "L'accompagnement régulier : Montant maximum empruntable selon le forfait."
      ]

      clauses.forEach(clause => {
        doc.text(`• ${clause}`, 25, yPos)
        yPos += 6
      })
      yPos += 6

      // ===== TABLEAU DES FORFAITS =====
      autoTable(doc, {
        startY: yPos,
        head: [['Forfait', 'Nominal', 'Appui']],
        body: [
          ['A - 10 000', '120 000', '[0 ; 30 000]'],
          ['B - 20 000', '240 000', '[0 ; 60 000]'],
          ['C - 30 000', '360 000', '[0 ; 90 000]'],
          ['D - 40 000', '480 000', '[0 ; 120 000]'],
          ['E - 50 000', '600 000', '[0 ; 150 000]'],
        ],
        theme: 'grid',
        styles: { halign: 'center', fontSize: 10 },
        headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0] },
      })

      yPos = (doc as any).lastAutoTable.finalY + 15

      // ===== SIGNATURES =====
      doc.setFontSize(11)
      doc.setFont('helvetica', 'bold')
      doc.text('Signature du membre :', 20, yPos)
      doc.text('Signature du Secrétaire Exécutif :', 120, yPos)
      yPos += 15

      doc.setFont('helvetica', 'italic')
      doc.text('« lu et approuvé »', 20, yPos)

      // ===== NOUVELLE PAGE - RÉCAPITULATIF =====
      doc.addPage()
      yPos = 20

      doc.setFontSize(14)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(35, 77, 101)
      doc.text('Récapitulatif des versements mensuels', 20, yPos)
      yPos += 8

      // Tableau des versements
      const versementsBody = [...Array(12)].map((_, i) => [(i + 1).toString(), '', '', '', ''])
      
      autoTable(doc, {
        startY: yPos,
        head: [['Mois', 'Montant versé', 'Date', 'Signature adhérent', 'Signature SE']],
        body: versementsBody,
        theme: 'grid',
        styles: { halign: 'center', fontSize: 10, cellPadding: 3 },
        headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0] },
        columnStyles: {
          0: { cellWidth: 20 },
          1: { cellWidth: 35 },
          2: { cellWidth: 35 },
          3: { cellWidth: 45 },
          4: { cellWidth: 45 },
        },
      })

      // Pied de page sur toutes les pages
      const totalPages = doc.getNumberOfPages()
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i)
        doc.setFontSize(9)
        doc.setTextColor(128, 128, 128)
        doc.text('Mutuelle KARA - Caisse Imprévue', pageWidth / 2, pageHeight - 15, { align: 'center' })
        doc.text(`Généré le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}`, pageWidth / 2, pageHeight - 10, { align: 'center' })
      }

      // Télécharger le PDF
      const fileName = `MK_CI_${contract.memberFirstName}_${contract.memberLastName}.pdf`
      doc.save(fileName)
      
      setTimeout(() => {
        setIsGenerating(false)
        onClose()
      }, 500)
    } catch (error) {
      console.error('Erreur lors de la génération du PDF:', error)
      setIsGenerating(false)
    }
  }

  if (!contract) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] md:max-w-[900px] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-[#234D65]" />
            Prévisualisation du contrat
          </DialogTitle>
          <DialogDescription>
            Contrat #{contract.id.slice(-6)} - {contract.memberFirstName} {contract.memberLastName}
          </DialogDescription>
        </DialogHeader>

        {/* Preview du contrat avec scroll */}
        <div className="flex-1 overflow-y-auto border rounded-lg bg-gray-50 p-4">
          <div className="bg-white shadow-lg mx-auto" style={{ maxWidth: '210mm' }}>
            <ContractCIView contract={contract} />
          </div>
        </div>

        {/* Actions */}
        <div className="flex-shrink-0 flex gap-3 justify-end pt-4 border-t">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isGenerating}
          >
            Fermer
          </Button>
          <Button
            onClick={generatePDF}
            disabled={isGenerating}
            className="bg-gradient-to-r from-[#234D65] to-[#2c5a73] hover:from-[#2c5a73] hover:to-[#234D65]"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Génération...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Télécharger PDF
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

