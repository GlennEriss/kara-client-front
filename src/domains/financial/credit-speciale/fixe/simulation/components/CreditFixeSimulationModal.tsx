'use client'

import React from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Calculator } from 'lucide-react'
import type { StandardSimulation, CustomSimulation } from '@/types/types'
import { CreditFixeSimulationSection } from './CreditFixeSimulationSection'

interface CreditFixeSimulationModalProps {
  isOpen: boolean
  onClose: () => void
  initialAmount?: number
  lockAmount?: boolean
  creditType?: 'FIXE' | 'AIDE'
  onSimulationComplete?: (simulation: StandardSimulation | CustomSimulation) => void
}

export default function CreditFixeSimulationModal({
  isOpen,
  onClose,
  initialAmount,
  lockAmount = true,
  creditType = 'FIXE',
  onSimulationComplete,
}: CreditFixeSimulationModalProps) {
  const isAide = creditType === 'AIDE'
  const title = isAide ? 'Simulation de crédit Aide' : 'Simulation de crédit Fixe'
  const description = isAide
    ? 'Utilisez la simulation Crédit Aide (0% à 5%, 3 mois max) avant la création du contrat.'
    : 'Utilisez la simulation Crédit Fixe avant la création du contrat.'

  if (!isOpen) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="!max-w-[92vw] !w-[92vw] max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-[#224D62] flex items-center gap-2">
            <Calculator className="h-6 w-6" />
            {title}
          </DialogTitle>
          <DialogDescription>
            {description}
          </DialogDescription>
        </DialogHeader>

        <CreditFixeSimulationSection
          key={creditType}
          initialAmount={initialAmount}
          lockAmount={lockAmount}
          creditType={creditType}
          onSimulationSelect={(simulation) => {
            onSimulationComplete?.(simulation)
            onClose()
          }}
        />
      </DialogContent>
    </Dialog>
  )
}
