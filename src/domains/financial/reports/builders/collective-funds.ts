import type { FinancialReportModule } from "../entities/financial-report.types";
import type {
  FinancialReportSources,
  FinancialReportContext,
} from "../entities/financial-report-sources.types";
import { monthKeyOf, toReportDate } from "../utils/report-months";
import {
  flowValues,
  stockValues,
  makeBlock,
  makeLine,
  addValues,
  subtractValues,
  toNumber,
  type MonthAmount,
} from "../utils/report-lines";
/** Contributions are funds to redistribute; only the retained fee is income.
 * CREDIT_FIXE allocations offset the existing loan module's disbursement as internal clearing. */
export function buildCollectiveFundsModule(
  sources: FinancialReportSources,
  context: FinancialReportContext,
): FinancialReportModule {
  const direct: MonthAmount[] = [],
    internal: MonthAmount[] = [],
    net: MonthAmount[] = [],
    fees: MonthAmount[] = [],
    gross: MonthAmount[] = [];
  const event = (date: unknown, amount: unknown): MonthAmount | null => {
    const parsed = toReportDate(date);
    return parsed && parsed <= context.now
      ? { month: monthKeyOf(date), amount: toNumber(amount) }
      : null;
  };
  for (const row of sources.groupContributions ?? []) {
    for (const payment of Array.isArray(row.payments) ? row.payments : []) {
      const e = event(payment.date, payment.amount);
      if (e) (payment.source === "CREDIT_FIXE" ? internal : direct).push(e);
    }
  }
  for (const payout of sources.groupPayouts ?? []) {
    for (const [list, value] of [
      [net, payout.netAmount],
      [fees, payout.feeAmount],
      [gross, payout.grossAmount],
    ] as const) {
      const e = event(payout.date, value);
      if (e) list.push(e);
    }
  }
  const received = addValues(
    flowValues(context.months, direct),
    flowValues(context.months, internal),
  );
  const out = flowValues(context.months, net),
    income = flowValues(context.months, fees);
  const held = stockValues(context.months, [
    ...direct,
    ...internal,
    ...gross.map((e) => ({ ...e, amount: -e.amount })),
  ]);
  return {
    key: "caisses_collectives",
    title: "Caisses collectives",
    description:
      "Cotisations des groupes, remises aux bénéficiaires et redevances retenues par Kara.",
    blocks: [
      makeBlock("treasury", [
        makeLine(
          "in_direct",
          "Cotisations encaissées",
          flowValues(context.months, direct),
          "Versements directs des membres ; ce ne sont pas des revenus.",
        ),
        makeLine(
          "in_internal",
          "Affectations internes des crédits fixes",
          flowValues(context.months, internal),
          "Compensation interne du décaissement compté dans le crédit fixe ; aucun nouvel encaissement externe.",
        ),
        makeLine(
          "in_total",
          "Total des entrées et affectations",
          received,
          "Cotisations directes et affectations internes.",
          { level: "subtotal" },
        ),
        makeLine(
          "out_total",
          "Net remis aux bénéficiaires",
          out,
          "Montants réellement remis, après retenue de la redevance.",
          { level: "subtotal" },
        ),
        makeLine(
          "net",
          "Solde du mois",
          subtractValues(received, out),
          "Entrées et affectations moins montants nets remis ; la redevance reste en caisse.",
          { level: "total" },
        ),
        makeLine(
          "gross_payouts",
          "Pour information : montants bruts distribués",
          flowValues(context.months, gross),
          "Montant de la caisse avant la retenue Kara.",
          { level: "info" },
        ),
      ]),
      makeBlock("result", [
        makeLine(
          "income_fees",
          "Redevances retenues sur les remises",
          income,
          "Redevances enregistrées à la date de remise effective, sans compter les cotisations comme un revenu.",
        ),
        makeLine(
          "net",
          "Résultat",
          income,
          "Produits des redevances ; les charges éventuelles ne sont pas enregistrées par ce module.",
          { level: "total" },
        ),
      ]),
      ...(!context.individual
        ? [
            makeBlock("outstanding", [
              makeLine(
                "funds_held",
                "Fonds collectifs restant à remettre",
                held,
                "Cotisations réglées et prises en charge, moins les remises brutes depuis l’origine. Les redevances déjà retenues n’appartiennent plus au groupe.",
                { kind: "stock" },
              ),
            ]),
          ]
        : []),
    ],
    notes: [
      "La redevance est retenue sur la caisse à la remise effective. Exemple : 50 000 FCFA bruts − 1 000 FCFA de redevance = 49 000 FCFA nets remis. Elle ne constitue pas une seconde entrée de trésorerie.",
      "Les affectations de crédits fixes sont des transferts internes : elles compensent les sorties déjà comptées par le module Crédit fixe. Les intérêts restent dans ce dernier.",
      "Le suivi constate des opérations enregistrées par l’administration, sans déclencher de transfert bancaire. Les cotisations ne sont pas un revenu de Kara.",
      ...(context.individual
        ? [
            "Le bilan individuel ne présente que les versements et remises de cette personne. Les fonds détenus sont calculés uniquement dans le bilan global de la caisse.",
          ]
        : []),
    ],
  };
}
