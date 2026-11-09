import type {
  CreditContract,
  CreditPayment,
  GuarantorPayment,
} from "@/types/types";
import type { FinancialReportSources } from "../../entities/financial-report-sources.types";
const date = (day: string) => new Date(`${day}T12:00:00+01:00`);
export function contractSourcesFixture(): FinancialReportSources {
  const credit = (
    id: string,
    amount: number,
    extra: Record<string, unknown> = {},
  ) =>
    ({
      id,
      creditType: "FIXE",
      clientId: "alice",
      clientFirstName: "Alice",
      clientLastName: "Ondo",
      amount,
      totalAmount: amount * 1.1,
      interestRate: 10,
      duration: 2,
      monthlyPaymentAmount: (amount * 1.1) / 2,
      status: "ACTIVE",
      createdAt: date("2026-01-01"),
      disbursementDate: date("2026-01-01"),
      firstPaymentDate: date("2026-02-01"),
      restMonths: [],
      ...extra,
    }) as unknown as CreditContract;
  return {
    caisseSpecialeContracts: [
      { id: "same-id", memberId: "alice", status: "ACTIVE" },
      {
        id: "cs-group",
        groupeId: "group1",
        contractType: "GROUP",
        status: "ACTIVE",
      },
    ],
    caisseSpecialePayments: [
      {
        id: "same-payment",
        parentId: "same-id",
        status: "PAID",
        amount: 10000,
        penaltyApplied: 500,
        paidAt: date("2025-12-01"),
      },
      {
        id: "pay2",
        parentId: "same-id",
        status: "PAID",
        amount: 2000,
        paidAt: date("2026-02-01"),
      },
      {
        id: "pay3",
        parentId: "cs-group",
        status: "PAID",
        amount: 5000,
        paidAt: date("2026-03-01"),
      },
      {
        id: "orphan",
        parentId: "missing-contract",
        status: "PAID",
        amount: 3000,
        paidAt: date("2026-02-01"),
      },
    ],
    caisseSpecialeRefunds: [
      {
        id: "ref",
        parentId: "same-id",
        status: "PAID",
        withdrawalAmount: 2000,
        amountBonus: 0,
        withdrawalDate: date("2026-03-01"),
      },
    ],
    caisseImprevueContracts: [
      {
        id: "same-id",
        memberId: "bob",
        memberFirstName: "Bob",
        memberLastName: "Mba",
        status: "ACTIVE",
      },
    ],
    caisseImprevuePayments: [
      {
        id: "same-payment",
        parentId: "same-id",
        versements: [{ date: "2026-02-03", amount: 6000, penalty: 100 }],
      },
    ],
    caisseImprevueSupports: [
      {
        id: "sup",
        parentId: "same-id",
        status: "REPAID",
        amount: 3000,
        approvedAt: date("2026-01-03"),
        repayments: [{ date: "2026-03-01", amount: 1000 }],
      },
    ],
    caisseImprevueRefunds: [],
    creditContracts: [
      credit("parent", 100000, { amountRemaining: 100000 }),
      credit("child", 150000, {
        parentContractId: "parent",
        rajoutAmount: 50000,
        createdAt: date("2026-02-01"),
        disbursementDate: date("2026-02-01"),
        firstPaymentDate: date("2026-03-01"),
        guarantorId: "garant",
        guarantorFirstName: "Jeanne",
        guarantorLastName: "Ndong",
      }),
      credit("draft", 999999, { status: "DRAFT" }),
    ],
    creditPayments: [
      {
        id: "cp1",
        creditId: "child",
        amount: 20000,
        paymentDate: date("2026-03-01"),
      },
    ] as CreditPayment[],
    creditPenalties: [],
    guarantorPayments: [
      {
        id: "gpay",
        creditId: "child",
        guarantorId: "garant",
        amount: 1000,
        paymentDate: date("2026-03-02"),
      },
    ] as GuarantorPayment[],
    placements: [
      {
        id: "pl1",
        benefactorId: "benefactor",
        benefactorName: "Nadia",
        status: "EarlyExit",
        amount: 500000,
        handoverDate: date("2026-01-10"),
      },
      {
        id: "cancelled",
        status: "Canceled",
        amount: 9999999,
        handoverDate: date("2026-01-10"),
      },
    ],
    placementCommissions: [
      {
        id: "com1",
        parentId: "pl1",
        status: "Paid",
        amount: 10000,
        paidAt: date("2026-02-10"),
      },
    ],
    placementEarlyExits: [
      {
        id: "exit",
        parentId: "pl1",
        payoutAmount: 510000,
        commissionDue: 10000,
        paymentDate: date("2026-03-10"),
      },
    ],
    membershipRequests: [
      {
        id: "request1",
        matricule: "alice",
        identity: { firstName: "Alice", lastName: "Ondo" },
        status: "approved",
        payments: [
          {
            amount: 10000,
            paymentType: "Membership",
            date: date("2026-01-02"),
          },
          {
            amount: 5000,
            paymentType: "Subscription",
            date: date("2026-03-02"),
          },
        ],
      },
    ],
  };
}
