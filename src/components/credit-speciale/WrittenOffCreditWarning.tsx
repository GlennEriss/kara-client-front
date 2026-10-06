'use client'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { useCreditContracts } from '@/hooks/useCreditSpeciale'
import { computeWriteOffLoss } from '@/utils/credit-write-off'
import { format } from 'date-fns'
import { AlertTriangle } from 'lucide-react'

/**
 * Avertit qu'un membre a déjà un crédit clôturé en perte. La nouvelle demande
 * reste possible : l'admin décide en connaissance de cause.
 */
export default function WrittenOffCreditWarning({ memberId }: { memberId?: string | null }) {
  const { data: contracts = [] } = useCreditContracts(memberId ? { clientId: memberId } : undefined)
  if (!memberId) return null
  const writtenOff = contracts.filter((contract) => contract.clientId === memberId && contract.status === 'WRITTEN_OFF')
  if (writtenOff.length === 0) return null

  const netLoss = writtenOff.reduce((sum, contract) => sum + computeWriteOffLoss(contract).net, 0)
  const last = writtenOff
    .map((contract) => contract.writeOff?.writtenOffAt)
    .filter((date): date is Date => !!date)
    .sort((left, right) => new Date(right).getTime() - new Date(left).getTime())[0]

  return (
    <Alert className="border-rose-200 bg-rose-50">
      <AlertTriangle className="h-4 w-4 text-rose-700" />
      <AlertDescription className="text-sm text-rose-800">
        Ce membre a {writtenOff.length > 1 ? `${writtenOff.length} crédits clôturés` : 'un crédit clôturé'} en perte
        {last ? ` (dernier le ${format(new Date(last), 'dd/MM/yyyy')})` : ''}
        {netLoss > 0 ? ` : ${netLoss.toLocaleString('fr-FR')} FCFA non remboursés.` : ', entièrement récupéré depuis.'}
      </AlertDescription>
    </Alert>
  )
}
