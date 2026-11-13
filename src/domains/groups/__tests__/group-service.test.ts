import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  addGroupMembers,
  createCollectiveGroup,
  deleteEmptyGroup,
  getGroupMemberCounts,
  removeGroupMember,
  saveGroupProject,
  saveGroupPayoutOrder,
  updateCollectiveGroup,
} from "../group-service";
import { emptyProject } from "../group-model";
import { getGroupById } from "@/db/group.db";
import { UNKNOWN_USER_ID, buildUnknownUserBase } from "@/domains/financial/caisse-imprevue/import/unknownUser";

const memory = vi.hoisted(() => ({
  data: new Map<string, Record<string, any>>(),
  next: 0,
  writes: [] as string[],
  beforeTransaction: null as (() => void) | null,
}));
vi.mock("firebase/firestore", () => {
  const snapshot = (ref: { path: string; id: string }) => {
    const data = memory.data.get(ref.path);
    return { ref, id: ref.id, exists: () => !!data, data: () => data! };
  };
  const apply = (path: string, updates: Record<string, any>) => {
    const data = { ...(memory.data.get(path) ?? {}) };
    for (const [key, value] of Object.entries(updates))
      data[key] =
        value?.operation === "union"
          ? [...new Set([...(data[key] ?? []), ...value.values])]
          : value?.operation === "remove"
            ? (data[key] ?? []).filter(
                (id: string) => !value.values.includes(id),
              )
            : value;
    memory.data.set(path, data);
    memory.writes.push(path);
  };
  const getDocs = async (request: {
    path: string;
    filters: { field: string; op: string; value: unknown }[];
  }) => {
    const docs = [...memory.data]
      .filter(
        ([path, data]) =>
          path.startsWith(`${request.path}/`) &&
          request.filters.every(({ field, op, value }) =>
            op === "array-contains"
              ? data[field]?.includes(value)
              : op === "array-contains-any"
                ? data[field]?.some((role: string) =>
                    (value as string[]).includes(role),
                  )
                : data[field] === value,
          ),
      )
      .map(([path]) => snapshot({ path, id: path.split("/").at(-1)! }));
    return { docs, empty: !docs.length };
  };
  return {
    collection: (_db: unknown, path: string) => ({ path }),
    doc: (parent: { path: string }, id?: string, legacyId?: string) => {
      const key = legacyId ?? id ?? `new-${++memory.next}`;
      return {
        path: legacyId ? `${id}/${legacyId}` : `${parent.path}/${key}`,
        id: key,
      };
    },
    query: (ref: { path: string }, ...filters: unknown[]) => ({
      ...ref,
      filters,
    }),
    where: (field: string, op: string, value: unknown) => ({
      field,
      op,
      value,
    }),
    getDocs,
    getDoc: async (ref: { path: string; id: string }) => snapshot(ref),
    getCountFromServer: async (request: Parameters<typeof getDocs>[0]) => ({
      data: () => ({
        count: [...memory.data].filter(
          ([path, data]) =>
            path.startsWith(`${request.path}/`) &&
            data.groupIds?.includes(request.filters[0].value),
        ).length,
      }),
    }),
    arrayUnion: (...values: string[]) => ({ operation: "union", values }),
    arrayRemove: (...values: string[]) => ({ operation: "remove", values }),
    serverTimestamp: () => new Date("2026-11-08T12:00:00Z"),
    Timestamp: { now: () => new Date("2026-11-08T12:00:00Z") },
    runTransaction: async (
      _db: unknown,
      operation: (transaction: unknown) => Promise<unknown>,
    ) => {
      memory.beforeTransaction?.();
      memory.beforeTransaction = null;
      const writes: (() => void)[] = [];
      const result = await operation({
        get: async (ref: { path: string; id: string }) => snapshot(ref),
        set: (ref: { path: string }, data: Record<string, any>) =>
          writes.push(() => apply(ref.path, data)),
        update: (ref: { path: string }, data: Record<string, any>) =>
          writes.push(() => apply(ref.path, data)),
        delete: (ref: { path: string }) =>
          writes.push(() => {
            memory.data.delete(ref.path);
            memory.writes.push(ref.path);
          }),
      });
      writes.forEach((write) => write());
      return result;
    },
  };
});
vi.mock("@/firebase/firestore", async () => ({
  ...(await import("firebase/firestore")),
  db: {},
}));

