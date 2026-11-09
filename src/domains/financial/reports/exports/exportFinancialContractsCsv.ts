import type { FinancialReport } from "../entities/financial-report.types";
import type { FinancialContractReport } from "../entities/financial-report-details.types";
import { financialStatusLabel } from "../utils/contract-report";
const cell = (value: unknown) => {
  const text = String(value ?? "");
  const safe =
    typeof value === "string" && /^[\s]*[=+\-@\t\r]/.test(text)
      ? `'${text}`
      : text;
  return `"${safe.replace(/"/g, '""')}"`;
};
export function financialContractsCsv(
  report: FinancialReport,
  contracts: FinancialContractReport[],
): string {
  const lines: unknown[][] = [
    [
      "Module",
      "Personne / groupe",
      "Matricule / identifiant",
      "Contrat / dossier",
      "Statut actuel",
      "Personnes / groupes associés",
      "Informations du dossier",
      "Partie",
      "Indicateur",
      "Nature",
      "Unité",
      ...report.monthLabels,
      "Total / fin",
    ],
  ];
  for (const c of contracts)
    for (const b of c.blocks)
      for (const l of b.lines)
        lines.push([
          c.moduleTitle,
          c.party.name,
          c.party.matricule || c.party.id || "",
          c.sourceLabel,
          financialStatusLabel(c.status),
          c.relatedParties.map((p) => p.name).join(", "),
          c.facts.map((f) => `${f.label} : ${f.value}`).join(" · "),
          b.title,
          l.label,
          l.kind === "stock" ? "Situation en fin de mois" : "Mouvement du mois",
          l.unit === "count" ? "Nombre" : "FCFA",
          ...l.values,
          l.total,
        ]);
  return "\uFEFF" + lines.map((row) => row.map(cell).join(";")).join("\r\n");
}
export function exportFinancialContractsCsv(
  report: FinancialReport,
  contracts: FinancialContractReport[],
) {
  const url = URL.createObjectURL(
    new Blob([financialContractsCsv(report, contracts)], {
      type: "text/csv;charset=utf-8;",
    }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = `contrats_bilan_${report.from}_${report.to}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
