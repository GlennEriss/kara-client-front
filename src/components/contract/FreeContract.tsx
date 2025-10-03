"use client"

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import routes from '@/constantes/routes'
import { useCaisseContract } from '@/hooks/useCaisseContracts'
import { useActiveCaisseSettingsByType } from '@/hooks/useCaisseSettings'
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
  Building2
} from 'lucide-react'
import PdfDocumentModal from './PdfDocumentModal'
import PdfViewerModal from './PdfViewerModal'
import RemboursementNormalPDFModal from './RemboursementNormalPDFModal'
import type { RefundDocument } from '@/types/types'

type Props = { id: string }

export default function FreeContract({ id }: Props) {
  const { data, isLoading, isError, error, refetch } = useCaisseContract(id)
  

  const [amount, setAmount] = useState<number>(0)
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null)
  const [file, setFile] = useState<File | undefined>()
  const [isPaying, setIsPaying] = useState(false)
  const [paymentDate, setPaymentDate] = useState(() => {
    return new Date().toISOString().split('T')[0]
  })
  const [paymentTime, setPaymentTime] = useState(() => {
    const now = new Date()
    return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
  })
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('airtel_money')
  const [fileInputResetKey, setFileInputResetKey] = useState(0)
  const [isRefunding, setIsRefunding] = useState(false)
  const [refundFile, setRefundFile] = useState<File | undefined>()
  const [refundReason, setRefundReason] = useState('')
  const [refundDate, setRefundDate] = useState(() => {
    return new Date().toISOString().split('T')[0]
  })
  const [refundTime, setRefundTime] = useState(() => {
    const now = new Date()
    return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
  })
  const [confirmApproveId, setConfirmApproveId] = useState<string | null>(null)
  const [confirmPaidId, setConfirmPaidId] = useState<string | null>(null)
  const [confirmFinal, setConfirmFinal] = useState(false)
  const [showPdfModal, setShowPdfModal] = useState(false)
  const [showPdfViewer, setShowPdfViewer] = useState(false)
  const [showRemboursementPdf, setShowRemboursementPdf] = useState(false)
  const [currentRefundId, setCurrentRefundId] = useState<string | null>(null)
  const [currentDocument, setCurrentDocument] = useState<RefundDocument | null>(null)
  const [refunds, setRefunds] = useState<any[]>([])

  // Load refunds from subcollection
  useEffect(() => {
    const loadRefunds = async () => {
      if (id) {
        try {
          const refundsData = await listRefunds(id)
          setRefunds(refundsData)
        } catch (error) {
          console.error('Error loading refunds:', error)
        }
      }
    }
    loadRefunds()
  }, [id])

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

  const isClosed = data.status === 'CLOSED'
  const settings = useActiveCaisseSettingsByType((data as any).caisseType)

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

  const handlePdfUpload = (document: RefundDocument) => {
    // Le document est maintenant persisté dans la base de données
    // On peut fermer le modal et rafraîchir les données
    setShowPdfModal(false)
    refetch()
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

  const onPay = async () => {
    if (isClosed) { toast.error('Contrat clos: paiement impossible.'); return }
    if (selectedIdx === null) { toast.error('Choisissez un mois.'); return }
    if (!file) { toast.error('Téléversez une preuve.'); return }
    if (!amount || amount <= 0) { toast.error('Saisissez un montant.'); return }
    if (!paymentDate) { toast.error('Veuillez sélectionner la date de paiement.'); return }
    if (!paymentTime) { toast.error('Veuillez sélectionner l\'heure de paiement.'); return }
    if (!paymentMode) { toast.error('Veuillez sélectionner le mode de paiement.'); return }
    
    try {
      setIsPaying(true)
      await pay({ 
        contractId: id, 
        dueMonthIndex: selectedIdx, 
        memberId: data.memberId, 
        amount, 
        file,
        paidAt: new Date(`${paymentDate}T${paymentTime}`),
        time: paymentTime,
        mode: paymentMode
      })
      await refetch()
      toast.success('Contribution enregistrée')
      
      setAmount(0)
      setSelectedIdx(null)
      setFile(undefined)
      setPaymentDate(new Date().toISOString().split('T')[0])
      setPaymentTime(() => {
        const now = new Date()
        return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
      })
      setPaymentMode('airtel_money')
      setFileInputResetKey(prev => prev + 1)
      
    } finally { 
      setIsPaying(false) 
    }
  }

  const payments = data.payments || []
  const paidCount = payments.filter((x: any) => x.status === 'PAID').length
  const allPaid = payments.length > 0 && paidCount === payments.length
  const canEarly = paidCount >= 1 && !allPaid
  const hasFinalRefund = refunds.some((r: any) => r.type === 'FINAL' && r.status !== 'ARCHIVED') || data.status === 'FINAL_REFUND_PENDING' || data.status === 'CLOSED'
  const hasEarlyRefund = refunds.some((r: any) => r.type === 'EARLY' && r.status !== 'ARCHIVED') || data.status === 'EARLY_REFUND_PENDING'

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 md:p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* En-tête du contrat */}
        <div className="bg-white rounded-2xl shadow-lg shadow-blue-100/50 border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-[#234D65] to-[#2c5a73] p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="bg-white/20 rounded-lg p-3">
                  <FileText className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold text-white">Contrat Libre</h1>
                  <p className="text-blue-100">#{id}</p>
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
                
                return (
                  <div 
                    key={p.id} 
                    className={`border rounded-xl p-4 transition-all duration-200 cursor-pointer hover:shadow-md ${
                      isSelected 
                        ? 'border-[#234D65] bg-blue-50 ring-2 ring-[#234D65]/20' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => p.status === 'DUE' && !isClosed ? setSelectedIdx(p.dueMonthIndex) : null}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="bg-[#234D65] text-white rounded-lg px-3 py-1 text-sm font-bold">
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
                        {paymentStatusLabel(p.status)}
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
                    
                    {p.status === 'DUE' && !isClosed && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <div className="flex items-center gap-2 text-sm text-[#234D65] font-medium">
                          <input 
                            type="radio" 
                            name="m" 
                            checked={isSelected}
                            onChange={() => setSelectedIdx(p.dueMonthIndex)}
                            className="text-[#234D65] focus:ring-[#234D65]"
                          />
                          <span>Sélectionner pour paiement</span>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Formulaire de paiement */}
        <div className="bg-white rounded-2xl shadow-lg shadow-blue-100/50 border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-green-500 to-green-600 p-6">
            <div className="flex items-center gap-3">
              <CreditCard className="h-6 w-6 text-white" />
              <h2 className="text-xl font-bold text-white">Effectuer un versement</h2>
            </div>
          </div>
          
          <div className="p-6">
            {selectedIdx !== null ? (
              <div className="space-y-6">
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="bg-blue-100 rounded-lg p-2">
                      <Calendar className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-blue-900">Mois sélectionné</h3>
                      <p className="text-blue-700">M{selectedIdx + 1}</p>
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Informations de paiement */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                      <DollarSign className="h-5 w-5" />
                      Informations de paiement
                    </h3>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Montant du versement *</label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input 
                          type="number" 
                          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#234D65]/20 focus:border-[#234D65] transition-all duration-200" 
                          value={amount} 
                          onChange={(e) => setAmount(Number(e.target.value))} 
                          disabled={isClosed}
                          placeholder="100000"
                          min="100000"
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-1">Minimum: 100 000 FCFA</p>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Date de paiement *</label>
                        <div className="relative">
                          <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                          <input
                            type="date"
                            value={paymentDate}
                            onChange={(e) => setPaymentDate(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#234D65]/20 focus:border-[#234D65] transition-all duration-200"
                          />
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Heure de paiement *</label>
                        <div className="relative">
                          <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                          <input
                            type="time"
                            value={paymentTime}
                            onChange={(e) => setPaymentTime(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#234D65]/20 focus:border-[#234D65] transition-all duration-200"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Mode de paiement */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                      <Smartphone className="h-5 w-5" />
                      Mode de paiement
                    </h3>
                    
                    <div className="space-y-3">
                      <label className="relative flex items-center p-4 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors duration-200">
                        <input
                          type="radio"
                          name="paymentMode"
                          value="airtel_money"
                          checked={paymentMode === 'airtel_money'}
                          onChange={(e) => setPaymentMode(e.target.value as PaymentMode)}
                          className="text-[#234D65] focus:ring-[#234D65]"
                        />
                        <div className="ml-3 flex items-center gap-3">
                          <div className="bg-red-100 rounded-lg p-2">
                            <Smartphone className="h-5 w-5 text-red-600" />
                          </div>
                          <span className="font-medium text-gray-900">Airtel Money</span>
                        </div>
                      </label>
                      
                      <label className="relative flex items-center p-4 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors duration-200">
                        <input
                          type="radio"
                          name="paymentMode"
                          value="mobicash"
                          checked={paymentMode === 'mobicash'}
                          onChange={(e) => setPaymentMode(e.target.value as PaymentMode)}
                          className="text-[#234D65] focus:ring-[#234D65]"
                        />
                        <div className="ml-3 flex items-center gap-3">
                          <div className="bg-blue-100 rounded-lg p-2">
                            <Banknote className="h-5 w-5 text-blue-600" />
                          </div>
                          <span className="font-medium text-gray-900">Mobicash</span>
                        </div>
                      </label>

                      <label className="relative flex items-center p-4 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors duration-200">
                        <input
                          type="radio"
                          name="paymentMode"
                          value="cash"
                          checked={paymentMode === 'cash'}
                          onChange={(e) => setPaymentMode(e.target.value as PaymentMode)}
                          className="text-[#234D65] focus:ring-[#234D65]"
                        />
                        <div className="ml-3 flex items-center gap-3">
                          <div className="bg-green-100 rounded-lg p-2">
                            <DollarSign className="h-5 w-5 text-green-600" />
                          </div>
                          <span className="font-medium text-gray-900">Espèce</span>
                        </div>
                      </label>

                      <label className="relative flex items-center p-4 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors duration-200">
                        <input
                          type="radio"
                          name="paymentMode"
                          value="bank_transfer"
                          checked={paymentMode === 'bank_transfer'}
                          onChange={(e) => setPaymentMode(e.target.value as PaymentMode)}
                          className="text-[#234D65] focus:ring-[#234D65]"
                        />
                        <div className="ml-3 flex items-center gap-3">
                          <div className="bg-purple-100 rounded-lg p-2">
                            <Building2 className="h-5 w-5 text-purple-600" />
                          </div>
                          <span className="font-medium text-gray-900">Virement bancaire</span>
                        </div>
                      </label>
                    </div>
                  </div>
                </div>
                
                {/* Preuve de paiement */}
                <div>
                  <FileInput
                    accept="image/*"
                    maxSize={5}
                    onFileSelect={async (selectedFile) => {
                      if (!selectedFile) { 
                        setFile(undefined); 
                        return 
                      }
                      
                      try {
                        const dataUrl = await compressImage(selectedFile, IMAGE_COMPRESSION_PRESETS.document)
                        const res = await fetch(dataUrl)
                        const blob = await res.blob()
                        const webpFile = new File([blob], 'proof.webp', { type: 'image/webp' })
                        setFile(webpFile)
                        toast.success('Preuve compressée (WebP) prête')
                      } catch (err) {
                        console.error(err)
                        toast.error('Échec de la compression de l\'image')
                        setFile(undefined)
                      }
                    }}
                    disabled={isClosed}
                    label="Preuve de paiement *"
                    placeholder="Glissez-déposez une image ou cliquez pour parcourir"
                    currentFile={file}
                    resetKey={fileInputResetKey}
                    className="w-full"
                  />
                </div>
                
                {/* Bouton de paiement */}
                <div className="border-t border-gray-200 pt-6">
                  <button 
                    className="w-full md:w-auto mx-auto flex items-center justify-center gap-3 px-8 py-4 bg-gradient-to-r from-green-500 to-green-600 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-green-500/25 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={isPaying || !file || selectedIdx === null || !amount || amount < 100000 || !paymentDate || !paymentTime || !paymentMode || isClosed}
                    onClick={onPay}
                  >
                    {isPaying ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Paiement en cours...
                      </>
                    ) : (
                      <>
                        <Receipt className="h-5 w-5" />
                        Effectuer le versement M{selectedIdx + 1}
                        <ArrowRight className="h-5 w-5" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="bg-gray-100 rounded-full p-6 w-24 h-24 mx-auto mb-4 flex items-center justify-center">
                  <Calendar className="h-12 w-12 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Sélectionnez un mois</h3>
                <p className="text-gray-600">Choisissez une échéance dans la liste ci-dessus pour effectuer un paiement</p>
              </div>
            )}
          </div>
        </div>

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
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
              <button 
                className="flex items-center justify-center gap-2 px-6 py-3 border border-indigo-300 text-indigo-700 rounded-xl hover:bg-indigo-50 transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed" 
                disabled={isRefunding || !allPaid || hasFinalRefund} 
                onClick={() => setConfirmFinal(true)}
              >
                <TrendingUp className="h-5 w-5" />
                Demander remboursement final
              </button>
              
              <button 
                className="flex items-center justify-center gap-2 px-6 py-3 border border-orange-300 text-orange-700 rounded-xl hover:bg-orange-50 transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed" 
                disabled={isRefunding || !canEarly || hasEarlyRefund} 
                onClick={async () => {
                  try { 
                    setIsRefunding(true); 
                    await requestEarlyRefund(id); 
                    await refetch(); 
                    toast.success('Retrait anticipé demandé'); 
                  } catch(e: any) { 
                    toast.error(e?.message || 'Action impossible') 
                  } finally { 
                    setIsRefunding(false)
                  }
                }}
              >
                {isRefunding ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Download className="h-5 w-5" />
                )}
                Demander retrait anticipé
              </button>

              <button 
                className="flex items-center justify-center gap-2 px-6 py-3 border border-green-300 text-green-700 rounded-xl hover:bg-green-50 transition-all duration-200 font-medium" 
                onClick={() => setShowRemboursementPdf(true)}
              >
                <FileText className="h-5 w-5" />
                PDF Remboursement
              </button>
            </div>
            
            {/* Liste des remboursements */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {refunds.length === 0 ? (
                <div className="lg:col-span-2 text-center py-12">
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
                        <div className="flex flex-col sm:flex-row gap-2">
                          <button 
                            className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                            onClick={() => setConfirmApproveId(r.id)}
                            disabled={(r.type === 'FINAL' && !r.document) || (r.type === 'EARLY' && !r.document)}
                          >
                            Approuver
                          </button>
                          {(r.type === 'FINAL' || r.type === 'EARLY') && (
                            <>
                              <button 
                                className="flex-1 px-4 py-2 border border-green-300 text-green-600 rounded-lg hover:bg-green-50 transition-colors duration-200 font-medium flex items-center justify-center gap-2"
                                onClick={() => setShowRemboursementPdf(true)}
                              >
                                <FileText className="h-4 w-4" />
                                Document de remboursement
                              </button>
                              {r.document ? (
                                <button 
                                  className="flex-1 px-4 py-2 border border-green-300 text-green-600 rounded-lg hover:bg-green-50 transition-colors duration-200 font-medium flex items-center justify-center gap-2"
                                  onClick={() => handleViewDocument(r.id, r.document)}
                                >
                                  <Eye className="h-4 w-4" />
                                  Voir PDF
                                </button>
                              ) : (
                                <button 
                                  className="flex-1 px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors duration-200 font-medium flex items-center justify-center gap-2"
                                  onClick={() => handleOpenPdfModal(r.id)}
                                >
                                  <FileText className="h-4 w-4" />
                                  Ajouter PDF
                                </button>
                              )}
                            </>
                          )}
                          {r.type === 'EARLY' && !r.document && (
                            <button 
                              className="flex-1 px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors duration-200 font-medium"
                              onClick={async () => {
                                try { 
                                  await cancelEarlyRefund(id, r.id); 
                                  await refetch(); 
                                  toast.success('Demande anticipée annulée') 
                                } catch(e: any) { 
                                  toast.error(e?.message || 'Annulation impossible') 
                                }
                              }}
                            >
                              Annuler
                            </button>
                          )}
                        </div>
                      )}

                      {r.status === 'APPROVED' && (
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">Cause du retrait *</label>
                              <textarea
                                placeholder="Raison du retrait..."
                                className="w-full p-3 text-sm border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-[#234D65]/20 focus:border-[#234D65] transition-all duration-200"
                                rows={3}
                                value={refundReason || r.reason || ''}
                                onChange={(e) => setRefundReason(e.target.value)}
                              />
                            </div>
                            
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
                              accept="application/pdf"
                              onChange={async (e) => {
                                const f = e.target.files?.[0]
                                if (!f) { setRefundFile(undefined); return }
                                if (f.type !== 'application/pdf') { toast.error('La preuve doit être un fichier PDF'); setRefundFile(undefined); return }
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
                              const hasReason = (refundReason && refundReason.trim()) || (r.reason && r.reason.trim())
                              const hasDate = refundDate || r.withdrawalDate
                              const hasTime = (refundTime && refundTime.trim()) || (r.withdrawalTime && r.withdrawalTime.trim() && r.withdrawalTime !== '--:--')
                              return !hasFile || !hasReason || !hasDate || !hasTime
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
                                  reason: refundReason || r.reason,
                                  withdrawalDate: refundDate || normalizeDate(r.withdrawalDate) || undefined,
                                  withdrawalTime: refundTime || r.withdrawalTime
                                })
                                setRefundReason('')
                                setRefundDate('')
                                setRefundTime('')
                                setRefundFile(undefined)
                                setConfirmPaidId(null)
                                await refetch()
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

        {confirmFinal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
              <div className="bg-blue-50 border-b border-blue-100 p-6">
                <div className="flex items-center gap-3">
                  <div className="bg-blue-100 rounded-full p-2">
                    <TrendingUp className="h-6 w-6 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-bold text-blue-900">Confirmer la demande</h3>
                </div>
              </div>
              <div className="p-6">
                <p className="text-gray-600 mb-6">
                  Voulez-vous demander le remboursement final ? Toutes les échéances doivent être payées. Cette action est irréversible.
                </p>
                <div className="flex gap-3">
                  <button 
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition-all duration-200 font-medium" 
                    onClick={() => setConfirmFinal(false)} 
                    disabled={isRefunding}
                  >
                    Annuler
                  </button>
                  <button 
                    className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all duration-200 font-medium flex items-center justify-center gap-2" 
                    onClick={async () => {
                      try { 
                        setIsRefunding(true); 
                        await requestFinalRefund(id); 
                        await refetch(); 
                        toast.success('Remboursement final demandé'); 
                      } catch(e: any) { 
                        toast.error(e?.message || 'Action impossible') 
                      } finally { 
                        setIsRefunding(false); 
                        setConfirmFinal(false)
                      }
                    }}
                    disabled={isRefunding}
                  >
                    {isRefunding ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle className="h-4 w-4" />
                    )}
                    Confirmer
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal PDF Document */}
        <PdfDocumentModal
          isOpen={showPdfModal}
          onClose={() => setShowPdfModal(false)}
          onDocumentUploaded={handlePdfUpload}
          contractId={id}
          refundId={currentRefundId || ""}
          existingDocument={currentRefundId ? refunds.find((r: any) => r.id === currentRefundId)?.document : undefined}
          title={currentRefundId ? (refunds.find((r: any) => r.id === currentRefundId)?.type === 'FINAL' ? 'Document de Remboursement Final' : 'Document de Retrait Anticipé') : 'Document de Remboursement'}
          description={currentRefundId ? (refunds.find((r: any) => r.id === currentRefundId)?.type === 'FINAL' ? 'Téléchargez le document PDF à remplir, puis téléversez-le une fois complété pour pouvoir approuver le remboursement final.' : 'Téléchargez le document PDF à remplir, puis téléversez-le une fois complété pour pouvoir approuver le retrait anticipé.') : 'Téléchargez le document PDF à remplir, puis téléversez-le une fois complété pour pouvoir approuver le remboursement.'}
        />

        {/* Modal PDF Viewer */}
        {currentDocument && (
          <PdfViewerModal
            isOpen={showPdfViewer}
            onClose={() => setShowPdfViewer(false)}
            document={currentDocument}
            title={currentRefundId ? (refunds.find((r: any) => r.id === currentRefundId)?.type === 'FINAL' ? 'Document de Remboursement Final' : 'Document de Retrait Anticipé') : 'Document de Remboursement'}
          />
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