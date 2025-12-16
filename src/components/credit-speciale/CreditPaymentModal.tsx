'use client'

import React, { useState, useEffect, useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Loader2,
  Calendar,
  Clock,
  DollarSign,
  Upload,
  AlertTriangle,
  AlertCircle,
  CheckCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { CreditPaymentMode, CreditPenalty } from '@/types/types'
import { ImageCompressionService } from '@/services/imageCompressionService'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { creditPaymentFormSchema, type CreditPaymentFormInput } from '@/schemas/credit-speciale.schema'
import { useCreditPaymentMutations, useCreditContract, useCreditPenaltiesByCreditId } from '@/hooks/useCreditSpeciale'
import { useAuth } from '@/hooks/useAuth'
import { format } from 'date-fns'
import { ServiceFactory } from '@/factories/ServiceFactory'
import { useQueryClient } from '@tanstack/react-query'

interface CreditPaymentModalProps {
  isOpen: boolean
  onClose: () => void
  creditId: string
  defaultAmount?: number
  defaultPaymentDate?: Date // Date de l'échéance pour calculer le retard
  onSuccess?: () => void
  defaultPenaltyOnlyMode?: boolean // Activer le mode "pénalités uniquement" par défaut
  installmentId?: string // ID de l'échéance spécifique à payer
  installmentNumber?: number // Numéro du mois de l'échéance (M1, M2, etc.)
}

// Fonction pour calculer la note automatique selon le retard (jours de retard)
const calculateNoteByDelay = (daysLate: number): number => {
  if (daysLate <= 0) {
    return 10 // Paiement à temps
  } else if (daysLate <= 7) {
    return 8 // Retard de moins d'une semaine
  } else if (daysLate <= 15) {
    return 6 // Retard de 1-2 semaines
  } else if (daysLate <= 30) {
    return 4 // Retard de 2-4 semaines
  } else if (daysLate <= 60) {
    return 2 // Retard de 1-2 mois
  } else {
    return 1 // Retard de plus de 2 mois
  }
}

// Fonction pour générer un commentaire par défaut selon le retard
const getDefaultCommentByDelay = (daysLate: number): string => {
  if (daysLate <= 0) {
    return 'Paiement effectué à temps. Excellente ponctualité.'
  } else if (daysLate <= 7) {
    return 'Paiement effectué avec quelques jours de retard. Ponctualité acceptable.'
  } else if (daysLate <= 15) {
    return 'Paiement effectué avec retard (1-2 semaines). Ponctualité à améliorer.'
  } else if (daysLate <= 30) {
    return 'Paiement en retard avec rappels nécessaires. Ponctualité à améliorer.'
  } else if (daysLate <= 60) {
    return 'Paiement très en retard (1-2 mois) avec plusieurs rappels nécessaires. Client peu fiable.'
  } else {
    return `Paiement très en retard (${Math.floor(daysLate / 30)} mois) avec plusieurs rappels nécessaires. Client peu fiable.`
  }
}

// Fonction pour générer un commentaire par défaut selon la note (pour compatibilité)
const getDefaultCommentByNote = (note: number): string => {
  if (note >= 0 && note < 3) {
    return 'Paiement très en retard avec plusieurs rappels nécessaires. Client peu fiable.'
  } else if (note >= 3 && note < 5) {
    return 'Paiement en retard avec rappels nécessaires. Ponctualité à améliorer.'
  } else if (note >= 5 && note < 7) {
    return 'Paiement effectué avec quelques jours de retard. Ponctualité acceptable.'
  } else if (note >= 7 && note < 10) {
    return 'Paiement effectué dans les délais. Bonne ponctualité.'
  } else if (note === 10) {
    return 'Paiement effectué à temps. Excellente ponctualité.'
  }
  return 'Paiement enregistré.'
}

export default function CreditPaymentModal({
  isOpen,
  onClose,
  creditId,
  defaultAmount,
  defaultPaymentDate,
  onSuccess,
  defaultPenaltyOnlyMode = false,
  installmentId,
  installmentNumber,
}: CreditPaymentModalProps) {
  const [proofFile, setProofFile] = useState<File | undefined>()
  const [isCompressing, setIsCompressing] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedPenalties, setSelectedPenalties] = useState<string[]>([])
  const [penaltyOnlyMode, setPenaltyOnlyMode] = useState(defaultPenaltyOnlyMode)
  const [penaltyNote, setPenaltyNote] = useState<number | undefined>(undefined)

  const { user } = useAuth()
  const { create: createPayment } = useCreditPaymentMutations()
  const { data: contract } = useCreditContract(creditId)
  const { data: penalties = [] } = useCreditPenaltiesByCreditId(creditId)
  const queryClient = useQueryClient()

  // Calculer le retard en jours si une date d'échéance est fournie
  const calculateDelay = useMemo(() => {
    if (!defaultPaymentDate) return 0
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const dueDate = new Date(defaultPaymentDate)
    dueDate.setHours(0, 0, 0, 0)
    const diffTime = today.getTime() - dueDate.getTime()
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
    return Math.max(0, diffDays) // Retourner 0 si la date est dans le futur
  }, [defaultPaymentDate])

  // Calculer la note et le commentaire automatiques selon le retard
  const autoNote = useMemo(() => calculateNoteByDelay(calculateDelay), [calculateDelay])
  const autoComment = useMemo(() => getDefaultCommentByDelay(calculateDelay), [calculateDelay])

  const form = useForm<CreditPaymentFormInput>({
    resolver: zodResolver(creditPaymentFormSchema),
    defaultValues: {
      creditId,
      amount: defaultAmount || 0,
      paymentDate: defaultPaymentDate || new Date(),
      paymentTime: format(new Date(), 'HH:mm'),
      mode: 'CASH',
      comment: autoComment,
      note: autoNote,
    },
    mode: 'onChange',
  })
  
  // Log des erreurs du formulaire pour déboguer
  useEffect(() => {
    if (Object.keys(form.formState.errors).length > 0) {
      console.log('Erreurs de validation du formulaire:', form.formState.errors)
    }
  }, [form.formState.errors])

  React.useEffect(() => {
    if (defaultAmount) {
      form.setValue('amount', defaultAmount)
    }
  }, [defaultAmount, form])

  // Nettoyer les pénalités rétroactives et réinitialiser les pénalités sélectionnées quand le modal s'ouvre
  useEffect(() => {
    if (isOpen) {
      // Nettoyer les pénalités rétroactives avant d'afficher la liste
      const service = ServiceFactory.getCreditSpecialeService()
      service.checkAndCreateMissingPenalties(creditId)
        .then(() => {
          // Rafraîchir les pénalités après nettoyage
          queryClient.invalidateQueries({ queryKey: ['creditPenalties', creditId] })
        })
        .catch((error: unknown) => {
          console.error('Erreur lors du nettoyage des pénalités rétroactives:', error)
        })
      
      setSelectedPenalties([])
      setPenaltyOnlyMode(defaultPenaltyOnlyMode)
      setPenaltyNote(undefined)
      // Mettre à jour la date de paiement, la note et le commentaire selon le retard
      if (defaultPaymentDate) {
        // Convertir la date en format YYYY-MM-DD pour l'input date
        const dateStr = format(defaultPaymentDate, 'yyyy-MM-dd')
        form.setValue('paymentDate', dateStr as any)
      } else {
        form.setValue('paymentDate', new Date())
      }
      form.setValue('note', autoNote)
      form.setValue('comment', autoComment)
    }
  }, [isOpen, form, defaultPaymentDate, autoNote, autoComment, defaultPenaltyOnlyMode])

  // Si on passe en mode "pénalités uniquement", mettre le montant à 0
  useEffect(() => {
    if (penaltyOnlyMode) {
      form.setValue('amount', 0)
    } else if (defaultAmount) {
      form.setValue('amount', defaultAmount)
    }
  }, [penaltyOnlyMode, defaultAmount, form])

  // Calculer les pénalités impayées
  const unpaidPenalties = useMemo(() => {
    return penalties.filter(p => !p.paid)
  }, [penalties])

  // Calculer les pénalités potentielles si le paiement est en retard
  // Ne pas calculer si on est en mode "pénalités uniquement" car on ne paie pas de mensualité
  const potentialPenalty = useMemo(() => {
    // Ne pas calculer de pénalité potentielle si on est en mode "pénalités uniquement"
    if (penaltyOnlyMode) return null
    
    if (!contract) return null
    
    const paymentDate = form.watch('paymentDate')
    if (!paymentDate) return null

    const amount = form.watch('amount') || 0
    // Ne pas calculer si le montant est 0 (pas de paiement de mensualité)
    if (amount <= 0) return null

    // Utiliser defaultPaymentDate (date de l'échéance payée) si disponible, sinon nextDueAt
    const dueDate = defaultPaymentDate 
      ? new Date(defaultPaymentDate)
      : contract.nextDueAt 
        ? new Date(contract.nextDueAt)
        : null
    
    if (!dueDate) return null

    const payDate = new Date(paymentDate)
    payDate.setHours(0, 0, 0, 0)
    dueDate.setHours(0, 0, 0, 0)
    
    const daysLate = Math.floor((payDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))

    if (daysLate > 0) {
      // Règle de 3 : pénalité = (montant mensuel * jours de retard) / 30
      // Utiliser le montant de l'échéance payée si disponible, sinon monthlyPaymentAmount
      const paymentAmount = amount || contract.monthlyPaymentAmount
      const penaltyAmount = (paymentAmount * daysLate) / 30
      return {
        daysLate,
        amount: Math.round(penaltyAmount),
      }
    }

    return null
  }, [contract, form.watch('paymentDate'), form.watch('amount'), penaltyOnlyMode, defaultPaymentDate])

  // Calculer le total des pénalités sélectionnées
  const totalSelectedPenalties = useMemo(() => {
    const selected = unpaidPenalties.filter(p => selectedPenalties.includes(p.id))
    return selected.reduce((sum, p) => sum + p.amount, 0)
  }, [unpaidPenalties, selectedPenalties])

  // Total à payer (montant + pénalités)
  const totalToPay = useMemo(() => {
    const amount = form.watch('amount') || 0
    return amount + totalSelectedPenalties
  }, [form.watch('amount'), totalSelectedPenalties])

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) {
      setProofFile(undefined)
      return
    }

    if (!file.type.startsWith('image/')) {
      toast.error('Le fichier doit être une image')
      e.target.value = ''
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('La taille du fichier ne doit pas dépasser 10 MB')
      e.target.value = ''
      return
    }

    try {
      setIsCompressing(true)
      const compressedFile = await ImageCompressionService.compressImage(file, 1, 1920)
      setProofFile(compressedFile)
      
      const originalSize = ImageCompressionService.formatFileSize(file.size)
      const compressedSize = ImageCompressionService.formatFileSize(compressedFile.size)
      const reduction = (((file.size - compressedFile.size) / file.size) * 100).toFixed(1)
      
      toast.success(`Image compressée avec succès`, {
        description: `${originalSize} → ${compressedSize} (${reduction}% de réduction)`
      })
    } catch (error) {
      console.error('Erreur lors de la compression:', error)
      toast.error('Erreur lors de la compression de l\'image')
      e.target.value = ''
    } finally {
      setIsCompressing(false)
    }
  }

  const onSubmit = async (data: CreditPaymentFormInput) => {
    console.log('[CreditPaymentModal] onSubmit appelé', { 
      data, 
      penaltyOnlyMode, 
      selectedPenalties,
      installmentId,
      creditId 
    })
    
    // La preuve de paiement est optionnelle mais recommandée
    // if (!proofFile) {
    //   toast.error('Veuillez téléverser une preuve de paiement')
    //   return
    // }

    if (!user?.uid) {
      toast.error('Vous devez être connecté pour enregistrer un paiement')
      return
    }

    // Validation : si mode pénalités uniquement, au moins une pénalité doit être sélectionnée
    if (penaltyOnlyMode && selectedPenalties.length === 0) {
      toast.error('Veuillez sélectionner au moins une pénalité à payer')
      return
    }

    // Validation : si mode normal, le montant doit être > 0 (sauf si pénalités sélectionnées)
    if (!penaltyOnlyMode && data.amount <= 0 && selectedPenalties.length === 0) {
      toast.error('Le montant doit être supérieur à 0 ou sélectionnez des pénalités')
      return
    }

    try {
      setIsSubmitting(true)
      
      // Utiliser la note spécifique aux pénalités si en mode pénalités uniquement
      // Sinon, utiliser la note du formulaire (avec valeur par défaut 10 si non définie)
      const finalNote = penaltyOnlyMode 
        ? (penaltyNote ?? 10) // Note par défaut 10 pour pénalités si non spécifiée
        : (data.note ?? 10) // Note par défaut 10 pour paiement normal si non spécifiée
      
      const paymentData = {
        ...data,
        amount: penaltyOnlyMode ? 0 : data.amount, // Montant à 0 si mode pénalités uniquement
        principalAmount: 0, // Sera calculé par le service
        interestAmount: 0, // Sera calculé par le service
        penaltyAmount: totalSelectedPenalties, // Montant des pénalités sélectionnées
        note: finalNote,
        comment: penaltyOnlyMode
          ? `Paiement de pénalités uniquement${data.comment ? ` - ${data.comment}` : ''}`
          : data.comment,
        createdBy: user.uid,
        installmentId: installmentId, // Passer l'ID de l'échéance spécifique
      };
      
      console.log('[CreditPaymentModal] Données du paiement à envoyer:', {
        ...paymentData,
        installmentId: paymentData.installmentId,
        amount: paymentData.amount,
        creditId: paymentData.creditId,
        installmentNumber: installmentNumber, // Log pour vérifier
      });
      
      await createPayment.mutateAsync({
        data: paymentData,
        proofFile,
        penaltyIds: selectedPenalties, // Passer les pénalités sélectionnées
        installmentNumber: installmentNumber, // Passer le numéro du mois
      })
      
      console.log('[CreditPaymentModal] Paiement créé avec succès');

      form.reset()
      setProofFile(undefined)
      setSelectedPenalties([])
      setPenaltyOnlyMode(false)
      setPenaltyNote(undefined)
      onSuccess?.()
      onClose()
    } catch (error: any) {
      console.error('Erreur lors de l\'enregistrement du paiement:', error)
      toast.error(error?.message || 'Erreur lors de l\'enregistrement du paiement')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-[#224D62] flex items-center gap-2">
            <DollarSign className="h-6 w-6" />
            Enregistrer un versement
          </DialogTitle>
          <DialogDescription>
            Enregistrez un nouveau versement pour ce crédit
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Date et Heure */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="payment-date" className="flex items-center gap-2 mb-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                Date de paiement *
              </Label>
              <Input
                id="payment-date"
                type="date"
                {...form.register('paymentDate', { valueAsDate: true })}
                required
              />
              {form.formState.errors.paymentDate && (
                <p className="text-sm text-red-600 mt-1">
                  {form.formState.errors.paymentDate.message}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="payment-time" className="flex items-center gap-2 mb-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                Heure (HH:mm) *
              </Label>
              <Input
                id="payment-time"
                type="time"
                {...form.register('paymentTime')}
                required
              />
              {form.formState.errors.paymentTime && (
                <p className="text-sm text-red-600 mt-1">
                  {form.formState.errors.paymentTime.message}
                </p>
              )}
            </div>
          </div>

          {/* Option : Payer uniquement les pénalités */}
          {unpaidPenalties.length > 0 && (
            <Card className="border-purple-200 bg-purple-50/50">
              <CardContent className="pt-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="penalty-only"
                    checked={penaltyOnlyMode}
                    onCheckedChange={(checked) => {
                      setPenaltyOnlyMode(checked === true)
                      if (checked) {
                        form.setValue('amount', 0)
                      } else if (defaultAmount) {
                        form.setValue('amount', defaultAmount)
                      }
                    }}
                  />
                  <Label htmlFor="penalty-only" className="text-sm font-medium cursor-pointer">
                    Payer uniquement les pénalités (sans mensualité)
                  </Label>
                </div>
                {penaltyOnlyMode && (
                  <div className="mt-3 space-y-2">
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription className="text-xs">
                        En mode "pénalités uniquement", le montant de la mensualité sera à 0. 
                        Vous pouvez sélectionner les pénalités à payer ci-dessous.
                      </AlertDescription>
                    </Alert>
                    <div>
                      <Label htmlFor="penalty-note" className="text-sm">
                        Note pour le paiement des pénalités (sur 10)
                      </Label>
                      <Input
                        id="penalty-note"
                        type="number"
                        min="0"
                        max="10"
                        step="0.1"
                        value={penaltyNote ?? 10}
                        onChange={(e) => {
                          const value = e.target.value ? parseFloat(e.target.value) : 10
                          const finalValue = isNaN(value) ? 10 : value
                          setPenaltyNote(finalValue)
                          // Mettre à jour le commentaire automatiquement selon la note des pénalités
                          const defaultComment = getDefaultCommentByNote(finalValue)
                          form.setValue('comment', defaultComment)
                        }}
                        placeholder="10"
                        className="mt-1"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Note par défaut : 10/10. Vous pouvez modifier cette note si nécessaire.
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Montant et Mode */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {!penaltyOnlyMode && (
              <div>
                <Label htmlFor="amount" className="flex items-center gap-2 mb-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  Montant de la mensualité (FCFA) *
                </Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="100"
                  {...form.register('amount', { valueAsNumber: true })}
                  required
                />
                {form.formState.errors.amount && (
                  <p className="text-sm text-red-600 mt-1">
                    {form.formState.errors.amount.message}
                  </p>
                )}
              </div>
            )}
            <div>
              <Label htmlFor="mode" className="mb-2">Moyen de paiement *</Label>
              <Select
                value={form.watch('mode')}
                onValueChange={(value) => form.setValue('mode', value as CreditPaymentMode)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un moyen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CASH">Espèces</SelectItem>
                  <SelectItem value="MOBILE_MONEY">Mobile Money</SelectItem>
                  <SelectItem value="BANK_TRANSFER">Virement bancaire</SelectItem>
                  <SelectItem value="CHEQUE">Chèque</SelectItem>
                </SelectContent>
              </Select>
              {form.formState.errors.mode && (
                <p className="text-sm text-red-600 mt-1">
                  {form.formState.errors.mode.message}
                </p>
              )}
            </div>
          </div>

          {/* Preuve de paiement */}
          <div>
            <Label htmlFor="proof" className="flex items-center gap-2 mb-2">
              <Upload className="h-4 w-4 text-muted-foreground" />
              Preuve de paiement (recommandé)
            </Label>
            <Input
              id="proof"
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              disabled={isCompressing}
            />
            {isCompressing && (
              <div className="flex items-center gap-2 mt-2 text-sm text-gray-600">
                <Loader2 className="h-4 w-4 animate-spin" />
                Compression de l'image...
              </div>
            )}
            {proofFile && !isCompressing && (
              <Alert className="mt-2">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Fichier sélectionné : {proofFile.name} ({ImageCompressionService.formatFileSize(proofFile.size)})
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Pénalités impayées */}
          {unpaidPenalties.length > 0 && (
            <Card className="border-orange-200 bg-orange-50/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2 text-orange-800">
                  <AlertTriangle className="h-4 w-4" />
                  Pénalités impayées ({unpaidPenalties.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {unpaidPenalties.map((penalty) => (
                  <div
                    key={penalty.id}
                    className="flex items-center justify-between p-3 bg-white rounded-lg border border-orange-200"
                  >
                    <div className="flex items-center gap-3">
                      <Checkbox
                        checked={selectedPenalties.includes(penalty.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedPenalties([...selectedPenalties, penalty.id])
                          } else {
                            setSelectedPenalties(selectedPenalties.filter(id => id !== penalty.id))
                          }
                        }}
                      />
                      <div>
                        <p className="text-sm font-medium">
                          {penalty.daysLate} jour{penalty.daysLate > 1 ? 's' : ''} de retard
                        </p>
                        <p className="text-xs text-gray-600">
                          Échéance : {format(new Date(penalty.dueDate), 'dd/MM/yyyy')}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-orange-600">
                        {penalty.amount.toLocaleString('fr-FR')} FCFA
                      </p>
                    </div>
                  </div>
                ))}
                {totalSelectedPenalties > 0 && (
                  <Alert className="mt-2">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Total pénalités sélectionnées : <strong>{totalSelectedPenalties.toLocaleString('fr-FR')} FCFA</strong>
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          )}

          {/* Pénalité potentielle */}
          {potentialPenalty && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-1">
                  <p className="font-medium">
                    Paiement en retard de {potentialPenalty.daysLate} jour{potentialPenalty.daysLate > 1 ? 's' : ''}
                  </p>
                  <p>
                    Une pénalité de <strong>{potentialPenalty.amount.toLocaleString('fr-FR')} FCFA</strong> sera créée automatiquement pour cette échéance après l'enregistrement du paiement.
                  </p>
                  {defaultPaymentDate && (
                    <p className="text-xs text-gray-600 mt-1">
                      Échéance concernée : {format(new Date(defaultPaymentDate), 'dd/MM/yyyy')}
                    </p>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Total à payer */}
          {(totalSelectedPenalties > 0 || penaltyOnlyMode) && (
            <Card className={penaltyOnlyMode ? "border-purple-200 bg-purple-50/50" : "border-blue-200 bg-blue-50/50"}>
              <CardContent className="pt-4">
                {penaltyOnlyMode ? (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-purple-800">Montant de la mensualité :</span>
                      <span className="text-lg font-bold text-purple-600">
                        0 FCFA (pénalités uniquement)
                      </span>
                    </div>
                    {totalSelectedPenalties > 0 && (
                      <>
                        <div className="flex items-center justify-between mt-2">
                          <span className="font-medium text-purple-800">Pénalités sélectionnées :</span>
                          <span className="text-lg font-bold text-orange-600">
                            {totalSelectedPenalties.toLocaleString('fr-FR')} FCFA
                          </span>
                        </div>
                        <div className="flex items-center justify-between mt-3 pt-3 border-t border-purple-300">
                          <span className="text-lg font-bold text-purple-800">Total à payer :</span>
                          <span className="text-xl font-bold text-purple-600">
                            {totalSelectedPenalties.toLocaleString('fr-FR')} FCFA
                          </span>
                        </div>
                      </>
                    )}
                  </>
                ) : (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-blue-800">Montant du versement :</span>
                      <span className="text-lg font-bold text-blue-600">
                        {form.watch('amount')?.toLocaleString('fr-FR') || 0} FCFA
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <span className="font-medium text-blue-800">Pénalités sélectionnées :</span>
                      <span className="text-lg font-bold text-orange-600">
                        +{totalSelectedPenalties.toLocaleString('fr-FR')} FCFA
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-blue-300">
                      <span className="text-lg font-bold text-blue-800">Total à payer :</span>
                      <span className="text-xl font-bold text-blue-600">
                        {totalToPay.toLocaleString('fr-FR')} FCFA
                      </span>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {/* Note pour paiement normal (si pas en mode pénalités uniquement) */}
          {!penaltyOnlyMode && (
            <>
              <div>
                <Label htmlFor="note" className="mb-2">Note (sur 10)</Label>
                <Input
                  id="note"
                  type="number"
                  min="0"
                  max="10"
                  step="0.1"
                  {...form.register('note', { 
                    valueAsNumber: true,
                    setValueAs: (value) => {
                      if (value === '' || value === null || value === undefined) {
                        return autoNote // Valeur par défaut selon le retard
                      }
                      const num = typeof value === 'string' ? parseFloat(value) : value
                      return isNaN(num) ? autoNote : num
                    },
                    onChange: (e) => {
                      const noteValue = parseFloat(e.target.value) || autoNote
                      // Mettre à jour le commentaire automatiquement selon la note
                      const defaultComment = getDefaultCommentByNote(noteValue)
                      form.setValue('comment', defaultComment)
                    }
                  })}
                  placeholder={autoNote.toString()}
                />
                <p className="text-xs text-gray-500 mt-1">
                  {calculateDelay > 0 ? (
                    <>Note automatique : {autoNote}/10 (retard de {calculateDelay} jour{calculateDelay > 1 ? 's' : ''}). Vous pouvez modifier cette note si nécessaire.</>
                  ) : (
                    <>Note par défaut : {autoNote}/10 (paiement ponctuel). Vous pouvez modifier cette note si nécessaire.</>
                  )}
                </p>
                {form.formState.errors.note && (
                  <p className="text-sm text-red-600 mt-1">
                    {form.formState.errors.note.message}
                  </p>
                )}
              </div>
            </>
          )}

          {/* Commentaire */}
          <div>
            <Label htmlFor="comment" className="mb-2">
              Commentaire {penaltyOnlyMode ? '(optionnel)' : '(généré automatiquement selon la note, modifiable)'}
            </Label>
            <Textarea
              id="comment"
              {...form.register('comment')}
              rows={3}
              placeholder={penaltyOnlyMode 
                ? "Ajoutez un commentaire si nécessaire..." 
                : "Le commentaire est généré automatiquement selon la note attribuée..."
              }
            />
            {!penaltyOnlyMode && (
              <p className="text-xs text-gray-500 mt-1">
                Le commentaire est généré automatiquement selon la note. Vous pouvez le modifier si nécessaire.
              </p>
            )}
            {form.formState.errors.comment && (
              <p className="text-sm text-red-600 mt-1">
                {form.formState.errors.comment.message}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || isCompressing}
              className="bg-gradient-to-r from-[#234D65] to-[#2c5a73] hover:from-[#2c5a73] hover:to-[#234D65]"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Enregistrement...
                </>
              ) : (
                'Enregistrer le versement'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

