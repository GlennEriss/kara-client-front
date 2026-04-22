'use client'

import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
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
import { useAdmin } from '@/hooks/admin/useAdmin'
import { useAgentsActifs } from '@/hooks/agent-recouvrement'
import { useAuth } from '@/hooks/useAuth'
import { generateSingleVersementCIPDF } from '@/services/caisse-imprevue/generateSingleVersementCIPDF'
import { ContractCI, PaymentCI, VersementCI } from '@/types/types'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import {
    Banknote,
    Building2,
    Calendar,
    CheckCircle,
    Clock,
    CreditCard,
    DollarSign,
    Download,
    FileText,
    Image as ImageIcon,
    Loader2,
    Maximize2,
    Pencil,
    Receipt,
    Smartphone,
    Trash2,
    User,
    X,
} from 'lucide-react'
import Image from 'next/image'
import React, { useState } from 'react'
import { toast } from 'sonner'

// Helper pour formater les montants correctement dans l'UI
const formatAmount = (amount: number): string => {
  return amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}

interface PaymentReceiptCIModalProps {
  isOpen: boolean
  onClose: () => void
  contract: ContractCI
  payment: PaymentCI
  isMonthly?: boolean
  /** Si fourni, affiche un bouton "Modifier le versement" (contrat non terminé) */
  onEditClick?: () => void
  /** Si fourni et type Quotidien, affiche un bouton "Supprimer le versement" (contrat actif uniquement). Peut être async. */
  onDeleteClick?: () => void | Promise<void>
}

const PAYMENT_MODE_LABELS = {
  airtel_money: { label: 'Airtel Money', icon: Smartphone, color: 'text-red-600', bg: 'bg-red-100' },
  mobicash: { label: 'Mobicash', icon: Banknote, color: 'text-blue-600', bg: 'bg-blue-100' },
  cash: { label: 'Espèce', icon: DollarSign, color: 'text-green-600', bg: 'bg-green-100' },
  bank_transfer: { label: 'Virement bancaire', icon: Building2, color: 'text-purple-600', bg: 'bg-purple-100' },
  other: { label: 'Autre', icon: CreditCard, color: 'text-gray-600', bg: 'bg-gray-100' },
}

const getPaymentModeLabel = (versement: VersementCI, defaultLabel: string): string => {
  if (versement.mode === 'other' && versement.paymentMethodOther?.trim()) {
    return `Autre (${versement.paymentMethodOther.trim()})`
  }

  if ((versement.mode === 'airtel_money' || versement.mode === 'mobicash') && versement.withFees !== undefined) {
    return `${defaultLabel} (${versement.withFees ? 'Avec frais' : 'Sans frais'})`
  }

  return defaultLabel
}

