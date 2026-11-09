import { describe, expect, it } from "vitest";
import {
  splitCollectiveCredit,
  validateCollectiveCredit,
} from "../collective-credit-model";
const input = {
  totalAmount: 10001,
  shares: splitCollectiveCredit(10001, ["a", "b", "c"]),
  desiredDate: "2026-12-05",
  cause: "Achat du matériel collectif",
};
describe("répartition du financement collectif", () => {
  it("répartit tous les francs sans arrondi perdu et accepte une répartition personnalisée exacte", () => {
    expect(input.shares.map((s) => s.amount)).toEqual([3334, 3334, 3333]);
    expect(() => validateCollectiveCredit(input)).not.toThrow();
    expect(() =>
      validateCollectiveCredit({
        ...input,
        shares: [
          { memberId: "a", amount: 7000 },
          { memberId: "b", amount: 3001 },
        ],
      }),
    ).not.toThrow();
  });
  it("refuse une somme différente, les fractions de franc, les doublons et une part hors limites", () => {
    expect(() =>
      validateCollectiveCredit({ ...input, totalAmount: 10002 }),
    ).toThrow("exactement");
    expect(() =>
      validateCollectiveCredit({
        ...input,
        shares: [{ memberId: "a", amount: 10001.5 }],
      }),
    ).toThrow("entier");
    expect(() =>
      validateCollectiveCredit({
        ...input,
        shares: [
          { memberId: "a", amount: 5000 },
          { memberId: "a", amount: 5001 },
        ],
      }),
    ).toThrow("qu’une part");
    expect(() =>
      validateCollectiveCredit({
        ...input,
        shares: [
          { memberId: "a", amount: 999 },
          { memberId: "b", amount: 9002 },
        ],
      }),
    ).toThrow("1 000");
  });
});
