import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, it, expect, vi } from "vitest";
import FinancialReportExportDialog from "../components/FinancialReportExportDialog";
import { buildFinancialReport } from "../builders/buildFinancialReport";
import { buildFinancialReportContracts } from "../builders/buildFinancialReportDetails";
import { contractSourcesFixture } from "./fixtures/contracts";
const mock = vi.hoisted(() => ({
  load: vi.fn(),
  pdf: vi.fn(),
  excel: vi.fn(),
  error: vi.fn(),
  success: vi.fn(),
}));
vi.mock("../hooks/useFinancialReportContracts", () => ({
  fetchFinancialReportContracts: mock.load,
  financialContractsKey: () => ["export-contracts"],
}));
vi.mock("../exports/exportFinancialReportPdf", () => ({
  exportFinancialReportPdf: mock.pdf,
}));
vi.mock("../exports/exportFinancialReportExcel", () => ({
  exportFinancialReportExcel: mock.excel,
}));
vi.mock("sonner", () => ({
  toast: { error: mock.error, success: mock.success },
}));
const sources = contractSourcesFixture(),
  report = buildFinancialReport(sources, {
    from: "2026-01",
    to: "2026-03",
    now: new Date("2026-03-31T12:00:00Z"),
  }),
  contracts = buildFinancialReportContracts(sources, report);
const mount = () =>
  render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <FinancialReportExportDialog
        open
        onOpenChange={() => {}}
        report={report}
      />
    </QueryClientProvider>,
  );
beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  mock.load.mockResolvedValue({ report, contracts });
  mock.pdf.mockResolvedValue(undefined);
  mock.excel.mockResolvedValue(undefined);
});
it("inclut les annexes contractuelles par défaut dans le PDF", async () => {
  mount();
  fireEvent.click(
    screen.getByRole("button", { name: "Exporter" }),
  );
  await waitFor(() =>
    expect(mock.pdf).toHaveBeenCalledWith(
      expect.objectContaining({ from: report.from }),
      "full",
      contracts,
    ),
  );
});
it("permet un export de synthèse sans charger les dossiers lorsque l’option est décochée", async () => {
  mount();
  fireEvent.click(
    screen.getByRole("checkbox", {
      name: /Inclure les membres et le détail par contrat/,
    }),
  );
  fireEvent.click(
    screen.getByRole("button", { name: "Exporter" }),
  );
  await waitFor(() =>
    expect(mock.pdf).toHaveBeenCalledWith(expect.anything(), "full", []),
  );
  expect(mock.load).not.toHaveBeenCalled();
});
it("refuse de mélanger des totaux anciens et des contrats actualisés", async () => {
  const fresh = structuredClone(report);
  fresh.modules[0].blocks[0].lines[0].values[0]++;
  mock.load.mockResolvedValue({ report: fresh, contracts });
  mount();
  fireEvent.click(
    screen.getByRole("button", { name: "Exporter" }),
  );
  await waitFor(() =>
    expect(mock.error).toHaveBeenCalledWith(
      expect.stringContaining("Régénérez"),
    ),
  );
  expect(mock.pdf).not.toHaveBeenCalled();
});
