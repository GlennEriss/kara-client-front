import type {
  GroupProject,
  GroupProjectKind,
  GroupProjectStatus,
  User,
} from "@/types/types";

export const PROJECT_KINDS: Record<
  GroupProjectKind,
  { label: string; description: string; placeholder: string }
> = {
  TONTINE: {
    label: "Tontine",
    description: "Organiser une épargne à plusieurs.",
    placeholder: "Ex. : Tontine des commerçants",
  },
  PURCHASE: {
    label: "Achat collectif",
    description: "Préparer ensemble un achat ou un équipement.",
    placeholder: "Ex. : Achat d’un congélateur",
  },
  OTHER: {
    label: "Autre projet",
    description: "Donner forme à une autre idée commune.",
    placeholder: "Ex. : Aménager un atelier partagé",
  },
};
export const PROJECT_STATUSES: Record<GroupProjectStatus, string> = {
  PLANNED: "En préparation",
  ACTIVE: "En cours",
  COMPLETED: "Terminé",
  CANCELLED: "Annulé",
};
export const memberName = (
  member: Pick<User, "firstName" | "lastName" | "id">,
) => `${member.firstName ?? ""} ${member.lastName ?? ""}`.trim() || member.id;
export const isOpenProject = (project: Pick<GroupProject, "status">) =>
  project.status === "PLANNED" || project.status === "ACTIVE";
export type GroupProjectDraft = Pick<
  GroupProject,
  | "name"
  | "kind"
  | "status"
  | "description"
  | "participantIds"
  | "estimatedBudget"
  | "targetDate"
>;
export const emptyProject = (
  participantIds: string[] = [],
): GroupProjectDraft => ({
  name: "",
  kind: "PURCHASE",
  status: "PLANNED",
  description: "",
  participantIds,
});

export function validateProject(project: GroupProjectDraft): void {
  if (!project.name.trim()) throw new Error("Donnez un nom au projet.");
  if (!PROJECT_KINDS[project.kind] || !PROJECT_STATUSES[project.status])
    throw new Error("Choisissez un type et un état valides.");
  if (
    project.estimatedBudget !== undefined &&
    (!Number.isFinite(project.estimatedBudget) || project.estimatedBudget < 0)
  )
    throw new Error("Le budget estimé doit être un montant positif.");
  if (project.targetDate) {
    const date = new Date(`${project.targetDate}T00:00:00Z`);
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(project.targetDate) ||
      Number.isNaN(date.getTime()) ||
      date.toISOString().slice(0, 10) !== project.targetDate
    )
      throw new Error("Choisissez une date cible valide.");
  }
}

export function validateGroup(input: {
  name: string;
  memberIds: string[];
  coordinatorId?: string;
  project?: GroupProjectDraft;
}): void {
  if (!input.name.trim()) throw new Error("Donnez un nom au groupe.");
  if (input.memberIds.length > 400)
    throw new Error("Ajoutez au maximum 400 membres à la fois.");
  if (input.coordinatorId && !input.memberIds.includes(input.coordinatorId))
    throw new Error("Le référent doit faire partie du groupe.");
  if (input.project) {
    validateProject(input.project);
    if (
      input.project.participantIds.some((id) => !input.memberIds.includes(id))
    )
      throw new Error(
        "Les participants du projet doivent faire partie du groupe.",
      );
  }
}
