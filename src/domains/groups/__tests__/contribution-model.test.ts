import { describe, expect, it, vi, afterEach } from "vitest";
import { planPeriods, validPaymentDate, contributionId, contributionPeriodLabel, currentContributionPeriod, isContributionPeriod } from "../contribution-model";
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
  it('génère une cotisation et une prise chaque jour, y compris en année bissextile', () => {
    expect(planPeriods({ amount: 1000, frequency: 'DAILY', startDate: '2028-02-28', periodCount: 3 })).toEqual([
      { period: '2028-02-28', dueDate: '2028-02-28' },
      { period: '2028-02-29', dueDate: '2028-02-29' },
      { period: '2028-03-01', dueDate: '2028-03-01' },
    ]);
    expect(contributionId('p1', '2028-02-28', 'alice')).not.toBe(contributionId('p1', '2028-02-29', 'alice'));
  });
  it('génère une prise tous les 7 jours même au changement d’année', () => {
    expect(planPeriods({ amount: 10000, frequency: 'WEEKLY', startDate: '2026-12-28', periodCount: 3 })).toEqual([
      { period: '2026-12-28', dueDate: '2026-12-28' },
      { period: '2027-01-04', dueDate: '2027-01-04' },
      { period: '2027-01-11', dueDate: '2027-01-11' },
    ]);
  });
  it('valide les dates réelles et la limite des nouvelles fréquences', () => {
    for (const frequency of ['DAILY', 'WEEKLY'] as const) {
      for (const periodCount of [0, 1.5, 401]) expect(() => planPeriods({ amount: 1000, frequency, startDate: '2026-11-01', periodCount })).toThrow();
      expect(() => planPeriods({ amount: 1000, frequency, startDate: '2026-02-30', periodCount: 3 })).toThrow();
    }
    expect(isContributionPeriod('2026-11-01', 'MONTHLY')).toBe(false);
    expect(isContributionPeriod('2026-11', 'DAILY')).toBe(false);
    expect(isContributionPeriod('2026-02-30')).toBe(false);
    expect(contributionPeriodLabel('2026-11-02', 'WEEKLY')).toBe('Semaine du 2 novembre 2026');
  });
  it('sélectionne la semaine en cours plutôt que la première du cycle', () => {
    const periods = planPeriods({ amount: 1000, frequency: 'WEEKLY', startDate: '2026-10-26', periodCount: 4 });
    expect(currentContributionPeriod({ frequency: 'WEEKLY', periods }, '2026-11-04')).toBe('2026-11-02');
  });
});