const actor = { id: "admin-1", name: "Admin A" };
const project = {
  ...emptyProject(["m1"]),
  name: "Congélateur",
  estimatedBudget: 600_000,
};
const member = (firstName: string, groupIds: string[] = []) => ({
  firstName,
  lastName: "MBOUMBA",
  roles: ["Adherant"],
  groupIds,
});
beforeEach(() => {
  memory.data.clear();
  memory.next = 0;
  memory.writes = [];
  memory.beforeTransaction = null;
  memory.data.set("users/m1", member("Jeanne", ["autre-groupe"]));
  memory.data.set("users/m2", member("Nadia"));
});

describe("création du collectif", () => {
  it('préserve le groupe qui possède un historique d’accords et les membres encore engagés', async () => {
    memory.data.set('groups/g1', { name: 'Groupe', projects: [] });
    memory.data.set('users/m1', member('Jeanne', ['g1']));
    memory.data.set('groupAgreementLedgers/g1', { agreementCount: 1, openByMember: { m1: 1 } });
    await expect(removeGroupMember('g1', 'm1', actor)).rejects.toThrow(/reversement/);
    expect(memory.data.get('users/m1')?.groupIds).toEqual(['g1']);
    memory.data.set('groupAgreementLedgers/g1', { agreementCount: 1, openByMember: { m1: 0 } });
    await removeGroupMember('g1', 'm1', actor);
    await expect(deleteEmptyGroup('g1')).rejects.toThrow(/historique/);
    expect(memory.data.has('groups/g1')).toBe(true);
  });
  it("réutilise INCONNU comme garant à la création et à la modification sans en faire un participant", async () => {
    memory.data.set(`users/${UNKNOWN_USER_ID}`, buildUnknownUserBase());
    const id = await createCollectiveGroup({ name: "Collectif", description: "", guarantorId: UNKNOWN_USER_ID, memberIds: ["m1"] }, actor);
    expect(memory.data.get(`groups/${id}`)).toMatchObject({ guarantorId: UNKNOWN_USER_ID, guarantorName: "INCONNU — LE KARA" });
    expect(memory.writes).not.toContain(`users/${UNKNOWN_USER_ID}`);
    await updateCollectiveGroup(id, { name: "Collectif", description: "", guarantorId: "m2" }, actor);
    await updateCollectiveGroup(id, { name: "Collectif", description: "", guarantorId: UNKNOWN_USER_ID }, actor);
    expect(memory.data.get(`groups/${id}`)?.guarantorId).toBe(UNKNOWN_USER_ID);
    expect(memory.data.get(`users/${UNKNOWN_USER_ID}`)?.groupIds).toBeUndefined();
  });
  it("ne crée ni groupe ni compte INCONNU si le garant technique est absent", async () => {
    await expect(createCollectiveGroup({ name: "Collectif", description: "", guarantorId: UNKNOWN_USER_ID, memberIds: [] }, actor)).rejects.toThrow("garant");
    expect(memory.writes).toEqual([]);
  });
  it("crée le groupe, ses membres et son premier projet atomiquement, sans remplacer les autres groupes", async () => {
    const id = await createCollectiveGroup(
      {
        name: " Les Entrepreneurs ",
        description: "Entraide",
        guarantorId: "m2",
        memberIds: ["m1", "m2", "m1"],
        coordinatorId: "m2",
        project,
      },
      actor,
    );
    expect(memory.data.get(`groups/${id}`)).toMatchObject({
      name: "Les Entrepreneurs",
      coordinatorId: "m2",
      coordinatorName: "Nadia MBOUMBA",
      projects: [
        {
          participantIds: ["m1"],
          participantNames: { m1: "Jeanne MBOUMBA" },
          estimatedBudget: 600_000,
        },
      ],
      activity: [{ byId: actor.id }],
    });
    expect(memory.data.get("users/m1")?.groupIds).toEqual(["autre-groupe", id]);
    expect(memory.data.get("users/m2")?.groupIds).toEqual([id]);
    expect(
      memory.writes.every(
        (path) => path.startsWith("groups/") || path.startsWith("users/"),
      ),
    ).toBe(true);
  });
  it("permet de créer un groupe vide sans projet", async () => {
    const id = await createCollectiveGroup(
      {
        name: "Nouveau collectif",
        description: "",
        guarantorId: "m2",
        memberIds: [],
      },
      actor,
    );
    expect(memory.data.get(`groups/${id}`)?.projects).toEqual([]);
    expect(memory.writes).toEqual([`groups/${id}`]);
  });
  it("n’écrit rien si un participant ou le référent n’appartient pas à la sélection", async () => {
    await expect(
      createCollectiveGroup(
        {
          name: "Collectif",
          description: "",
          guarantorId: "m2",
          memberIds: ["m1"],
          coordinatorId: "m2",
        },
        actor,
      ),
    ).rejects.toThrow("référent");
    await expect(
      createCollectiveGroup(
        {
          name: "Collectif",
          description: "",
          guarantorId: "m2",
          memberIds: ["m2"],
          project,
        },
        actor,
      ),
    ).rejects.toThrow("participants");
    expect(memory.writes).toEqual([]);
  });
  it("refuse un dossier supprimé ou qui n’est pas un membre, sans créer de groupe partiel", async () => {
    memory.data.set("users/admin", { roles: ["Admin"] });
    for (const id of ["absent", "admin"])
      await expect(
        createCollectiveGroup(
          {
            name: "Collectif",
            description: "",
            guarantorId: "m2",
            memberIds: ["m1", id],
          },
          actor,
        ),
      ).rejects.toThrow("plus disponible");
    expect(memory.writes).toEqual([]);
  });
});

