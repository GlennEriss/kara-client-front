'use client'

import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { ModalBody, ModalContent, ModalFooter, ModalHeader } from '@/components/ui/modal'
import { useAgentRecouvrement } from '@/hooks/agent-recouvrement'
import type { CreditContract, CreditMissedEarningsPayment } from '@/types/types'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

const MODE_LABELS: Record<string, string> = {
  cash: 'Espèces',
  airtel_money: 'Airtel Money',
  mobicash: 'Mobicash',
  bank_transfer: 'Virement bancaire',
  other: 'Autre',
}

/** Facture d'un encaissement de manque à gagner, après la fin du contrat. */
export default function MissedEarningsReceiptModal({
  contract,
  payment,
  onClose,
}: {
  contract: CreditContract
  payment: CreditMissedEarningsPayment | null
  onClose: () => void
}) {
  const { data: agent } = useAgentRecouvrement(payment?.agentRecouvrementId)
  if (!payment) return null

  const isMobileMoney = payment.mode === 'airtel_money' || payment.mode === 'mobicash'

  const rows: Array<[string, string]> = [
    ['Contrat', contract.id],
    ['Client', `${contract.clientFirstName ?? ''} ${contract.clientLastName ?? ''}`.trim() || '—'],
    ['Montant encaissé', `${payment.amount.toLocaleString('fr-FR')} FCFA`],
    ['Date du versement', `${format(payment.date, 'dd MMMM yyyy', { locale: fr })}${payment.paymentTime ? ` à ${payment.paymentTime}` : ''}`],
    [
      'Moyen de paiement',
      `${MODE_LABELS[payment.mode] ?? payment.mode}${isMobileMoney && payment.withFees !== undefined ? ` (${payment.withFees ? 'avec frais' : 'sans frais'})` : ''}`,
    ],
    ['Agent de recouvrement', agent ? `${agent.prenom} ${agent.nom}`.trim() : payment.agentRecouvrementId || '—'],
    ['Enregistré par', payment.recordedByName || payment.recordedBy],
    ['Enregistré le', format(payment.recordedAt, "dd/MM/yyyy 'à' HH:mm", { locale: fr })],
    ['Référence', payment.id],
  ]

  return (
    <Dialog open={!!payment} onOpenChange={(open) => !open && onClose()}>
      <ModalContent size="sm">
        <ModalHeader
          title="Facture — manque à gagner"
          description="Somme versée par le membre après la fin du contrat."
        />
        <ModalBody>
          <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
            {rows.map(([label, value]) => (
              <div key={label}>
                <dt className="text-slate-500">{label}</dt>
                <dd className="font-medium text-slate-900 break-all">{value}</dd>
              </div>
            ))}
            <div>
              <dt className="text-slate-500">Preuve</dt>
              <dd className="font-medium">
                {payment.proofUrl ? (
                  <a href={payment.proofUrl} target="_blank" rel="noopener noreferrer" className="text-[#234D65] hover:underline">
                    Ouvrir la preuve
                  </a>
                ) : (
                  'Aucune preuve'
                )}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-slate-500">Commentaire</dt>
              <dd className="font-medium text-slate-900 whitespace-pre-wrap">{payment.comment || 'Aucun commentaire'}</dd>
            </div>
          </dl>
        </ModalBody>
        <ModalFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Fermer
          </Button>
        </ModalFooter>
      </ModalContent>
    </Dialog>
  )
}
