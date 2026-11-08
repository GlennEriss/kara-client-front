import { describe, expect, it } from "vitest";
import { emptyProject, validateGroup, validateProject } from "../group-model";

describe("validation des projets collectifs", () => {
  it.each(["2027-02-30", "2026-13-01", "une date"])(
    "refuse une date cible invalide : %s",
    (targetDate) => {
      expect(() =>
        validateProject({ ...emptyProject(), name: "Atelier", targetDate }),
      ).toThrow("date cible");
    },
  );
  it("accepte une date cible passée sur un projet historique", () => {
    expect(() =>
      validateProject({
        ...emptyProject(),
        name: "Ancien achat",
        targetDate: "2024-02-29",
        status: "COMPLETED",
      }),
    ).not.toThrow();
  });
  it.each([-1, NaN, Infinity])(
    "refuse un budget incorrect : %s",
    (estimatedBudget) => {
      expect(() =>
        validateProject({
          ...emptyProject(),
          name: "Atelier",
          estimatedBudget,
        }),
      ).toThrow("budget");
    },
  );
  it("refuse un groupe sans nom et un projet sans nom", () => {
    expect(() => validateGroup({ name: " ", memberIds: [] })).toThrow(
      "nom au groupe",
    );
    expect(() => validateProject(emptyProject())).toThrow("nom au projet");
  });
});