describe("membres et projets", () => {
  beforeEach(() => {
    memory.data.set("groups/g1", {
      name: "Collectif",
      activity: [],
      projects: [],
      coordinatorId: "m1",
      coordinatorName: "Jeanne",
      guarantorId: "m2",
    });
    memory.data.set("users/m1", member("Jeanne", ["g1", "autre-groupe"]));
  });
  it("ajoute plusieurs membres et ignore ceux déjà présents", async () => {
    expect(await addGroupMembers("g1", ["m1", "m2", "m2"], actor)).toBe(1);
    expect(memory.data.get("users/m1")?.groupIds).toEqual([
      "g1",
      "autre-groupe",
    ]);
    expect(memory.data.get("users/m2")?.groupIds).toEqual(["g1"]);
    expect((await getGroupMemberCounts(["g1"])).g1).toBe(2);
  });
  it("autorise plusieurs projets avec des participants différents et conserve la création lors d’une modification", async () => {
    await saveGroupProject("g1", project, actor);
    const first = memory.data.get("groups/g1")!.projects[0];
    await addGroupMembers("g1", ["m2"], actor);
    await saveGroupProject(
      "g1",
      { ...emptyProject(["m2"]), name: "Caisse collective", kind: "TONTINE" },
      actor,
    );
    await saveGroupProject(
      "g1",
      { ...project, status: "ACTIVE" },
      { id: "admin-2", name: "Admin B" },
      first.id,
    );
    const projects = memory.data.get("groups/g1")!.projects;
    expect(projects).toHaveLength(2);
    expect(projects[0]).toMatchObject({
      status: "ACTIVE",
      participantIds: ["m1"],
      createdBy: "admin-1",
      createdAt: first.createdAt,
    });
    expect(projects[1]).toMatchObject({
      kind: "TONTINE",
      participantIds: ["m2"],
    });
  });
  it("refuse de rattacher au projet une personne extérieure au groupe", async () => {
    await expect(
      saveGroupProject("g1", { ...project, participantIds: ["m2"] }, actor),
    ).rejects.toThrow("membres du groupe");
    expect(memory.writes).toEqual([]);
  });
  it("retire le membre des projets ouverts, conserve les projets terminés et son autre groupe", async () => {
    await saveGroupProject("g1", project, actor);
    await saveGroupProject(
      "g1",
      { ...project, name: "Ancien achat", status: "COMPLETED" },
      actor,
    );
    await removeGroupMember("g1", "m1", actor);
    const group = memory.data.get("groups/g1")!;
    expect(group.projects[0].participantIds).toEqual([]);
    expect(group.projects[1].participantIds).toEqual(["m1"]);
    expect(group.projects[1].participantNames.m1).toBe("Jeanne MBOUMBA");
    expect(group.coordinatorId).toBeNull();
    expect(memory.data.get("users/m1")?.groupIds).toEqual(["autre-groupe"]);
  });
  it("valide le référent à chaque modification", async () => {
    await expect(
      updateCollectiveGroup(
        "g1",
        { name: "Collectif", description: "", coordinatorId: "m2" },
        actor,
      ),
    ).rejects.toThrow("référent");
    await updateCollectiveGroup(
      "g1",
      { name: "Collectif renommé", description: "", coordinatorId: "m1" },
      actor,
    );
    expect(memory.data.get("groups/g1")?.name).toBe("Collectif renommé");
  });
});

