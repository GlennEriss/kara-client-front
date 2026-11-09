import { describe, it, expect } from "vitest";
import { buildFinancialReport } from "../builders/buildFinancialReport";
import { buildFinancialReportDetails } from "../builders/buildFinancialReportDetails";
import type { FinancialReportSources } from "../entities/financial-report-sources.types";
const sources = (): FinancialReportSources => ({
  caisseSpecialeContracts: [],
  caisseSpecialePayments: [],
  caisseSpecialeRefunds: [],
  caisseImprevueContracts: [],
  caisseImprevuePayments: [],
  caisseImprevueSupports: [],
  caisseImprevueRefunds: [],
  creditContracts: [],
  creditPayments: [],
  creditPenalties: [],
  guarantorPayments: [],
  placements: [],
  placementCommissions: [],
  placementEarlyExits: [],
  membershipRequests: [],
  groupContributions: [
    {
      id: "a",
      parentId: "g1",
      projectId: "p1",
      projectName: "Caisse",
      memberId: "alice",
      memberName: "Alice",
      period: "2026-11",
      payments: [{ amount: 25000, date: "2026-11-01", source: "CASH" }],
    },
    {
      id: "b",
      parentId: "g1",
      projectId: "p1",
      memberId: "bob",
      memberName: "Bob",
      period: "2026-11",
      payments: [{ amount: 25000, date: "2026-11-02", source: "CREDIT_FIXE" }],
    },
  ],
  groupPayouts: [
    {
      id: "r1",
      groupId: "g1",
      groupName: "Groupe",
      projectId: "p1",
      projectName: "Caisse",
      beneficiaryId: "alice",
      beneficiaryName: "Alice",
      period: "2026-11",
      date: "2026-11-04",
      grossAmount: 50000,
      feeAmount: 1000,
      netAmount: 49000,
    },
  ],
});
const period = {
  from: "2026-10",
  to: "2026-11",
  now: new Date("2026-11-09T12:00:00Z"),
};
const values = (
  report: ReturnType<typeof buildFinancialReport>,
  module: string,
  block: string,
  line: string,
) =>
  report.modules
    .find((m) => m.key === module)!
    .blocks.find((b) => b.key === block)!
    .lines.find((l) => l.key === line)!.values;
describe("bilan des caisses collectives", () => {
  it("compte la redevance une seule fois, distingue fonds collectifs et recettes et solde les fonds remis", () => {
    const report = buildFinancialReport(sources(), period);
    expect(values(report, "caisses_collectives", "result", "net")).toEqual([
      0, 1000,
    ]);
    expect(values(report, "synthesis", "result", "net")).toEqual([0, 1000]);
    expect(
      values(report, "caisses_collectives", "treasury", "in_direct"),
    ).toEqual([0, 25000]);
    expect(
      values(report, "caisses_collectives", "treasury", "in_internal"),
    ).toEqual([0, 25000]);
    expect(
      values(report, "caisses_collectives", "treasury", "out_total"),
    ).toEqual([0, 49000]);
    expect(
      values(report, "caisses_collectives", "outstanding", "funds_held"),
    ).toEqual([0, 0]);
  });
  it('compense le décaissement du crédit fixe sans créer de recette supplémentaire', () => {
    const s = sources();
    s.creditContracts = [{ id:'cf', clientId:'bob', creditType:'FIXE', status:'ACTIVE', amount:25000, initialAmount:25000, totalAmount:27500, amountPaid:0, amountRemaining:27500, interestRate:10, monthlyPaymentAmount:27500, duration:1, createdAt:new Date('2026-11-02T12:00:00Z'),disbursementDate:new Date('2026-11-02T12:00:00Z'),firstPaymentDate:new Date('2026-12-02T12:00:00Z'),restMonths:[] }] as unknown as FinancialReportSources['creditContracts'];
    const report = buildFinancialReport(s,period);
    expect(values(report,'credit_fixe','treasury','out_disbursed')).toEqual([0,25000]);
    expect(values(report,'synthesis','treasury','net')).toEqual([0,-24000]);
    expect(values(report,'synthesis','result','net')).toEqual([0,1000]);
  });
  it("ne reconnaît aucune redevance avant remise et conserve le stock antérieur à la période", () => {
    const s = sources();
    s.groupPayouts = [];
    s.groupContributions![0].payments = [
      { amount: 25000, date: "2026-09-01", source: "CASH" },
    ];
    const report = buildFinancialReport(s, period);
    expect(
      values(report, "caisses_collectives", "outstanding", "funds_held"),
    ).toEqual([25000, 50000]);
    expect(values(report, "caisses_collectives", "result", "net")).toEqual([
      0, 0,
    ]);
  });
  it("ventile chaque ligne et la synthèse par personne avec les montants bruts, retenus et nets exportables", () => {
    const s = sources(),
      report = buildFinancialReport(s, period);
    for (const module of report.modules.filter((m) =>
      ["synthesis", "caisses_collectives"].includes(m.key),
    ))
      for (const block of module.blocks)
        for (const line of block.lines) {
          const detail = buildFinancialReportDetails(s, report, {
            module: module.key,
            block: block.key,
            line: line.key,
          });
          expect(
            detail.reconciliationDifference,
            `${module.key}/${block.key}/${line.key}`,
          ).toBe(0);
        }
    const fees = buildFinancialReportDetails(s, report, {
      module: "caisses_collectives",
      block: "result",
      line: "income_fees",
    });
    expect(fees.rows).toHaveLength(1);
    expect(fees.rows[0]).toMatchObject({
      party: { id: "alice", name: "Alice", kind: "member" },
      amount: 1000,
    });
    expect(fees.rows[0].sourceLabel).toContain(
      "Brut 50000 / Redevance 1000 / Net 49000",
    );
  });
  it("ne montre pas un encours collectif comme une dette personnelle dans le bilan individuel", () => {
    const report = buildFinancialReport(sources(), period, {
      subject: { memberId: "alice", matricule: "A", name: "Alice" },
    });
    expect(
      report.modules
        .find((m) => m.key === "caisses_collectives")!
        .blocks.some((b) => b.key === "outstanding"),
    ).toBe(false);
  });
});
