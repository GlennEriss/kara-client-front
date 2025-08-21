"use client"

import React, { useState, useMemo, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useCaisseContract } from '@/hooks/useCaisseContracts'
import { useActiveCaisseSettingsByType } from '@/hooks/useCaisseSettings'
import { useGroupMembers } from '@/hooks/useMembers'
import { pay, requestFinalRefund, requestEarlyRefund, approveRefund, markRefundPaid, cancelEarlyRefund, updatePaymentContribution } from '@/services/caisse/mutations'
import { getPaymentByDate } from '@/db/caisse/payments.db'
import { toast } from 'sonner'
import { ChevronLeft, ChevronRight, Calendar, Plus, DollarSign, TrendingUp, FileText, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { earlyRefundSchema, earlyRefundDefaultValues, type EarlyRefundFormData } from '@/types/schemas'

type Props = { id: string }

export default function DailyContract({ id }: Props) {
  const { data, isLoading, isError, error, refetch } = useCaisseContract(id)
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [showPaymentDetailsModal, setShowPaymentDetailsModal] = useState(false)
  const [showEditPaymentModal, setShowEditPaymentModal] = useState(false)
  const [showLatePaymentModal, setShowLatePaymentModal] = useState(false)
  const [paymentDetails, setPaymentDetails] = useState<any>(null)
  const [editingContribution, setEditingContribution] = useState<any>(null)
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentTime, setPaymentTime] = useState('')
  const [paymentMode, setPaymentMode] = useState<'airtel_money' | 'mobicash'>('airtel_money')
  const [paymentFile, setPaymentFile] = useState<File | undefined>()
  const [selectedGroupMemberId, setSelectedGroupMemberId] = useState<string>('')
  const [isEditing, setIsEditing] = useState(false)
  const [isPaying, setIsPaying] = useState(false)
  const [isRefunding, setIsRefunding] = useState(false)
  // Formulaire de retrait anticipé avec React Hook Form
  const earlyRefundForm = useForm<EarlyRefundFormData>({
    resolver: zodResolver(earlyRefundSchema),
    defaultValues: earlyRefundDefaultValues
  })
  const [confirmApproveId, setConfirmApproveId] = useState<string | null>(null)
  const [confirmPaidId, setConfirmPaidId] = useState<string | null>(null)
  const [confirmFinal, setConfirmFinal] = useState(false)

  // Synchroniser les valeurs existantes quand les données sont chargées
  useEffect(() => {
    if (data && data.refunds) {
      // Trouver le remboursement en attente d'approbation
      const pendingRefund = data.refunds.find((r: any) => r.status === 'APPROVED')
      if (pendingRefund) {
        // Synchroniser les valeurs existantes dans le formulaire
        const formData: Partial<EarlyRefundFormData> = {}
        
        if (pendingRefund.reason) {
          formData.reason = pendingRefund.reason
        }
        
        if (pendingRefund.withdrawalDate) {
          try {
            const date = new Date(pendingRefund.withdrawalDate)
            if (!isNaN(date.getTime())) {
              formData.withdrawalDate = date.toISOString().split('T')[0]
            }
          } catch (error) {
            console.log('Erreur parsing date existante:', error)
          }
        }
        
        if (pendingRefund.withdrawalTime && pendingRefund.withdrawalTime !== '--:--' && pendingRefund.withdrawalTime !== 'undefined') {
          formData.withdrawalTime = pendingRefund.withdrawalTime
        }
        
        // Mettre à jour le formulaire avec les valeurs existantes
        if (Object.keys(formData).length > 0) {
          earlyRefundForm.reset({
            ...earlyRefundDefaultValues,
            ...formData
          })
        }
      }
    }
  }, [data, earlyRefundForm])

  if (isLoading) return <div className="p-4">Chargement…</div>
  if (isError) return <div className="p-4 text-red-600">Erreur de chargement du contrat: {(error as any)?.message}</div>
  if (!data) return <div className="p-4">Contrat introuvable</div>

  const isClosed = data.status === 'CLOSED'
  const settings = useActiveCaisseSettingsByType((data as any).caisseType)

  // Récupérer les membres du groupe si c'est un contrat de groupe
  const isGroupContract = data.contractType === 'GROUP' || (data as any).groupeId
  const { data: groupMembers } = useGroupMembers((data as any).groupeId, isGroupContract)

  // Fonctions utilitaires pour le calendrier
  const getMonthDays = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const startDate = new Date(firstDay)
    startDate.setDate(startDate.getDate() - firstDay.getDay())
    
    const days = []
    const currentDate = new Date(startDate)
    
    while (currentDate <= lastDay || days.length < 42) {
      days.push(new Date(currentDate))
      currentDate.setDate(currentDate.getDate() + 1)
    }
    
    return days
  }

  const getPaymentForDate = (date: Date) => {
    if (!data.payments) return null
    
    // Rechercher dans tous les paiements pour trouver une contribution à cette date exacte
    for (const payment of data.payments) {
      if (payment.contribs && Array.isArray(payment.contribs)) {
        const hasContributionOnDate = payment.contribs.some((c: any) => {
          if (!c.paidAt) return false
          
          let contribDate: Date
          
          // Gérer les différents types de date (Date, Timestamp, string)
          if (c.paidAt instanceof Date) {
            contribDate = c.paidAt
          } else if (c.paidAt && typeof c.paidAt.toDate === 'function') {
            // Firestore Timestamp
            contribDate = c.paidAt.toDate()
          } else if (typeof c.paidAt === 'string') {
            contribDate = new Date(c.paidAt)
          } else {
            contribDate = new Date(c.paidAt)
          }
          
          // Vérifier que la date est valide
          if (isNaN(contribDate.getTime())) return false
          
          // Normaliser les dates pour la comparaison (ignorer l'heure)
          const normalizedContribDate = new Date(contribDate.getFullYear(), contribDate.getMonth(), contribDate.getDate())
          const normalizedTargetDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())
          
          return normalizedContribDate.getTime() === normalizedTargetDate.getTime()
        })
        
        if (hasContributionOnDate) return payment
      }
    }
    return null
  }

  const getPaymentDetailsForDate = (date: Date) => {
    if (!data.payments) return null
    
    // Rechercher dans tous les paiements pour trouver une contribution à cette date exacte
    for (const payment of data.payments) {
      if (payment.contribs && Array.isArray(payment.contribs)) {
        const contribution = payment.contribs.find((c: any) => {
          if (!c.paidAt) return false
          
          let contribDate: Date
          
          // Gérer les différents types de date (Date, Timestamp, string)
          if (c.paidAt instanceof Date) {
            contribDate = c.paidAt
          } else if (c.paidAt && typeof c.paidAt.toDate === 'function') {
            // Firestore Timestamp
            contribDate = c.paidAt.toDate()
          } else if (typeof c.paidAt === 'string') {
            contribDate = new Date(c.paidAt)
          } else {
            contribDate = new Date(c.paidAt)
          }
          
          // Vérifier que la date est valide
          if (isNaN(contribDate.getTime())) return false
          
          // Normaliser les dates pour la comparaison (ignorer l'heure)
          const normalizedContribDate = new Date(contribDate.getFullYear(), contribDate.getMonth(), contribDate.getDate())
          const normalizedTargetDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())
          
          return normalizedContribDate.getTime() === normalizedTargetDate.getTime()
        })
        
        if (contribution) {
          return { payment, contribution }
        }
      }
    }
    return null
  }

  const getTotalForMonth = (monthIndex: number) => {
    const payment = data.payments?.find((p: any) => p.dueMonthIndex === monthIndex)
    return payment?.accumulatedAmount || 0
  }

  const getMonthStatus = (monthIndex: number) => {
    const payment = data.payments?.find((p: any) => p.dueMonthIndex === monthIndex)
    if (!payment) return 'DUE'
    return payment.status
  }

  const monthNames = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']

  const onDateClick = async (date: Date) => {
    if (isClosed) return
    
    // Vérifier si la date est antérieure au premier versement
    const firstPaymentDate = data.contractStartAt ? new Date(data.contractStartAt) : new Date()
    firstPaymentDate.setHours(0, 0, 0, 0)
    const selectedDateStart = new Date(date)
    selectedDateStart.setHours(0, 0, 0, 0)
    
    if (selectedDateStart < firstPaymentDate) {
      toast.error('Impossible de verser sur une date antérieure au premier versement')
      return
    }
    
    // Vérifier si la date est dans le futur (bloqué en production uniquement)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    if (selectedDateStart > today && process.env.NODE_ENV === 'production') {
      toast.error('Impossible de verser sur une date future')
      return
    }
    
    setSelectedDate(date)
    
    try {
      // Récupérer le versement depuis Firestore
      const existingPayment = await getPaymentByDate(id, date)
      
      if (existingPayment) {
        // Stocker les détails du versement et afficher le modal
        setPaymentDetails(existingPayment)
        setShowPaymentDetailsModal(true)
      } else {
        // Créer un nouveau versement
        setPaymentDetails(null)
        // Initialiser l'heure actuelle par défaut
        const now = new Date()
        setPaymentTime(`${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`)
        setShowPaymentModal(true)
      }
    } catch (error) {
      console.error('Erreur lors de la vérification du versement:', error)
      // En cas d'erreur, afficher le formulaire de création
      setPaymentDetails(null)
      const now = new Date()
      setPaymentTime(`${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`)
      setShowPaymentModal(true)
    }
  }

  const onPaymentSubmit = async () => {
    if (!selectedDate || !paymentAmount || !paymentTime || !paymentFile) {
      toast.error('Veuillez remplir tous les champs')
      return
    }

    // Validation spécifique pour les contrats de groupe
    if (isGroupContract && !selectedGroupMemberId) {
      toast.error('Veuillez sélectionner le membre du groupe qui a effectué le versement')
      return
    }

    const amount = Number(paymentAmount)
    if (amount <= 0) {
      toast.error('Le montant doit être positif')
      return
    }

    try {
      setIsPaying(true)
      
      // Trouver le mois correspondant à la date sélectionnée
      const monthIndex = selectedDate.getMonth() - (data.contractStartAt ? new Date(data.contractStartAt).getMonth() : new Date().getMonth())
      
      await pay({ 
        contractId: id, 
        dueMonthIndex: monthIndex, 
        memberId: isGroupContract ? selectedGroupMemberId : data.memberId, 
        amount, 
        file: paymentFile,
        paidAt: selectedDate,
        time: paymentTime,
        mode: paymentMode
      })
      
      await refetch()
      toast.success('Versement enregistré')
      setShowPaymentModal(false)
      setSelectedDate(null)
      setPaymentAmount('')
      setPaymentTime('')
      setPaymentMode('airtel_money')
      setPaymentFile(undefined)
      setSelectedGroupMemberId('')
    } catch (err: any) {
      toast.error(err?.message || 'Erreur lors de l\'enregistrement')
    } finally {
      setIsPaying(false)
    }
  }

  const onEditPaymentSubmit = async () => {
    if (!editingContribution || !paymentAmount || !paymentTime) {
      toast.error('Veuillez remplir tous les champs obligatoires')
      return
    }

    // Validation spécifique pour les contrats de groupe
    if (isGroupContract && !selectedGroupMemberId) {
      toast.error('Veuillez sélectionner le membre du groupe qui a effectué le versement')
      return
    }

    const amount = Number(paymentAmount)
    if (amount <= 0) {
      toast.error('Le montant doit être positif')
      return
    }

    try {
      setIsEditing(true)
      
      await updatePaymentContribution({
        contractId: id,
        paymentId: paymentDetails.payment.id,
        contributionId: editingContribution.id,
        updates: {
          amount,
          time: paymentTime,
          mode: paymentMode,
          proofFile: paymentFile, // Optionnel
          memberId: isGroupContract ? selectedGroupMemberId : undefined // Ajouter l'ID du membre du groupe
        }
      })
      
      await refetch()
      toast.success('Versement modifié avec succès')
      setShowEditPaymentModal(false)
      setEditingContribution(null)
      setPaymentAmount('')
      setPaymentTime('')
      setPaymentMode('airtel_money')
      setPaymentFile(undefined)
      setSelectedGroupMemberId('')
    } catch (err: any) {
      toast.error(err?.message || 'Erreur lors de la modification')
    } finally {
      setIsEditing(false)
    }
  }

  const monthDays = getMonthDays(currentMonth)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg shadow-blue-100/50 border border-gray-100 p-6">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl md:text-3xl lg:text-4xl font-black tracking-tight bg-gradient-to-r from-[#234D65] to-[#2c5a73] bg-clip-text text-transparent">
                Contrat Journalier #{id}
              </h1>
              <p className="text-gray-600 mt-2">
                Objectif mensuel: <span className="font-semibold">{(data.monthlyAmount || 0).toLocaleString('fr-FR')} FCFA</span>
              </p>
              <div className="text-sm text-gray-500 mt-1">
                Paramètres actifs ({String((data as any).caisseType)}): {settings.data ? (settings.data as any).id : '—'}
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Badge variant={data.status === 'ACTIVE' ? 'default' : 'secondary'} className="text-sm">
                {data.status === 'ACTIVE' ? 'Actif' : data.status === 'LATE_NO_PENALTY' ? 'Retard (J+0..3)' : 
                 data.status === 'LATE_WITH_PENALTY' ? 'Retard (J+4..12)' : data.status}
              </Badge>
            </div>
          </div>
        </div>

        {/* Navigation du calendrier */}
        <div className="bg-white rounded-2xl shadow-lg shadow-blue-100/50 border border-gray-100 p-4 lg:p-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const prevMonth = new Date(currentMonth)
                prevMonth.setMonth(prevMonth.getMonth() - 1)
                setCurrentMonth(prevMonth)
              }}
              className="w-full sm:w-auto"
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Mois précédent</span>
              <span className="sm:hidden">Précédent</span>
            </Button>
            
            <h2 className="text-xl lg:text-2xl font-bold text-gray-900 text-center order-first sm:order-none">
              {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
            </h2>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const nextMonth = new Date(currentMonth)
                nextMonth.setMonth(nextMonth.getMonth() + 1)
                setCurrentMonth(nextMonth)
              }}
              className="w-full sm:w-auto"
            >
              <span className="hidden sm:inline">Mois suivant</span>
              <span className="sm:hidden">Suivant</span>
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          </div>

          {/* Grille du calendrier */}
          <div className="grid grid-cols-7 gap-1">
            {/* En-têtes des jours */}
            {['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'].map(day => (
              <div key={day} className="p-2 lg:p-3 text-center text-xs lg:text-sm font-medium text-gray-500 bg-gray-50 rounded-lg">
                {day}
              </div>
            ))}
            
            {/* Jours du mois */}
            {monthDays.map((date, index) => {
              const isCurrentMonth = date.getMonth() === currentMonth.getMonth()
              const isToday = date.toDateString() === new Date().toDateString()
              const payment = getPaymentForDate(date)
              const hasPayment = !!payment
              
              // Vérifier si la date est antérieure au premier versement
              const firstPaymentDate = data.contractStartAt ? new Date(data.contractStartAt) : new Date()
              firstPaymentDate.setHours(0, 0, 0, 0)
              const dateToCheck = new Date(date)
              dateToCheck.setHours(0, 0, 0, 0)
              const isBeforeFirstPayment = dateToCheck < firstPaymentDate
              
              // Déterminer la couleur et le style selon le statut
              let dayStyle = ''
              let dayContent = null
              
              if (!isCurrentMonth) {
                // Jours d'autres mois
                dayStyle = 'bg-gray-50 text-gray-400 cursor-not-allowed'
                dayContent = null
              } else if (isBeforeFirstPayment) {
                // Jours avant la date de début
                dayStyle = 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200'
                dayContent = (
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <XCircle className="h-3 w-3" />
                    <span className="hidden sm:inline">Non disponible</span>
                    <span className="sm:hidden">N/A</span>
                  </div>
                )
              } else if (hasPayment) {
                // Jours avec versement effectué
                dayStyle = 'bg-green-50 border-green-200 hover:bg-green-100 cursor-pointer'
                dayContent = (
                  <div className="flex items-center gap-1 text-xs text-green-600">
                    <CheckCircle className="h-3 w-3" />
                    <span className="hidden sm:inline">Versé</span>
                    <span className="sm:hidden">✓</span>
                  </div>
                )
              } else {
                // Vérifier si le jour est dans le passé (après la date de début)
                const today = new Date()
                today.setHours(0, 0, 0, 0)
                const isPastDay = dateToCheck < today
                
                if (isPastDay) {
                  // Jours passés sans versement (après la date de début)
                  dayStyle = 'bg-red-50 border-red-200 hover:bg-red-100 cursor-pointer'
                  dayContent = (
                    <div className="flex items-center gap-1 text-xs text-red-600">
                      <AlertCircle className="h-3 w-3" />
                      <span className="hidden sm:inline">À verser</span>
                      <span className="sm:hidden">À verser</span>
                    </div>
                  )
                } else {
                  // Jours futurs (après la date de début mais pas encore arrivés)
                  dayStyle = 'bg-white border-gray-200 hover:bg-gray-50 cursor-pointer'
                  dayContent = (
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <Calendar className="h-3 w-3" />
                      <span className="hidden sm:inline">À venir</span>
                      <span className="sm:hidden">À venir</span>
                    </div>
                  )
                }
              }
              
              // Style spécial pour aujourd'hui
              if (isToday && isCurrentMonth && !isBeforeFirstPayment) {
                // Aujourd'hui hérite de la couleur de son statut mais avec une intensité plus forte
                if (hasPayment) {
                  dayStyle = 'bg-green-100 border-green-300 hover:bg-green-200 cursor-pointer'
                } else {
                  // Aujourd'hui sans versement = rouge (car c'est un jour passé)
                  dayStyle = 'bg-red-100 border-red-300 hover:bg-red-200 cursor-pointer'
                }
                // Ajouter un indicateur "Aujourd'hui"
                dayContent = (
                  <div className="space-y-1">
                    {dayContent}
                    <div className="text-xs text-blue-600 font-medium">
                      <span className="hidden sm:inline">Aujourd'hui</span>
                      <span className="sm:hidden">Auj</span>
                    </div>
                  </div>
                )
              }
              
              return (
                <div
                  key={index}
                  className={`p-2 lg:p-3 min-h-[60px] lg:min-h-[80px] border rounded-lg transition-all duration-200 ${dayStyle}`}
                  onClick={() => isCurrentMonth && !isBeforeFirstPayment && onDateClick(date)}
                >
                  <div className="text-xs lg:text-sm font-medium mb-1">
                    {date.getDate()}
                  </div>
                  
                  {isCurrentMonth && dayContent}
                </div>
              )
            })}
          </div>
          
          {/* Légende des couleurs */}
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <div className="text-xs font-medium text-gray-700 mb-2">Légende des couleurs :</div>
            <div className="flex flex-wrap items-center gap-3 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-50 border-2 border-green-200 rounded"></div>
                <span className="text-green-700">Versé</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-red-50 border-2 border-red-200 rounded"></div>
                <span className="text-red-700">À verser (passé)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-white border-2 border-gray-200 rounded"></div>
                <span className="text-gray-700">À venir</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-gray-100 border-2 border-gray-200 rounded"></div>
                <span className="text-gray-600">Non disponible</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-blue-100 border-2 border-blue-300 rounded"></div>
                <span className="text-blue-700">Aujourd'hui</span>
              </div>
            </div>
          </div>
        </div>

        {/* Résumé mensuel */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
          {Array.from({ length: data.monthsPlanned || 0 }).map((_, monthIndex) => {
            const total = getTotalForMonth(monthIndex)
            const status = getMonthStatus(monthIndex)
            const target = data.monthlyAmount || 0
            const percentage = target > 0 ? Math.min(100, (total / target) * 100) : 0
            
            return (
              <Card key={monthIndex} className="shadow-lg border-gray-100">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base lg:text-lg flex items-center gap-2">
                    <Calendar className="h-4 w-4 lg:h-5 lg:w-5 text-blue-600" />
                    Mois {monthIndex + 1}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs lg:text-sm text-gray-600">Objectif</span>
                    <span className="text-sm lg:text-base font-semibold">{target.toLocaleString('fr-FR')} FCFA</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-xs lg:text-sm text-gray-600">Versé</span>
                    <span className="text-sm lg:text-base font-semibold text-green-600">{total.toLocaleString('fr-FC')} FCFA</span>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs lg:text-sm">
                      <span>Progression</span>
                      <span>{percentage.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all duration-300 ${
                          percentage >= 100 ? 'bg-green-500' : percentage >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant={status === 'PAID' ? 'default' : status === 'DUE' ? 'secondary' : 'destructive'}
                      className="text-xs"
                    >
                      {status === 'PAID' ? 'Complété' : status === 'DUE' ? 'En cours' : status}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Remboursements */}
        <div className="bg-white rounded-2xl shadow-lg shadow-blue-100/50 border border-gray-100 p-4 lg:p-6">
          <h2 className="text-lg lg:text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 lg:h-5 lg:w-5 text-emerald-600" />
            Remboursements
          </h2>
          
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-4">
            {(() => {
              const payments = data.payments || []
              const paidCount = payments.filter((x: any) => x.status === 'PAID').length
              const allPaid = payments.length > 0 && paidCount === payments.length
              const canEarly = paidCount >= 1 && !allPaid
              const hasFinalRefund = (data.refunds || []).some((r: any) => r.type === 'FINAL' && r.status !== 'ARCHIVED') || data.status === 'FINAL_REFUND_PENDING' || data.status === 'CLOSED'
              const hasEarlyRefund = (data.refunds || []).some((r: any) => r.type === 'EARLY' && r.status !== 'ARCHIVED') || data.status === 'EARLY_REFUND_PENDING'
              
              return (
                <>
                  <Button 
                    className="bg-emerald-600 hover:bg-emerald-700 text-white w-full sm:w-auto" 
                    disabled={isRefunding || !allPaid || hasFinalRefund}
                    onClick={() => setConfirmFinal(true)}
                  >
                    <span className="hidden sm:inline">Demander remboursement final</span>
                    <span className="sm:hidden">Remboursement final</span>
                  </Button>
                  
                  <Button 
                    variant="outline"
                    disabled={isRefunding || !canEarly || hasEarlyRefund}
                    className="w-full sm:w-auto"
                    onClick={async () => {
                      try {
                        setIsRefunding(true)
                        await requestEarlyRefund(id)
                        await refetch()
                        toast.success('Retrait anticipé demandé')
                      } catch (e: any) {
                        toast.error(e?.message || 'Action impossible')
                      } finally {
                        setIsRefunding(false)
                      }
                    }}
                  >
                    <span className="hidden sm:inline">Demander retrait anticipé</span>
                    <span className="sm:hidden">Retrait anticipé</span>
                  </Button>
                  
                  <Button 
                    variant="outline"
                    disabled={isClosed}
                    className="w-full sm:w-auto border-orange-300 text-orange-700 hover:bg-orange-50"
                    onClick={() => setShowLatePaymentModal(true)}
                  >
                    <span className="hidden sm:inline">Versement en retard</span>
                    <span className="sm:hidden">En retard</span>
                  </Button>
                </>
              )
            })()}
          </div>
          
          <div className="grid grid-cols-1 gap-4">
            {(data.refunds || []).map((r: any) => (
              <Card key={r.id} className="border-gray-200">
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                    <div className="font-medium">
                      {r.type === 'FINAL' ? 'Final' : r.type === 'EARLY' ? 'Anticipé' : 'Défaut'}
                    </div>
                    <Badge 
                      variant={
                        r.status === 'PENDING' ? 'secondary' : 
                        r.status === 'APPROVED' ? 'default' : 
                        r.status === 'PAID' ? 'default' : 'secondary'
                      }
                      className="text-xs self-start sm:self-auto"
                    >
                      {r.status === 'PENDING' ? 'En attente' : r.status === 'APPROVED' ? 'Approuvé' : r.status === 'PAID' ? 'Payé' : 'Archivé'}
                    </Badge>
                  </div>
                  
                  <div className="space-y-2 text-xs lg:text-sm text-gray-600">
                    <div>Nominal: <span className="font-medium">{(r.amountNominal || 0).toLocaleString('fr-FR')} FCFA</span></div>
                    <div>Bonus: <span className="font-medium">{(r.amountBonus || 0).toLocaleString('fr-FR')} FCFA</span></div>
                    <div>Échéance: <span className="font-medium">{r.deadlineAt ? new Date(r.deadlineAt).toLocaleDateString('fr-FR') : '—'}</span></div>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mt-3">
                    {r.status === 'PENDING' && (
                      <>
                        <Button 
                          size="sm" 
                          onClick={() => setConfirmApproveId(r.id)}
                          className="bg-blue-600 hover:bg-blue-700 text-white w-full sm:w-auto"
                        >
                          Approuver
                        </Button>
                        {r.type === 'EARLY' && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            className="text-red-600 border-red-300 hover:bg-red-50 w-full sm:w-auto"
                            onClick={async () => {
                              try {
                                await cancelEarlyRefund(id, r.id)
                                await refetch()
                                toast.success('Demande anticipée annulée')
                              } catch (e: any) {
                                toast.error(e?.message || 'Annulation impossible')
                              }
                            }}
                          >
                            Annuler
                          </Button>
                        )}
                      </>
                    )}
                    
                    {r.status === 'APPROVED' && (
                      <>
                        <Form {...earlyRefundForm}>
                          <form onSubmit={earlyRefundForm.handleSubmit(async (data) => {
                            try {
                              await markRefundPaid(id, r.id, data.proof, {
                                reason: data.reason,
                                withdrawalDate: data.withdrawalDate,
                                withdrawalTime: data.withdrawalTime
                              })
                              
                              // Réinitialiser le formulaire
                              earlyRefundForm.reset(earlyRefundDefaultValues)
                              setConfirmPaidId(null)
                              await refetch()
                              toast.success('Remboursement marqué payé')
                            } catch (error: any) {
                              toast.error(error?.message || 'Erreur lors du marquage')
                            }
                          })}>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                              {/* Cause du retrait */}
                              <FormField
                                control={earlyRefundForm.control}
                                name="reason"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="text-xs text-gray-600">Cause du retrait *</FormLabel>
                                    <FormControl>
                                      <Textarea
                                        placeholder="Raison du retrait..."
                                        className="w-full text-xs p-2 border border-gray-300 rounded-md resize-none"
                                        rows={2}
                                        {...field}
                                      />
                                    </FormControl>
                                    <FormMessage className="text-xs" />
                                  </FormItem>
                                )}
                              />
                              
                              {/* Date du retrait */}
                              <FormField
                                control={earlyRefundForm.control}
                                name="withdrawalDate"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="text-xs text-gray-600">Date du retrait *</FormLabel>
                                    <FormControl>
                                      <Input
                                        type="date"
                                        className="w-full text-xs"
                                        {...field}
                                      />
                                    </FormControl>
                                    <FormMessage className="text-xs" />
                                  </FormItem>
                                )}
                              />
                              
                              {/* Heure du retrait */}
                              <FormField
                                control={earlyRefundForm.control}
                                name="withdrawalTime"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="text-xs text-gray-600">Heure du retrait *</FormLabel>
                                    <FormControl>
                                      <Input
                                        type="time"
                                        className="w-full text-xs"
                                        {...field}
                                      />
                                    </FormControl>
                                    <FormMessage className="text-xs" />
                                  </FormItem>
                                )}
                              />
                              
                              {/* Preuve du retrait */}
                              <FormField
                                control={earlyRefundForm.control}
                                name="proof"
                                render={({ field: { onChange, value, ...field } }) => (
                                  <FormItem>
                                    <FormLabel className="text-xs text-gray-600">Preuve du retrait *</FormLabel>
                                    <FormControl>
                                      <Input
                                        type="file"
                                        accept="image/*"
                                        onChange={async (e) => {
                                          const file = e.target.files?.[0]
                                          if (!file) {
                                            onChange(undefined)
                                            return
                                          }
                                          if (!file.type.startsWith('image/')) {
                                            toast.error('La preuve doit être une image')
                                            onChange(undefined)
                                            return
                                          }
                                          onChange(file)
                                          toast.success('Preuve sélectionnée')
                                        }}
                                        className="w-full text-xs"
                                        {...field}
                                      />
                                    </FormControl>
                                    <FormMessage className="text-xs" />
                                  </FormItem>
                                )}
                              />
                            </div>
                            
                            <Button 
                              type="submit"
                              size="sm"
                              className="bg-green-600 hover:bg-green-700 text-white w-full sm:w-auto"
                              disabled={!earlyRefundForm.formState.isValid || earlyRefundForm.formState.isSubmitting}
                            >
                              {earlyRefundForm.formState.isSubmitting ? 'Traitement...' : 'Marquer payé'}
                            </Button>
                          </form>
                        </Form>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
            
            {(!data.refunds || data.refunds.length === 0) && (
              <div className="text-center py-8 text-gray-500">
                <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Aucun remboursement</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal de versement */}
      <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
        <DialogContent className="w-[95vw] max-w-md mx-auto">
          <DialogHeader>
            <DialogTitle>Nouveau versement</DialogTitle>
            <DialogDescription>
              Enregistrer un versement pour le {selectedDate?.toLocaleDateString('fr-FR')}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Date du versement (grisée) */}
            <div>
              <Label htmlFor="date">Date du versement</Label>
              <Input
                id="date"
                type="text"
                value={selectedDate?.toLocaleDateString('fr-FR') || ''}
                disabled
                className="w-full bg-gray-100 cursor-not-allowed"
              />
            </div>
            
            {/* Heure du versement */}
            <div>
              <Label htmlFor="time">Heure du versement</Label>
              <Input
                id="time"
                type="time"
                value={paymentTime}
                onChange={(e) => setPaymentTime(e.target.value)}
                required
                className="w-full"
              />
            </div>
            
            {/* Montant */}
            <div>
              <Label htmlFor="amount">Montant (FCFA)</Label>
              <Input
                id="amount"
                type="number"
                placeholder="0"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                min="100"
                step="100"
                required
                className="w-full"
              />
            </div>
            
            {/* Mode de paiement */}
            <div>
              <Label htmlFor="mode">Mode de paiement</Label>
              <div className="flex gap-3 mt-2">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    name="paymentMode"
                    value="airtel_money"
                    checked={paymentMode === 'airtel_money'}
                    onChange={(e) => setPaymentMode(e.target.value as 'airtel_money' | 'mobicash')}
                    className="text-blue-600"
                  />
                  <span className="text-sm">Airtel Money</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    name="paymentMode"
                    value="mobicash"
                    checked={paymentMode === 'mobicash'}
                    onChange={(e) => setPaymentMode(e.target.value as 'airtel_money' | 'mobicash')}
                    className="text-blue-600"
                  />
                  <span className="text-sm">Mobicash</span>
                </label>
              </div>
            </div>
            
            {/* Sélection du membre du groupe (si contrat de groupe) */}
            {isGroupContract && groupMembers && groupMembers.length > 0 && (
              <div>
                <Label htmlFor="groupMember">Membre du groupe qui verse *</Label>
                <Select value={selectedGroupMemberId} onValueChange={setSelectedGroupMemberId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Sélectionnez le membre qui verse" />
                  </SelectTrigger>
                  <SelectContent>
                    {groupMembers.map((member) => (
                      <SelectItem key={member.id} value={member.id}>
                        {member.firstName} {member.lastName} ({member.matricule})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500 mt-1">
                  Ce champ permet de tracer qui a effectué le versement dans le groupe
                </p>
              </div>
            )}
            
            {/* Preuve de versement */}
            <div>
              <Label htmlFor="proof">Preuve de versement</Label>
              <Input
                id="proof"
                type="file"
                accept="image/*"
                onChange={(e) => setPaymentFile(e.target.files?.[0])}
                required
                className="w-full"
              />
            </div>
          </div>
          
          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button 
              variant="outline" 
              onClick={() => {
                setShowPaymentModal(false)
                setSelectedGroupMemberId('')
              }}
              className="w-full sm:w-auto"
            >
              Annuler
            </Button>
            <Button 
              onClick={onPaymentSubmit}
              disabled={isPaying || !paymentAmount || !paymentTime || !paymentFile}
              className="bg-[#234D65] hover:bg-[#2c5a73] text-white w-full sm:w-auto"
            >
              {isPaying ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal des détails du versement */}
      <Dialog open={showPaymentDetailsModal} onOpenChange={setShowPaymentDetailsModal}>
        <DialogContent className="w-[95vw] max-w-lg mx-auto max-h-[90vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="text-lg lg:text-xl">Détails du versement</DialogTitle>
            <DialogDescription className="text-sm lg:text-base">
              Versement du {selectedDate?.toLocaleDateString('fr-FR')}
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto min-h-0">
            {(() => {
              if (!selectedDate || !paymentDetails) {
                return <div className="text-center text-gray-500 py-8">Chargement des détails...</div>
              }
              
              const { payment, contribution } = paymentDetails
              
              return (
                <div className="space-y-2 lg:space-y-3 p-1">
                {/* Date du versement */}
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center p-2 lg:p-3 bg-gray-50 rounded-lg gap-1 lg:gap-2">
                  <span className="font-medium text-gray-700 text-xs lg:text-sm">Date:</span>
                  <span className="text-gray-900 text-xs lg:text-sm font-medium">{selectedDate?.toLocaleDateString('fr-FR')}</span>
                </div>
                
                {/* Heure du versement */}
                {contribution?.time && (
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center p-2 lg:p-3 bg-gray-50 rounded-lg gap-1 lg:gap-2">
                    <span className="font-medium text-gray-700 text-xs lg:text-sm">Heure:</span>
                    <span className="text-gray-900 text-xs lg:text-sm">{contribution.time}</span>
                  </div>
                )}
                
                {/* Montant */}
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center p-2 lg:p-3 bg-gray-50 rounded-lg gap-1 lg:gap-2">
                  <span className="font-medium text-gray-700 text-xs lg:text-sm">Montant:</span>
                  <span className="text-gray-900 font-semibold text-xs lg:text-sm">
                    {contribution?.amount?.toLocaleString('fr-FR')} FCFA
                  </span>
                </div>
                
                {/* Mode de paiement */}
                {contribution?.mode && (
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center p-2 lg:p-3 bg-gray-50 rounded-lg gap-1 lg:gap-2">
                    <span className="font-medium text-gray-700 text-xs lg:text-sm">Mode:</span>
                    <span className="text-gray-900 text-xs lg:text-sm">
                      {contribution.mode === 'airtel_money' ? 'Airtel Money' : 'Mobicash'}
                    </span>
                  </div>
                )}
                
                {/* Preuve */}
                {contribution?.proofUrl && (
                  <div className="space-y-1 lg:space-y-2">
                    <span className="font-medium text-gray-700 text-xs lg:text-sm">Preuve de versement:</span>
                    <div className="p-2 lg:p-3 bg-gray-50 rounded-lg">
                      <img 
                        src={contribution.proofUrl} 
                        alt="Preuve de versement" 
                        className="w-full h-20 lg:h-28 object-cover rounded-md"
                      />
                    </div>
                  </div>
                )}
                
                {/* Statut du mois */}
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center p-2 lg:p-3 bg-blue-50 rounded-lg gap-1 lg:gap-2">
                  <span className="font-medium text-blue-700 text-xs lg:text-sm">Statut du mois:</span>
                  <Badge variant={payment.status === 'PAID' ? 'default' : 'secondary'} className="text-xs">
                    {payment.status === 'PAID' ? 'Payé' : 'En cours'}
                  </Badge>
                </div>
                
                {/* Montant accumulé du mois */}
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center p-2 lg:p-3 bg-green-50 rounded-lg gap-1 lg:gap-2">
                  <span className="font-medium text-green-700 text-xs lg:text-sm">Total du mois:</span>
                  <span className="text-green-900 font-semibold text-xs lg:text-sm">
                    {payment.accumulatedAmount?.toLocaleString('fr-FR')} FCFA
                  </span>
                </div>
              </div>
            )
          })()}
          </div>
          
          <DialogFooter className="flex-shrink-0 flex flex-col sm:flex-row gap-2 pt-3 lg:pt-4 border-t">
            <Button 
              variant="outline" 
              onClick={() => setShowPaymentDetailsModal(false)}
              className="w-full sm:w-auto order-2 sm:order-1"
            >
              Fermer
            </Button>
            <Button 
              onClick={() => {
                if (paymentDetails?.contribution) {
                  setEditingContribution(paymentDetails.contribution)
                  setPaymentAmount(paymentDetails.contribution.amount?.toString() || '')
                  setPaymentTime(paymentDetails.contribution.time || '')
                  setPaymentMode(paymentDetails.contribution.mode || 'airtel_money')
                  setPaymentFile(undefined) // Pas de fichier par défaut pour la modification
                  // Initialiser le membre du groupe si c'est un contrat de groupe
                  if (isGroupContract && paymentDetails.contribution.memberId) {
                    setSelectedGroupMemberId(paymentDetails.contribution.memberId)
                  } else {
                    setSelectedGroupMemberId('')
                  }
                  setShowEditPaymentModal(true)
                  setShowPaymentDetailsModal(false)
                }
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white w-full sm:w-auto order-1 sm:order-2"
            >
              Modifier le versement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de modification du versement */}
      <Dialog open={showEditPaymentModal} onOpenChange={setShowEditPaymentModal}>
        <DialogContent className="w-[95vw] max-w-lg mx-auto max-h-[90vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="text-lg lg:text-xl">Modifier le versement</DialogTitle>
            <DialogDescription className="text-sm lg:text-base">
              Modifier le versement du {selectedDate?.toLocaleDateString('fr-FR')}
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto min-h-0">
            <div className="space-y-3 lg:space-y-4 p-1">
              {/* Date du versement (non modifiable) */}
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center p-2 lg:p-3 bg-gray-100 rounded-lg gap-1 lg:gap-2">
                <span className="font-medium text-gray-700 text-xs lg:text-sm">Date:</span>
                <span className="text-gray-900 text-xs lg:text-sm font-medium">{selectedDate?.toLocaleDateString('fr-FR')}</span>
              </div>
              
              {/* Heure du versement */}
              <div>
                <Label htmlFor="edit-time" className="text-xs lg:text-sm">Heure du versement</Label>
                <Input
                  id="edit-time"
                  type="time"
                  value={paymentTime}
                  onChange={(e) => setPaymentTime(e.target.value)}
                  required
                  className="w-full mt-1"
                />
              </div>
              
              {/* Montant */}
              <div>
                <Label htmlFor="edit-amount" className="text-xs lg:text-sm">Montant (FCFA)</Label>
                <Input
                  id="edit-amount"
                  type="number"
                  placeholder="0"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  min="100"
                  step="100"
                  required
                  className="w-full mt-1"
                />
              </div>
              
              {/* Mode de paiement */}
              <div>
                <Label className="text-xs lg:text-sm">Mode de paiement</Label>
                <div className="flex gap-3 mt-2">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name="editPaymentMode"
                      value="airtel_money"
                      checked={paymentMode === 'airtel_money'}
                      onChange={(e) => setPaymentMode(e.target.value as 'airtel_money' | 'mobicash')}
                      className="text-blue-600"
                    />
                    <span className="text-xs lg:text-sm">Airtel Money</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name="editPaymentMode"
                      value="mobicash"
                      checked={paymentMode === 'mobicash'}
                      onChange={(e) => setPaymentMode(e.target.value as 'airtel_money' | 'mobicash')}
                      className="text-blue-600"
                    />
                    <span className="text-xs lg:text-sm">Mobicash</span>
                  </label>
                </div>
              </div>
              
              {/* Sélection du membre du groupe (si contrat de groupe) */}
              {isGroupContract && groupMembers && groupMembers.length > 0 && (
                <div>
                  <Label htmlFor="edit-groupMember" className="text-xs lg:text-sm">Membre du groupe qui verse *</Label>
                  <Select value={selectedGroupMemberId} onValueChange={setSelectedGroupMemberId}>
                    <SelectTrigger className="w-full mt-1">
                      <SelectValue placeholder="Sélectionnez le membre qui verse" />
                    </SelectTrigger>
                    <SelectContent>
                      {groupMembers.map((member) => (
                        <SelectItem key={member.id} value={member.id}>
                          {member.firstName} {member.lastName} ({member.matricule})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500 mt-1">
                    Ce champ permet de tracer qui a effectué le versement dans le groupe
                  </p>
                </div>
              )}
              
              {/* Preuve de versement (optionnelle) */}
              <div>
                <Label htmlFor="edit-proof" className="text-xs lg:text-sm">
                  Nouvelle preuve de versement (optionnel)
                </Label>
                <Input
                  id="edit-proof"
                  type="file"
                  accept="image/*"
                  onChange={(e) => setPaymentFile(e.target.files?.[0])}
                  className="w-full mt-1"
                />
                {editingContribution?.proofUrl && (
                  <p className="text-xs text-gray-500 mt-1">
                    Preuve actuelle conservée si aucune nouvelle n'est fournie
                  </p>
                )}
              </div>
            </div>
          </div>
          
          <DialogFooter className="flex-shrink-0 flex flex-col sm:flex-row gap-2 pt-3 lg:pt-4 border-t">
            <Button 
              variant="outline" 
              onClick={() => {
                setShowEditPaymentModal(false)
                setEditingContribution(null)
                setPaymentAmount('')
                setPaymentTime('')
                setPaymentMode('airtel_money')
                setPaymentFile(undefined)
                setSelectedGroupMemberId('')
              }}
              className="w-full sm:w-auto order-2 sm:order-1"
            >
              Annuler
            </Button>
            <Button 
              onClick={onEditPaymentSubmit}
              disabled={isEditing || !paymentAmount || !paymentTime}
              className="bg-blue-600 hover:bg-blue-700 text-white w-full sm:w-auto order-1 sm:order-2"
            >
              {isEditing ? 'Modification...' : 'Modifier'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de versement en retard */}
      <Dialog open={showLatePaymentModal} onOpenChange={setShowLatePaymentModal}>
        <DialogContent className="w-[95vw] max-w-lg mx-auto max-h-[90vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="text-lg lg:text-xl">Versement en retard</DialogTitle>
            <DialogDescription className="text-sm lg:text-base">
              Enregistrer un versement pour une date passée (quand l'admin a reçu l'argent mais oublié d'enregistrer)
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto min-h-0">
            <div className="space-y-4 p-1">
              {/* Date du versement (sélection manuelle) */}
              <div>
                <Label htmlFor="late-date" className="text-sm font-medium">Date du versement *</Label>
                <Input
                  id="late-date"
                  type="date"
                  value={(() => {
                    // Initialiser avec la date d'hier par défaut pour un versement en retard
                    const yesterday = new Date()
                    yesterday.setDate(yesterday.getDate() - 1)
                    return yesterday.toISOString().split('T')[0]
                  })()}
                  onChange={(e) => {
                    // Mettre à jour la date sélectionnée
                    const selectedDate = new Date(e.target.value)
                    setSelectedDate(selectedDate)
                  }}
                  max={new Date().toISOString().split('T')[0]} // Pas de dates futures
                  required
                  className="w-full mt-1"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Sélectionnez la date réelle du versement (pas de dates futures)
                </p>
              </div>
              
              {/* Heure du versement */}
              <div>
                <Label htmlFor="late-time" className="text-sm font-medium">Heure du versement *</Label>
                <Input
                  id="late-time"
                  type="time"
                  value={paymentTime}
                  onChange={(e) => setPaymentTime(e.target.value)}
                  required
                  className="w-full mt-1"
                />
              </div>
              
              {/* Montant */}
              <div>
                <Label htmlFor="late-amount" className="text-sm font-medium">Montant (FCFA) *</Label>
                <Input
                  id="late-amount"
                  type="number"
                  placeholder="0"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  min="100"
                  step="100"
                  required
                  className="w-full mt-1"
                />
              </div>
              
              {/* Mode de paiement */}
              <div>
                <Label className="text-sm font-medium">Mode de paiement *</Label>
                <div className="flex gap-3 mt-2">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name="latePaymentMode"
                      value="airtel_money"
                      checked={paymentMode === 'airtel_money'}
                      onChange={(e) => setPaymentMode(e.target.value as 'airtel_money' | 'mobicash')}
                      className="text-blue-600"
                    />
                    <span className="text-sm">Airtel Money</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name="latePaymentMode"
                      value="mobicash"
                      checked={paymentMode === 'mobicash'}
                      onChange={(e) => setPaymentMode(e.target.value as 'airtel_money' | 'mobicash')}
                      className="text-blue-600"
                    />
                    <span className="text-sm">Mobicash</span>
                  </label>
                </div>
              </div>
              
              {/* Sélection du membre du groupe (si contrat de groupe) */}
              {isGroupContract && groupMembers && groupMembers.length > 0 && (
                <div>
                  <Label htmlFor="late-groupMember" className="text-sm font-medium">Membre du groupe qui verse *</Label>
                  <Select value={selectedGroupMemberId} onValueChange={setSelectedGroupMemberId}>
                    <SelectTrigger className="w-full mt-1">
                      <SelectValue placeholder="Sélectionnez le membre qui verse" />
                    </SelectTrigger>
                    <SelectContent>
                      {groupMembers.map((member) => (
                        <SelectItem key={member.id} value={member.id}>
                          {member.firstName} {member.lastName} ({member.matricule})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500 mt-1">
                    Ce champ permet de tracer qui a effectué le versement dans le groupe
                  </p>
                </div>
              )}
              
              {/* Preuve de versement */}
              <div>
                <Label htmlFor="late-proof" className="text-sm font-medium">Preuve de versement *</Label>
                <Input
                  id="late-proof"
                  type="file"
                  accept="image/*"
                  onChange={(e) => setPaymentFile(e.target.files?.[0])}
                  required
                  className="w-full mt-1"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Capture d'écran ou photo de la transaction
                </p>
              </div>
              
              {/* Informations supplémentaires */}
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-orange-600 mt-0.5 flex-shrink-0" />
                  <div className="text-xs text-orange-800">
                    <p className="font-medium mb-1">⚠️ Versement en retard</p>
                    <p>Ce versement sera enregistré pour la date sélectionnée. Assurez-vous que :</p>
                    <ul className="list-disc list-inside mt-1 space-y-0.5">
                      <li>L'argent a bien été reçu</li>
                      <li>La date correspond au jour réel du versement</li>
                      <li>La preuve est claire et lisible</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <DialogFooter className="flex-shrink-0 flex flex-col sm:flex-row gap-2 pt-3 lg:pt-4 border-t">
            <Button 
              variant="outline" 
              onClick={() => {
                setShowLatePaymentModal(false)
                setSelectedDate(null)
                setPaymentAmount('')
                setPaymentTime('')
                setPaymentMode('airtel_money')
                setPaymentFile(undefined)
                setSelectedGroupMemberId('')
              }}
              className="w-full sm:w-auto order-2 sm:order-1"
            >
              Annuler
            </Button>
            <Button 
              onClick={async () => {
                if (!selectedDate || !paymentAmount || !paymentTime || !paymentFile) {
                  toast.error('Veuillez remplir tous les champs obligatoires')
                  return
                }

                // Validation spécifique pour les contrats de groupe
                if (isGroupContract && !selectedGroupMemberId) {
                  toast.error('Veuillez sélectionner le membre du groupe qui a effectué le versement')
                  return
                }

                const amount = Number(paymentAmount)
                if (amount <= 0) {
                  toast.error('Le montant doit être positif')
                  return
                }

                try {
                  setIsPaying(true)
                  
                  // Trouver le mois correspondant à la date sélectionnée
                  const monthIndex = selectedDate.getMonth() - (data.contractStartAt ? new Date(data.contractStartAt).getMonth() : new Date().getMonth())
                  
                  await pay({ 
                    contractId: id, 
                    dueMonthIndex: monthIndex, 
                    memberId: isGroupContract ? selectedGroupMemberId : data.memberId, 
                    amount, 
                    file: paymentFile,
                    paidAt: selectedDate,
                    time: paymentTime,
                    mode: paymentMode
                  })
                  
                  await refetch()
                  toast.success('Versement en retard enregistré avec succès')
                  setShowLatePaymentModal(false)
                  setSelectedDate(null)
                  setPaymentAmount('')
                  setPaymentTime('')
                  setPaymentMode('airtel_money')
                  setPaymentFile(undefined)
                  setSelectedGroupMemberId('')
                } catch (err: any) {
                  toast.error(err?.message || 'Erreur lors de l\'enregistrement')
                } finally {
                  setIsPaying(false)
                }
              }}
              disabled={isPaying || !selectedDate || !paymentAmount || !paymentTime || !paymentFile}
              className="bg-orange-600 hover:bg-orange-700 text-white w-full sm:w-auto order-1 sm:order-2"
            >
              {isPaying ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Enregistrement...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4" />
                  Enregistrer le versement en retard
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modals de confirmation */}
      {confirmApproveId && (
        <Dialog open={!!confirmApproveId} onOpenChange={() => setConfirmApproveId(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirmer l'approbation</DialogTitle>
              <DialogDescription>
                Voulez-vous approuver ce remboursement ?
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setConfirmApproveId(null)}>
                Annuler
              </Button>
              <Button 
                onClick={async () => {
                  await approveRefund(id, confirmApproveId)
                  setConfirmApproveId(null)
                  await refetch()
                  toast.success('Remboursement approuvé')
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                Confirmer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {confirmFinal && (
        <Dialog open={confirmFinal} onOpenChange={setConfirmFinal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirmer la demande</DialogTitle>
              <DialogDescription>
                Voulez-vous demander le remboursement final ? Toutes les échéances doivent être payées. Cette action est irréversible.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setConfirmFinal(false)} disabled={isRefunding}>
                Annuler
              </Button>
              <Button 
                onClick={async () => {
                  try {
                    setIsRefunding(true)
                    await requestFinalRefund(id)
                    await refetch()
                    toast.success('Remboursement final demandé')
                  } catch (e: any) {
                    toast.error(e?.message || 'Action impossible')
                  } finally {
                    setIsRefunding(false)
                    setConfirmFinal(false)
                  }
                }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                disabled={isRefunding}
              >
                Confirmer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}


    </div>
  )
}

