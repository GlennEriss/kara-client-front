"use client"

import React from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { FileText, X, Download } from "lucide-react"
import type { CaissePayment, CaisseContract } from "@/services/caisse/types"
import IndividualPaymentInvoice from "./IndividualPaymentInvoice"
import GroupPaymentInvoice from "./GroupPaymentInvoice"
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { toast } from 'sonner'

// Helper pour formater les montants correctement dans les PDFs
const formatAmount = (amount: number): string => {
  return amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}

// ————————————————————————————————————————————————————————————
// Helpers UI
// ————————————————————————————————————————————————————————————
const brand = {
  bg: "bg-[#234D65]",
  bgSoft: "bg-[#234D65]/10",
  text: "text-[#234D65]",
}

function classNames(...cls: (string | false | undefined)[]) {
  return cls.filter(Boolean).join(" ")
}

// ————————————————————————————————————————————————————————————
// Types
// ————————————————————————————————————————————————————————————
interface PaymentInvoiceModalProps {
  isOpen: boolean
  onClose: () => void
  payment: CaissePayment | null
  contractData: CaisseContract | null
}

// ————————————————————————————————————————————————————————————
// Component
// ————————————————————————————————————————————————————————————
export default function PaymentInvoiceModal({ 
  isOpen, 
  onClose, 
  payment, 
  contractData 
}: PaymentInvoiceModalProps) {
  if (!payment || !contractData) return null

  // Déterminer si c'est un contrat de groupe
  const isGroupContract = contractData.contractType === 'GROUP' || !!contractData.groupeId

  // Fonction pour charger l'image en base64
  const loadImageAsBase64 = async (url: string): Promise<string> => {
    try {
      const response = await fetch(url)
      const blob = await response.blob()
      
      return new Promise((resolve, reject) => {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        const img = new Image()
        
        img.crossOrigin = 'anonymous'
        img.onload = () => {
          const maxWidth = 1200
          let width = img.width
          let height = img.height
          
          if (width > maxWidth) {
            height = (height * maxWidth) / width
            width = maxWidth
          }
          
          canvas.width = width
          canvas.height = height
          ctx?.drawImage(img, 0, 0, width, height)
          
          const base64 = canvas.toDataURL('image/jpeg', 0.85)
          resolve(base64)
        }
        
        img.onerror = () => reject(new Error('Erreur lors du chargement de l\'image'))
        img.src = URL.createObjectURL(blob)
      })
    } catch (error) {
      console.error('Erreur lors du chargement de l\'image:', error)
      throw error
    }
  }

  // Fonction pour exporter en PDF
  const handleExportPDF = async () => {
    try {
      toast.info('Génération du PDF en cours...')
      const doc = new jsPDF('p', 'mm', 'a4')

      // En-tête
      doc.setFontSize(18)
      doc.setFont('helvetica', 'bold')
      doc.text('Facture de Paiement', 14, 15)
      
      doc.setFontSize(11)
      doc.setFont('helvetica', 'normal')
      doc.text(`Contrat #${contractData.id}`, 14, 22)
      doc.text(`Échéance M${payment.dueMonthIndex + 1}`, 14, 28)
      doc.text(`Date d'export : ${new Date().toLocaleDateString('fr-FR')}`, 14, 34)

      let yPos = 42

      // Informations du paiement
      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.text('Informations du paiement', 14, yPos)
      
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      yPos += 6
      doc.text(`Statut : ${payment.status === 'PAID' ? 'Payé' : 'En cours'}`, 14, yPos)
      yPos += 6
      
      if (payment.paidAt) {
        const paidDateRaw = payment.paidAt as any
        const paidDate = typeof paidDateRaw.toDate === 'function' 
          ? paidDateRaw.toDate() 
          : new Date(payment.paidAt)
        doc.text(`Date de paiement : ${paidDate.toLocaleDateString('fr-FR')}`, 14, yPos)
        yPos += 6
      }
      
      // Utiliser le montant réellement versé (accumulatedAmount ou amount) pour les contrats LIBRE
      const displayedAmount = payment.amount || payment.accumulatedAmount || contractData.monthlyAmount || 0
      doc.text(`Montant : ${formatAmount(displayedAmount)} FCFA`, 14, yPos)
      yPos += 6
      
      if (payment.penaltyApplied && payment.penaltyApplied > 0) {
        doc.setTextColor(220, 38, 38)
        doc.text(`Pénalités appliquées : ${formatAmount(payment.penaltyApplied)} FCFA`, 14, yPos)
        yPos += 6
        if (payment.penaltyDays && payment.penaltyDays > 0) {
          doc.text(`Jours de retard : ${payment.penaltyDays}`, 14, yPos)
          yPos += 6
        }
        doc.setTextColor(0, 0, 0)
      }
      
      yPos += 4

      // Détails des contributions
      if (isGroupContract && payment.groupContributions && payment.groupContributions.length > 0) {
        doc.setFontSize(12)
        doc.setFont('helvetica', 'bold')
        doc.text(`Contributions des membres (${payment.groupContributions.length})`, 14, yPos)
        yPos += 8

        const tableData = payment.groupContributions.map((contrib: any) => {
          const row = [
            `${contrib.memberFirstName} ${contrib.memberLastName}`,
            contrib.memberMatricule,
            `${formatAmount(contrib.amount)} FCFA`,
            contrib.time || '',
            contrib.mode === 'airtel_money' ? 'Airtel Money' :
              contrib.mode === 'mobicash' ? 'Mobicash' :
              contrib.mode === 'cash' ? 'Espèce' :
              contrib.mode === 'bank_transfer' ? 'Virement' : 'Inconnu'
          ]
          
          if (contrib.penalty && contrib.penalty > 0) {
            row.push(`${formatAmount(contrib.penalty)} FCFA`)
          } else {
            row.push('-')
          }
          
          return row
        })

        const hasPenalties = payment.groupContributions.some((c: any) => c.penalty && c.penalty > 0)

        autoTable(doc, {
          head: [hasPenalties 
            ? ['Membre', 'Matricule', 'Montant', 'Heure', 'Mode', 'Pénalité']
            : ['Membre', 'Matricule', 'Montant', 'Heure', 'Mode']
          ],
          body: tableData,
          startY: yPos,
          styles: { fontSize: 9, cellPadding: 2 },
          headStyles: { fillColor: [35, 77, 101], textColor: 255, fontStyle: 'bold' },
        })
        
        yPos = (doc as any).lastAutoTable.finalY + 10
        
        // Preuves
        const contribsWithProof = payment.groupContributions.filter((c: any) => c.proofUrl)
        if (contribsWithProof.length > 0) {
          doc.setFontSize(12)
          doc.setFont('helvetica', 'bold')
          doc.text('Preuves de paiement', 14, yPos)
          yPos += 8
          
          for (const contrib of contribsWithProof) {
            if (yPos > doc.internal.pageSize.getHeight() - 80) {
              doc.addPage()
              yPos = 20
            }
            
            doc.setFontSize(10)
            doc.setFont('helvetica', 'bold')
            doc.text(`${contrib.memberFirstName} ${contrib.memberLastName}`, 14, yPos)
            yPos += 6
            
            try {
              const imgData = await loadImageAsBase64(contrib.proofUrl!)
              const imgWidth = 80
              const imgHeight = 60
              
              if (yPos + imgHeight > doc.internal.pageSize.getHeight() - 20) {
                doc.addPage()
                yPos = 20
              }
              
              doc.addImage(imgData, 'JPEG', 14, yPos, imgWidth, imgHeight)
              yPos += imgHeight + 8
            } catch (error) {
              doc.setFontSize(9)
              doc.setFont('helvetica', 'italic')
              doc.setTextColor(128, 128, 128)
              doc.text('(Image non disponible)', 14, yPos)
              yPos += 8
              doc.setTextColor(0, 0, 0)
            }
          }
        }
      } else {
        doc.setFontSize(12)
        doc.setFont('helvetica', 'bold')
        doc.text('Détail du paiement', 14, yPos)
        yPos += 8

        doc.setFontSize(10)
        doc.setFont('helvetica', 'normal')
        
        if (payment.time) {
          doc.text(`Heure : ${payment.time}`, 14, yPos)
          yPos += 6
        }
        
        if (payment.mode) {
          const modeLabel = payment.mode === 'airtel_money' ? 'Airtel Money' :
            payment.mode === 'mobicash' ? 'Mobicash' :
            payment.mode === 'cash' ? 'Espèce' :
            payment.mode === 'bank_transfer' ? 'Virement bancaire' : 'Inconnu'
          doc.text(`Mode : ${modeLabel}`, 14, yPos)
          yPos += 6
        }
        
        if (payment.proofUrl) {
          yPos += 4
          doc.setFontSize(11)
          doc.setFont('helvetica', 'bold')
          doc.text('Preuve de paiement :', 14, yPos)
          yPos += 6
          
          try {
            const imgData = await loadImageAsBase64(payment.proofUrl)
            const imgWidth = 80
            const imgHeight = 60
            
            if (yPos + imgHeight > doc.internal.pageSize.getHeight() - 20) {
              doc.addPage()
              yPos = 20
            }
            
            doc.addImage(imgData, 'JPEG', 14, yPos, imgWidth, imgHeight)
          } catch (error) {
            doc.setFontSize(9)
            doc.setFont('helvetica', 'italic')
            doc.setTextColor(128, 128, 128)
            doc.text('(Image non disponible)', 14, yPos)
            doc.setTextColor(0, 0, 0)
          }
        }
      }

      // Footer
      const pageCount = (doc as any).internal.getNumberOfPages()
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i)
        doc.setFontSize(8)
        doc.setTextColor(128, 128, 128)
        doc.text(
          `Page ${i} sur ${pageCount} - Généré le ${new Date().toLocaleDateString('fr-FR')}`,
          14,
          doc.internal.pageSize.getHeight() - 10
        )
      }

      const paidDateRaw2 = payment.paidAt as any
      const paidDate = payment.paidAt 
        ? (typeof paidDateRaw2?.toDate === 'function' ? paidDateRaw2.toDate() : new Date(payment.paidAt))
        : new Date()
      const formattedDate = `${paidDate.getDate().toString().padStart(2, '0')}-${(paidDate.getMonth() + 1).toString().padStart(2, '0')}-${paidDate.getFullYear()}`
      doc.save(`facture_${contractData.id}_M${payment.dueMonthIndex + 1}_${formattedDate}.pdf`)
      
      toast.success('PDF généré avec succès')
    } catch (error: any) {
      console.error('Erreur:', error)
      toast.error('Erreur lors de la génération du PDF')
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header fixe */}
        <DialogHeader className="flex-shrink-0 pb-4 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100">
                <FileText className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold text-slate-900">
                  Facture de paiement - Échéance M{payment.dueMonthIndex + 1}
                </DialogTitle>
                <DialogDescription className="text-slate-600 mt-1">
                  {isGroupContract 
                    ? "Détails du paiement collectif effectué pour cette échéance"
                    : "Détails du paiement effectué pour cette échéance"
                  }
                </DialogDescription>
              </div>
            </div>
            {/* <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <X className="h-5 w-5 text-slate-500" />
            </button> */}
          </div>
        </DialogHeader>

        {/* Contenu scrollable */}
        <div className="flex-1 overflow-y-auto px-1">
          {isGroupContract ? (
            <GroupPaymentInvoice payment={payment} contractData={contractData} />
          ) : (
            <IndividualPaymentInvoice payment={payment} contractData={contractData} />
          )}
        </div>

        {/* Footer fixe */}
        <div className="flex-shrink-0 pt-4 border-t bg-white">
          <div className="flex justify-between items-center">
            <button
              onClick={handleExportPDF}
              className={classNames(
                "px-6 py-3 rounded-lg text-sm font-medium flex items-center gap-2",
                "bg-green-600 text-white hover:bg-green-700 transition-colors shadow-sm"
              )}
            >
              <Download className="h-4 w-4" />
              Télécharger PDF
            </button>
            <button
              onClick={onClose}
              className={classNames(
                "px-6 py-3 rounded-lg text-sm font-medium text-white",
                brand.bg,
                "hover:bg-[#1a3a4f] transition-colors shadow-sm"
              )}
            >
              Fermer
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
