'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useMemberActivitySummary, ContractSummary, CharitySummary, PlacementSummary, ContractStats } from '@/hooks/useMemberActivitySummary'
import { 
  Wallet, 
  HeartHandshake, 
  TrendingUp, 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  ExternalLink,
  Loader2,
  FileText,
  Calendar,
  User
} from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import Link from 'next/link'
import { cn } from '@/lib/utils'

interface MemberActivitySummaryProps {
  memberId: string
  memberName: string
  isGuarantor?: boolean
}

export default function MemberActivitySummary({ 
  memberId, 
  memberName,
  isGuarantor = false 
}: MemberActivitySummaryProps) {
  const { data, isLoading, error } = useMemberActivitySummary(memberId)

  if (isLoading) {
    return (
      <Card className="border-0 shadow-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {isGuarantor ? <HeartHandshake className="h-5 w-5" /> : <User className="h-5 w-5" />}
            Activités de {memberName}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-[#234D65]" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="border-0 shadow-xl border-red-200">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 text-red-600">
            <AlertCircle className="h-5 w-5" />
            <span>Erreur lors du chargement des activités</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!data) {
    return null
  }

  return (
    <Card className="border-0 shadow-xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {isGuarantor ? <HeartHandshake className="h-5 w-5" /> : <User className="h-5 w-5" />}
          Activités de {memberName}
          {isGuarantor && <Badge variant="outline" className="ml-2">Garant</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Contrats en cours */}
        <ContractsSection contracts={data.contracts} />
        
        {/* Charités */}
        <CharitiesSection charities={data.charities} />
        
        {/* Placements */}
        <PlacementsSection placements={data.placements} />
        
        {/* Statistiques */}
        <StatsSection stats={data.stats} />
      </CardContent>
    </Card>
  )
}

function ContractsSection({ contracts }: { contracts: ContractSummary[] }) {
  if (contracts.length === 0) {
    return (
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <Wallet className="h-4 w-4" />
          Contrats en cours
        </h3>
        <p className="text-sm text-gray-500">Aucun contrat en cours</p>
      </div>
    )
  }

  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
        <Wallet className="h-4 w-4" />
        Contrats en cours ({contracts.length})
      </h3>
      <div className="space-y-3">
        {contracts.map((contract) => {
          // Description pour Caisse Spéciale
          const getCaisseSpecialeDescription = () => {
            const typeLabel = contract.caisseType === 'STANDARD' ? 'Standard' : 
                            contract.caisseType === 'JOURNALIERE' ? 'Journalière' : 
                            contract.caisseType === 'LIBRE' ? 'Libre' : 'Caisse Spéciale'
            const progress = contract.monthsPlanned && contract.currentMonthIndex !== undefined
              ? `${contract.currentMonthIndex}/${contract.monthsPlanned} mois`
              : contract.monthsPlanned ? `${contract.monthsPlanned} mois prévus` : ''
            const nominal = contract.nominalPaid ? `${contract.nominalPaid.toLocaleString('fr-FR')} FCFA` : ''
            const bonus = contract.bonusAccrued ? `${contract.bonusAccrued.toLocaleString('fr-FR')} FCFA` : ''
            
            return {
              title: `Contrat ${typeLabel}`,
              details: [
                progress && `Progression: ${progress}`,
                nominal && `Épargne accumulée: ${nominal}`,
                bonus && `Bonus accumulé: ${bonus}`,
              ].filter(Boolean).join(' • ')
            }
          }

          // Description pour Caisse Imprévue
          const getCaisseImprevueDescription = () => {
            const frequencyLabel = contract.paymentFrequency === 'DAILY' ? 'Journalier' : 'Mensuel'
            const code = contract.subscriptionCICode ? `Forfait ${contract.subscriptionCICode}` : 'Caisse Imprévue'
            const progress = contract.subscriptionCIDuration && contract.totalMonthsPaid !== undefined
              ? `${contract.totalMonthsPaid}/${contract.subscriptionCIDuration} mois`
              : contract.totalMonthsPaid ? `${contract.totalMonthsPaid} mois payés` : ''
            const nominal = contract.subscriptionCINominal ? `Objectif: ${contract.subscriptionCINominal.toLocaleString('fr-FR')} FCFA` : ''
            const support = contract.isEligibleForSupport ? 'Éligible au support' : ''
            
            return {
              title: `${code} (${frequencyLabel})`,
              details: [
                progress && `Progression: ${progress}`,
                nominal,
                support,
              ].filter(Boolean).join(' • ')
            }
          }

          const description = contract.type === 'CAISSE_SPECIALE' 
            ? getCaisseSpecialeDescription()
            : getCaisseImprevueDescription()

          return (
            <div
              key={contract.id}
              className={cn(
                "p-4 rounded-lg border",
                contract.isUpToDate ? "bg-green-50 border-green-200" :
                contract.hasDelay ? "bg-orange-50 border-orange-200" :
                "bg-gray-50 border-gray-200"
              )}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="text-xs">
                      {contract.type === 'CAISSE_SPECIALE' ? 'Caisse Spéciale' : 'Caisse Imprévue'}
                    </Badge>
                    {contract.isUpToDate && (
                      <Badge className="bg-green-100 text-green-700 border-green-300 text-xs">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        À jour
                      </Badge>
                    )}
                    {contract.hasDelay && (
                      <Badge className="bg-orange-100 text-orange-700 border-orange-300 text-xs">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        Retard
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm font-semibold text-gray-800 mb-1">{description.title}</p>
                  {description.details && (
                    <p className="text-xs text-gray-600 mb-1">{description.details}</p>
                  )}
                  <p className="text-xs text-gray-500 font-mono">{contract.id}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  asChild
                  className="h-8"
                >
                  <Link href={contract.contractLink}>
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                </Button>
              </div>
              
              <div className="grid grid-cols-2 gap-2 text-xs mt-2 pt-2 border-t border-gray-200">
                {contract.monthlyAmount && (
                  <div>
                    <span className="text-gray-500">Mensualité:</span>
                    <span className="ml-1 font-semibold">{contract.monthlyAmount.toLocaleString('fr-FR')} FCFA</span>
                  </div>
                )}
                {contract.lastPaymentDate && (
                  <div>
                    <span className="text-gray-500">Dernier paiement:</span>
                    <span className="ml-1 font-semibold">
                      {format(contract.lastPaymentDate, 'dd/MM/yyyy', { locale: fr })}
                    </span>
                  </div>
                )}
                {contract.nextPaymentDate && (
                  <div>
                    <span className="text-gray-500">Prochain paiement:</span>
                    <span className="ml-1 font-semibold">
                      {format(contract.nextPaymentDate, 'dd/MM/yyyy', { locale: fr })}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function CharitiesSection({ charities }: { charities: CharitySummary[] }) {
  if (charities.length === 0) {
    return (
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <HeartHandshake className="h-4 w-4" />
          Charités
        </h3>
        <p className="text-sm text-gray-500">Aucune participation aux charités</p>
      </div>
    )
  }

  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
        <HeartHandshake className="h-4 w-4" />
        Charités ({charities.length})
      </h3>
      <div className="space-y-2">
        {charities.map((charity) => {
          const typeLabel = charity.type === 'money' ? 'Contribution financière' : 
                          charity.type === 'in_kind' ? 'Contribution en nature' : 
                          'Contribution'
          const amountLabel = charity.amount 
            ? `${charity.amount.toLocaleString('fr-FR')} FCFA`
            : charity.type === 'in_kind' ? 'Valeur estimée non spécifiée' : 'Montant non spécifié'
          
          return (
            <div
              key={charity.id}
              className="p-3 rounded-lg border bg-blue-50 border-blue-200 flex items-start justify-between"
            >
              <div className="flex-1">
                <p className="font-medium text-sm text-gray-800">{charity.name}</p>
                <p className="text-xs text-gray-600 mt-0.5">{typeLabel}</p>
                <div className="flex items-center gap-3 mt-1.5 text-xs">
                  <span className="text-gray-500 flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {format(charity.date, 'dd/MM/yyyy', { locale: fr })}
                  </span>
                  {charity.amount && (
                    <span className="font-semibold text-blue-700">{amountLabel}</span>
                  )}
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                asChild
                className="h-7"
              >
                <Link href={charity.charityLink}>
                  <ExternalLink className="h-3 w-3" />
                </Link>
              </Button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function PlacementsSection({ placements }: { placements: PlacementSummary[] }) {
  if (placements.length === 0) {
    return (
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <TrendingUp className="h-4 w-4" />
          Placements
        </h3>
        <p className="text-sm text-gray-500">Aucun placement</p>
      </div>
    )
  }

  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
        <TrendingUp className="h-4 w-4" />
        Placements ({placements.length})
      </h3>
      <div className="space-y-2">
        {placements.map((placement) => {
          const typeLabel = placement.type === 'MonthlyCommission_CapitalEnd' 
            ? 'Commission mensuelle + Capital à la fin'
            : placement.type === 'CapitalPlusCommission_End'
            ? 'Capital + Commissions à la fin'
            : placement.type
          
          const statusLabel = placement.status === 'ACTIVE' ? 'En cours' :
                            placement.status === 'COMPLETED' ? 'Terminé' :
                            placement.status === 'CANCELLED' ? 'Annulé' :
                            placement.status
          
          return (
            <div
              key={placement.id}
              className="p-3 rounded-lg border bg-purple-50 border-purple-200 flex items-start justify-between"
            >
              <div className="flex-1">
                <p className="font-semibold text-sm text-gray-800 mb-1">
                  {placement.amount.toLocaleString('fr-FR')} FCFA
                </p>
                <p className="text-xs text-gray-600 mb-1.5">{typeLabel}</p>
                <div className="flex items-center gap-3 text-xs">
                  <Badge variant="outline" className="text-xs">
                    Taux: {placement.rate}%
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    Durée: {placement.period} mois
                  </Badge>
                  <span className="text-gray-500">Statut: {statusLabel}</span>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                asChild
                className="h-7"
              >
                <Link href={placement.placementLink}>
                  <ExternalLink className="h-3 w-3" />
                </Link>
              </Button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function StatsSection({ stats }: { stats: ContractStats[] }) {
  if (stats.length === 0 || stats.every(s => s.rescinded === 0 && s.closed === 0 && s.earlyWithdraw === 0)) {
    return (
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Statistiques des contrats
        </h3>
        <p className="text-sm text-gray-500">Aucune statistique disponible</p>
      </div>
    )
  }

  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
        <FileText className="h-4 w-4" />
        Statistiques des contrats (année en cours et précédente)
      </h3>
      <div className="grid grid-cols-2 gap-4">
        {stats.map((stat) => (
          <div key={stat.year} className="p-3 rounded-lg border bg-gray-50 border-gray-200">
            <p className="font-semibold text-sm mb-2">{stat.year}</p>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-600">Résiliés:</span>
                <span className="font-semibold text-red-600">{stat.rescinded}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Clos:</span>
                <span className="font-semibold text-green-600">{stat.closed}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Retrait anticipé:</span>
                <span className="font-semibold text-orange-600">{stat.earlyWithdraw}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

