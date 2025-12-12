'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  ArrowLeft,
  User,
  DollarSign,
  Calendar,
  Shield,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  FileText,
  RotateCcw,
  Calculator,
  Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { CreditDemand, CreditDemandStatus } from '@/types/types'
import routes from '@/constantes/routes'
import ValidateDemandModal from './ValidateDemandModal'
import ReopenDemandModal from './ReopenDemandModal'
import CreditSimulationModal from './CreditSimulationModal'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { useCreditContractMutations } from '@/hooks/useCreditSpeciale'
import { toast } from 'sonner'
import type { StandardSimulation, CustomSimulation } from '@/types/types'

interface CreditDemandDetailProps {
  demand: CreditDemand
}

const getStatusConfig = (status: CreditDemandStatus) => {
  const configs: Record<CreditDemandStatus, { label: string; color: string; bgColor: string }> = {
    PENDING: { label: 'En attente', color: 'text-yellow-600', bgColor: 'bg-yellow-100' },
    APPROVED: { label: 'Approuvée', color: 'text-green-600', bgColor: 'bg-green-100' },
    REJECTED: { label: 'Rejetée', color: 'text-red-600', bgColor: 'bg-red-100' },
  }
  return configs[status] || configs.PENDING
}

const getCreditTypeLabel = (type: string) => {
  const labels: Record<string, string> = {
    SPECIALE: 'Spéciale',
    FIXE: 'Fixe',
    AIDE: 'Aide',
  }
  return labels[type] || type
}

