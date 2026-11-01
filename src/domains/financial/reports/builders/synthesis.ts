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
  const perModule = (
    block: Parameters<typeof findLineValues>[1],
    line: string,
    label: (title: string) => string,
    description: (title: string) => string,
    keys = modules.map((module) => module.key)
  ) =>
    keys
      .map((key) => byKey.get(key))
      // Un module sans cette ligne (les adhésions n'ont pas de sorties) n'apparaît pas.
      .filter((module): module is FinancialReportModule =>
        !!module?.blocks.find((entry) => entry.key === block)?.lines.some((entry) => entry.key === line)
      )
      .map((module) =>
        makeLine(`${module.key}_${line}`, label(module.title), findLineValues(module, block, line, size), description(module.title))
      )

  const inLines = perModule('treasury', 'in_total', (title) => `Entrées — ${title}`,
    (title) => `Total des entrées de l’onglet « ${title} ».`)
  const outLines = perModule('treasury', 'out_total', (title) => `Sorties — ${title}`,
    (title) => `Total des sorties de l’onglet « ${title} ».`)
  const inTotal = sum(inLines.map((line) => line.values))
  const outTotal = sum(outLines.map((line) => line.values))
  const net = subtractValues(inTotal, outTotal)
  const resultLines = perModule('result', 'net', (title) => `Résultat — ${title}`,
    (title) => `Résultat de l’onglet « ${title} » : ses produits moins ses charges.`)

  const receivableLines: FinancialReportLine[] = [
    ...perModule('outstanding', 'receivables', (title) => `Reste dû — ${title}`,
      (title) => `Ce que les membres doivent encore sur le ${title.toLowerCase()}.`, CREDIT_MODULES)
      .map((line) => ({ ...line, kind: 'stock' as const, total: line.values.at(-1) ?? 0 })),
    makeLine('ci_supports', 'Supports de la caisse imprévue à rembourser', values('caisse_imprevue', 'outstanding', 'supports_outstanding'),
      'Avances de la caisse imprévue pas encore remboursées par les membres.', { kind: 'stock' }),
  ]
  const payableLines: FinancialReportLine[] = [
    makeLine('cs_funds', 'Épargne détenue — Caisse spéciale', values('caisse_speciale', 'outstanding', 'funds_held'),
      'Épargne des membres de la caisse spéciale, à leur rendre.', { kind: 'stock' }),
    makeLine('ci_funds', 'Épargne détenue — Caisse imprévue', values('caisse_imprevue', 'outstanding', 'funds_held'),
      'Épargne des membres de la caisse imprévue, à leur rendre.', { kind: 'stock' }),
    makeLine('placements_capital', 'Capitaux à restituer — Placements', values('placements', 'outstanding', 'capital_to_return'),
      'Capitaux confiés par les bienfaiteurs, à leur rendre.', { kind: 'stock' }),
  ]
  const credits = (line: string) => sum(CREDIT_MODULES.map((key) => values(key, 'risks', line)))

  return {
    key: 'synthesis',
    title: 'Synthèse',
    description: 'Vue d’ensemble de l’association : trésorerie, résultat, encours et risques de tous les modules.',
    blocks: [
      makeBlock('treasury', [
        ...inLines,
        makeLine('in_total', 'Total des entrées', inTotal,
          'Tout l’argent entré dans l’association, tous modules confondus.', { level: 'subtotal' }),
        ...outLines,
        makeLine('out_total', 'Total des sorties', outTotal,
          'Tout l’argent sorti de l’association, tous modules confondus.', { level: 'subtotal' }),
        makeLine('net', 'Solde du mois', net,
          'Entrées moins sorties du mois. Positif : la trésorerie de l’association a augmenté.', { level: 'total' }),
        makeLine('net_cumulative', 'Solde cumulé depuis le début de la période', runningTotal(net),
          'Somme des soldes depuis le premier mois de la période : de combien la trésorerie a varié, sans compter ce qu’il y avait au départ.',
          { kind: 'stock', level: 'total' }),
      ]),
      makeBlock('result', [
        ...resultLines,
        makeLine('net', 'Résultat net de l’association', sum(resultLines.map((line) => line.values)),
          'Ce que l’association a gagné au total : la somme des résultats de tous les modules.', { level: 'total' }),
      ]),
      makeBlock('outstanding', [
        ...receivableLines,
        makeLine('receivables_total', 'Total des sommes dues à l’association', sum(receivableLines.map((line) => line.values)),
          'Tout ce que les membres doivent à l’association à la fin du mois (créances).', { kind: 'stock', level: 'subtotal' }),
        ...payableLines,
        makeLine('payables_total', 'Total des fonds à restituer', sum(payableLines.map((line) => line.values)),
          'Tout ce que l’association doit rendre à ses membres et bienfaiteurs à la fin du mois.', { kind: 'stock', level: 'subtotal' }),
      ]),
      makeBlock('risks', [
        makeLine('missed_earnings_outstanding', 'Manque à gagner généré restant à date (crédits)', credits('missed_earnings_outstanding'),
          'Manque à gagner déjà généré à la date du bilan, diminué des montants encaissés à ce titre.', { kind: 'stock', level: 'total' }),
        makeLine('missed_earnings', 'Manque à gagner du mois (crédits)', credits('missed_earnings'),
          'Intérêts que l’association n’a pas touchés sur les crédits en partie fixe ou au-delà de leur durée.'),
        makeLine('losses', 'Pertes constatées (crédits clôturés en perte)', credits('losses'),
          'Reste dû abandonné sur les crédits clôturés en perte dans le mois.'),
        makeLine('unpaid_penalties', 'Pénalités de crédit impayées', credits('unpaid_penalties'),
          'Pénalités de retard appliquées sur les crédits et pas encore payées.', { kind: 'stock' }),
        makeLine('late_amount', 'Montant des échéances de crédit en retard', credits('late_amount'),
          'Part du reste dû qui aurait déjà dû être payée d’après les échéances passées.', { kind: 'stock' }),
        makeLine('late_contracts', 'Contrats de crédit en retard', credits('late_contracts'),
          'Contrats de crédit qui ont un montant en retard à la fin du mois.', { kind: 'stock', unit: 'count' }),
      ]),
    ],
    notes: [
      'Trésorerie : l’argent réellement entré et sorti chaque mois. Le solde cumulé part de zéro au début de la période.',
      'Résultat : ce que l’association gagne (intérêts perçus, pénalités, adhésions…) moins ce qu’elle paie (bonus, commissions, pertes). L’épargne des membres et les capitaux des placements n’en font pas partie.',
      'Encours : les montants à la fin de chaque mois. Les sommes dues à l’association sont des créances ; l’épargne et les capitaux confiés sont des fonds à restituer.',
    ],
  }
}
