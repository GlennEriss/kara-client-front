import { beforeEach, describe, expect, it } from "vitest";
import type { Firestore } from "firebase-admin/firestore";
import { getMemberGroup, listMemberGroups } from "../groups/server/groupRepository";

const store: Record<string, Record<string, Record<string, unknown>>> = {};
let groupReads: string[];
function snapshot(id: string, data?: Record<string, unknown>) {
  return { id, exists: !!data, data: () => data };
}
interface MockCollection {
  doc(id: string): {
    get(): Promise<ReturnType<typeof snapshot>>;
    collection(sub: string): MockCollection;
  };
  where(
    field: string,
    operator: string,
    id: string,
  ): {
    count(): { get(): Promise<{ data(): { count: number } }> };
    select(...fields: string[]): {
      get(): Promise<{ docs: ReturnType<typeof snapshot>[] }>;
    };
  };
}
const mockedCollection = (name: string): MockCollection => ({
  doc: (id: string) => ({
    collection: (sub: string) => mockedCollection(`${name}/${id}/${sub}`),
    get: async () => {
      if (name === "groups") groupReads.push(id);
      return snapshot(id, store[name]?.[id]);
    },
  }),
  where: (field: string, operator: string, id: string) => {
    const docs = () =>
      Object.entries(store[name] ?? {}).filter(([, d]) =>
        operator === "array-contains"
          ? ((d[field] as string[]) ?? []).includes(id)
          : d[field] === id,
      );
    return {
      count: () => ({
        get: async () => ({ data: () => ({ count: docs().length }) }),
      }),
      select: (...fields: string[]) => ({
        get: async () => ({
          docs: docs().map(([key, d]) =>
            snapshot(key, Object.fromEntries(fields.map((f) => [f, d[f]]))),
          ),
        }),
      }),
    };
  },
});
const db = { collection: mockedCollection } as unknown as Firestore;

beforeEach(() => {
  groupReads = [];
  store["groups/g1/contributions"] = {};
  store['groups/g1/agreements'] = {};
  store.creditContracts = {};
  store.groupPayouts = {};
  store.creditDemands = {};
  store.users = {
    alice: {
      firstName: "Alice",
      lastName: "Ondo",
      matricule: "M001",
      groupIds: ["g1", "legacy", "deleted"],
      contacts: ["private"],
    },
    bob: {
      firstName: "Bob",
      lastName: "Mba",
      groupIds: ["g1"],
      email: "private@example.com",
    },
    eve: { groupIds: ["g2"] },
  };
  store.groups = {
    g1: {
      name: "Matériel",
      coordinatorId: "bob",
      guarantorId: "private-guarantor-id",
      guarantorName: "Nadia Garant",
      collectiveCreditRequests: [
        { id: "private-batch", projectId: "p1", demandCount: 2 },
      ],
      coordinatorName: "Bob Mba",
      description: "Achat de matériel",
      activity: [{ description: "Note interne", byId: "admin" }],
      caisseContractIds: ["private-contract"],
      projects: [
        {
          id: "p1",
          name: "Machine",
          kind: "PURCHASE",
          status: "ACTIVE",
          description: "Ensemble",
          estimatedBudget: 150000,
          targetDate: "2026-12-05",
          participantIds: ["alice", "bob"],
          participantNames: { alice: "Alice Ondo", bob: "Bob Mba" },
          createdBy: "admin",
        },
        {
          id: "p2",
          name: "Caisse collective",
          kind: "TONTINE",
          status: "COMPLETED",
          participantIds: ["M001", "former"],
          participantNames: { M001: "Alice Ondo", former: "Ancien membre" },
        },
        {
          id: "p3",
          name: "Autre",
          kind: "OTHER",
          status: "PLANNED",
          participantIds: ["bob"],
        },
      ],
    },
    legacy: { label: "Ancien groupe" },
    g2: { name: "Autre groupe", projects: [] },
  };
});

