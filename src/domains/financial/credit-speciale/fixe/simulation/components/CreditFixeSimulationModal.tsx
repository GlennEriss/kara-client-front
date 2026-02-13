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
  onSimulationComplete?: (simulation: StandardSimulation | CustomSimulation) => void
}

export default function CreditFixeSimulationModal({
  isOpen,
  onClose,
  initialAmount,
  lockAmount = true,
  onSimulationComplete,
}: CreditFixeSimulationModalProps) {
  if (!isOpen) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="!max-w-[92vw] !w-[92vw] max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-[#224D62] flex items-center gap-2">
            <Calculator className="h-6 w-6" />
            Simulation de crédit Fixe
          </DialogTitle>
          <DialogDescription>
            Utilisez la simulation Crédit Fixe avant la création du contrat.
          </DialogDescription>
        </DialogHeader>

        <CreditFixeSimulationSection
          initialAmount={initialAmount}
          lockAmount={lockAmount}
          onSimulationSelect={(simulation) => {
            onSimulationComplete?.(simulation)
            onClose()
          }}
        />
      </DialogContent>
    </Dialog>
  )
}
