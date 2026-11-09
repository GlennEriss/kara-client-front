import {
  collection,
  doc,
  getDocs,
  query,
  where,
  runTransaction,
  serverTimestamp,
  Timestamp,
  type DocumentData,
} from "firebase/firestore";
import { db } from "@/firebase/firestore";
import type { GroupProject } from "@/types/types";
import type { GroupActor } from "./group-service";
import {
  contributionId,
  paidContribution,
  validPaymentDate,
  type GroupContribution,
} from "./contribution-model";
import {
  payoutAmounts,
  payoutId,
  type GroupPayout,
  type PayoutFee,
} from "./payout-model";
const checked = (id: string) => {
  if (!id || id.includes("/") || id === "." || id === "..")
    throw new Error("Référence de remise invalide.");
  return id;
};
const groupRef = (id: string) => doc(db, "groups", checked(id));
function projectOf(group: DocumentData, projectId: string): GroupProject {
  const p = (group.projects ?? []).find(
    (p: GroupProject) => p.id === projectId,
  );
  if (!p || p.kind !== "TONTINE" || !p.contributionPlan)
    throw new Error("Configurez d’abord le cycle de cette caisse collective.");
  return p;
}
const event = (description: string, actor: GroupActor) => ({
  id: crypto.randomUUID(),
  description,
  byId: actor.id,
  byName: actor.name,
  at: Timestamp.now(),
});
export async function configurePayoutFee(
  groupId: string,
  projectId: string,
  input: PayoutFee,
  actor: GroupActor,
) {
  if (!actor.id || typeof input.enabled !== "boolean")
    throw new Error("Connectez-vous et vérifiez la redevance.");
  await runTransaction(db, async (tx) => {
    const group = await tx.get(groupRef(groupId));
    if (!group.exists()) throw new Error("Le groupe n’existe plus.");
    const project = projectOf(group.data(), projectId);
    if (!["PLANNED", "ACTIVE"].includes(project.status))
      throw new Error("Ce projet n’est plus ouvert.");
    payoutAmounts(
      project.contributionPlan!.amount *
        project.contributionPlan!.participants.length,
      input,
    );
    const fee = {
      enabled: input.enabled,
      amount: input.enabled ? input.amount : 0,
    };
    tx.update(group.ref, {
      projects: group
        .data()
        .projects.map((p: GroupProject) =>
          p.id === projectId ? { ...p, payoutFee: fee } : p,
        ),
      activity: [
        ...(group.data().activity ?? []),
        event(
          `Redevance des prochaines remises de « ${project.name} » : ${fee.enabled ? fee.amount + " FCFA par remise" : "désactivée"}. Les remises enregistrées sont conservées.`,
          actor,
        ),
      ],
      updatedAt: serverTimestamp(),
      updatedBy: actor.id,
    });
  });
}
export async function listGroupPayouts(
  groupId: string,
  projectId: string,
): Promise<GroupPayout[]> {
  const snap = await getDocs(
    query(
      collection(db, "groupPayouts"),
      where("groupId", "==", checked(groupId)),
    ),
  );
  return snap.docs
    .map((d) => ({ ...d.data(), id: d.id }) as GroupPayout)
    .filter((p) => p.projectId === projectId)
    .sort((a, b) => b.period.localeCompare(a.period));
}
export type PayoutInput = Pick<
  GroupPayout,
  "operationId" | "beneficiaryId" | "date" | "source" | "reference" | "note"