describe("Groupes du membre connecté", () => {
  it('retourne seulement ses accords, déduplique uid/matricule et exclut notes et justificatifs', async () => {
    const agreement = { groupId: 'g1', title: 'Ventilateur', agreementDate: '2026-09-01', totalAmount: 60000, status: 'ACTIVE',
      creditorId: 'bob', creditorName: 'Bob Vendeur', debtorId: 'alice', debtorMatricule: 'M001', debtorName: 'Alice', partyIds: ['alice', 'M001', 'bob'],
      schedule: [{ id: 'e1', dueDate: '2026-10-01', amount: 30000 }, { id: 'e2', dueDate: '2026-11-01', amount: 30000 }],
      payments: [{ id: 'p1', date: '2026-10-01', amount: 30000, receivedBy: 'KARA', note: 'SECRET', proofUrl: 'https://SECRET', byName: 'SECRET' }],
      remittances: [{ id: 'r1', date: '2026-10-02', amount: 10000, note: 'SECRET' }], reminders: [{ note: 'SECRET' }], history: [{ description: 'SECRET' }] };
    store['groups/g1/agreements'] = {
      own: agreement,
      receiver: { ...agreement, creditorId: 'alice', debtorId: 'bob', debtorMatricule: 'B001', partyIds: ['alice', 'bob'], creditorName: 'Alice', debtorName: 'Bob' },
      other: { ...agreement, debtorId: 'eve', debtorMatricule: 'E001', partyIds: ['eve', 'bob'] },
      forgedIndex: { ...agreement, debtorId: 'eve', debtorMatricule: 'E001' },
      wrongGroup: { ...agreement, groupId: 'g2' },
    };
    const result = await getMemberGroup(db, 'alice', 'g1');
    expect(result!.agreements).toHaveLength(2);
    expect(result!.agreements!.find(a => a.id === 'own')).toMatchObject({ role: 'PAYER', counterpartyName: 'Bob Vendeur', paid: 30000, remaining: 30000, heldByKara: 20000, receivedByCreditor: 10000 });
    expect(result!.agreements!.find(a => a.id === 'receiver')).toMatchObject({ role: 'RECEIVER', counterpartyName: 'Bob' });
    expect(JSON.stringify(result!.agreements)).not.toMatch(/SECRET|partyIds|debtorId|reminders|history|proofUrl/);
    expect(await getMemberGroup(db, 'eve', 'g1')).toBeNull();
  });
  it.each(['DAILY', 'WEEKLY'] as const)('projette les cotisations et remises %s du membre, sans exposer celles des autres', async frequency => {
    const projects = store.groups.g1.projects as Record<string, unknown>[];
    const next = frequency === 'DAILY' ? '2026-11-06' : '2026-11-12';
    projects[0].kind = 'TONTINE';
    projects[0].contributionPlan = { frequency, amount: 10000,
      participants: [{ id: 'alice', name: 'Alice' }, { id: 'bob', name: 'Bob' }],
      periods: [{ period: '2026-11-05', dueDate: '2026-11-05' }, { period: next, dueDate: next }],
    };
    store['groups/g1/contributions'] = {
      own: { projectId: 'p1', memberId: 'alice', period: '2026-11-05', dueDate: '2026-11-05', amount: 10000, payments: [{ amount: 10000, date: '2026-11-05', source: 'CASH', byName: 'SECRET' }] },
      other: { projectId: 'p1', memberId: 'bob', period: next, amount: 10000, payments: [{ amount: 9999, date: next, source: 'CASH' }] },
    };
    const payout = { groupId: 'g1', projectId: 'p1', period: '2026-11-05', frequency, date: '2026-11-05', grossAmount: 20000, feeAmount: 1000, netAmount: 19000, note: 'SECRET' };
    store.groupPayouts = { own: { ...payout, beneficiaryId: 'alice' }, other: { ...payout, beneficiaryId: 'bob' } };
    const result = await getMemberGroup(db, 'alice', 'g1');
    const project = result!.projects.find(p => p.id === 'p1')!;
    expect(project.contributionFrequency).toBe(frequency);
    expect(project.myContributions).toMatchObject([
      { period: '2026-11-05', paidAmount: 10000, remaining: 0 },
      { period: next, paidAmount: 0, remaining: 10000 },
    ]);
    expect(project.myPayouts).toEqual([{ period: '2026-11-05', frequency, date: '2026-11-05', grossAmount: 20000, feeAmount: 1000, netAmount: 19000 }]);
    expect(JSON.stringify(project.myContributions)).not.toMatch(/SECRET|9999/);
    expect(JSON.stringify(project.myPayouts)).not.toMatch(/SECRET|beneficiaryId/);
  });
  it("ne retourne que ses cotisations et versements, sans notes, auteurs ou dossier de crédit, et ne mélange pas un accompagnement indépendant", async () => {
    const p = store.groups.g1.projects as Record<string, unknown>[];
    p[0].kind = "TONTINE";
    p[0].contributionPlan = {
      amount: 10000,
      participants: [
        { id: "alice", name: "Alice" },
        { id: "bob", name: "Bob" },
      ],
      periods: [
        { period: "2026-11", dueDate: "2026-11-05" },
        { period: "2026-12", dueDate: "2026-12-05" },
      ],
    };
    store["groups/g1/contributions"] = {
      own: {
        memberId: "alice",
        projectId: "p1",
        period: "2026-11",
        amount: 10000,
        dueDate: "2026-11-05",
        payments: [
          {
            amount: 4000,
            date: "2026-11-04",
            source: "CASH",
            byName: "Auteur privé",
            note: "note privée",
          },
        ],
      },
      foreign: {
        memberId: "bob",
        projectId: "p1",
        period: "2026-11",
        amount: 10000,
        payments: [{ amount: 9876, date: "2026-11-04", source: "CASH" }],
      },
    };
    store.creditContracts = {
      personal: {
        clientId: "alice",
        creditType: "FIXE",
        status: "ACTIVE",
        amount: 50000,
        groupProject: { groupId: "g1", projectId: "p1" },
      },
    };
    const group = await getMemberGroup(db, "alice", "g1");
    expect(group?.projects[0].myContributions).toMatchObject([
      {
        period: "2026-11",
        amount: 10000,
        paidAmount: 4000,
        remaining: 6000,
        status: "PARTIAL",
        payments: [{ amount: 4000, date: "2026-11-04", kind: "DIRECT" }],
      },
      {
        period: "2026-12",
        paidAmount: 0,
        remaining: 10000,
        status: "DUE",
        payments: [],
      },
    ]);
    expect(group?.projects[0].myContributions?.[1].support).toBeUndefined();
    expect(JSON.stringify(group)).not.toMatch(
      /Auteur privé|note privée|9876|financingDemandId|financingContractId/,
    );
  });
  it("une demande en attente ne règle pas le mois et un versement de prise en charge reste séparé des remboursements", async () => {
    const p = store.groups.g1.projects as Record<string, unknown>[];
    p[0].kind = "TONTINE";
    p[0].contributionPlan = {
      amount: 10000,
      participants: [{ id: "alice", name: "Alice" }],
      periods: [{ period: "2026-11", dueDate: "2026-11-05" }],
    };
    store["groups/g1/contributions"] = {
      own: {
        memberId: "alice",
        projectId: "p1",
        period: "2026-11",
        amount: 10000,
        payments: [],
        financingDemandId: "d1",
      },
    };
    const link = { groupId: "g1", projectId: "p1", contributionId: "own" };
    store.creditDemands = {
      d1: {
        clientId: "alice",
        creditType: "FIXE",
        status: "PENDING",
        amount: 10000,
        groupProject: link,
      },
    };
    let group = await getMemberGroup(db, "alice", "g1");
    expect(group?.projects[0].myContributions?.[0]).toMatchObject({
      status: "PENDING_SUPPORT",
      remaining: 10000,
      paidAmount: 0,
    });
    expect(group?.projects[0].myCreditDemands).toEqual([]);
    store.creditContracts = {
      c1: {
        clientId: "alice",
        creditType: "FIXE",
        status: "ACTIVE",
        amount: 10000,
        totalAmount: 11000,
        amountPaid: 1000,
        amountRemaining: 10000,
        groupProject: link,
      },
    };
    store.creditDemands.d1.contractId = "c1";
    store["groups/g1/contributions"].own.payments = [
      {
        amount: 10000,
        date: "2026-11-05",
        source: "CREDIT_FIXE",
        byName: "Privé",
      },
    ];
    group = await getMemberGroup(db, "alice", "g1");
    expect(group?.projects[0].myContributions?.[0]).toMatchObject({
      status: "SUPPORTED",
      remaining: 0,
      paidAmount: 10000,
      support: { totalAmount: 11000, amountPaid: 1000, amountRemaining: 10000 },
    });
    expect(group?.projects[0].myCredits).toEqual([]);
    expect(JSON.stringify(group?.projects[0].myContributions)).not.toMatch(
      /creditType|FIXE|CREDIT_FIXE|byName|Privé/,
    );
  });

  it("ne montre que les financements du membre connecté, par UID ou matricule, sans exposer ceux du groupe", async () => {
    const loan = (clientId: string, projectId = "p1") => ({
      clientId,
      creditType: "SPECIALE",
      status: "ACTIVE",
      amount: 100000,
      amountPaid: 20000,
      amountRemaining: 90000,
      groupProject: {
        groupId: "g1",
        projectId,
        linkedBy: "private-admin",
        linkedByName: "Admin privé",
      },
      privateNote: "privé",
    });
    store.creditContracts = {
      own: {
        ...loan("alice"),
        totalAmount: 110000,
        nextDueAt: { toDate: () => new Date("2026-12-04T23:00:00.000Z") },
      },
      alias: loan("M001", "p2"),
      otherMember: { ...loan("bob"), amount: 987654 },
      otherGroup: {
        ...loan("alice"),
        groupProject: { groupId: "g2", projectId: "p1" },
      },
      fixed: { ...loan("alice"), creditType: "FIXE" },
      otherType: { ...loan("alice"), creditType: "AIDE" },
    };
    store.creditDemands = {
      converted: { ...loan("alice"), contractId: "own" },
      pending: { ...loan("M001"), status: "PENDING" },
      fixedRequest: { ...loan("alice"), creditType: "FIXE", status: "PENDING" },
      foreignFixed: { ...loan("bob"), creditType: "FIXE" },
      foreign: loan("bob"),
    };
    const group = await getMemberGroup(db, "alice", "g1");
    expect(group?.projects[0].myCredits).toEqual([
      {
        id: "own",
        totalAmount: 110000,
        nextDueAt: "2026-12-04T23:00:00.000Z",
        status: "ACTIVE",
        amount: 100000,
        amountPaid: 20000,
        amountRemaining: 90000,
      },
      {
        id: "fixed",
        status: "ACTIVE",
        amount: 100000,
        amountPaid: 20000,
        amountRemaining: 90000,
      },
    ]);
    expect(group?.projects[0].myCreditDemands?.map((d) => d.id)).toEqual([
      "fixedRequest",
      "pending",
    ]);
    expect(group?.projects[1].myCredits?.map((c) => c.id)).toEqual(["alias"]);
    expect(JSON.stringify(group)).not.toMatch(
      /otherMember|foreignFixed|987654|otherGroup|otherType|private-admin|Admin privé|privateNote|creditType|FIXE|SPECIALE/,
    );
  });
  it("retourne uniquement l’ordre confirmé, sa date et la position du membre, sans auteur ni ancien tirage", async () => {
    const projects = store.groups.g1.projects as Record<string, unknown>[];
    projects[1].payoutOrderDrawId = "current";
    projects[1].payoutDraws = [
      {
        id: "old",
        participantIds: ["M001", "former"],
        participantNames: { M001: "Alice", former: "Ancien ordre privé" },
      },
      {
        id: "current",
        participantIds: ["former", "M001"],
        participantNames: { M001: "Alice Ondo", former: "Ancien membre" },
        drawnAt: { toDate: () => new Date("2026-11-08T12:00:00Z") },
        drawnBy: "private-admin",
        drawnByName: "Nom admin privé",
      },
    ];
    const group = await getMemberGroup(db, "alice", "g1");
    expect(group?.projects[1].payoutOrder).toEqual({
      participants: [
        { id: "former", name: "Ancien membre", isMe: false },
        { id: "M001", name: "Alice Ondo", isMe: true },
      ],
      drawnAt: "2026-11-08T12:00:00.000Z",
    });
    expect(JSON.stringify(group)).not.toMatch(
      /private-admin|Nom admin privé|Ancien ordre privé|payoutDraws|drawnBy/,
    );
  });
  it("masque un ordre invalidé ou qui ne correspond plus aux participants", async () => {
    const projects = store.groups.g1.projects as Record<string, unknown>[];
    projects[1].payoutDraws = [
      { id: "old", participantIds: ["M001", "former"] },
    ];
    projects[1].payoutOrderDrawId = null;
    let group = await getMemberGroup(db, "alice", "g1");
    expect(group?.projects[1].payoutOrder).toBeUndefined();
    expect(group?.projects[1].payoutOrderNeedsRedraw).toBe(true);
    projects[1].payoutOrderDrawId = "old";
    projects[1].participantIds = ["M001", "bob"];
    group = await getMemberGroup(db, "alice", "g1");
    expect(group?.projects[1].payoutOrder).toBeUndefined();
    expect(group?.projects[1].payoutOrderNeedsRedraw).toBe(true);
  });
  it("refuse les doublons dans un ancien tirage malformé", async () => {
    const projects = store.groups.g1.projects as Record<string, unknown>[];
    projects[1].payoutDraws = [{ id: "bad", participantIds: ["M001", "M001"] }];
    projects[1].payoutOrderDrawId = "bad";
    expect(
      (await getMemberGroup(db, "alice", "g1"))?.projects[1].payoutOrder,
    ).toBeUndefined();
  });
  it("ne retourne que ses groupes existants et calcule les participations uid/matricule", async () => {
    const groups = await listMemberGroups(db, "alice");
    expect(groups.map((g) => g.id)).toEqual(["legacy", "g1"]);
    expect(groups[1]).toMatchObject({
      memberCount: 2,
      projectCount: 3,
      openProjectCount: 2,
      myProjectCount: 2,
    });
    expect(groupReads).not.toContain("g2");
  });
  it("ne lit pas un groupe étranger, même si son identifiant est connu", async () => {
    expect(await getMemberGroup(db, "alice", "g2")).toBeNull();
    expect(groupReads).toEqual([]);
  });
  it("refuse un membre sans appartenance et les identifiants de chemin", async () => {
    expect(await listMemberGroups(db, "unknown")).toEqual([]);
    expect(await getMemberGroup(db, "alice", "g1/secret")).toBeNull();
    expect(groupReads).toEqual([]);
  });
  it("renvoie le coordinateur, les membres et les anciens participants sans données privées", async () => {
    store.groups.g1.guarantorName = "Nadia Garant";
    store.groups.g1.guarantorId = "private-guarantor-id";
    store.groups.g1.collectiveCreditRequests = [
      { id: "private-batch", projectId: "p1", demandCount: 2 },
    ];
    const group = await getMemberGroup(db, "alice", "g1");
    expect(group?.guarantorName).toBe("Nadia Garant");
    expect(group?.members[0]).toMatchObject({ id: "bob", isCoordinator: true });
    expect(group?.members[1]).toMatchObject({ id: "alice", isMe: true });
    expect(group?.projects[1].participants[1].name).toBe("Ancien membre");
    const serialized = JSON.stringify(group);
    for (const value of [
      "private",
      "activity",
      "createdBy",
      "Note interne",
      "caisseContractIds",
      "guarantorId",
      "collectiveCreditRequests",
      "private-batch",
      "contacts",
      "matricule",
    ])
      expect(serialized).not.toContain(value);
  });
  it("reste compatible avec les anciens groupes sans projet ou coordinateur", async () => {
    expect(await getMemberGroup(db, "alice", "legacy")).toMatchObject({
      name: "Ancien groupe",
      projects: [],
      projectCount: 0,
      memberCount: 1,
    });
  });
  it("retire l’accès dès que l’admin retire l’appartenance", async () => {
    store.users.alice.groupIds = [];
    expect(await getMemberGroup(db, "alice", "g1")).toBeNull();
    expect(await listMemberGroups(db, "alice")).toEqual([]);
  });
  it("conserve tous les membres d’un groupe de plus de 500 personnes", async () => {
    for (let i = 0; i < 505; i++)
      store.users[`member${i}`] = {
        firstName: `Membre ${i}`,
        groupIds: ["g1"],
      };
    expect((await getMemberGroup(db, "alice", "g1"))?.members).toHaveLength(
      507,
    );
  });
});


