import type { FinancialReportModule } from '../entities/financial-report.types'
import type {
  FinancialReportContext,
  FinancialReportSources,
} from '../entities/financial-report-sources.types'
import { agreementToday, validAgreementDate } from '@/domains/groups/agreements/agreement-model'
import {
  flowValues,
  stockValues,
  makeBlock,
  makeLine,
  subtractValues,
  type MonthAmount,
} from '../utils/report-lines'

/** Money held for another member is a liability, never KARA income. Direct
 * member-to-member payments never enter KARA's treasury. */
export function buildMemberAgreementsModule(
  sources: FinancialReportSources,
  context: FinancialReportContext,
): FinancialReportModule {
  const receipts: MonthAmount[] = [],
    remittances: MonthAmount[] = []
  const cutoff = agreementToday(context.now)
  for (const agreement of sources.groupAgreements || []) {
    for (const [field, target] of [
      ['payments', receipts],
      ['remittances', remittances],
    ] as const) {
      const records = Array.isArray(agreement[field]) ? agreement[field] : []
      for (const record of records) {
        if (!record || typeof record !== 'object') continue
        const p = record as Record<string, unknown>
        if (
          p.voidedAt ||
          (field === 'payments' && p.receivedBy !== 'KARA') ||
          !validAgreementDate(p.date) ||
          p.date > cutoff ||
          typeof p.amount !== 'number' ||
          !Number.isSafeInteger(p.amount) ||
          p.amount <= 0
        )
          continue
        target.push({ month: p.date.slice(0, 7), amount: p.amount })
      }
    }
  }
  const incoming = flowValues(context.months, receipts),
    outgoing = flowValues(context.months, remittances)
  return {
    key: 'accords_membres',
    title: 'Accords entre membres',
    description:
      'Fonds encaissés par KARA pour le compte des bénéficiaires et remises effectives. Les règlements directs entre membres restent hors trésorerie KARA.',
    blocks: [
      makeBlock('treasury', [
        makeLine(
          'in_total',
          'Versements encaissés pour les bénéficiaires',
          incoming,
          'Uniquement les règlements effectivement reçus par KARA ; aucun revenu pour l’association.',
          { level: 'subtotal' },
        ),
        makeLine(
          'out_total',
          'Fonds effectivement remis aux bénéficiaires',
          outgoing,
          'Uniquement les remises confirmées par l’administration, sans compter à nouveau le paiement du débiteur.',
          { level: 'subtotal' },
        ),
        makeLine(
          'net',
          'Variation des fonds détenus',
          subtractValues(incoming, outgoing),
          'Encaissements moins remises sur la période.',
          { level: 'total' },
        ),
      ]),
      makeBlock('result', [
        makeLine(
          'net',
          'Résultat des accords entre membres',
          context.months.map(() => 0),
          'Ces fonds appartiennent aux membres. Aucun intérêt, revenu ou frais KARA n’est prévu pour ces accords.',
          { level: 'total' },
        ),
      ]),
      makeBlock('outstanding', [
        makeLine(
          'funds_held',
          'Fonds détenus par KARA restant à reverser',
          stockValues(context.months, [
            ...receipts,
            ...remittances.map((p) => ({ ...p, amount: -p.amount })),
          ]),
          'Encaissements reçus depuis l’origine moins remises effectives, à la fin de chaque mois. Les dettes entre membres ne sont pas des créances de KARA.',
          { kind: 'stock' },
        ),
      ]),
    ],
    notes: [
      'Le versement du membre réduit sa dette dès réception par le bénéficiaire ou par KARA. Lorsque KARA encaisse, sa remise au bénéficiaire est une seconde opération distincte.',
      'Les paiements directs entre membres n’entrent ni dans les entrées, ni dans les sorties de trésorerie de l’association. Les fonds qui transitent par KARA ne sont jamais comptés comme un revenu.',
      'Une correction de saisie conserve l’historique et retire l’écriture erronée des calculs. Elle ne constate aucun remboursement réel.',
      'Le suivi assure l’intermédiation. Il ne déclenche aucun transfert bancaire et ne crée pas de prise en charge automatique d’un impayé par KARA.',
    ],
  }
}
