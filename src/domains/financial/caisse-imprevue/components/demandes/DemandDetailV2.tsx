/**
 * Composant d'affichage des détails d'une demande
 * 
 * Responsive : Mobile, Tablette, Desktop
 * Sections : Informations, Motif, Forfait, Contact, Simulation, Historique
 */

'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { User, Phone, Mail, Hash, FileText, DollarSign, Calendar, Clock, CheckCircle2, XCircle, RotateCcw, Trash2, Edit, FileCheck } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { useDemandSimulation } from '../../hooks/useDemandSimulation'
import { PaymentScheduleTable } from '@/domains/financial/caisse-imprevue/components/demandes'
import type { CaisseImprevueDemand } from '../../entities/demand.types'
import { cn } from '@/lib/utils'

interface DemandDetailV2Props {
  demand: CaisseImprevueDemand
  onAccept?: (id: string) => void
  onReject?: (id: string) => void
  onReopen?: (id: string) => void
  onDelete?: (id: string) => void
  onEdit?: (id: string) => void
  onCreateContract?: (id: string) => void
}

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; color: string }> = {
  PENDING: { label: 'En attente', variant: 'secondary', color: 'bg-amber-100 text-amber-800' },
  APPROVED: { label: 'Acceptée', variant: 'default', color: 'bg-green-100 text-green-800' },
  REJECTED: { label: 'Refusée', variant: 'destructive', color: 'bg-red-100 text-red-800' },
  CONVERTED: { label: 'Convertie', variant: 'default', color: 'bg-blue-100 text-blue-800' },
  REOPENED: { label: 'Réouverte', variant: 'secondary', color: 'bg-purple-100 text-purple-800' },
}

export function DemandDetailV2({
  demand,
  onAccept,
  onReject,
  onReopen,
  onDelete,
  onEdit,
  onCreateContract,
}: DemandDetailV2Props) {
  const schedule = useDemandSimulation(demand)
  const statusInfo = statusConfig[demand.status] || statusConfig.PENDING
  const createdAt = demand.createdAt instanceof Date ? demand.createdAt : new Date(demand.createdAt)

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Statut */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg md:text-xl">📊 Statut</CardTitle>
            <Badge variant={statusInfo.variant} className={cn('text-xs md:text-sm', statusInfo.color)}>
              {statusInfo.label}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div>
            <span className="font-medium">Date de création :</span>{' '}
            {format(createdAt, 'dd MMMM yyyy à HH:mm', { locale: fr })}
          </div>
          <div>
            <span className="font-medium">Créée par :</span> {demand.createdBy}
          </div>
          {demand.acceptedAt && (
            <div>
              <span className="font-medium">Acceptée le :</span>{' '}
              {format(demand.acceptedAt, 'dd MMMM yyyy à HH:mm', { locale: fr })}
              {demand.acceptedBy && ` par ${demand.acceptedBy}`}
            </div>
          )}
          {demand.rejectedAt && (
            <div>
              <span className="font-medium">Refusée le :</span>{' '}
              {format(demand.rejectedAt, 'dd MMMM yyyy à HH:mm', { locale: fr })}
              {demand.rejectedBy && ` par ${demand.rejectedBy}`}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Grille responsive */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {/* Informations demandeur */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base md:text-lg flex items-center gap-2">
              <User className="w-5 h-5" />
              Informations du demandeur
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-xs text-kara-neutral-500">Nom complet</p>
              <p className="font-semibold">
                {demand.memberFirstName} {demand.memberLastName}
              </p>
            </div>
            {demand.memberPhone && (
              <div>
                <p className="text-xs text-kara-neutral-500 flex items-center gap-1">
                  <Phone className="w-3 h-3" />
                  Téléphone
                </p>
                <p>{demand.memberPhone}</p>
              </div>
            )}
            {demand.memberEmail && (
              <div>
                <p className="text-xs text-kara-neutral-500 flex items-center gap-1">
                  <Mail className="w-3 h-3" />
                  Email
                </p>
                <p>{demand.memberEmail}</p>
              </div>
            )}
            <div>
              <p className="text-xs text-kara-neutral-500 flex items-center gap-1">
                <Hash className="w-3 h-3" />
                Matricule
              </p>
              <p className="font-mono">{demand.memberMatricule}</p>
            </div>
          </CardContent>
        </Card>

        {/* Motif */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base md:text-lg flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Motif de la demande
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{demand.cause}</p>
          </CardContent>
        </Card>

        {/* Forfait */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base md:text-lg flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Forfait sélectionné
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div>
              <p className="text-xs text-kara-neutral-500">Forfait</p>
              <p className="font-semibold">{demand.subscriptionCICode}</p>
            </div>
            <div>
              <p className="text-xs text-kara-neutral-500">Montant</p>
              <p>
                {demand.subscriptionCIAmountPerMonth.toLocaleString('fr-FR')} FCFA/
                {demand.paymentFrequency === 'DAILY' ? 'jour' : 'mois'}
              </p>
            </div>
            <div>
              <p className="text-xs text-kara-neutral-500">Durée</p>
              <p>{demand.subscriptionCIDuration} mois</p>
            </div>
            <div>
              <p className="text-xs text-kara-neutral-500">Fréquence</p>
              <p>{demand.paymentFrequency === 'DAILY' ? 'Quotidien' : 'Mensuel'}</p>
            </div>
          </CardContent>
        </Card>

        {/* Contact d'urgence */}
        {demand.emergencyContact && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base md:text-lg flex items-center gap-2">
                <Phone className="w-5 h-5" />
                Contact d'urgence
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div>
                <p className="text-xs text-kara-neutral-500">Nom</p>
                <p className="font-semibold">
                  {demand.emergencyContact.firstName} {demand.emergencyContact.lastName}
                </p>
              </div>
              <div>
                <p className="text-xs text-kara-neutral-500">Téléphone</p>
                <p>{demand.emergencyContact.phone1}</p>
              </div>
              <div>
                <p className="text-xs text-kara-neutral-500">Lien</p>
                <p>{demand.emergencyContact.relationship}</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Tableau versements */}
      {schedule && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base md:text-lg flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Plan de remboursement
            </CardTitle>
          </CardHeader>
          <CardContent>
            <PaymentScheduleTable schedule={schedule} />
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base md:text-lg">Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-2">
            {(demand.status === 'PENDING' || demand.status === 'REOPENED') && (
              <>
                {onAccept && (
                  <Button onClick={() => onAccept(demand.id)} className="bg-green-600 hover:bg-green-700">
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Accepter
                  </Button>
                )}
                {onReject && (
                  <Button variant="destructive" onClick={() => onReject(demand.id)}>
                    <XCircle className="w-4 h-4 mr-2" />
                    Refuser
                  </Button>
                )}
              </>
            )}
            {demand.status === 'REJECTED' && onReopen && (
              <Button variant="outline" onClick={() => onReopen(demand.id)}>
                <RotateCcw className="w-4 h-4 mr-2" />
                Réouvrir
              </Button>
            )}
            {demand.status === 'APPROVED' && onCreateContract && (
              <Button onClick={() => onCreateContract(demand.id)}>
                <FileCheck className="w-4 h-4 mr-2" />
                Créer contrat
              </Button>
            )}
            {onEdit && (
              <Button variant="outline" onClick={() => onEdit(demand.id)}>
                <Edit className="w-4 h-4 mr-2" />
                Modifier
              </Button>
            )}
            {onDelete && (
              <Button variant="destructive" onClick={() => onDelete(demand.id)}>
                <Trash2 className="w-4 h-4 mr-2" />
                Supprimer
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
