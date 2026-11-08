import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CreateGroupWizard } from "../CreateGroupWizard";
import GroupDetails from "../GroupDetails";
import GroupList from "../GroupList";
import type { Group, GroupProject, User } from "@/types/types";

const mock = vi.hoisted(() => ({
  create: vi.fn(),
  candidates: vi.fn(),
  group: vi.fn(),
  groups: vi.fn(),
  members: vi.fn(),
  counts: vi.fn(),
  saveProject: vi.fn(),
  addMembers: vi.fn(),
  removeMember: vi.fn(),
  updateGroup: vi.fn(),
  deleteGroup: vi.fn(),
  refresh: vi.fn(),
  audit: vi.fn(),
  canManage: true,
}));
vi.mock("@/domains/groups/group-service", () => ({
  createCollectiveGroup: mock.create,
  listGroupCandidates: mock.candidates,
  saveGroupProject: mock.saveProject,
  addGroupMembers: mock.addMembers,
  removeGroupMember: mock.removeMember,
  updateCollectiveGroup: mock.updateGroup,
  getGroupMemberCounts: mock.counts,
  deleteEmptyGroup: mock.deleteGroup,
}));
vi.mock("@/domains/groups/useGroupWorkspace", () => ({
  useGroupWorkspace: () => ({
    actor: { id: "admin-1", name: "Admin" },
    canManage: mock.canManage,
    refresh: mock.refresh,
    audit: mock.audit,
  }),
}));
vi.mock("@/db/group.db", () => ({
  getGroupById: mock.group,
  listGroups: mock.groups,
}));
vi.mock("@/db/member.db", () => ({ getMembersByGroup: mock.members }));
vi.mock("@/hooks/useListUrlSync", () => ({ useListUrlSync: vi.fn() }));

const jeanne = {
  id: "m1",
  firstName: "Jeanne",
  lastName: "MBOUMBA",
  matricule: "MK001",
  contacts: ["060000001"],
  groupIds: ["autre-groupe"],
  roles: ["Adherant"],
} as User;
const nadia = {
  id: "m2",
  firstName: "Nadia",
  lastName: "ONDO",
  matricule: "MK002",
  contacts: ["060000002"],
  groupIds: [],
  roles: ["Adherant"],
} as unknown as User;
const legacyGroup = {
  id: "g1",
  name: "Les Entrepreneurs",
  description: "Entraide",
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
  createdBy: "admin-1",
} as Group;

