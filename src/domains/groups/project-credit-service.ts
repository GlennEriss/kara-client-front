import {
  collection,
  doc,
  documentId,
  getDoc,
  getDocs,
  query,
  runTransaction,
  serverTimestamp,
  Timestamp,
  where,
  type DocumentData,
  type Transaction,
} from "firebase/firestore";
import { db } from "@/firebase/firestore";
import type {
  CreditContract,
  CreditDemand,
  GroupCreditProjectLink,
  GroupProject,
} from "@/types/types";
import type { FinancialReportSources } from "@/domains/financial/reports/entities/financial-report-sources.types";
import { mapWithConcurrency } from "@/utils/mapWithConcurrency";
import {
  isOpenCreditProject,
  isProjectCreditType,
  PROJECT_CREDIT_TYPES,
  PROJECT_CREDIT_LABELS,
  type ProjectCreditType,
  projectCreditAmounts,
  sameProject,
} from "./project-credit-model";
import type { GroupActor } from "./group-service";
import { isGroupGuarantor, isIdentifiedGroupMember, isKaraGroupGuarantor } from "./group-guarantor";
import { UNKNOWN_USER_ID } from "@/domains/financial/caisse-imprevue/import/unknownUser";
import { memberName } from "./group-model";
import {
  validateCollectiveCredit,
  type CollectiveCreditShare,
} from "./collective-credit-model";
import type { User } from "@/types/types";
import {
  prepareContributionFinancing,
  writeContributionReservation,
  releaseContributionFinancing,
} from "./contribution-service";

const validId = (id: string) =>
  typeof id === "string" &&
  !!id &&
  !id.includes("/") &&
  id !== "." &&
  id !== "..";
const ref = (name: string, id: string) => {
  if (!validId(id)) throw new Error("Identifiant invalide.");
  return doc(db, name, id);
};
const activity = (description: string, actor: GroupActor) => ({
  id: crypto.randomUUID(),
  description,
  at: Timestamp.now(),
  byId: actor.id,
  byName: actor.name,
});
const assertActor = (actor: GroupActor) => {
  if (!actor.id)
    throw new Error("Connectez-vous pour modifier le financement.");
};
function dates(value: unknown): any {
  if (value instanceof Timestamp) return value.toDate();
  if (value instanceof Date) return value;
  if (Array.isArray(value)) return value.map(dates);
  return value && typeof value === "object"
    ? Object.fromEntries(Object.entries(value).map(([k, v]) => [k, dates(v)]))
    : value;
}
const data = (snapshot: {
  id: string;
  data: () => DocumentData | undefined;
}) => ({ ...dates(snapshot.data() ?? {}), id: snapshot.id });

async function borrowerRef(clientId: string) {
  const direct = await getDoc(ref("users", clientId));
  if (direct.exists()) return direct.ref;
  const aliases = await getDocs(
    query(collection(db, "users"), where("matricule", "==", clientId)),
  );
  if (aliases.size !== 1)
    throw new Error("Le membre emprunteur est introuvable ou ambigu.");
  return aliases.docs[0].ref;
}

async function checkedLink(
  transaction: Transaction,
  link: GroupCreditProjectLink,
  clientId: string,
  userRef: ReturnType<typeof ref>,
  actor: GroupActor,
) {
  const groupRef = ref("groups", link.groupId);
  const [group, user] = await Promise.all([
    transaction.get(groupRef),
    transaction.get(userRef),
  ]);
  if (!group.exists() || !user.exists())
    throw new Error("Le groupe ou le membre n’existe plus.");
  const groupData = group.data();
  const project = (groupData.projects ?? []).find(
    (p: GroupProject) => p.id === link.projectId,
  ) as GroupProject | undefined;
  if (!project || !isOpenCreditProject(project))
    throw new Error("Le projet doit être en préparation ou en cours.");
  if (
    (user.id !== clientId && user.data().matricule !== clientId) ||
    !(user.data().groupIds ?? []).includes(link.groupId) ||
    !(link.contributionId
      ? project.contributionPlan?.participants.some(
          (participant) =>
            participant.id === user.id || participant.id === clientId,
        )
      : project.participantIds.some((id) => id === user.id || id === clientId))
  )
    throw new Error(
      "L’emprunteur doit être membre du groupe et participant à ce projet.",
    );
  return {
    group,
    project,
    link: {
      groupId: group.id,
      projectId: project.id,
      ...(link.collectiveRequestId
        ? { collectiveRequestId: link.collectiveRequestId }
        : {}),
      groupName: String(groupData.name || groupData.label || "Groupe"),
      projectName: project.name,
      ...(link.contributionId
        ? {
            contributionId: link.contributionId,
            contributionPeriod: link.contributionPeriod,
          }
        : {}),
      linkedAt: Timestamp.now(),
      linkedBy: actor.id,
      linkedByName: actor.name,
    },
  };
}

