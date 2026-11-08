import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { GroupProject } from "@/types/types";
import { GroupPayoutOrder } from "../GroupPayoutOrder";

const mocks = vi.hoisted(() => ({
  save: vi.fn(),
  refresh: vi.fn(),
  audit: vi.fn(),
  canManage: true,
}));
vi.mock("@/domains/groups/group-service", () => ({
  saveGroupPayoutOrder: mocks.save,
}));
vi.mock("@/domains/groups/useGroupWorkspace", () => ({
  useGroupWorkspace: () => ({
    actor: { id: "admin", name: "Admin" },
    canManage: mocks.canManage,
    refresh: mocks.refresh,
    audit: mocks.audit,
  }),
}));
const project: GroupProject = {
  id: "p1",
  name: "Tontine mensuelle",
  kind: "TONTINE",
  status: "PLANNED",
  description: "",
  participantIds: ["m1", "m2", "m3"],
  participantNames: { m1: "Alice", m2: "Nadia", m3: "Jeanne" },
  createdAt: new Date(),
  updatedAt: new Date(),
  createdBy: "admin",
};
const recorded = {
  ...project,
  payoutOrderDrawId: "d1",
  payoutDraws: [
    {
      id: "d1",
      participantIds: ["m2", "m3", "m1"],
      participantNames: project.participantNames,
      drawnAt: new Date("2026-11-08T10:00:00Z"),
      drawnBy: "admin",
      drawnByName: "Admin",
    },
  ],
};
beforeEach(() => {
  vi.clearAllMocks();
  mocks.canManage = true;
  mocks.save.mockResolvedValue(undefined);
  mocks.refresh.mockResolvedValue(undefined);
});

describe("tirage au sort dans le projet", () => {
  it("prévisualise exactement une fois chaque participant et annule sans enregistrer", () => {
    render(<GroupPayoutOrder groupId="g1" project={project} />);
    fireEvent.click(
      screen.getByRole("button", { name: "Tirer au sort l’ordre" }),
    );
    const list = screen.getByRole("list", { name: "Ordre de récupération" });
    expect(within(list).getAllByRole("listitem")).toHaveLength(3);
    for (const name of Object.values(project.participantNames))
      expect(within(list).getByText(name)).toBeVisible();
    expect(mocks.save).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Annuler le tirage" }));
    expect(mocks.save).not.toHaveBeenCalled();
    expect(
      screen.getByText("L’ordre n’a pas encore été défini."),
    ).toBeVisible();
  });
  it("enregistre l’ordre affiché uniquement à la confirmation et recharge le groupe", async () => {
    render(<GroupPayoutOrder groupId="g1" project={project} />);
    fireEvent.click(
      screen.getByRole("button", { name: "Tirer au sort l’ordre" }),
    );
    const displayedNames = within(screen.getByRole("list"))
      .getAllByRole("listitem")
      .map(
        (li) =>
          Object.entries(project.participantNames).find(([, name]) =>
            li.textContent?.includes(name),
          )![0],
      );
    fireEvent.click(
      screen.getByRole("button", { name: "Enregistrer cet ordre" }),
    );
    await waitFor(() =>
      expect(mocks.save).toHaveBeenCalledWith(
        "g1",
        "p1",
        displayedNames,
        null,
        { id: "admin", name: "Admin" },
      ),
    );
    await waitFor(() => expect(mocks.refresh).toHaveBeenCalled());
  });
  it("garde l’aperçu en cas d’erreur d’enregistrement pour expliquer le conflit", async () => {
    mocks.save.mockRejectedValue(
      new Error("Un autre ordre a été enregistré entre-temps."),
    );
    render(<GroupPayoutOrder groupId="g1" project={project} />);
    fireEvent.click(
      screen.getByRole("button", { name: "Tirer au sort l’ordre" }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Enregistrer cet ordre" }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent("entre-temps");
    expect(screen.getByText("Aperçu du tirage — à confirmer")).toBeVisible();
  });
  it("bloque la confirmation d’un aperçu dont les participants ont changé", () => {
    const { rerender } = render(
      <GroupPayoutOrder groupId="g1" project={project} />,
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Tirer au sort l’ordre" }),
    );
    rerender(
      <GroupPayoutOrder
        groupId="g1"
        project={{ ...project, participantIds: ["m1", "m2"] }}
      />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Le projet a changé");
    expect(
      screen.getByRole("button", { name: "Enregistrer cet ordre" }),
    ).toBeDisabled();
  });
  it("affiche l’ordre enregistré et garde l’historique lors d’un nouveau tirage", () => {
    render(<GroupPayoutOrder groupId="g1" project={recorded} />);
    expect(screen.getByText(/Enregistré le/)).toHaveTextContent("Admin");
    expect(screen.getByText("Historique des tirages (1)")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Refaire le tirage" }));
    expect(screen.getByText(/conserve les tirages précédents/)).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Annuler le tirage" }));
    expect(
      within(screen.getAllByRole("list")[0]).getAllByRole("listitem")[0],
    ).toHaveTextContent("Nadia");
  });
  it("explique l’invalidation d’un ancien ordre", () => {
    render(
      <GroupPayoutOrder
        groupId="g1"
        project={{ ...recorded, payoutOrderDrawId: null }}
      />,
    );
    expect(screen.getByText(/À refaire :/)).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Refaire le tirage" }),
    ).toBeVisible();
  });
  it("respecte la lecture seule et les projets terminés", () => {
    mocks.canManage = false;
    const { rerender } = render(
      <GroupPayoutOrder groupId="g1" project={recorded} />,
    );
    expect(
      screen.queryByRole("button", { name: /tirage|sort/ }),
    ).not.toBeInTheDocument();
    expect(screen.getByText("Historique des tirages (1)")).toBeVisible();
    mocks.canManage = true;
    rerender(
      <GroupPayoutOrder
        groupId="g1"
        project={{ ...recorded, status: "COMPLETED" }}
      />,
    );
    expect(
      screen.queryByRole("button", { name: /tirage|sort/ }),
    ).not.toBeInTheDocument();
  });
  it("demande au moins deux participants et ne propose pas de tirage pour un achat collectif", () => {
    const { rerender } = render(
      <GroupPayoutOrder
        groupId="g1"
        project={{ ...project, participantIds: ["m1"] }}
      />,
    );
    expect(
      screen.getByRole("button", { name: "Tirer au sort l’ordre" }),
    ).toBeDisabled();
    rerender(
      <GroupPayoutOrder
        groupId="g1"
        project={{ ...project, kind: "PURCHASE" }}
      />,
    );
    expect(screen.queryByRole("region")).not.toBeInTheDocument();
  });
});
