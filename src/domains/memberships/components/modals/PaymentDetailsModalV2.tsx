/**
 * Modal d'affichage des détails d'un paiement enregistré
 * 
 * Affiche toutes les informations d'un paiement :
 * - Montant, type, date/heure, mode, frais
 * - Preuve de paiement (image)
 * - Traçabilité (qui a enregistré, quand)
 * - Export PDF
 */

'use client'

import { useState } from 'react'
import { X, Download, Calendar, Clock, CreditCard, User, FileImage, CheckCircle2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import type { Payment, PaymentMode, TypePayment } from '@/types/types'
import { PAYMENT_MODES, PAYMENT_TYPES } from '@/constantes/membership-requests'
import { cn } from '@/lib/utils'
import Image from 'next/image'

interface PaymentDetailsModalV2Props {
  isOpen: boolean
  onClose: () => void
  payment: Payment | null
  memberName?: string
  requestId?: string
  matricule?: string
}

/**
 * Formate le mode de paiement pour l'affichage
 */
function formatPaymentMode(mode: PaymentMode): string {
  const modeMap: Record<PaymentMode, string> = {
    airtel_money: 'Airtel Money',
    mobicash: 'Mobicash',
    cash: 'Espèces',
    bank_transfer: 'Virement bancaire',
    other: 'Autre',
  }
  return modeMap[mode] || mode
}

/**
 * Formate le type de paiement pour l'affichage
 */
function formatPaymentType(type: TypePayment): string {
  const typeMap: Record<TypePayment, string> = {
    Membership: 'Adhésion',
    Subscription: 'Cotisation',
    Tontine: 'Tontine',
    Charity: 'Charité',
  }
  return typeMap[type] || type
}

/**
 * Génère un PDF avec les détails du paiement
 */
async function generatePaymentPDF(
  payment: Payment,
  memberName: string,
  requestId: string,
  matricule?: string
): Promise<void> {
  try {
    const { jsPDF } = await import('jspdf')
    const doc = new jsPDF('portrait', 'mm', 'a4')

    // Couleurs KARA
    const primaryColor: [number, number, number] = [31, 81, 255] // kara-primary-dark
    const secondaryColor: [number, number, number] = [100, 116, 139] // kara-neutral-500

    // En-tête
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2])
    doc.rect(0, 0, 210, 40, 'F')
    
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(20)
    doc.setFont('helvetica', 'bold')
    doc.text('KARA', 20, 20)
    
    doc.setFontSize(12)
    doc.setFont('helvetica', 'normal')
    doc.text('Reçu de Paiement', 20, 30)

    // Informations du membre
    let yPos = 55
    doc.setTextColor(0, 0, 0)
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('Informations du membre', 20, yPos)
    
    yPos += 8
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text(`Nom complet: ${memberName}`, 20, yPos)
    
    yPos += 6
    if (matricule) {
      doc.text(`Matricule: ${matricule}`, 20, yPos)
      yPos += 6
    }
    doc.text(`Référence demande: ${requestId}`, 20, yPos)

    // Détails du paiement
    yPos += 12
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('Détails du paiement', 20, yPos)
    
    yPos += 8
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    
    const paymentDetails = [
      [`Type: ${formatPaymentType(payment.paymentType)}`, `Montant: ${payment.amount.toLocaleString('fr-FR')} FCFA`],
      [`Date de versement: ${format(payment.date, 'dd/MM/yyyy', { locale: fr })}`, `Heure: ${payment.time}`],
      [`Mode de paiement: ${formatPaymentMode(payment.mode)}`, payment.withFees !== undefined ? (payment.withFees ? 'Avec frais' : 'Sans frais') : ''],
      payment.paymentMethodOther ? [`Précision: ${payment.paymentMethodOther}`, ''] : ['', ''],
    ]

    paymentDetails.forEach(([left, right]) => {
      if (left) doc.text(left, 20, yPos)
      if (right) doc.text(right, 110, yPos)
      yPos += 6
    })

    // Traçabilité
    yPos += 8
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('Traçabilité', 20, yPos)
    
    yPos += 8
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text(`Enregistré par: ${payment.recordedByName || payment.acceptedBy}`, 20, yPos)
    
    yPos += 6
    doc.text(`Date d'enregistrement: ${format(payment.recordedAt, 'dd/MM/yyyy à HH:mm', { locale: fr })}`, 20, yPos)

    // Preuve de paiement
    if (payment.proofUrl) {
      yPos += 12
      doc.setFontSize(14)
      doc.setFont('helvetica', 'bold')
      doc.text('Preuve de paiement', 20, yPos)
      
      yPos += 8
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2])
      doc.text('Une preuve de paiement est disponible dans le système.', 20, yPos)
      doc.setTextColor(0, 0, 0)
    } else if (payment.proofJustification) {
      yPos += 12
      doc.setFontSize(14)
      doc.setFont('helvetica', 'bold')
      doc.text('Justification', 20, yPos)
      
      yPos += 8
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2])
      const justificationLines = doc.splitTextToSize(payment.proofJustification, 170)
      doc.text(justificationLines, 20, yPos)
      doc.setTextColor(0, 0, 0)
    }

    // Pied de page
    const pageHeight = doc.internal.pageSize.height
    doc.setFontSize(8)
    doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2])
    doc.text('Ce document est un reçu interne et ne constitue pas une facture officielle.', 20, pageHeight - 20)
    doc.text(`Généré le ${format(new Date(), 'dd/MM/yyyy à HH:mm', { locale: fr })}`, 20, pageHeight - 15)

    // Télécharger le PDF
    const fileName = `paiement-${requestId}-${format(payment.date, 'yyyyMMdd', { locale: fr })}.pdf`
    doc.save(fileName)
  } catch (error) {
    console.error('Erreur lors de la génération du PDF:', error)
    throw new Error('Impossible de générer le PDF')
  }
}