/** Used by the existing repositories only for project-backed records. Creation
 * and membership checks share a transaction; a contract reserves its demand. */
export async function createLinkedCreditRecord(
  kind: "creditDemands" | "creditContracts",
  id: string,
  input: DocumentData,
): Promise<void> {
  const previousActor = input.groupProject?.linkedBy;
  const actor = {
    id: String(input.createdBy || ""),
    name: String(
      (!previousActor || previousActor === input.createdBy
        ? input.groupProject?.linkedByName
        : undefined) ||
        input.createdBy ||
        "Administrateur",
    ),
  };
  assertActor(actor);
  if (!isProjectCreditType(input.creditType))
    throw new Error(
      "Le financement du projet nécessite un crédit fixe ou spécial.",
    );
  const userRef = await borrowerRef(input.clientId);
  await runTransaction(db, async (transaction) => {
    const target = ref(kind, id);
    const existing = await transaction.get(target);
    const demand =
      kind === "creditContracts"
        ? await transaction.get(ref("creditDemands", input.demandId))
        : null;
    const checked = await checkedLink(
      transaction,
      input.groupProject,
      input.clientId,
      userRef,
      actor,
    );
    if (existing.exists())
      throw new Error(
        "Un dossier existe déjà avec cette référence. Actualisez avant de recommencer.",
      );
    if (
      demand &&
      (!demand.exists() ||
        demand.data().status !== "APPROVED" ||
        demand.data().contractId ||
        demand.data().creditType !== input.creditType ||
        demand.data().groupProject?.collectiveRequestId !==
          input.groupProject.collectiveRequestId ||
        demand.data().groupProject?.contributionId !==
          input.groupProject.contributionId ||
        demand.data().clientId !== input.clientId ||
        !sameProject(demand.data().groupProject, input.groupProject))
    )
      throw new Error(
        "La demande a changé ou possède déjà un contrat. Actualisez sa fiche.",
      );
    const contribution = await prepareContributionFinancing(
      transaction,
      checked.group,
      checked.project,
      input,
      kind,
      id,
    );
    writeContributionReservation(transaction, contribution, actor.id);
    transaction.set(target, {
      ...input,
      ...(input.guarantorId === UNKNOWN_USER_ID ? {
        guarantorIsMember: false,
        ...(kind === "creditContracts" ? { guarantorRemunerationPercentage: 0 } : {}),
      } : {}),
      groupProject: checked.link,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    if (demand)
      transaction.update(demand.ref, {
        contractId: id,
        groupProject: checked.link,
        updatedBy: actor.id,
        updatedAt: serverTimestamp(),
      });
    transaction.update(checked.group.ref, {
      ...(contribution ? { projects: contribution.projects } : {}),
      activity: [
        ...(checked.group.data().activity ?? []),
        activity(
          `${kind === "creditDemands" ? "Demande" : "Contrat"} de ${PROJECT_CREDIT_LABELS[input.creditType as ProjectCreditType].toLowerCase()} « ${id} » créé pour le projet « ${checked.project.name} ».`,
          actor,
        ),
      ],
      updatedBy: actor.id,
      updatedAt: serverTimestamp(),
    });
  });
}

export async function linkProjectCredit(
  groupId: string,
  projectId: string,
  contractId: string,
  actor: GroupActor,
  expectedCreditType?: ProjectCreditType,
): Promise<void> {
  assertActor(actor);
  const initial = await getDoc(ref("creditContracts", contractId));
  if (!initial.exists()) throw new Error("Ce contrat n’existe plus.");
  if (expectedCreditType && initial.data().creditType !== expectedCreditType)
    throw new Error(
      "Le type du contrat a changé. Actualisez les contrats du participant.",
    );
  const userRef = await borrowerRef(initial.data().clientId);
  const link = { groupId, projectId };
  await runTransaction(db, async (transaction) => {
    const contract = await transaction.get(ref("creditContracts", contractId));
    if (
      !contract.exists() ||
      !isProjectCreditType(contract.data().creditType) ||
      contract.data().creditType !== initial.data()!.creditType ||
      contract.data().clientId !== initial.data()!.clientId
    )
      throw new Error(
        "Le contrat de crédit fixe ou spécial n’est plus disponible.",
      );
    const demandId = contract.data().demandId;
    const demand = demandId
      ? await transaction.get(ref("creditDemands", demandId))
      : null;
    const checked = await checkedLink(
      transaction,
      link,
      contract.data().clientId,
      userRef,
      actor,
    );
    if (
      contract.data().groupProject &&
      !sameProject(contract.data().groupProject, link)
    )
      throw new Error(
        "Ce contrat est déjà rattaché à un autre projet. Détachez-le d’abord depuis ce projet.",
      );
    if (
      demand?.exists() &&
      demand.data().groupProject &&
      !sameProject(demand.data().groupProject, link)
    )
      throw new Error(
        "La demande de ce contrat est rattachée à un autre projet.",
      );
    if (
      demand?.exists() &&
      (demand.data().clientId !== contract.data().clientId ||
        demand.data().creditType !== contract.data().creditType ||
        (demand.data().contractId && demand.data().contractId !== contractId))
    )
      throw new Error("La demande ne correspond plus à ce contrat.");
    if (sameProject(contract.data().groupProject, link)) return;
    transaction.update(contract.ref, {
      groupProject: checked.link,
      updatedAt: serverTimestamp(),
      updatedBy: actor.id,
    });
    if (demand?.exists())
      transaction.update(demand.ref, {
        groupProject: checked.link,
        updatedAt: serverTimestamp(),
        updatedBy: actor.id,
      });
    transaction.update(checked.group.ref, {
      activity: [
        ...(checked.group.data().activity ?? []),
        activity(
          `Contrat « ${contractId} » rattaché au projet « ${checked.project.name} ».`,
          actor,
        ),
      ],
      updatedAt: serverTimestamp(),
      updatedBy: actor.id,
    });
  });
}

export async function unlinkProjectCredit(
  groupId: string,
  projectId: string,
  contractId: string,
  actor: GroupActor,
): Promise<void> {
  assertActor(actor);
  await runTransaction(db, async (transaction) => {
    const [group, contract] = await Promise.all([
      transaction.get(ref("groups", groupId)),
      transaction.get(ref("creditContracts", contractId)),
    ]);
    if (
      !group.exists() ||
      !contract.exists() ||
      !sameProject(contract.data().groupProject, { groupId, projectId })
    )
      throw new Error("Le rattachement a changé. Actualisez le projet.");
    const demand = contract.data().demandId
      ? await transaction.get(ref("creditDemands", contract.data().demandId))
      : null;
    const contributionRef = await releaseContributionFinancing(
      transaction,
      groupId,
      contract.data().groupProject,
      contractId,
    );
    if (contributionRef)
      transaction.update(contributionRef, {
        financingDemandId: null,
        financingContractId: null,
        updatedBy: actor.id,
        updatedAt: serverTimestamp(),
      });
    transaction.update(contract.ref, {
      groupProject: null,
      updatedAt: serverTimestamp(),
      updatedBy: actor.id,
    });
    if (
      demand?.exists() &&
      sameProject(demand.data().groupProject, { groupId, projectId })
    )
      transaction.update(demand.ref, {
        groupProject: null,
        updatedAt: serverTimestamp(),
        updatedBy: actor.id,
      });
    transaction.update(group.ref, {
      activity: [
        ...(group.data().activity ?? []),
        activity(
          `Contrat « ${contractId} » détaché du projet « ${(group.data().projects ?? []).find((p: GroupProject) => p.id === projectId)?.name || projectId} ». Le crédit reste dû selon son contrat.`,
          actor,
        ),
      ],
      updatedAt: serverTimestamp(),
      updatedBy: actor.id,
    });
  });
}

export async function unlinkProjectDemand(
  groupId: string,
  projectId: string,
  demandId: string,
  actor: GroupActor,
): Promise<void> {
  assertActor(actor);
  await runTransaction(db, async (transaction) => {
    const [group, demand] = await Promise.all([
      transaction.get(ref("groups", groupId)),
      transaction.get(ref("creditDemands", demandId)),
    ]);
    if (
      !group.exists() ||
      !demand.exists() ||
      !sameProject(demand.data().groupProject, { groupId, projectId })
    )
      throw new Error(
        "Le rattachement de la demande a changé. Actualisez le projet.",
      );
    const contract = demand.data().contractId
      ? await transaction.get(ref("creditContracts", demand.data().contractId))
      : null;
    if (
      contract?.exists() &&
      sameProject(contract.data().groupProject, { groupId, projectId })
    )
      throw new Error(
        "Un contrat a été créé pour cette demande. Actualisez puis détachez le contrat.",
      );
    const contributionRef = await releaseContributionFinancing(
      transaction,
      groupId,
      demand.data().groupProject,
      demandId,
    );
    if (contributionRef)
      transaction.update(contributionRef, {
        financingDemandId: null,
        financingContractId: null,
        updatedBy: actor.id,
        updatedAt: serverTimestamp(),
      });
    transaction.update(demand.ref, {
      groupProject: null,
      updatedBy: actor.id,
      updatedAt: serverTimestamp(),
    });
    transaction.update(group.ref, {
      activity: [
        ...(group.data().activity ?? []),
        activity(
          `Demande « ${demandId} » détachée du projet. Son parcours de validation est conservé.`,
          actor,
        ),
      ],
      updatedBy: actor.id,
      updatedAt: serverTimestamp(),
    });
  });
}

export async function listParticipantCredits(
  clientIds: string[],
): Promise<CreditContract[]> {
  const lists = await Promise.all(
    [...new Set(clientIds.filter(Boolean))].map((id) =>
      getDocs(
        query(collection(db, "creditContracts"), where("clientId", "==", id)),
      ),
    ),
  );
  return [
    ...new Map(
      lists.flatMap((list) =>
        list.docs.map((s) => [s.id, data(s) as CreditContract] as const),
      ),
    ).values(),
  ].filter((c) => isProjectCreditType(c.creditType));
}

async function byIds(name: string, field: string, ids: string[]) {
  const chunks: string[][] = [];
  for (let i = 0; i < ids.length; i += 30) chunks.push(ids.slice(i, i + 30));
  const lists = await mapWithConcurrency(chunks, 6, async (chunk) =>
    getDocs(
      query(
        collection(db, name),
        where(field === "__name__" ? documentId() : field, "in", chunk),
      ),
    ),
  );
  return lists.flatMap((list) => list.docs.map(data));
}

export async function loadProjectCredits(
  groupId: string,
  projectId: string,
  creditTypes: readonly ProjectCreditType[] = PROJECT_CREDIT_TYPES,
) {
  const [contractDocs, demandDocs] = await Promise.all(
    ["creditContracts", "creditDemands"].map((name) =>
      getDocs(
        query(
          collection(db, name),
          where("groupProject.groupId", "==", groupId),
        ),
      ),
    ),
  );
  const link = { groupId, projectId };
  const contracts = contractDocs.docs
    .map((s) => data(s) as CreditContract)
    .filter(
      (c) =>
        isProjectCreditType(c.creditType) &&
        creditTypes.includes(c.creditType) &&
        sameProject(c.groupProject, link),
    );
  const ids = contracts.map((c) => c.id);
  const demands = demandDocs.docs
    .map((s) => data(s) as CreditDemand)
    .filter(
      (d) =>
        isProjectCreditType(d.creditType) &&
        creditTypes.includes(d.creditType) &&
        sameProject(d.groupProject, link) &&
        !ids.includes(d.contractId ?? ""),
    );
  const parents = [
    ...new Set(
      contracts
        .map((c) => c.parentContractId)
        .filter((id): id is string => !!id && !ids.includes(id)),
    ),
  ];
  const [parentRecords, children, payments, penalties, guarantors] =
    await Promise.all([
      byIds("creditContracts", "__name__", parents),
      byIds("creditContracts", "parentContractId", ids),
      byIds("creditPayments", "creditId", ids),
      byIds("creditPenalties", "creditId", ids),
      byIds("guarantorPayments", "creditId", ids),
    ]);
  const sources: FinancialReportSources = {
    caisseSpecialeContracts: [],
    caisseSpecialePayments: [],
    caisseSpecialeRefunds: [],
    caisseImprevueContracts: [],
    caisseImprevuePayments: [],
    caisseImprevueSupports: [],
    caisseImprevueRefunds: [],
    creditContracts: [
      ...new Map(
        [...parentRecords, ...children, ...contracts].map((c) => [
          c.id,
          c as CreditContract,
        ]),
      ).values(),
    ],
    creditPayments: payments as FinancialReportSources["creditPayments"],
    creditPenalties: penalties as FinancialReportSources["creditPenalties"],
    guarantorPayments:
      guarantors as FinancialReportSources["guarantorPayments"],
    placements: [],
    placementCommissions: [],
    placementEarlyExits: [],
    membershipRequests: [],
  };
  const now = new Date();
  const index = <T>(items: T[], getKey: (item: T) => string) => {
    const map = new Map<string, T[]>();
    for (const item of items) {
      const key = getKey(item);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(item);
    }
    return map;
  };
  const allContracts = new Map(sources.creditContracts.map((c) => [c.id, c]));
  const childIndex = index(
    sources.creditContracts,
    (c) => c.parentContractId ?? "",
  );
  const paymentIndex = index(sources.creditPayments, (p) => p.creditId);
  const penaltyIndex = index(sources.creditPenalties, (p) => p.creditId);
  const guarantorIndex = index(sources.guarantorPayments, (p) => p.creditId);
  return {
    totals: projectCreditAmounts(sources, ids, now),
    demands,
    contracts: contracts.map((c) => {
      const parent = allContracts.get(c.parentContractId ?? "");
      const scoped = {
        ...sources,
        creditContracts: [
          ...new Map(
            [
              c,
              ...(parent ? [parent] : []),
              ...(childIndex.get(c.id) ?? []),
            ].map((item) => [item.id, item]),
          ).values(),
        ],
        creditPayments: paymentIndex.get(c.id) ?? [],
        creditPenalties: penaltyIndex.get(c.id) ?? [],
        guarantorPayments: guarantorIndex.get(c.id) ?? [],
      };
      return {
        id: c.id,
        creditType: c.creditType as ProjectCreditType,
        clientId: c.clientId,
        clientName:
          `${c.clientFirstName ?? ""} ${c.clientLastName ?? ""}`.trim() ||
          c.clientId,
        status: c.status,
        amount: c.amount,
        ...projectCreditAmounts(scoped, [c.id], now),
      };
    }),
  };
}

export interface CollectiveCreditRequest {
  requestId: string;
  groupId: string;
  projectId: string;
  expectedGuarantorId: string;
  totalAmount: number;
  desiredDate: string;
  cause: string;
  shares: CollectiveCreditShare[];
}

/** One atomic operation creates ordinary pending FIXE demands. The group only
 * stores an idempotency marker and count, never participants' debts or amounts. */
export async function createCollectiveCreditRequest(
  input: CollectiveCreditRequest,
  actor: GroupActor,
): Promise<string[]> {
  assertActor(actor);
  validateCollectiveCredit(input);
  if (!/^[a-zA-Z0-9-]{8,80}$/.test(input.requestId))
    throw new Error("Référence de demande collective invalide.");
  const targetRefs = input.shares.map((share) =>
    ref("creditDemands", `MK_DEMANDE_CF_${share.memberId}_${input.requestId}`),
  );
  const userIds = [
    ...new Set([
      input.expectedGuarantorId,
      ...input.shares.flatMap((s) => [
        s.memberId,
        s.guarantorId || input.expectedGuarantorId,
      ]),
    ]),
  ];
  const userRefs = userIds.map((id) => ref("users", id));
  return runTransaction(db, async (transaction) => {
    const group = await transaction.get(ref("groups", input.groupId));
    const existing = await Promise.all(
      targetRefs.map((target) => transaction.get(target)),
    );
    if (!group.exists()) throw new Error("Le groupe n’existe plus.");
    const groupData = group.data();
    const markers = groupData.collectiveCreditRequests ?? [];
    const marker = markers.find(
      (m: { id: string }) => m.id === input.requestId,
    );
    if (marker) {
      if (
        marker.projectId !== input.projectId ||
        marker.demandCount !== input.shares.length ||
        existing.some(
          (d, i) =>
            !d.exists() ||
            d.data().creditType !== "FIXE" ||
            d.data().clientId !== input.shares[i].memberId ||
            !sameProject(d.data().groupProject, input) ||
            d.data().groupProject.collectiveRequestId !== input.requestId ||
            d.data().amount !== input.shares[i].amount ||
            d.data().desiredDate !== input.desiredDate ||
            d.data().cause !== input.cause.trim() ||
            d.data().guarantorId !==
              (input.shares[i].guarantorId || input.expectedGuarantorId),
        )
      )
        throw new Error(
          "Cette demande collective a déjà été enregistrée avec une autre répartition. Actualisez le projet.",
        );
      return targetRefs.map((target) => target.id);
    }
    if (existing.some((d) => d.exists()))
      throw new Error(
        "Une référence de demande existe déjà. Actualisez le projet.",
      );
    const project = (groupData.projects ?? []).find(
      (p: GroupProject) => p.id === input.projectId,
    ) as GroupProject | undefined;
    if (!project || !isOpenCreditProject(project))
      throw new Error("Le projet doit être en préparation ou en cours.");
    if (
      !groupData.guarantorId ||
      groupData.guarantorId !== input.expectedGuarantorId
    )
      throw new Error(
        "Le garant du groupe a changé ou doit être renseigné. Actualisez le groupe.",
      );
    const users = await Promise.all(
      userRefs.map((user) => transaction.get(user)),
    );
    const byId = new Map(users.map((user) => [user.id, user]));
    const primary = byId.get(input.expectedGuarantorId)!;
    if (
      !primary.exists() ||
      !isGroupGuarantor({ ...primary.data(), id: primary.id } as User)
    )
      throw new Error(
        "Le garant du groupe doit être un membre Kara identifié ou le compte INCONNU de LE KARA.",
      );
    const payloads = input.shares.map((share) => {
      const borrower = byId.get(share.memberId)!;
      const guarantor = byId.get(
        share.guarantorId || input.expectedGuarantorId,
      )!;
      if (
        !borrower.exists() ||
        !(borrower.data().groupIds ?? []).includes(group.id) ||
        !project.participantIds.some(
          (id) => id === borrower.id || id === borrower.data().matricule,
        )
      )
        throw new Error(
          "Un emprunteur n’appartient plus au groupe ou au projet. Actualisez les participants.",
        );
      const member = { ...borrower.data(), id: borrower.id } as User;
      if (
        !isIdentifiedGroupMember(member) ||
        !member.matricule ||
        (member.lastName?.trim().length ?? 0) < 2 ||
        !member.contacts?.length ||
        member.contacts.some((c) => typeof c !== "string" || !c.trim())
      )
        throw new Error(
          `Complétez le matricule, le nom et les contacts de ${memberName(member)} avant de créer les demandes.`,
        );
      if (
        !guarantor.exists() ||
        !isGroupGuarantor({ ...guarantor.data(), id: guarantor.id } as User)
      )
        throw new Error("Chaque garant doit être un membre Kara identifié ou le compte INCONNU de LE KARA.");
      if (
        guarantor.id === borrower.id ||
        (guarantor.data().matricule &&
          guarantor.data().matricule === member.matricule)
      )
        throw new Error(
          `${memberName(member)} ne peut pas être son propre garant. Choisissez un autre garant pour sa part.`,
        );
      return {
        clientId: member.id,
        clientFirstName: member.firstName || "",
        clientLastName: member.lastName,
        clientContacts: member.contacts,
        creditType: "FIXE",
        amount: share.amount,
        desiredDate: input.desiredDate,
        cause: input.cause.trim(),
        status: "PENDING",
        guarantorId: guarantor.id,
        guarantorFirstName: guarantor.data().firstName || "",
        guarantorLastName: guarantor.data().lastName,
        guarantorRelation: "Autre",
        guarantorIsMember: !isKaraGroupGuarantor(guarantor),
        groupProject: {
          groupId: group.id,
          projectId: project.id,
          groupName: String(groupData.name || groupData.label || "Groupe"),
          projectName: project.name,
          collectiveRequestId: input.requestId,
          linkedAt: Timestamp.now(),
          linkedBy: actor.id,
          linkedByName: actor.name,
        },
        createdBy: actor.id,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
    });
    payloads.forEach((payload, i) => transaction.set(targetRefs[i], payload));
    transaction.update(group.ref, {
      collectiveCreditRequests: [
        ...markers,
        {
          id: input.requestId,
          projectId: project.id,
          demandCount: input.shares.length,
        },
      ],
      activity: [
        ...(groupData.activity ?? []),
        activity(
          `${input.shares.length} demande(s) individuelle(s) de crédit fixe créée(s) pour « ${project.name} » (demande collective ${input.requestId}).`,
          actor,
        ),
      ],
      updatedBy: actor.id,
      updatedAt: serverTimestamp(),
    });
    return targetRefs.map((target) => target.id);
  });
}
