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
  AlertCircle,
  RotateCcw,
  FilePlus2,
  Loader2,
  FileDown,
  Phone,
  Mail,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useCaisseSpecialeDemand, useCaisseSpecialeDemandMutations } from '@/hooks/caisse-speciale/useCaisseSpecialeDemands'
import { useExportCaisseSpecialeDemandDetails } from '@/hooks/caisse-speciale/useExportCaisseSpecialeDemandDetails'
import { useMember } from '@/hooks/useMembers'
import { useActiveCaisseSettingsByType } from '@/hooks/useCaisseSettings'
import { CaisseSpecialeDemandStatus } from '@/types/types'
import { cn } from '@/lib/utils'
import routes from '@/constantes/routes'
import AcceptDemandModal from './AcceptDemandModal'
import RejectDemandModal from './RejectDemandModal'
import ReopenDemandModal from './ReopenDemandModal'
import { useState, useMemo } from 'react'
import { toast } from 'sonner'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface DemandDetailProps {
  demandId: string
}

export default function DemandDetail({ demandId }: DemandDetailProps) {
  const router = useRouter()
  const { data: demand, isLoading, error } = useCaisseSpecialeDemand(demandId)
  const { data: member } = useMember(demand?.memberId)
  const activeSettings = useActiveCaisseSettingsByType(demand?.caisseType as any)
  const { convert } = useCaisseSpecialeDemandMutations()
  const { exportDetails, isExporting } = useExportCaisseSpecialeDemandDetails()

  const versementsTable = useMemo(() => {
    if (!demand) return []
    const startDate = new Date(demand.desiredDate)
    const rows: { mois: number; date: string; montant: number; cumule: number }[] = []
    let cumule = 0
    for (let i = 0; i < demand.monthsPlanned; i++) {
      const d = new Date(startDate)
      d.setMonth(d.getMonth() + i)
      cumule += demand.monthlyAmount
      rows.push({
        mois: i + 1,
        date: d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }),
        montant: demand.monthlyAmount,
        cumule,
      })
    }
    return rows
  }, [demand])
  
  const [acceptModalOpen, setAcceptModalOpen] = useState(false)
  const [rejectModalOpen, setRejectModalOpen] = useState(false)
  const [reopenModalOpen, setReopenModalOpen] = useState(false)

  const handleConvertToContract = () => {
    if (!demand?.id) return
    if (!activeSettings.data) {
      toast.error('Paramètres non configurés pour ce type de caisse')
      return
    }
    convert.mutate(
      { demandId: demand.id },
      {
        onSuccess: (result) => {
          if (result?.contractId) {
            router.push(routes.admin.caisseSpecialeContractDetails(result.contractId))
          }
        },
      }
    )
  }

  const getStatusColor = (status: CaisseSpecialeDemandStatus) => {
    const colors = {
      PENDING: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      APPROVED: 'bg-green-100 text-green-700 border-green-200',
      REJECTED: 'bg-red-100 text-red-700 border-red-200',
      CONVERTED: 'bg-blue-100 text-blue-700 border-blue-200',
    }
    return colors[status] || colors.PENDING
  }

  const getStatusLabel = (status: CaisseSpecialeDemandStatus) => {
    const labels = {
      PENDING: 'En attente',
      APPROVED: 'Acceptée',
      REJECTED: 'Refusée',
      CONVERTED: 'Convertie',
    }
    return labels[status] || status
  }

  const getCaisseTypeLabel = (type: string) => {
    const labels = {
      STANDARD: 'Standard',
      JOURNALIERE: 'Journalière',
      LIBRE: 'Libre',
      STANDARD_CHARITABLE: 'Standard Charitable',
      JOURNALIERE_CHARITABLE: 'Journalière Charitable',
      LIBRE_CHARITABLE: 'Libre Charitable',
    }
    return labels[type as keyof typeof labels] || type
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
          onClick={() => router.push(routes.admin.caisseSpecialeDemandes)}
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
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={() => router.push(routes.admin.caisseSpecialeDemandes)}
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

      {/* Informations membre, contact urgence, générales */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {demand.memberId && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Informations du membre
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Nom:</span>
                <span className="font-medium">{member ? `${member.lastName} ${member.firstName}` : '—'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Matricule:</span>
                <span className="font-medium">{member?.matricule ?? '—'}</span>
              </div>
              {member?.contacts?.[0] && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 flex items-center gap-1">
                    <Phone className="h-4 w-4" />
                    Téléphone:
                  </span>
                  <span className="font-medium">{typeof member.contacts[0] === 'string' ? member.contacts[0] : (member.contacts as string[])[0]}</span>
                </div>
              )}
              {member?.email && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 flex items-center gap-1">
                    <Mail className="h-4 w-4" />
                    Email:
                  </span>
                  <span className="font-medium">{member.email}</span>
                </div>
              )}
            </CardContent>
          </Card>
        )}
        {demand.emergencyContact && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="h-5 w-5" />
                Contact d&apos;urgence
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Nom:</span>
                <span className="font-medium">{[demand.emergencyContact.lastName, demand.emergencyContact.firstName].filter(Boolean).join(' ')}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Téléphone:</span>
                <span className="font-medium">{demand.emergencyContact.phone1}</span>
              </div>
              {demand.emergencyContact.relationship && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Lien de parenté:</span>
                  <span className="font-medium">{demand.emergencyContact.relationship}</span>
                </div>
              )}
            </CardContent>
          </Card>
        )}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Informations générales
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Type de contrat:</span>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-gray-400" />
                        <span className="font-medium">Individuel</span>
                      </div>
                    </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Type de caisse:</span>
              <Badge variant="outline">{getCaisseTypeLabel(demand.caisseType)}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Montant mensuel:</span>
              <span className="font-semibold text-green-600">
                {demand.monthlyAmount.toLocaleString('fr-FR')} FCFA
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Durée prévue:</span>
              <span className="font-medium">{demand.monthsPlanned} mois</span>
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Historique et traçabilité
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {demand.status === 'CONVERTED' && (demand.approvedByName || demand.decisionMadeByName) && (
              <div className="flex items-center justify-between p-2 bg-green-50 rounded">
                <span className="text-gray-600">Accepté par:</span>
                <span className="font-medium">{(demand.approvedByName || demand.decisionMadeByName)} le {(demand.approvedAt || demand.decisionMadeAt) ? new Date(demand.approvedAt || demand.decisionMadeAt!).toLocaleDateString('fr-FR') : ''}</span>
              </div>
            )}
            {demand.status === 'REJECTED' && (demand.rejectedByName || demand.decisionMadeByName) && (
              <div className="flex items-center justify-between p-2 bg-red-50 rounded">
                <span className="text-gray-600">Refusé par:</span>
                <span className="font-medium">{(demand.rejectedByName || demand.decisionMadeByName)} le {(demand.rejectedAt || demand.decisionMadeAt) ? new Date(demand.rejectedAt || demand.decisionMadeAt!).toLocaleDateString('fr-FR') : ''}</span>
              </div>
            )}
            {demand.reopenedByName && (
              <div className="flex items-center justify-between p-2 bg-blue-50 rounded">
                <span className="text-gray-600">Réouvert par:</span>
                <span className="font-medium">{demand.reopenedByName} le {demand.reopenedAt ? new Date(demand.reopenedAt).toLocaleDateString('fr-FR') : ''}</span>
              </div>
            )}
            {demand.convertedByName && demand.status === 'CONVERTED' && (
              <div className="flex items-center justify-between p-2 bg-indigo-50 rounded">
                <span className="text-gray-600">Converti par:</span>
                <span className="font-medium">{demand.convertedByName} le {demand.convertedAt ? new Date(demand.convertedAt).toLocaleDateString('fr-FR') : ''}</span>
              </div>
            )}
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
                  onClick={() => router.push(routes.admin.caisseSpecialeContractDetails(demand.contractId!))}
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

      {/* Tableau récapitulatif des versements (3.5) */}
      {versementsTable.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Tableau des versements prévus</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mois</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Montant FCFA</TableHead>
                  <TableHead>Cumulé</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {versementsTable.map((row) => (
                  <TableRow key={row.mois}>
                    <TableCell>{row.mois}</TableCell>
                    <TableCell>{row.date}</TableCell>
                    <TableCell>{row.montant.toLocaleString('fr-FR')}</TableCell>
                    <TableCell>{row.cumule.toLocaleString('fr-FR')}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <p className="text-sm text-gray-600 mt-2">
              Total: {versementsTable[versementsTable.length - 1]?.cumule.toLocaleString('fr-FR') ?? 0} FCFA
            </p>
          </CardContent>
        </Card>
      )}

      {/* Bouton Exporter PDF */}
      <Card>
        <CardContent className="p-4">
          <Button
            variant="outline"
            onClick={() => demand && exportDetails(demand)}
            disabled={!demand || isExporting}
            title="Exporter les détails en PDF"
          >
            {isExporting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Génération...
              </>
            ) : (
              <>
                <FileDown className="h-4 w-4 mr-2" />
                Exporter en PDF
              </>
            )}
          </Button>
        </CardContent>
      </Card>

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

      {/* Bouton Convertir en contrat pour les demandes acceptées sans contrat */}
      {demand.status === 'APPROVED' && !demand.contractId && (
        <Card>
          <CardContent className="p-6">
            <Alert className="mb-4 border-amber-200 bg-amber-50/50">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <AlertDescription>
                Cette demande a été acceptée mais aucun contrat n&apos;a été créé. Cliquez sur le bouton ci-dessous pour créer le contrat.
              </AlertDescription>
            </Alert>
            {!activeSettings.isLoading && !activeSettings.data && (
              <Alert className="mb-4 border-red-200 bg-red-50/50">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <span>Paramètres non configurés pour ce type de caisse. Veuillez activer une version avant conversion.</span>
                  <Button
                    variant="outline"
                    onClick={() => router.push('/caisse-speciale/settings')}
                  >
                    Aller configurer les paramètres
                  </Button>
                </AlertDescription>
              </Alert>
            )}
            <Button
              onClick={handleConvertToContract}
              disabled={convert.isPending || activeSettings.isLoading || !activeSettings.data}
              className="w-full bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700"
            >
              {convert.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Création du contrat...
                </>
              ) : (
                <>
                  <FilePlus2 className="h-4 w-4 mr-2" />
                  Convertir en contrat
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Action de réouverture pour les demandes refusées */}
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

      {/* Modals */}
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
