import type { Firestore } from "firebase-admin/firestore";
import { firebaseCollectionNames as names } from "@/constantes/firebase-collection-names";
import routes from "@/constantes/routes";
import type {
  FinancialDetailParty,
  FinancialReportDetails,
} from "../entities/financial-report-details.types";

const fields = ["firstName", "lastName", "matricule", "name", "label"];
const text = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";
const validId = (id: string) =>
  !!id && !id.includes("/") && id !== "." && id !== "..";
type Identity = { id: string; name: string; matricule?: string };

/** Resolve only people/groups that actually contribute to the opened line.
 * Neither the entire member directory nor private contact fields are read. */
export async function enrichFinancialReportDetails(
  db: Firestore,
  details: FinancialReportDetails,
): Promise<FinancialReportDetails> {
  const parties = details.rows.flatMap((row) => [
    row.party,
    ...row.relatedParties,
  ]);
  const members = new Set(
    parties
      .filter((p) => p.kind !== "group" && p.id && validId(p.id))
      .map((p) => p.id!),
  );
  const groups = new Set(
    parties
      .filter((p) => p.kind === "group" && p.id && validId(p.id))
      .map((p) => p.id!),
  );
  const people = new Map<string, Identity>();
  const collect = async (
    collection: string,
    ids: Set<string>,
    target: Map<string, Identity>,
  ) => {
    const all = [...ids];
    for (let start = 0; start < all.length; start += 100) {
      const docs = await db.getAll(
        ...all
          .slice(start, start + 100)
          .map((id) => db.collection(collection).doc(id)),
        { fieldMask: fields },
      );
      for (const doc of docs) {
        if (!doc.exists) continue;
        const data = doc.data() ?? {};
        target.set(doc.id, {
          id: doc.id,
          name:
            [text(data.lastName), text(data.firstName)]
              .filter(Boolean)
              .join(" ") ||
            text(data.name) ||
            text(data.label),
          matricule: text(data.matricule) || undefined,
        });
      }
    }
  };
  await collect(names.users, members, people);
  const unresolved = [...members].filter((id) => !people.has(id));
  for (let start = 0; start < unresolved.length; start += 30) {
    const docs = await db
      .collection(names.users)
      .where("matricule", "in", unresolved.slice(start, start + 30))
      .select(...fields)
      .get();
    for (const doc of docs.docs) {
      const data = doc.data();
      const matricule = text(data.matricule);
      if (matricule)
        people.set(matricule, {
          id: doc.id,
          name: [text(data.lastName), text(data.firstName)]
            .filter(Boolean)
            .join(" "),
          matricule,
        });
    }
  }
  const groupNames = new Map<string, Identity>();
  await collect(names.groups, groups, groupNames);
  const enrich = (party: FinancialDetailParty): FinancialDetailParty => {
    const identity = party.id
      ? (party.kind === "group" ? groupNames : people).get(party.id)
      : undefined;
    return identity
      ? {
          ...party,
          name: identity.name || party.name,
          matricule: identity.matricule ?? party.matricule,
          href:
            party.kind === "group"
              ? routes.admin.groupDetails(encodeURIComponent(identity.id))
              : routes.admin.membershipDetails(encodeURIComponent(identity.id)),
        }
      : party;
  };
  return {
    ...details,
    rows: details.rows.map((row) => ({
      ...row,
      party: enrich(row.party),
      relatedParties: row.relatedParties.map(enrich),
    })),
  };
}
