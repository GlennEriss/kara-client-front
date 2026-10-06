'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { CreditContract } from '@/types/types'
import { computeWriteOffLoss } from '@/utils/credit-write-off'
import { format } from 'date-fns'
import { AlertTriangle, HandCoins } from 'lucide-react'

const fcfa = (value: number) => `${Math.round(value).toLocaleString('fr-FR')} FCFA`

const MODE_LABELS: Record<string, string> = {
  cash: 'Espèces',
  airtel_money: 'Airtel Money',
  mobicash: 'Mobicash',
  bank_transfer: 'Virement bancaire',
}

/** Bloc de la fiche contrat pour un crédit clôturé en perte : montants, motif et récupérations. */
export default function CreditWriteOffSection({
  contract,
  canRecordRecovery,
  onRecordRecovery,
}: {
  contract: CreditContract
  canRecordRecovery: boolean
  onRecordRecovery: () => void
}) {
  const writeOff = contract.writeOff
  if (!writeOff) return null
  const { gross, recovered, net } = computeWriteOffLoss(contract)
  const recoveries = [...(contract.writeOffRecoveries ?? [])].sort(
    (left, right) => new Date(right.date).getTime() - new Date(left.date).getTime(),
  )

  return (
    <Card className="border-0 border-l-4 border-l-rose-600 bg-rose-50/60 shadow-xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-rose-800">
          <AlertTriangle className="h-5 w-5" />
          Clôturé en perte
        </CardTitle>
        <p className="text-sm text-rose-700">
          Le {format(new Date(writeOff.writtenOffAt), 'dd/MM/yyyy')}
          {writeOff.writtenOffByName ? ` par ${writeOff.writtenOffByName}` : ''} — {writeOff.motif}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3 rounded-xl bg-white p-3 sm:grid-cols-3 lg:grid-cols-5">
          {[
            { title: 'Reste dû abandonné', value: fcfa(writeOff.amountRemaining) },
            { title: 'Pénalités impayées', value: fcfa(writeOff.unpaidPenalties) },
            { title: 'Récupéré depuis', value: fcfa(recovered), accent: 'text-emerald-700' },
            { title: 'Perte nette', value: fcfa(net), accent: 'text-rose-700' },
            ...(contract.guarantorId
              ? [{ title: 'Commission garant annulée', value: fcfa(writeOff.guarantorCommissionCancelled) }]
              : []),
          ].map((stat) => (
            <div key={stat.title}>
              <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400">{stat.title}</p>
              <p className={`text-sm font-bold tabular-nums ${stat.accent ?? 'text-gray-900'}`}>{stat.value}</p>
            </div>
          ))}
        </div>

        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h4 className="text-sm font-semibold text-gray-800">Récupérations</h4>
            {canRecordRecovery && net > 0 && (
              <Button type="button" size="sm" variant="outline" className="border-[#234D65] text-[#234D65]" onClick={onRecordRecovery}>
                <HandCoins className="mr-2 h-4 w-4" />
                Enregistrer une récupération
              </Button>
            )}
          </div>
          {recoveries.length === 0 ? (
            <p className="text-sm text-gray-500">Aucune somme récupérée depuis la clôture (perte brute : {fcfa(gross)}).</p>
          ) : (
            <ul className="divide-y rounded-lg border bg-white text-sm">
              {recoveries.map((recovery) => (
                <li key={recovery.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
                  <span>
                    {format(new Date(recovery.date), 'dd/MM/yyyy')} · {MODE_LABELS[recovery.mode] ?? recovery.mode}
                    {recovery.comment ? ` · ${recovery.comment}` : ''}
                  </span>
                  <span className="font-semibold text-emerald-700">{fcfa(recovery.amount)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