function mount(ui: React.ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(ui, {
    wrapper: ({ children }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    ),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mock.canManage = true;
  mock.create.mockResolvedValue("g1");
  mock.refresh.mockResolvedValue(undefined);
  mock.candidates.mockResolvedValue([jeanne, nadia]);
  mock.group.mockResolvedValue(legacyGroup);
  mock.groups.mockResolvedValue([legacyGroup]);
  mock.members.mockResolvedValue([jeanne, nadia]);
  mock.counts.mockResolvedValue({ g1: 2 });
});

describe("création guidée du groupe", () => {
  it("crée un groupe avec plusieurs membres, un référent et un projet ayant seulement une partie des participants", async () => {
    const created = vi.fn();
    mount(<CreateGroupWizard onClose={vi.fn()} onCreated={created} />);
    fireEvent.click(screen.getByRole("button", { name: "Continuer" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Donnez un nom");
    fireEvent.change(screen.getByLabelText("Nom du groupe *"), {
      target: { value: "Les Entrepreneurs" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Continuer" }));
    fireEvent.click(
      await screen.findByRole("checkbox", { name: /Jeanne MBOUMBA/ }),
    );
    fireEvent.click(screen.getByRole("checkbox", { name: /Nadia ONDO/ }));
    fireEvent.change(screen.getByLabelText("Référent du groupe (facultatif)"), {
      target: { value: "m2" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Continuer" }));
    fireEvent.change(screen.getByLabelText("Nom du projet *"), {
      target: { value: "Achat du congélateur" },
    });
    fireEvent.click(screen.getByRole("checkbox", { name: "Nadia ONDO" }));
    fireEvent.click(screen.getByRole("button", { name: "Créer le groupe" }));
    await waitFor(() =>
      expect(mock.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Les Entrepreneurs",
          memberIds: ["m1", "m2"],
          coordinatorId: "m2",
          project: expect.objectContaining({
            name: "Achat du congélateur",
            participantIds: ["m1"],
            kind: "PURCHASE",
          }),
        }),
        { id: "admin-1", name: "Admin" },
      ),
    );
    expect(created).toHaveBeenCalledWith("g1");
  });

  it("permet de reporter la constitution du groupe et le premier projet", async () => {
    mount(<CreateGroupWizard onClose={vi.fn()} onCreated={vi.fn()} />);
    fireEvent.change(screen.getByLabelText("Nom du groupe *"), {
      target: { value: "Collectif en préparation" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Continuer" }));
    fireEvent.click(screen.getByRole("button", { name: "Continuer" }));
    fireEvent.click(
      screen.getByRole("checkbox", { name: "Ajouter un premier projet" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Créer le groupe" }));
    await waitFor(() =>
      expect(mock.create).toHaveBeenCalledWith(
        expect.objectContaining({ memberIds: [], project: undefined }),
        expect.anything(),
      ),
    );
  });

  it("conserve le brouillon après une erreur de création", async () => {
    mock.create.mockRejectedValueOnce(new Error("Connexion indisponible"));
    const created = vi.fn();
    mount(<CreateGroupWizard onClose={vi.fn()} onCreated={created} />);
    fireEvent.change(screen.getByLabelText("Nom du groupe *"), {
      target: { value: "Mon groupe" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Continuer" }));
    fireEvent.click(screen.getByRole("button", { name: "Continuer" }));
    fireEvent.click(
      screen.getByRole("checkbox", { name: "Ajouter un premier projet" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Créer le groupe" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Connexion indisponible",
    );
    expect(created).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Retour" }));
    fireEvent.click(screen.getByRole("button", { name: "Retour" }));
    expect(screen.getByLabelText("Nom du groupe *")).toHaveValue("Mon groupe");
  });
});

describe("groupes existants et droits", () => {
  it("ouvre un projet puis permet de mettre à jour son état", async () => {
    const project: GroupProject = {
      id: "p1",
      name: "Congélateur partagé",
      kind: "PURCHASE",
      status: "PLANNED",
      description: "Équiper le collectif",
      participantIds: ["m1"],
      participantNames: { m1: "Jeanne MBOUMBA" },
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: "admin-1",
    };
    mock.group.mockResolvedValue({ ...legacyGroup, projects: [project] });
    mount(<GroupDetails groupId="g1" />);
    fireEvent.click(
      await screen.findByRole("button", { name: "Ouvrir le projet" }),
    );
    expect(screen.getByText("Participants (1)")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Modifier le projet" }));
    fireEvent.change(screen.getByLabelText("État du projet"), {
      target: { value: "COMPLETED" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Enregistrer les modifications" }),
    );
    await waitFor(() =>
      expect(mock.saveProject).toHaveBeenCalledWith(
        "g1",
        expect.objectContaining({
          status: "COMPLETED",
          participantIds: ["m1"],
        }),
        { id: "admin-1", name: "Admin" },
        "p1",
      ),
    );
  });

  it("ajoute plusieurs membres depuis la fiche sans proposer ceux déjà présents", async () => {
    mock.members.mockResolvedValue([jeanne]);
    mock.addMembers.mockResolvedValue(1);
    mount(<GroupDetails groupId="g1" />);
    const tab = await screen.findByRole("tab", { name: "Membres (1)" });
    fireEvent.mouseDown(tab, { button: 0, ctrlKey: false });
    fireEvent.click(
      screen.getByRole("button", { name: "Ajouter des membres" }),
    );
    fireEvent.click(
      await screen.findByRole("checkbox", { name: /Nadia ONDO/ }),
    );
    expect(
      screen.queryByRole("checkbox", { name: /Jeanne MBOUMBA/ }),
    ).not.toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: "Ajouter 1 membre(s)" }),
    );
    await waitFor(() =>
      expect(mock.addMembers).toHaveBeenCalledWith("g1", ["m2"], {
        id: "admin-1",
        name: "Admin",
      }),
    );
  });
  it("ouvre un groupe historique sans projet et charge directement ses membres", async () => {
    mount(<GroupDetails groupId="g1" />);
    expect(
      await screen.findByRole("heading", { name: "Les Entrepreneurs" }),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole("tab", { name: "Membres (2)" }),
    ).toBeInTheDocument();
    expect(mock.members).toHaveBeenCalledWith("g1");
    expect(
      screen.getByText("Quel sera votre premier projet ?"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Créer un contrat de caisse" }),
    ).toBeInTheDocument();
  });

  it("ne tronque pas les membres aux 500 premiers dossiers de l’association", async () => {
    mock.members.mockResolvedValue(
      Array.from({ length: 505 }, (_, index) => ({
        ...jeanne,
        id: `m${index}`,
      })),
    );
    mount(<GroupDetails groupId="g1" />);
    expect(
      await screen.findByRole("tab", { name: "Membres (505)" }),
    ).toBeInTheDocument();
  });

  it("masque les actions de gestion pour un accès en consultation", async () => {
    mock.canManage = false;
    mount(<GroupDetails groupId="g1" />);
    await screen.findByRole("heading", { name: "Les Entrepreneurs" });
    expect(
      screen.queryByRole("button", { name: "Nouveau projet" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Modifier le groupe" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Créer un contrat de caisse" }),
    ).not.toBeInTheDocument();
  });

  it("présente une carte de groupe avec ses membres et un état vide utile pour les projets", async () => {
    mount(<GroupList />);
    expect(
      await screen.findByRole("heading", { name: "Les Entrepreneurs" }),
    ).toBeInTheDocument();
    expect(await screen.findByText("2 membre(s)")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Ouvrir le groupe/ }),
    ).toHaveAttribute("href", "/groups/g1");
  });
});
