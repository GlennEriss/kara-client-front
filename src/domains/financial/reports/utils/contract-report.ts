import type {
  FinancialReport,
  FinancialReportModuleKey,
  FinancialReportBlockKey,
} from "../entities/financial-report.types";
import type { FinancialContractReport } from "../entities/financial-report-details.types";
const STATUS_LABELS: Readonly<Record<string, string>> = {
  ACTIVE: "En cours",
  ACTIF: "En cours",
  INACTIVE: "Inactif",
  PARTIAL: "Partiellement réglé",
  PAID: "Payé",
  REPAID: "Remboursé",
  CLOSED: "Clôturé",
  DISCHARGED: "Soldé",
  DRAFT: "Brouillon",
  PENDING: "En attente",
  PENDING_ADMIN: "En attente de validation",
  APPROVED: "Approuvé",
  REJECTED: "Rejeté",
  REFUSED: "Refusé",
  UNDER_REVIEW: "En cours d’examen",
  VALIDATED: "Validé",
  DELETED: "Supprimé",
  EARLY_EXIT: "Sortie anticipée",
  EARLYEXIT: "Sortie anticipée",
  CANCELED: "Annulé",
  CANCELLED: "Annulé",
  COMPLETED: "Terminé",
  FINISHED: "Terminé",
  PLANNED: "En préparation",
  WRITTEN_OFF: "Clôturé en perte",
  OVERDUE: "En retard",
  DUE: "À régler",
  LATE_NO_PENALTY: "En retard sans pénalité",
  LATE_WITH_PENALTY: "En retard avec pénalité",
  DEFAULTED_AFTER_J12: "Défaillant après 12 jours de retard",
  EARLY_WITHDRAW_REQUESTED: "Retrait anticipé demandé",
  FINAL_REFUND_PENDING: "Remboursement final en attente",
  EARLY_REFUND_PENDING: "Remboursement anticipé en attente",
  RESCINDED: "Résilié",
  TRANSFORMED: "Transformé",
  BLOCKED: "Bloqué",
  EXTENDED: "Remplacé après rajout",
  SIMULATED: "Simulation",
  CONVERTED: "Converti en contrat",
  REOPENED: "Rouvert",
  ARCHIVED: "Archivé",
  CONFIRMED: "Confirmé",
  NON_RENSEIGNE: "Non renseigné",
  CONTRAT_INTROUVABLE: "Contrat introuvable",
  COTISATION_ENREGISTREE: "Cotisation enregistrée",
  REMISE_ENREGISTREE: "Remise enregistrée",
};
const statusKey = (value: string) =>
  value
    .trim()
    .replace(/([a-z])([A-Z])/g, "$1_$2")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\s-]+/g, "_")
    .toUpperCase();
const frenchLabels = new Map(
  Object.values(STATUS_LABELS).map((label) => [statusKey(label), label]),
);
/** Presentation only: stored statuses remain unchanged. Unknown codes never reach a reader. */
export function financialStatusLabel(value: string): string {
  if (!value?.trim()) return "Non renseigné";
  const key = statusKey(value);
  return STATUS_LABELS[key] ?? frenchLabels.get(key) ?? "Statut à préciser";
}
export const financialSearch = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
/** Match selections by keys, not array positions. Stored data can change after report generation. */
export function financialReportChanged(
  report: FinancialReport,
  fresh: FinancialReport,
): boolean {
  if (
    report.from !== fresh.from ||
    report.to !== fresh.to ||
    report.subject?.memberId !== fresh.subject?.memberId
  )
    return true;
  return report.modules.some((m) =>
    m.blocks.some((b) =>
      b.lines.some((l) => {
        const other = fresh.modules
          .find((x) => x.key === m.key)
          ?.blocks.find((x) => x.key === b.key)
          ?.lines.find((x) => x.key === l.key);
        return (
          !other ||
          other.total !== l.total ||
          JSON.stringify(other.values) !== JSON.stringify(l.values)
        );
      }),
    ),
  );
}
export function selectContractContent(
  contracts: FinancialContractReport[],
  options: {
    modules: FinancialReportModuleKey[];
    blocks: FinancialReportBlockKey[];
  },
): FinancialContractReport[] {
  const modules = new Set(options.modules);
  // A synthesis-only export still needs the contributing contracts of all modules.
  return contracts
    .filter((c) => modules.has("synthesis") || modules.has(c.module))
    .map((c) => ({
      ...c,
      blocks: c.blocks.filter((b) => options.blocks.includes(b.key)),
    }))
    .filter((c) =>
      c.blocks.some((b) => b.lines.some((l) => l.values.some((v) => v !== 0))),
    );
}
