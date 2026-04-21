'use client'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import routes from '@/constantes/routes'
import { useCaisseSpecialeDemand, useCaisseSpecialeDemandMutations } from '@/hooks/caisse-speciale/useCaisseSpecialeDemands'
import { useExportCaisseSpecialeDemandDetails } from '@/hooks/caisse-speciale/useExportCaisseSpecialeDemandDetails'
import { useActiveCaisseSettingsByType } from '@/hooks/useCaisseSettings'
import { useMember } from '@/hooks/useMembers'
import { cn } from '@/lib/utils'
import { CaisseSpecialeDemandStatus } from '@/types/types'
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle,
  Clock,
  FileDown,
  FileEdit,
  FilePlus2,
  FileText,
  Loader2,
  Mail,
  Phone,
  RotateCcw,
  User,
  XCircle,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import AcceptDemandModal from './AcceptDemandModal'
import RejectDemandModal from './RejectDemandModal'
import ReopenDemandModal from './ReopenDemandModal'

interface DemandDetailProps {
  demandId: string
}

const formatDate = (value?: Date | string, withTime = false) => {
  if (!value) return '—'
  const date = new Date(value)
  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  })
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
      const currentDate = new Date(startDate)
      currentDate.setMonth(currentDate.getMonth() + i)
      cumule += demand.monthlyAmount

      rows.push({
        mois: i + 1,
        date: currentDate.toLocaleDateString('fr-FR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        }),
        montant: demand.monthlyAmount,
        cumule,
      })
    }

    return rows
  }, [demand])

  const [acceptModalOpen, setAcceptModalOpen] = useState(false)
  const [rejectModalOpen, setRejectModalOpen] = useState(false)
  const [reopenModalOpen, setReopenModalOpen] = useState(false)

  const memberPhone = useMemo(() => {
    if (!member) return undefined

    if (Array.isArray(member.contacts) && member.contacts.length > 0) {
      return typeof member.contacts[0] === 'string' ? member.contacts[0] : String(member.contacts[0])
    }

    if (typeof member.contacts === 'string') {
      return member.contacts
    }

    return undefined
  }, [member])

  const memberInitials = useMemo(() => {
    const firstInitial = (member?.firstName || '').slice(0, 1)
    const lastInitial = (member?.lastName || '').slice(0, 1)
    const initials = `${firstInitial}${lastInitial}`.toUpperCase()
    return initials || 'CS'
  }, [member?.firstName, member?.lastName])

  const totalPlannedAmount = demand ? demand.monthlyAmount * demand.monthsPlanned : 0
  const demandCause = demand?.cause?.trim() || 'Aucun motif renseigné.'

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

  const getContractTypeLabel = (type: string) => {
    const labels = {
      INDIVIDUAL: 'Individuel',
      GROUP: 'Groupe',
    }
    return labels[type as keyof typeof labels] || type
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="rounded-3xl border border-slate-200 bg-gradient-to-r from-[#234D65] to-[#2c5a73] p-6 shadow-lg">
          <Skeleton className="h-5 w-36 bg-white/20" />
          <Skeleton className="mt-4 h-10 w-72 bg-white/20" />
          <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-20 rounded-xl bg-white/20" />
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <Card key={index} className="border-0 shadow-lg">
              <CardContent className="p-6">
                <div className="space-y-3">
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-11/12" />
                  <Skeleton className="h-4 w-10/12" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (error || !demand) {
    return (
      <Card className="border-red-200 bg-red-50/40 shadow-lg">
        <CardContent className="flex flex-col items-center justify-center gap-4 py-12 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-100 text-red-600">
            <AlertCircle className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-red-900">Demande introuvable</h2>
            <p className="max-w-md text-sm text-red-700">
              {error instanceof Error ? error.message : 'La demande n’a pas pu être chargée.'}
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => router.push(routes.admin.caisseSpecialeDemandes)}
            className="border-red-300 text-red-700 hover:bg-red-100"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour à la liste
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6 md:space-y-8">
      <section className="relative overflow-hidden rounded-3xl border border-[#234D65]/20 bg-gradient-to-br from-[#1f455b] via-[#234D65] to-[#2c5a73] p-5 text-white shadow-xl md:p-7">
        <div className="absolute inset-0 opacity-35 [background:radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.35),transparent_45%),radial-gradient(circle_at_90%_10%,rgba(255,255,255,0.2),transparent_40%)]" />
        <div className="absolute inset-0 opacity-10 [background-image:linear-gradient(135deg,#ffffff_1px,transparent_1px)] [background-size:22px_22px]" />

        <div className="relative z-10 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Button
              variant="secondary"
              onClick={() => router.push(routes.admin.caisseSpecialeDemandes)}
              className="h-10 bg-white/10 text-white backdrop-blur-sm hover:bg-white/20"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Retour
            </Button>

            <Badge className={cn('border px-3 py-1 text-sm font-semibold', getStatusColor(demand.status))}>
              {getStatusLabel(demand.status)}
            </Badge>
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
            <div className="space-y-3">
              <p className="text-sm font-medium text-white/80">Demande Caisse Spéciale</p>
              <h1 className="text-2xl font-black tracking-tight md:text-3xl">Détails de la demande</h1>
              <div className="inline-flex max-w-full items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-3 py-2 backdrop-blur-sm">
                <FileText className="h-4 w-4 shrink-0 text-white/80" />
                <span className="truncate font-mono text-xs text-white md:text-sm">#{demand.id}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">
              <div className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 backdrop-blur-sm">
                <p className="text-[11px] uppercase tracking-wide text-white/70">Mensuel</p>
                <p className="mt-1 text-sm font-bold md:text-base">{demand.monthlyAmount.toLocaleString('fr-FR')} FCFA</p>
              </div>
              <div className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 backdrop-blur-sm">
                <p className="text-[11px] uppercase tracking-wide text-white/70">Durée</p>
                <p className="mt-1 text-sm font-bold md:text-base">{demand.monthsPlanned} mois</p>
              </div>
              <div className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 backdrop-blur-sm col-span-2 sm:col-span-1">
                <p className="text-[11px] uppercase tracking-wide text-white/70">Total visé</p>
                <p className="mt-1 text-sm font-bold md:text-base">{totalPlannedAmount.toLocaleString('fr-FR')} FCFA</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(300px,1fr)]">
        <div className="space-y-6">
          <Card className="border-0 bg-white/95 shadow-lg">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-[#234D65]">
                <FileText className="h-5 w-5" />
                Informations générales
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Type de contrat</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">{getContractTypeLabel(demand.contractType)}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Type de caisse</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">{getCaisseTypeLabel(demand.caisseType)}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Date souhaitée</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">{formatDate(demand.desiredDate)}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Montant total estimé</p>
                  <p className="mt-1 text-sm font-semibold text-emerald-700">{totalPlannedAmount.toLocaleString('fr-FR')} FCFA</p>
                </div>
              </div>

              {demand.contractId && (
                <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50/70 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Contrat créé</p>
                  <Button
                    variant="link"
                    onClick={() => router.push(routes.admin.caisseSpecialeContractDetails(demand.contractId!))}
                    className="h-auto p-0 text-sm font-semibold text-emerald-800"
                  >
                    {demand.contractId}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {versementsTable.length > 0 && (
            <Card className="border-0 bg-white/95 shadow-lg">
              <CardHeader className="pb-3">
                <CardTitle className="text-[#234D65]">Tableau des versements prévus</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="overflow-hidden rounded-xl border border-slate-200">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50/80">
                        <TableHead className="font-semibold">Mois</TableHead>
                        <TableHead className="font-semibold">Date</TableHead>
                        <TableHead className="font-semibold">Montant FCFA</TableHead>
                        <TableHead className="font-semibold">Cumulé</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {versementsTable.map((row) => (
                        <TableRow key={row.mois} className="hover:bg-slate-50/70">
                          <TableCell className="font-medium">{row.mois}</TableCell>
                          <TableCell>{row.date}</TableCell>
                          <TableCell>{row.montant.toLocaleString('fr-FR')}</TableCell>
                          <TableCell className="font-semibold text-[#234D65]">{row.cumule.toLocaleString('fr-FR')}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="rounded-xl border border-[#234D65]/20 bg-[#234D65]/5 p-3 text-sm">
                  <span className="text-slate-600">Total prévisionnel: </span>
                  <span className="font-bold text-[#234D65]">
                    {versementsTable[versementsTable.length - 1]?.cumule.toLocaleString('fr-FR') ?? 0} FCFA
                  </span>
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="border-0 bg-white/95 shadow-lg">
            <CardHeader className="pb-3">
              <CardTitle className="text-[#234D65]">Motifs et commentaires</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Motif de la demande</p>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-800">{demandCause}</p>
              </div>

              {demand.decisionReason && (
                <div
                  className={cn(
                    'rounded-xl border p-4',
                    demand.status === 'APPROVED' || demand.status === 'CONVERTED'
                      ? 'border-emerald-200 bg-emerald-50/70'
                      : demand.status === 'REJECTED'
                        ? 'border-red-200 bg-red-50/70'
                        : 'border-slate-200 bg-slate-50/80'
                  )}
                >
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Raison de la décision</p>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-800">{demand.decisionReason}</p>
                </div>
              )}

              {demand.reopenReason && (
                <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Motif de réouverture</p>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-blue-900">{demand.reopenReason}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {demand.memberId && (
            <Card className="border-0 bg-white/95 shadow-lg">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-[#234D65]">
                  <User className="h-5 w-5" />
                  Informations du membre
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/80 p-3">
                  <Avatar className="h-12 w-12 border border-slate-200">
                    {member?.photoURL ? <AvatarImage src={member.photoURL} alt="Photo membre" /> : null}
                    <AvatarFallback className="bg-[#234D65] text-xs font-bold text-white">
                      {memberInitials}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {member ? `${member.firstName || ''} ${member.lastName || ''}`.trim() || '—' : '—'}
                    </p>
                    <p className="text-xs text-slate-500">{member?.matricule || demand.memberId}</p>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 p-2.5">
                    <span className="text-slate-500">Matricule</span>
                    <span className="font-semibold text-slate-900">{member?.matricule || '—'}</span>
                  </div>

                  <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 p-2.5">
                    <span className="flex items-center gap-1 text-slate-500">
                      <Phone className="h-3.5 w-3.5" />
                      Téléphone
                    </span>
                    <span className="max-w-[65%] truncate font-semibold text-slate-900 text-right">{memberPhone || '—'}</span>
                  </div>

                  <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 p-2.5">
                    <span className="flex items-center gap-1 text-slate-500">
                      <Mail className="h-3.5 w-3.5" />
                      Email
                    </span>
                    <span className="max-w-[65%] truncate text-right font-semibold text-slate-900">{member?.email || '—'}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {demand.emergencyContact && (
            <Card className="border-0 bg-white/95 shadow-lg">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-[#234D65]">
                  <Phone className="h-5 w-5" />
                  Contact d&apos;urgence
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="rounded-lg border border-slate-200 p-2.5">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Nom</p>
                  <p className="mt-1 font-semibold text-slate-900">
                    {[demand.emergencyContact.lastName, demand.emergencyContact.firstName].filter(Boolean).join(' ') || '—'}
                  </p>
                </div>

                <div className="rounded-lg border border-slate-200 p-2.5">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Téléphone</p>
                  <p className="mt-1 font-semibold text-slate-900">{demand.emergencyContact.phone1 || '—'}</p>
                </div>

                {demand.emergencyContact.relationship && (
                  <div className="rounded-lg border border-slate-200 p-2.5">
                    <p className="text-xs uppercase tracking-wide text-slate-500">Lien de parenté</p>
                    <p className="mt-1 font-semibold text-slate-900">{demand.emergencyContact.relationship}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <Card className="border-0 bg-white/95 shadow-lg">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-[#234D65]">
                <Clock className="h-5 w-5" />
                Historique et traçabilité
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">Créée le</p>
                <p className="mt-1 font-semibold text-slate-900">{formatDate(demand.createdAt, true)}</p>
              </div>

              {demand.decisionMadeAt && (
                <div className="rounded-lg border border-slate-200 p-3">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Décision prise le</p>
                  <p className="mt-1 font-semibold text-slate-900">{formatDate(demand.decisionMadeAt, true)}</p>
                </div>
              )}

              {demand.decisionMadeByName && (
                <div className="rounded-lg border border-slate-200 p-3">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Décision par</p>
                  <p className="mt-1 font-semibold text-slate-900">{demand.decisionMadeByName}</p>
                </div>
              )}

              {(demand.approvedByName || demand.rejectedByName) && (
                <div className="rounded-lg border border-slate-200 p-3">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Traitement statut</p>
                  <p className="mt-1 font-semibold text-slate-900">
                    {demand.approvedByName
                      ? `Acceptée par ${demand.approvedByName}`
                      : `Refusée par ${demand.rejectedByName}`}
                  </p>
                </div>
              )}

              {demand.reopenedByName && (
                <div className="rounded-lg border border-blue-200 bg-blue-50/70 p-3">
                  <p className="text-xs uppercase tracking-wide text-blue-700">Réouverte par</p>
                  <p className="mt-1 font-semibold text-blue-900">{demand.reopenedByName}</p>
                  <p className="mt-1 text-xs text-blue-800">{formatDate(demand.reopenedAt, true)}</p>
                </div>
              )}

              {demand.convertedByName && (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50/70 p-3">
                  <p className="text-xs uppercase tracking-wide text-emerald-700">Convertie par</p>
                  <p className="mt-1 font-semibold text-emerald-900">{demand.convertedByName}</p>
                  <p className="mt-1 text-xs text-emerald-800">{formatDate(demand.convertedAt, true)}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-0 bg-white/95 shadow-lg">
            <CardHeader className="pb-3">
              <CardTitle className="text-[#234D65]">Export</CardTitle>
            </CardHeader>
            <CardContent>
              <Button
                variant="outline"
                onClick={() => exportDetails(demand)}
                disabled={isExporting}
                className="w-full border-[#234D65] text-[#234D65] hover:bg-[#234D65] hover:text-white"
                title="Exporter les détails en PDF"
              >
                {isExporting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Génération...
                  </>
                ) : (
                  <>
                    <FileDown className="mr-2 h-4 w-4" />
                    Exporter en PDF
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {demand.status === 'PENDING' && (
            <Card className="border-0 bg-white/95 shadow-lg">
              <CardHeader className="pb-3">
                <CardTitle className="text-[#234D65]">Actions disponibles</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  onClick={() => router.push(routes.admin.caisseSpecialeDemandEdit(demand.id))}
                  variant="outline"
                  className="w-full border-blue-300 text-blue-700 hover:bg-blue-50"
                >
                  <FileEdit className="mr-2 h-4 w-4" />
                  Modifier la demande
                </Button>
                <Button
                  onClick={() => setAcceptModalOpen(true)}
                  className="w-full bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700"
                >
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Accepter la demande
                </Button>
                <Button
                  onClick={() => setRejectModalOpen(true)}
                  variant="destructive"
                  className="w-full"
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  Refuser la demande
                </Button>
              </CardContent>
            </Card>
          )}

          {demand.status === 'APPROVED' && !demand.contractId && (
            <Card className="border-0 bg-white/95 shadow-lg">
              <CardHeader className="pb-3">
                <CardTitle className="text-[#234D65]">Conversion en contrat</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert className="border-amber-200 bg-amber-50/70">
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                  <AlertDescription className="text-amber-900">
                    Cette demande a été acceptée, mais aucun contrat n’a encore été créé.
                  </AlertDescription>
                </Alert>

                {!activeSettings.isLoading && !activeSettings.data && (
                  <Alert className="border-red-200 bg-red-50/70">
                    <AlertCircle className="h-4 w-4 text-red-600" />
                    <AlertDescription className="flex flex-col gap-3">
                      <span>Paramètres non configurés pour ce type de caisse. Activez une version avant conversion.</span>
                      <Button
                        variant="outline"
                        onClick={() => router.push('/caisse-speciale/settings')}
                        className="w-full border-red-300 text-red-700 hover:bg-red-100"
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
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Création du contrat...
                    </>
                  ) : (
                    <>
                      <FilePlus2 className="mr-2 h-4 w-4" />
                      Convertir en contrat
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          )}

          {demand.status === 'REJECTED' && (
            <Card className="border-0 bg-white/95 shadow-lg">
              <CardHeader className="pb-3">
                <CardTitle className="text-[#234D65]">Action de suivi</CardTitle>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={() => setReopenModalOpen(true)}
                  className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
                >
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Réouvrir la demande
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

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
