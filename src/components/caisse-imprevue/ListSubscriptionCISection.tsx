'use client'
import React, { lazy, Suspense } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Plus } from 'lucide-react'
import { useSubscriptionCI } from './SubscriptionCIContext'

// Lazy loading des modals et icônes
const CreateSubscriptionCIModal = lazy(() => import('./CreateSubscriptionCIModal'))
const EditSubscriptionCIModal = lazy(() => import('./EditSubscriptionCIModal'))
const ViewSubscriptionCIModal = lazy(() => import('./ViewSubscriptionCIModal'))
const DeleteSubscriptionCIDialog = lazy(() => import('./DeleteSubscriptionCIDialog'))
const EyeIcon = lazy(() => import('lucide-react').then(mod => ({ default: mod.Eye })))
const PencilIcon = lazy(() => import('lucide-react').then(mod => ({ default: mod.Pencil })))
const TrashIcon = lazy(() => import('lucide-react').then(mod => ({ default: mod.Trash2 })))

export default function ListSubscriptionCISection() {
    const {
        state,
        dispatch,
        subscriptions,
        isLoading,
    } = useSubscriptionCI()

    const {
        showCreateModal,
        showEditModal,
        showViewModal,
        showDeleteDialog,
        selectedSubscription,
        subscriptionToDelete,
    } = state

    const formatAmount = (amount: number) => {
        return new Intl.NumberFormat('fr-FR').format(amount) + ' FCFA'
    }

    const statusColors = {
        ACTIVE: 'bg-green-100 text-green-800 border-green-300',
        INACTIVE: 'bg-gray-100 text-gray-800 border-gray-300',
    }

    const statusLabels = {
        ACTIVE: 'Actif',
        INACTIVE: 'Inactif',
    }

  return (
        <div className="space-y-6">
            {/* Header avec bouton d'ajout */}
            <div className="flex items-center justify-end">
                <Button
                    onClick={() => dispatch({ type: 'OPEN_CREATE_MODAL' })}
                    className="gap-2 bg-[#224D62] hover:bg-[#2c5a73]"
                >
                    <Plus className="w-4 h-4" />
                    Ajouter un forfait
                </Button>
            </div>

            {/* Liste des forfaits configurés */}
            <Card>
                <CardHeader>
                    <CardTitle>Forfaits configurés</CardTitle>
                    <CardDescription>
                        Liste de tous les forfaits de Caisse Imprévue créés dans le système
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="space-y-3">
                            {[1, 2, 3].map((i) => (
                                <Skeleton key={i} className="h-32 w-full" />
                            ))}
                        </div>
                    ) : subscriptions.length === 0 ? (
                        <div className="text-center py-12">
                            <p className="text-muted-foreground mb-2">Aucun forfait configuré pour le moment</p>
                            <p className="text-sm text-muted-foreground mb-4">
                                Commencez par créer un forfait basé sur les plans standards (A à E)
                            </p>
                            <Button
                                variant="outline"
                                onClick={() => dispatch({ type: 'OPEN_CREATE_MODAL' })}
                            >
                                Créer le premier forfait
                            </Button>
                        </div>
                    ) : (
                        <div className="grid gap-4">
                            {subscriptions.map((forfait) => (
                                <Card key={forfait.id} className="border-2 hover:shadow-md transition-shadow">
                                    <CardContent className="p-6">
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex-1 space-y-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex items-center justify-center w-12 h-12 rounded-full bg-[#224D62] text-white font-bold text-xl">
                                                        {forfait.code}
                                                    </div>
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <h3 className="font-bold text-lg">
                                                                {forfait.label || `Forfait ${forfait.code}`}
                                                            </h3>
                                                            <Badge className={statusColors[forfait.status]}>
                                                                {statusLabels[forfait.status]}
                                                            </Badge>
                                                        </div>
                                                        <p className="text-sm text-muted-foreground mt-1">
                                                            Code: {forfait.code}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                    <div>
                                                        <p className="text-xs text-muted-foreground">Mensuel</p>
                                                        <p className="font-semibold text-[#224D62]">
                                                            {formatAmount(forfait.amountPerMonth)}
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs text-muted-foreground">Nominal</p>
                                                        <p className="font-semibold">
                                                            {formatAmount(forfait.nominal)}
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs text-muted-foreground">Appui min</p>
                                                        <p className="font-semibold text-green-600">
                                                            {formatAmount(forfait.supportMin)}
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs text-muted-foreground">Appui max</p>
                                                        <p className="font-semibold text-green-600">
                                                            {formatAmount(forfait.supportMax)}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="flex gap-4 text-sm text-muted-foreground">
                                                    <span>Durée: <span className="font-medium text-gray-900">{forfait.durationInMonths} mois</span></span>
                                                    <span>•</span>
                                                    <span>Pénalité: <span className="font-medium text-gray-900">{forfait.penaltyRate}%</span> après <span className="font-medium text-gray-900">{forfait.penaltyDelayDays} jours</span></span>
                                                </div>
                                            </div>

                                            <div className="flex gap-2">
                                                <Suspense fallback={<Skeleton className="h-9 w-9" />}>
                                                    <Button
                                                        variant="outline"
                                                        size="icon"
                                                        onClick={() => dispatch({ type: 'OPEN_VIEW_MODAL', payload: forfait })}
                                                        title="Voir les détails"
                                                    >
                                                        <EyeIcon className="w-4 h-4" />
                                                    </Button>
                                                </Suspense>
                                                <Suspense fallback={<Skeleton className="h-9 w-9" />}>
                                                    <Button
                                                        variant="outline"
                                                        size="icon"
                                                        onClick={() => dispatch({ type: 'OPEN_EDIT_MODAL', payload: forfait })}
                                                        title="Modifier"
                                                    >
                                                        <PencilIcon className="w-4 h-4" />
                                                    </Button>
                                                </Suspense>
                                                <Suspense fallback={<Skeleton className="h-9 w-9" />}>
                                                    <Button
                                                        variant="outline"
                                                        size="icon"
                                                        onClick={() => dispatch({ type: 'OPEN_DELETE_DIALOG', payload: forfait })}
                                                        className="hover:bg-red-50 hover:text-red-600 hover:border-red-300"
                                                        title="Supprimer"
                                                    >
                                                        <TrashIcon className="w-4 h-4" />
                                                    </Button>
                                                </Suspense>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Modals et dialogs en lazy loading */}
            <Suspense fallback={null}>
                {showCreateModal && (
                    <CreateSubscriptionCIModal
                        open={showCreateModal}
                        onOpenChange={(open) => {
                            if (!open) dispatch({ type: 'CLOSE_CREATE_MODAL' })
                        }}
                    />
                )}
            </Suspense>

            <Suspense fallback={null}>
                {showEditModal && selectedSubscription && (
                    <EditSubscriptionCIModal
                        open={showEditModal}
                        onOpenChange={(open) => {
                            if (!open) dispatch({ type: 'CLOSE_EDIT_MODAL' })
                        }}
                        subscription={selectedSubscription}
                    />
                )}
            </Suspense>

            <Suspense fallback={null}>
                {showViewModal && selectedSubscription && (
                    <ViewSubscriptionCIModal
                        open={showViewModal}
                        onOpenChange={(open) => {
                            if (!open) dispatch({ type: 'CLOSE_VIEW_MODAL' })
                        }}
                        subscription={selectedSubscription}
                    />
                )}
            </Suspense>

            <Suspense fallback={null}>
                {showDeleteDialog && subscriptionToDelete && (
                    <DeleteSubscriptionCIDialog
                        open={showDeleteDialog}
                        onOpenChange={(open) => {
                            if (!open) dispatch({ type: 'CLOSE_DELETE_DIALOG' })
                        }}
                        subscription={subscriptionToDelete}
                    />
                )}
            </Suspense>
        </div>
    )
}

