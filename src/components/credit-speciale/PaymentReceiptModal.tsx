'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { useAgentRecouvrement } from '@/hooks/agent-recouvrement'
import { useAdmin } from '@/hooks/useAdmins'
import { useCreditDemand } from '@/hooks/useCreditSpeciale'
import { useMember } from '@/hooks/useMembers'
import { CreditContract, CreditPayment } from '@/types/types'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import type { FactureCreditSpecialPDFData } from '@/components/credit-speciale/FactureCreditSpecialPDF'
import { generateFactureCreditSpecialPDF } from '@/services/credit-speciale/factureCreditSpecialPdfExport'
import { buildResumeCreditFixePdfData, generateResumeCreditFixePDF } from '@/services/credit-speciale/resumeCreditFixePdfExport'
import type { DueItemLike } from '@/services/credit-speciale/creditSpecialeVersementPdfExport'
import {
    Banknote,
    Building2,
    Calendar,
    CreditCard,
    DollarSign,
    Download,
    Image as ImageIcon,
    Loader2,
    Pencil,
    Receipt,
    Smartphone,
    User,
    X
} from 'lucide-react'
import Image from 'next/image'
import React, { useState } from 'react'
import { toast } from 'sonner'

interface PaymentReceiptModalProps {
  isOpen: boolean
  onClose: () => void
  contract: CreditContract
  payment: CreditPayment
  installmentNumber?: number // Numéro d'échéance pour affichage
  /** Si fourni, affiche un bouton "Modifier le versement" (contrat non clôturé) */
  onEditClick?: () => void
  /** Échéancier (pour récap page 2 du PDF) */
  schedule?: DueItemLike[]
  /** Tous les versements du contrat (pour récap page 2 du PDF) */
  payments?: CreditPayment[]
  /** Date d'échéance de l'échéance concernée (pour le titre du bloc PDF) */
  dueDate?: Date | null
  /** Résolution du nom d'admin pour l'export PDF (optionnel) */
  getAdminDisplayName?: (adminId: string) => string
}

// Nouveaux modes (alignés caisse spéciale) + anciens (rétrocompatibilité)
const PAYMENT_MODE_LABELS: Record<string, { label: string; icon: any; color: string; bg: string }> = {
  airtel_money: { label: 'Airtel Money', icon: Smartphone, color: 'text-red-600', bg: 'bg-red-100' },
  mobicash: { label: 'Mobicash', icon: Banknote, color: 'text-blue-600', bg: 'bg-blue-100' },
  cash: { label: 'Espèce', icon: DollarSign, color: 'text-green-600', bg: 'bg-green-100' },
  bank_transfer: { label: 'Virement bancaire', icon: Building2, color: 'text-purple-600', bg: 'bg-purple-100' },
  // Anciennes valeurs (données déjà en base)
  CASH: { label: 'Espèces', icon: DollarSign, color: 'text-green-600', bg: 'bg-green-100' },
  MOBILE_MONEY: { label: 'Mobile Money', icon: Smartphone, color: 'text-blue-600', bg: 'bg-blue-100' },
  BANK_TRANSFER: { label: 'Virement bancaire', icon: Building2, color: 'text-purple-600', bg: 'bg-purple-100' },
  CHEQUE: { label: 'Chèque', icon: CreditCard, color: 'text-gray-600', bg: 'bg-gray-100' },
}

