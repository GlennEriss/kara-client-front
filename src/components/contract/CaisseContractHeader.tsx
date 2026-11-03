'use client'

import type { ReactNode } from 'react'
import { ContractDetailHeader } from './ContractDetailHeader'
import { getCaisseContractDisplayStatus, getContractStatusConfig } from '@/utils/contract-status'

interface CaisseContractHeaderProps {
  contractLabel: string
  status: string
  refunds?: Array<{ type?: string; status?: string }>
  readOnly?: boolean
  onBack: () => void
  children: ReactNode
  extraBadges?: ReactNode
}

/** Navigation et actions au-dessus de l'état du contrat, sur toutes les tailles d'écran. */
export function CaisseContractHeader({
  contractLabel, status, refunds, readOnly, onBack, children, extraBadges,
}: CaisseContractHeaderProps) {
  const displayStatus = getCaisseContractDisplayStatus(status, refunds)
  const config = getContractStatusConfig(displayStatus)
  const pending = ['EARLY_REFUND_PENDING', 'EARLY_WITHDRAW_REQUESTED', 'FINAL_REFUND_PENDING'].includes(displayStatus)
  const statusLabel = displayStatus === 'EARLY_REFUND_PENDING'
    ? 'Retrait anticipé · remise en attente'
    : config.label
  const readOnlyMessage = displayStatus === 'EARLY_WITHDRAW_REQUESTED'
    ? 'Les nouveaux versements sont suspendus. La demande de retrait reste à examiner.'
    : pending
      ? 'Les nouveaux versements sont suspendus. La remise d’argent reste à confirmer.'
      : 'Ce contrat est en lecture seule.'

  return (
    <ContractDetailHeader
      contractLabel={contractLabel}
      statusLabel={statusLabel}
      statusClassName={`${config.bg} ${config.text}`}
      statusIcon={config.icon}
      onBack={onBack}
      extraBadges={extraBadges}
      description={readOnly ? readOnlyMessage : undefined}
    >
      {children}
    </ContractDetailHeader>
  )
}
