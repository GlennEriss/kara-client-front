import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { configurePayoutFee, recordGroupPayout } from "../payout-service";
import { payoutAmounts, payoutId } from "../payout-model";
import {
  createLinkedCreditRecord,
  createCollectiveCreditRequest,
  linkProjectCredit,
  loadProjectCredits,
  listParticipantCredits,
  unlinkProjectCredit,
  unlinkProjectDemand,
} from "../project-credit-service";
import {
  configureContributions,
  recordContributionPayment,
  allocateContributionFinancing,
} from "../contribution-service";
import {
  plannedContribution,
  remainingContribution,
} from "../contribution-model";
import { CreditDemandRepository } from "@/repositories/credit-speciale/CreditDemandRepository";
import { CreditContractRepository } from "@/repositories/credit-speciale/CreditContractRepository";
import type { CreditContract, CreditDemand } from "@/types/types";

const memory = vi.hoisted(() => ({
  records: new Map<string, any>(),
  writes: [] as string[],
  before: null as null | (() => void),
}));
vi.mock("firebase/firestore", async (original) => {
  const sdk = await original<typeof import("firebase/firestore")>();
  const snapshot = (ref: any) => {
    const record = memory.records.get(ref.path);
    return { id: ref.id, ref, exists: () => !!record, data: () => record };
  };
  const write = (ref: any, values: any) => {
    memory.records.set(ref.path, {
      ...memory.records.get(ref.path),
      ...values,
    });
    memory.writes.push(ref.path);
  };
  return {
    ...sdk,
    collection: (_db: unknown, ...parts: string[]) => ({
      path: parts.join("/"),
    }),
    doc: (...args: any[]) => {
      const path =
        args.length >= 3
          ? args.slice(1).join("/")
          : `${args[0].path}/${args[1] || "auto-id"}`;
      return { path, id: path.split("/").at(-1) };
    },
    documentId: () => "__name__",
    query: (ref: any, ...filters: any[]) => ({ ...ref, filters }),
    where: (field: string, operator: string, value: unknown) => ({
      field,
      operator,
      value,
    }),
    getDoc: async (ref: any) => snapshot(ref),
    getDocs: async (query: any) => {
      const docs = [...memory.records]
        .filter(
          ([path, record]) =>
            path.startsWith(`${query.path}/`) &&
            query.filters.every((f: any) => {
              const value =
                f.field === "__name__"
                  ? path.split("/").at(-1)
                  : f.field
                      .split(".")
                      .reduce((v: any, key: string) => v?.[key], record);
              return f.operator === "in"
                ? f.value.includes(value)
                : value === f.value;
            }),
        )
        .map(([path]) => snapshot({ path, id: path.split("/").at(-1) }));
      return { docs, size: docs.length, empty: !docs.length };
    },
    serverTimestamp: () => sdk.Timestamp.now(),
    setDoc: async (ref: any, values: any) => write(ref, values),
    runTransaction: async (_db: unknown, operation: any) => {
      memory.before?.();
      memory.before = null;
      const pending: Array<() => void> = [];
      const result = await operation({
        get: async (ref: any) => {
          if (pending.length) throw new Error("Lecture après écriture");
          return snapshot(ref);
        },
        set: (ref: any, values: any) => pending.push(() => write(ref, values)),
        update: (ref: any, values: any) =>
          pending.push(() => write(ref, values)),
      });
      pending.forEach((apply) => apply());
      return result;
    },
  };
});
vi.mock("@/firebase/firestore", async () => ({
  ...(await import("firebase/firestore")),
  db: {},
}));