it('retourne seulement les remises du membre dans ce groupe sans notes, auteur ni références privées',async()=>{
  const group=store.groups.g1;
  (group.projects as Array<Record<string,unknown>>)[0].kind='TONTINE';
  (group.projects as Array<Record<string,unknown>>)[0].payoutFee={enabled:true,amount:2000};
  const payout={groupId:'g1',projectId:'p1',period:'2026-11',date:'2026-11-05',grossAmount:50000,feeAmount:1000,netAmount:49000,note:'SECRET',byName:'ADMIN',reference:'PRIVATE'};
  store.groupPayouts={own:{...payout,beneficiaryId:'alice'},alias:{...payout,period:'2026-12',beneficiaryId:'M001'},other:{...payout,beneficiaryId:'bob'},otherGroup:{...payout,groupId:'g2',beneficiaryId:'alice'}};
  const result=await getMemberGroup(db,'alice','g1');
  const project=result!.projects.find(p=>p.id==='p1')!;
  expect(project.payoutFee).toEqual({enabled:true,amount:2000});
  expect(project.myPayouts).toHaveLength(2);
  expect(project.myPayouts![0]).toEqual({period:'2026-12',date:'2026-11-05',grossAmount:50000,feeAmount:1000,netAmount:49000});
  expect(JSON.stringify(project.myPayouts)).not.toMatch(/SECRET|ADMIN|PRIVATE|beneficiaryId|groupId/);
});
