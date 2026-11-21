import { describe, expect, it } from "vitest";
import { projectMyAgreement } from "../groups/server/agreements";

const fixture = () => ({
  groupId: "g1",
  title: "Ventilateur",
  description: "Conditions partagées",
  kind: "LOAN",
  agreementDate: "2026-09-01",
  creditorId: "seller",
  creditorMatricule: "S1",
  creditorName: "Alice",
  debtorId: "buyer",
  debtorMatricule: "B1",
  debtorName: "Bob",
  quantity: 1,
  unitAmount: 60000,
  totalAmount: 60000,
  status: "ACTIVE",
  schedule: [
    { id: "e1", dueDate: "2026-09-10", amount: 20000 },
    { id: "e2", dueDate: "2026-10-10", amount: 20000 },
    { id: "e3", dueDate: "2026-11-10", amount: 20000 },
  ],
  payments: [
    {
      id: "direct",
      amount: 20000,
      date: "2026-09-05",
      receivedBy: "CREDITOR",
      note: "PRIVATE",
      proofUrl: "PRIVATE",
    },
    { id: "kara", amount: 40000, date: "2026-10-01", receivedBy: "KARA" },
  ],
  remittances: [{ id: "r", amount: 12000, date: "2026-10-02", byName: "PRIVATE" }],
  history: [{ description: "PRIVATE" }],
});
describe("projection privée des accords du membre", () => {
  it("calcule les mêmes soldes pour les deux rôles et sépare le paiement de la remise", () => {
    const data = fixture();
    const payer = projectMyAgreement("a", "g1", data, new Set(["B1"]), "2026-11-11")!;
    const receiver = projectMyAgreement("a", "g1", data, new Set(["seller"]), "2026-11-11")!;
    expect(payer).toMatchObject({
      role: "PAYER",
      counterpartyName: "Alice",
      paid: 60000,
      remaining: 0,
      overdue: 0,
      heldByKara: 28000,
      receivedByCreditor: 32000,
      receivable: 28000,
      status: "PENDING_REMITTANCE",
    });
    expect(receiver).toMatchObject({
      role: "RECEIVER",
      counterpartyName: "Bob",
      receivedByCreditor: 32000,
      receivable: 28000,
    });
    expect(JSON.stringify(payer)).not.toMatch(/PRIVATE|kind|LOAN|proofUrl|history|byName/);
  });
  it("refuse un tiers, les deux identités simultanées et un groupe erroné", () => {
    for (const ids of [new Set(["stranger"]), new Set(["buyer", "seller"])])
      expect(projectMyAgreement("a", "g1", fixture(), ids)).toBeNull();
    expect(projectMyAgreement("a", "g2", fixture(), new Set(["buyer"]))).toBeNull();
  });
  it("ignore les paiements annulés et futurs puis affecte les paiements aux premières échéances", () => {
    const data = fixture();
    const payments = [
      { ...data.payments[0], amount: 25000 },
      { ...data.payments[1], voidedAt: "2026-10-02" },
      { ...data.payments[0], id: "future", date: "2099-01-01" },
    ];
    const result = projectMyAgreement(
      "a",
      "g1",
      { ...data, payments, remittances: [] },
      new Set(["buyer"]),
      "2026-10-11",
    )!;
    expect(result).toMatchObject({
      paid: 25000,
      remaining: 35000,
      overdue: 15000,
      status: "OVERDUE",
      schedule: [
        { paid: 20000, remaining: 0 },
        { paid: 5000, remaining: 15000 },
        { paid: 0, remaining: 20000 },
      ],
    });
    expect(result.payments).toHaveLength(1);
  });
  it("refuse des montants et dates corrompus au lieu de présenter un échéancier trompeur", () => {
    for (const changes of [
      { totalAmount: 0 },
      { agreementDate: "2026-02-30" },
      { schedule: [{ id: "e", dueDate: "2026-09-10", amount: -1 }] },
    ])
      expect(
        projectMyAgreement("a", "g1", { ...fixture(), ...changes }, new Set(["buyer"])),
      ).toBeNull();
  });
});
