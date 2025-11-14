"use client"

import React, { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import routes from '@/constantes/routes'
import { useCaisseContract } from '@/hooks/useCaisseContracts'
import { useActiveCaisseSettingsByType } from '@/hooks/useCaisseSettings'
import { useAuth } from '@/hooks/useAuth'
import { pay, requestFinalRefund, requestEarlyRefund, approveRefund, markRefundPaid, cancelEarlyRefund } from '@/services/caisse/mutations'
import { toast } from 'sonner'
import { compressImage, IMAGE_COMPRESSION_PRESETS } from '@/lib/utils'
import FileInput from '@/components/ui/file-input'
import type { PaymentMode } from '@/types/types'
import { listRefunds } from '@/db/caisse/refunds.db'
import { 
  CreditCard, 
  Calendar, 
  Clock, 
  DollarSign, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Loader2, 
  Settings, 
  RefreshCw, 
  Download, 
  Upload, 
  Eye, 
  X,
  Smartphone,
  Banknote,
  Receipt,
  TrendingUp,
  ArrowRight,
  FileText,
  User,
  Shield,
  Building2,
  Trash2,
  CalendarDays,
  CheckCircle2
} from 'lucide-react'
import PdfDocumentModal from './PdfDocumentModal'
import PdfViewerModal from './PdfViewerModal'
import RemboursementNormalPDFModal from './RemboursementNormalPDFModal'
import PaymentCSModal, { PaymentCSFormData } from './PaymentCSModal'
import PaymentInvoiceModal from './standard/PaymentInvoiceModal'
import type { RefundDocument } from '@/types/types'
import TestPaymentTools from './TestPaymentTools'

type Props = { id: string }

// Composant StatCard pour afficher les statistiques
function StatCard({ icon: Icon, label, value, accent = "slate" }: any) {
  const accents: Record<string, string> = {
    slate: "from-slate-50 to-white",
    emerald: "from-emerald-50 to-white",
    red: "from-rose-50 to-white",
    brand: "from-[#234D65]/10 to-white",
  }
  const brand = {
    text: "text-[#234D65]",
  }
  return (
    <div className={`rounded-2xl border bg-gradient-to-b ${accents[accent]} p-4 shadow-sm`}>
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs text-slate-500">{label}</div>
          <div className="mt-1 text-lg font-semibold text-slate-800">{value}</div>
        </div>
        {Icon ? <Icon className={`h-5 w-5 ${brand.text}`} /> : null}
      </div>
    </div>
  )
}

export default function FreeContract({ id }: Props) {
  const { data, isLoading, isError, error, refetch } = useCaisseContract(id)
  const { user } = useAuth()

  const [selectedIdx, setSelectedIdx] = useState<number | null>(null)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [showInvoiceModal, setShowInvoiceModal] = useState(false)
  const [selectedPayment, setSelectedPayment] = useState<any>(null)
  const [isRefunding, setIsRefunding] = useState(false)
  const [refundFile, setRefundFile] = useState<File | undefined>()
  const [refundDate, setRefundDate] = useState(() => {
    return new Date().toISOString().split('T')[0]
  })
  const [refundTime, setRefundTime] = useState(() => {
    const now = new Date()
    return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
  })
  const [confirmApproveId, setConfirmApproveId] = useState<string | null>(null)
  const [confirmPaidId, setConfirmPaidId] = useState<string | null>(null)
  const [showPdfModal, setShowPdfModal] = useState(false)
  const [showPdfViewer, setShowPdfViewer] = useState(false)
  const [showRemboursementPdf, setShowRemboursementPdf] = useState(false)
  const [currentRefundId, setCurrentRefundId] = useState<string | null>(null)
  const [currentDocument, setCurrentDocument] = useState<RefundDocument | null>(null)
  const [refunds, setRefunds] = useState<any[]>([])
  const [showReasonModal, setShowReasonModal] = useState(false)
  const [refundType, setRefundType] = useState<'FINAL' | 'EARLY' | null>(null)
  const [refundReasonInput, setRefundReasonInput] = useState('')
  const [confirmDeleteDocumentId, setConfirmDeleteDocumentId] = useState<string | null>(null)

  // Fonction pour recharger les remboursements
  const reloadRefunds = React.useCallback(async () => {
    if (id) {
      try {
        const refundsData = await listRefunds(id)
        setRefunds(refundsData)
      } catch (error) {
        console.error('Error loading refunds:', error)
      }
    }
  }, [id])

  // Load refunds from subcollection
  useEffect(() => {
    reloadRefunds()
  }, [reloadRefunds])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-[#234D65] mx-auto mb-4" />
          <p className="text-gray-600 text-lg">Chargement du contrat...</p>
        </div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md text-center">
          <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Erreur de chargement</h2>
          <p className="text-red-600">{(error as any)?.message}</p>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md text-center">
          <AlertTriangle className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Contrat introuvable</h2>
        </div>
      </div>
    )
  }

  const isClosed = data.status === 'CLOSED' || data.status === 'RESCINDED'
  const settings = useActiveCaisseSettingsByType((data as any).caisseType)

  const handleMonthClick = (monthIndex: number, payment: any) => {
    setSelectedIdx(monthIndex)
    
    // Si le paiement est déjà effectué, afficher la facture
    if (payment.status === 'PAID') {
      setSelectedPayment(payment)
      setShowInvoiceModal(true)
    } else {
      // Sinon, afficher le formulaire de paiement
      setShowPaymentModal(true)
    }
  }

  const handlePaymentSubmit = async (paymentData: PaymentCSFormData) => {
    if (selectedIdx === null) return

    try {
      await pay({ 
        contractId: id, 
        dueMonthIndex: selectedIdx, 
        memberId: data.memberId, 
        amount: paymentData.amount, 
        file: paymentData.proofFile,
        paidAt: new Date(`${paymentData.date}T${paymentData.time}`),
        time: paymentData.time,
        mode: paymentData.mode
      })
      await refetch()
      toast.success('Contribution enregistrée')
      
      setShowPaymentModal(false)
      setSelectedIdx(null)
    } catch (error) {
      console.error('Erreur lors du paiement:', error)
      throw error
    }
  }

  function paymentStatusLabel(s: string): string {
    const map: Record<string, string> = {
      DUE: 'À payer',
      PAID: 'Payé',
      REFUSED: 'Refusé',
    }
    return map[s] || s
  }

  function getPaymentStatusConfig(status: string) {
    switch (status) {
      case 'DUE':
        return { 
          bg: 'bg-orange-100', 
          text: 'text-orange-700', 
          border: 'border-orange-200',
          icon: Clock 
        }
      case 'PAID':
        return { 
          bg: 'bg-green-100', 
          text: 'text-green-700', 
          border: 'border-green-200',
          icon: CheckCircle 
        }
      case 'REFUSED':
        return { 
          bg: 'bg-red-100', 
          text: 'text-red-700', 
          border: 'border-red-200',
          icon: XCircle 
        }
      default:
        return { 
          bg: 'bg-gray-100', 
          text: 'text-gray-700', 
          border: 'border-gray-200',
          icon: AlertTriangle 
        }
    }
  }

  const getPaymentModeIcon = (mode: PaymentMode) => {
    switch (mode) {
      case 'airtel_money':
        return <Smartphone className="h-4 w-4" />
      case 'mobicash':
        return <Banknote className="h-4 w-4" />
      case 'cash':
        return <DollarSign className="h-4 w-4" />
      case 'bank_transfer':
        return <Building2 className="h-4 w-4" />
      default:
        return <CreditCard className="h-4 w-4" />
    }
  }

  const handlePdfUpload = async (document: RefundDocument | null) => {
    // Le document est maintenant persisté dans la base de données
    // On peut fermer le modal et rafraîchir les données
    setShowPdfModal(false)
    await refetch()
    await reloadRefunds() // Rafraîchir la liste des remboursements
  }

  const handleViewDocument = (refundId: string, document: RefundDocument) => {
    if (!document) {
      toast.error('Aucun document à afficher')
      return
    }
    setCurrentRefundId(refundId)
    setCurrentDocument(document)
    setShowPdfViewer(true)
  }

  const handleOpenPdfModal = (refundId: string) => {
    setCurrentRefundId(refundId)
    setShowPdfModal(true)
  }

  const currentRefund = useMemo(() => {
    return currentRefundId ? refunds.find((r: any) => r.id === currentRefundId) : null
  }, [currentRefundId, refunds])

  const documentMemberId = useMemo(() => {
    if ((data as any).memberId) return (data as any).memberId
    if ((data as any).groupeId) return `GROUP_${(data as any).groupeId}`
    return ''
  }, [data])

  const handleDeleteDocument = async (refundId: string) => {
    try {
      const { updateRefund } = await import('@/db/caisse/refunds.db')

      await updateRefund(id, refundId, {
        document: null,
        updatedBy: user?.uid,
        documentDeletedAt: new Date()
      })

      await reloadRefunds() // Rafraîchir la liste des remboursements
      toast.success("Document supprimé avec succès")
    } catch (error: any) {
      console.error('Error deleting document:', error)
      toast.error(error?.message || "Erreur lors de la suppression du document")
    } finally {
      setConfirmDeleteDocumentId(null)
    }
  }


  const payments = data.payments || []
  const paidCount = payments.filter((x: any) => x.status === 'PAID').length
  const allPaid = payments.length > 0 && paidCount === payments.length
  const canEarly = paidCount >= 1 && !allPaid
  const hasFinalRefund = refunds.some((r: any) => r.type === 'FINAL' && r.status !== 'ARCHIVED') || data.status === 'FINAL_REFUND_PENDING' || data.status === 'CLOSED'
  const hasEarlyRefund = refunds.some((r: any) => r.type === 'EARLY' && r.status !== 'ARCHIVED') || data.status === 'EARLY_REFUND_PENDING'

  // Trouver le prochain mois à payer (paiement séquentiel)
  const getNextDueMonthIndex = () => {
    const sortedPayments = [...payments].sort((a: any, b: any) => a.dueMonthIndex - b.dueMonthIndex)
    const nextDue = sortedPayments.find((p: any) => p.status === 'DUE')
    return nextDue ? nextDue.dueMonthIndex : -1
  }

  const nextDueMonthIndex = getNextDueMonthIndex()

  // Calculer le bonus actuel pour les contrats LIBRE
  const calculateBonus = (monthIndex: number, nominalPaid: number) => {
    if (!settings.data?.bonusRules) return 0
    const bonusRate = settings.data.bonusRules.percentage / 100
    return nominalPaid * bonusRate
  }
  
  const currentBonus = calculateBonus(
    data.currentMonthIndex || 0,
    data.nominalPaid || 0
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 md:p-6 overflow-x-hidden">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* En-tête du contrat */}
        <div className="bg-white rounded-2xl shadow-lg shadow-blue-100/50 border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-[#234D65] to-[#2c5a73] p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="bg-white/20 rounded-lg p-3">
                  <FileText className="h-8 w-8 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h1 className="text-xl md:text-3xl font-bold text-white break-words">Contrat Libre</h1>
                  <p className="text-blue-100 text-sm md:text-base break-all font-mono">#{id}</p>
                </div>
              </div>
              {isClosed && (
                <div className="bg-red-500 text-white px-4 py-2 rounded-lg flex items-center gap-2">
                  <XCircle className="h-5 w-5" />
                  Contrat fermé
                </div>
              )}
            </div>
          </div>
          
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex items-center gap-3">
                <div className="bg-blue-100 rounded-lg p-2">
                  <Settings className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Type de caisse</p>
                  <p className="font-semibold text-gray-900">{String((data as any).caisseType)}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="bg-green-100 rounded-lg p-2">
                  <Shield className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Paramètres actifs</p>
                  <p className="font-semibold text-gray-900">{settings.data ? (settings.data as any).id : '—'}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="bg-orange-100 rounded-lg p-2">
                  <DollarSign className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Montant minimum</p>
                  <p className="font-semibold text-gray-900">100 000 FCFA/mois</p>
                </div>
              </div>
            </div>
            
            {/* Lien vers l'historique des versements */}
            <div className="mt-6 flex justify-center">
              <Link
                href={routes.admin.caisseSpecialeContractPayments(id)}
                className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 transition-colors duration-200 shadow-md hover:shadow-lg"
              >
                <FileText className="h-4 w-4" />
                Historique des versements
              </Link>
            </div>
          </div>
        </div>

        {/* Statistiques */}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3 xl:grid-cols-6">
          <StatCard 
            icon={CreditCard} 
            label="Montant mensuel" 
            value={`${(data.monthlyAmount || 0).toLocaleString('fr-FR')} FCFA`} 
            accent="brand" 
          />
          <StatCard 
            icon={Clock} 
            label="Durée (mois)" 
            value={data.monthsPlanned || 0} 
          />
          <StatCard 
            icon={CheckCircle2} 
            label="Nominal payé" 
            value={`${(data.nominalPaid || 0).toLocaleString('fr-FR')} FCFA`} 
          />
          <StatCard 
            icon={TrendingUp} 
            label="Bonus" 
            value={`${currentBonus.toLocaleString('fr-FR')} FCFA`} 
            accent="emerald" 
          />
          <StatCard 
            icon={AlertTriangle} 
            label="Pénalités cumulées" 
            value={`${(data.penaltiesTotal || 0).toLocaleString('fr-FR')} FCFA`} 
            accent="red" 
          />
          <StatCard 
            icon={CalendarDays} 
            label="Prochaine échéance" 
            value={data.nextDueAt ? new Date(data.nextDueAt).toLocaleDateString('fr-FR') : '—'} 
          />
        </div>

        {/* Outils de test (DEV uniquement) */}
        <TestPaymentTools
          contractId={id}
          contractData={data}
          onPaymentSuccess={async () => {
            await refetch()
          }}
        />

        {/* Échéances de paiement */}
        <div className="bg-white rounded-2xl shadow-lg shadow-blue-100/50 border border-gray-100 overflow-hidden">
          <div className="bg-gray-50 border-b border-gray-200 p-6">
            <div className="flex items-center gap-3">
              <Calendar className="h-6 w-6 text-gray-700" />
              <h2 className="text-xl font-bold text-gray-900">Échéances de paiement</h2>
            </div>
          </div>
          
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {payments.map((p: any) => {
                const statusConfig = getPaymentStatusConfig(p.status)
                const StatusIcon = statusConfig.icon
                const isSelected = selectedIdx === p.dueMonthIndex
                
                // Vérifier si ce mois est sélectionnable (seul le prochain mois à payer est cliquable)
                const isSelectable = p.status === 'DUE' && !isClosed && p.dueMonthIndex === nextDueMonthIndex
                
                // Déterminer les classes CSS selon le statut
                let cardClasses = 'border rounded-xl p-4 transition-all duration-200 '
                if (isSelectable || p.status === 'PAID') {
                  cardClasses += !isClosed ? 'cursor-pointer hover:shadow-md ' : 'cursor-default '
                } else {
                  cardClasses += 'cursor-default opacity-70 '
                }
                
                if (isSelected) {
                  cardClasses += 'border-[#234D65] bg-blue-50 ring-2 ring-[#234D65]/20 '
                } else if (p.status === 'PAID') {
                  cardClasses += 'border-green-200 bg-green-50 '
                } else if (isSelectable) {
                  cardClasses += 'border-blue-200 bg-blue-50 '
                } else {
                  cardClasses += 'border-gray-200 bg-gray-50 '
                }
                
                return (
                  <div 
                    key={p.id} 
                    className={cardClasses}
                    onClick={() => (isSelectable || p.status === 'PAID') && !isClosed ? handleMonthClick(p.dueMonthIndex, p) : null}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className={`${isSelectable ? 'bg-blue-600' : 'bg-[#234D65]'} text-white rounded-lg px-3 py-1 text-sm font-bold`}>
                          M{p.dueMonthIndex + 1}
                        </div>
                        {isSelected && (
                          <div className="bg-[#234D65] text-white rounded-full p-1">
                            <CheckCircle className="h-4 w-4" />
                          </div>
                        )}
                      </div>
                      <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium border ${statusConfig.bg} ${statusConfig.text} ${statusConfig.border}`}>
                        <StatusIcon className="h-3 w-3" />
                        {p.status === 'DUE' && p.dueMonthIndex !== nextDueMonthIndex ? 'À venir' : paymentStatusLabel(p.status)}
                      </span>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Accumulé:</span>
                        <span className="font-semibold">{(p.accumulatedAmount || 0).toLocaleString('fr-FR')} FCFA</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-gradient-to-r from-[#234D65] to-[#2c5a73] h-2 rounded-full transition-all duration-300"
                          style={{ width: `${Math.min(((p.accumulatedAmount || 0) / 100000) * 100, 100)}%` }}
                        ></div>
                      </div>
                      <div className="text-xs text-gray-500 text-center">
                        {((p.accumulatedAmount || 0) / 100000 * 100).toFixed(1)}% de l'objectif
                      </div>
                    </div>
                    
                    {!isClosed && (isSelectable || p.status === 'PAID') && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <div className="flex items-center gap-2 text-sm text-[#234D65] font-medium">
                          {isSelectable ? (
                            <span>Cliquez pour payer</span>
                          ) : p.status === 'PAID' ? (
                            <span>Cliquez pour voir la facture</span>
                          ) : null}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Modal de paiement */}
        <PaymentCSModal
          isOpen={showPaymentModal}
          onClose={() => {
            setShowPaymentModal(false)
            setSelectedIdx(null)
          }}
          onSubmit={handlePaymentSubmit}
          title={`Versement pour le mois M${(selectedIdx ?? 0) + 1}`}
          description="Enregistrer le versement mensuel"
          defaultAmount={100000}
        />

        {/* Modal de facture */}
        <PaymentInvoiceModal
          isOpen={showInvoiceModal}
          onClose={() => {
            setShowInvoiceModal(false)
            setSelectedPayment(null)
            setSelectedIdx(null)
          }}
          payment={selectedPayment}
          contractData={data}
        />

        {/* Section Remboursements */}
        <div className="bg-white rounded-2xl shadow-lg shadow-blue-100/50 border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-indigo-500 to-indigo-600 p-6">
            <div className="flex items-center gap-3">
              <RefreshCw className="h-6 w-6 text-white" />
              <h2 className="text-xl font-bold text-white">Remboursements</h2>
            </div>
          </div>
          
          <div className="p-6">
            {/* Boutons d'action */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
              <button 
                className="flex items-center justify-center gap-2 px-6 py-3 border border-indigo-300 text-indigo-700 rounded-xl hover:bg-indigo-50 transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed w-full" 
                disabled={isRefunding || !allPaid || hasFinalRefund} 
                onClick={() => {
                  setRefundType('FINAL')
                  setRefundReasonInput('')
                  setShowReasonModal(true)
                }}
              >
                <TrendingUp className="h-5 w-5" />
                Demander remboursement final
              </button>
              
              <button 
                className="flex items-center justify-center gap-2 px-6 py-3 border border-orange-300 text-orange-700 rounded-xl hover:bg-orange-50 transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed w-full" 
                disabled={isRefunding || !canEarly || hasEarlyRefund} 
                onClick={() => {
                  setRefundType('EARLY')
                  setRefundReasonInput('')
                  setShowReasonModal(true)
                }}
              >
                  <Download className="h-5 w-5" />
                Demander retrait anticipé
              </button>

              <button 
                className="flex items-center justify-center gap-2 px-6 py-3 border border-green-300 text-green-700 rounded-xl hover:bg-green-50 transition-all duration-200 font-medium w-full" 
                onClick={() => setShowRemboursementPdf(true)}
              >
                <FileText className="h-5 w-5" />
                PDF Remboursement
              </button>
            </div>
            
            {/* Liste des remboursements */}
            <div className="grid grid-cols-1 gap-6">
              {refunds.length === 0 ? (
                <div className="text-center py-12">
                  <div className="bg-gray-100 rounded-full p-6 w-24 h-24 mx-auto mb-4 flex items-center justify-center">
                    <RefreshCw className="h-12 w-12 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun remboursement</h3>
                  <p className="text-gray-600">Aucune demande de remboursement n'a été effectuée</p>
                </div>
              ) : (
                refunds.map((r: any) => {
                  const getRefundStatusConfig = (status: string) => {
                    switch (status) {
                      case 'PENDING':
                        return { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-200', icon: Clock }
                      case 'APPROVED':
                        return { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200', icon: CheckCircle }
                      case 'PAID':
                        return { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-200', icon: CheckCircle }
                      default:
                        return { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-200', icon: XCircle }
                    }
                  }

                  const statusConfig = getRefundStatusConfig(r.status)
                  const StatusIcon = statusConfig.icon

                  return (
                    <div key={r.id} className="border border-gray-200 rounded-xl p-6 hover:shadow-md transition-all duration-200">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="bg-indigo-100 rounded-lg p-2">
                            <RefreshCw className="h-5 w-5 text-indigo-600" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900">
                              {r.type === 'FINAL' ? 'Remboursement Final' : r.type === 'EARLY' ? 'Retrait Anticipé' : 'Remboursement par Défaut'}
                            </h3>
                            <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium border ${statusConfig.bg} ${statusConfig.text} ${statusConfig.border}`}>
                              <StatusIcon className="h-3 w-3" />
                              {r.status === 'PENDING' ? 'En attente' : r.status === 'APPROVED' ? 'Approuvé' : r.status === 'PAID' ? 'Payé' : 'Archivé'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-3 mb-4">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Montant nominal:</span>
                          <span className="font-semibold">{(r.amountNominal || 0).toLocaleString('fr-FR')} FCFA</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Bonus:</span>
                          <span className="font-semibold">{(r.amountBonus || 0).toLocaleString('fr-FR')} FCFA</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Échéance:</span>
                          <span className="font-semibold">{r.deadlineAt ? new Date(r.deadlineAt).toLocaleDateString('fr-FR') : '—'}</span>
                        </div>
                      </div>

                      {r.status === 'PENDING' && (
                        <div className="space-y-2">
                          {/* Première ligne : Approbation et Document de remboursement */}
                          <div className="flex flex-col sm:flex-row gap-2">
                            <button 
                              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                              onClick={() => setConfirmApproveId(r.id)}
                              disabled={(r.type === 'FINAL' && !r.document) || (r.type === 'EARLY' && !r.document)}
                            >
                              Approuver
                            </button>
                            {(r.type === 'FINAL' || r.type === 'EARLY') && (
                              <button 
                                className="flex-1 px-4 py-2 border border-green-300 text-green-600 rounded-lg hover:bg-green-50 transition-colors duration-200 font-medium flex items-center justify-center gap-2"
                                onClick={() => setShowRemboursementPdf(true)}
                              >
                                <FileText className="h-4 w-4" />
                                Document de remboursement
                              </button>
                            )}
                          </div>

                          {/* Deuxième ligne : Actions sur le PDF */}
                          {(r.type === 'FINAL' || r.type === 'EARLY') && (
                            <div className="flex flex-col sm:flex-row gap-2">
                              {r.document ? (
                                <>
                                  <button 
                                    className="flex-1 px-4 py-2 border border-green-300 text-green-600 rounded-lg hover:bg-green-50 transition-colors duration-200 font-medium flex items-center justify-center gap-2"
                                    onClick={() => handleViewDocument(r.id, r.document)}
                                  >
                                    <Eye className="h-4 w-4" />
                                    Voir PDF
                                  </button>
                                  <button 
                                    className="flex-1 px-4 py-2 border border-blue-300 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors duration-200 font-medium flex items-center justify-center gap-2"
                                    onClick={() => handleOpenPdfModal(r.id)}
                                  >
                                    <FileText className="h-4 w-4" />
                                    Remplacer PDF
                                  </button>
                                  <button 
                                    className="flex-1 px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors duration-200 font-medium flex items-center justify-center gap-2"
                                    onClick={() => setConfirmDeleteDocumentId(r.id)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                    Supprimer
                                  </button>
                                </>
                              ) : (
                                <button 
                                  className="flex-1 px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors duration-200 font-medium flex items-center justify-center gap-2"
                                  onClick={() => handleOpenPdfModal(r.id)}
                                >
                                  <FileText className="h-4 w-4" />
                                  Ajouter PDF
                                </button>
                              )}
                            </div>
                          )}

                          {/* Troisième ligne : Annulation (si applicable) */}
                          {r.type === 'EARLY' && !r.document && (
                            <button 
                              className="w-full px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors duration-200 font-medium"
                              onClick={async () => {
                                try { 
                                  await cancelEarlyRefund(id, r.id); 
                                  await refetch();
                                  await reloadRefunds(); // Rafraîchir la liste des remboursements
                                  toast.success('Demande anticipée annulée') 
                                } catch(e: any) { 
                                  toast.error(e?.message || 'Annulation impossible') 
                                }
                              }}
                            >
                              Annuler la demande
                            </button>
                          )}
                        </div>
                      )}

                      {r.status === 'APPROVED' && (
                        <div className="space-y-4">
                          {/* Affichage de la cause (non modifiable) */}
                          {r.reason && (
                            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                              <label className="block text-xs text-blue-700 font-medium mb-1">Cause du retrait:</label>
                              <p className="text-sm text-blue-900">{r.reason}</p>
                            </div>
                          )}
                            
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-3">
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Date du retrait *</label>
                                <input
                                  type="date"
                                  value={refundDate}
                                  onChange={(e) => setRefundDate(e.target.value)}
                                  className="w-full p-3 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#234D65]/20 focus:border-[#234D65] transition-all duration-200"
                                />
                              </div>
                              
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Heure du retrait *</label>
                                <input
                                  type="time"
                                  value={refundTime}
                                  onChange={(e) => setRefundTime(e.target.value)}
                                  className="w-full p-3 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#234D65]/20 focus:border-[#234D65] transition-all duration-200"
                                />
                              </div>
                            </div>
                          </div>
                          
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-2">Preuve du retrait *</label>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={async (e) => {
                                const f = e.target.files?.[0]
                                if (!f) {
                                  setRefundFile(undefined)
                                  return
                                }
                                if (!f.type.startsWith('image/')) {
                                  toast.error('La preuve doit être une image (JPG, PNG, WebP...)')
                                  setRefundFile(undefined)
                                  return
                                }
                                setRefundFile(f)
                                toast.success('Preuve PDF sélectionnée')
                              }}
                              className="w-full p-3 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#234D65]/20 focus:border-[#234D65] transition-all duration-200"
                            />
                          </div>
                          
                          <button 
                            className="w-full px-4 py-3 bg-gradient-to-r from-[#234D65] to-[#2c5a73] text-white rounded-lg hover:shadow-lg hover:shadow-[#234D65]/25 transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2" 
                            disabled={(() => {
                              const hasFile = !!refundFile
                              const hasDate = refundDate || r.withdrawalDate
                              const hasTime = (refundTime && refundTime.trim()) || (r.withdrawalTime && r.withdrawalTime.trim() && r.withdrawalTime !== '--:--')
                              return !hasFile || !hasDate || !hasTime
                            })()}
                            onClick={async () => { 
                              try {
                                const normalizeDate = (dateValue: any): string | null => {
                                  if (!dateValue) return null
                                  try {
                                    let date: Date
                                    if (dateValue && typeof dateValue.toDate === 'function') {
                                      date = dateValue.toDate()
                                    } else if (dateValue instanceof Date) {
                                      date = dateValue
                                    } else if (typeof dateValue === 'string') {
                                      date = new Date(dateValue)
                                    } else {
                                      date = new Date(dateValue)
                                    }
                                    return isNaN(date.getTime()) ? null : date.toISOString().split('T')[0]
                                  } catch {
                                    return null
                                  }
                                }
                                
                                await markRefundPaid(id, r.id, refundFile, {
                                  reason: r.reason,
                                  withdrawalDate: refundDate || normalizeDate(r.withdrawalDate) || undefined,
                                  withdrawalTime: refundTime || r.withdrawalTime
                                })
                                setRefundDate('')
                                setRefundTime('')
                                setRefundFile(undefined)
                                setConfirmPaidId(null)
                                await refetch()
                                await reloadRefunds() // Rafraîchir la liste des remboursements
                                toast.success('Remboursement marqué payé')
                              } catch (error: any) {
                                toast.error(error?.message || 'Erreur lors du marquage')
                              }
                            }}
                          >
                            <CheckCircle className="h-5 w-5" />
                            Marquer comme payé
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>

        {/* Modales de confirmation */}
        {/* Modale de saisie de la cause du retrait */}
        {showReasonModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
              <div className="bg-blue-50 border-b border-blue-100 p-6">
                <div className="flex items-center gap-3">
                  <div className="bg-blue-100 rounded-full p-2">
                    <FileText className="h-6 w-6 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-bold text-blue-900">
                    {refundType === 'FINAL' ? 'Demande de remboursement final' : 'Demande de retrait anticipé'}
                  </h3>
                </div>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Cause du retrait *</label>
                    <textarea
                      placeholder="Expliquez la raison du retrait..."
                      className="w-full resize-none rounded-lg border border-gray-300 p-3 text-sm focus:ring-2 focus:ring-[#234D65]/20 focus:border-[#234D65]"
                      rows={4}
                      value={refundReasonInput}
                      onChange={(e) => setRefundReasonInput(e.target.value)}
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Cette information sera incluse dans le document de remboursement
                    </p>
                  </div>
                </div>
                <div className="flex gap-3 mt-6">
                  <button 
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition-all duration-200 font-medium"
                    onClick={() => {
                      setShowReasonModal(false)
                      setRefundType(null)
                      setRefundReasonInput('')
                    }}
                  >
                    Annuler
                  </button>
                  <button 
                    className="flex-1 px-4 py-3 bg-gradient-to-r from-[#234D65] to-[#2c5a73] text-white rounded-xl hover:shadow-lg transition-all duration-200 font-medium disabled:opacity-50"
                    disabled={!refundReasonInput.trim() || isRefunding}
                    onClick={async () => {
                      try {
                        setIsRefunding(true)
                        
                        if (refundType === 'FINAL') {
                          await requestFinalRefund(id, refundReasonInput)
                          toast.success('Remboursement final demandé')
                        } else {
                          await requestEarlyRefund(id, { reason: refundReasonInput })
                          toast.success('Retrait anticipé demandé')
                        }

                        await refetch()
                        await reloadRefunds() // Rafraîchir la liste des remboursements
                        
                        setShowReasonModal(false)
                        setRefundType(null)
                        setRefundReasonInput('')
                        
                        // Afficher le PDF de remboursement
                        setShowRemboursementPdf(true)
                      } catch (e: any) {
                        toast.error(e?.message || 'Action impossible')
                      } finally {
                        setIsRefunding(false)
                      }
                    }}
                  >
                    {isRefunding ? 'Traitement...' : 'Confirmer et voir le PDF'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {confirmApproveId && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
              <div className="bg-green-50 border-b border-green-100 p-6">
                <div className="flex items-center gap-3">
                  <div className="bg-green-100 rounded-full p-2">
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  </div>
                  <h3 className="text-lg font-bold text-green-900">Confirmer l'approbation</h3>
                </div>
              </div>
              <div className="p-6">
                <p className="text-gray-600 mb-6">Voulez-vous approuver ce remboursement ? Cette action permettra de procéder au paiement.</p>
                <div className="flex gap-3">
                  <button 
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition-all duration-200 font-medium" 
                    onClick={() => setConfirmApproveId(null)}
                  >
                    Annuler
                  </button>
                  <button 
                    className="flex-1 px-4 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-all duration-200 font-medium"
                    onClick={async () => {
                      await approveRefund(id, confirmApproveId); 
                      setConfirmApproveId(null); 
                      await refetch();
                      await reloadRefunds(); // Rafraîchir la liste des remboursements
                      toast.success('Remboursement approuvé')
                    }}
                  >
                    Confirmer
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}


        {/* Modal PDF Document */}
        {currentRefund && (
          <PdfDocumentModal
            isOpen={showPdfModal}
            onClose={() => setShowPdfModal(false)}
            onDocumentUploaded={handlePdfUpload}
            contractId={id}
            refundId={currentRefundId || ""}
            existingDocument={currentRefund.document}
            title={currentRefund.type === 'FINAL' ? 'Document de Remboursement Final' : 'Document de Retrait Anticipé'}
            description={currentRefund.type === 'FINAL' ? 'Téléchargez le document PDF à remplir, puis téléversez-le une fois complété pour pouvoir approuver le remboursement final.' : 'Téléchargez le document PDF à remplir, puis téléversez-le une fois complété pour pouvoir approuver le retrait anticipé.'}
            documentType={currentRefund.type === 'FINAL' ? 'FINAL_REFUND_CS' : 'EARLY_REFUND_CS'}
            memberId={documentMemberId}
            documentLabel={`${currentRefund.type === 'FINAL' ? 'Remboursement final' : 'Retrait anticipé'} - Contrat ${id}`}
          />
        )}

        {/* Modal PDF Viewer */}
        {currentDocument && (
          <PdfViewerModal
            isOpen={showPdfViewer}
            onClose={() => setShowPdfViewer(false)}
            document={currentDocument}
            title={currentRefundId ? (refunds.find((r: any) => r.id === currentRefundId)?.type === 'FINAL' ? 'Document de Remboursement Final' : 'Document de Retrait Anticipé') : 'Document de Remboursement'}
          />
        )}

        {/* Modal de confirmation de suppression */}
        {confirmDeleteDocumentId && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
              <div className="bg-red-50 border-b border-red-100 p-6">
                <div className="flex items-center gap-3">
                  <div className="bg-red-100 rounded-full p-2">
                    <Trash2 className="h-6 w-6 text-red-600" />
                  </div>
                  <h3 className="text-lg font-bold text-red-900">Confirmer la suppression</h3>
                </div>
              </div>
              <div className="p-6">
                <p className="text-gray-600 mb-6">
                  Voulez-vous vraiment supprimer ce document PDF ? Cette action est irréversible.
                </p>
                <div className="flex gap-3">
                  <button 
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition-all duration-200 font-medium" 
                    onClick={() => setConfirmDeleteDocumentId(null)}
                  >
                    Annuler
                  </button>
                  <button 
                    className="flex-1 px-4 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-all duration-200 font-medium"
                    onClick={() => handleDeleteDocument(confirmDeleteDocumentId)}
                  >
                    Supprimer
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal PDF Remboursement */}
        <RemboursementNormalPDFModal
          isOpen={showRemboursementPdf}
          onClose={() => setShowRemboursementPdf(false)}
          contractId={id}
          contractData={data}
        />
      </div>
    </div>
  )
}