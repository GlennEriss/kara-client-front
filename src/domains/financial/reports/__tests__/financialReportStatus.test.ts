import { describe, it, expect } from "vitest";
import { financialStatusLabel } from "../utils/contract-report";
import { contractSourcesFixture } from "./fixtures/contracts";
import { buildFinancialReport } from "../builders/buildFinancialReport";
import {
  buildFinancialReportContracts,
  buildFinancialReportDetails,
} from "../builders/buildFinancialReportDetails";
import { buildFinancialReportWorkbook } from "../exports/exportFinancialReportExcel";
import { buildFinancialReportPdf } from "../exports/exportFinancialReportPdf";
import { financialContractsCsv } from "../exports/exportFinancialContractsCsv";
import { financialDetailsCsv } from "../exports/exportFinancialReportDetailsCsv";
describe("statuts lisibles du bilan", () => {
  it.each([
    ["LATE_WITH_PENALTY", "En retard avec pénalité"],
    ["LATE_NO_PENALTY", "En retard sans pénalité"],
    ["FINAL_REFUND_PENDING", "Remboursement final en attente"],
    ["EARLY_REFUND_PENDING", "Remboursement anticipé en attente"],
    ["UNDER_REVIEW", "En cours d’examen"],
    ["FINISHED", "Terminé"],
    ["EarlyExit", "Sortie anticipée"],
    ["Remise enregistrée", "Remise enregistrée"],
    ["CONTRAT_INTROUVABLE", "Contrat introuvable"],
    ["NOUVEAU_CODE_INTERNE", "Statut à préciser"],
    ["unmapped_status", "Statut à préciser"],
    ["", "Non renseigné"],
  ])("présente %s sous la forme %s", (status, label) =>
    expect(financialStatusLabel(status)).toBe(label),
  );
  it("utilise la même traduction dans Excel, PDF et les deux exports CSV sans modifier les sources", async () => {
    const sources = contractSourcesFixture();
    sources.caisseSpecialeContracts[0].status = "LATE_WITH_PENALTY";
    const report = buildFinancialReport(sources, {
      from: "2026-01",
      to: "2026-03",
      now: new Date("2026-03-31T12:00:00Z"),
    });
    const contracts = buildFinancialReportContracts(sources, report);
    const contract = contracts.find(
      (c) => c.module === "caisse_speciale" && c.sourceId === "same-id",
    )!;
    const detail = buildFinancialReportDetails(sources, report, {
      module: "caisse_speciale",
      block: "treasury",
      line: "in_total",
    });
    for (const csv of [
      financialContractsCsv(report, [contract]),
      financialDetailsCsv(detail),
    ]) {
      expect(csv).toContain("En retard avec pénalité");
      expect(csv).not.toContain("LATE_WITH_PENALTY");
    }
    const book = await buildFinancialReportWorkbook(report, "none", [contract]);
    expect(
      book.getWorksheet("Contrats et dossiers")!.getRow(2).getCell(5).value,
    ).toBe("En retard avec pénalité");
    expect(
      book.getWorksheet("Détail par contrat")!.getRow(2).getCell(5).value,
    ).toBe("En retard avec pénalité");
    expect(
      book.getWorksheet("Contrats et dossiers")!.getRow(1).alignment.wrapText,
    ).toBe(true);
    const pdf = await buildFinancialReportPdf(
      { ...report, modules: [] },
      "none",
      [contract],
    );
    expect(pdf.output()).toContain("En retard avec");
    expect(pdf.output()).not.toContain("LATE_WITH_PENALTY");
    expect(sources.caisseSpecialeContracts[0].status).toBe("LATE_WITH_PENALTY");
  });
});
