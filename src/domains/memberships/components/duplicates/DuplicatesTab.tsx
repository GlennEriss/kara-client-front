/**
 * Onglet Doublons : affichage des groupes par type et résolution
 * Actions : Voir, Supprimer (dossier rejeté), Marquer comme traité
 * Voir documentation/membership-requests/doublons/wireframes/WIREFRAME_ALERTE_ET_ONGLET_DOUBLONS.md
 */

'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useQueries, useQueryClient } from '@tanstack/react-query'
import { Phone, Mail, CreditCard, CheckCircle, Eye, Loader2, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useDuplicateGroups } from '../../hooks/useDuplicateGroups'
import { useMembershipActionsV2 } from '../../hooks/useMembershipActionsV2'
import { MembershipRepositoryV2 } from '../../repositories/MembershipRepositoryV2'
import { MEMBERSHIP_REQUEST_CACHE } from '@/constantes/membership-requests'
import type { DuplicateGroup, DuplicateGroupType } from '../../entities/DuplicateGroup'
import type { MembershipRequest } from '../../entities'
import { StatusBadgeV2 } from '../shared/StatusBadgeV2'
import { DeleteModalV2 } from '../modals/DeleteModalV2'
import { useAuth } from '@/hooks/useAuth'
import { toast } from 'sonner'
import routes from '@/constantes/routes'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

const TYPE_CONFIG: Record<
  DuplicateGroupType,
  { icon: typeof Phone; label: string; sectionTestId: string }
> = {
  phone: { icon: Phone, label: 'Téléphone', sectionTestId: 'duplicates-section-phone' },
  email: { icon: Mail, label: 'Email', sectionTestId: 'duplicates-section-email' },
  identityDocument: {
    icon: CreditCard,
    label: 'Pièce d\'identité',
    sectionTestId: 'duplicates-section-identity',
  },
}

type DeleteModalState = { requestId: string; matricule: string; memberName: string } | null