> & { expectedGross: number; expectedFee: number };
/** One immutable remittance per month; authoritative amounts are recomputed in the transaction. */
export async function recordGroupPayout(
  groupId: string,
  projectId: string,
  period: string,
  input: PayoutInput,
  actor: GroupActor,
) {
  if (
    !actor.id ||
    !validPaymentDate(input.date) ||
    !["CASH", "AIRTEL_MONEY", "MOBICASH", "BANK_TRANSFER"].includes(
      input.source,
    )
  )
    throw new Error(
      "Vérifiez la date réelle de remise et le moyen de paiement.",
    );
  checked(input.operationId);
  checked(input.beneficiaryId);
  checked(projectId);
  if (
    !/^\d{4}-(0[1-9]|1[0-2])$/.test(period) ||
    input.reference.length > 120 ||
    input.note.length > 500
  )
    throw new Error("Vérifiez le mois, la référence et la note.");
  const ref = doc(
    db,
    "groupPayouts",
    payoutId(checked(groupId), projectId, period),
  );
  await runTransaction(db, async (tx) => {
    const group = await tx.get(groupRef(groupId));
    const previous = await tx.get(ref);
    if (previous.exists()) {
      const old = previous.data();
      if (
        old.operationId !== input.operationId ||
        old.beneficiaryId !== input.beneficiaryId ||
        old.date !== input.date ||
        old.source !== input.source ||
        old.reference !== input.reference.trim() ||
        old.note !== input.note.trim() ||
        old.grossAmount !== input.expectedGross ||
        old.feeAmount !== input.expectedFee
      )
        throw new Error(
          "Une remise est déjà enregistrée pour ce mois. Actualisez son historique.",
        );
      return;
    }
    if (!group.exists()) throw new Error("Le groupe n’existe plus.");
    const project = projectOf(group.data(), projectId),
      plan = project.contributionPlan!;
    if (project.status === "CANCELLED")
      throw new Error("Ce projet est annulé.");
    if (!plan.periods.some((p) => p.period === period))
      throw new Error("Ce mois ne fait pas partie du cycle.");
    const beneficiary = plan.participants.find(
      (p) => p.id === input.beneficiaryId,
    );
    if (!beneficiary)
      throw new Error(
        "Choisissez un bénéficiaire parmi les participants du cycle.",
      );
    const member = await tx.get(doc(db, "users", checked(beneficiary.id)));
    const rows = await Promise.all(
      plan.participants.map((p) =>
        tx.get(
          doc(
            db,
            "groups",
            groupId,
            "contributions",
            contributionId(projectId, period, p.id),
          ),
        ),
      ),
    );
    if (!member.exists() || !(member.data().groupIds ?? []).includes(groupId))
      throw new Error("Le bénéficiaire doit encore appartenir au groupe.");
    if (
      !rows.length ||
      rows.some((snapshot, i) => {
        if (!snapshot.exists()) return true;
        const row = snapshot.data() as GroupContribution;
        return (
          row.memberId !== plan.participants[i].id ||
          row.projectId !== projectId ||
          row.period !== period ||
          row.amount !== plan.amount ||
          paidContribution(row) !== plan.amount ||
          row.payments.some(
            (p) => !validPaymentDate(p.date) || p.date > input.date,
          )
        );
      })
    )
      throw new Error(
        "Toutes les cotisations du mois doivent être réglées ou prises en charge avant la date de remise.",
      );
    const amounts = payoutAmounts(
      plan.amount * plan.participants.length,
      project.payoutFee,
    );
    if (
      amounts.grossAmount !== input.expectedGross ||
      amounts.feeAmount !== input.expectedFee
    )
      throw new Error(
        "Le montant ou la redevance a changé. Actualisez puis vérifiez le récapitulatif.",
      );
    tx.set(ref, {
      id: ref.id,
      operationId: input.operationId,
      groupId,
      groupName: group.data().name,
      projectId,
      projectName: project.name,
      period,
      beneficiaryId: beneficiary.id,
      beneficiaryName: beneficiary.name,
      ...amounts,
      date: input.date,
      source: input.source,
      reference: input.reference.trim(),
      note: input.note.trim(),
      byId: actor.id,
      byName: actor.name,
      at: serverTimestamp(),
    });
    tx.update(group.ref, {
      projects: group
        .data()
        .projects.map((p: GroupProject) =>
          p.id === projectId
            ? { ...p, contributionPlan: { ...plan, locked: true } }
            : p,
        ),
      activity: [
        ...(group.data().activity ?? []),
        event(
          `Remise de ${period} enregistrée pour « ${project.name} ». Les montants et le bénéficiaire sont conservés dans le registre des remises.`,
          actor,
        ),
      ],
      updatedAt: serverTimestamp(),
      updatedBy: actor.id,
    });
  });
}
