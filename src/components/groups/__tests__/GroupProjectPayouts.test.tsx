import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GroupProjectPayouts } from "../GroupProjectPayouts";
import type { GroupProject } from "@/types/types";
const mock = vi.hoisted(() => ({
  list: vi.fn(),
  contributions: vi.fn(),
  configure: vi.fn(),
  record: vi.fn(),
  refresh: vi.fn(),
  manage: true,
}));
vi.mock("@/domains/groups/payout-service", () => ({
  listGroupPayouts: mock.list,
  configurePayoutFee: mock.configure,
  recordGroupPayout: mock.record,
}));
vi.mock("@/domains/groups/contribution-service", () => ({
  listContributions: mock.contributions,
}));
vi.mock("@/domains/groups/useGroupWorkspace", () => ({
  useGroupWorkspace: () => ({
    actor: { id: "admin", name: "Admin" },
    canManage: mock.manage,
    refresh: mock.refresh,
  }),
}));
const project = {
  id: "p1",
  name: "Caisse",
  kind: "TONTINE",
  status: "ACTIVE",
  participantIds: ["alice", "bob"],
  payoutFee: { enabled: true, amount: 1000 },
  contributionPlan: {
    amount: 25000,
    participants: [
      { id: "alice", name: "Alice" },
      { id: "bob", name: "Bob" },
    ],
    periods: [{ period: "2026-11", dueDate: "2026-11-05" }],
  },
} as GroupProject;
function mount() {
  return render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <GroupProjectPayouts groupId="g1" project={project} />
    </QueryClientProvider>,
  );
}
beforeEach(() => {
  vi.clearAllMocks();
  mock.manage = true;
  mock.list.mockResolvedValue([]);
  mock.contributions.mockResolvedValue(
    ["alice", "bob"].map((id) => ({
      memberId: id,
      period: "2026-11",
      payments: [{ amount: 25000 }],
    })),
  );
  mock.record.mockResolvedValue(undefined);
  mock.configure.mockResolvedValue(undefined);
  mock.refresh.mockResolvedValue(undefined);
});
describe("remise de caisse par l’admin", () => {
  it("affiche brut, redevance et net, puis exige une vérification avant enregistrement", async () => {
    mount();
    const choose = await screen.findByLabelText("Bénéficiaire de la remise");
    expect(screen.getByText(/49.*000 FCFA/)).toBeInTheDocument();
    fireEvent.change(choose, { target: { value: "alice" } });
    fireEvent.click(screen.getByRole("button", { name: "Vérifier la remise" }));
    expect(mock.record).not.toHaveBeenCalled();
    expect(
      screen.getByText(/Confirmer la remise effective de/),
    ).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: "Confirmer la remise effective" }),
    );
    await waitFor(() =>
      expect(mock.record).toHaveBeenCalledWith(
        "g1",
        "p1",
        "2026-11",
        expect.objectContaining({
          beneficiaryId: "alice",
          expectedGross: 50000,
          expectedFee: 1000,
        }),
        expect.anything(),
      ),
    );
  });
  it("bloque la remise tant qu’un participant doit encore verser sa part", async () => {
    mock.contributions.mockResolvedValue([
      { memberId: "alice", period: "2026-11", payments: [{ amount: 25000 }] },
    ]);
    mount();
    expect(
      await screen.findByText(/En attente du règlement/),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Vérifier la remise" }),
    ).not.toBeInTheDocument();
  });
  it("affiche la retenue historique et ne propose pas une seconde remise du même mois", async () => {
    mock.list.mockResolvedValue([
      {
        id: "r1",
        period: "2026-11",
        date: "2026-11-05",
        beneficiaryName: "Alice",
        grossAmount: 50000,
        feeAmount: 500,
        netAmount: 49500,
        byName: "Admin",
        source: "CASH",
      },
    ]);
    mount();
    expect(
      await screen.findByText("Remise enregistrée à Alice"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Brut.*Redevance.*500 FCFA.*Net remis/),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Vérifier la remise" }),
    ).not.toBeInTheDocument();
  });
  it("respecte le droit de consultation sans formulaire de gestion", async () => {
    mock.manage = false;
    mount();
    await screen.findByText("Net au bénéficiaire");
    expect(
      screen.queryByRole("button", { name: "Enregistrer la redevance" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByLabelText("Bénéficiaire de la remise"),
    ).not.toBeInTheDocument();
  });
});
