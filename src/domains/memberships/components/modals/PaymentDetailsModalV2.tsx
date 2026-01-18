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
import { 
  Download, 
  Calendar, 
  Clock, 
  CreditCard, 
  User, 
  FileImage, 
  CheckCircle2, 
  AlertCircle,
  Loader2,
  FileText,
  Receipt,
  Shield,
  DollarSign,
  TrendingUp,
  ExternalLink
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import type { Payment } from '@/types/types'
import { cn } from '@/lib/utils'
import Image from 'next/image'
import { 
  generatePaymentPDF,
  formatPaymentMode,
  formatPaymentType,
  normalizeDate
} from '../../utils/paymentPDFUtils'

interface PaymentDetailsModalV2Props {
  isOpen: boolean
  onClose: () => void
  payment: Payment | null
  memberName?: string
  requestId?: string
  matricule?: string
  memberEmail?: string
  memberPhone?: string
}

export function PaymentDetailsModalV2({
  isOpen,
  onClose,
  payment,
  memberName = 'Membre',
  requestId = '',
  matricule,
  memberEmail,
  memberPhone,
}: PaymentDetailsModalV2Props) {
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false)

  if (!payment) {
    return null
  }

  const handleDownloadPDF = async () => {
    if (!payment) return
    
    setIsGeneratingPDF(true)
    try {
      await generatePaymentPDF({
        payment,
        memberName,
        requestId,
        matricule,
        memberEmail,
        memberPhone,
      })
    } catch (error: any) {
      console.error('Erreur lors de la génération du PDF:', error)
      alert('Erreur lors de la génération du PDF. Veuillez réessayer.')
    } finally {
      setIsGeneratingPDF(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className="w-[calc(100vw-2rem)] max-w-2xl sm:max-w-3xl max-h-[85vh] overflow-hidden flex flex-col p-0" 
        data-testid="modal-payment-details"
      >
        {/* Header fixe */}
        <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-3 border-b border-kara-neutral-100 shrink-0">
          <DialogTitle className="flex items-center gap-2.5 text-base sm:text-lg">
            <div className="p-1.5 bg-kara-primary-dark/10 rounded-lg">
              <Receipt className="w-4 h-4 sm:w-5 sm:h-5 text-kara-primary-dark" />
            </div>
            Détails du paiement
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm mt-1">
            Informations complètes du paiement enregistré
          </DialogDescription>
        </DialogHeader>

        {/* Contenu scrollable */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 sm:px-6 py-4">
          <div className="space-y-5">
          {/* Informations du membre */}
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-kara-primary-dark shrink-0" />
                <h3 className="text-sm font-semibold text-kara-neutral-800">Informations du membre</h3>
              </div>
              <div className="bg-gradient-to-br from-kara-primary-dark/5 to-kara-primary-dark/10 rounded-xl p-4 border border-kara-primary-dark/20 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                  <span className="text-xs sm:text-sm text-kara-neutral-600 font-medium min-w-[100px]">Nom complet:</span>
                  <span className="text-sm sm:text-base text-kara-primary-dark font-semibold" data-testid="payment-details-member-name">{memberName}</span>
              </div>
              {matricule && (
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                    <span className="text-xs sm:text-sm text-kara-neutral-600 font-medium min-w-[100px]">Matricule:</span>
                    <span className="text-sm sm:text-base text-kara-primary-dark font-semibold" data-testid="payment-details-member-matricule">#{matricule}</span>
                  </div>
                )}
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                  <span className="text-xs sm:text-sm text-kara-neutral-600 font-medium min-w-[100px]">Référence:</span>
                  <span className="text-xs font-mono text-kara-primary-dark bg-white/60 px-2 py-1 rounded break-all" data-testid="payment-details-request-ref">{requestId}</span>
                </div>
              </div>
            </section>

            {/* Détails du paiement */}
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-kara-success shrink-0" />
                <h3 className="text-sm font-semibold text-kara-neutral-800">Détails du paiement</h3>
          </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Montant - Mise en avant */}
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 border-2 border-green-200 sm:col-span-2">
                <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="w-4 h-4 text-green-600" />
                    <span className="text-xs sm:text-sm font-medium text-green-700">Montant payé</span>
                </div>
                  <p className="text-2xl sm:text-3xl font-black text-green-700" data-testid="payment-details-amount">
                    {payment.amount.toLocaleString('fr-FR')} <span className="text-base sm:text-lg font-semibold">FCFA</span>
                </p>
              </div>

              {/* Type de paiement */}
                <div className="bg-white rounded-lg p-3 border border-kara-neutral-200">
                  <div className="flex items-center gap-2 mb-1.5">
                    <TrendingUp className="w-3.5 h-3.5 text-kara-neutral-500" />
                    <span className="text-xs font-medium text-kara-neutral-600">Type</span>
                </div>
                  <Badge variant="outline" className="bg-kara-primary-light/10 text-kara-primary-dark border-kara-primary-light text-xs" data-testid="payment-details-type">
                  {formatPaymentType(payment.paymentType)}
                </Badge>
              </div>

              {/* Date de versement */}
                <div className="bg-white rounded-lg p-3 border border-kara-neutral-200">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Calendar className="w-3.5 h-3.5 text-kara-neutral-500" />
                    <span className="text-xs font-medium text-kara-neutral-600">Date</span>
                </div>
                  <p className="text-sm font-semibold text-kara-primary-dark" data-testid="payment-details-date">
                    {(() => {
                      const date = normalizeDate(payment.date)
                      return date ? format(date, 'dd MMMM yyyy', { locale: fr }) : 'Date invalide'
                    })()}
                </p>
              </div>

              {/* Heure de versement */}
                <div className="bg-white rounded-lg p-3 border border-kara-neutral-200">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Clock className="w-3.5 h-3.5 text-kara-neutral-500" />
                    <span className="text-xs font-medium text-kara-neutral-600">Heure</span>
                </div>
                  <p className="text-sm font-semibold text-kara-primary-dark" data-testid="payment-details-time">{payment.time || '—'}</p>
              </div>

              {/* Mode de paiement */}
                <div className="bg-white rounded-lg p-3 border border-kara-neutral-200">
                  <div className="flex items-center gap-2 mb-1.5">
                    <CreditCard className="w-3.5 h-3.5 text-kara-neutral-500" />
                    <span className="text-xs font-medium text-kara-neutral-600">Mode</span>
                </div>
                  <Badge variant="outline" className="bg-kara-primary-light/10 text-kara-primary-dark border-kara-primary-light text-xs" data-testid="payment-details-mode">
                  {formatPaymentMode(payment.mode)}
                </Badge>
                {payment.paymentMethodOther && (
                    <p className="text-[10px] text-kara-neutral-500 mt-1.5" data-testid="payment-details-mode-other">({payment.paymentMethodOther})</p>
                )}
              </div>

              {/* Frais */}
              {payment.withFees !== undefined && (
                  <div className="bg-white rounded-lg p-3 border border-kara-neutral-200">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-xs font-medium text-kara-neutral-600">Frais</span>
                  </div>
                  <Badge
                    variant={payment.withFees ? 'default' : 'outline'}
                    className={cn(
                        'text-xs',
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
            </section>

          {/* Preuve de paiement */}
          {(payment.proofUrl || payment.proofJustification) && (
              <section className="space-y-3">
                <div className="flex items-center gap-2">
                  <FileImage className="w-4 h-4 text-kara-primary-dark shrink-0" />
                  <h3 className="text-sm font-semibold text-kara-neutral-800">Preuve de paiement</h3>
                </div>

              {payment.proofUrl ? (
                  <div className="bg-white rounded-xl p-4 border border-kara-neutral-200">
                    <div className="relative w-full h-48 sm:h-64 rounded-lg overflow-hidden border border-kara-neutral-300 bg-kara-neutral-50">
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
                      className="flex items-center gap-1.5 text-xs sm:text-sm text-kara-primary-dark hover:text-kara-primary-light mt-3 transition-colors"
                      data-testid="payment-details-proof-link"
                  >
                      <ExternalLink className="w-3.5 h-3.5" />
                    Ouvrir l'image en grand
                  </a>
                </div>
              ) : payment.proofJustification ? (
                  <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
                  <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-amber-900 mb-1.5">Justification</p>
                        <p className="text-xs sm:text-sm text-amber-800 whitespace-pre-wrap break-words">{payment.proofJustification}</p>
                    </div>
                  </div>
                </div>
              ) : null}
              </section>
          )}

          {/* Traçabilité */}
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-kara-primary-dark shrink-0" />
                <h3 className="text-sm font-semibold text-kara-neutral-800">Traçabilité</h3>
              </div>

              <div className="bg-kara-neutral-50 rounded-xl p-4 border border-kara-neutral-200 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                  <span className="text-xs sm:text-sm font-medium text-kara-neutral-600 min-w-[120px]">Enregistré par:</span>
                  <span className="text-xs sm:text-sm font-semibold text-kara-primary-dark" data-testid="payment-details-recorded-by-name">
                  {payment.recordedByName || payment.acceptedBy || 'Admin inconnu'}
                </span>
              </div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                  <div className="flex items-center gap-1.5 min-w-[120px]">
                    <Calendar className="w-3.5 h-3.5 text-kara-neutral-500 shrink-0" />
                    <span className="text-xs sm:text-sm font-medium text-kara-neutral-600">Date d'enregistrement:</span>
                  </div>
                  <span className="text-xs sm:text-sm font-semibold text-kara-primary-dark" data-testid="payment-details-recorded-at">
                    {(() => {
                      const date = normalizeDate(payment.recordedAt)
                      return date ? format(date, 'dd MMMM yyyy à HH:mm', { locale: fr }) : 'Date invalide'
                    })()}
                </span>
              </div>
            </div>
            </section>
          </div>
        </div>

        {/* Footer fixe */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-t border-kara-neutral-100 shrink-0 bg-kara-neutral-50/50">
          <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 justify-end">
          <Button
            variant="outline"
              size="sm"
            onClick={onClose}
              className="h-9 border-kara-neutral-200 text-kara-neutral-700 hover:bg-kara-neutral-100"
          >
              <span className="text-xs sm:text-sm">Fermer</span>
          </Button>
          <Button
            onClick={handleDownloadPDF}
            disabled={isGeneratingPDF}
              size="sm"
              className="h-9 sm:h-10 bg-kara-primary-dark hover:bg-kara-primary-dark/90 text-white shadow-md hover:shadow-lg transition-all"
            data-testid="download-payment-pdf"
          >
              {isGeneratingPDF ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  <span className="text-xs sm:text-sm">Génération...</span>
                </>
              ) : (
                <>
            <Download className="w-4 h-4 mr-2" />
                  <span className="text-xs sm:text-sm">Télécharger le PDF</span>
                </>
              )}
          </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