describe("ordre de récupération", () => {
  const current = () => memory.data.get("groups/g1")!.projects[0];
  beforeEach(async () => {
    memory.data.set("groups/g1", {
      name: "Collectif",
      activity: [],
      projects: [],
    });
    memory.data.set("users/m1", member("Jeanne", ["g1", "autre-groupe"]));
    memory.data.set("users/m2", member("Nadia", ["g1"]));
    await saveGroupProject(
      "g1",
      { ...project, kind: "TONTINE", participantIds: ["m1", "m2"] },
      actor,
    );
    memory.writes = [];
  });
  it("enregistre la permutation confirmée avec auteur, date, noms et événement d’historique", async () => {
    await saveGroupPayoutOrder("g1", current().id, ["m2", "m1"], null, actor);
    const saved = current();
    expect(saved.payoutDraws).toHaveLength(1);
    expect(saved.payoutDraws[0]).toMatchObject({
      participantIds: ["m2", "m1"],
      drawnBy: actor.id,
      drawnByName: actor.name,
      drawnAt: expect.any(Date),
      participantNames: { m1: "Jeanne MBOUMBA", m2: "Nadia MBOUMBA" },
    });
    expect(saved.payoutOrderDrawId).toBe(saved.payoutDraws[0].id);
    expect(memory.data.get("groups/g1")!.activity.at(-1).description).toContain(
      "1. Nadia",
    );
    expect(memory.writes).toEqual(["groups/g1"]);
    const mapped = await getGroupById("g1");
    expect(mapped?.projects?.[0].payoutDraws?.[0].drawnAt).toBeInstanceOf(Date);
  });
  it("conserve le précédent tirage quand un nouvel ordre est confirmé", async () => {
    await saveGroupPayoutOrder("g1", current().id, ["m2", "m1"], null, actor);
    const previous = structuredClone(current().payoutDraws[0]);
    await saveGroupPayoutOrder(
      "g1",
      current().id,
      ["m1", "m2"],
      previous.id,
      actor,
    );
    expect(current().payoutDraws).toHaveLength(2);
    expect(current().payoutDraws[0]).toEqual(previous);
    expect(current().payoutOrderDrawId).toBe(current().payoutDraws[1].id);
  });
  it("refuse une liste incomplète, dupliquée ou contenant un non-participant sans écriture", async () => {
    for (const order of [["m1"], ["m1", "m1"], ["m1", "foreign"]]) {
      await expect(
        saveGroupPayoutOrder("g1", current().id, order, null, actor),
      ).rejects.toThrow("participants ont changé");
    }
    expect(memory.writes).toEqual([]);
  });
  it("refuse un aperçu devenu obsolète après un autre tirage", async () => {
    await saveGroupPayoutOrder("g1", current().id, ["m1", "m2"], null, actor);
    await expect(
      saveGroupPayoutOrder("g1", current().id, ["m2", "m1"], null, actor),
    ).rejects.toThrow("entre-temps");
    expect(current().payoutDraws).toHaveLength(1);
  });
  it("invalide l’ordre après un changement de participants, même si la liste initiale est ensuite rétablie", async () => {
    await saveGroupPayoutOrder("g1", current().id, ["m1", "m2"], null, actor);
    const id = current().id;
    await saveGroupProject(
      "g1",
      { ...current(), participantIds: ["m1"] },
      actor,
      id,
    );
    expect(current().payoutOrderDrawId).toBeNull();
    await saveGroupProject(
      "g1",
      { ...current(), participantIds: ["m1", "m2"] },
      actor,
      id,
    );
    expect(current().payoutOrderDrawId).toBeNull();
    expect(current().payoutDraws).toHaveLength(1);
  });
  it("ne remplace pas les tirages récents avec ceux d’un formulaire d’édition resté ouvert", async () => {
    const staleDraft = structuredClone(current());
    await saveGroupPayoutOrder("g1", current().id, ["m1", "m2"], null, actor);
    await saveGroupPayoutOrder(
      "g1",
      current().id,
      ["m2", "m1"],
      current().payoutOrderDrawId,
      actor,
    );
    await saveGroupProject(
      "g1",
      {
        ...staleDraft,
        name: "Nouveau nom",
        payoutDraws: [],
      } as typeof staleDraft,
      actor,
      current().id,
    );
    expect(current().payoutDraws).toHaveLength(2);
    expect(current().payoutOrderDrawId).toBe(current().payoutDraws[1].id);
    expect(current().name).toBe("Nouveau nom");
  });
  it("invalide l’ordre si un participant quitte le groupe, en conservant le tirage historique", async () => {
    await saveGroupPayoutOrder("g1", current().id, ["m1", "m2"], null, actor);
    await removeGroupMember("g1", "m2", actor);
    expect(current().participantIds).toEqual(["m1"]);
    expect(current().payoutOrderDrawId).toBeNull();
    expect(current().payoutDraws[0].participantIds).toEqual(["m1", "m2"]);
    await expect(
      saveGroupPayoutOrder("g1", current().id, ["m1", "m2"], null, actor),
    ).rejects.toThrow("participants ont changé");
  });
  it("autorise les autres projets similaires et refuse les achats collectifs ou projets clos", async () => {
    const id = current().id;
    await saveGroupProject("g1", { ...current(), kind: "OTHER" }, actor, id);
    await saveGroupPayoutOrder("g1", id, ["m1", "m2"], null, actor);
    const drawId = current().payoutOrderDrawId;
    await saveGroupProject(
      "g1",
      { ...current(), status: "COMPLETED" },
      actor,
      id,
    );
    await removeGroupMember("g1", "m2", actor);
    expect(current().payoutOrderDrawId).toBe(drawId);
    await expect(
      saveGroupPayoutOrder("g1", id, ["m1", "m2"], drawId, actor),
    ).rejects.toThrow("en préparation ou en cours");
    await saveGroupProject("g1", { ...current(), kind: "PURCHASE" }, actor, id);
    expect(current().payoutOrderDrawId).toBeNull();
    await expect(
      saveGroupPayoutOrder("g1", id, ["m1", "m2"], null, actor),
    ).rejects.toThrow("caisses collectives");
  });
});

