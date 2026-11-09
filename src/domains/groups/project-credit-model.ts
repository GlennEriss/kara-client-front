import type {
  CreditContract,
  GroupCreditProjectLink,
  GroupProject,
} from "@/types/types";
import type { FinancialReportSources } from "@/domains/financial/reports/entities/financial-report-sources.types";
import { buildCreditModule } from "@/domains/financial/reports/builders/credits";
import {
  currentMonthKey,
  listMonths,
  monthKeyOf,
} from "@/domains/financial/reports/utils/report-months";

export const PROJECT_CREDIT_TYPES = ["FIXE", "SPECIALE"] as const;
export type ProjectCreditType = (typeof PROJECT_CREDIT_TYPES)[number];
export const isProjectCreditType = (
  value: unknown,
): value is ProjectCreditType => value === "FIXE" || value === "SPECIALE";
export const PROJECT_CREDIT_LABELS: Record<ProjectCreditType, string> = {
  FIXE: "Crédit fixe",
  SPECIALE: "Crédit spécial",
};

export const sameProject = (
  a: GroupCreditProjectLink | null | undefined,
  b: Pick<GroupCreditProjectLink, "groupId" | "projectId">,
) => a?.groupId === b.groupId && a?.projectId === b.projectId;
export const isOpenCreditProject = (project: Pick<GroupProject, "status">) =>
  project.status === "PLANNED" || project.status === "ACTIVE";
export const PREPARATION_STATUSES = new Set([
  "DRAFT",
  "PENDING",
  "APPROVED",
  "SIMULATED",
]);

export interface ProjectCreditAmounts {
  financed: number;
  repayments: number;
  outstanding: number;
  interestCollected: number;
  penaltiesCollected: number;
}

/** Same engine as the financial report. Context relatives remain available,
 * while only the linked contracts contribute. Figures cover their lifetime. */
export function projectCreditAmounts(
  sources: FinancialReportSources,
  ids: string[],
  now = new Date(),
): ProjectCreditAmounts {
  const end = currentMonthKey(now);
  let start = end;
  const dateFields = new Set([
    "createdAt",
    "disbursementDate",
    "firstPaymentDate",
    "startedAt",
    "extendedAt",
    "paymentDate",
    "paidAt",
    "date",
    "writtenOffAt",
  ]);
  const visit = (value: unknown) => {
    if (Array.isArray(value)) value.forEach(visit);
    else if (value && typeof value === "object" && !(value instanceof Date)) {
      for (const [key, entry] of Object.entries(value)) {
        if (dateFields.has(key)) {
          const month = monthKeyOf(entry);
          if (month && month >= "1900-01" && month < start) start = month;
        } else if (entry && typeof entry === "object") visit(entry);
      }
    }
  };
  sources.creditContracts.forEach(visit);
  sources.creditPayments.forEach(visit);
  sources.creditPenalties.forEach(visit);
  const months = listMonths(
    start,
    end,
    (Number(end.slice(0, 4)) - Number(start.slice(0, 4)) + 1) * 12,
  );
  const modules = PROJECT_CREDIT_TYPES.map((type) =>
    buildCreditModule(
      type,
      sources,
      { months, now },
      { contractIds: new Set(ids) },
    ),
  );
  const value = (block: string, key: string) =>
    modules.reduce(
      (total, module) =>
        total +
        (module.blocks
          .find((b) => b.key === block)
          ?.lines.find((l) => l.key === key)?.total ?? 0),
      0,
    );
  return {
    financed: value("treasury", "out_disbursed"),
    repayments: value("treasury", "in_repayments"),
    outstanding: value("outstanding", "receivables"),
    interestCollected: value("result", "income_interest"),
    penaltiesCollected: value("result", "income_penalties"),
  };
}

export interface ProjectCreditRow extends ProjectCreditAmounts {
  id: string;
  creditType: ProjectCreditType;
  clientId: string;
  clientName: string;
  status: CreditContract["status"];
  amount: number;
}
