import { describe, expect, it, vi, afterEach } from "vitest";
import { planPeriods, validPaymentDate } from "../contribution-model";
afterEach(() => vi.useRealTimers());
describe("calendrier de cotisations", () => {
  it("conserve les mois consécutifs et plafonne les jours en février", () => {
    expect(
      planPeriods({
        amount: 10000,
        startMonth: "2026-01",
        months: 3,
        dueDay: 31,
      }),
    ).toEqual([
      { period: "2026-01", dueDate: "2026-01-31" },
      { period: "2026-02", dueDate: "2026-02-28" },
      { period: "2026-03", dueDate: "2026-03-31" },
    ]);
  });
  it("refuse un cycle invalide et une date de versement future ou impossible", () => {
    expect(() =>
      planPeriods({
        amount: 10000,
        startMonth: "2026-13",
        months: 3,
        dueDay: 5,
      }),
    ).toThrow();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-09T23:30:00Z"));
    expect(validPaymentDate("2026-11-10")).toBe(true);
    expect(validPaymentDate("2026-11-11")).toBe(false);
    expect(validPaymentDate("2026-02-30")).toBe(false);
  });
});
