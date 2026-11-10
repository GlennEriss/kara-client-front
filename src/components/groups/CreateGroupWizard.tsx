"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog } from "@/components/ui/dialog";
import {
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Users, Check, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { createCollectiveGroup } from "@/domains/groups/group-service";
import {
  emptyProject,
  memberName,
  validateGroup,
  type GroupProjectDraft,
} from "@/domains/groups/group-model";
import { useGroupWorkspace } from "@/domains/groups/useGroupWorkspace";
import type { User } from "@/types/types";
import { GroupMemberPicker } from "./GroupMemberPicker";
import { GroupProjectFields } from "./GroupProjectFields";
import {
  GroupGuarantorPicker,
  type GroupGuarantorChoice,
} from "./GroupGuarantorPicker";

export function CreateGroupWizard({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const { actor, canManage, refresh, audit } = useGroupWorkspace();
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [members, setMembers] = useState<User[]>([]);
  const [coordinatorId, setCoordinatorId] = useState("");
  const [guarantor, setGuarantor] = useState<GroupGuarantorChoice | null>(null);
  const [withProject, setWithProject] = useState(true);
  const [project, setProject] = useState<GroupProjectDraft>(emptyProject());
  const [participantsInitialized, setParticipantsInitialized] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const steps = ["Le groupe", "Les membres", "Premier projet"];
  const selectMembers = (selected: User[]) => {
    setMembers(selected);
    if (!selected.some((member) => member.id === coordinatorId))
      setCoordinatorId("");
    setProject((previous) => ({
      ...previous,
      participantIds: previous.participantIds.filter((id) =>
        selected.some((member) => member.id === id),
      ),
    }));
  };
  const next = () => {
    setError("");
    if (!name.trim()) {
      setError("Donnez un nom à votre groupe.");
      return;
    }
    if (step === 1 && !guarantor) {
      setError("Choisissez un membre Kara ou INCONNU comme garant du groupe.");
      return;
    }
    if (step === 1 && !participantsInitialized) {
      setProject((previous) => ({
        ...previous,
        participantIds: members.map((member) => member.id),
      }));
      setParticipantsInitialized(true);
    }
    setStep((current) => Math.min(2, current + 1));
  };
  const submit = async () => {
    if (!canManage || busy) return;
    setError("");
    try {
      const input = {
        name,
        description,
        memberIds: members.map((member) => member.id),
        coordinatorId: coordinatorId || undefined,
        guarantorId: guarantor?.id,
        project: withProject ? project : undefined,
      };
      validateGroup(input);
      setBusy(true);
      const id = await createCollectiveGroup(input, actor);
      audit(
        `Création du groupe « ${name.trim()} » avec ses membres${withProject ? " et son premier projet" : ""}.`,
        id,
        "create",
      );
      await refresh();
      onCreated(id);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Le groupe n’a pas pu être créé. Réessayez.",
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
      <ModalContent size="lg" showCloseButton={!busy}>
        <ModalHeader
          icon={Users}
          className="[&_[data-slot=dialog-title]]:break-words"
          title={<>Créer un groupe</>}
          description={
            <>
              Réunissez des membres et donnez une première direction à votre
              projet collectif.
            </>
          }
        />
        <ModalBody key={step}>
          <ol
            className="grid grid-cols-3 gap-2"
            aria-label="Étapes de création"
          >
            {steps.map((label, index) => (
              <li
                key={label}
                aria-current={step === index ? "step" : undefined}
                className={`flex items-center gap-2 border-b-2 pb-3 text-xs sm:text-sm ${step === index ? "border-[#234D65] font-semibold text-[#234D65]" : "border-gray-100 text-gray-500"}`}
              >
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${step >= index ? "bg-[#234D65] text-white" : "bg-gray-100"}`}
                >
                  {step > index ? <Check className="h-3 w-3" /> : index + 1}
                </span>
                {label}
              </li>
            ))}
          </ol>
          <fieldset disabled={busy} className="min-h-48 space-y-4">
            {step === 0 && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="group-name">Nom du groupe *</Label>
                  <Input
                    id="group-name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Ex. : Les Entrepreneurs de Libreville"
                    maxLength={120}
                    autoFocus
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="group-description">
                    Votre raison de vous regrouper
                  </Label>
                  <Textarea
                    id="group-description"
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    placeholder="Ex. : s’entraider et financer des équipements pour nos activités."
                    rows={3}
                  />
                </div>
                <p className="rounded-xl bg-gray-50 p-3 text-sm leading-relaxed text-gray-600">
                  Les personnes restent dans le groupe au fil des projets. Vous
                  pourrez préparer une caisse collective, puis un achat
                  collectif avec les mêmes membres ou seulement une partie
                  d&apos;entre eux.
                </p>
              </>
            )}
            {step === 1 && (
              <>
                <GroupMemberPicker value={members} onChange={selectMembers} />
                <GroupGuarantorPicker
                  value={guarantor}
                  onChange={setGuarantor}
                />
                <p className="text-xs text-gray-500">
                  Choisissez un membre Kara, même d’un autre groupe, ou « Contact inconnu »
                  lorsque LE KARA assure la garantie sans commission. Ce rôle est distinct de celui du référent.
                </p>
                {!!members.length && (
                  <div className="space-y-2">
                    <Label htmlFor="group-coordinator">
                      Référent du groupe (facultatif)
                    </Label>
                    <select
                      id="group-coordinator"
                      className="h-10 w-full rounded-md border border-gray-200 bg-white px-3 text-sm"
                      value={coordinatorId}
                      onChange={(event) => setCoordinatorId(event.target.value)}
                    >
                      <option value="">À définir plus tard</option>
                      {members.map((member) => (
                        <option key={member.id} value={member.id}>
                          {memberName(member)}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                {!members.length && (
                  <p className="text-sm text-gray-500">
                    Vous pouvez aussi constituer le groupe maintenant et ajouter
                    ses membres plus tard.
                  </p>
                )}
              </>
            )}
            {step === 2 && (
              <>
                <label className="flex items-center gap-3 rounded-xl border border-gray-200 p-3 text-sm font-medium">
                  <Checkbox
                    checked={withProject}
                    onCheckedChange={(checked) =>
                      setWithProject(checked === true)
                    }
                  />
                  Ajouter un premier projet
                </label>
                {withProject ? (
                  <GroupProjectFields
                    value={project}
                    onChange={setProject}
                    members={members}
                    showStatus={false}
                  />
                ) : (
                  <p className="rounded-xl bg-gray-50 p-4 text-sm text-gray-600">
                    Le groupe sera prêt avec ses {members.length} membre(s).
                    Vous pourrez créer son premier projet depuis sa fiche.
                  </p>
                )}
                <div className="border-t border-gray-100 pt-3 text-sm text-gray-600">
                  <span className="font-semibold text-gray-900">{name}</span> ·{" "}
                  {members.length} membre(s)
                  {guarantor && ` · Garant : ${guarantor.name}`}
                  {coordinatorId
                    ? ` · Référent : ${memberName(members.find((member) => member.id === coordinatorId)!)}`
                    : ""}
                </div>
              </>
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
        </ModalBody>
        <ModalFooter className="gap-2 sm:justify-between">
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={
              step
                ? () => {
                    setStep((current) => current - 1);
                    setError("");
                  }
                : onClose
            }
          >
            {step ? (
              <>
                <ChevronLeft className="h-4 w-4" />
                Retour
              </>
            ) : (
              "Annuler"
            )}
          </Button>
          <Button
            type="button"
            className="bg-[#234D65] text-white hover:bg-[#1b3d50]"
            disabled={busy || !canManage}
            onClick={step === 2 ? submit : next}
          >
            {busy ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Création…
              </>
            ) : step === 2 ? (
              "Créer le groupe"
            ) : (
              <>
                Continuer
                <ChevronRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Dialog>
  );
}
