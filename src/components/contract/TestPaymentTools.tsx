'use client'

import React, { useState } from 'react'
import { toast } from 'sonner'
import { AlertTriangle, Zap, Clock, CheckCircle } from 'lucide-react'
import { pay } from '@/services/caisse/mutations'

interface TestPaymentToolsProps {
  contractId: string
  contractData: any
  onPaymentSuccess: () => void
}

const TestPaymentTools: React.FC<TestPaymentToolsProps> = ({
  contractId,
  contractData,
  onPaymentSuccess
}) => {
  const [isProcessing, setIsProcessing] = useState(false)

  // Fonction pour obtenir une image aléatoire du dossier public
  const getRandomProofImage = async (): Promise<File> => {
    const images = [
      '/Logo-Kara.jpg',
      '/Logo-Kara.webp',
      '/imgkara.webp',
      '/og-image-800x600.jpg',
      '/og-image-1200x630.jpg'
    ]
    
    const randomImage = images[Math.floor(Math.random() * images.length)]
    const response = await fetch(randomImage)
    const blob = await response.blob()
    const file = new File([blob], 'test-proof.jpg', { type: 'image/jpeg' })
    return file
  }

  // Fonction pour trouver la prochaine échéance à payer
  const getNextDuePayment = () => {
    const payments = contractData.payments || []
    const sortedPayments = [...payments].sort((a, b) => a.dueMonthIndex - b.dueMonthIndex)
    return sortedPayments.find((p: any) => p.status === 'DUE')
  }

  // Fonction pour effectuer un paiement de test
  const makeTestPayment = async (delayDays: number) => {
    const nextPayment = getNextDuePayment()
    
    if (!nextPayment) {
      toast.error('Aucune échéance à payer')
      return
    }

    try {
      setIsProcessing(true)

      // Calculer la date de paiement
      let paymentDate: Date
      
      if (delayDays === 0) {
        // Paiement à l'heure
        if (contractData.nextDueAt) {
          // Utiliser exactement la date d'échéance
          paymentDate = new Date(contractData.nextDueAt)
        } else {
          // Premier versement : utiliser la date du jour
          paymentDate = new Date()
        }
      } else {
        // Paiement en retard : nextDueAt + X jours
        if (!contractData.nextDueAt) {
          // Pour le premier versement, utiliser contractStartAt + delayDays
          if (contractData.contractStartAt) {
            paymentDate = new Date(contractData.contractStartAt)
            paymentDate.setDate(paymentDate.getDate() + delayDays)
          } else {
            toast.error('Impossible de simuler un retard sans date d\'échéance ou de début')
            return
          }
        } else {
          paymentDate = new Date(contractData.nextDueAt)
          paymentDate.setDate(paymentDate.getDate() + delayDays)
        }
      }

      // Heure aléatoire entre 8h et 18h
      const randomHour = 8 + Math.floor(Math.random() * 10)
      const randomMinute = Math.floor(Math.random() * 60)
      const paymentTime = `${randomHour.toString().padStart(2, '0')}:${randomMinute.toString().padStart(2, '0')}`

      // Mode de paiement aléatoire
      const paymentModes = ['airtel_money', 'mobicash', 'cash', 'bank_transfer'] as const
      const randomMode = paymentModes[Math.floor(Math.random() * paymentModes.length)]

      // Récupérer une image aléatoire comme preuve
      const proofFile = await getRandomProofImage()

      // Effectuer le paiement
      await pay({
        contractId,
        dueMonthIndex: nextPayment.dueMonthIndex,
        memberId: contractData.memberId,
        amount: contractData.monthlyAmount,
        file: proofFile,
        paidAt: paymentDate,
        time: paymentTime,
        mode: randomMode
      })

      // Calculer les pénalités pour l'affichage
      let penaltyInfo = ''
      if (delayDays >= 4) {
        // Récupérer les paramètres de pénalité
        try {
          const { getActiveSettings } = await import('@/db/caisse/settings.db')
          const settings = await getActiveSettings(contractData.caisseType)
          if (settings?.penaltyRules?.day4To12?.perDay) {
            const penaltyRate = settings.penaltyRules.day4To12.perDay / 100
            const penalty = penaltyRate * contractData.monthlyAmount * delayDays
            penaltyInfo = ` (Pénalité: ${penalty.toLocaleString('fr-FR')} FCFA)`
          }
        } catch (error) {
          console.error('Erreur lors du calcul des pénalités:', error)
        }
      }

      const delayLabel = 
        delayDays === 0 ? 'à l\'heure' :
        delayDays <= 3 ? `en retard (J+${delayDays}) - Tolérance` :
        delayDays <= 12 ? `en retard avec pénalité (J+${delayDays})${penaltyInfo}` :
        `en retard défaut (J+${delayDays})`

      toast.success(`Paiement test effectué ${delayLabel}`)
      onPaymentSuccess()
    } catch (error: any) {
      toast.error(error?.message || 'Erreur lors du paiement test')
    } finally {
      setIsProcessing(false)
    }
  }

  // Ne rien afficher en production
  if (process.env.NODE_ENV !== 'development') {
    return null
  }

  // Ne rien afficher si le contrat est clos ou résilié
  if (contractData.status === 'CLOSED' || contractData.status === 'RESCINDED') {
    return null
  }

  const nextPayment = getNextDuePayment()

  if (!nextPayment) {
    return null
  }

  return (
    <div className="bg-yellow-50 border-2 border-yellow-400 rounded-xl p-4 mt-6">
      <div className="flex items-center gap-2 mb-4">
        <Zap className="h-5 w-5 text-yellow-600" />
        <h3 className="font-bold text-yellow-900">Outils de Test - Paiements</h3>
        <span className="text-xs bg-yellow-200 text-yellow-800 px-2 py-1 rounded-full">DEV UNIQUEMENT</span>
      </div>

      <p className="text-sm text-yellow-800 mb-4">
        Prochaine échéance: <strong>M{nextPayment.dueMonthIndex + 1}</strong> - 
        Date limite: <strong>{contractData.nextDueAt ? new Date(contractData.nextDueAt).toLocaleDateString('fr-FR') : 'N/A'}</strong>
      </p>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        {/* Paiement à l'heure */}
        <button
          onClick={() => makeTestPayment(0)}
          disabled={isProcessing}
          className="flex flex-col items-center gap-2 p-3 bg-green-100 border border-green-300 rounded-lg hover:bg-green-200 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <CheckCircle className="h-5 w-5 text-green-700" />
          <span className="text-xs font-medium text-green-900">À l'heure (J)</span>
        </button>

        {/* Retard 1-3 jours */}
        <button
          onClick={() => makeTestPayment(1 + Math.floor(Math.random() * 3))}
          disabled={isProcessing}
          className="flex flex-col items-center gap-2 p-3 bg-yellow-100 border border-yellow-300 rounded-lg hover:bg-yellow-200 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Clock className="h-5 w-5 text-yellow-700" />
          <span className="text-xs font-medium text-yellow-900">Retard J+1-3</span>
        </button>

        {/* Retard 4-12 jours */}
        <button
          onClick={() => makeTestPayment(4 + Math.floor(Math.random() * 9))}
          disabled={isProcessing}
          className="flex flex-col items-center gap-2 p-3 bg-orange-100 border border-orange-300 rounded-lg hover:bg-orange-200 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <AlertTriangle className="h-5 w-5 text-orange-700" />
          <span className="text-xs font-medium text-orange-900">Retard J+4-12</span>
        </button>

        {/* Retard >12 jours */}
        <button
          onClick={() => makeTestPayment(13 + Math.floor(Math.random() * 10))}
          disabled={isProcessing}
          className="flex flex-col items-center gap-2 p-3 bg-red-100 border border-red-300 rounded-lg hover:bg-red-200 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <AlertTriangle className="h-5 w-5 text-red-700" />
          <span className="text-xs font-medium text-red-900">Retard J+12+</span>
        </button>
      </div>

      {isProcessing && (
        <div className="mt-3 flex items-center gap-2 text-sm text-yellow-700">
          <div className="w-4 h-4 animate-spin rounded-full border-2 border-yellow-600 border-t-transparent"></div>
          <span>Paiement en cours...</span>
        </div>
      )}
    </div>
  )
}

export default TestPaymentTools

