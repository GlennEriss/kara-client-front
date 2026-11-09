import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CollectiveCreditRequestDialog } from "../CollectiveCreditRequestDialog";
import type { Group, GroupProject, User } from "@/types/types";
const mock = vi.hoisted(() => ({ create: vi.fn(), manage: true }));
vi.mock("@/domains/groups/project-credit-service", () => ({
  createCollectiveCreditRequest: mock.create,
}));
vi.mock("@/domains/groups/useGroupWorkspace", () => ({
  useGroupWorkspace: () => ({
    actor: { id: "admin", name: "Admin" },
    creditAccess: { FIXE: { manage: mock.manage } },
  }),
}));
const members = [
  {
    id: "a",
    firstName: "Alice",
    lastName: "Ondo",
    matricule: "M001",
    roles: ["Adherant"],
  },
  {
    id: "b",
    firstName: "Bob",
    lastName: "Mba",
    matricule: "M002",
    roles: ["Adherant"],
  },
  {
    id: "g",
    firstName: "Nadia",
    lastName: "Garant",
    matricule: "G001",
    roles: ["Adherant"],
  },
] as User[];
vi.mock("@/domains/groups/group-service", () => ({
  listGroupCandidates: async () => members,
}));
const group = {
  id: "g1",
  name: "Collectif",
  guarantorId: "g",
  guarantorName: "Nadia Garant",
} as Group;
const project = {
  id: "p1",
  name: "Matériel",
  participantIds: ["a", "b"],
  estimatedBudget: 200000,
} as GroupProject;
function mount(g = group) {
  const created = vi.fn();
  const q = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={q}>
      <CollectiveCreditRequestDialog
        group={g}
        project={project}
        members={members}
        onClose={vi.fn()}
        onCreated={created}
      />
    </QueryClientProvider>,
  );
  return created;
}
beforeEach(() => {
  vi.clearAllMocks();
  mock.manage = true;
  mock.create.mockResolvedValue(["d1", "d2"]);
});
describe("demande collective depuis un projet", () => {
  it("présente des parts égales modifiables puis crée toutes les demandes après le récapitulatif", async () => {
    const created = mount();
    expect(screen.getByLabelText("Part de Alice Ondo (FCFA)")).toHaveValue(
      100000,
    );
    fireEvent.change(screen.getByLabelText("Part de Alice Ondo (FCFA)"), {
      target: { value: "120000" },
    });
    fireEvent.change(screen.getByLabelText("Part de Bob Mba (FCFA)"), {
      target: { value: "80000" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Vérifier la répartition" }),
    );
    expect(mock.create).not.toHaveBeenCalled();
    fireEvent.click(
      screen.getByRole("button", { name: "Créer 2 demandes de crédit fixe" }),
    );
    await waitFor(() =>
      expect(mock.create).toHaveBeenCalledWith(
        expect.objectContaining({
          groupId: "g1",
          projectId: "p1",
          expectedGuarantorId: "g",
          totalAmount: 200000,
          shares: [
            { memberId: "a", amount: 120000 },
            { memberId: "b", amount: 80000 },
          ],
        }),
        { id: "admin", name: "Admin" },
      ),
    );
    expect(await screen.findByRole("link", { name: "d1" })).toHaveAttribute(
      "href",
      "/credit-fixe/demandes/d1",
    );
    expect(created).toHaveBeenCalledOnce();
    expect(
      screen.queryByRole("button", { name: /Créer 2 demande/ }),
    ).not.toBeInTheDocument();
  });
  it("bloque une somme incorrecte et permet de revenir aux parts égales", () => {
    mount();
    fireEvent.change(screen.getByLabelText("Part de Alice Ondo (FCFA)"), {
      target: { value: "120000" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Vérifier la répartition" }),
    );
    expect(screen.getByRole("alert")).toHaveTextContent("exactement");
    expect(mock.create).not.toHaveBeenCalled();
    fireEvent.click(
      screen.getByRole("button", { name: "Répartir à parts égales" }),
    );
    expect(screen.getByLabelText("Part de Alice Ondo (FCFA)")).toHaveValue(
      100000,
    );
  });
  it("demande un autre garant si le garant du groupe emprunte lui-même", async () => {
    mount({ ...group, guarantorId: "a", guarantorName: "Alice Ondo" });
    fireEvent.click(
      screen.getByRole("button", { name: "Vérifier la répartition" }),
    );
    expect(screen.getByRole("alert")).toHaveTextContent("sa propre part");
    fireEvent.click(
      await screen.findByRole("button", { name: /Nadia Garant G001/ }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Vérifier la répartition" }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Créer 2 demandes de crédit fixe" }),
    );
    await waitFor(() =>
      expect(mock.create).toHaveBeenCalledWith(
        expect.objectContaining({
          expectedGuarantorId: "a",
          shares: [
            { memberId: "a", amount: 100000, guarantorId: "g" },
            { memberId: "b", amount: 100000 },
          ],
        }),
        expect.anything(),
      ),
    );
  });
  it("réutilise la même référence après une erreur réseau et garde la répartition", async () => {
    mock.create.mockRejectedValueOnce(new Error("Connexion interrompue"));
    mount();
    fireEvent.click(
      screen.getByRole("button", { name: "Vérifier la répartition" }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Créer 2 demandes de crédit fixe" }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Connexion interrompue",
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Créer 2 demandes de crédit fixe" }),
    );
    await screen.findByRole("link", { name: "d1" });
    expect(mock.create.mock.calls[0][0].requestId).toBe(
      mock.create.mock.calls[1][0].requestId,
    );
  });
});
