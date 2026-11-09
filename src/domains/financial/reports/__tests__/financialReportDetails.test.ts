import { describe, expect, it } from "vitest";
import type {
  CreditContract,
  CreditPayment,
  GuarantorPayment,
} from "@/types/types";
import { buildFinancialReport } from "../builders/buildFinancialReport";
import { buildFinancialReportDetails } from "../builders/buildFinancialReportDetails";
import type { FinancialReportSources } from "../entities/financial-report-sources.types";
import type { FinancialDetailSelection } from "../entities/financial-report-details.types";
import { financialDetailsCsv } from "../exports/exportFinancialReportDetailsCsv";

const date = (day: string) => new Date(`${day}T12:00:00+01:00`);
function fixture(): FinancialReportSources {
  const credit = (
    id: string,
    amount: number,
    extra: Record<string, unknown> = {},
  ) =>
    ({
      id,
      creditType: "FIXE",
      clientId: "alice",
      clientFirstName: "Alice",
      clientLastName: "Ondo",
      amount,
      totalAmount: amount * 1.1,
      interestRate: 10,
      duration: 2,
      monthlyPaymentAmount: (amount * 1.1) / 2,
      status: "ACTIVE",
      createdAt: date("2026-01-01"),
      disbursementDate: date("2026-01-01"),
      firstPaymentDate: date("2026-02-01"),
      restMonths: [],
      ...extra,
    }) as unknown as CreditContract;
  return {
    caisseSpecialeContracts: [
      { id: "same-id", memberId: "alice", status: "ACTIVE" },
      {
        id: "cs-group",
        groupeId: "group1",
        contractType: "GROUP",
        status: "ACTIVE",
      },
    ],
    caisseSpecialePayments: [
      {
        id: "same-payment",
        parentId: "same-id",
        status: "PAID",
        amount: 10000,
        penaltyApplied: 500,
        paidAt: date("2025-12-01"),
      },
      {
        id: "pay2",
        parentId: "same-id",
        status: "PAID",
        amount: 2000,
        paidAt: date("2026-02-01"),
      },
      {
        id: "pay3",
        parentId: "cs-group",
        status: "PAID",
        amount: 5000,
        paidAt: date("2026-03-01"),
      },
      {
        id: "orphan",
        parentId: "missing-contract",
        status: "PAID",
        amount: 3000,
        paidAt: date("2026-02-01"),
      },
    ],
    caisseSpecialeRefunds: [
      {
        id: "ref",
        parentId: "same-id",
        status: "PAID",
        withdrawalAmount: 2000,
        amountBonus: 0,
        withdrawalDate: date("2026-03-01"),
      },
    ],
    caisseImprevueContracts: [
      {
        id: "same-id",
        memberId: "bob",
        memberFirstName: "Bob",
        memberLastName: "Mba",
        status: "ACTIVE",
      },
    ],
    caisseImprevuePayments: [
      {
        id: "same-payment",
        parentId: "same-id",
        versements: [{ date: "2026-02-03", amount: 6000, penalty: 100 }],
      },
    ],
    caisseImprevueSupports: [
      {
        id: "sup",
        parentId: "same-id",
        status: "REPAID",
        amount: 3000,
        approvedAt: date("2026-01-03"),
        repayments: [{ date: "2026-03-01", amount: 1000 }],
      },
    ],
    caisseImprevueRefunds: [],
    creditContracts: [
      credit("parent", 100000, { amountRemaining: 100000 }),
      credit("child", 150000, {
        parentContractId: "parent",
        rajoutAmount: 50000,
        createdAt: date("2026-02-01"),
        disbursementDate: date("2026-02-01"),
        firstPaymentDate: date("2026-03-01"),
        guarantorId: "garant",
        guarantorFirstName: "Jeanne",
        guarantorLastName: "Ndong",
      }),
      credit("draft", 999999, { status: "DRAFT" }),
    ],
    creditPayments: [
      {
        id: "cp1",
        creditId: "child",
        amount: 20000,
        paymentDate: date("2026-03-01"),
      },
    ] as CreditPayment[],
    creditPenalties: [],
    guarantorPayments: [
      {
        id: "gpay",
        creditId: "child",
        guarantorId: "garant",
        amount: 1000,
        paymentDate: date("2026-03-02"),
      },
    ] as GuarantorPayment[],
    placements: [
      {
        id: "pl1",
        benefactorId: "benefactor",
        benefactorName: "Nadia",
        status: "EarlyExit",
        amount: 500000,
        handoverDate: date("2026-01-10"),
      },
      {
        id: "cancelled",
        status: "Canceled",
        amount: 9999999,
        handoverDate: date("2026-01-10"),
      },
    ],
    placementCommissions: [
      {
        id: "com1",
        parentId: "pl1",
        status: "Paid",
        amount: 10000,
        paidAt: date("2026-02-10"),
      },
    ],
    placementEarlyExits: [
      {
        id: "exit",
        parentId: "pl1",
        payoutAmount: 510000,
        commissionDue: 10000,
        paymentDate: date("2026-03-10"),
      },
    ],
    membershipRequests: [
      {
        id: "request1",
        matricule: "alice",
        identity: { firstName: "Alice", lastName: "Ondo" },
        status: "approved",
        payments: [
          {
            amount: 10000,
            paymentType: "Membership",
            date: date("2026-01-02"),
          },
          {
            amount: 5000,
            paymentType: "Subscription",
            date: date("2026-03-02"),
          },
        ],
      },
    ],
  };
}
const period = { from: "2026-01", to: "2026-03", now: date("2026-03-31") };
const calculate = (
  sources: FinancialReportSources,
  selection: FinancialDetailSelection,
) =>
  buildFinancialReportDetails(
    sources,
    buildFinancialReport(sources, period),
    selection,
  );