export function PaymentDetailsModalV2({
  isOpen,
  onClose,
  payment,
  memberName = 'Membre',
  requestId = '',
  matricule,
}: PaymentDetailsModalV2Props) {
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false)

  if (!payment) {
    return null
  }

  const handleDownloadPDF = async () => {
    if (!payment) return
    
    setIsGeneratingPDF(true)
    try {
      await generatePaymentPDF(payment, memberName, requestId, matricule)
    } catch (error: any) {
      console.error('Erreur lors de la génération du PDF:', error)
      alert('Erreur lors de la génération du PDF. Veuillez réessayer.')
    } finally {
      setIsGeneratingPDF(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" data-testid="modal-payment-details">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-kara-primary-dark flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Détails du paiement
          </DialogTitle>
          <DialogDescription>
            Informations complètes du paiement enregistré
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Informations du membre */}
          <div className="bg-kara-neutral-50 rounded-lg p-4 border border-kara-neutral-200">
            <h3 className="font-semibold text-kara-primary-dark mb-3 flex items-center gap-2">
              <User className="w-4 h-4" />
              Informations du membre
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-kara-neutral-600 font-medium">Nom:</span>
                <span className="text-kara-primary-dark font-semibold">{memberName}</span>
              </div>
              {matricule && (
                <div className="flex items-center gap-2">
                  <span className="text-kara-neutral-600 font-medium">Matricule:</span>
                  <span className="text-kara-primary-dark font-semibold">{matricule}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <span className="text-kara-neutral-600 font-medium">Référence demande:</span>
                <span className="text-kara-primary-dark font-mono text-xs">{requestId}</span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Détails du paiement */}
          <div className="space-y-4">
            <h3 className="font-semibold text-kara-primary-dark text-lg flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-kara-success" />
              Détails du paiement
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Montant */}
              <div className="bg-kara-primary-dark/5 rounded-lg p-4 border border-kara-primary-dark/20">
                <div className="flex items-center gap-2 mb-2">
                  <CreditCard className="w-4 h-4 text-kara-primary-dark" />
                  <span className="text-sm font-medium text-kara-neutral-600">Montant</span>
                </div>
                <p className="text-2xl font-bold text-kara-primary-dark">
                  {payment.amount.toLocaleString('fr-FR')} FCFA
                </p>
              </div>

              {/* Type de paiement */}
              <div className="bg-kara-primary-dark/5 rounded-lg p-4 border border-kara-primary-dark/20">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-medium text-kara-neutral-600">Type de paiement</span>
                </div>
                <Badge variant="outline" className="bg-kara-primary-light/10 text-kara-primary-dark border-kara-primary-light">
                  {formatPaymentType(payment.paymentType)}
                </Badge>
              </div>

              {/* Date de versement */}
              <div className="bg-kara-primary-dark/5 rounded-lg p-4 border border-kara-primary-dark/20">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="w-4 h-4 text-kara-primary-dark" />
                  <span className="text-sm font-medium text-kara-neutral-600">Date de versement</span>
                </div>
                <p className="text-base font-semibold text-kara-primary-dark">
                  {format(payment.date, 'dd MMMM yyyy', { locale: fr })}
                </p>
              </div>

              {/* Heure de versement */}
              <div className="bg-kara-primary-dark/5 rounded-lg p-4 border border-kara-primary-dark/20">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-4 h-4 text-kara-primary-dark" />
                  <span className="text-sm font-medium text-kara-neutral-600">Heure de versement</span>
                </div>
                <p className="text-base font-semibold text-kara-primary-dark">{payment.time}</p>
              </div>

              {/* Mode de paiement */}
              <div className="bg-kara-primary-dark/5 rounded-lg p-4 border border-kara-primary-dark/20">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-medium text-kara-neutral-600">Mode de paiement</span>
                </div>
                <Badge variant="outline" className="bg-kara-primary-light/10 text-kara-primary-dark border-kara-primary-light">
                  {formatPaymentMode(payment.mode)}
                </Badge>
                {payment.paymentMethodOther && (
                  <p className="text-xs text-kara-neutral-500 mt-1">({payment.paymentMethodOther})</p>
                )}
              </div>

              {/* Frais */}
              {payment.withFees !== undefined && (
                <div className="bg-kara-primary-dark/5 rounded-lg p-4 border border-kara-primary-dark/20">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-medium text-kara-neutral-600">Frais</span>
                  </div>
                  <Badge
                    variant={payment.withFees ? 'default' : 'outline'}
                    className={cn(
                      payment.withFees
                        ? 'bg-orange-500/10 text-orange-600 border-orange-500/30'
                        : 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30'
                    )}
                  >
                    {payment.withFees ? 'Avec frais' : 'Sans frais'}
                  </Badge>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Preuve de paiement */}
          {(payment.proofUrl || payment.proofJustification) && (
            <div className="space-y-4">
              <h3 className="font-semibold text-kara-primary-dark text-lg flex items-center gap-2">
                <FileImage className="w-5 h-5 text-kara-primary-dark" />
                Preuve de paiement
              </h3>

              {payment.proofUrl ? (
                <div className="bg-kara-neutral-50 rounded-lg p-4 border border-kara-neutral-200">
                  <div className="relative w-full h-64 rounded-lg overflow-hidden border border-kara-neutral-300">
                    <Image
                      src={payment.proofUrl}
                      alt="Preuve de paiement"
                      fill
                      className="object-contain"
                      sizes="(max-width: 768px) 100vw, 600px"
                    />
                  </div>
                  <a
                    href={payment.proofUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-kara-primary-dark hover:underline mt-2 inline-block"
                  >
                    Ouvrir l'image en grand
                  </a>
                </div>
              ) : payment.proofJustification ? (
                <div className="bg-kara-neutral-50 rounded-lg p-4 border border-kara-neutral-200">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-kara-warning mt-0.5 shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-kara-neutral-700 mb-1">Justification</p>
                      <p className="text-sm text-kara-neutral-600 whitespace-pre-wrap">{payment.proofJustification}</p>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          )}

          <Separator />

          {/* Traçabilité */}
          <div className="space-y-4">
            <h3 className="font-semibold text-kara-primary-dark text-lg flex items-center gap-2">
              <User className="w-5 h-5 text-kara-primary-dark" />
              Traçabilité
            </h3>

            <div className="bg-kara-neutral-50 rounded-lg p-4 border border-kara-neutral-200 space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-kara-neutral-600">Enregistré par:</span>
                <span className="text-sm font-semibold text-kara-primary-dark">
                  {payment.recordedByName || payment.acceptedBy || 'Admin inconnu'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-kara-neutral-500" />
                <span className="text-sm font-medium text-kara-neutral-600">Date d'enregistrement:</span>
                <span className="text-sm font-semibold text-kara-primary-dark">
                  {format(payment.recordedAt, 'dd MMMM yyyy à HH:mm', { locale: fr })}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-kara-neutral-200">
          <Button
            variant="outline"
            onClick={onClose}
            className="border-kara-neutral-200 text-kara-neutral-700 hover:bg-kara-neutral-50"
          >
            Fermer
          </Button>
          <Button
            onClick={handleDownloadPDF}
            disabled={isGeneratingPDF}
            className="bg-kara-primary-dark hover:bg-kara-primary-dark/90 text-white"
            data-testid="download-payment-pdf"
          >
            <Download className="w-4 h-4 mr-2" />
            {isGeneratingPDF ? 'Génération...' : 'Télécharger le PDF'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
