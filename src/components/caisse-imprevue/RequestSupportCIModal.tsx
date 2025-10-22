'use client'

import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Loader2,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  InfoIcon,
} from 'lucide-react'
import { ContractCI } from '@/types/types'
import { useRequestSupport } from '@/hooks/caisse-imprevue'
import { useAuth } from '@/hooks/useAuth'
import { toast } from 'sonner'

interface RequestSupportCIModalProps {
  isOpen: boolean
  onClose: () => void
  contract: ContractCI
}

export default function RequestSupportCIModal({
  isOpen,
  onClose,
  contract,
}: RequestSupportCIModalProps) {
  const { user } = useAuth()
  const [amount, setAmount] = useState('')
  const requestSupportMutation = useRequestSupport()

  const handleSubmit = async () => {
    if (!user?.uid) {
      toast.error('Vous devez être connecté')
      return
    }

    const amountNum = Number(amount)

    // Validation
    if (!amount || amountNum <= 0) {
      toast.error('Veuillez saisir un montant valide')
      return
    }

    if (amountNum < contract.subscriptionCISupportMin || amountNum > contract.subscriptionCISupportMax) {
      toast.error(
        `Le montant doit être entre ${contract.subscriptionCISupportMin.toLocaleString('fr-FR')} et ${contract.subscriptionCISupportMax.toLocaleString('fr-FR')} FCFA`
      )
      return
    }

    try {
      await requestSupportMutation.mutateAsync({
        contractId: contract.id,
        amount: amountNum,
        adminId: user.uid,
      })

      setAmount('')
      onClose()
    } catch (error) {
      console.error('Erreur lors de la demande de support:', error)
    }
  }

  const isLoading = requestSupportMutation.isPending

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-[#224D62] flex items-center gap-2">
            <DollarSign className="h-6 w-6" />
            Demander une aide financière
          </DialogTitle>
          <DialogDescription>
            Accorder une aide financière au membre pour ce contrat
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Informations du contrat */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <InfoIcon className="h-5 w-5 text-blue-600 mt-0.5" />
              <div className="space-y-2 text-sm">
                <p className="font-semibold text-blue-900">
                  {contract.memberFirstName} {contract.memberLastName}
                </p>
                <p className="text-blue-700">
                  Contrat #{contract.id} - Forfait {contract.subscriptionCICode}
                </p>
                <p className="text-blue-700">
                  Cotisation mensuelle : {contract.subscriptionCIAmountPerMonth.toLocaleString('fr-FR')} FCFA
                </p>
              </div>
            </div>
          </div>

          {/* Montant de l'aide */}
          <div>
            <Label htmlFor="support-amount" className="flex items-center gap-2 mb-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              Montant de l'aide (FCFA) *
            </Label>
            <Input
              id="support-amount"
              type="number"
              placeholder={`Entre ${contract.subscriptionCISupportMin.toLocaleString('fr-FR')} et ${contract.subscriptionCISupportMax.toLocaleString('fr-FR')}`}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min={contract.subscriptionCISupportMin}
              max={contract.subscriptionCISupportMax}
              step="1000"
              required
              disabled={isLoading}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Minimum : {contract.subscriptionCISupportMin.toLocaleString('fr-FR')} FCFA • 
              Maximum : {contract.subscriptionCISupportMax.toLocaleString('fr-FR')} FCFA
            </p>
          </div>

          {/* Avertissement */}
          <Alert className="border-orange-200 bg-orange-50">
            <AlertTriangle className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-orange-700">
              <strong>Important :</strong> Le montant de l'aide sera déduit des 3 derniers mois de cotisation.
              Le membre devra rembourser cette somme avant de pouvoir effectuer de nouveaux versements.
            </AlertDescription>
          </Alert>

          {/* Information sur le remboursement */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-gray-600 mt-0.5" />
              <div className="space-y-2 text-sm text-gray-700">
                <p className="font-semibold">Modalités de remboursement :</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Le remboursement est prioritaire sur les versements mensuels</li>
                  <li>Aucun versement ne pourra être effectué tant que l'aide n'est pas remboursée</li>
                  <li>Une fois remboursé, le membre pourra à nouveau demander une aide (si éligible)</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
          >
            Annuler
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={
              isLoading ||
              !amount ||
              Number(amount) <= 0 ||
              Number(amount) < contract.subscriptionCISupportMin ||
              Number(amount) > contract.subscriptionCISupportMax
            }
            className="bg-gradient-to-r from-[#234D65] to-[#2c5a73] hover:from-[#2c5a73] hover:to-[#234D65]"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Traitement...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Accorder l'aide
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