export default function PaymentReceiptCIModal({
  isOpen,
  onClose,
  contract,
  payment,
  isMonthly = true,
  onEditClick,
  onDeleteClick,
}: PaymentReceiptCIModalProps) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false)
  const [showConfirmDelete, setShowConfirmDelete] = useState(false)
  const { data: admin, isLoading: isLoadingAdmin } = useAdmin(payment.updatedBy ?? '')
  const { user } = useAuth()
  const { data: agents = [] } = useAgentsActifs()
  const agentsMap = React.useMemo(() => Object.fromEntries(agents.map((a) => [a.id, a])), [agents])

  const adminInfo = React.useMemo(() => {
    if (!payment.updatedBy) return null
    if (user?.uid === payment.updatedBy && user?.displayName) {
      const parts = user.displayName.split(' ')
      return { firstName: parts[0] || 'Utilisateur', lastName: parts.slice(1).join(' ') || '' }
    }
    if (admin) return { firstName: admin.firstName, lastName: admin.lastName }
    return null
  }, [user, admin, payment.updatedBy])
  
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'dd MMMM yyyy', { locale: fr })
    } catch {
      return dateString
    }
  }

  const _loadImageAsBase64 = async (url: string): Promise<string> => {
    try {
      const response = await fetch(url)
      const blob = await response.blob()
      return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onloadend = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(blob)
      })
    } catch (error) {
      console.error('Erreur lors du chargement de l\'image:', error)
      return ''
    }
  }

  const handleDownloadPDF = async () => {
    try {
      setIsGeneratingPDF(true)
      toast.info('Génération du PDF en cours...')
      const getAdminDisplayName = (adminId: string | undefined) => {
        if (adminId === payment.updatedBy && adminInfo)
          return `${adminInfo.firstName} ${adminInfo.lastName}`
        return adminId || '-'
      }
      await generateSingleVersementCIPDF(contract, payment, {
        contractId: contract.id,
        getAdminDisplayName,
      })
      toast.success('PDF téléchargé avec succès')
    } catch (error) {
      console.error('Erreur lors de la génération du PDF:', error)
      toast.error('Erreur lors de la génération du PDF')
    } finally {
      setIsGeneratingPDF(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-[#224D62] flex items-center gap-2">
            <Receipt className="h-6 w-6" />
            Reçu de Paiement
          </DialogTitle>
          <DialogDescription>
            {isMonthly 
              ? `Récapitulatif des versements pour le mois M${payment.monthIndex + 1}`
              : `Récapitulatif du versement quotidien`
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Informations du contrat */}
          <Card className="border-0 shadow-md bg-gradient-to-r from-[#234D65]/5 to-[#2c5a73]/5">
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <User className="h-4 w-4" />
                    <span className="font-medium">Membre</span>
                  </div>
                  <p className="font-semibold text-gray-900">
                    {contract.memberFirstName} {contract.memberLastName}
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <FileText className="h-4 w-4" />
                    <span className="font-medium">N° Contrat</span>
                  </div>
                  <p className="font-semibold text-gray-900 font-mono">
                    {contract.id.slice(-8).toUpperCase()}
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CreditCard className="h-4 w-4" />
                    <span className="font-medium">Forfait</span>
                  </div>
                  <p className="font-semibold text-gray-900">
                    {contract.subscriptionCICode} - {contract.subscriptionCILabel || 'Caisse Imprévue'}
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span className="font-medium">Période</span>
                  </div>
                  <p className="font-semibold text-gray-900">
                    {isMonthly ? `Mois ${payment.monthIndex + 1}` : formatDate(payment.versements[0]?.date || '')}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Statut du paiement */}
          <div className="flex items-center justify-between p-4 bg-green-50 border-2 border-green-200 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-full">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="font-semibold text-green-900">Paiement Complété</p>
                <p className="text-sm text-green-700">
                  {payment.versements.length} versement{payment.versements.length > 1 ? 's' : ''} enregistré{payment.versements.length > 1 ? 's' : ''}
                </p>
              </div>
            </div>
            <Badge className="bg-green-600 text-white text-lg px-4 py-2">
              {payment.accumulatedAmount.toLocaleString('fr-FR')} FCFA
            </Badge>
          </div>

          {/* Liste des versements */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-[#224D62]" />
              Détails des Versements
            </h3>
            
            <div className="space-y-3">
              {payment.versements.map((versement: VersementCI, index: number) => {
                const modeConfig = PAYMENT_MODE_LABELS[versement.mode]
                const ModeIcon = modeConfig.icon

                return (
                  <Card key={versement.id} className="border-2 hover:border-[#224D62] transition-colors">
                    <CardContent className="p-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Informations du versement */}
                        <div className="md:col-span-2 space-y-3">
                          <div className="flex items-center gap-3 flex-wrap">
                            <Badge variant="outline" className="font-mono">
                              #{index + 1}
                            </Badge>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Calendar className="h-4 w-4" />
                              <span>{formatDate(versement.date)}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Clock className="h-4 w-4" />
                              <span>{versement.time}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 flex-wrap">
                            <div className={`flex items-center gap-2 px-3 py-1 rounded-lg ${modeConfig.bg}`}>
                              <ModeIcon className={`h-4 w-4 ${modeConfig.color}`} />
                              <span className={`text-sm font-medium ${modeConfig.color}`}>
                                {getPaymentModeLabel(versement, modeConfig.label)}
                              </span>
                            </div>
                            
                            {versement.penalty && versement.penalty > 0 && (
                              <Badge variant="destructive">
                                Pénalité: {versement.penalty.toLocaleString('fr-FR')} FCFA
                              </Badge>
                            )}
                          </div>

                          {versement.agentRecouvrementId && agentsMap[versement.agentRecouvrementId] && (
                            <div className="flex items-center gap-2 text-sm text-[#224D62]">
                              <User className="h-4 w-4" />
                              <span className="font-medium">Agent de recouvrement :</span>
                              <span>
                                {agentsMap[versement.agentRecouvrementId].nom} {agentsMap[versement.agentRecouvrementId].prenom}
                              </span>
                            </div>
                          )}

                          <div className="pt-2">
                            <p className="text-2xl font-bold text-[#224D62]">
                              {versement.amount.toLocaleString('fr-FR')} <span className="text-sm">FCFA</span>
                            </p>
                          </div>
                        </div>

                        {/* Preuve de paiement */}
                        <div className="flex flex-col items-center justify-center">
                          <div className="w-full aspect-[4/3] relative bg-gray-100 rounded-lg overflow-hidden border-2 border-gray-200 hover:border-[#224D62] transition-colors group cursor-pointer"
                               onClick={() => setSelectedImage(versement.proofUrl)}>
                            <Image
                              src={versement.proofUrl}
                              alt={`Preuve de paiement #${index + 1}`}
                              fill
                              className="object-cover"
                              sizes="(max-width: 768px) 100vw, 300px"
                            />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center">
                              <Maximize2 className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                          </div>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-2">
                            <ImageIcon className="h-3 w-3" />
                            <span>Cliquer pour agrandir</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>

          {/* Modification du versement (si le paiement a été modifié) */}
          {(payment.modificationReason ?? payment.updatedAt) && (
            <div className="space-y-3">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <Pencil className="h-4 w-4" />
                Modification du versement
              </h3>
              <div className="space-y-3 p-4 rounded-lg border bg-amber-50 border-amber-200">
                {payment.updatedAt && (() => {
                  const u = payment.updatedAt
                  const modDate = u instanceof Date ? u : typeof (u as any)?.toDate === 'function' ? (u as any).toDate() : u ? new Date(u as string | number) : null
                  if (!modDate || isNaN(modDate.getTime())) return null
                  return (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Date de modification :</span>
                      <span className="font-medium">{modDate.toLocaleDateString('fr-FR')} à {modDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  )
                })()}
                {payment.updatedBy && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Modifié par :</span>
                    <span className="font-medium text-right">
                      {isLoadingAdmin ? (
                        <span className="text-gray-500">Chargement...</span>
                      ) : adminInfo ? (
                        <>
                          {adminInfo.firstName} {adminInfo.lastName}
                          <span className="block text-xs text-gray-500 font-normal mt-0.5">
                            Matricule : {payment.updatedBy}
                          </span>
                        </>
                      ) : (
                        <span className="text-gray-500">ID: {payment.updatedBy}</span>
                      )}
                    </span>
                  </div>
                )}
                {payment.modificationReason && (
                  <div className="pt-2 border-t border-amber-200">
                    <span className="text-gray-600 block mb-1">Motif de la modification :</span>
                    <p className="font-medium text-gray-900 bg-white p-3 rounded border border-amber-100">
                      {payment.modificationReason}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Résumé */}
          <Card className="border-2 border-[#224D62] bg-gradient-to-r from-[#234D65]/10 to-[#2c5a73]/10">
            <CardContent className="p-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between text-lg">
                  <span className="text-gray-700">Objectif mensuel:</span>
                  <span className="font-semibold text-gray-900">
                    {payment.targetAmount.toLocaleString('fr-FR')} FCFA
                  </span>
                </div>
                
                <div className="flex items-center justify-between text-lg">
                  <span className="text-gray-700">Nombre de versements:</span>
                  <span className="font-semibold text-gray-900">
                    {payment.versements.length}
                  </span>
                </div>

                <div className="h-px bg-gray-300 my-2"></div>

                <div className="flex items-center justify-between text-2xl">
                  <span className="font-bold text-gray-900">TOTAL VERSÉ:</span>
                  <span className="font-black text-[#224D62]">
                    {payment.accumulatedAmount.toLocaleString('fr-FR')} FCFA
                  </span>
                </div>

                {payment.accumulatedAmount >= payment.targetAmount && (
                  <div className="flex items-center gap-2 text-green-600 text-sm mt-2">
                    <CheckCircle className="h-4 w-4" />
                    <span>Objectif mensuel atteint</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <DialogFooter className="gap-2 flex-wrap">
          {onEditClick && (
            <Button
              type="button"
              variant="outline"
              onClick={() => onEditClick()}
              disabled={isGeneratingPDF}
              className="gap-2 border-amber-300 text-amber-700 hover:bg-amber-50"
            >
              <Pencil className="h-4 w-4" />
              Modifier le versement
            </Button>
          )}
          {!isMonthly && onDeleteClick && (
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowConfirmDelete(true)}
              disabled={isGeneratingPDF}
              className="gap-2 border-red-300 text-red-700 hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4" />
              Supprimer le versement
            </Button>
          )}
          <Button
            variant="outline"
            onClick={handleDownloadPDF}
            disabled={isGeneratingPDF}
            className="gap-2"
          >
            {isGeneratingPDF ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Génération en cours...
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                Télécharger en PDF
              </>
            )}
          </Button>
          <Button
            onClick={onClose}
            disabled={isGeneratingPDF}
            className="bg-gradient-to-r from-[#234D65] to-[#2c5a73]"
          >
            Fermer
          </Button>
        </DialogFooter>
      </DialogContent>

      {/* Confirmation suppression versement (Quotidien) */}
      <AlertDialog open={showConfirmDelete} onOpenChange={setShowConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="h-5 w-5" />
              Supprimer ce versement
            </AlertDialogTitle>
            <AlertDialogDescription>
              Vous avez enregistré ce versement à une mauvaise date. La suppression retire le versement et recalcule les totaux du mois. Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={async () => {
                await onDeleteClick?.()
                setShowConfirmDelete(false)
                onClose()
              }}
            >
              Supprimer le versement
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal d'image en plein écran */}
      {selectedImage && (
        <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
          <DialogContent className="max-w-5xl max-h-[95vh] p-0">
            <div className="relative w-full h-[90vh] bg-black">
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-4 right-4 z-10 bg-white/10 hover:bg-white/20 text-white"
                onClick={() => setSelectedImage(null)}
              >
                <X className="h-6 w-6" />
              </Button>
              <Image
                src={selectedImage}
                alt="Preuve de paiement en plein écran"
                fill
                className="object-contain p-4"
                sizes="(max-width: 1200px) 100vw, 1200px"
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </Dialog>
  )
}
