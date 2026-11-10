import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  runTransaction,
  serverTimestamp,
  Timestamp,
  type Transaction,
  type DocumentData,
  type DocumentSnapshot,
} from "firebase/firestore";
import { db } from "@/firebase/firestore";
import type { GroupProject, GroupCreditProjectLink, User } from "@/types/types";
import type { GroupActor } from "./group-service";
import { memberName, isOpenProject } from "./group-model";
import { payoutAmounts } from "./payout-model";
import { isGroupGuarantor } from "./group-guarantor";
import { UNKNOWN_USER_ID } from "@/domains/financial/caisse-imprevue/import/unknownUser";
import {
  planPeriods,
  plannedContribution,
  remainingContribution,
  validPaymentDate,
  contributionFrequency,
  CONTRIBUTION_FREQUENCIES,
  type ContributionPlanInput,
  type ContributionPlan,
  type GroupContribution,
  type ContributionPayment,
} from "./contribution-model";

const idCheck = (id: string) => {
  if (!id || id.includes("/") || id === "." || id === "..")
    throw new Error("Référence de cotisation invalide.");
  return id;
};
const groupRef = (id: string) => doc(db, "groups", idCheck(id));
const rowRef = (groupId: string, id: string) =>
  doc(db, "groups", idCheck(groupId), "contributions", idCheck(id));
const actorCheck = (actor: GroupActor) => {
  if (!actor.id) throw new Error("Connectez-vous pour gérer les cotisations.");
};
const event = (description: string, actor: GroupActor) => ({
  id: crypto.randomUUID(),
  description,
  at: Timestamp.now(),
  byId: actor.id,
  byName: actor.name,
});
const projectOf = (group: DocumentData, projectId: string) => {
  const project = (group.projects ?? []).find(
    (p: GroupProject) => p.id === projectId,
  ) as GroupProject | undefined;
  if (!project || project.kind !== "TONTINE")
    throw new Error("Choisissez un projet de caisse collective.");
  return project;
};
const lockProjects = (group: DocumentData, projectId: string) =>
  group.projects.map((p: GroupProject) =>
    p.id === projectId
      ? { ...p, contributionPlan: { ...p.contributionPlan, locked: true } }
      : p,
  );
const saveGroupEvent = (
  transaction: Transaction,
  group: DocumentSnapshot,
  projectId: string,
  description: string,
  actor: GroupActor,
) =>
  transaction.update(group.ref, {
    projects: lockProjects(group.data()!, projectId),
    activity: [...(group.data()!.activity ?? []), event(description, actor)],
    updatedAt: serverTimestamp(),
    updatedBy: actor.id,
  });
