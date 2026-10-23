import type { FinancialReportLine, FinancialReportModule, FinancialReportModuleKey } from '../entities/financial-report.types'
import { addValues, findLineValues, makeBlock, makeLine, runningTotal, subtractValues } from '../utils/report-lines'

const CREDIT_MODULES: FinancialReportModuleKey[] = ['credit_speciale', 'credit_fixe', 'credit_aide']

/** Synthèse de l'association : les totaux de chaque module, côte à côte. */
export function buildSynthesisModule(modules: FinancialReportModule[], size: number): FinancialReportModule {
  const byKey = new Map(modules.map((module) => [module.key, module]))
  const values = (key: FinancialReportModuleKey, block: Parameters<typeof findLineValues>[1], line: string) => {
    const module = byKey.get(key)
    return module ? findLineValues(module, block, line, size) : new Array(size).fill(0)
  }
  const sum = (series: number[][]) => (series.length > 0 ? addValues(...series) : new Array(size).fill(0))
  const perModule = (block: Parameters<typeof findLineValues>[1], line: string, prefix: string, keys = modules.map((module) => module.key)) =>
    keys
      .map((key) => byKey.get(key))
      // Un module sans cette ligne (les adhésions n'ont pas de sorties) n'apparaît pas.
      .filter((module): module is FinancialReportModule =>
        !!module?.blocks.find((entry) => entry.key === block)?.lines.some((entry) => entry.key === line)
      )
      .map((module) => makeLine(`${module.key}_${line}`, `${prefix}${module.title}`, findLineValues(module, block, line, size)))

  const inLines = perModule('treasury', 'in_total', 'Entrées — ')
  const outLines = perModule('treasury', 'out_total', 'Sorties — ')
  const inTotal = sum(inLines.map((line) => line.values))
  const outTotal = sum(outLines.map((line) => line.values))
  const net = subtractValues(inTotal, outTotal)
  const resultLines = perModule('result', 'net', 'Résultat — ')

  const receivableLines: FinancialReportLine[] = [
    ...perModule('outstanding', 'receivables', 'Reste dû — ', CREDIT_MODULES),
    makeLine('ci_supports', 'Supports de la caisse imprévue à rembourser', values('caisse_imprevue', 'outstanding', 'supports_outstanding'), { kind: 'stock' }),
  ].map((line) => ({ ...line, kind: 'stock' as const, total: line.values.at(-1) ?? 0 }))
  const payableLines: FinancialReportLine[] = [
    makeLine('cs_funds', 'Épargne détenue — Caisse spéciale', values('caisse_speciale', 'outstanding', 'funds_held'), { kind: 'stock' }),
    makeLine('ci_funds', 'Épargne détenue — Caisse imprévue', values('caisse_imprevue', 'outstanding', 'funds_held'), { kind: 'stock' }),
    makeLine('placements_capital', 'Capitaux à restituer — Placements', values('placements', 'outstanding', 'capital_to_return'), { kind: 'stock' }),
  ]
  const credits = (line: string) => sum(CREDIT_MODULES.map((key) => values(key, 'risks', line)))

  return {
    key: 'synthesis',
    title: 'Synthèse',
    description: 'Vue d’ensemble de l’association : trésorerie, résultat, encours et risques de tous les modules.',
    blocks: [
      makeBlock('treasury', [
        ...inLines,
        makeLine('in_total', 'Total des entrées', inTotal, { level: 'subtotal' }),
        ...outLines,
        makeLine('out_total', 'Total des sorties', outTotal, { level: 'subtotal' }),
        makeLine('net', 'Solde du mois', net, { level: 'total' }),
        makeLine('net_cumulative', 'Solde cumulé depuis le début de la période', runningTotal(net), { kind: 'stock', level: 'total' }),
      ]),
      makeBlock('result', [
        ...resultLines,
        makeLine('net', 'Résultat net de l’association', sum(resultLines.map((line) => line.values)), { level: 'total' }),
      ]),
      makeBlock('outstanding', [
        ...receivableLines,
        makeLine('receivables_total', 'Total des sommes dues à l’association', sum(receivableLines.map((line) => line.values)), { kind: 'stock', level: 'subtotal' }),
        ...payableLines,
        makeLine('payables_total', 'Total des fonds à restituer', sum(payableLines.map((line) => line.values)), { kind: 'stock', level: 'subtotal' }),
      ]),
      makeBlock('risks', [
        makeLine('missed_earnings', 'Manque à gagner du mois (crédits)', credits('missed_earnings')),
        makeLine('losses', 'Pertes constatées (crédits clôturés en perte)', credits('losses')),
        makeLine('unpaid_penalties', 'Pénalités de crédit impayées', credits('unpaid_penalties'), { kind: 'stock' }),
        makeLine('late_amount', 'Montant des échéances de crédit en retard', credits('late_amount'), { kind: 'stock' }),
        makeLine('late_contracts', 'Contrats de crédit en retard', credits('late_contracts'), { kind: 'stock', unit: 'count' }),
      ]),
    ],
    notes: [
      'Trésorerie : l’argent réellement entré et sorti chaque mois. Le solde cumulé part de zéro au début de la période.',
      'Résultat : ce que l’association gagne (intérêts perçus, pénalités, adhésions…) moins ce qu’elle paie (bonus, commissions, pertes). L’épargne des membres et les capitaux des placements n’en font pas partie.',
      'Encours : les montants à la fin de chaque mois. Les sommes dues à l’association sont des créances ; l’épargne et les capitaux confiés sont des fonds à restituer.',
    ],
  }
}
