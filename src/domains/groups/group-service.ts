import {
  arrayRemove,
  arrayUnion,
  collection,
  doc,
  getCountFromServer,
  getDoc,
  getDocs,
  query,
  runTransaction,
  serverTimestamp,
  Timestamp,
  where,
} from "firebase/firestore";
import { db } from "@/firebase/firestore";
import { firebaseCollectionNames } from "@/constantes/firebase-collection-names";
import type { GroupProject, User } from "@/types/types";
import { mapWithConcurrency } from "@/utils/mapWithConcurrency";
import {
  memberName,
  isOpenProject,
  validateGroup,
  validateProject,
  type GroupProjectDraft,
} from "./group-model";
import { sameParticipants, supportsPayoutOrder } from "./payout-order";
import { isGroupGuarantor } from "./group-guarantor";

export interface GroupActor {
  id: string;
  name: string;
}
const groups = () => collection(db, firebaseCollectionNames.groups);
const users = () => collection(db, firebaseCollectionNames.users);
const event = (description: string, actor: GroupActor) => ({
  id: crypto.randomUUID(),
  description,
  at: Timestamp.now(),
  byId: actor.id,
  byName: actor.name,
});
const assertActor = (actor: GroupActor) => {
  if (!actor.id) throw new Error("Connectez-vous pour modifier un groupe.");
};
const isMember = (data: Record<string, unknown>) =>
  Array.isArray(data.roles) &&
  data.roles.some((role) =>
    ["Adherant", "Bienfaiteur", "Sympathisant"].includes(String(role)),
  );

function projectPayload(
  draft: GroupProjectDraft,
  actor: GroupActor,
  names: Record<string, string>,
) {
  return {
    kind: draft.kind,
    status: draft.status,
    name: draft.name.trim(),
    description: draft.description.trim(),
    estimatedBudget: draft.estimatedBudget ?? null,
    targetDate: draft.targetDate || null,
    participantIds: [...new Set(draft.participantIds)],
    participantNames: Object.fromEntries(
      draft.participantIds.map((id) => [id, names[id] ?? id]),
    ),
    updatedAt: Timestamp.now(),
    updatedBy: actor.id,
  };
}