const actor = { id: "admin", name: "Administrateur" };
const link = { groupId: "g1", projectId: "p1", linkedByName: actor.name };
const loan = () => memory.records.get("creditContracts/c1");
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-11-09T12:00:00Z"));
  memory.records.clear();
  memory.writes = [];
  memory.before = null;
  memory.records.set("groups/g1", {
    name: "Collectif",
    activity: [],
    projects: [
      {
        id: "p1",
        name: "Matériel",
        status: "PLANNED",
        participantIds: ["alice"],
      },
      {
        id: "p2",
        name: "Caisse collective",
        status: "ACTIVE",
        participantIds: ["alice"],
      },
    ],
  });
  memory.records.set("users/alice", { matricule: "M001", groupIds: ["g1"] });
  memory.records.set("creditDemands/d1", {
    clientId: "alice",
    creditType: "SPECIALE",
    status: "APPROVED",
    contractId: "c1",
  });
  memory.records.set("creditContracts/c1", {
    id: "c1",
    demandId: "d1",
    clientId: "alice",
    clientFirstName: "Alice",
    clientLastName: "Ondo",
    creditType: "SPECIALE",
    status: "ACTIVE",
    amount: 100000,
    initialAmount: 100000,
    totalAmount: 140000,
    amountPaid: 20000,
    amountRemaining: 90000,
    interestRate: 10,
    monthlyPaymentAmount: 30000,
    duration: 4,
    createdAt: new Date("2026-10-01T12:00:00Z"),
    disbursementDate: new Date("2026-10-01T12:00:00Z"),
    firstPaymentDate: new Date("2026-11-05T12:00:00Z"),
    restMonths: [],
  });
  memory.records.set("creditPayments/M1_c1", {
    id: "M1_c1",
    creditId: "c1",
    amount: 20000,
    monthNumber: 1,
    cycleNumber: 1,
    paymentDate: new Date("2026-11-05T12:00:00Z"),
  });
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("rattachement des crédits aux projets", () => {
  it("consolide un projet mixte avec le moteur propre à chaque crédit, sans modifier les contrats", async () => {
    await linkProjectCredit("g1", "p1", "c1", actor);
    const specialBefore = { ...loan() };
    memory.records.set("creditContracts/fixed", {
      ...loan(),
      id: "fixed",
      demandId: "fixed-demand",
      creditType: "FIXE",
      totalAmount: 110000,
      amountPaid: 55000,
      amountRemaining: 55000,
      groupProject: null,
    });
    memory.records.set("creditDemands/fixed-demand", {
      clientId: "alice",
      creditType: "FIXE",
      contractId: "fixed",
    });
    memory.records.set("creditPayments/fixed-payment", {
      ...memory.records.get("creditPayments/M1_c1"),
      id: "fixed-payment",
      creditId: "fixed",
      amount: 55000,
    });
    await linkProjectCredit("g1", "p1", "fixed", actor);
    expect(
      memory.records.get("creditDemands/fixed-demand").groupProject.projectId,
    ).toBe("p1");
    const result = await loadProjectCredits("g1", "p1");
    expect(result.contracts.map((c) => c.creditType)).toEqual([
      "SPECIALE",
      "FIXE",
    ]);
    expect(result.totals).toMatchObject({
      financed: 200000,
      repayments: 75000,
      outstanding: 145000,
      interestCollected: 15000,
    });
    expect(result.contracts.find((c) => c.id === "fixed")).toMatchObject({
      financed: 100000,
      repayments: 55000,
      outstanding: 55000,
      interestCollected: 5000,
    });
    const fixedOnly = await loadProjectCredits("g1", "p1", ["FIXE"]);
    expect(fixedOnly.contracts.map((c) => c.id)).toEqual(["fixed"]);
    expect(fixedOnly.totals).toMatchObject({
      financed: 100000,
      repayments: 55000,
      outstanding: 55000,
      interestCollected: 5000,
    });
    expect(loan()).toEqual(specialBefore);
    const candidates = await listParticipantCredits(["alice", "M001"]);
    expect(candidates.map((c) => c.creditType)).toEqual(["SPECIALE", "FIXE"]);
    await unlinkProjectCredit("g1", "p1", "fixed", actor);
    expect(memory.records.get("creditContracts/fixed")).toMatchObject({
      creditType: "FIXE",
      groupProject: null,
      amountRemaining: 55000,
    });
  });
  it("refuse une demande d’un autre type à la création ou au rattachement et refuse le crédit aide", async () => {
    memory.records.set("creditDemands/d1", {
      clientId: "alice",
      creditType: "FIXE",
      status: "APPROVED",
      groupProject: link,
    });
    await expect(
      createLinkedCreditRecord("creditContracts", "mixed-type", {
        ...loan(),
        createdBy: "admin",
        groupProject: link,
      }),
    ).rejects.toThrow("La demande a changé");
    await expect(linkProjectCredit("g1", "p1", "c1", actor)).rejects.toThrow(
      "ne correspond plus",
    );
    await expect(
      createLinkedCreditRecord("creditDemands", "aid-demand", {
        ...loan(),
        creditType: "AIDE",
        createdBy: "admin",
        groupProject: link,
      }),
    ).rejects.toThrow("fixe ou spécial");
    expect(memory.writes).toEqual([]);
  });
  it("détache une demande non transformée sans la supprimer et refuse si un contrat lié a été créé entre-temps", async () => {
    memory.records.set("creditDemands/pending", {
      clientId: "alice",
      creditType: "SPECIALE",
      status: "APPROVED",
      groupProject: link,
    });
    await unlinkProjectDemand("g1", "p1", "pending", actor);
    expect(memory.records.get("creditDemands/pending")).toMatchObject({
      status: "APPROVED",
      groupProject: null,
    });
    await linkProjectCredit("g1", "p1", "c1", actor);
    await expect(unlinkProjectDemand("g1", "p1", "d1", actor)).rejects.toThrow(
      "contrat a été créé",
    );
    expect(loan().groupProject.projectId).toBe("p1");
  });
  it("rattache le contrat et sa demande sans modifier les montants, échéances ou versements", async () => {
    const before = { ...loan() };
    await linkProjectCredit("g1", "p1", "c1", actor);
    expect(loan().groupProject).toMatchObject({
      groupId: "g1",
      projectId: "p1",
      groupName: "Collectif",
      projectName: "Matériel",
      linkedBy: "admin",
    });
    expect(memory.records.get("creditDemands/d1").groupProject.projectId).toBe(
      "p1",
    );
    for (const key of [
      "amount",
      "amountPaid",
      "amountRemaining",
      "firstPaymentDate",
      "interestRate",
    ])
      expect(loan()[key]).toEqual(before[key]);
    expect(memory.writes).not.toContain("creditPayments/M1_c1");
    expect(
      memory.records.get("groups/g1").activity.at(-1).description,
    ).toContain("rattaché");
    memory.writes = [];
    await linkProjectCredit("g1", "p1", "c1", actor);
    expect(memory.writes).toEqual([]);
  });
  it("refuse le double rattachement et un contrat qui a changé entre la sélection et la confirmation", async () => {
    await expect(
      linkProjectCredit("g1", "p1", "c1", actor, "FIXE"),
    ).rejects.toThrow("Le type du contrat a changé");
    await linkProjectCredit("g1", "p1", "c1", actor);
    await expect(linkProjectCredit("g1", "p2", "c1", actor)).rejects.toThrow(
      "autre projet",
    );
    await unlinkProjectCredit("g1", "p1", "c1", actor);
    memory.before = () =>
      memory.records.set("creditContracts/c1", {
        ...loan(),
        creditType: "FIXE",
      });
    await expect(
      linkProjectCredit("g1", "p1", "c1", actor, "SPECIALE"),
    ).rejects.toThrow("plus disponible");
    memory.records.set("creditContracts/c1", {
      ...loan(),
      creditType: "SPECIALE",
    });
    memory.before = () =>
      memory.records.set("creditContracts/c1", { ...loan(), clientId: "bob" });
    await expect(linkProjectCredit("g1", "p1", "c1", actor)).rejects.toThrow(
      "plus disponible",
    );
  });
  it("contrôle à nouveau l’appartenance au groupe et la participation dans la transaction", async () => {
    memory.before = () =>
      memory.records.set("users/alice", { matricule: "M001", groupIds: [] });
    await expect(linkProjectCredit("g1", "p1", "c1", actor)).rejects.toThrow(
      "membre du groupe",
    );
    expect(memory.writes).toEqual([]);
    memory.records.set("users/alice", { matricule: "M001", groupIds: ["g1"] });
    memory.records.get("groups/g1").projects[0].participantIds = ["bob"];
    await expect(linkProjectCredit("g1", "p1", "c1", actor)).rejects.toThrow(
      "participant",
    );
  });
  it("résout les anciens contrats dont le clientId est un matricule et non l’UID", async () => {
    memory.records.set("creditContracts/c1", { ...loan(), clientId: "M001" });
    memory.records.set("creditDemands/d1", {
      clientId: "M001",
      creditType: "SPECIALE",
      contractId: "c1",
    });
    await linkProjectCredit("g1", "p1", "c1", actor);
    expect(loan().groupProject.projectId).toBe("p1");
  });
  it("refuse un projet clos et les crédits aide", async () => {
    memory.records.get("groups/g1").projects[0].status = "COMPLETED";
    await expect(linkProjectCredit("g1", "p1", "c1", actor)).rejects.toThrow(
      "en préparation",
    );
    memory.records.get("groups/g1").projects[0].status = "ACTIVE";
    memory.records.set("creditContracts/c1", { ...loan(), creditType: "AIDE" });
    await expect(linkProjectCredit("g1", "p1", "c1", actor)).rejects.toThrow(
      "spécial",
    );
  });
  it("détache sans effacer la dette, même si le membre a quitté le groupe", async () => {
    await linkProjectCredit("g1", "p1", "c1", actor);
    memory.records.set("users/alice", { groupIds: [] });
    await expect(unlinkProjectCredit("g1", "p2", "c1", actor)).rejects.toThrow(
      "rattachement a changé",
    );
    await unlinkProjectCredit("g1", "p1", "c1", actor);
    expect(loan()).toMatchObject({
      groupProject: null,
      amountRemaining: 90000,
      amountPaid: 20000,
      status: "ACTIVE",
    });
    expect(memory.records.get("creditDemands/d1").groupProject).toBeNull();
    expect(memory.records.has("creditPayments/M1_c1")).toBe(true);
  });
  it.each(["FIXE", "SPECIALE"] as const)(
    "crée une demande %s liée puis conserve le type et le lien au passage en contrat",
    async (creditType) => {
      const demandRepository = new CreditDemandRepository();
      const request = await demandRepository.createDemand(
        {
          clientId: "alice",
          clientFirstName: "Alice",
          clientLastName: "Ondo",
          creditType,
          status: "PENDING",
          createdBy: "admin",
          groupProject: link,
        } as Omit<CreditDemand, "id" | "createdAt" | "updatedAt">,
        "new-demand",
      );
      expect(request.groupProject).toMatchObject({
        projectId: "p1",
        groupName: "Collectif",
      });
      memory.records.set("creditDemands/new-demand", {
        ...memory.records.get("creditDemands/new-demand"),
        status: "APPROVED",
      });
      const contractRepository = new CreditContractRepository();
      const contract = await contractRepository.createContract(
        {
          ...loan(),
          id: undefined,
          demandId: "new-demand",
          creditType,
          createdBy: "admin",
          groupProject: request.groupProject,
        } as Omit<CreditContract, "id" | "createdAt" | "updatedAt">,
        "new-contract",
      );
      expect(contract.creditType).toBe(creditType);
      expect(contract.groupProject?.projectId).toBe("p1");
      expect(memory.records.get("creditDemands/new-demand").contractId).toBe(
        "new-contract",
      );
      await expect(
        createLinkedCreditRecord("creditContracts", "second-contract", {
          ...loan(),
          demandId: "new-demand",
          createdBy: "admin",
          groupProject: link,
        }),
      ).rejects.toThrow("possède déjà un contrat");
      expect(memory.records.has("creditContracts/second-contract")).toBe(false);
    },
  );
  it("ne crée aucun contrat si la participation ou la demande a changé avant sa création", async () => {
    memory.records.set("creditDemands/new-demand", {
      clientId: "alice",
      creditType: "SPECIALE",
      status: "APPROVED",
      groupProject: link,
    });
    memory.records.get("groups/g1").projects[0].participantIds = [];
    await expect(
      createLinkedCreditRecord("creditContracts", "new-contract", {
        ...loan(),
        demandId: "new-demand",
        createdBy: "admin",
        groupProject: link,
      }),
    ).rejects.toThrow("participant");
    expect(memory.records.has("creditContracts/new-contract")).toBe(false);
    expect(
      memory.records.get("creditDemands/new-demand").contractId,
    ).toBeUndefined();
  });
  it("ne remplace jamais un dossier existant lorsque la référence de création se répète", async () => {
    await expect(
      createLinkedCreditRecord("creditDemands", "d1", {
        ...loan(),
        createdBy: "admin",
        groupProject: link,
      }),
    ).rejects.toThrow("existe déjà");
    expect(memory.records.get("creditDemands/d1").contractId).toBe("c1");
  });
  it("consolide les mêmes flux et créances que le bilan, sans compter les demandes ni les contrats en préparation", async () => {
    await linkProjectCredit("g1", "p1", "c1", actor);
    memory.records.set("creditContracts/pending", {
      ...loan(),
      id: "pending",
      demandId: "d2",
      status: "PENDING",
      amount: 999999,
      groupProject: link,
    });
    memory.records.set("creditDemands/d2", {
      clientId: "alice",
      creditType: "SPECIALE",
      status: "APPROVED",
      contractId: "pending",
      groupProject: link,
    });
    const result = await loadProjectCredits("g1", "p1");
    expect(result.totals).toMatchObject({
      financed: 100000,
      repayments: 20000,
      interestCollected: 10000,
      outstanding: 90000,
    });
    expect(result.contracts).toHaveLength(2);
    expect(result.contracts.find((c) => c.id === "pending")?.financed).toBe(0);
    expect(result.demands).toEqual([]);
    expect((await loadProjectCredits("g1", "p2")).contracts).toEqual([]);
  });
});