export default function PaymentReceiptModal({
  isOpen,
  onClose,
  contract,
  payment,
  installmentNumber,
  onEditClick,
  schedule,
  payments: paymentsList = [],
  dueDate,
  getAdminDisplayName: getAdminDisplayNameProp,
}: PaymentReceiptModalProps) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false)

  // Pour le PDF « Résumé partie fixe » : motif de la demande (cause) depuis la demande crédit fixe
  const { data: demand } = useCreditDemand(contract.demandId ?? '')

  // Récupérer le membre (collection users) pour le PDF : LIEU/NAISSANCE, D.NAISS, NATIONALITE, N°CNI, SEXE, AGE, QUARTIER, PROFESSION
  const { data: member } = useMember(contract.clientId)
  // Récupérer les informations de l'agent de liaison (admin ayant enregistré)
  const { data: agent } = useAdmin(payment.updatedBy || '')
  // Récupérer l'agent de recouvrement (collecteur du versement) pour l'affichage dans le reçu
  const { data: agentRecouvrement } = useAgentRecouvrement(payment.agentRecouvrementId ?? undefined)

  const getAdminDisplayName = getAdminDisplayNameProp ?? ((adminId: string) => {
    if (!adminId) return '-'
    if (adminId === (payment.updatedBy || '') && agent) {
      return `${agent.firstName} ${agent.lastName}`.trim() || adminId
    }
    return adminId
  })

  // Logs de débogage
  React.useEffect(() => {
    if (isOpen && payment) {
      console.log('[PaymentReceiptModal] Modal ouvert avec le paiement:', {
        id: payment.id,
        amount: payment.amount,
        paymentDate: payment.paymentDate,
        paymentTime: payment.paymentTime,
        mode: payment.mode,
        reference: payment.reference,
        comment: payment.comment,
        note: payment.note,
        installmentNumber: installmentNumber
      })
      console.log('[PaymentReceiptModal] Montant affiché sera:', payment.amount, 'FCFA')
    }
  }, [isOpen, payment, installmentNumber])

  const formatDate = (date: Date) => {
    return format(new Date(date), 'dd MMMM yyyy', { locale: fr })
  }

  const formatDateTime = (date: Date, time: string) => {
    return `${formatDate(date)} à ${time}`
  }

  const formatDateYYYYMMDD = (date: Date) => format(new Date(date), 'yyyy-MM-dd')

  const buildFactureData = (): FactureCreditSpecialPDFData => {
    const num = installmentNumber ?? 1
    const dueItem = schedule?.find((s) => s.month === num)
    const nextDueItem = schedule?.find((s) => s.month === num + 1)
    const prevDueItem = schedule?.find((s) => s.month === num - 1)
    const capitalStart = num === 1 ? contract.amount : (prevDueItem?.remaining ?? contract.amount)
    const interest = dueItem?.interest ?? Math.round(payment.interestAmount || 0)
    const globalAmount = dueItem?.principal ?? Math.round((payment.principalAmount || 0) + (payment.interestAmount || 0))
    const newCapitalAfter = dueItem?.remaining ?? Math.round(contract.amount - (payment.principalAmount || 0))
    const newCapitalNext = nextDueItem?.principal ?? Math.round(newCapitalAfter + (payment.interestAmount || 0))
    const moyenLabel = PAYMENT_MODE_LABELS[payment.mode]?.label ?? payment.mode ?? 'Aucun'
    const fraisValue =
      (payment.mode === 'airtel_money' || payment.mode === 'mobicash') && payment.withFees !== undefined
        ? payment.withFees
        : false
    const dateEcheance = dueDate ? formatDateYYYYMMDD(dueDate) : formatDateYYYYMMDD(payment.paymentDate)
    return {
      paymentDate: formatDateYYYYMMDD(payment.paymentDate),
      capital: capitalStart,
      taux: contract.interestRate ?? 0,
      interets: interest,
      montantGlobal: globalAmount,
      dateEcheance,
      dateRemise: formatDateYYYYMMDD(payment.paymentDate),
      heureRemise: payment.paymentTime || '12H00',
      moyen: moyenLabel,
      frais: fraisValue,
      montantRemis: payment.amount,
      penalite: payment.penaltyAmount ?? 0,
      remarque: payment.comment?.trim() || 'PAS DE VERSEMENT',
      note: payment.note ?? 0,
      nouveauCapital1: newCapitalAfter,
      nouveauCapital2: newCapitalNext,
    }
  }

  const handleDownloadPDF = async () => {
    try {
      setIsGeneratingPDF(true)
      toast.info('Génération du PDF en cours...')
      if (contract.creditType === 'FIXE') {
        const scheduleForPdf = (schedule ?? []).map((item) => ({
          month: item.month,
          date: item.date instanceof Date ? item.date : new Date(item.date),
          payment: item.payment,
          remaining: (item as { remaining?: number }).remaining ?? 0,
          paidAmount: item.paidAmount,
          paymentDate: item.paymentDate,
          paymentTime: (item as { paymentTime?: string }).paymentTime,
        }))
        const data = buildResumeCreditFixePdfData({
          contract,
          schedule: scheduleForPdf,
          payments: paymentsList,
          getAdminDisplayName,
          demandMotif: demand?.cause,
        })
        await generateResumeCreditFixePDF(data)
      } else {
        const factureData = buildFactureData()
        await generateFactureCreditSpecialPDF(factureData)
      }
      toast.success('PDF généré avec succès')
    } catch (error) {
      console.error('Erreur lors de la génération du PDF:', error)
      toast.error('Erreur lors de la génération du PDF')
    } finally {
      setIsGeneratingPDF(false)
    }
  }

  const paymentModeConfig = PAYMENT_MODE_LABELS[payment.mode] ?? { label: payment.mode, icon: DollarSign, color: 'text-gray-600', bg: 'bg-gray-100' }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-[#224D62] flex items-center gap-2">
            <Receipt className="h-6 w-6" />
            Reçu de Paiement
          </DialogTitle>
          <DialogDescription>
            Reçu de paiement pour le crédit {contract.creditType}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Informations du contrat */}
          <Card className="border-0 shadow-md bg-gradient-to-r from-[#234D65]/5 to-[#2c5a73]/5">
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Client</p>
                  <p className="font-semibold text-gray-900">
                    {contract.clientFirstName} {contract.clientLastName}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">N° Contrat</p>
                  <p className="font-mono text-sm text-gray-900">#{contract.id.slice(-8).toUpperCase()}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Type de crédit</p>
                  <Badge variant="outline">{contract.creditType}</Badge>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Montant emprunté</p>
                  <p className="font-semibold text-gray-900">
                    {contract.amount.toLocaleString('fr-FR')} FCFA
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Informations du paiement */}
          <Card className="border-0 shadow-md">
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Date et heure</span>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    <span className="font-semibold">{formatDateTime(payment.paymentDate, payment.paymentTime)}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Montant</span>
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-green-600" />
                    <span className="font-bold text-lg text-green-600">
                      {payment.amount.toLocaleString('fr-FR')} FCFA
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Moyen de paiement</span>
                  <div className="flex items-center gap-2">
                    <Badge className={`${paymentModeConfig.bg} ${paymentModeConfig.color}`}>
                      <paymentModeConfig.icon className="h-3 w-3 mr-1" />
                      {paymentModeConfig.label}
                    </Badge>
                    {(payment.mode === 'airtel_money' || payment.mode === 'mobicash') && payment.withFees !== undefined && (
                      <span className="text-sm text-gray-600">
                        ({payment.withFees ? 'Avec frais' : 'Sans frais'})
                      </span>
                    )}
                  </div>
                </div>
                {installmentNumber && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Échéance</span>
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                      Échéance {installmentNumber}
                    </Badge>
                  </div>
                )}
                {payment.reference && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Référence</span>
                    <span className="font-mono text-sm">{payment.reference}</span>
                  </div>
                )}
                {payment.note !== undefined && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Note</span>
                    <Badge variant="outline">{payment.note}/10</Badge>
                  </div>
                )}
                {payment.comment && (
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Commentaire</p>
                    <p className="text-sm text-gray-700">{payment.comment}</p>
                  </div>
                )}
                {payment.updatedBy && !payment.modificationReason && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Agent de liaison</span>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-gray-500" />
                      <span className="font-semibold">
                        {agent ? `${agent.firstName} ${agent.lastName}`.trim() : payment.updatedBy}
                      </span>
                    </div>
                  </div>
                )}
                {(payment.agentRecouvrementId || agentRecouvrement) && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Agent de recouvrement</span>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-gray-500" />
                      <span className="font-semibold">
                        {agentRecouvrement
                          ? `${agentRecouvrement.prenom} ${agentRecouvrement.nom}`.trim()
                          : payment.agentRecouvrementId}
                      </span>
                    </div>
                  </div>
                )}

                {/* Modification du versement (si le paiement a été modifié) */}
                {(payment.modificationReason ?? payment.updatedAt) && (
                  <div className="mt-4 pt-4 border-t border-amber-200 space-y-2">
                    <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                      <Pencil className="h-4 w-4" />
                      Modification du versement
                    </h4>
                    <div className="space-y-2 p-4 rounded-lg border bg-amber-50 border-amber-200 text-sm">
                      {payment.updatedAt && (() => {
                        const u = payment.updatedAt
                        const modDate = u instanceof Date ? u : (typeof (u as { toDate?: () => Date })?.toDate === 'function' ? (u as { toDate: () => Date }).toDate() : u ? new Date(u as string | number) : null)
                        if (!modDate || isNaN(modDate.getTime())) return null
                        return (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Modifié le :</span>
                            <span className="font-medium">{modDate.toLocaleDateString('fr-FR')} à {modDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        )
                      })()}
                      {payment.updatedBy && (
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">Modifié par :</span>
                          <span className="font-medium">
                            {agent ? `${agent.firstName} ${agent.lastName}`.trim() : payment.updatedBy}
                          </span>
                        </div>
                      )}
                      {payment.modificationReason && (
                        <div className="pt-2 border-t border-amber-200">
                          <span className="text-gray-600 block mb-1">Motif :</span>
                          <p className="font-medium text-gray-900 bg-white p-3 rounded border border-amber-100">{payment.modificationReason}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Preuve de paiement */}
          {payment.proofUrl && (
            <Card className="border-0 shadow-md">
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <ImageIcon className="h-5 w-5 text-gray-600" />
                    <p className="font-semibold">Preuve de paiement</p>
                  </div>
                  <div className="relative w-full h-64 border rounded-lg overflow-hidden cursor-pointer"
                    onClick={() => setSelectedImage(payment.proofUrl!)}
                  >
                    <Image
                      src={payment.proofUrl}
                      alt="Preuve de paiement"
                      fill
                      className="object-contain"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Fermer
          </Button>
          {onEditClick && (
            <Button
              type="button"
              variant="outline"
              onClick={() => { onEditClick(); onClose(); }}
              disabled={isGeneratingPDF}
              className="gap-2 border-amber-300 text-amber-700 hover:bg-amber-50"
            >
              <Pencil className="h-4 w-4" />
              Modifier le versement
            </Button>
          )}
          <Button
            onClick={handleDownloadPDF}
            disabled={isGeneratingPDF}
            className="bg-gradient-to-r from-[#234D65] to-[#2c5a73] hover:from-[#2c5a73] hover:to-[#234D65]"
          >
            {isGeneratingPDF ? (
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
        </DialogFooter>
      </DialogContent>

      {/* Modal plein écran pour l'image */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-7xl max-h-full">
            <Image
              src={selectedImage}
              alt="Preuve de paiement"
              width={1200}
              height={800}
              className="object-contain max-h-[90vh]"
            />
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-4 right-4 text-white hover:bg-white/20"
              onClick={() => setSelectedImage(null)}
            >
              <X className="h-6 w-6" />
            </Button>
          </div>
        </div>
      )}
    </Dialog>
  )
}

