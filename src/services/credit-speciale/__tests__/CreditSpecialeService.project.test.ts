import { beforeEach, describe, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({
  demand: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  member: vi.fn(),
  contract: vi.fn(),
}));
vi.mock("@/factories/RepositoryFactory", () => ({
  RepositoryFactory: {
    getContractCIRepository: () => ({}),
    getPaymentCIRepository: () => ({}),
    getMemberRepository: () => ({ getMemberById: mock.member }),
    getCreditInstallmentRepository: () => ({}),
    getDocumentRepository: () => ({}),
  },
}));
vi.mock("@/factories/ServiceFactory", () => ({
  ServiceFactory: {
    getNotificationService: () => ({ createNotification: vi.fn() }),
  },
}));
import { CreditSpecialeService } from "../CreditSpecialeService";
const project = {
  groupId: "g1",
  projectId: "p1",
  groupName: "Collectif",
  projectName: "Matériel",
};
beforeEach(() => {
  vi.clearAllMocks();
  mock.member.mockResolvedValue({ id: "alice", matricule: "0001.MK.010126" });
  mock.create.mockImplementation(async (data) => ({
    ...data,
    id: "linked-contract",
  }));
});
describe("validation d’une demande de financement collectif", () => {
  it("conserve les dossiers liés à une cotisation tant qu’ils ne sont pas détachés", async () => {
    const service = new CreditSpecialeService(
      { getDemandById: mock.demand } as any,
      { getContractById: mock.contract } as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
    );
    mock.demand.mockResolvedValue({
      id: "d1",
      groupProject: { ...project, contributionId: "month" },
    });
    mock.contract.mockResolvedValue({
      id: "c1",
      status: "PENDING",
      groupProject: { ...project, contributionId: "month" },
    });
    await expect(service.deleteDemand("d1")).rejects.toThrow(
      "Détachez d’abord",
    );
    await expect(service.deleteContract("c1", "admin")).rejects.toThrow(
      "Détachez d’abord",
    );
  });

  it.each([
    { link: project, creditType: "FIXE" },
    { link: {...project, contributionId: "month", contributionPeriod: "2026-11"}, creditType: "FIXE" },
    { link: project, creditType: "SPECIALE" },
    { link: undefined, creditType: "SPECIALE" },
  ])(
    "transmet le rattachement au dépôt du contrat tout en conservant le parcours individuel",
    async ({ link, creditType }) => {
      mock.demand.mockResolvedValue({
        id: "d1",
        status: "APPROVED",
        clientId: "alice",
        clientFirstName: "Alice",
        clientLastName: "Ondo",
        clientContacts: [],
        creditType,
        guarantorIsMember: false,
        score: 0,
        ...(link ? { groupProject: link } : {}),
      });
      const service = new CreditSpecialeService(
        { getDemandById: mock.demand, updateDemand: mock.update } as any,
        { createContract: mock.create } as any,
        {} as any,
        {} as any,
        {} as any,
        {} as any,
      );
      await service.createContractFromDemand("d1", "admin", {
        amount: 100000,
        interestRate: 10,
        monthlyPaymentAmount: 30000,
        duration: 4,
        firstPaymentDate: new Date("2026-12-01"),
        totalAmount: 140000,
      });
      const payload = mock.create.mock.calls[0][0];
      expect(payload).toMatchObject({
        clientId: "alice",
        creditType,
        status: "PENDING",
        amount: 100000,
      });
      if (link) expect(payload.groupProject).toEqual(link);
      else expect(Object.hasOwn(payload, "groupProject")).toBe(false);
      expect(mock.update).toHaveBeenCalledWith(
        "d1",
        expect.objectContaining({ contractId: "linked-contract" }),
      );
    },
  );
});