describe("compatibilité et suppression", () => {
  it("interrompt la suppression si le groupe a changé pendant la vérification", async () => {
    memory.data.set("groups/g1", {
      name: "Collectif",
      updatedAt: new Date("2026-01-01"),
    });
    memory.beforeTransaction = () =>
      memory.data.set("groups/g1", {
        name: "Collectif",
        updatedAt: new Date("2026-02-01"),
      });
    await expect(deleteEmptyGroup("g1")).rejects.toThrow(
      "vient d’être modifié",
    );
    expect(memory.data.has("groups/g1")).toBe(true);
  });
  it("lit les anciens groupes sans projets et normalise les dates des nouveaux", async () => {
    memory.data.set("groups/ancien", {
      name: "Ancien",
      createdAt: new Date("2025-01-01"),
    });
    // Le lecteur legacy appelle doc(db, collection, id).
    const legacy = await getGroupById("ancien");
    expect(legacy).toMatchObject({
      name: "Ancien",
      projects: [],
      activity: [],
    });
  });
  it("préserve les groupes avec des membres, projets ou contrats", async () => {
    memory.data.set("groups/g1", { name: "Collectif", projects: [] });
    memory.data.set("users/m1", member("Jeanne", ["g1"]));
    await expect(deleteEmptyGroup("g1")).rejects.toThrow("membres");
    memory.data.set("users/m1", member("Jeanne"));
    memory.data.set("groups/g1", { name: "Collectif", projects: [project] });
    await expect(deleteEmptyGroup("g1")).rejects.toThrow(
      "projets, des contrats ou des accords",
    );
    memory.data.set("groups/g1", {
      name: "Collectif",
      caisseContractIds: ["contrat-1"],
    });
    await expect(deleteEmptyGroup("g1")).rejects.toThrow(
      "projets, des contrats ou des accords",
    );
    expect(memory.data.has("groups/g1")).toBe(true);
  });
  it('réserve l’intitulé du groupe supprimé aux contrats, sans rouvrir sa fiche collective', async () => {
    memory.data.set('deletedGroupIdentities/g1', { name: 'Ancien collectif', deletedBy: 'admin', deletedAt: new Date('2026-11-13') });
    expect(await getGroupById('g1')).toBeNull();
    expect(await getGroupById('g1', true)).toMatchObject({ id: 'g1', name: 'Ancien collectif' });
    expect(await getGroupById('g1', true)).not.toHaveProperty('projects');
  });
});