describe("demande collective de crédit fixe", () => {
  const request = () => ({
    requestId: "request-collective-1",
    groupId: "g1",
    projectId: "p1",
    expectedGuarantorId: "guarantor",
    totalAmount: 200001,
    desiredDate: "2026-12-05",
    cause: "Achat de matériel en commun",
    shares: [
      { memberId: "alice", amount: 100001 },
      { memberId: "bob", amount: 100000 },
    ],
  });
  beforeEach(() => {
    const group = memory.records.get("groups/g1");
    group.guarantorId = "guarantor";
    group.guarantorName = "Ancien nom non fiable";
    group.projects[0].participantIds = ["alice", "bob"];
    memory.records.set("users/alice", {
      roles: ["Adherant"],
      matricule: "M001",
      firstName: "Alice",
      lastName: "Ondo",
      contacts: ["060000001"],
      groupIds: ["g1"],
    });
    memory.records.set("users/bob", {
      roles: ["Adherant"],
      matricule: "M002",
      firstName: "Bob",
      lastName: "Mba",
      contacts: ["060000002"],
      groupIds: ["g1"],
    });
    memory.records.set("users/guarantor", {
      roles: ["Adherant"],
      matricule: "G001",
      firstName: "Nadia",
      lastName: "Garant",
      groupIds: ["autre"],
    });
  });
  it("crée atomiquement une demande ordinaire par membre avec le même garant et ne duplique pas une relance identique", async () => {
    const ids = await createCollectiveCreditRequest(request(), actor);
    expect(ids).toHaveLength(2);
    const demands = ids.map((id) => memory.records.get(`creditDemands/${id}`));
    expect(demands.map((d) => d.amount)).toEqual([100001, 100000]);
    for (const demand of demands)
      expect(demand).toMatchObject({
        creditType: "FIXE",
        status: "PENDING",
        guarantorId: "guarantor",
        guarantorFirstName: "Nadia",
        guarantorLastName: "Garant",
        guarantorIsMember: true,
        groupProject: {
          groupId: "g1",
          projectId: "p1",
          collectiveRequestId: request().requestId,
        },
      });
    expect(memory.records.get("groups/g1").collectiveCreditRequests).toEqual([
      { id: request().requestId, projectId: "p1", demandCount: 2 },
    ]);
    const writes = [...memory.writes];
    expect(await createCollectiveCreditRequest(request(), actor)).toEqual(ids);
    expect(memory.writes).toEqual(writes);
    await expect(
      createCollectiveCreditRequest(
        {
          ...request(),
          shares: [
            { memberId: "alice", amount: 110001 },
            { memberId: "bob", amount: 90000 },
          ],
        },
        actor,
      ),
    ).rejects.toThrow("déjà été enregistrée");
    expect(memory.writes).toEqual(writes);
  });
  it("annule tout le lot si un membre a quitté le projet ou si le garant a changé", async () => {
    memory.before = () => (memory.records.get("users/bob").groupIds = []);
    await expect(
      createCollectiveCreditRequest(request(), actor),
    ).rejects.toThrow("n’appartient plus");
    expect(memory.writes).toEqual([]);
    memory.before = () =>
      (memory.records.get("groups/g1").guarantorId = "alice");
    await expect(
      createCollectiveCreditRequest(request(), actor),
    ).rejects.toThrow("garant du groupe a changé");
    expect(memory.writes).toEqual([]);
  });
  it("exige un autre garant pour la part du garant du groupe et garde le garant commun pour les autres", async () => {
    memory.records.get("groups/g1").guarantorId = "alice";
    const self = { ...request(), expectedGuarantorId: "alice" };
    await expect(createCollectiveCreditRequest(self, actor)).rejects.toThrow(
      "propre garant",
    );
    expect(memory.writes).toEqual([]);
    const ids = await createCollectiveCreditRequest(
      {
        ...self,
        shares: [
          { ...self.shares[0], guarantorId: "guarantor" },
          self.shares[1],
        ],
      },
      actor,
    );
    expect(
      ids.map((id) => memory.records.get(`creditDemands/${id}`).guarantorId),
    ).toEqual(["guarantor", "alice"]);
  });
  it("refuse un faux garant ou un profil emprunteur incomplet sans laisser de demande partielle", async () => {
    memory.records.get("users/guarantor").roles = ["Admin"];
    await expect(
      createCollectiveCreditRequest(request(), actor),
    ).rejects.toThrow("membre Kara identifié");
    memory.records.get("users/guarantor").roles = ["Adherant"];
    memory.records.get("users/bob").contacts = [];
    await expect(
      createCollectiveCreditRequest(request(), actor),
    ).rejects.toThrow("Bob Mba");
    expect(memory.writes).toEqual([]);
  });
  it("conserve la référence de demande collective au passage d’une demande approuvée en contrat individuel", async () => {
    const [id] = await createCollectiveCreditRequest(request(), actor);
    const demand = memory.records.get(`creditDemands/${id}`);
    demand.status = "APPROVED";
    await createLinkedCreditRecord("creditContracts", "collective-contract", {
      ...loan(),
      creditType: "FIXE",
      demandId: id,
      createdBy: "admin",
      groupProject: demand.groupProject,
    });
    expect(
      memory.records.get("creditContracts/collective-contract").groupProject
        .collectiveRequestId,
    ).toBe(request().requestId);
  });
});