describe("personnes et contrats du bilan", () => {
  it("rapproche toutes les lignes, chaque mois et Total / fin, avec les mêmes moteurs que le bilan", () => {
    const sources = fixture();
    const report = buildFinancialReport(sources, period);
    for (const module of report.modules)
      for (const block of module.blocks)
        for (const line of block.lines) {
          for (const month of [undefined, ...report.months]) {
            const details = buildFinancialReportDetails(sources, report, {
              module: module.key,
              block: block.key,
              line: line.key,
              month,
            });
            expect(
              details.reconciliationDifference,
              `${module.key}.${block.key}.${line.key}.${month ?? "total"}`,
            ).toBe(0);
            expect(details.rows.reduce((sum, row) => sum + row.amount, 0)).toBe(
              (month
                ? line.values[report.months.indexOf(month)]
                : line.total) || 0,
            );
          }
        }
  });
  it("ventile aussi les intérêts, encours et risques des crédits spéciaux et aide", () => {
    for (const creditType of ["SPECIALE", "AIDE"] as const) {
      const sources = fixture();
      sources.creditContracts = sources.creditContracts.map((c) => ({
        ...c,
        creditType,
      }));
      const report = buildFinancialReport(sources, period);
      const key = creditType === "SPECIALE" ? "credit_speciale" : "credit_aide";
      const module = report.modules.find((m) => m.key === key)!;
      for (const block of module.blocks)
        for (const line of block.lines) {
          const details = buildFinancialReportDetails(sources, report, {
            module: key,
            block: block.key,
            line: line.key,
          });
          expect(
            details.reconciliationDifference,
            `${key}.${block.key}.${line.key}`,
          ).toBe(0);
        }
    }
  });
  it("sépare les deux caisses même si les contrats et paiements ont le même identifiant", () => {
    const result = calculate(fixture(), {
      module: "synthesis",
      block: "treasury",
      line: "in_total",
      month: "2026-02",
    });
    expect(
      result.rows.find((r) => r.key === "caisse_speciale:same-id")?.amount,
    ).toBe(2000);
    expect(
      result.rows.find((r) => r.key === "caisse_imprevue:same-id")?.amount,
    ).toBe(6100);
  });
  it("affiche les contrats manquants sans perdre leurs montants ni inventer une fiche", () => {
    const result = calculate(fixture(), {
      module: "caisse_speciale",
      block: "treasury",
      line: "in_total",
      month: "2026-02",
    });
    expect(
      result.rows.find((r) => r.sourceId === "missing-contract"),
    ).toMatchObject({
      amount: 3000,
      status: "Contrat introuvable",
      party: { name: "Personne non identifiée" },
    });
    expect(
      result.rows.find((r) => r.sourceId === "missing-contract")?.sourceHref,
    ).toBeUndefined();
  });
  it("un encours reprend l’histoire avant la période et la valeur finale, sans additionner les stocks", () => {
    const result = calculate(fixture(), {
      module: "caisse_speciale",
      block: "outstanding",
      line: "funds_held",
    });
    expect(result.rows.find((r) => r.sourceId === "same-id")).toMatchObject({
      values: [10000, 12000, 10000],
      amount: 10000,
    });
    expect(
      result.rows.find((r) => r.sourceId === "cs-group")?.party,
    ).toMatchObject({ id: "group1", kind: "group" });
  });
  it("préserve les lignes dont le solde de période est nul mais qui ont des mouvements mensuels", () => {
    const result = calculate(fixture(), {
      module: "caisse_speciale",
      block: "treasury",
      line: "net",
    });
    expect(result.rows.find((r) => r.sourceId === "same-id")).toMatchObject({
      values: [0, 2000, -2000],
      amount: 0,
    });
  });
  it("un rajout sous forme de contrat enfant ne décaisse que les fonds supplémentaires et conserve son contexte parent", () => {
    const result = calculate(fixture(), {
      module: "credit_fixe",
      block: "treasury",
      line: "out_disbursed",
    });
    expect(result.rows.find((r) => r.sourceId === "child")?.amount).toBe(50000);
    expect(result.rows.find((r) => r.sourceId === "parent")?.amount).toBe(
      100000,
    );
    expect(result.rows.some((r) => r.sourceId === "draft")).toBe(false);
  });
  it("nomme le client et les garants concernés par les commissions, avec le lien du bon type de crédit", () => {
    const result = calculate(fixture(), {
      module: "credit_fixe",
      block: "treasury",
      line: "out_guarantors",
      month: "2026-03",
    });
    expect(result.rows[0]).toMatchObject({
      amount: 1000,
      sourceHref: "/credit-fixe/contrats/child",
      party: { id: "alice", name: "Ondo Alice" },
      relatedParties: [{ id: "garant", name: "Ndong Jeanne" }],
    });
  });
  it("identifie les demandeurs et compte les paiements plutôt que les dossiers", () => {
    const result = calculate(fixture(), {
      module: "adhesions",
      block: "treasury",
      line: "info_payments",
    });
    expect(result.unit).toBe("count");
    expect(result.rows[0]).toMatchObject({
      amount: 2,
      sourceHref: "/membership-requests/request1",
      party: { name: "Ondo Alice", matricule: "alice" },
    });
  });
  it("rend visible un écart d’arrondi sans modifier le montant du bilan", () => {
    const sources = fixture();
    sources.caisseSpecialePayments = [
      {
        id: "p1",
        parentId: "c1",
        status: "PAID",
        amount: 0.6,
        paidAt: date("2026-01-02"),
      },
      {
        id: "p2",
        parentId: "c2",
        status: "PAID",
        amount: 0.6,
        paidAt: date("2026-01-02"),
      },
    ];
    const result = calculate(sources, {
      module: "caisse_speciale",
      block: "treasury",
      line: "in_total",
    });
    expect(result.amount).toBe(1);
    expect(result.allocatedAmount).toBe(2);
    expect(result.reconciliationDifference).toBe(-1);
  });
  it("refuse les mois et lignes qui ne font pas partie du bilan", () => {
    expect(() =>
      calculate(fixture(), {
        module: "adhesions",
        block: "risks",
        line: "fake",
      }),
    ).toThrow("introuvable");
    expect(() =>
      calculate(fixture(), {
        module: "adhesions",
        block: "treasury",
        line: "in_total",
        month: "2027-01",
      }),
    ).toThrow("ne fait pas partie");
  });
  it("exporte les noms, contrats et montants filtrés en CSV sans exécuter de formule de tableur", () => {
    const details = calculate(fixture(), {
      module: "caisse_speciale",
      block: "treasury",
      line: "net",
    });
    const row = {
      ...details.rows[0],
      party: { ...details.rows[0].party, name: '=HYPERLINK("evil")' },
      sourceLabel: 'REF;"test"',
      amount: -2000,
    };
    const csv = financialDetailsCsv(details, [row]);
    expect(csv).toContain("'=HYPERLINK");
    expect(csv).toContain('"REF;""test"""');
    expect(csv).toContain('"-2000"');
    expect(csv.split("\r\n")).toHaveLength(2);
    expect(csv).not.toContain("missing-contract");
  });
});
