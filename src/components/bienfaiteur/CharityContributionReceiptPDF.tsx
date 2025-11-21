'use client'

import React, { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { FileText, Download, Calendar, DollarSign, User, Gift, Loader2, Receipt } from 'lucide-react'
import { EnrichedCharityContribution, CharityEvent } from '@/types/types'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { toast } from 'sonner'

// Helper pour formater les montants
const formatAmount = (amount: number): string => {
  return amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}

interface CharityContributionReceiptPDFProps {
  isOpen: boolean
  onClose: () => void
  contribution: EnrichedCharityContribution
  event: CharityEvent
}

const PAYMENT_MODE_LABELS: Record<string, string> = {
  airtel_money: 'Airtel Money',
  mobicash: 'Mobicash',
  cash: 'Espèce',
  bank_transfer: 'Virement bancaire',
  other: 'Autre'
}

export default function CharityContributionReceiptPDF({
  isOpen,
  onClose,
  contribution,
  event
}: CharityContributionReceiptPDFProps) {
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false)

  const formatDate = (date: Date | undefined | null) => {
    if (!date) return 'Date non définie'
    try {
      const dateObj = date instanceof Date ? date : new Date(date)
      if (isNaN(dateObj.getTime())) return 'Date invalide'
      return format(dateObj, 'dd MMMM yyyy', { locale: fr })
    } catch {
      return 'Date invalide'
    }
  }

  const handleDownloadPDF = async () => {
    try {
      setIsGeneratingPDF(true)
      toast.info('Génération du PDF en cours...')

      const doc = new jsPDF('p', 'mm', 'a4')
      const pageWidth = doc.internal.pageSize.getWidth()
      const pageHeight = doc.internal.pageSize.getHeight()
      let yPos = 20

      // En-tête
      doc.setFillColor(35, 77, 101) // #234D65
      doc.rect(0, 0, pageWidth, 40, 'F')
      
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(24)
      doc.setFont('helvetica', 'bold')
      doc.text('REÇU DE CONTRIBUTION', pageWidth / 2, 20, { align: 'center' })
      
      doc.setFontSize(12)
      doc.setFont('helvetica', 'normal')
      doc.text('Évènement de Charité - KARA', pageWidth / 2, 30, { align: 'center' })

      yPos = 50

      // Informations de l'évènement
      doc.setTextColor(0, 0, 0)
      doc.setFillColor(240, 240, 240)
      doc.rect(10, yPos, pageWidth - 20, 40, 'F')
      
      yPos += 10
      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.text('INFORMATIONS DE L\'ÉVÈNEMENT', 15, yPos)
      
      yPos += 7
      doc.setFont('helvetica', 'normal')
      doc.text(`Titre: ${event.title}`, 15, yPos)
      doc.text(`Lieu: ${event.location}`, pageWidth / 2 + 5, yPos)
      
      yPos += 7
      const startDate = formatDate(event.startDate)
      const endDate = formatDate(event.endDate)
      doc.text(`Dates: ${startDate} - ${endDate}`, 15, yPos)

      yPos += 15

      // Informations du contributeur
      doc.setFillColor(245, 245, 245)
      doc.rect(10, yPos, pageWidth - 20, 35, 'F')
      
      yPos += 10
      doc.setFont('helvetica', 'bold')
      doc.text('INFORMATIONS DU CONTRIBUTEUR', 15, yPos)
      
      yPos += 7
      doc.setFont('helvetica', 'normal')
      const contributorName = contribution.participant?.name || 'Contributeur inconnu'
      doc.text(`Nom: ${contributorName}`, 15, yPos)
      
      if (contribution.participant?.type === 'member' && contribution.participant?.groupName) {
        yPos += 7
        doc.text(`Groupe de rattachement: ${contribution.participant.groupName}`, 15, yPos)
      } else if (contribution.participant?.type === 'group') {
        yPos += 7
        doc.text('Type: Groupe', 15, yPos)
      }

      yPos += 15

      // Détails de la contribution
      doc.setFillColor(240, 249, 255)
      doc.rect(10, yPos, pageWidth - 20, 50, 'F')
      
      yPos += 10
      doc.setFont('helvetica', 'bold')
      doc.text('DÉTAILS DE LA CONTRIBUTION', 15, yPos)
      
      yPos += 7
      doc.setFont('helvetica', 'normal')
      
      const contributionDate = formatDate(
        contribution.contributionDate || 
        contribution.payment?.date || 
        contribution.createdAt
      )
      doc.text(`Date de contribution: ${contributionDate}`, 15, yPos)
      
      yPos += 7
      doc.text(`Type: ${contribution.contributionType === 'money' ? 'Espèces' : 'Don en nature'}`, 15, yPos)
      
      if (contribution.contributionType === 'money') {
        yPos += 7
        const amount = contribution.payment?.amount || 0
        doc.text(`Montant: ${formatAmount(amount)} FCFA`, 15, yPos)
        
        if (contribution.payment?.mode) {
          yPos += 7
          const modeLabel = PAYMENT_MODE_LABELS[contribution.payment.mode] || contribution.payment.mode
          doc.text(`Mode de paiement: ${modeLabel}`, 15, yPos)
        }
      } else {
        yPos += 7
        doc.text(`Description: ${contribution.inKindDescription || 'Non spécifiée'}`, 15, yPos)
        
        if (contribution.estimatedValue) {
          yPos += 7
          doc.text(`Valeur estimée: ${formatAmount(contribution.estimatedValue)} FCFA`, 15, yPos)
        }
      }

      yPos += 15

      // Numéro de reçu
      doc.setFillColor(35, 77, 101)
      doc.rect(10, yPos, pageWidth - 20, 15, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(14)
      doc.setFont('helvetica', 'bold')
      const receiptNumber = `REC-${contribution.id.slice(0, 8).toUpperCase()}`
      doc.text(`N° de reçu: ${receiptNumber}`, pageWidth / 2, yPos + 10, { align: 'center' })

      yPos += 25

      // Statut
      doc.setTextColor(0, 0, 0)
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      const statusLabel = contribution.status === 'confirmed' ? 'Confirmé' : 
                         contribution.status === 'pending' ? 'En attente' : 'Annulé'
      doc.text(`Statut: ${statusLabel}`, 15, yPos)

      // Notes si présentes
      if (contribution.notes) {
        yPos += 10
        doc.setFont('helvetica', 'italic')
        doc.text(`Notes: ${contribution.notes}`, 15, yPos, { maxWidth: pageWidth - 30 })
      }

      // Footer
      yPos = pageHeight - 20
      doc.setFontSize(8)
      doc.setFont('helvetica', 'italic')
      doc.setTextColor(100, 100, 100)
      doc.text('Ce document est généré automatiquement par le système KARA', pageWidth / 2, yPos, { align: 'center' })
      doc.text(`Page 1/1 - Généré le ${format(new Date(), 'dd/MM/yyyy à HH:mm', { locale: fr })}`, pageWidth / 2, yPos + 5, { align: 'center' })

      // Télécharger le PDF
      const contributorNameSafe = contributorName.replace(/[^a-zA-Z0-9]/g, '_')
      const fileName = `Recu_Contribution_${contributorNameSafe}_${format(new Date(), 'ddMMyyyy')}.pdf`
      doc.save(fileName)
      
      toast.success('PDF téléchargé avec succès', {
        description: `Fichier: ${fileName}`
      })
    } catch (error) {
      console.error('Erreur lors de la génération du PDF:', error)
      toast.error('Erreur lors de la génération du PDF')
    } finally {
      setIsGeneratingPDF(false)
    }
  }

  const contributionDate = formatDate(
    contribution.contributionDate || 
    contribution.payment?.date || 
    contribution.createdAt
  )

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-[#234D65] flex items-center gap-2">
            <Receipt className="h-6 w-6" />
            Reçu de Contribution
          </DialogTitle>
          <DialogDescription>
            Reçu officiel de contribution pour l'évènement "{event.title}"
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Informations de l'évènement */}
          <Card className="border-0 shadow-md bg-gradient-to-r from-[#234D65]/5 to-[#2c5a73]/5">
            <CardContent className="p-6">
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span className="font-medium">Évènement</span>
                </div>
                <p className="font-semibold text-gray-900 text-lg">{event.title}</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Lieu: </span>
                    <span className="font-medium">{event.location}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Dates: </span>
                    <span className="font-medium">{formatDate(event.startDate)} - {formatDate(event.endDate)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Informations du contributeur */}
          <Card>
            <CardContent className="p-6">
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <User className="h-4 w-4" />
                  <span className="font-medium">Contributeur</span>
                </div>
                <p className="font-semibold text-gray-900">
                  {contribution.participant?.name || 'Contributeur inconnu'}
                </p>
                {contribution.participant?.type === 'member' && contribution.participant?.groupName && (
                  <p className="text-sm text-gray-600">
                    Groupe: {contribution.participant.groupName}
                  </p>
                )}
                {contribution.participant?.type === 'group' && (
                  <Badge variant="secondary">Groupe</Badge>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Détails de la contribution */}
          <Card>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                  <DollarSign className="h-4 w-4" />
                  <span className="font-medium">Détails de la contribution</span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm text-muted-foreground">Date: </span>
                    <span className="font-medium">{contributionDate}</span>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Type: </span>
                    <Badge variant={contribution.contributionType === 'money' ? 'default' : 'secondary'}>
                      {contribution.contributionType === 'money' ? 'Espèces' : 'Don en nature'}
                    </Badge>
                  </div>
                </div>

                {contribution.contributionType === 'money' ? (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <span className="text-sm text-muted-foreground">Montant: </span>
                        <span className="font-bold text-lg text-[#234D65]">
                          {contribution.payment?.amount ? `${formatAmount(contribution.payment.amount)} FCFA` : '0 FCFA'}
                        </span>
                      </div>
                      {contribution.payment?.mode && (
                        <div>
                          <span className="text-sm text-muted-foreground">Mode de paiement: </span>
                          <span className="font-medium">
                            {PAYMENT_MODE_LABELS[contribution.payment.mode] || contribution.payment.mode}
                          </span>
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <span className="text-sm text-muted-foreground">Description: </span>
                      <p className="font-medium mt-1">{contribution.inKindDescription || 'Non spécifiée'}</p>
                    </div>
                    {contribution.estimatedValue && (
                      <div>
                        <span className="text-sm text-muted-foreground">Valeur estimée: </span>
                        <span className="font-bold text-lg text-[#234D65]">
                          {formatAmount(contribution.estimatedValue)} FCFA
                        </span>
                      </div>
                    )}
                  </>
                )}

                <div>
                  <span className="text-sm text-muted-foreground">Statut: </span>
                  <Badge variant={contribution.status === 'confirmed' ? 'default' : 
                                contribution.status === 'pending' ? 'secondary' : 'destructive'}>
                    {contribution.status === 'confirmed' ? 'Confirmé' : 
                     contribution.status === 'pending' ? 'En attente' : 'Annulé'}
                  </Badge>
                </div>

                {contribution.notes && (
                  <div>
                    <span className="text-sm text-muted-foreground">Notes: </span>
                    <p className="text-sm mt-1 italic">{contribution.notes}</p>
                  </div>
                )}

                <div className="pt-4 border-t">
                  <div className="flex items-center gap-2 text-sm">
                    <FileText className="h-4 w-4 text-[#234D65]" />
                    <span className="font-medium text-[#234D65]">
                      N° de reçu: REC-{contribution.id.slice(0, 8).toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isGeneratingPDF}>
            Fermer
          </Button>
          <Button 
            onClick={handleDownloadPDF} 
            disabled={isGeneratingPDF}
            className="bg-[#234D65] hover:bg-[#2c5a73]"
          >
            {isGeneratingPDF ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Génération...
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                Télécharger le PDF
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