export default function CreditDemandDetail({ demand }: CreditDemandDetailProps) {
  const router = useRouter()
  const [validateModalState, setValidateModalState] = useState<{
    isOpen: boolean
    action: 'approve' | 'reject'
  }>({
    isOpen: false,
    action: 'approve',
  })
  const [reopenModalState, setReopenModalState] = useState<{
    isOpen: boolean
  }>({
    isOpen: false,
  })
  const [simulationModalState, setSimulationModalState] = useState<{
    isOpen: boolean
  }>({
    isOpen: false,
  })
  const { createFromDemand } = useCreditContractMutations()

  const statusConfig = getStatusConfig(demand.status)
  const formatDate = (date: Date | undefined) => {
    if (!date) return 'N/A'
    return format(new Date(date), 'dd MMMM yyyy', { locale: fr })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => router.push(routes.admin.creditSpecialeDemandes)}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour aux demandes
          </Button>
          <Badge className={cn('px-4 py-1.5 text-sm font-medium', statusConfig.bgColor, statusConfig.color)}>
            {statusConfig.label}
          </Badge>
        </div>

        {/* Informations principales */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Informations de la demande */}
          <Card className="border-0 shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Informations de la demande
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-gray-600">ID de la demande</p>
                <p className="text-lg font-semibold font-mono">{demand.id}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Type de crédit</p>
                <p className="text-lg font-semibold">{getCreditTypeLabel(demand.creditType)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Montant demandé</p>
                <p className="text-lg font-semibold">{demand.amount.toLocaleString('fr-FR')} FCFA</p>
              </div>
              {demand.monthlyPaymentAmount && (
                <div>
                  <p className="text-sm text-gray-600">Mensualité souhaitée</p>
                  <p className="text-lg font-semibold">{demand.monthlyPaymentAmount.toLocaleString('fr-FR')} FCFA</p>
                </div>
              )}
              <div>
                <p className="text-sm text-gray-600">Date de création</p>
                <p className="text-lg font-semibold">{formatDate(demand.createdAt)}</p>
              </div>
              {demand.updatedAt && (
                <div>
                  <p className="text-sm text-gray-600">Dernière mise à jour</p>
                  <p className="text-lg font-semibold">{formatDate(demand.updatedAt)}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Informations client */}
          <Card className="border-0 shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Informations client
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-gray-600">Nom complet</p>
                <p className="text-lg font-semibold">{demand.clientFirstName} {demand.clientLastName}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Contacts</p>
                <p className="text-lg font-semibold">{demand.clientContacts.join(', ')}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Cause */}
        <Card className="border-0 shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Motif de la demande
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700 whitespace-pre-wrap">{demand.cause}</p>
          </CardContent>
        </Card>

        {/* Garant */}
        {demand.guarantorId && (
          <Card className="border-0 shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Informations garant
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-gray-600">Nom complet</p>
                <p className="text-lg font-semibold">
                  {demand.guarantorFirstName} {demand.guarantorLastName}
                </p>
              </div>
              {demand.guarantorRelation && (
                <div>
                  <p className="text-sm text-gray-600">Relation</p>
                  <p className="text-lg font-semibold">{demand.guarantorRelation}</p>
                </div>
              )}
              <div>
                <p className="text-sm text-gray-600">Type</p>
                <Badge variant="outline" className="mt-1">
                  {demand.guarantorIsMember ? 'Membre' : 'Non-membre'}
                </Badge>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Motif d'approbation ou de rejet */}
        {demand.adminComments && (
          <Card className={cn(
            "border-0 shadow-xl",
            demand.status === 'APPROVED' ? "bg-green-50/50 border-green-200" :
            demand.status === 'REJECTED' ? "bg-red-50/50 border-red-200" :
            "bg-gray-50/50"
          )}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {demand.status === 'APPROVED' ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : demand.status === 'REJECTED' ? (
                  <XCircle className="h-5 w-5 text-red-600" />
                ) : (
                  <AlertCircle className="h-5 w-5" />
                )}
                {demand.status === 'APPROVED' ? 'Motif d\'approbation' : demand.status === 'REJECTED' ? 'Motif du rejet' : 'Commentaires'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 whitespace-pre-wrap">{demand.adminComments}</p>
              {demand.updatedBy && (
                <p className="text-xs text-gray-500 mt-2">
                  Par l'administrateur • {formatDate(demand.updatedAt)}
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Score (admin only) */}
        {demand.score !== undefined && (
          <Card className="border-0 shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                Score de fiabilité
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <Badge className={cn(
                  "text-2xl font-bold px-6 py-3",
                  demand.score >= 8 ? "bg-green-100 text-green-700" :
                  demand.score >= 5 ? "bg-yellow-100 text-yellow-700" :
                  "bg-red-100 text-red-700"
                )}>
                  {demand.score}/10
                </Badge>
                {demand.scoreUpdatedAt && (
                  <p className="text-sm text-gray-500">
                    Mis à jour le {formatDate(demand.scoreUpdatedAt)}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Dérogation */}
        {demand.eligibilityOverride && (
          <Card className="border-0 shadow-xl border-orange-200 bg-orange-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-orange-800">
                <AlertCircle className="h-5 w-5" />
                Dérogation appliquée
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-sm text-gray-600">Justification</p>
                <p className="text-gray-700">{demand.eligibilityOverride.justification}</p>
                <div className="flex items-center gap-4 mt-4 text-sm text-gray-600">
                  <span>Par: {demand.eligibilityOverride.adminName}</span>
                  <span>Le: {formatDate(demand.eligibilityOverride.createdAt)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        {demand.status === 'PENDING' && (
          <Card className="border-0 shadow-xl">
            <CardContent className="p-6">
              <div className="flex gap-4">
                <Button
                  onClick={() => setValidateModalState({ isOpen: true, action: 'approve' })}
                  className="flex-1 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Approuver la demande
                </Button>
                <Button
                  onClick={() => setValidateModalState({ isOpen: true, action: 'reject' })}
                  variant="destructive"
                  className="flex-1 bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Rejeter la demande
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Action de création de contrat */}
        {demand.status === 'APPROVED' && (
          <Card className="border-0 shadow-xl">
            <CardContent className="p-6">
              <Button
                onClick={() => setSimulationModalState({ isOpen: true })}
                disabled={createFromDemand.isPending}
                className="w-full bg-gradient-to-r from-[#234D65] to-[#2c5a73] hover:from-[#2c5a73] hover:to-[#234D65]"
              >
                {createFromDemand.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Création en cours...
                  </>
                ) : (
                  <>
                    <Calculator className="h-4 w-4 mr-2" />
                    Créer le contrat
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Action de réouverture */}
        {demand.status === 'REJECTED' && (
          <Card className="border-0 shadow-xl">
            <CardContent className="p-6">
              <Button
                onClick={() => setReopenModalState({ isOpen: true })}
                className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Réouvrir la demande
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Modal de validation/rejet */}
      <ValidateDemandModal
        isOpen={validateModalState.isOpen}
        onClose={() => setValidateModalState({ isOpen: false, action: 'approve' })}
        demand={demand}
        action={validateModalState.action}
        onSuccess={() => {
          router.push(routes.admin.creditSpecialeDemandes)
        }}
      />

      {/* Modal de réouverture */}
      <ReopenDemandModal
        isOpen={reopenModalState.isOpen}
        onClose={() => setReopenModalState({ isOpen: false })}
        demand={demand}
        onSuccess={() => {
          router.push(routes.admin.creditSpecialeDemandes)
        }}
      />

      {/* Modal de simulation et création de contrat */}
      <CreditSimulationModal
        isOpen={simulationModalState.isOpen}
        onClose={() => setSimulationModalState({ isOpen: false })}
        creditType={demand.creditType}
        initialAmount={demand.amount}
        initialMonthlyPayment={demand.monthlyPaymentAmount}
        onSimulationComplete={async (simulation: StandardSimulation | CustomSimulation) => {
          try {
            // Convertir la simulation en format attendu par createFromDemand
            const simulationData = {
              interestRate: simulation.interestRate,
              monthlyPaymentAmount: 'monthlyPayment' in simulation 
                ? simulation.monthlyPayment 
                : simulation.monthlyPayments.length > 0 
                  ? simulation.monthlyPayments[0].amount 
                  : simulation.amount / simulation.duration,
              duration: simulation.duration,
              firstPaymentDate: simulation.firstPaymentDate,
              totalAmount: simulation.totalAmount,
            }

            await createFromDemand.mutateAsync({
              demandId: demand.id,
              simulationData,
            })

            toast.success('Contrat créé avec succès')
            router.push(routes.admin.creditSpecialeContrats)
          } catch (error: any) {
            console.error('Erreur lors de la création du contrat:', error)
            toast.error(error?.message || 'Erreur lors de la création du contrat')
          }
        }}
      />
    </div>
  )
}

