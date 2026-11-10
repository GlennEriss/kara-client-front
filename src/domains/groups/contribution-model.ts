import type { GroupProject } from "@/types/types";
import { addContractMonths } from "@/utils/contract-months";

export type ContributionFrequency = "DAILY" | "WEEKLY" | "MONTHLY";
export const CONTRIBUTION_FREQUENCIES = {
  DAILY: { label: "Journalière", adjective: "journalières", unit: "jour", plural: "jours" },
  WEEKLY: { label: "Hebdomadaire", adjective: "hebdomadaires", unit: "semaine", plural: "semaines" },
  MONTHLY: { label: "Mensuelle", adjective: "mensuelles", unit: "mois", plural: "mois" },
} as const;

export interface ContributionPlan {
  amount: number;
  /** Absent dans les cycles mensuels historiques. */
  frequency?: ContributionFrequency;
  startMonth?: string;
  months?: number;
  dueDay?: number;
  startDate?: string;
  periodCount?: number;
  periods: { period: string; dueDate: string }[];
  participants: { id: string; name: string }[];
  locked: boolean;
}
export interface ContributionPayment {
  id: string;
  amount: number;
  date: string;
  source:
    "CASH" | "AIRTEL_MONEY" | "MOBICASH" | "BANK_TRANSFER" | "CREDIT_FIXE";
  reference?: string;
  note?: string;
  contractId?: string;
  byId: string;
  byName: string;
  at: unknown;
}
export interface GroupContribution {
  id: string;
  projectId: string;
  projectName?: string;
  memberId: string;
  memberName: string;
  period: string;
  dueDate: string;
  amount: number;
  payments: ContributionPayment[];
  financingDemandId?: string | null;
  financingContractId?: string | null;
}
export type ContributionPlanInput = { amount: number } & (
  { frequency?: "MONTHLY"; startMonth: string; months: number; dueDay: number }
  | { frequency: "DAILY" | "WEEKLY"; startDate: string; periodCount: number }
);
export const contributionFrequency = (plan?: Pick<ContributionPlan, "frequency">): ContributionFrequency => plan?.frequency ?? "MONTHLY";
export function isContributionDate(date: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const parsed = new Date(`${date}T12:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date;
}
export function isContributionPeriod(period: string, frequency?: ContributionFrequency): boolean {
  if (frequency === "MONTHLY" || (!frequency && period.length === 7)) return /^\d{4}-(0[1-9]|1[0-2])$/.test(period);
  return isContributionDate(period);
}
export function contributionPeriodLabel(period: string, frequency?: ContributionFrequency): string {
  if (!isContributionPeriod(period)) return "Période à préciser";
  const monthly = period.length === 7;
  const date = new Date(`${period}${monthly ? "-01" : ""}T12:00:00Z`);
  const label = date.toLocaleDateString("fr-FR", { timeZone: "Africa/Libreville", ...(monthly ? {} : { day: "numeric" as const }), month: "long", year: "numeric" });
  return frequency === "WEEKLY" ? `Semaine du ${label}` : label;
}
export function currentContributionPeriod(plan: Pick<ContributionPlan, "frequency" | "periods">, today = todayLibreville()): string {
  const exact = contributionFrequency(plan) === "MONTHLY" ? today.slice(0, 7) : today;
  return plan.periods.find(p => p.period === exact)?.period
    ?? [...plan.periods].reverse().find(p => p.dueDate <= today)?.period
    ?? plan.periods[0]?.period ?? "";
}
export const contributionId = (
  projectId: string,
  period: string,
  memberId: string,
) =>
  `${encodeURIComponent(projectId)}__${period}__${encodeURIComponent(memberId)}`;
export const paidContribution = (row: Pick<GroupContribution, "payments">) =>
  (row.payments ?? []).reduce((sum, p) => sum + p.amount, 0);
export const remainingContribution = (
  row: Pick<GroupContribution, "payments" | "amount">,
) => Math.max(0, row.amount - paidContribution(row));
export const todayLibreville = () =>
  new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Libreville" });
export function validPaymentDate(date: string) {
  return isContributionDate(date) && date <= todayLibreville();
}
export function planPeriods(
  input: ContributionPlanInput,
): ContributionPlan["periods"] {
  if (
    !Number.isSafeInteger(input.amount) ||
    input.amount < 1000 ||
    input.amount > 10000000
  )
    throw new Error(
      "La cotisation doit être un entier entre 1 000 et 10 000 000 FCFA.",
    );
  if (input.frequency === "DAILY" || input.frequency === "WEEKLY") {
    if (!isContributionDate(input.startDate) || !Number.isSafeInteger(input.periodCount) || input.periodCount < 1 || input.periodCount > 400)
      throw new Error("Choisissez une première date valide et entre 1 et 400 échéances.");
    const first = new Date(`${input.startDate}T12:00:00Z`);
    const step = input.frequency === "DAILY" ? 1 : 7;
    return Array.from({ length: input.periodCount }, (_, index) => {
      const date = new Date(first);
      date.setUTCDate(first.getUTCDate() + index * step);
      const dueDate = date.toISOString().slice(0, 10);
      return { period: dueDate, dueDate };
    });
  }
  if (input.frequency && input.frequency !== "MONTHLY") throw new Error("Choisissez une fréquence de cotisation valide.");
  if (
    !/^\d{4}-(0[1-9]|1[0-2])$/.test(input.startMonth) ||
    !Number.isSafeInteger(input.months) ||
    input.months < 1 ||
    input.months > 60
  )
    throw new Error(
      "Choisissez un premier mois valide et une durée de 1 à 60 mois.",
    );
  if (
    !Number.isSafeInteger(input.dueDay) ||
    input.dueDay < 1 ||
    input.dueDay > 31
  )
    throw new Error("Choisissez un jour d’échéance entre 1 et 31.");
  const start = new Date(`${input.startMonth}-01T12:00:00Z`);
  if (!Number.isFinite(start.getTime()))
    throw new Error("Le premier mois est invalide.");
  return Array.from({ length: input.months }, (_, i) => {
    const date = addContractMonths(start, i);
    const year = date.getUTCFullYear(),
      month = date.getUTCMonth();
    const day = Math.min(
      input.dueDay,
      new Date(Date.UTC(year, month + 1, 0)).getUTCDate(),
    );
    return {
      period: date.toISOString().slice(0, 7),
      dueDate: new Date(Date.UTC(year, month, day, 12))
        .toISOString()
        .slice(0, 10),
    };
  });
}
export function plannedContribution(
  project: Pick<GroupProject, "id"> & { contributionPlan?: ContributionPlan },
  period: string,
  memberId: string,
): GroupContribution {
  const plan = project.contributionPlan;
  const member = plan?.participants.find((p) => p.id === memberId);
  const due = plan?.periods.find((p) => p.period === period);
  if (!plan || !member || !due)
    throw new Error(
      "La cotisation ne correspond pas au cycle de ce participant.",
    );
  return {
    id: contributionId(project.id, period, memberId),
    projectId: project.id,
    memberId,
    memberName: member.name,
    period,
    dueDate: due.dueDate,
    amount: plan.amount,
    payments: [],
  };
}
