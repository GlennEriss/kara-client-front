import type { ContributionPayment } from "./contribution-model";
export interface PayoutFee {
  enabled: boolean;
  amount: number;
}
export interface GroupPayout {
  id: string;
  operationId: string;
  groupId: string;
  groupName: string;
  projectId: string;
  projectName: string;
  period: string;
  beneficiaryId: string;
  beneficiaryName: string;
  grossAmount: number;
  feeAmount: number;
  netAmount: number;
  date: string;
  source: Exclude<ContributionPayment["source"], "CREDIT_FIXE">;
  reference: string;
  note: string;
  byId: string;
  byName: string;
  at: unknown;
}
export const payoutId = (groupId: string, projectId: string, period: string) =>
  [groupId, projectId, period].map(id => encodeURIComponent(id).replace(/_/g, "%5F")).join("__");
export function payoutAmounts(gross: number, fee?: PayoutFee) {
  if (!Number.isSafeInteger(gross) || gross <= 0)
    throw new Error("Le montant de la caisse doit être un entier positif.");
  const retained = fee?.enabled ? fee.amount : 0;
  if (
    !Number.isSafeInteger(retained) ||
    retained < 0 ||
    (fee?.enabled && retained === 0) ||
    retained >= gross
  )
    throw new Error(
      "La redevance doit être un montant entier positif inférieur au montant de la caisse.",
    );
  return {
    grossAmount: gross,
    feeAmount: retained,
    netAmount: gross - retained,
  };
}