async function memberRef(id: string) {
  const direct = await getDoc(doc(db, "users", idCheck(id)));
  if (direct.exists()) return direct.ref;
  const aliases = await getDocs(
    query(collection(db, "users"), where("matricule", "==", id)),
  );
  if (aliases.size !== 1)
    throw new Error("Un participant est introuvable ou ambigu.");
  return aliases.docs[0].ref;
}
export async function configureContributions(
  groupId: string,
  projectId: string,
  input: ContributionPlanInput,
  actor: GroupActor,
) {
  actorCheck(actor);
  const periods = planPeriods(input);
  const initial = await getDoc(groupRef(groupId));
  if (!initial.exists()) throw new Error("Le groupe n’existe plus.");
  const initialProject = projectOf(initial.data(), projectId);
  if (
    !initialProject.participantIds.length ||
    initialProject.participantIds.length > 400
  )
    throw new Error("Sélectionnez entre 1 et 400 participants pour ce cycle.");
  const refs = await Promise.all(initialProject.participantIds.map(memberRef));
  await runTransaction(db, async (tx) => {
    const group = await tx.get(groupRef(groupId));
    if (!group.exists()) throw new Error("Le groupe n’existe plus.");
    const project = projectOf(group.data(), projectId);
    if (!isOpenProject(project) || project.contributionPlan?.locked)
      throw new Error(
        "Ce cycle a déjà des opérations ou est terminé. Conservez-le et créez un nouveau projet pour un autre cycle.",
      );
    if (
      project.participantIds.length !== initialProject.participantIds.length ||
      !project.participantIds.every((id) =>
        initialProject.participantIds.includes(id),
      )
    )
      throw new Error("Les participants ont changé. Actualisez le projet.");
    const members = await Promise.all(refs.map((ref) => tx.get(ref)));
    if (
      members.some(
        (m) => !m.exists() || !(m.data()!.groupIds ?? []).includes(groupId),
      )
    )
      throw new Error("Chaque participant doit encore appartenir au groupe.");
    const participants = members.map((m) => ({
      id: m.id,
      name: memberName({ ...m.data(), id: m.id } as User),
    }));
    if (new Set(participants.map((p) => p.id)).size !== participants.length)
      throw new Error("Un participant est présent sous plusieurs références.");
    payoutAmounts(input.amount * participants.length, project.payoutFee);
    const plan: ContributionPlan = {
      ...input,
      periods,
      participants,
      locked: false,
    };
    tx.update(group.ref, {
      projects: group
        .data()
        .projects.map((p: GroupProject) =>
          p.id === projectId ? { ...p, contributionPlan: plan } : p,
        ),
      activity: [
        ...(group.data().activity ?? []),
        event(
          `Cycle de cotisations configuré pour « ${project.name} » : ${periods.length} ${CONTRIBUTION_FREQUENCIES[contributionFrequency(input)].plural}, une prise par ${CONTRIBUTION_FREQUENCIES[contributionFrequency(input)].unit}, et ${participants.length} participants.`,
          actor,
        ),
      ],
      updatedAt: serverTimestamp(),
      updatedBy: actor.id,
    });
  });
}
export async function listContributions(
  groupId: string,
  projectId: string,
): Promise<GroupContribution[]> {
  const snap = await getDocs(
    query(
      collection(db, "groups", idCheck(groupId), "contributions"),
      where("projectId", "==", projectId),
    ),
  );
  return snap.docs.map((d) => ({ ...d.data(), id: d.id }) as GroupContribution);
}
async function readRow(
  tx: Transaction,
  groupId: string,
  projectId: string,
  period: string,
  memberId: string,
) {
  const group = await tx.get(groupRef(groupId));
  if (!group.exists()) throw new Error("Le groupe n’existe plus.");
  const project = projectOf(group.data(), projectId);
  const planned = plannedContribution(project, period, memberId);
  const snapshot = await tx.get(rowRef(groupId, planned.id));
  const row = snapshot.exists()
    ? ({ ...snapshot.data(), id: snapshot.id } as GroupContribution)
    : planned;
  if (
    row.memberId !== memberId ||
    row.projectId !== projectId ||
    row.period !== period
  )
    throw new Error("La référence de cotisation a changé.");
  return { group, project, snapshot, row };
}
async function activeReservation(tx: Transaction, row: GroupContribution) {
  if (row.financingContractId) return true;
  if (!row.financingDemandId) return false;
  const demand = await tx.get(doc(db, "creditDemands", row.financingDemandId));
  return (
    demand.exists() && !["REJECTED", "CANCELED"].includes(demand.data().status)
  );
}
export async function recordContributionPayment(
  groupId: string,
  projectId: string,
  period: string,
  memberId: string,
  input: {
    id: string;
    amount: number;
    date: string;
    source: Exclude<ContributionPayment["source"], "CREDIT_FIXE">;
    reference?: string;
    note?: string;
  },
  actor: GroupActor,
) {
  actorCheck(actor);
  if (
    !Number.isSafeInteger(input.amount) ||
    input.amount <= 0 ||
    !validPaymentDate(input.date) ||
    !["CASH", "AIRTEL_MONEY", "MOBICASH", "BANK_TRANSFER"].includes(
      input.source,
    )
  )
    throw new Error(
      "Vérifiez le montant, la date réelle du versement et le moyen de paiement.",
    );
  idCheck(input.id);
  if ((input.reference?.length ?? 0) > 120 || (input.note?.length ?? 0) > 500)
    throw new Error("La référence ou la note est trop longue.");
  await runTransaction(db, async (tx) => {
    const { group, project, snapshot, row } = await readRow(
      tx,
      groupId,
      projectId,
      period,
      memberId,
    );
    const previous = row.payments.find((p) => p.id === input.id);
    if (previous) {
      if (
        previous.amount !== input.amount ||
        previous.date !== input.date ||
        previous.source !== input.source ||
        (previous.reference || "") !== (input.reference?.trim() || "") ||
        (previous.note || "") !== (input.note?.trim() || "")
      )
        throw new Error(
          "Cette référence de versement existe déjà avec un autre contenu.",
        );
      return;
    }
    if (project.status === "CANCELLED")
      throw new Error("Ce projet est annulé.");
    if (await activeReservation(tx, row))
      throw new Error(
        "Une prise en charge est en cours. Détachez d’abord la demande ou le contrat non affecté pour enregistrer un versement direct.",
      );
    if (input.amount > remainingContribution(row))
      throw new Error("Le versement dépasse le solde de cette cotisation.");
    const payment: ContributionPayment = {
      ...input,
      reference: input.reference?.trim() || "",
      note: input.note?.trim() || "",
      byId: actor.id,
      byName: actor.name,
      at: Timestamp.now(),
    };
    tx.set(snapshot.ref, {
      ...row,
      projectName: project.name,
      payments: [...row.payments, payment],
      updatedAt: serverTimestamp(),
      updatedBy: actor.id,
    });
    saveGroupEvent(
      tx,
      group,
      projectId,
      `Versement enregistré pour la cotisation de ${period} du projet « ${project.name} ».`,
      actor,
    );
  });
}

