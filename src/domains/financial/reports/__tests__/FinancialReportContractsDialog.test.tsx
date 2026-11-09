import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, it, expect, vi } from "vitest";
import FinancialReportContractsDialog from "../components/FinancialReportContractsDialog";
import { buildFinancialReport } from "../builders/buildFinancialReport";
import { buildFinancialReportContracts } from "../builders/buildFinancialReportDetails";
import { contractSourcesFixture } from "./fixtures/contracts";
const mock = vi.hoisted(() => ({ query: vi.fn(), download: vi.fn() }));
vi.mock("../hooks/useFinancialReportContracts", () => ({
  useFinancialReportContracts: mock.query,
}));
vi.mock("../exports/exportFinancialContractsCsv", () => ({
  exportFinancialContractsCsv: mock.download,
}));
const sources = contractSourcesFixture(),
  report = buildFinancialReport(sources, {
    from: "2026-01",
    to: "2026-03",
    now: new Date("2026-03-31T12:00:00Z"),
  });
const contracts = buildFinancialReportContracts(sources, report);
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  mock.query.mockReturnValue({
    data: { report, contracts },
    isPending: false,
    isError: false,
    isFetching: false,
    refetch: vi.fn(),
  });
});
it("recherche un contrat et ouvre ses chiffres mensuels avec son garant et sa fiche", () => {
  render(<FinancialReportContractsDialog report={report} onClose={() => {}} />);
  fireEvent.change(
    screen.getByLabelText("Rechercher dans les contrats du bilan"),
    { target: { value: "child" } },
  );
  expect(screen.getByText("child", { exact: true })).toBeInTheDocument();
  expect(screen.getByText(/Ndong Jeanne/)).toBeInTheDocument();
  fireEvent.click(
    screen.getByRole("button", { name: "Détail mensuel du dossier child" }),
  );
  expect(
    screen.getByRole("table", { name: "Trésorerie du contrat child" }),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("table", { name: "Encours et créances du contrat child" }),
  ).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Ouvrir la fiche" })).toHaveAttribute(
    "href",
    "/credit-fixe/contrats/child",
  );
  fireEvent.click(screen.getByRole("button", { name: "Détail complet (CSV)" }));
  expect(mock.download).toHaveBeenCalledWith(report, [
    expect.objectContaining({ sourceId: "child" }),
  ]);
});
it("filtre les modules et signale un bilan devenu périmé", () => {
  const fresh = structuredClone(report);
  fresh.modules[0].blocks[0].lines[0].values[0]++;
  mock.query.mockReturnValue({
    data: { report: fresh, contracts },
    isPending: false,
    isError: false,
  });
  render(
    <FinancialReportContractsDialog
      report={report}
      initialModule="credit_fixe"
      onClose={() => {}}
    />,
  );
  expect(screen.getByLabelText("Module des contrats")).toHaveValue(
    "credit_fixe",
  );
  expect(screen.getByText(/Les données ont évolué/)).toBeInTheDocument();
  expect(screen.queryByText("Nadia", { exact: true })).not.toBeInTheDocument();
});
it("présente un chargement et une reprise sans faux chiffres", () => {
  mock.query.mockReturnValue({ isPending: true, isError: false });
  const view = render(
    <FinancialReportContractsDialog report={report} onClose={() => {}} />,
  );
  expect(screen.getByRole("status")).toHaveTextContent("Chargement");
  const retry = vi.fn();
  mock.query.mockReturnValue({
    isPending: false,
    isError: true,
    error: new Error("Lecture impossible"),
    refetch: retry,
  });
  view.rerender(
    <FinancialReportContractsDialog report={report} onClose={() => {}} />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Réessayer" }));
  expect(retry).toHaveBeenCalled();
});

it("traduit les statuts dans les dossiers et leurs filtres", () => {
  mock.query.mockReturnValue({
    data: {
      report,
      contracts: [{ ...contracts[0], status: "LATE_WITH_PENALTY" }],
    },
    isPending: false,
    isError: false,
  });
  const { container } = render(
    <FinancialReportContractsDialog report={report} onClose={() => {}} />,
  );
  expect(
    screen.getByRole("option", { name: "En retard avec pénalité" }),
  ).toHaveValue("LATE_WITH_PENALTY");
  expect(container.textContent).not.toContain("LATE_WITH_PENALTY");
  fireEvent.change(
    screen.getByLabelText("Rechercher dans les contrats du bilan"),
    { target: { value: "retard avec penalite" } },
  );
  expect(
    screen.getByRole("button", { name: /Détail mensuel du dossier/ }),
  ).toBeInTheDocument();
});
