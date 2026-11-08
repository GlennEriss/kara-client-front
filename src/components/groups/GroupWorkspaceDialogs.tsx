"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Group, GroupProject, User } from "@/types/types";
import {
  addGroupMembers,
  saveGroupProject,
  updateCollectiveGroup,
} from "@/domains/groups/group-service";
import {
  emptyProject,
  memberName,
  PROJECT_KINDS,
  PROJECT_STATUSES,
  type GroupProjectDraft,
} from "@/domains/groups/group-model";
import { useGroupWorkspace } from "@/domains/groups/useGroupWorkspace";
import { GroupMemberPicker } from "./GroupMemberPicker";
import { GroupProjectFields } from "./GroupProjectFields";
import { GroupPayoutOrder } from "./GroupPayoutOrder";
import {
  activePayoutDraw,
  sameParticipants,
} from "@/domains/groups/payout-order";

export function AddGroupMembersDialog({
  group,
  members,
  onClose,
}: {
  group: Group;
  members: User[];
  onClose: () => void;
}) {
  const [selected, setSelected] = useState<User[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const { actor, canManage, refresh, audit } = useGroupWorkspace(group.id);
  const save = async () => {
    if (!canManage || !selected.length) return;
    setBusy(true);
    setError("");
    try {
      const count = await addGroupMembers(
        group.id,
        selected.map((member) => member.id),
        actor,
      );
      audit(`${count} membre(s) ajouté(s) au groupe « ${group.name} ».`);
      await refresh();
      toast.success(`${count} membre(s) ajouté(s).`);
      onClose();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Impossible d’ajouter ces membres.",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !busy) onClose();
      }}
    >
      <DialogContent className="sm:!max-w-xl" showCloseButton={!busy}>
        <DialogHeader>
          <DialogTitle>Ajouter des membres</DialogTitle>
          <DialogDescription>
            Sélectionnez les personnes à réunir dans « {group.name} ». Elles
            peuvent déjà appartenir à d&apos;autres groupes.
          </DialogDescription>
        </DialogHeader>
        <fieldset disabled={busy}>
          <GroupMemberPicker
            value={selected}
            onChange={setSelected}
            excludeIds={members.map((member) => member.id)}
          />
        </fieldset>
        {error && (
          <p role="alert" className="text-sm text-red-700">
            {error}
          </p>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={busy}>
            Annuler
          </Button>
          <Button
            onClick={save}
            disabled={busy || !selected.length || !canManage}
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}Ajouter{" "}
            {selected.length || ""} membre(s)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function EditGroupDialog({
  group,
  members,
  onClose,
}: {
  group: Group;
  members: User[];
  onClose: () => void;
}) {
  const [name, setName] = useState(group.name);
  const [description, setDescription] = useState(group.description ?? "");
  const [label, setLabel] = useState(group.label ?? "");
  const [coordinatorId, setCoordinatorId] = useState(
    members.some((member) => member.id === group.coordinatorId)
      ? group.coordinatorId!
      : "",
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const { actor, canManage, refresh, audit } = useGroupWorkspace(group.id);
  const save = async () => {
    if (!canManage) return;
    setBusy(true);
    setError("");
    try {
      await updateCollectiveGroup(
        group.id,
        { name, description, label, coordinatorId: coordinatorId || undefined },
        actor,
      );
      audit(`Informations du groupe « ${name} » mises à jour.`);
      await refresh();
      toast.success("Groupe mis à jour.");
      onClose();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Impossible de modifier ce groupe.",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !busy) onClose();
      }}
    >
      <DialogContent showCloseButton={!busy}>
        <DialogHeader>
          <DialogTitle>Informations du groupe</DialogTitle>
          <DialogDescription>
            Présentez votre collectif et choisissez son référent.
          </DialogDescription>
        </DialogHeader>
        <fieldset disabled={busy} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-group-name">Nom du groupe *</Label>
            <Input
              id="edit-group-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={120}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-group-description">
              Raison de se regrouper
            </Label>
            <Textarea
              id="edit-group-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-group-label">Libellé (facultatif)</Label>
            <Input
              id="edit-group-label"
              value={label}
              onChange={(event) => setLabel(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-group-coordinator">Référent</Label>
            <select
              id="edit-group-coordinator"
              value={coordinatorId}
              onChange={(event) => setCoordinatorId(event.target.value)}
              className="h-10 w-full rounded-md border border-gray-200 bg-white px-3 text-sm"
            >
              <option value="">À définir</option>
              {members.map((member) => (
                <option key={member.id} value={member.id}>
                  {memberName(member)}
                </option>
              ))}
            </select>
          </div>
        </fieldset>
        {error && (
          <p role="alert" className="text-sm text-red-700">
            {error}
          </p>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={busy}>
            Annuler
          </Button>
          <Button onClick={save} disabled={busy || !canManage || !name.trim()}>
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function EditGroupProjectDialog({
  group,
  members,
  project,
  onClose,
}: {
  group: Group;
  members: User[];
  project?: GroupProject;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<GroupProjectDraft>(
    project ? { ...project } : emptyProject(members.map((member) => member.id)),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const { actor, canManage, refresh, audit } = useGroupWorkspace(group.id);
  const save = async () => {
    if (!canManage) return;
    setBusy(true);
    setError("");
    try {
      await saveGroupProject(group.id, draft, actor, project?.id);
      audit(
        `Projet « ${draft.name} » ${project ? "modifié" : "créé"} dans « ${group.name} ».`,
      );
      await refresh();
      toast.success(project ? "Projet mis à jour." : "Projet créé.");
      onClose();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Impossible d’enregistrer ce projet.",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !busy) onClose();
      }}
    >
      <DialogContent className="sm:!max-w-2xl" showCloseButton={!busy}>
        <DialogHeader>
          <DialogTitle>
            {project ? "Modifier le projet" : "Nouveau projet collectif"}
          </DialogTitle>
          <DialogDescription>
            Définissez l&apos;objectif et les participants de ce projet dans «{" "}
            {group.name} ».
          </DialogDescription>
        </DialogHeader>
        <fieldset disabled={busy}>
          <GroupProjectFields
            value={draft}
            onChange={setDraft}
            members={members}
            participantNames={project?.participantNames}
          />
          {project &&
            activePayoutDraw(project) &&
            (project.kind !== draft.kind ||
              !sameParticipants(
                project.participantIds,
                draft.participantIds,
              )) && (
              <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
                La modification du type ou des participants nécessitera un
                nouveau tirage de l’ordre de récupération. Le tirage précédent
                restera dans l’historique.
              </p>
            )}
        </fieldset>
        {error && (
          <p
            role="alert"
            className="rounded-lg bg-red-50 p-3 text-sm text-red-700"
          >
            {error}
          </p>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={busy}>
            Annuler
          </Button>
          <Button onClick={save} disabled={busy || !canManage}>
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {project ? "Enregistrer les modifications" : "Créer le projet"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function GroupProjectDetailDialog({
  groupId,
  project,
  members,
  canManage,
  onClose,
  onEdit,
}: {
  groupId: string;
  project: GroupProject;
  members: User[];
  canManage: boolean;
  onClose: () => void;
  onEdit: () => void;
}) {
  const names = Object.fromEntries(
    members.map((member) => [member.id, memberName(member)]),
  );
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-h-[85dvh] overflow-y-auto sm:!max-w-xl">
        <DialogHeader>
          <DialogTitle className="break-words pr-5">{project.name}</DialogTitle>
          <DialogDescription>
            {PROJECT_KINDS[project.kind]?.label} ·{" "}
            {PROJECT_STATUSES[project.status]}
          </DialogDescription>
        </DialogHeader>
        <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-gray-600">
          {project.description ||
            "L’objectif et l’organisation de ce projet restent à préciser."}
        </p>
        <dl className="grid gap-3 rounded-xl bg-gray-50 p-4 sm:grid-cols-2">
          {project.estimatedBudget !== undefined && (
            <div>
              <dt className="text-xs text-gray-500">Budget estimé</dt>
              <dd className="mt-1 text-sm font-semibold">
                {project.estimatedBudget.toLocaleString("fr-FR")} FCFA
              </dd>
            </div>
          )}
          <div>
            <dt className="text-xs text-gray-500">Date cible</dt>
            <dd className="mt-1 text-sm font-semibold">
              {project.targetDate
                ? new Date(`${project.targetDate}T12:00:00`).toLocaleDateString(
                    "fr-FR",
                  )
                : "À définir"}
            </dd>
          </div>
        </dl>
        <div>
          <h3 className="mb-3 !text-sm font-semibold">
            Participants ({project.participantIds.length})
          </h3>
          <div className="flex max-h-56 flex-wrap gap-2 overflow-y-auto">
            {project.participantIds.map((id) => (
              <span
                key={id}
                className="rounded-full bg-[#234D65]/10 px-3 py-1.5 text-sm text-[#234D65]"
              >
                {names[id] || project.participantNames[id] || id}
              </span>
            ))}
            {!project.participantIds.length && (
              <p className="text-sm text-gray-500">
                Aucun participant sélectionné pour le moment.
              </p>
            )}
          </div>
        </div>
        <GroupPayoutOrder
          key={project.id}
          groupId={groupId}
          project={project}
        />
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Fermer
          </Button>
          {canManage && <Button onClick={onEdit}>Modifier le projet</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
