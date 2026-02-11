'use client'

import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useSubscriptionsCICache } from '@/domains/financial/caisse-imprevue/hooks/useSubscriptionsCICache'
import { useContractCIMutations } from '@/domains/financial/caisse-imprevue/hooks/useContractCIMutations'
import type { ContractCI } from '@/types/types'
import { cn } from '@/lib/utils'
import { Package, Check } from 'lucide-react'

interface EditContractCategoryCIModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  contract: ContractCI
  onSuccess?: () => void
}

export default function EditContractCategoryCIModal({
  open,
  onOpenChange,
  contract,
  onSuccess,
}: EditContractCategoryCIModalProps) {
  const [selectedSubscriptionId, setSelectedSubscriptionId] = useState<string | null>(null)
  const { data: subscriptions, isLoading } = useSubscriptionsCICache()
  const { updateContractSubscription } = useContractCIMutations()
  const mutation = updateContractSubscription

  useEffect(() => {
    if (open) {
      setSelectedSubscriptionId(null)
    }
  }, [open])

  const handleSubmit = () => {
    if (!selectedSubscriptionId || selectedSubscriptionId === contract.subscriptionCIID) return
    mutation.mutate(
      { contractId: contract.id, subscriptionId: selectedSubscriptionId },
      {
        onSuccess: () => {
          onOpenChange(false)
          onSuccess?.()
        },
      }
    )
  }

  const formatAmount = (n: number) => new Intl.NumberFormat('fr-FR').format(n) + ' FCFA'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Modifier la catégorie du contrat
          </DialogTitle>
          <DialogDescription>
            Contrat <span className="font-mono text-xs">{contract.id}</span>. Catégorie actuelle :{' '}
            <strong>{contract.subscriptionCICode}</strong>. Choisissez la nouvelle catégorie.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <Skeleton className="h-48 w-full" />
        ) : (
          <div className="grid gap-2 max-h-64 overflow-y-auto py-2">
            {subscriptions?.map((sub) => {
              const isCurrent = sub.id === contract.subscriptionCIID
              const isSelected = sub.id === selectedSubscriptionId
              return (
                <button
                  key={sub.id}
                  type="button"
                  onClick={() => !isCurrent && setSelectedSubscriptionId(sub.id)}
                  disabled={isCurrent}
                  className={cn(
                    'flex items-center justify-between rounded-lg border p-3 text-left transition-colors',
                    isCurrent && 'opacity-60 cursor-not-allowed bg-muted',
                    !isCurrent && 'hover:bg-muted/60 cursor-pointer',
                    isSelected && !isCurrent && 'ring-2 ring-[#234D65] bg-[#234D65]/5'
                  )}
                >
                  <div>
                    <span className="font-semibold">{sub.code}</span>
                    {sub.label && (
                      <span className="text-muted-foreground text-sm ml-2">{sub.label}</span>
                    )}
                    {isCurrent && (
                      <span className="ml-2 text-xs text-muted-foreground">(actuel)</span>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatAmount(sub.amountPerMonth)}/mois · Nominal {formatAmount(sub.nominal ?? 0)}
                    </p>
                  </div>
                  {isSelected && !isCurrent && <Check className="h-5 w-5 text-[#234D65]" />}
                </button>
              )
            })}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              !selectedSubscriptionId ||
              selectedSubscriptionId === contract.subscriptionCIID ||
              mutation.isPending
            }
            className="bg-[#234D65] hover:bg-[#2c5a73]"
          >
            {mutation.isPending ? 'Enregistrement…' : 'Enregistrer la catégorie'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