export async function createCollectiveGroup(
  input: {
    name: string;
    description: string;
    label?: string;
    memberIds: string[];
    coordinatorId?: string;
    guarantorId?: string;
    project?: GroupProjectDraft;
  },
  actor: GroupActor,
): Promise<string> {
  assertActor(actor);
  validateGroup(input);
  const ref = doc(groups());
  const memberIds = [...new Set(input.memberIds)];
  await runTransaction(db, async (transaction) => {
    const guarantor = await transaction.get(doc(users(), input.guarantorId!));
    if (
      !guarantor.exists() ||
      !isGroupGuarantor({ ...guarantor.data(), id: guarantor.id } as User)
    )
      throw new Error(
        "Le garant du groupe doit être un membre Kara identifié.",
      );
    const members = await Promise.all(
      memberIds.map((id) => transaction.get(doc(users(), id))),
    );
    const names: Record<string, string> = {};
    for (const member of members) {
      if (!member.exists() || !isMember(member.data()))
        throw new Error(
          "Un membre sélectionné n’est plus disponible. Actualisez la sélection.",
        );
      names[member.id] = memberName({
        ...member.data(),
        id: member.id,
      } as User);
    }
    const projects = input.project
      ? [
          {
            ...projectPayload(input.project, actor, names),
            id: crypto.randomUUID(),
            createdAt: Timestamp.now(),
            createdBy: actor.id,
          },
        ]
      : [];
    transaction.set(ref, {
      name: input.name.trim(),
      description: input.description.trim(),
      label: input.label?.trim() || null,
      coordinatorId: input.coordinatorId || null,
      coordinatorName: input.coordinatorId ? names[input.coordinatorId] : null,
      guarantorId: guarantor.id,
      guarantorName: memberName({
        ...guarantor.data(),
        id: guarantor.id,
      } as User),
      projects,
      activity: [
        event(
          `Groupe créé avec ${memberIds.length} membre(s)${input.project ? ` et le projet « ${input.project.name.trim()} »` : ""}.`,
          actor,
        ),
      ],
      createdBy: actor.id,
      updatedBy: actor.id,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    for (const member of members)
      transaction.update(member.ref, {
        groupIds: arrayUnion(ref.id),
        updatedBy: actor.id,
        updatedAt: serverTimestamp(),
      });
  });
  return ref.id;
}

export async function addGroupMembers(
  groupId: string,
  ids: string[],
  actor: GroupActor,
): Promise<number> {
  assertActor(actor);
  const unique = [...new Set(ids)];
  if (!unique.length || unique.length > 400)
    throw new Error("Sélectionnez entre 1 et 400 membres.");
  return runTransaction(db, async (transaction) => {
    const group = await transaction.get(doc(groups(), groupId));
    const members = await Promise.all(
      unique.map((id) => transaction.get(doc(users(), id))),
    );
    if (!group.exists()) throw new Error("Ce groupe n’existe plus.");
    for (const member of members)
      if (!member.exists() || !isMember(member.data()))
        throw new Error("Un membre sélectionné n’est plus disponible.");
    const added = members.filter(
      (member) => !(member.data()!.groupIds ?? []).includes(groupId),
    );
    if (!added.length) return 0;
    for (const member of added)
      transaction.update(member.ref, {
        groupIds: arrayUnion(groupId),
        updatedAt: serverTimestamp(),
        updatedBy: actor.id,
      });
    transaction.update(group.ref, {
      activity: [
        ...(group.data().activity ?? []),
        event(
          `${added.length} membre(s) ajouté(s) : ${added.map((member) => memberName({ ...member.data(), id: member.id } as User)).join(", ")}.`,
          actor,
        ),
      ],
      updatedAt: serverTimestamp(),
      updatedBy: actor.id,
    });
    return added.length;
  });
}

export async function removeGroupMember(
  groupId: string,
  memberId: string,
  actor: GroupActor,
): Promise<void> {
  assertActor(actor);
  await runTransaction(db, async (transaction) => {
    const group = await transaction.get(doc(groups(), groupId));
    const member = await transaction.get(doc(users(), memberId));
    if (!group.exists() || !member.exists())
      throw new Error("Le groupe ou le membre n’est plus disponible.");
    const data = group.data();
    const projects = (data.projects ?? []).map((project: GroupProject) =>
      isOpenProject(project)
        ? {
            ...project,
            participantIds: project.participantIds.filter(
              (id) => id !== memberId,
            ),
            ...(project.participantIds.includes(memberId)
              ? { payoutOrderDrawId: null }
              : {}),
            participantNames: Object.fromEntries(
              Object.entries(project.participantNames ?? {}).filter(
                ([id]) => id !== memberId,
              ),
            ),
          }
        : project,
    );
    transaction.update(member.ref, {
      groupIds: arrayRemove(groupId),
      updatedAt: serverTimestamp(),
      updatedBy: actor.id,
    });
    transaction.update(group.ref, {
      projects,
      ...(data.coordinatorId === memberId
        ? { coordinatorId: null, coordinatorName: null }
        : {}),
      activity: [
        ...(data.activity ?? []),
        event(
          `${memberName({ ...member.data(), id: member.id } as User)} retiré(e) du groupe et des projets en cours.`,
          actor,
        ),
      ],
      updatedAt: serverTimestamp(),
      updatedBy: actor.id,
    });
  });
}

export async function saveGroupProject(
  groupId: string,
  draft: GroupProjectDraft,
  actor: GroupActor,
  projectId?: string,
): Promise<void> {
  assertActor(actor);
  validateProject(draft);
  await runTransaction(db, async (transaction) => {
    const group = await transaction.get(doc(groups(), groupId));
    const members = await Promise.all(
      [...new Set(draft.participantIds)].map((id) =>
        transaction.get(doc(users(), id)),
      ),
    );
    if (!group.exists()) throw new Error("Ce groupe n’existe plus.");
    const projects = group.data().projects ?? [];
    const previous = projects.find(
      (project: GroupProject) => project.id === projectId,
    );
    if (projectId && !previous) throw new Error("Ce projet n’existe plus.");
    if (previous?.contributionPlan && previous.kind !== draft.kind) throw new Error("Conservez le type de ce projet pour préserver son cycle de cotisations.");
    const names: Record<string, string> = {
      ...(previous?.participantNames ?? {}),
    };
    for (const member of members) {
      const historic =
        previous &&
        !isOpenProject(draft) &&
        previous.participantIds.includes(member.id);
      if (
        !historic &&
        (!member.exists() || !(member.data().groupIds ?? []).includes(groupId))
      )
        throw new Error(
          "Les participants doivent être membres du groupe. Retirez les anciens membres avant de relancer ce projet.",
        );
      if (member.exists())
        names[member.id] = memberName({
          ...member.data(),
          id: member.id,
        } as User);
    }
    const project = {
      ...previous,
      ...projectPayload(draft, actor, names),
      ...(previous &&
      (previous.kind !== draft.kind ||
        !sameParticipants(previous.participantIds, [
          ...new Set(draft.participantIds),
        ]))
        ? { payoutOrderDrawId: null }
        : {}),
      id: projectId ?? crypto.randomUUID(),
      createdAt: previous?.createdAt ?? Timestamp.now(),
      createdBy: previous?.createdBy ?? actor.id,
    };
    transaction.update(group.ref, {
      projects: previous
        ? projects.map((item: GroupProject) =>
            item.id === projectId ? project : item,
          )
        : [...projects, project],
      activity: [
        ...(group.data().activity ?? []),
        event(
          `Projet « ${draft.name.trim()} » ${previous ? "mis à jour" : "créé"}.`,
          actor,
        ),
      ],
      updatedAt: serverTimestamp(),
      updatedBy: actor.id,
    });
  });
}

export async function saveGroupPayoutOrder(
  groupId: string,
  projectId: string,
  participantIds: string[],
  expectedDrawId: string | null,
  actor: GroupActor,
): Promise<void> {
  assertActor(actor);
  await runTransaction(db, async (transaction) => {
    const group = await transaction.get(doc(groups(), groupId));
    if (!group.exists()) throw new Error("Ce groupe n’existe plus.");
    const data = group.data();
    const projects: GroupProject[] = data.projects ?? [];
    const project = projects.find((item) => item.id === projectId);
    if (!project) throw new Error("Ce projet n’existe plus.");
    if (!supportsPayoutOrder(project.kind) || !isOpenProject(project))
      throw new Error(
        "Le tirage est disponible pour les caisses collectives et autres projets en préparation ou en cours.",
      );
    if (
      participantIds.length < 2 ||
      !sameParticipants(participantIds, project.participantIds)
    )
      throw new Error(
        "Les participants ont changé. Actualisez le projet et refaites le tirage.",
      );
    if ((project.payoutOrderDrawId ?? null) !== expectedDrawId)
      throw new Error(
        "Un autre ordre a été enregistré entre-temps. Actualisez le projet avant de recommencer.",
      );
    const draw = {
      id: crypto.randomUUID(),
      participantIds: [...participantIds],
      participantNames: Object.fromEntries(
        participantIds.map((id) => [id, project.participantNames[id] || id]),
      ),
      drawnAt: Timestamp.now(),
      drawnBy: actor.id,
      drawnByName: actor.name,
    };
    transaction.update(group.ref, {
      projects: projects.map((item) =>
        item.id === projectId
          ? {
              ...item,
              payoutDraws: [...(item.payoutDraws ?? []), draw],
              payoutOrderDrawId: draw.id,
              updatedAt: Timestamp.now(),
              updatedBy: actor.id,
            }
          : item,
      ),
      activity: [
        ...(data.activity ?? []),
        event(
          `Ordre de récupération ${project.payoutDraws?.length ? "renouvelé" : "tiré au sort"} pour « ${project.name} » : ${participantIds.map((id, index) => `${index + 1}. ${draw.participantNames[id]}`).join(" ; ")}.`,
          actor,
        ),
      ],
      updatedAt: serverTimestamp(),
      updatedBy: actor.id,
    });
  });
}

export async function updateCollectiveGroup(
  groupId: string,
  changes: {
    name: string;
    description: string;
    label?: string;
    coordinatorId?: string;
    guarantorId?: string;
  },
  actor: GroupActor,
): Promise<void> {
  assertActor(actor);
  if (!changes.name.trim()) throw new Error("Donnez un nom au groupe.");
  await runTransaction(db, async (transaction) => {
    const group = await transaction.get(doc(groups(), groupId));
    const coordinator = changes.coordinatorId
      ? await transaction.get(doc(users(), changes.coordinatorId))
      : null;
    if (!group.exists()) throw new Error("Ce groupe n’existe plus.");
    const guarantorId = changes.guarantorId ?? group.data().guarantorId;
    if (!guarantorId)
      throw new Error("Choisissez un membre Kara comme garant du groupe.");
    const guarantor = await transaction.get(doc(users(), guarantorId));
    if (
      !guarantor.exists() ||
      !isGroupGuarantor({ ...guarantor.data(), id: guarantor.id } as User)
    )
      throw new Error(
        "Le garant du groupe doit être un membre Kara identifié.",
      );
    if (
      coordinator &&
      (!coordinator.exists() ||
        !(coordinator.data().groupIds ?? []).includes(groupId))
    )
      throw new Error("Le référent doit être membre du groupe.");
    transaction.update(group.ref, {
      name: changes.name.trim(),
      description: changes.description.trim(),
      label: changes.label?.trim() || null,
      coordinatorId: changes.coordinatorId || null,
      guarantorId: guarantor.id,
      guarantorName: memberName({
        ...guarantor.data(),
        id: guarantor.id,
      } as User),
      coordinatorName: coordinator
        ? memberName({ ...coordinator.data(), id: coordinator.id } as User)
        : null,
      activity: [
        ...(group.data().activity ?? []),
        event("Informations du groupe mises à jour.", actor),
      ],
      updatedAt: serverTimestamp(),
      updatedBy: actor.id,
    });
  });
}

export async function getGroupMemberCounts(
  ids: string[],
): Promise<Record<string, number>> {
  return Object.fromEntries(
    await mapWithConcurrency(
      ids,
      6,
      async (id) =>
        [
          id,
          (
            await getCountFromServer(
              query(users(), where("groupIds", "array-contains", id)),
            )
          ).data().count,
        ] as const,
    ),
  );
}

/** Annuaire léger : une lecture par membre, sans charger ses contrats ou abonnements. */
export async function listGroupCandidates(): Promise<User[]> {
  const snapshot = await getDocs(
    query(
      users(),
      where("roles", "array-contains-any", [
        "Adherant",
        "Bienfaiteur",
        "Sympathisant",
      ]),
    ),
  );
  return snapshot.docs
    .map((item) => ({ ...item.data(), id: item.id }) as User)
    .sort((left, right) =>
      memberName(left).localeCompare(memberName(right), "fr"),
    );
}

export async function deleteEmptyGroup(groupId: string): Promise<void> {
  // Les projets et contrats sont conservés : la suppression n'est proposée que pour un groupe vide.
  const initial = await getDoc(doc(groups(), groupId));
  if (!initial.exists()) return;
  const members = await getDocs(
    query(users(), where("groupIds", "array-contains", groupId)),
  );
  if (!members.empty)
    throw new Error("Retirez les membres avant de supprimer le groupe.");
  await runTransaction(db, async (transaction) => {
    const group = await transaction.get(doc(groups(), groupId));
    if (!group.exists()) return;
    const data = group.data();
    if (
      JSON.stringify(data.updatedAt ?? null) !==
      JSON.stringify(initial.data().updatedAt ?? null)
    )
      throw new Error(
        "Le groupe vient d’être modifié. Actualisez avant de réessayer.",
      );
    if (data.projects?.length || data.caisseContractIds?.length)
      throw new Error(
        "Ce groupe possède des projets ou des contrats. Conservez-le pour préserver son historique.",
      );
    transaction.delete(group.ref);
  });
}
