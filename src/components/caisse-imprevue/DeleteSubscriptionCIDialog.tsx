'use client'
import React from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { SubscriptionCI } from '@/types/types'
import { useSubscriptionCI } from './SubscriptionCIContext'

interface DeleteSubscriptionCIDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  subscription: SubscriptionCI | null
}

export default function DeleteSubscriptionCIDialog({
  open,
  onOpenChange,
  subscription,
}: DeleteSubscriptionCIDialogProps) {
  const { deleteSubscription } = useSubscriptionCI()

  const handleDelete = async () => {
    if (!subscription) return

    // Utiliser la mutation de React Query
    deleteSubscription.mutate(subscription.id, {
      onSuccess: () => {
        onOpenChange(false)
        // Toast géré par le hook de mutation
      },
      // Erreur gérée par le hook de mutation
    })
  }

  if (!subscription) return null

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p>
              Êtes-vous sûr de vouloir supprimer ce forfait ?
            </p>
            <div className="p-3 bg-gray-50 rounded-md text-sm">
              <p className="font-semibold text-gray-900">
                {subscription.label || `Forfait ${subscription.code}`}
              </p>
              <p className="text-gray-600 mt-1">
                Montant mensuel: {new Intl.NumberFormat('fr-FR').format(subscription.amountPerMonth)} FCFA
              </p>
              <p className="text-gray-600">
                Nominal: {new Intl.NumberFormat('fr-FR').format(subscription.nominal)} FCFA
              </p>
            </div>
            <p className="text-red-600 font-medium">
              Cette action est irréversible.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleteSubscription.isPending}>
            Annuler
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            className="bg-red-600 hover:bg-red-700"
            disabled={deleteSubscription.isPending}
          >
            {deleteSubscription.isPending ? 'Suppression...' : 'Supprimer'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