export function DuplicatesTab() {
  const queryClient = useQueryClient()
  const { groups, isLoading, isError, error, resolveGroup, isResolving } = useDuplicateGroups()
  const { user } = useAuth()
  const { deleteMutation } = useMembershipActionsV2()
  const [resolveModalGroupId, setResolveModalGroupId] = useState<string | null>(null)
  const [deleteModalRequest, setDeleteModalRequest] = useState<DeleteModalState>(null)

  const allRequestIds = useMemo(
    () => [...new Set(groups.flatMap((g) => g.requestIds))],
    [groups]
  )
  const repository = MembershipRepositoryV2.getInstance()
  const requestQueries = useQueries({
    queries: allRequestIds.map((requestId) => ({
      queryKey: [MEMBERSHIP_REQUEST_CACHE.QUERY_KEY, 'single', requestId],
      queryFn: () => repository.getById(requestId),
      enabled: !!requestId,
    })),
  })
  const requestMap = useMemo(() => {
    const map = new Map<string, MembershipRequest | null>()
    allRequestIds.forEach((id, i) => {
      map.set(id, requestQueries[i]?.data ?? null)
    })
    return map
  }, [allRequestIds, requestQueries])

  const groupsByType = useMemo(() => {
    const byType: Record<DuplicateGroupType, DuplicateGroup[]> = {
      phone: [],
      email: [],
      identityDocument: [],
    }
    groups.forEach((g) => {
      if (byType[g.type]) byType[g.type].push(g)
    })
    return byType
  }, [groups])

  const handleResolve = async () => {
    if (!resolveModalGroupId || !user?.uid) return
    try {
      await resolveGroup(resolveModalGroupId, user.uid)
      toast.success('Groupe marqué comme traité.')
      setResolveModalGroupId(null)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erreur lors de la résolution.')
    }
  }

  const handleDeleteConfirm = async (confirmedMatricule: string) => {
    if (!deleteModalRequest) return
    await deleteMutation.mutateAsync({
      requestId: deleteModalRequest.requestId,
      confirmedMatricule,
    })
    queryClient.invalidateQueries({ queryKey: [MEMBERSHIP_REQUEST_CACHE.DUPLICATES_GROUPS_QUERY_KEY] })
    queryClient.invalidateQueries({ queryKey: [MEMBERSHIP_REQUEST_CACHE.DUPLICATES_ALERT_QUERY_KEY] })
    setDeleteModalRequest(null)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12" data-testid="duplicates-content">
        <Loader2 className="h-8 w-8 animate-spin text-kara-primary-dark" />
      </div>
    )
  }

  if (isError) {
    return (
      <div
        className="flex flex-col items-center justify-center py-12 text-center text-kara-neutral-600"
        data-testid="duplicates-content"
      >
        <p className="font-medium text-kara-error">Erreur lors du chargement des doublons</p>
        <p className="text-sm mt-1">{error?.message ?? 'Veuillez réessayer.'}</p>
      </div>
    )
  }

  if (groups.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center py-12 text-center text-kara-neutral-600"
        data-testid="duplicates-content"
      >
        <CheckCircle className="h-12 w-12 text-kara-success mb-3" />
        <p className="font-medium">Aucun dossier en doublon</p>
        <p className="text-sm">Tous les doublons ont été traités.</p>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-6" data-testid="duplicates-content">
      {(['phone', 'email', 'identityDocument'] as const).map((type) => {
        const list = groupsByType[type]
        const config = TYPE_CONFIG[type]
        const Icon = config.icon
        if (list.length === 0) return null
        return (
          <section key={type} data-testid={config.sectionTestId}>
            <h3 className="text-sm font-semibold text-kara-neutral-700 mb-3 flex items-center gap-2">
              <Icon className="h-4 w-4" />
              Par {config.label.toLowerCase()} ({list.length} groupe{list.length > 1 ? 's' : ''})
            </h3>
            <div className="space-y-4">
              {list.map((group) => (
                <div
                  key={group.id}
                  data-testid={`duplicate-group-${group.id}`}
                  className="border border-kara-neutral-200 rounded-lg overflow-hidden"
                >
                  <div className="px-4 py-3 bg-kara-neutral-50 border-b border-kara-neutral-200 flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium text-kara-primary-dark">
                      {group.type === 'phone' && group.value}
                      {group.type === 'email' && group.value}
                      {group.type === 'identityDocument' && group.value}
                    </span>
                    <span className="text-sm text-kara-neutral-500">
                      {group.requestCount} dossier{group.requestCount > 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="divide-y divide-kara-neutral-100">
                    {group.requestIds.map((requestId) => {
                      const request = requestMap.get(requestId)
                      return (
                        <div
                          key={requestId}
                          className="px-4 py-3 flex flex-wrap items-center justify-between gap-2"
                        >
                          <div className="min-w-0 flex-1">
                            {request ? (
                              <>
                                <span className="font-mono text-xs text-kara-neutral-600">
                                  {request.matricule}
                                </span>
                                <span className="ml-2">
                                  {request.identity?.lastName} {request.identity?.firstName}
                                </span>
                                <span className="ml-2">
                                  <StatusBadgeV2 status={request.status} />
                                </span>
                              </>
                            ) : (
                              <span className="text-kara-neutral-400">Chargement…</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <Link
                              href={routes.admin.membershipRequestDetails(requestId)}
                              className="text-sm font-medium text-kara-primary-dark hover:underline inline-flex items-center gap-1"
                              data-testid={`view-request-${requestId}`}
                            >
                              <Eye className="h-3.5 w-3.5" />
                              Voir
                            </Link>
                            {request?.status === 'rejected' && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 text-kara-error hover:text-kara-error hover:bg-kara-error/10"
                                      onClick={() =>
                                        setDeleteModalRequest({
                                          requestId,
                                          matricule: request.matricule,
                                          memberName: `${request.identity?.firstName ?? ''} ${request.identity?.lastName ?? ''}`.trim(),
                                        })
                                      }
                                      data-testid={`delete-request-${requestId}`}
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Supprimer définitivement ce dossier</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  <div className="px-4 py-3 bg-kara-neutral-50/50 flex justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setResolveModalGroupId(group.id)}
                      disabled={isResolving}
                      data-testid={`resolve-group-${group.id}`}
                    >
                      {isResolving ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        'Marquer comme traité'
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )
      })}

      <Dialog open={!!resolveModalGroupId} onOpenChange={() => setResolveModalGroupId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmer la résolution</DialogTitle>
            <DialogDescription>
              Ce groupe de doublons sera marqué comme traité et ne s&apos;affichera plus.
              Avez-vous fusionné, rejeté ou vérifié ces dossiers ?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResolveModalGroupId(null)}>
              Annuler
            </Button>
            <Button
              onClick={handleResolve}
              disabled={isResolving}
              className="bg-kara-primary-dark text-white hover:bg-kara-primary-dark/90"
            >
              {isResolving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirmer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Suppression (dossier rejeté uniquement) */}
      {deleteModalRequest && (
        <DeleteModalV2
          isOpen={!!deleteModalRequest}
          onClose={() => setDeleteModalRequest(null)}
          onConfirm={handleDeleteConfirm}
          requestId={deleteModalRequest.requestId}
          memberName={deleteModalRequest.memberName}
          matricule={deleteModalRequest.matricule}
          isLoading={deleteMutation.isPending}
        />
      )}
    </div>
  )
}
