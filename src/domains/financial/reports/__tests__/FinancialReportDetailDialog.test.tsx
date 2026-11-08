import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import FinancialReportDetailDialog from "../components/FinancialReportDetailDialog";
import { ReportBlockTable } from "../components/FinancialReportsPage";
import type {
  FinancialReport,
  FinancialReportBlock,
} from "../entities/financial-report.types";
import type { FinancialReportDetails } from "../entities/financial-report-details.types";

const mock = vi.hoisted(() => ({
  query: vi.fn(),
  download: vi.fn(),
  refresh: vi.fn(),
}));
vi.mock("../hooks/useFinancialReportDetails", () => ({
  useFinancialReportDetails: mock.query,
}));
vi.mock("../exports/exportFinancialReportDetailsCsv", () => ({
  exportFinancialReportDetailsCsv: mock.download,
}));
vi.mock("../hooks/useFinancialReport", () => ({
  useFinancialReport: () => ({}),
}));
vi.mock("../components/MemberFinancialReportCard", () => ({
  MemberFinancialReportCard: () => null,
}));
vi.mock("@/hooks/useMyAccess", () => ({
  useMyAccess: () => ({ isSuperAdmin: true, isLoading: false }),
}));

const report: FinancialReport = {
  from: "2026-01",
  to: "2026-03",
  months: ["2026-01", "2026-02", "2026-03"],
  monthLabels: ["janv. 2026", "févr. 2026", "mars 2026"],
  generatedAt: "2026-03-31T12:00:00Z",
  modules: [],
};
const selection = {
  module: "credit_fixe",
  block: "outstanding",
  line: "receivables",
} as const;
const details: FinancialReportDetails = {
  ...report,
  reportGeneratedAt: report.generatedAt,
  loadedAt: report.generatedAt,
  selection,
  lineLabel: "Reste dû par les membres",
  description: "Capital et intérêts échus moins versements.",
  kind: "stock",
  unit: "fcfa",
  amount: 24000,
  allocatedAmount: 24000,
  reconciliationDifference: 0,
  rows: Array.from({ length: 24 }, (_, i) => ({
    key: `credit_fixe:C${i}`,
    module: "credit_fixe",
    moduleTitle: "Crédit fixe",
    sourceId: `C${i}`,
    sourceLabel: `CONTRAT-${i}`,
    sourceHref: `/credit-fixe/contrats/C${i}`,
    status: "ACTIVE",
    party: {
      id: `M${i}`,
      name: i === 0 ? "Élise Ondo" : `Personne ${i}`,
      matricule: `MK${i}`,
      kind: "member",
      href: `/memberships/M${i}`,
    },
    relatedParties: [],
    values: [500, 750, 1000],
    amount: 1000,
  })),
};
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
    data: details,
    isPending: false,
    isError: false,
    isFetching: false,
    refetch: mock.refresh,
  });
});
const mount = (expectedAmount = 24000) =>
  render(
    <FinancialReportDetailDialog
      report={report}
      selection={selection}
      expectedAmount={expectedAmount}
      onClose={vi.fn()}
    />,
  );

describe("consultation du détail financier", () => {
  it("ouvre un mois précis ou la valeur de fin de période sans additionner les stocks", () => {
    const inspect = vi.fn();
    const block: FinancialReportBlock = {
      key: "outstanding",
      title: "Encours",
      description: "",
      lines: [
        {
          key: "receivables",
          label: "Reste dû",
          description: "",
          kind: "stock",
          unit: "fcfa",
          level: "total",
          values: [500, 750, 1000],
          total: 1000,
        },
      ],
    };
    render(
      <ReportBlockTable
        block={block}
        report={report}
        moduleKey="credit_fixe"
        showDescriptions
        onInspect={inspect}
      />,
    );
    fireEvent.click(
      screen.getByRole("button", {
        name: "Voir le détail de Reste dû, févr. 2026",
      }),
    );
    expect(inspect).toHaveBeenLastCalledWith(
      {
        module: "credit_fixe",
        block: "outstanding",
        line: "receivables",
        month: "2026-02",
      },
      750,
    );
    fireEvent.click(
      screen.getByRole("button", {
        name: "Voir le détail de Reste dû, total ou fin de période",
      }),
    );
    expect(inspect).toHaveBeenLastCalledWith(
      { module: "credit_fixe", block: "outstanding", line: "receivables" },
      1000,
    );
  });
  it("affiche les personnes, références et liens vers les fiches avec pagination", () => {
    mount();
    expect(screen.getByRole("link", { name: "Élise Ondo" })).toHaveAttribute(
      "href",
      "/memberships/M0",
    );
    expect(screen.getByRole("link", { name: "CONTRAT-0" })).toHaveAttribute(
      "href",
      "/credit-fixe/contrats/C0",
    );
    const table = screen.getByRole("table");
    expect(within(table).getAllByRole("row")).toHaveLength(22);
    fireEvent.click(screen.getByRole("button", { name: /Suivant/ }));
    expect(within(table).getAllByRole("row")).toHaveLength(6);
    expect(screen.getByRole("button", { name: /Suivant/ })).toBeDisabled();
  });
  it("recherche sans accents par nom, matricule et contrat et exporte uniquement les résultats filtrés", () => {
    mount();
    const search = screen.getByRole("textbox", {
      name: "Rechercher une personne ou un contrat",
    });
    fireEvent.change(search, { target: { value: "elise" } });
    expect(within(screen.getByRole("table")).getAllByRole("row")).toHaveLength(
      3,
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Exporter le détail (CSV)" }),
    );
    expect(mock.download).toHaveBeenCalledWith(details, [details.rows[0]]);
    fireEvent.change(search, { target: { value: "CONTRAT-23" } });
    expect(screen.getByRole("link", { name: "CONTRAT-23" })).toBeVisible();
    fireEvent.change(search, { target: { value: "MK22" } });
    expect(screen.getByRole("link", { name: "CONTRAT-22" })).toBeVisible();
  });
  it("signale les montants modifiés depuis la génération et les écarts de ventilation", () => {
    mock.query.mockReturnValue({
      data: { ...details, reconciliationDifference: 1, allocatedAmount: 23999 },
      isPending: false,
      isError: false,
    });
    mount(25000);
    expect(screen.getByText(/Les données ont évolué/)).toBeVisible();
    expect(screen.getByText(/Écart de ventilation/)).toBeVisible();
  });
  it("explique les résultats vides et garde un bouton pour réessayer après erreur", () => {
    const { unmount } = mount();
    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "inconnu" },
    });
    expect(screen.getByText("Aucun résultat pour ces filtres.")).toBeVisible();
    unmount();
    mock.query.mockReturnValue({
      isError: true,
      error: new Error("Accès impossible"),
      isPending: false,
      refetch: mock.refresh,
    });
    mount();
    fireEvent.click(screen.getByRole("button", { name: "Réessayer" }));
    expect(mock.refresh).toHaveBeenCalled();
  });
});
