import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GroupProjectContributions } from "../GroupProjectContributions";
import type { GroupProject, Group, User } from "@/types/types";
const mock = vi.hoisted(() => ({
  list: vi.fn(),
  configure: vi.fn(),
  pay: vi.fn(),
  allocate: vi.fn(),
  refresh: vi.fn(),
  creation: vi.fn(),
  manage: true,
}));
vi.mock("@/domains/groups/contribution-service", () => ({
  listContributions: mock.list,
  configureContributions: mock.configure,
  recordContributionPayment: mock.pay,
  allocateContributionFinancing: mock.allocate,
}));
vi.mock("@/domains/groups/useGroupWorkspace", () => ({
  useGroupWorkspace: () => ({
    actor: { id: "admin", name: "Admin" },
    canManage: mock.manage,
    creditAccess: { FIXE: { view: true, manage: mock.manage } },
    refresh: mock.refresh,
  }),
}));
vi.mock("next/dynamic", () => ({
  default: () => (props: unknown) => {
    mock.creation(props);
    return <div>Formulaire individuel</div>;
  },
}));
const plan = {
  amount: 10000,
  startMonth: "2026-11",
  months: 1,
  dueDay: 5,
  periods: [{ period: "2026-11", dueDate: "2026-11-05" }],
  participants: [{ id: "alice", name: "Alice Ondo" }],
  locked: true,
};
const project = {
  id: "p1",
  name: "Caisse",
  kind: "TONTINE",
  status: "ACTIVE",
  participantIds: ["alice"],
  contributionPlan: plan,
} as GroupProject;
const row = {
  id: "p1__2026-11__alice",
  projectId: "p1",
  memberId: "alice",
  memberName: "Alice Ondo",
  period: "2026-11",
  dueDate: "2026-11-05",
  amount: 10000,
  payments: [
    {
      id: "p1",
      amount: 2000,
      date: "2026-11-04",
      source: "CASH",
      byName: "Admin",
    },
  ],
};
function mount(p = project) {
  return render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <GroupProjectContributions
        groupId="g1"
        group={{ id: "g1", guarantorId: "garant" } as Group}
        project={p}
        members={[
          { id: "alice", firstName: "Alice", lastName: "Ondo" } as User,
        ]}
      />
    </QueryClientProvider>,
  );
}
beforeEach(() => {
  vi.clearAllMocks();
  mock.manage = true;
  mock.list.mockResolvedValue([row]);
  mock.configure.mockResolvedValue(undefined);
  mock.pay.mockResolvedValue(undefined);
  mock.allocate.mockResolvedValue(undefined);
  mock.refresh.mockResolvedValue(undefined);
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      disconnect() {}
    },
  );
});
describe("gestion des cotisations par l’admin", () => {
  it.each(['DAILY', 'WEEKLY'] as const)('configure un cycle %s avec une première date et un nombre de prises', async frequency => {
    mount({ ...project, contributionPlan: undefined });
    fireEvent.change(screen.getByLabelText('Fréquence des cotisations et des prises'), { target: { value: frequency } });
    fireEvent.change(screen.getByLabelText('Première cotisation / prise'), { target: { value: '2026-11-01' } });
    fireEvent.change(screen.getByLabelText(frequency === 'DAILY' ? 'Nombre de jours' : 'Nombre de semaines'), { target: { value: '3' } });
    expect(screen.queryByLabelText('Jour d’échéance du mois')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Créer le cycle' }));
    await waitFor(() => expect(mock.configure).toHaveBeenCalledWith('g1', 'p1', { amount: 10000, frequency, startDate: '2026-11-01', periodCount: 3 }, { id: 'admin', name: 'Admin' }));
  });
  it("préremplit un crédit fixe pour le solde exact, le membre et le mois, sans le marquer payé", async () => {
    mount();
    fireEvent.click(
      await screen.findByRole("button", { name: "Financer par crédit fixe" }),
    );
    expect(mock.creation).toHaveBeenLastCalledWith(
      expect.objectContaining({
        initialCreditType: "FIXE",
        lockCreditType: true,
        initialClientId: "alice",
        initialAmount: 8000,
        lockAmount: true,
        initialGuarantorId: "garant",
        groupProject: expect.objectContaining({
          groupId: "g1",
          projectId: "p1",
          contributionId: row.id,
          contributionPeriod: "2026-11",
        }),
      }),
    );
    expect(mock.pay).not.toHaveBeenCalled();
    expect(mock.allocate).not.toHaveBeenCalled();
  });
  it("enregistre un versement seulement après confirmation du formulaire", async () => {
    mount();
    fireEvent.click(
      await screen.findByRole("button", { name: "Enregistrer un versement" }),
    );
    expect(mock.pay).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText("Montant versé (FCFA)"), {
      target: { value: "3000" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Confirmer l’enregistrement" }),
    );
    await waitFor(() =>
      expect(mock.pay).toHaveBeenCalledWith(
        "g1",
        "p1",
        "2026-11",
        "alice",
        expect.objectContaining({ amount: 3000, source: "CASH" }),
        { id: "admin", name: "Admin" },
      ),
    );
  });
  it("permet la confirmation d’affectation sans enregistrer un second versement direct", async () => {
    mock.list.mockResolvedValue([
      { ...row, financingDemandId: "d1", financingContractId: "c1" },
    ]);
    mount();
    fireEvent.click(
      await screen.findByRole("button", {
        name: "Confirmer la prise en charge",
      }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Confirmer l’enregistrement" }),
    );
    await waitFor(() =>
      expect(mock.allocate).toHaveBeenCalledWith(
        "g1",
        "p1",
        "2026-11",
        "alice",
        expect.objectContaining({ date: expect.any(String) }),
        { id: "admin", name: "Admin" },
      ),
    );
    expect(mock.pay).not.toHaveBeenCalled();
  });
  it("la consultation ne propose aucune écriture", async () => {
    mock.manage = false;
    mount();
    await screen.findByRole("table");
    expect(
      screen.queryByRole("button", { name: "Enregistrer un versement" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Financer par crédit fixe" }),
    ).not.toBeInTheDocument();
  });
});