describe("cotisations mensuelles et crédit fixe lié", () => {
  const project = () => memory.records.get("groups/g1").projects[0];
  const row = () => plannedContribution(project(), "2026-11", "alice");
  const stored = () =>
    memory.records.get(`groups/g1/contributions/${row().id}`);
  const input = () => ({
    ...loan(),
    creditType: "FIXE",
    clientId: "alice",
    amount: 10000,
    guarantorId: "garant",
    guarantorIsMember: true,
    createdBy: "admin",
    groupProject: {
      groupId: "g1",
      projectId: "p1",
      contributionId: row().id,
      contributionPeriod: "2026-11",
    },
  });
  beforeEach(async () => {
    project().kind = "TONTINE";
    memory.records.set("users/garant", {
      roles: ["Adherant"],
      matricule: "G1",
      lastName: "Garant",
    });
    await configureContributions(
      "g1",
      "p1",
      { amount: 10000, startMonth: "2026-11", months: 3, dueDay: 31 },
      actor,
    );
    memory.writes = [];
  });
  it("utilise les participants du cycle pour financer un mois, tout en exigeant l’appartenance actuelle au groupe", async () => {
    project().participantIds = [];
    await createLinkedCreditRecord("creditDemands", "cycle-demand", {
      ...input(),
      status: "PENDING",
    });
    expect(stored().financingDemandId).toBe("cycle-demand");
    memory.records.get("creditDemands/cycle-demand").status = "APPROVED";
    memory.records.get("users/alice").groupIds = [];
    await expect(
      createLinkedCreditRecord("creditContracts", "former-member-contract", {
        ...input(),
        demandId: "cycle-demand",
        status: "PENDING",
      }),
    ).rejects.toThrow("membre du groupe");
    expect(memory.records.has("creditContracts/former-member-contract")).toBe(
      false,
    );
  });
  it("enregistre un versement partiel puis le solde sans doublon et verrouille le cycle", async () => {
    const payment = {
      id: "payment-1",
      amount: 4000,
      date: "2026-11-09",
      source: "CASH" as const,
    };
    await recordContributionPayment(
      "g1",
      "p1",
      "2026-11",
      "alice",
      payment,
      actor,
    );
    expect(remainingContribution(stored())).toBe(6000);
    const writes = [...memory.writes];
    await recordContributionPayment(
      "g1",
      "p1",
      "2026-11",
      "alice",
      payment,
      actor,
    );
    expect(memory.writes).toEqual(writes);
    await expect(
      recordContributionPayment(
        "g1",
        "p1",
        "2026-11",
        "alice",
        { ...payment, id: "too-much", amount: 7000 },
        actor,
      ),
    ).rejects.toThrow("dépasse");
    await recordContributionPayment(
      "g1",
      "p1",
      "2026-11",
      "alice",
      { ...payment, id: "balance", amount: 6000 },
      actor,
    );
    expect(remainingContribution(stored())).toBe(0);
    await expect(
      configureContributions(
        "g1",
        "p1",
        { amount: 20000, startMonth: "2026-12", months: 2, dueDay: 5 },
        actor,
      ),
    ).rejects.toThrow("déjà des opérations");
  });
  it("la demande et le contrat non signé ne paient rien ; seule l’affectation d’un contrat signé règle le mois, une seule fois", async () => {
    await createLinkedCreditRecord("creditDemands", "support-demand", {
      ...input(),
      status: "PENDING",
    });
    expect(remainingContribution(stored())).toBe(10000);
    expect(stored().financingDemandId).toBe("support-demand");
    await expect(
      createLinkedCreditRecord("creditDemands", "duplicate", input()),
    ).rejects.toThrow("existe déjà");
    await expect(
      recordContributionPayment(
        "g1",
        "p1",
        "2026-11",
        "alice",
        { id: "cash", amount: 1000, date: "2026-11-09", source: "CASH" },
        actor,
      ),
    ).rejects.toThrow("prise en charge est en cours");
    memory.records.get("creditDemands/support-demand").status = "APPROVED";
    await createLinkedCreditRecord("creditContracts", "support-contract", {
      ...input(),
      demandId: "support-demand",
      status: "PENDING",
    });
    const contract = memory.records.get("creditContracts/support-contract");
    expect(contract.groupProject.contributionId).toBe(row().id);
    await expect(
      allocateContributionFinancing(
        "g1",
        "p1",
        "2026-11",
        "alice",
        { date: "2026-11-09" },
        actor,
      ),
    ).rejects.toThrow("signé et actif");
    expect(remainingContribution(stored())).toBe(10000);
    contract.status = "ACTIVE";
    contract.signedContractUrl = "https://example.test/signed.pdf";
    await allocateContributionFinancing(
      "g1",
      "p1",
      "2026-11",
      "alice",
      { date: "2026-11-09" },
      actor,
    );
    expect(remainingContribution(stored())).toBe(0);
    expect(stored().payments).toMatchObject([
      { amount: 10000, source: "CREDIT_FIXE", contractId: "support-contract" },
    ]);
    const writes = [...memory.writes];
    await allocateContributionFinancing(
      "g1",
      "p1",
      "2026-11",
      "alice",
      { date: "2026-11-09" },
      actor,
    );
    expect(memory.writes).toEqual(writes);
    await expect(
      allocateContributionFinancing(
        "g1",
        "p1",
        "2026-11",
        "alice",
        { date: "2026-11-08" },
        actor,
      ),
    ).rejects.toThrow("autre date");
    await expect(
      unlinkProjectCredit("g1", "p1", "support-contract", actor),
    ).rejects.toThrow("déjà réglé");
  });
  it("refuse un mauvais montant ou emprunteur, et permet un versement direct après détachement d’une demande non affectée", async () => {
    await expect(
      createLinkedCreditRecord("creditDemands", "wrong", {
        ...input(),
        amount: 9000,
      }),
    ).rejects.toThrow("solde");
    await expect(
      createLinkedCreditRecord("creditDemands", "wrong-kind", {
        ...input(),
        creditType: "SPECIALE",
      }),
    ).rejects.toThrow("crédit fixe");
    await createLinkedCreditRecord("creditDemands", "support-demand", {
      ...input(),
      status: "PENDING",
    });
    await unlinkProjectDemand("g1", "p1", "support-demand", actor);
    expect(stored().financingDemandId).toBeNull();
    await recordContributionPayment(
      "g1",
      "p1",
      "2026-11",
      "alice",
      { id: "cash", amount: 10000, date: "2026-11-09", source: "CASH" },
      actor,
    );
    expect(remainingContribution(stored())).toBe(0);
    expect(memory.records.get("creditDemands/support-demand").status).toBe(
      "PENDING",
    );
  });
});

