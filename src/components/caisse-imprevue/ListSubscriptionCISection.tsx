'use client'
import React, { lazy, Suspense } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { CAISSE_IMPREVUE_PLANS } from '@/types/types'
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
    const { state, dispatch } = useSubscriptionCI()

    const {
        subscriptions,
        isLoading,
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
        COMPLETED: 'bg-blue-100 text-blue-800 border-blue-300',
        CANCELLED: 'bg-red-100 text-red-800 border-red-300',
        SUSPENDED: 'bg-orange-100 text-orange-800 border-orange-300',
    }

    const statusLabels = {
        ACTIVE: 'Actif',
        COMPLETED: 'Terminé',
        CANCELLED: 'Annulé',
        SUSPENDED: 'Suspendu',
    }

    const frequencyLabels = {
        DAILY: 'Journalier',
        MONTHLY: 'Mensuel',
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

            {/* Tableau des forfaits disponibles */}
            <Card>
                <CardHeader>
                    <CardTitle>Forfaits disponibles</CardTitle>
                    <CardDescription>
                        Les 5 forfaits standards de la Caisse Imprévue (A à E)
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-4">
                        {Object.values(CAISSE_IMPREVUE_PLANS).map((plan) => (
                            <Card key={plan.code} className="border-2 hover:shadow-md transition-shadow">
                                <CardContent className="p-6">
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1 space-y-3">
                                            <div className="flex items-center gap-3">
                                                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-[#224D62] text-white font-bold text-xl">
                                                    {plan.code}
                                                </div>
                                                <div>
                                                    <h3 className="font-bold text-lg">Forfait {plan.code}</h3>
                                                    <p className="text-sm text-muted-foreground">
                                                        Cotisation mensuelle
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                <div>
                                                    <p className="text-xs text-muted-foreground">Mensuel</p>
                                                    <p className="font-semibold text-[#224D62]">
                                                        {formatAmount(plan.monthlyAmount)}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-muted-foreground">Nominal (12 mois)</p>
                                                    <p className="font-semibold">
                                                        {formatAmount(plan.nominalTarget)}
                                                    </p>
                                                </div>
                                                <div className="col-span-2">
                                                    <p className="text-xs text-muted-foreground">Plage d'appui</p>
                                                    <p className="font-semibold text-green-600">
                                                        {formatAmount(plan.supportMin)} - {formatAmount(plan.supportMax)}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Liste des souscriptions actives */}
            <Card>
                <CardHeader>
                    <CardTitle>Souscriptions en cours</CardTitle>
                    <CardDescription>
                        Liste des membres ayant souscrit à un forfait
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="space-y-3">
                            {[1, 2, 3].map((i) => (
                                <Skeleton key={i} className="h-24 w-full" />
                            ))}
                        </div>
                    ) : subscriptions.length === 0 ? (
                        <div className="text-center py-12">
                            <p className="text-muted-foreground">Aucune souscription pour le moment</p>
                            <Button
                                variant="outline"
                                className="mt-4"
                                onClick={() => dispatch({ type: 'OPEN_CREATE_MODAL' })}
                            >
                                Créer la première souscription
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {subscriptions.map((subscription) => (
                                <Card key={subscription.id} className="hover:shadow-md transition-shadow">
                                    <CardContent className="p-4">
                                        <div className="flex items-center justify-between gap-4">
                                            <div className="flex-1 space-y-2">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-[#224D62] text-white font-bold">
                                                        {subscription.code}
                                                    </div>
                                                    <div>
                                                        <p className="font-semibold">Membre ID: {subscription.memberId}</p>
                                                        <div className="flex gap-2 mt-1 flex-wrap">
                                                            <Badge variant="outline" className="text-xs">
                                                                {subscription.paymentFrequency === 'DAILY' ? 'Journalier' : 'Mensuel'}
                                                            </Badge>
                                                            {subscription.status && (
                                                                <Badge className={`text-xs ${
                                                                    subscription.status === 'ACTIVE' ? 'bg-green-100 text-green-800 border-green-300' :
                                                                    subscription.status === 'COMPLETED' ? 'bg-blue-100 text-blue-800 border-blue-300' :
                                                                    subscription.status === 'CANCELLED' ? 'bg-red-100 text-red-800 border-red-300' :
                                                                    'bg-orange-100 text-orange-800 border-orange-300'
                                                                }`}>
                                                                    {subscription.status === 'ACTIVE' ? 'Actif' :
                                                                     subscription.status === 'COMPLETED' ? 'Terminé' :
                                                                     subscription.status === 'CANCELLED' ? 'Annulé' : 'Suspendu'}
                                                                </Badge>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex gap-4 text-sm flex-wrap">
                                                    <span>
                                                        <span className="text-muted-foreground">Mensuel:</span>{' '}
                                                        <span className="font-medium">{formatAmount(subscription.amountPerMonth)}</span>
                                                    </span>
                                                    <span>
                                                        <span className="text-muted-foreground">Nominal:</span>{' '}
                                                        <span className="font-medium">{formatAmount(subscription.nominal)}</span>
                                                    </span>
                                                    {subscription.totalPaid !== undefined && (
                                                        <span>
                                                            <span className="text-muted-foreground">Versé:</span>{' '}
                                                            <span className="font-medium text-blue-600">
                                                                {formatAmount(subscription.totalPaid)}
                                                            </span>
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="flex gap-2">
                                                <Suspense fallback={<Skeleton className="h-9 w-9" />}>
                                                    <Button
                                                        variant="outline"
                                                        size="icon"
                                                        onClick={() => dispatch({ type: 'OPEN_VIEW_MODAL', payload: subscription })}
                                                        title="Voir les détails"
                                                    >
                                                        <EyeIcon className="w-4 h-4" />
                                                    </Button>
                                                </Suspense>
                                                <Suspense fallback={<Skeleton className="h-9 w-9" />}>
                                                    <Button
                                                        variant="outline"
                                                        size="icon"
                                                        onClick={() => dispatch({ type: 'OPEN_EDIT_MODAL', payload: subscription })}
                                                        title="Modifier"
                                                    >
                                                        <PencilIcon className="w-4 h-4" />
                                                    </Button>
                                                </Suspense>
                                                <Suspense fallback={<Skeleton className="h-9 w-9" />}>
                                                    <Button
                                                        variant="outline"
                                                        size="icon"
                                                        onClick={() => dispatch({ type: 'OPEN_DELETE_DIALOG', payload: subscription })}
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

