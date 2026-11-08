import { describe, expect, it, vi } from "vitest";
import type { Firestore } from "firebase-admin/firestore";
import { enrichFinancialReportDetails } from "../services/enrichFinancialReportDetails";
import type {
  FinancialDetailParty,
  FinancialReportDetails,
} from "../entities/financial-report-details.types";

describe("identités du détail financier", () => {
  it("charge seulement les identités concernées, résout UID/matricule et distingue les groupes", async () => {
    const docs: Record<string, Record<string, unknown>> = {
      "users/alice": {
        firstName: "Alice",
        lastName: "Ondo",
        matricule: "MK1",
        contacts: ["privé"],
        bankAccount: "privé",
      },
      "groups/alice": { name: "Groupe des artisans", description: "privé" },
    };
    const direct = vi.fn(async (...args: unknown[]) =>
      args
        .slice(0, -1)
        .map((ref) => ({
          exists: !!docs[String(ref)],
          id: String(ref).split("/")[1],
          data: () => docs[String(ref)],
        })),
    );
    const alias = vi.fn(async () => ({
      docs: [
        {
          id: "bob-uid",
          data: () => ({
            firstName: "Bob",
            lastName: "Mba",
            matricule: "MK2",
            contacts: ["privé"],
          }),
        },
      ],
    }));
    const select = vi.fn(() => ({ get: alias }));
    const where = vi.fn(() => ({ select }));
    const db = {
      getAll: direct,
      collection: (name: string) => ({
        doc: (id: string) => `${name}/${id}`,
        where,
      }),
    } as unknown as Firestore;
    const party = (
      id: string,
      kind: FinancialDetailParty["kind"] = "member",
    ) => ({ id, name: "Nom enregistré", kind });
    const details = {
      rows: [
        { key: "a", party: party("alice"), relatedParties: [party("MK2")] },
        { key: "b", party: party("alice", "group"), relatedParties: [] },
        { key: "c", party: party("missing"), relatedParties: [] },
        { key: "d", party: party("invalid/path"), relatedParties: [] },
      ],
    } as unknown as FinancialReportDetails;
    const result = await enrichFinancialReportDetails(db, details);
    expect(result.rows[0].party).toMatchObject({
      name: "Ondo Alice",
      matricule: "MK1",
      href: "/memberships/alice",
    });
    expect(result.rows[0].relatedParties[0]).toMatchObject({
      name: "Mba Bob",
      matricule: "MK2",
      href: "/memberships/bob-uid",
    });
    expect(result.rows[1].party).toMatchObject({
      name: "Groupe des artisans",
      href: "/groups/alice",
    });
    expect(result.rows[2].party).toEqual(party("missing"));
    expect(result.rows[3].party).toEqual(party("invalid/path"));
    expect(where).toHaveBeenCalledWith("matricule", "in", ["MK2", "missing"]);
    expect(select).toHaveBeenCalledWith(
      "firstName",
      "lastName",
      "matricule",
      "name",
      "label",
    );
    expect(direct.mock.calls.flat()).not.toContain("users/invalid/path");
    expect(JSON.stringify(result)).not.toMatch(/contacts|bankAccount|privé/);
    expect(details.rows[0].party.name).toBe("Nom enregistré");
  });
  it("ne charge pas l’annuaire pour une ligne sans contribution", async () => {
    const db = { getAll: vi.fn(), collection: vi.fn() } as unknown as Firestore;
    await enrichFinancialReportDetails(db, {
      rows: [],
    } as unknown as FinancialReportDetails);
    expect(db.collection).not.toHaveBeenCalled();
    expect(db.getAll).not.toHaveBeenCalled();
  });
});
