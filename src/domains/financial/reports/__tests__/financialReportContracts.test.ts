import { describe, it, expect } from "vitest";
import { buildFinancialReport } from "../builders/buildFinancialReport";
import { buildFinancialReportContracts } from "../builders/buildFinancialReportDetails";
import { contractSourcesFixture } from "./fixtures/contracts";
import { financialContractsCsv } from "../exports/exportFinancialContractsCsv";
import { buildFinancialReportWorkbook } from "../exports/exportFinancialReportExcel";
import { buildFinancialReportPdf } from "../exports/exportFinancialReportPdf";
import {
  financialReportChanged,
  selectContractContent,
} from "../utils/contract-report";
const period = {
  from: "2026-01",
  to: "2026-03",
  now: new Date("2026-03-31T12:00:00Z"),
};
const fixture = () => {
  const sources = contractSourcesFixture();
  const report = buildFinancialReport(sources, period);
  return { report, contracts: buildFinancialReportContracts(sources, report) };
};
describe("bilan détaillé jusqu’aux contrats", () => {
  it("rapproche chaque indicateur et chaque mois avec le bilan des modules, y compris les rajouts et les contrats disparus", () => {
    const { report, contracts } = fixture();
    expect(contracts.some((c) => c.sourceId === "draft")).toBe(false);
    expect(
      contracts.find((c) => c.sourceId === "missing-contract"),
    ).toMatchObject({ status: "Contrat introuvable", sourceHref: undefined });
    expect(contracts.filter((c) => c.sourceId === "same-id")).toHaveLength(2);
    for (const module of report.modules.filter((m) => m.key !== "synthesis"))
      for (const block of module.blocks)
        for (const line of block.lines)
          for (let i = 0; i < report.months.length; i++) {
            const sum = contracts
              .filter((c) => c.module === module.key)
              .reduce(
                (n, c) =>
                  n +
                  (c.blocks
                    .find((b) => b.key === block.key)
                    ?.lines.find((l) => l.key === line.key)?.values[i] ?? 0),
                0,
              );
            expect(sum, `${module.key}/${block.key}/${line.key}/${i}`).toBe(
              line.values[i] || 0,
            );
          }
    expect(
      contracts.find((c) => c.sourceId === "child")!.relatedParties,
    ).toContainEqual(
      expect.objectContaining({ id: "garant", name: "Ndong Jeanne" }),
    );
  });
  it("détecte les données modifiées depuis le bilan et respecte les sélections de modules et de parties", () => {
    const { report, contracts } = fixture();
    expect(financialReportChanged(report, structuredClone(report))).toBe(false);
    const changed = structuredClone(report);
    changed.modules[0].blocks[0].lines[0].values[0] += 1;
    expect(financialReportChanged(report, changed)).toBe(true);
    const selected = selectContractContent(contracts, {
      modules: ["credit_fixe"],
      blocks: ["outstanding"],
    });
    expect(selected.length).toBeGreaterThan(0);
    expect(
      selected.every(
        (c) =>
          c.module === "credit_fixe" &&
          c.blocks.every((b) => b.key === "outstanding"),
      ),
    ).toBe(true);
    expect(
      selectContractContent(contracts, {
        modules: ["synthesis"],
        blocks: ["treasury"],
      }).some((c) => c.module === "placements"),
    ).toBe(true);
  });
  it("exporte les noms, dossiers et valeurs mensuelles en CSV sans exécuter les formules de noms", () => {
    const { report, contracts } = fixture();
    contracts[0].party.name = '=HYPERLINK("malveillant")';
    const csv = financialContractsCsv(report, contracts);
    expect(csv).toContain("'=HYPERLINK");
    expect(csv).toContain("Situation en fin de mois");
    expect(csv).toContain("same-id");
    expect(csv).toContain("Total / fin");
    const rows = csv.split("\r\n");
    expect(
      rows
        .slice(1)
        .every((row) => row.split(";").length === rows[0].split(";").length),
    ).toBe(true);
  });
  it("ajoute à Excel l’inventaire et les montants mensuels de chaque contrat avec des totaux de flux et de stocks corrects", async () => {
    const { report, contracts } = fixture();
    const workbook = await buildFinancialReportWorkbook(
      report,
      "none",
      contracts,
    );
    const inventory = workbook.getWorksheet("Contrats et dossiers")!;
    expect(inventory.rowCount).toBe(contracts.length + 1);
    const detail = workbook.getWorksheet("Détail par contrat")!;
    let stock = false,
      flow = false;
    detail.eachRow((row, n) => {
      if (n === 1) return;
      const f = row.getCell(14).value as { formula: string; result: number };
      if (row.getCell(9).value === "Situation en fin de mois") {
        stock = true;
        expect(f.formula).toBe(`M${n}`);
      } else {
        flow = true;
        expect(f.formula).toBe(`SUM(K${n}:M${n})`);
      }
    });
    expect(stock && flow).toBe(true);
    expect(detail.rowCount).toBe(
      1 +
        contracts.reduce(
          (n, c) => n + c.blocks.reduce((s, b) => s + b.lines.length, 0),
          0,
        ),
    );
    const buffer = await workbook.xlsx.writeBuffer();
    expect(buffer.byteLength).toBeGreaterThan(1000);
  });
  it("ajoute au PDF les fiches des contrats et gère les périodes longues sur plusieurs pages", async () => {
    const { report, contracts } = fixture();
    const base = await buildFinancialReportPdf(
      { ...report, modules: report.modules.slice(0, 1) },
      "none",
    );
    const pdf = await buildFinancialReportPdf(
      { ...report, modules: report.modules.slice(0, 1) },
      "none",
      contracts,
    );
    expect(pdf.getNumberOfPages()).toBeGreaterThanOrEqual(
      base.getNumberOfPages() + contracts.length,
    );
    const content = pdf.output();
    expect(content).toContain("same-id");
    expect(content).toContain("Ndong Jeanne");
    const longReport = {
      ...report,
      months: Array.from({ length: 40 }, (_, i) => `2023-${i}`),
      monthLabels: Array.from({ length: 40 }, (_, i) => `Mois ${i + 1}`),
      modules: [],
    };
    const longContract = {
      ...contracts[0],
      blocks: contracts[0].blocks.map((b) => ({
        ...b,
        lines: b.lines.map((l) => ({
          ...l,
          values: Array.from({ length: 40 }, () => 1),
        })),
      })),
    };
    const longPdf = await buildFinancialReportPdf(longReport, "none", [
      longContract,
    ]);
    expect(longPdf.getNumberOfPages()).toBeGreaterThan(1);
  });
});
