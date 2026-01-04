'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  ArrowLeft,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  User,
  DollarSign,
  AlertCircle,
  RotateCcw,
  CreditCard,
  Loader2,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useCaisseImprevueDemand, useCaisseImprevueDemandMutations } from '@/hooks/caisse-imprevue/useCaisseImprevueDemands'
import { CaisseImprevueDemandStatus } from '@/types/types'
import { cn } from '@/lib/utils'
import routes from '@/constantes/routes'
import AcceptDemandModal from './AcceptDemandModal'
import RejectDemandModal from './RejectDemandModal'
import ReopenDemandModal from './ReopenDemandModal'
import { useState } from 'react'

interface DemandDetailProps {
  demandId: string
}

export default function DemandDetail({ demandId }: DemandDetailProps) {
  const router = useRouter()
  const { data: demand, isLoading, error } = useCaisseImprevueDemand(demandId)
  const { convert } = useCaisseImprevueDemandMutations()
  
  const [acceptModalOpen, setAcceptModalOpen] = useState(false)
  const [rejectModalOpen, setRejectModalOpen] = useState(false)
  const [reopenModalOpen, setReopenModalOpen] = useState(false)

  const getStatusColor = (status: CaisseImprevueDemandStatus) => {
    const colors = {
      PENDING: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      APPROVED: 'bg-green-100 text-green-700 border-green-200',
      REJECTED: 'bg-red-100 text-red-700 border-red-200',
      CONVERTED: 'bg-blue-100 text-blue-700 border-blue-200',
      REOPENED: 'bg-purple-100 text-purple-700 border-purple-200',
    }
    return colors[status] || colors.PENDING
  }

  const getStatusLabel = (status: CaisseImprevueDemandStatus) => {
    const labels = {
      PENDING: 'En attente',
      APPROVED: 'Acceptée',
      REJECTED: 'Refusée',
      CONVERTED: 'Convertie',
      REOPENED: 'Réouverte',
    }
    return labels[status] || status
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-64" />
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error || !demand) {
    return (
      <div className="space-y-6">
        <Button
          variant="outline"
          onClick={() => router.push(routes.admin.caisseImprevueDemandes)}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour à la liste
        </Button>
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error instanceof Error ? error.message : 'Demande non trouvée'}
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={() => router.push(routes.admin.caisseImprevueDemandes)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Détails de la demande</h1>
            <p className="text-gray-600 mt-1">ID: {demand.id}</p>
          </div>
        </div>
        <Badge className={cn('px-3 py-1', getStatusColor(demand.status))}>
          {getStatusLabel(demand.status)}
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Informations générales
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Membre:</span>
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-gray-400" />
                <span className="font-medium">
                  {demand.memberFirstName} {demand.memberLastName}
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Forfait:</span>
              <Badge variant="outline">
                {demand.subscriptionCICode} {demand.subscriptionCILabel && `- ${demand.subscriptionCILabel}`}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Fréquence:</span>
              <Badge variant="outline">
                {demand.paymentFrequency === 'DAILY' ? 'Journalière' : 'Mensuelle'}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Montant mensuel:</span>
              <span className="font-semibold text-green-600">
                {demand.subscriptionCIAmountPerMonth.toLocaleString('fr-FR')} FCFA
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Montant nominal:</span>
              <span className="font-semibold text-blue-600">
                {demand.subscriptionCINominal.toLocaleString('fr-FR')} FCFA
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Durée:</span>
              <span className="font-medium">{demand.subscriptionCIDuration} mois</span>
            </div>
            {demand.desiredDate && (
              <div className="flex items-center justify-between">
                <span className="text-gray-600 flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  Date souhaitée:
                </span>
                <span className="font-medium">
                  {new Date(demand.desiredDate).toLocaleDateString('fr-FR', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric',
                  })}
                </span>
              </div>
            )}
            {demand.firstPaymentDate && (
              <div className="flex items-center justify-between">
                <span className="text-gray-600 flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  Premier paiement:
                </span>
                <span className="font-medium">
                  {new Date(demand.firstPaymentDate).toLocaleDateString('fr-FR', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric',
                  })}
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Historique
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Créée le:</span>
              <span className="font-medium">
                {new Date(demand.createdAt).toLocaleDateString('fr-FR', {
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
            {demand.decisionMadeAt && (
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Décision prise le:</span>
                <span className="font-medium">
                  {new Date(demand.decisionMadeAt).toLocaleDateString('fr-FR', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            )}
            {demand.decisionMadeByName && (
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Décision par:</span>
                <span className="font-medium">{demand.decisionMadeByName}</span>
              </div>
            )}
            {demand.contractId && (
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Contrat créé:</span>
                <Button
                  variant="link"
                  onClick={() => router.push(routes.admin.caisseImprevueContractDetails(demand.contractId!))}
                  className="p-0 h-auto"
                >
                  {demand.contractId}
                </Button>
              </div>
            )}
            {demand.reopenedAt && (
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Réouverte le:</span>
                <span className="font-medium">
                  {new Date(demand.reopenedAt).toLocaleDateString('fr-FR', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            )}
            {demand.reopenedByName && (
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Réouverte par:</span>
                <span className="font-medium">{demand.reopenedByName}</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Contact d'urgence */}
      {demand.emergencyContact && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Contact d'urgence
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Nom:</span>
              <span className="font-medium">
                {demand.emergencyContact.lastName} {demand.emergencyContact.firstName}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Téléphone:</span>
              <span className="font-medium">
                {demand.emergencyContact.phone1}
                {demand.emergencyContact.phone2 && ` / ${demand.emergencyContact.phone2}`}
              </span>
            </div>
            {demand.emergencyContact.relationship && (
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Lien:</span>
                <span className="font-medium">{demand.emergencyContact.relationship}</span>
              </div>
            )}
            {demand.emergencyContact.idNumber && (
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Document:</span>
                <span className="font-medium">
                  {demand.emergencyContact.typeId} - {demand.emergencyContact.idNumber}
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Cause/Motif */}
      {demand.cause && (
        <Card>
          <CardHeader>
            <CardTitle>Cause / Motif</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700 whitespace-pre-wrap">{demand.cause}</p>
          </CardContent>
        </Card>
      )}

      {/* Raison de décision */}
      {demand.decisionReason && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {demand.status === 'APPROVED' ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : demand.status === 'REJECTED' ? (
                <XCircle className="h-5 w-5 text-red-600" />
              ) : (
                <FileText className="h-5 w-5" />
              )}
              Raison de la décision
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700 whitespace-pre-wrap">{demand.decisionReason}</p>
          </CardContent>
        </Card>
      )}

      {/* Motif de réouverture */}
      {demand.reopenReason && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RotateCcw className="h-5 w-5 text-blue-600" />
              Motif de réouverture
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700 whitespace-pre-wrap">{demand.reopenReason}</p>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      {demand.status === 'PENDING' && (
        <Card>
          <CardContent className="p-6">
            <div className="flex gap-4">
              <Button
                onClick={() => setAcceptModalOpen(true)}
                className="flex-1 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Accepter la demande
              </Button>
              <Button
                onClick={() => setRejectModalOpen(true)}
                variant="destructive"
                className="flex-1"
              >
                <XCircle className="h-4 w-4 mr-2" />
                Refuser la demande
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {demand.status === 'REJECTED' && (
        <Card>
          <CardContent className="p-6">
            <Button
              onClick={() => setReopenModalOpen(true)}
              className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Réouvrir la demande
            </Button>
          </CardContent>
        </Card>
      )}

      {demand.status === 'APPROVED' && !demand.contractId && (
        <Card>
          <CardContent className="p-6">
            <Button
              onClick={async () => {
                try {
                  const result = await convert.mutateAsync({
                    demandId: demand.id,
                  })
                  if (result?.contract) {
                    router.push(routes.admin.caisseImprevueContractDetails(result.contract.id))
                  }
                } catch (error) {
                  console.error('Erreur lors de la conversion:', error)
                }
              }}
              disabled={convert.isPending}
              className="w-full bg-gradient-to-r from-[#234D65] to-[#2c5a73] hover:from-[#2c5a73] hover:to-[#234D65]"
            >
              {convert.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Création du contrat...
                </>
              ) : (
                <>
                  <CreditCard className="h-4 w-4 mr-2" />
                  Créer le contrat
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {demand.status === 'APPROVED' && demand.contractId && (
        <Card>
          <CardContent className="p-6">
            <Button
              onClick={() => router.push(routes.admin.caisseImprevueContractDetails(demand.contractId!))}
              className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
            >
              <CreditCard className="h-4 w-4 mr-2" />
              Voir le contrat créé
            </Button>
          </CardContent>
        </Card>
      )}

      <AcceptDemandModal
        isOpen={acceptModalOpen}
        onClose={() => setAcceptModalOpen(false)}
        demand={demand}
        onSuccess={() => {
          setAcceptModalOpen(false)
        }}
      />

      <RejectDemandModal
        isOpen={rejectModalOpen}
        onClose={() => setRejectModalOpen(false)}
        demand={demand}
        onSuccess={() => {
          setRejectModalOpen(false)
        }}
      />

      <ReopenDemandModal
        isOpen={reopenModalOpen}
        onClose={() => setReopenModalOpen(false)}
        demand={demand}
        onSuccess={() => {
          setReopenModalOpen(false)
        }}
      />
    </div>
  )
}

