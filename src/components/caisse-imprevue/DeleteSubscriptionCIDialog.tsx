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
import { toast } from 'sonner'
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
  const { dispatch } = useSubscriptionCI()

  const handleDelete = async () => {
    if (!subscription) return

    try {
      // TODO: Implémenter la suppression dans Firestore
      // await deleteSubscriptionCI(subscription.id)

      dispatch({ type: 'DELETE_SUBSCRIPTION', payload: subscription.id })
      toast.success('Forfait supprimé avec succès')
      onOpenChange(false)
    } catch (error) {
      console.error('Erreur lors de la suppression:', error)
      toast.error('Erreur lors de la suppression du forfait')
    }
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
                Forfait {subscription.code} - Membre: {subscription.memberId}
              </p>
              <p className="text-gray-600 mt-1">
                Montant mensuel: {new Intl.NumberFormat('fr-FR').format(subscription.amountPerMonth)} FCFA
              </p>
            </div>
            <p className="text-red-600 font-medium">
              Cette action est irréversible.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Annuler</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            className="bg-red-600 hover:bg-red-700"
          >
            Supprimer
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

