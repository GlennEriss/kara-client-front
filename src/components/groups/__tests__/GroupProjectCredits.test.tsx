import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { GroupProject, User } from "@/types/types";
import { GroupProjectCredits } from "../GroupProjectCredits";

const mock = vi.hoisted(() => ({
  load: vi.fn(),
  candidates: vi.fn(),
  link: vi.fn(),
  unlink: vi.fn(),
  unlinkDemand: vi.fn(),
  refresh: vi.fn(),
  creation: vi.fn(),
  canView: true,
  canManage: true,
  canViewFixed: true,
  canViewSpecial: true,
}));
vi.mock("@/domains/groups/project-credit-service", () => ({
  loadProjectCredits: mock.load,
  listParticipantCredits: mock.candidates,
  linkProjectCredit: mock.link,
  unlinkProjectCredit: mock.unlink,
  unlinkProjectDemand: mock.unlinkDemand,
}));
vi.mock("@/domains/groups/useGroupWorkspace", () => ({
  useGroupWorkspace: () => ({
    actor: { id: "admin", name: "Admin" },
    canViewCredits: mock.canView,
    canManageCredits: mock.canManage,
    creditAccess: {
      FIXE: {
        view: mock.canView && mock.canViewFixed,
        manage: mock.canManage && mock.canViewFixed,
      },
      SPECIALE: {
        view: mock.canView && mock.canViewSpecial,
        manage: mock.canManage && mock.canViewSpecial,
      },
    },
    refresh: mock.refresh,
  }),
}));
vi.mock("next/dynamic", () => ({
  default: () => (props: unknown) => {
    mock.creation(props);
    return <div>Formulaire de demande</div>;
  },
}));
const project = {
  id: "p1",
  name: "Matériel partagé",
  status: "PLANNED",
  participantIds: ["m1"],
  participantNames: { m1: "Alice Ondo" },
  kind: "PURCHASE",
  description: "",
  createdAt: new Date(),
  updatedAt: new Date(),
  createdBy: "admin",
} as GroupProject;
const members = [
  { id: "m1", firstName: "Alice", lastName: "Ondo", matricule: "MK1" },
  { id: "m2", firstName: "Bob", lastName: "Mba" },
] as User[];
const totals = {
  financed: 100000,
  repayments: 20000,
  outstanding: 90000,
  interestCollected: 10000,
  penaltiesCollected: 0,
};
const finance = {
  totals,
  demands: [],
  contracts: [
    {
      ...totals,
      id: "c1",
      creditType: "SPECIALE",
      clientId: "m1",
      clientName: "Alice Ondo",
      status: "ACTIVE",
      amount: 100000,
    },
  ],
};
function mount(target = project) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <GroupProjectCredits groupId="g1" project={target} members={members} />
    </QueryClientProvider>,
  );
}
beforeEach(() => {
  vi.clearAllMocks();
  mock.canView = true;
  mock.canManage = true;
  mock.canViewFixed = true;
  mock.canViewSpecial = true;
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      disconnect() {}
    },
  );
  mock.load.mockResolvedValue(finance);
  mock.candidates.mockResolvedValue([
    {
      id: "available",
      amount: 50000,
      creditType: "FIXE",
      status: "ACTIVE",
    },
    {
      id: "already-linked",
      groupProject: { groupId: "other", projectId: "p2" },
    },
  ]);
  mock.link.mockResolvedValue(undefined);
  mock.unlink.mockResolvedValue(undefined);
  mock.refresh.mockResolvedValue(undefined);
});
describe("financements depuis le projet", () => {
  it("distingue les liens fixe/spécial et permet de choisir le crédit spécial sans conserver un contrat fixe sélectionné", async () => {
    mock.load.mockResolvedValue({
      ...finance,
      contracts: [
        ...finance.contracts,
        { ...finance.contracts[0], id: "fixed", creditType: "FIXE" },
      ],
      demands: [{ id: "fixed-request", creditType: "FIXE", status: "PENDING" }],
    });
    mock.candidates.mockResolvedValue([
      {
        id: "fixed-available",
        creditType: "FIXE",
        amount: 100000,
        status: "ACTIVE",
      },
      {
        id: "special-available",
        creditType: "SPECIALE",
        amount: 100000,
        status: "ACTIVE",
      },
    ]);
    mount();
    expect(await screen.findByRole("link", { name: "fixed" })).toHaveAttribute(
      "href",
      "/credit-fixe/contrats/fixed",
    );
    expect(screen.getByRole("link", { name: /fixed-request/ })).toHaveAttribute(
      "href",
      "/credit-fixe/demandes/fixed-request",
    );
    expect(screen.getByLabelText("Type de financement")).toHaveValue("FIXE");
    fireEvent.change(screen.getByLabelText("Participant à financer"), {
      target: { value: "m1" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Rattacher un contrat existant" }),
    );
    fireEvent.change(await screen.findByLabelText("Contrat à rattacher"), {
      target: { value: "fixed-available" },
    });
    fireEvent.change(screen.getByLabelText("Type de financement"), {
      target: { value: "SPECIALE" },
    });
    expect(
      screen.queryByRole("option", { name: /fixed-available/ }),
    ).not.toBeInTheDocument();
    expect(screen.getByLabelText("Contrat à rattacher")).toHaveValue("");
    expect(
      screen.getByRole("button", { name: "Confirmer le rattachement" }),
    ).toBeDisabled();
    fireEvent.click(
      screen.getByRole("button", { name: "Nouvelle demande de crédit" }),
    );
    expect(mock.creation).toHaveBeenLastCalledWith(
      expect.objectContaining({
        initialCreditType: "SPECIALE",
        lockCreditType: true,
      }),
    );
  });
  it("permet la gestion du fixe avec ses seuls droits et filtre la requête et les actions par type", async () => {
    mock.canViewSpecial = false;
    mock.load.mockResolvedValue({
      ...finance,
      contracts: [{ ...finance.contracts[0], creditType: "FIXE" }],
    });
    mount();
    expect(await screen.findByRole("link", { name: "c1" })).toHaveAttribute(
      "href",
      "/credit-fixe/contrats/c1",
    );
    expect(mock.load).toHaveBeenCalledWith("g1", "p1", ["FIXE"]);
    expect(
      screen.queryByRole("option", { name: "Crédit spécial" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Détacher le contrat c1" }),
    ).toBeVisible();
  });
  it("propose le spécial si le fixe n’est pas autorisé et conserve une consultation sans action en lecture seule", async () => {
    mock.canViewFixed = false;
    const first = mount();
    await screen.findByRole("link", { name: "c1" });
    expect(mock.load).toHaveBeenCalledWith("g1", "p1", ["SPECIALE"]);
    expect(screen.getByLabelText("Type de financement")).toHaveValue(
      "SPECIALE",
    );
    expect(
      screen.queryByRole("option", { name: /Crédit fixe/ }),
    ).not.toBeInTheDocument();
    first.unmount();
    mock.canManage = false;
    mount();
    expect(await screen.findByRole("link", { name: "c1" })).toBeVisible();
    expect(
      screen.queryByRole("button", { name: /Détacher/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByLabelText("Type de financement"),
    ).not.toBeInTheDocument();
  });
  it("permet de détacher une demande sans contrat sans annoncer de dette à rembourser", async () => {
    mock.load.mockResolvedValue({
      ...finance,
      demands: [
        {
          id: "d1",
          creditType: "SPECIALE",
          clientFirstName: "Alice",
          clientLastName: "Ondo",
          status: "PENDING",
        },
      ],
    });
    mock.unlinkDemand.mockResolvedValue(undefined);
    mount();
    fireEvent.click(
      await screen.findByRole("button", { name: "Détacher la demande d1" }),
    );
    expect(
      screen.getByText(/son parcours de validation continue/),
    ).toBeVisible();
    fireEvent.click(
      screen.getByRole("button", { name: "Confirmer le détachement" }),
    );
    await waitFor(() =>
      expect(mock.unlinkDemand).toHaveBeenCalledWith("g1", "p1", "d1", {
        id: "admin",
        name: "Admin",
      }),
    );
  });
  it("montre les totaux et ouvre la demande préremplie pour un participant du projet uniquement", async () => {
    mount();
    expect(await screen.findByRole("link", { name: "c1" })).toHaveAttribute(
      "href",
      "/credit-speciale/contrats/c1",
    );
    expect(
      screen.queryByRole("option", { name: "Bob Mba" }),
    ).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Participant à financer"), {
      target: { value: "m1" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Nouvelle demande de crédit" }),
    );
    expect(mock.creation).toHaveBeenLastCalledWith(
      expect.objectContaining({
        initialClientId: "m1",
        initialClient: members[0],
        initialCreditType: "FIXE",
        lockCreditType: true,
        groupProject: {
          groupId: "g1",
          projectId: "p1",
          projectName: "Matériel partagé",
        },
      }),
    );
  });
  it("propose seulement les contrats non rattachés du participant et attend la confirmation", async () => {
    mount();
    fireEvent.change(screen.getByLabelText("Participant à financer"), {
      target: { value: "m1" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Rattacher un contrat existant" }),
    );
    const select = await screen.findByLabelText("Contrat à rattacher");
    expect(mock.candidates).toHaveBeenCalledWith(["m1", "MK1"]);
    expect(
      screen.queryByRole("option", { name: /already-linked/ }),
    ).not.toBeInTheDocument();
    expect(mock.link).not.toHaveBeenCalled();
    fireEvent.change(select, { target: { value: "available" } });
    fireEvent.click(
      screen.getByRole("button", { name: "Confirmer le rattachement" }),
    );
    await waitFor(() =>
      expect(mock.link).toHaveBeenCalledWith(
        "g1",
        "p1",
        "available",
        {
          id: "admin",
          name: "Admin",
        },
        "FIXE",
      ),
    );
    await waitFor(() => expect(mock.refresh).toHaveBeenCalled());
  });
  it("conserve le formulaire et explique une erreur de rattachement", async () => {
    mock.link.mockRejectedValue(new Error("Le membre a quitté le projet."));
    mount();
    fireEvent.change(screen.getByLabelText("Participant à financer"), {
      target: { value: "m1" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Rattacher un contrat existant" }),
    );
    fireEvent.change(await screen.findByLabelText("Contrat à rattacher"), {
      target: { value: "available" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Confirmer le rattachement" }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "quitté le projet",
    );
  });
  it("détache uniquement après confirmation explicite sans proposer d’annuler le crédit", async () => {
    mount();
    fireEvent.click(
      await screen.findByRole("button", { name: "Détacher le contrat c1" }),
    );
    expect(
      screen.getByText(/le membre doit toujours rembourser/),
    ).toBeVisible();
    expect(mock.unlink).not.toHaveBeenCalled();
    fireEvent.click(
      screen.getByRole("button", { name: "Confirmer le détachement" }),
    );
    await waitFor(() =>
      expect(mock.unlink).toHaveBeenCalledWith("g1", "p1", "c1", {
        id: "admin",
        name: "Admin",
      }),
    );
  });
  it("ne charge pas les montants sans droit crédit et interdit les nouveaux financements sur un projet clos", async () => {
    mock.canView = false;
    const first = mount();
    expect(mock.load).not.toHaveBeenCalled();
    expect(
      screen.queryByRole("button", { name: "Nouvelle demande de crédit" }),
    ).not.toBeInTheDocument();
    first.unmount();
    mock.canView = true;
    mount({ ...project, status: "COMPLETED" });
    expect(await screen.findByRole("link", { name: "c1" })).toBeVisible();
    expect(
      screen.queryByLabelText("Participant à financer"),
    ).not.toBeInTheDocument();
  });
});