/** Additional reads/validation inside the existing individual creation transaction.
 * A request or an unsigned contract only reserves the month; it never pays it. */
export async function prepareContributionFinancing(
  tx: Transaction,
  group: DocumentSnapshot,
  project: GroupProject,
  input: DocumentData,
  kind: "creditDemands" | "creditContracts",
  targetId: string,
) {
  const link = input.groupProject as GroupCreditProjectLink;
  if (!link.contributionId) return null;
  if (input.creditType !== "FIXE" || !link.contributionPeriod)
    throw new Error(
      "La cotisation doit être financée par un crédit fixe lié à sa période.",
    );
  const borrower = await tx.get(doc(db, "users", idCheck(input.clientId)));
  if (!borrower.exists()) throw new Error("Le membre n’existe plus.");
  const planned = plannedContribution(
    project,
    link.contributionPeriod,
    borrower.id,
  );
  if (planned.id !== link.contributionId)
    throw new Error("La cotisation ne correspond pas à cet emprunteur.");
  const snapshot = await tx.get(rowRef(group.id, planned.id));
  const row = snapshot.exists()
    ? ({ ...snapshot.data(), id: snapshot.id } as GroupContribution)
    : planned;
  if (
    input.amount !== remainingContribution(row) ||
    remainingContribution(row) <= 0
  )
    throw new Error(
      "Le solde de la cotisation a changé. Actualisez son suivi avant de créer le dossier.",
    );
  if (!input.guarantorId || (!input.guarantorIsMember && input.guarantorId !== UNKNOWN_USER_ID))
    throw new Error(
      "Choisissez un membre Kara ou INCONNU comme garant de cette prise en charge.",
    );
  const guarantor = await tx.get(doc(db, "users", idCheck(input.guarantorId)));
  if (
    !guarantor.exists() ||
    !isGroupGuarantor({ ...guarantor.data(), id: guarantor.id } as User) ||
    guarantor.id === borrower.id ||
    (guarantor.data().matricule &&
      guarantor.data().matricule === borrower.data().matricule)
  )
    throw new Error("Le garant doit être un autre membre Kara identifié ou le compte INCONNU de LE KARA.");
  if (kind === "creditDemands") {
    if (await activeReservation(tx, row))
      throw new Error(
        "Une demande de prise en charge existe déjà pour cette cotisation.",
      );
  } else if (
    row.financingDemandId !== input.demandId ||
    row.financingContractId
  )
    throw new Error(
      "La demande de cette cotisation a changé ou possède déjà un contrat.",
    );
  return {
    snapshot,
    row,
    projects: lockProjects(group.data()!, project.id),
    patch:
      kind === "creditDemands"
        ? { financingDemandId: targetId, financingContractId: null }
        : { financingContractId: targetId },
  };
}
export function writeContributionReservation(
  tx: Transaction,
  prepared: Awaited<ReturnType<typeof prepareContributionFinancing>>,
  actorId: string,
) {
  if (prepared)
    tx.set(prepared.snapshot.ref, {
      ...prepared.row,
      ...prepared.patch,
      updatedBy: actorId,
      updatedAt: serverTimestamp(),
    });
}
export async function releaseContributionFinancing(
  tx: Transaction,
  groupId: string,
  link: GroupCreditProjectLink | null | undefined,
  recordId: string,
) {
  if (!link?.contributionId) return null;
  const snapshot = await tx.get(rowRef(groupId, link.contributionId));
  if (!snapshot.exists()) return null;
  const row = snapshot.data() as GroupContribution;
  if (
    row.financingDemandId !== recordId &&
    row.financingContractId !== recordId
  )
    throw new Error("Le financement de cette cotisation a changé.");
  if ((row.payments ?? []).some((p) => p.source === "CREDIT_FIXE"))
    throw new Error(
      "Ce contrat a déjà réglé une cotisation. Son rattachement doit être conservé dans le suivi.",
    );
  return snapshot.ref;
}
export async function allocateContributionFinancing(
  groupId: string,
  projectId: string,
  period: string,
  memberId: string,
  input: { date: string; note?: string },
  actor: GroupActor,
) {
  actorCheck(actor);
  if (!validPaymentDate(input.date) || (input.note?.length ?? 0) > 500)
    throw new Error(
      "Vérifiez la date effective de prise en charge et la note.",
    );
  await runTransaction(db, async (tx) => {
    const { group, project, snapshot, row } = await readRow(
      tx,
      groupId,
      projectId,
      period,
      memberId,
    );
    const previous = (row.payments ?? []).find(
      (p) => p.source === "CREDIT_FIXE",
    );
    if (previous) {
      if (
        previous.date !== input.date ||
        (previous.note || "") !== (input.note?.trim() || "")
      )
        throw new Error(
          "Cette prise en charge est déjà confirmée avec une autre date ou note. Son enregistrement est conservé.",
        );
      return;
    }
    if (!row.financingContractId)
      throw new Error(
        "Créez et faites signer le contrat avant de confirmer la prise en charge.",
      );
    const contract = await tx.get(
      doc(db, "creditContracts", row.financingContractId),
    );
    const borrower = await tx.get(doc(db, "users", memberId));
    const c = contract.data();
    if (
      !contract.exists() ||
      !borrower.exists() ||
      c!.creditType !== "FIXE" ||
      ![memberId, borrower.data().matricule].includes(c!.clientId) ||
      c!.groupProject?.groupId !== groupId ||
      c!.groupProject?.projectId !== projectId ||
      c!.groupProject?.contributionId !== row.id ||
      !["ACTIVE", "PARTIAL", "OVERDUE"].includes(c!.status) ||
      !c!.signedContractUrl
    )
      throw new Error(
        "La prise en charge nécessite le contrat fixe signé et actif de ce membre, lié à cette cotisation.",
      );
    const remaining = remainingContribution(row);
    if (!remaining || c!.amount !== remaining)
      throw new Error(
        "Le capital du contrat ne correspond plus au solde de la cotisation.",
      );
    const payment: ContributionPayment = {
      id: `support-${contract.id}`,
      amount: remaining,
      date: input.date,
      source: "CREDIT_FIXE",
      contractId: contract.id,
      note: input.note?.trim() || "",
      byId: actor.id,
      byName: actor.name,
      at: Timestamp.now(),
    };
    tx.set(snapshot.ref, {
      ...row,
      projectName: project.name,
      payments: [...row.payments, payment],
      updatedAt: serverTimestamp(),
      updatedBy: actor.id,
    });
    saveGroupEvent(
      tx,
      group,
      projectId,
      `Prise en charge confirmée pour la cotisation de ${period} du projet « ${project.name} ».`,
      actor,
    );
  });
}
