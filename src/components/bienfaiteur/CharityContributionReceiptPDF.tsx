'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { CharityEvent, EnrichedCharityContribution } from '@/types/types'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Calendar, DollarSign, Download, FileText, Loader2, Receipt, User } from 'lucide-react'
import { useState } from 'react'
import { buildCharityContributionReceipt } from '@/services/bienfaiteur/charityContributionReceipt'
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

      const {doc,fileName} = await buildCharityContributionReceipt(contribution,event)
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
      <DialogContent className="sm:max-w-3xl max-h-[90dvh] overflow-y-auto">
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
                          <span className="text-sm text-muted-foreground">Moyen de paiement: </span>
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
