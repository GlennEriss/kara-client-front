'use client'

import Link from 'next/link'
import { useMemo } from 'react'
import {
  AlertCircle,
  BriefcaseBusiness,
  CircleDollarSign,
  FolderOpen,
  HandCoins,
  HeartHandshake,
  Landmark,
  PiggyBank,
  UserRound,
  Wallet,
} from 'lucide-react'
import { Dialog } from '@/components/ui/dialog'
import { ModalBody, ModalContent, ModalHeader } from '@/components/ui/modal'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { MemberFormCard } from '@/domains/community/member-form'
import { cn } from '@/lib/utils'
import { useMemberOverview } from '../hooks/useMemberOverview'
import { MemberOverviewAggregationService } from '../services/MemberOverviewAggregationService'
import type {
  MemberOverviewListItem,
  MemberOverviewModuleKey,
} from '../entities/member-overview.types'
import { memberOverviewDetailRoute } from '../entities/member-overview-navigation'
import { useState } from 'react'

interface MemberOverviewPanelProps {
  memberId?: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

const MODULE_META: Record<
  MemberOverviewModuleKey,
  {
    label: string
    icon: React.ComponentType<{ className?: string }>
    accent: string
    bg: string
  }
> = {
  caisseSpeciale: {
    label: 'Caisse spéciale',
    icon: BriefcaseBusiness,
    accent: 'text-sky-700',
    bg: 'bg-sky-50',
  },
  caisseImprevue: {
    label: 'Caisse imprévue',
    icon: Wallet,
    accent: 'text-violet-700',
    bg: 'bg-violet-50',
  },
  creditSpeciale: {
    label: 'Crédit spécial',
    icon: CircleDollarSign,
    accent: 'text-emerald-700',
    bg: 'bg-emerald-50',
  },
  creditFixe: {
    label: 'Crédit fixe',
    icon: Landmark,
    accent: 'text-amber-700',
    bg: 'bg-amber-50',
  },
  creditAide: {
    label: 'Caisse aide',
    icon: HandCoins,
    accent: 'text-rose-700',
    bg: 'bg-rose-50',
  },
  placement: {
    label: 'Placements',
    icon: PiggyBank,
    accent: 'text-cyan-700',
    bg: 'bg-cyan-50',
  },
  charite: {
    label: 'Charité',
    icon: HeartHandshake,
    accent: 'text-emerald-700',
    bg: 'bg-emerald-50',
  },
}

function statusTone(status: string) {
  const normalized = (status || '').toUpperCase()
  if (['APPROVED', 'ACTIVE', 'SIMULATED', 'DRAFT'].includes(normalized)) {
    return 'bg-emerald-50 text-emerald-700 border-emerald-200'
  }
  if (['PENDING', 'DUE', 'PARTIAL'].includes(normalized)) {
    return 'bg-amber-50 text-amber-700 border-amber-200'
  }
  if (
    [
      'OVERDUE',
      'BLOCKED',
      'REJECTED',
      'CANCELED',
      'CLOSED',
      'DISCHARGED',
      'EARLYEXIT',
    ].includes(normalized)
  ) {
    return 'bg-rose-50 text-rose-700 border-rose-200'
  }
  return 'bg-gray-50 text-gray-700 border-gray-200'
}

function formatDate(iso?: string) {
  if (!iso) return 'Date non disponible'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return 'Date non disponible'
  return date.toLocaleDateString('fr-FR')
}

function ModuleRecordCard({
  item,
  detailRoute,
  onNavigate,
}: {
  item: MemberOverviewListItem
  detailRoute: string | null
  /** Ferme le panneau : sans ça il resterait ouvert par-dessus la page ouverte. */
  onNavigate: () => void
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
      <div className="space-y-2">
        {item.label ? (
          <p className="text-sm font-semibold text-gray-900">{item.label}</p>
        ) : null}
        {detailRoute ? (
          <Link
            href={detailRoute}
            onClick={onNavigate}
            className="block break-all text-sm font-semibold text-[#234D65] underline-offset-4 hover:underline"
            aria-label={`Ouvrir ${item.kind === 'contrat' ? 'le contrat' : 'la demande'} ${item.id}`}
          >
            {item.id}
          </Link>
        ) : (
          <p className="break-all text-sm font-semibold text-gray-900">
            {item.id}
          </p>
        )}

        {detailRoute ? (
          <div>
            <Button
              asChild
              variant="outline"
              size="sm"
              className="h-8 rounded-lg text-xs"
            >
              <Link href={detailRoute} onClick={onNavigate}>
                <FolderOpen className="mr-1 h-3.5 w-3.5" />
                Ouvrir
              </Link>
            </Button>
          </div>
        ) : null}

        <Badge
          className={cn(
            'border text-[11px] font-semibold',
            statusTone(item.status),
          )}
        >
          {item.status === 'RESCINDED' || (item.module === 'caisseImprevue' && item.status === 'CANCELED') ? 'Résilié' : item.status}
        </Badge>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-1 text-xs text-gray-600 sm:grid-cols-2">
        <p>
          <span className="font-medium text-gray-700">Créé le:</span>{' '}
          {formatDate(item.createdAt)}
        </p>
        <p>
          <span className="font-medium text-gray-700">Montant:</span>{' '}
          {item.amount !== undefined
            ? `${item.amount.toLocaleString('fr-FR')} FCFA`
            : 'N/A'}
        </p>
      </div>
    </div>
  )
}

function EmptyModuleState({ title }: { title: string }) {
  return (
    <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-5 text-sm text-gray-500">
      Aucun élément trouvé dans{' '}
      <span className="font-medium text-gray-700">{title}</span>.
    </div>
  )
}

function OverviewRecords({
  title,
  items,
  onNavigate,
}: {
  title: string
  items: MemberOverviewListItem[]
  onNavigate: () => void
}) {
  const [limit, setLimit] = useState(6)
  return (
    <div className="space-y-3">
      <h4 className="text-sm font-semibold text-[#234D65]">
        {title} ({items.length})
      </h4>
      {!items.length ? (
        <EmptyModuleState title={title} />
      ) : (
        items
          .slice(0, limit)
          .map((item) => (
            <ModuleRecordCard
              key={item.id}
              item={item}
              detailRoute={memberOverviewDetailRoute(item)}
              onNavigate={onNavigate}
            />
          ))
      )}
      {limit < items.length && (
        <Button
          variant="outline"
          onClick={() => setLimit((value) => value + 10)}
        >
          Afficher davantage ({items.length - limit})
        </Button>
      )}
    </div>
  )
}

export function MemberOverviewPanel({
  memberId,
  open,
  onOpenChange,
}: MemberOverviewPanelProps) {
  const { data, isLoading, isError, error } = useMemberOverview(memberId, open)
  const [expanded, setExpanded] = useState<string | null>(null)
  const moduleRoutes =
    MemberOverviewAggregationService.getInstance().getModuleListRoutes()

  const defaultTab = useMemo(() => {
    if (!data) return 'caisseSpeciale'
    const firstNonEmpty = (
      Object.keys(data.modules) as MemberOverviewModuleKey[]
    ).find((key) => {
      const module = data.modules[key]
      return module.demandes.length > 0 || module.contrats.length > 0
    })
    return firstNonEmpty || 'caisseSpeciale'
  }, [data])

  const getDetailRoute = memberOverviewDetailRoute

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <ModalContent size="4xl" className="max-h-[88vh] w-[94vw]">
        <ModalHeader
          icon={UserRound}
          title="Vue consolidée du membre"
          description="Lecture consolidée multi-modules"
        />
        {data?.member ? (
          <div className="flex flex-wrap items-center gap-2 px-6 pb-2 text-sm">
            <Badge className="bg-[#234D65] text-white hover:bg-[#234D65]">
              {data.member.firstName} {data.member.lastName}
            </Badge>
            {data.member.matricule ? (
              <Badge variant="outline">{data.member.matricule}</Badge>
            ) : null}
            <Badge variant={data.member.isActive ? 'default' : 'secondary'}>
              {data.member.isActive ? 'Actif' : 'Inactif'}
            </Badge>
          </div>
        ) : null}
        <ModalBody className="bg-gray-50">
          <div className="flex-1">
            {isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-24 w-full rounded-xl" />
                <Skeleton className="h-36 w-full rounded-xl" />
                <Skeleton className="h-96 w-full rounded-xl" />
              </div>
            ) : isError ? (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Impossible de charger la vue consolidée.{' '}
                  {error instanceof Error ? error.message : ''}
                </AlertDescription>
              </Alert>
            ) : !data ? (
              <Card>
                <CardContent className="p-6 text-sm text-gray-600">
                  Aucune donnée membre à afficher.
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-5">
                {memberId ? (
                  <MemberFormCard
                    memberId={memberId}
                    onNavigate={() => onOpenChange(false)}
                  />
                ) : null}

                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {(Object.keys(data.modules) as MemberOverviewModuleKey[]).map(
                    (key) => {
                      const meta = MODULE_META[key]
                      const Icon = meta.icon
                      const module = data.modules[key]
                      const total =
                        module.demandes.length + module.contrats.length

                      return (
                        <Card key={key} className="border-gray-100 shadow-sm">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between gap-3">
                              <div className={cn('rounded-lg p-2', meta.bg)}>
                                <Icon className={cn('h-5 w-5', meta.accent)} />
                              </div>
                              {module.hasError ? (
                                <Badge
                                  variant="outline"
                                  className="border-amber-200 bg-amber-50 text-xs text-amber-700"
                                  title="Certaines données n'ont pas pu être chargées : le total affiché est incomplet."
                                >
                                  <AlertCircle className="mr-1 h-3.5 w-3.5" />
                                  Indisponible
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-xs">
                                  {total} en cours
                                </Badge>
                              )}
                            </div>
                            <p className="mt-3 text-sm font-semibold text-gray-900">
                              {meta.label}
                            </p>
                            <div className="mt-2 flex flex-wrap gap-2 text-xs">
                              {[
                                {
                                  key: 'demandes',
                                  label: 'Demandes',
                                  count: module.demandes.length,
                                },
                                {
                                  key: 'contrats',
                                  label:
                                    key === 'charite'
                                      ? 'Contributions'
                                      : 'Contrats en suivi',
                                  count: module.contrats.length,
                                },
                                ...(module.closedContrats !== undefined
                                  ? [
                                      {
                                        key: 'closed',
                                        label: 'Clôturés',
                                        count: module.closedContrats,
                                      },
                                    ]
                                  : []),
                                ...(module.terminatedContrats !== undefined ? [{key:'terminated',label:'Résiliés',count:module.terminatedContrats}]:[]),
                              ].map((group) => (
                                <Button
                                  key={group.key}
                                  variant="outline"
                                  size="sm"
                                  className="rounded-lg text-xs"
                                  disabled={group.count == null}
                                  aria-expanded={
                                    expanded === `${key}:${group.key}`
                                  }
                                  aria-label={`Voir ${group.label.toLocaleLowerCase('fr')} ${meta.label} (${group.count ?? 'indisponible'})`}
                                  onClick={() =>
                                    setExpanded((current) =>
                                      current === `${key}:${group.key}`
                                        ? null
                                        : `${key}:${group.key}`,
                                    )
                                  }
                                >
                                  {group.label}: {group.count ?? '—'}
                                </Button>
                              ))}
                            </div>
                            {expanded?.startsWith(`${key}:`) && (
                              <div className="mt-4 border-t pt-4">
                                <OverviewRecords
                                  key={`${memberId}:${expanded}`}
                                  title={
                                    expanded.endsWith(':terminated') ? 'Contrats résiliés' : expanded.endsWith(':closed')
                                      ? 'Contrats clôturés'
                                      : expanded.endsWith(':demandes')
                                        ? 'Demandes'
                                        : key === 'charite'
                                          ? 'Contributions'
                                          : 'Contrats en suivi'
                                  }
                                  items={
                                    expanded.endsWith(':terminated') ? module.terminatedContracts || [] : expanded.endsWith(':closed')
                                      ? module.closedContracts || []
                                      : expanded.endsWith(':demandes')
                                        ? module.demandes
                                        : module.contrats
                                  }
                                  onNavigate={() => onOpenChange(false)}
                                />
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      )
                    },
                  )}
                </div>

                <Card className="border-gray-100 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-bold text-[#234D65]">
                      Détails opérationnels par module
                    </CardTitle>
                    <p className="text-sm text-gray-500">
                      Clique sur un onglet, puis ouvre directement la demande ou
                      le contrat concerné.
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Tabs defaultValue={defaultTab} className="gap-4">
                      <TabsList className="h-auto w-full justify-start overflow-x-auto rounded-xl bg-gray-100 p-1">
                        {(
                          Object.keys(data.modules) as MemberOverviewModuleKey[]
                        ).map((key) => {
                          const module = data.modules[key]
                          const total =
                            module.demandes.length + module.contrats.length
                          return (
                            <TabsTrigger
                              key={key}
                              value={key}
                              className="min-w-fit rounded-lg px-4 py-2 data-[state=active]:bg-white data-[state=active]:text-[#234D65]"
                            >
                              {MODULE_META[key].label}
                              <Badge
                                variant="outline"
                                className="ml-2 text-[11px]"
                              >
                                {total}
                              </Badge>
                            </TabsTrigger>
                          )
                        })}
                      </TabsList>

                      {(
                        Object.keys(data.modules) as MemberOverviewModuleKey[]
                      ).map((key) => {
                        const module = data.modules[key]
                        const moduleLinks = moduleRoutes[key]
                        return (
                          <TabsContent key={key} value={key} className="mt-0">
                            <div className="grid gap-4 lg:grid-cols-2">
                              <Card className="border-gray-100">
                                <CardHeader className="pb-3">
                                  <div className="flex items-center justify-between gap-2">
                                    <CardTitle className="text-sm font-bold text-[#234D65]">
                                      Demandes en suivi
                                    </CardTitle>
                                    <Button
                                      asChild
                                      variant="outline"
                                      size="sm"
                                      className="h-8 rounded-lg text-xs"
                                    >
                                      <Link
                                        href={moduleLinks.demandes}
                                        onClick={() => onOpenChange(false)}
                                      >
                                        Voir toutes
                                      </Link>
                                    </Button>
                                  </div>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                  {module.demandes.length === 0 ? (
                                    <EmptyModuleState title="Demandes" />
                                  ) : (
                                    module.demandes.map((item, index) => (
                                      <div key={item.id}>
                                        <ModuleRecordCard
                                          item={item}
                                          detailRoute={getDetailRoute(item)}
                                          onNavigate={() => onOpenChange(false)}
                                        />
                                        {index < module.demandes.length - 1 ? (
                                          <Separator className="my-3" />
                                        ) : null}
                                      </div>
                                    ))
                                  )}
                                </CardContent>
                              </Card>

                              <Card className="border-gray-100">
                                <CardHeader className="pb-3">
                                  <div className="flex items-center justify-between gap-2">
                                    <CardTitle className="text-sm font-bold text-[#234D65]">
                                      Contrats en suivi
                                    </CardTitle>
                                    <Button
                                      asChild
                                      variant="outline"
                                      size="sm"
                                      className="h-8 rounded-lg text-xs"
                                    >
                                      <Link
                                        href={moduleLinks.contrats}
                                        onClick={() => onOpenChange(false)}
                                      >
                                        Voir tous
                                      </Link>
                                    </Button>
                                  </div>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                  {module.contrats.length === 0 ? (
                                    <EmptyModuleState title="Contrats" />
                                  ) : (
                                    module.contrats.map((item, index) => (
                                      <div key={item.id}>
                                        <ModuleRecordCard
                                          item={item}
                                          detailRoute={getDetailRoute(item)}
                                          onNavigate={() => onOpenChange(false)}
                                        />
                                        {index < module.contrats.length - 1 ? (
                                          <Separator className="my-3" />
                                        ) : null}
                                      </div>
                                    ))
                                  )}
                                </CardContent>
                              </Card>
                            </div>
                          </TabsContent>
                        )
                      })}
                    </Tabs>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </ModalBody>
      </ModalContent>
    </Dialog>
  )
}
