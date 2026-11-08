import type {
  FinancialDetailRow,
  FinancialReportDetails,
} from "../entities/financial-report-details.types";

/** Treat user-controlled names/references as text, including spreadsheet formula prefixes. */
const csvCell = (value: unknown): string => {
  const raw = String(value ?? "");
  const safe =
    typeof value === "string" && /^[\s]*[=+\-@\t\r]/.test(raw)
      ? `'${raw}`
      : raw;
  return `"${safe.replace(/"/g, '""')}"`;
};

export function financialDetailsCsv(
  details: FinancialReportDetails,
  rows: FinancialDetailRow[] = details.rows,
): string {
  const headers = [
    "Module",
    "Personne / groupe",
    "Matricule / identifiant",
    "Contrat / dossier",
    "Statut",
    "Garants concernés",
    ...details.monthLabels,
    details.selection.month
      ? `Montant ${details.selection.month}`
      : details.kind === "stock"
        ? "Fin de période"
        : "Total période",
    "Unité",
  ];
  return (
    "\uFEFF" +
    [
      headers,
      ...rows.map((row) => [
        row.moduleTitle,
        row.party.name,
        row.party.matricule || row.party.id || "",
        row.sourceLabel,
        row.status,
        row.relatedParties.map((p) => p.name).join(", "),
        ...row.values,
        row.amount,
        details.unit === "fcfa" ? "FCFA" : "Nombre",
      ]),
    ]
      .map((cells) => cells.map(csvCell).join(";"))
      .join("\r\n")
  );
}

export function exportFinancialReportDetailsCsv(
  details: FinancialReportDetails,
  rows: FinancialDetailRow[] = details.rows,
): void {
  const url = URL.createObjectURL(
    new Blob([financialDetailsCsv(details, rows)], {
      type: "text/csv;charset=utf-8;",
    }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = `detail_bilan_${details.selection.module}_${details.selection.line}_${details.selection.month ?? `${details.from}_${details.to}`}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