function fundedPayoutCycle() {
  const project = memory.records.get('groups/g1').projects[0];
  Object.assign(project, {
    kind: 'TONTINE', payoutFee: { enabled: true, amount: 1000 },
    contributionPlan: { amount: 25000, startMonth: '2026-11', months: 2, dueDay: 5,
      participants: [{ id: 'alice', name: 'Alice' }, { id: 'bob', name: 'Bob' }],
      periods: [{ period: '2026-11', dueDate: '2026-11-05' }, { period: '2026-12', dueDate: '2026-12-05' }], locked: true },
  });
  memory.records.set('users/bob', { groupIds: ['g1'] });
  for (const id of ['alice','bob']) memory.records.set(`groups/g1/contributions/p1__2026-11__${id}`, {
    projectId: 'p1', memberId: id, period: '2026-11', amount: 25000,
    payments: [{ amount: 25000, date: '2026-11-04', source: id === 'bob' ? 'CREDIT_FIXE' : 'CASH' }],
  });
  return project;
}
const payoutInput = () => ({ operationId: 'remise-1', beneficiaryId: 'alice', date: '2026-11-05', source: 'CASH' as const, reference: 'recu-1', note: 'Remis en agence', expectedGross: 50000, expectedFee: 1000 });
describe('remises des caisses collectives et redevance facultative', () => {
  it('calcule le net et refuse les retenues fractionnaires, négatives ou supérieures à la caisse', () => {
    expect(payoutAmounts(50000, { enabled: true, amount: 1000 })).toEqual({ grossAmount: 50000, feeAmount: 1000, netAmount: 49000 });
    expect(payoutAmounts(50000)).toMatchObject({ feeAmount: 0, netAmount: 50000 });
    expect(payoutId('g__p','q','2026-11')).not.toBe(payoutId('g','p__q','2026-11'));
    for (const amount of [0,-1,0.5,50000,50001,NaN]) expect(() => payoutAmounts(50000, { enabled: true, amount })).toThrow();
  });
  it('enregistre une seule remise, y compris avec une cotisation prise en charge, et conserve sa redevance après modification', async () => {
    fundedPayoutCycle();
    await recordGroupPayout('g1','p1','2026-11',payoutInput(),actor);
    const saved = memory.records.get('groupPayouts/g1__p1__2026-11');
    expect(saved).toMatchObject({ beneficiaryId:'alice', grossAmount:50000, feeAmount:1000, netAmount:49000, byId:'admin' });
    await configurePayoutFee('g1','p1',{ enabled:true,amount:2000 },actor);
    const writes = memory.writes.length;
    await recordGroupPayout('g1','p1','2026-11',payoutInput(),actor);
    expect(memory.writes).toHaveLength(writes);
    expect(memory.records.get('groupPayouts/g1__p1__2026-11')).toEqual(saved);
    await expect(recordGroupPayout('g1','p1','2026-11',{ ...payoutInput(),operationId:'another' },actor)).rejects.toThrow(/déjà enregistrée/);
    await expect(recordGroupPayout('g1','p1','2026-11',{ ...payoutInput(),note:'autre contenu' },actor)).rejects.toThrow(/déjà enregistrée/);
  });
  it('refuse de réduire le cycle sous le tarif actif avant sa première opération', async () => {
    const project=fundedPayoutCycle();project.contributionPlan.locked=false;
    await expect(configureContributions('g1','p1',{amount:1000,startMonth:'2026-11',months:1,dueDay:5},actor)).rejects.toThrow(/redevance/);
    expect(memory.writes).toEqual([]);
  });
  it('désactive la redevance et remet la totalité au bénéficiaire', async () => {
    fundedPayoutCycle();
    await configurePayoutFee('g1','p1',{ enabled:false,amount:1000 },actor);
    await recordGroupPayout('g1','p1','2026-11',{ ...payoutInput(),expectedFee:0 },actor);
    expect(memory.records.get('groupPayouts/g1__p1__2026-11')).toMatchObject({ feeAmount:0,netAmount:50000 });
  });
  it('refuse un récapitulatif périmé après changement de tarif sans écrire de remise', async () => {
    const project = fundedPayoutCycle();
    project.payoutFee.amount=2000;
    await expect(recordGroupPayout('g1','p1','2026-11',payoutInput(),actor)).rejects.toThrow(/a changé/);
    expect(memory.writes).toEqual([]);
  });
  it('ne remet pas une caisse partiellement réglée, ni une caisse avant ses versements', async () => {
    fundedPayoutCycle();
    const row = memory.records.get('groups/g1/contributions/p1__2026-11__bob');
    row.payments[0].amount=20000;
    await expect(recordGroupPayout('g1','p1','2026-11',payoutInput(),actor)).rejects.toThrow(/Toutes les cotisations/);
    row.payments[0].amount=25000;
    await expect(recordGroupPayout('g1','p1','2026-11',{ ...payoutInput(),date:'2026-11-03' },actor)).rejects.toThrow(/Toutes les cotisations/);
    expect(memory.writes).toEqual([]);
  });
  it('contrôle le bénéficiaire, le mois et la date réelle', async () => {
    fundedPayoutCycle();
    await expect(recordGroupPayout('g1','p1','2026-11',{ ...payoutInput(),beneficiaryId:'outside' },actor)).rejects.toThrow(/bénéficiaire/);
    await expect(recordGroupPayout('g1','p1','2027-01',payoutInput(),actor)).rejects.toThrow(/cycle/);
    await expect(recordGroupPayout('g1','p1','2026-11',{ ...payoutInput(),date:'2026-11-10' },actor)).rejects.toThrow(/date/);
    memory.records.get('users/alice').groupIds=[];
    await expect(recordGroupPayout('g1','p1','2026-11',payoutInput(),actor)).rejects.toThrow(/appartenir/);
    expect(memory.writes).toEqual([]);
  });
});
