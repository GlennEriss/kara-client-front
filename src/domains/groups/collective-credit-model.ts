export interface CollectiveCreditShare {
  memberId: string;
  amount: number;
  guarantorId?: string;
}

/** Assign the remainder one franc at a time, in the displayed participant order. */
export function splitCollectiveCredit(
  total: number,
  memberIds: string[],
): CollectiveCreditShare[] {
  if (!memberIds.length) return [];
  if (!Number.isSafeInteger(total) || total < 0)
    throw new Error("Indiquez un montant entier en FCFA.");
  const base = Math.floor(total / memberIds.length);
  const rest = total % memberIds.length;
  return memberIds.map((memberId, index) => ({
    memberId,
    amount: base + (index < rest ? 1 : 0),
  }));
}

export function validateCollectiveCredit(input: {
  totalAmount: number;
  shares: CollectiveCreditShare[];
  desiredDate: string;
  cause: string;
}): void {
  if (!Number.isSafeInteger(input.totalAmount) || input.totalAmount < 1000)
    throw new Error(
      "Le montant total doit être un entier d’au moins 1 000 FCFA.",
    );
  if (!input.shares.length || input.shares.length > 400)
    throw new Error("Sélectionnez entre 1 et 400 participants à financer.");
  if (new Set(input.shares.map((s) => s.memberId)).size !== input.shares.length)
    throw new Error("Un membre ne peut avoir qu’une part dans cette demande.");
  if (
    input.shares.some(
      (s) =>
        !Number.isSafeInteger(s.amount) ||
        s.amount < 1000 ||
        s.amount > 10000000,
    )
  )
    throw new Error(
      "Chaque part doit être un montant entier entre 1 000 et 10 000 000 FCFA.",
    );
  if (input.shares.reduce((sum, s) => sum + s.amount, 0) !== input.totalAmount)
    throw new Error(
      "La somme des parts doit correspondre exactement au montant total.",
    );
  const date = new Date(`${input.desiredDate}T12:00:00Z`);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(input.desiredDate) ||
    Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== input.desiredDate
  )
    throw new Error("Choisissez une date souhaitée valide.");
  if (input.cause.trim().length < 10 || input.cause.trim().length > 500)
    throw new Error("Le motif doit contenir entre 10 et 500 caractères.");
}
