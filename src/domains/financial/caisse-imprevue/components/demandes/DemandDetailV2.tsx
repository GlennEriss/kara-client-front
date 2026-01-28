/**
 * Composant d'affichage des détails d'une demande
 * 
 * Design coloré selon le thème KARA avec animations
 * Sections : Informations, Motif, Forfait, Contact, Simulation, Actions
 */

'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  User, 
  Phone, 
  Mail, 
  Hash, 
  FileText, 
  Banknote,
  Calendar, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  RotateCcw, 
  Trash2, 
  Edit, 
  FileCheck, 
  BarChart3, 
  Download, 
  Loader2,
  AlertCircle,
  UserCheck,
  Repeat,
  CalendarDays,
  CreditCard,
  IdCard
} from 'lucide-react'
import { useExportDemandDetails } from '../../hooks/useExportDemandDetails'
import { useState } from 'react'
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

const statusConfig: Record<string, { 
  label: string
  icon: React.ReactNode
  bgColor: string
  textColor: string
  borderColor: string
  lightBg: string
}> = {
  PENDING: { 
    label: 'En attente', 
    icon: <Clock className="w-4 h-4" />,
    bgColor: 'bg-amber-500',
    textColor: 'text-amber-700',
    borderColor: 'border-amber-200',
    lightBg: 'bg-amber-50'
  },
  APPROVED: { 
    label: 'Acceptée', 
    icon: <CheckCircle2 className="w-4 h-4" />,
    bgColor: 'bg-green-500',
    textColor: 'text-green-700',
    borderColor: 'border-green-200',
    lightBg: 'bg-green-50'
  },
  REJECTED: { 
    label: 'Refusée', 
    icon: <XCircle className="w-4 h-4" />,
    bgColor: 'bg-red-500',
    textColor: 'text-red-700',
    borderColor: 'border-red-200',
    lightBg: 'bg-red-50'
  },
  CONVERTED: { 
    label: 'Convertie en contrat', 
    icon: <FileCheck className="w-4 h-4" />,
    bgColor: 'bg-emerald-500',
    textColor: 'text-emerald-700',
    borderColor: 'border-emerald-200',
    lightBg: 'bg-emerald-50'
  },
  REOPENED: { 
    label: 'Réouverte', 
    icon: <RotateCcw className="w-4 h-4" />,
    bgColor: 'bg-blue-500',
    textColor: 'text-blue-700',
    borderColor: 'border-blue-200',
    lightBg: 'bg-blue-50'
  },
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
  const { exportDetails, isExporting } = useExportDemandDetails()
  const [isExportingDetails, setIsExportingDetails] = useState(false)

  const handleExportPDF = async () => {
    setIsExportingDetails(true)
    try {
      await exportDetails(demand)
    } catch (error) {
      console.error('Erreur lors de l\'export:', error)
    } finally {
      setIsExportingDetails(false)
    }
  }

  // Déterminer les actions disponibles
  const canAcceptOrReject = demand.status === 'PENDING' || demand.status === 'REOPENED'
  const canReopen = demand.status === 'REJECTED'
  const canCreateContract = demand.status === 'APPROVED'

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Section Statut - Carte colorée */}
      <Card className={cn(
        'border-2 overflow-hidden transition-all duration-300 hover:shadow-lg',
        statusInfo.borderColor
      )}>
        <div className={cn('h-1.5', statusInfo.bgColor)} />
        <CardHeader className={cn('pb-3', statusInfo.lightBg)}>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg md:text-xl flex items-center gap-3">
              <div className={cn(
                'w-10 h-10 rounded-full flex items-center justify-center',
                statusInfo.bgColor, 'text-white'
              )}>
                <BarChart3 className="w-5 h-5" />
              </div>
              <span className="text-gray-900">Statut de la demande</span>
            </CardTitle>
            <Badge className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 font-semibold',
              statusInfo.lightBg, statusInfo.textColor, 'border', statusInfo.borderColor
            )}>
              {statusInfo.icon}
              {statusInfo.label}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <Calendar className="w-5 h-5 text-[#234D65]" />
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Date de création</p>
                <p className="font-medium text-gray-900">
                  {format(createdAt, 'd MMMM yyyy à HH:mm', { locale: fr })}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <UserCheck className="w-5 h-5 text-[#234D65]" />
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Créée par</p>
                <p className="font-medium text-gray-900 font-mono text-sm">{demand.createdBy}</p>
              </div>
            </div>
          </div>
          
          {/* Historique des décisions */}
          {(demand.acceptedAt || demand.rejectedAt) && (
            <div className="mt-4 p-4 border border-dashed border-gray-200 rounded-lg bg-white">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Historique</p>
              {demand.acceptedAt && (
                <div className="flex items-center gap-2 text-green-700 text-sm">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    Acceptée le {format(demand.acceptedAt, 'd MMMM yyyy à HH:mm', { locale: fr })}
                    {demand.acceptedBy && <span className="text-gray-500"> par {demand.acceptedBy}</span>}
                  </span>
                </div>
              )}
              {demand.rejectedAt && (
                <div className="flex items-center gap-2 text-red-700 text-sm">
                  <XCircle className="w-4 h-4" />
                  <span>
                    Refusée le {format(demand.rejectedAt, 'd MMMM yyyy à HH:mm', { locale: fr })}
                    {demand.rejectedBy && <span className="text-gray-500"> par {demand.rejectedBy}</span>}
                  </span>
                </div>
              )}
              {demand.decisionReason && (
                <div className="mt-2 p-2 bg-gray-50 rounded text-sm text-gray-600 italic">
                  "{demand.decisionReason}"
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Grille des informations */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {/* Informations demandeur */}
        <Card className="border-0 shadow-md hover:shadow-lg transition-all duration-300 group">
          <CardHeader className="bg-gradient-to-r from-[#234D65] to-[#2c5a73] text-white rounded-t-lg">
            <CardTitle className="text-base md:text-lg flex items-center gap-2">
              <User className="w-5 h-5" />
              Informations du demandeur
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg group-hover:bg-[#234D65]/5 transition-colors">
              <div className="w-10 h-10 rounded-full bg-[#234D65]/10 flex items-center justify-center shrink-0">
                <User className="w-5 h-5 text-[#234D65]" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Nom complet</p>
                {/* Mobile: prénom et nom sur 2 lignes, Desktop: sur 1 ligne */}
                <div className="block sm:hidden">
                  <p className="font-semibold text-gray-900">{demand.memberFirstName}</p>
                  <p className="font-semibold text-gray-900">{demand.memberLastName}</p>
                </div>
                <p className="font-semibold text-gray-900 hidden sm:block">
                  {demand.memberFirstName} {demand.memberLastName}
                </p>
              </div>
            </div>
            {demand.memberPhone && (
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg group-hover:bg-[#234D65]/5 transition-colors">
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                  <Phone className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Téléphone</p>
                  <p className="font-medium text-gray-900">{demand.memberPhone}</p>
                </div>
              </div>
            )}
            {demand.memberEmail && (
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg group-hover:bg-[#234D65]/5 transition-colors">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <Mail className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Email</p>
                  <p className="font-medium text-gray-900 break-all">{demand.memberEmail}</p>
                </div>
              </div>
            )}
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg group-hover:bg-[#234D65]/5 transition-colors">
              <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                <Hash className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Matricule</p>
                <p className="font-mono font-medium text-gray-900">{demand.memberMatricule}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Motif */}
        <Card className="border-0 shadow-md hover:shadow-lg transition-all duration-300">
          <CardHeader className="bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-t-lg">
            <CardTitle className="text-base md:text-lg flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Motif de la demande
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                  {demand.cause}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Forfait */}
        <Card className="border-0 shadow-md hover:shadow-lg transition-all duration-300">
          <CardHeader className="bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-t-lg">
            <CardTitle className="text-base md:text-lg flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Forfait sélectionné
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-3">
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-center">
              <p className="text-xs text-green-600 uppercase tracking-wide mb-1">Code forfait</p>
              <p className="text-xl font-bold text-green-700">{demand.subscriptionCICode}</p>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-gray-50 rounded-lg text-center">
                <Banknote className="w-5 h-5 text-green-600 mx-auto mb-1" />
                <p className="text-xs text-gray-500 uppercase">Montant</p>
                <p className="font-semibold text-gray-900">
                  {demand.subscriptionCIAmountPerMonth.toLocaleString('fr-FR')}
                </p>
                <p className="text-xs text-gray-500">
                  FCFA/{demand.paymentFrequency === 'DAILY' ? 'jour' : 'mois'}
                </p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg text-center">
                <CalendarDays className="w-5 h-5 text-blue-600 mx-auto mb-1" />
                <p className="text-xs text-gray-500 uppercase">Durée</p>
                <p className="font-semibold text-gray-900">{demand.subscriptionCIDuration}</p>
                <p className="text-xs text-gray-500">mois</p>
              </div>
            </div>
            
            <div className="flex items-center justify-center gap-2 p-2 bg-[#234D65]/10 rounded-lg">
              <Repeat className="w-4 h-4 text-[#234D65]" />
              <span className="text-sm font-medium text-[#234D65]">
                Paiement {demand.paymentFrequency === 'DAILY' ? 'quotidien' : 'mensuel'}
              </span>
            </div>

            {demand.subscriptionCINominal && (
              <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg text-center">
                <p className="text-xs text-purple-600 uppercase tracking-wide">Nominal</p>
                <p className="font-bold text-purple-700">
                  {demand.subscriptionCINominal.toLocaleString('fr-FR')} FCFA
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Contact d'urgence */}
        {demand.emergencyContact && (
          <Card className="border-0 shadow-md hover:shadow-lg transition-all duration-300">
            <CardHeader className="bg-gradient-to-r from-red-500 to-rose-500 text-white rounded-t-lg">
              <CardTitle className="text-base md:text-lg flex items-center gap-2">
                <Phone className="w-5 h-5" />
                Contact d'urgence
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-3">
              <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                  <User className="w-5 h-5 text-red-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Nom complet</p>
                  {/* Mobile: prénom et nom sur 2 lignes, Desktop: sur 1 ligne */}
                  <div className="block sm:hidden">
                    <p className="font-semibold text-gray-900">{demand.emergencyContact.firstName || ''}</p>
                    <p className="font-semibold text-gray-900">{demand.emergencyContact.lastName || ''}</p>
                  </div>
                  <p className="font-semibold text-gray-900 hidden sm:block">
                    {demand.emergencyContact.firstName} {demand.emergencyContact.lastName}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <Phone className="w-4 h-4 text-green-600 mb-1" />
                  <p className="text-xs text-gray-500">Téléphone</p>
                  <p className="font-medium text-gray-900 text-sm">{demand.emergencyContact.phone1}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <UserCheck className="w-4 h-4 text-blue-600 mb-1" />
                  <p className="text-xs text-gray-500">Lien</p>
                  <p className="font-medium text-gray-900 text-sm">{demand.emergencyContact.relationship}</p>
                </div>
              </div>
              {demand.emergencyContact.typeId && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <IdCard className="w-4 h-4 text-purple-600" />
                    <p className="text-xs text-gray-500 uppercase">Document d'identité</p>
                  </div>
                  <p className="font-medium text-gray-900">
                    {demand.emergencyContact.typeId}: {demand.emergencyContact.idNumber}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Tableau des versements avec export */}
      {schedule && (
        <Card className="border-0 shadow-lg overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-[#234D65] to-[#2c5a73] text-white">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <CardTitle className="text-base md:text-lg flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Plan de remboursement
              </CardTitle>
              <div className="flex items-center gap-2 text-sm">
                <Badge variant="secondary" className="bg-white/20 text-white border-0">
                  {schedule.totalMonths} mois
                </Badge>
                <Badge variant="secondary" className="bg-white/20 text-white border-0">
                  {schedule.totalAmount.toLocaleString('fr-FR')} FCFA
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <PaymentScheduleTable 
              schedule={schedule} 
              demandId={demand.id}
              memberName={`${demand.memberFirstName} ${demand.memberLastName}`}
            />
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <Card className="border-0 shadow-lg overflow-hidden">
        <CardHeader className="bg-gray-50 border-b">
          <CardTitle className="text-base md:text-lg flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-[#234D65]" />
            Actions disponibles
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 md:p-6">
          <div className="flex flex-col sm:flex-row flex-wrap gap-3">
            {/* Actions principales selon le statut */}
            {canAcceptOrReject && (
              <>
                {onAccept && (
                  <Button 
                    onClick={() => onAccept(demand.id)} 
                    className="bg-green-600 hover:bg-green-700 shadow-lg shadow-green-600/20 transition-all duration-200 hover:scale-105"
                  >
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Accepter la demande
                  </Button>
                )}
                {onReject && (
                  <Button 
                    variant="destructive" 
                    onClick={() => onReject(demand.id)}
                    className="shadow-lg shadow-red-600/20 transition-all duration-200 hover:scale-105"
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Refuser la demande
                  </Button>
                )}
              </>
            )}
            
            {canReopen && onReopen && (
              <Button 
                variant="outline" 
                onClick={() => onReopen(demand.id)}
                className="border-blue-300 text-blue-600 hover:bg-blue-50 transition-all duration-200"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Réouvrir la demande
              </Button>
            )}
            
            {canCreateContract && onCreateContract && (
              <Button 
                onClick={() => onCreateContract(demand.id)}
                className="bg-[#234D65] hover:bg-[#2c5a73] shadow-lg shadow-[#234D65]/20 transition-all duration-200 hover:scale-105"
              >
                <FileCheck className="w-4 h-4 mr-2" />
                Créer le contrat
              </Button>
            )}
            
            {/* Séparateur */}
            <div className="hidden sm:block w-px h-10 bg-gray-200 mx-2" />
            
            {/* Actions secondaires */}
            {onEdit && (
              <Button 
                variant="outline" 
                onClick={() => onEdit(demand.id)}
                className="border-gray-300 hover:bg-gray-50 transition-all duration-200"
              >
                <Edit className="w-4 h-4 mr-2" />
                Modifier
              </Button>
            )}
            
            {onDelete && (
              <Button 
                variant="outline" 
                onClick={() => onDelete(demand.id)}
                className="border-red-200 text-red-600 hover:bg-red-50 transition-all duration-200"
              >
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
