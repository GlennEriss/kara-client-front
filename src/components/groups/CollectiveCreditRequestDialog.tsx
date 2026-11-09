"use client";

import { useState } from "react";
import Link from "next/link";
import { Dialog } from "@/components/ui/dialog";
import {
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Wallet, Loader2 } from "lucide-react";
import type { Group, GroupProject, User } from "@/types/types";
import { memberName } from "@/domains/groups/group-model";
import {
  splitCollectiveCredit,
  validateCollectiveCredit,
} from "@/domains/groups/collective-credit-model";
import { createCollectiveCreditRequest } from "@/domains/groups/project-credit-service";
import { useGroupWorkspace } from "@/domains/groups/useGroupWorkspace";
import {
  GroupGuarantorPicker,
  type GroupGuarantorChoice,
} from "./GroupGuarantorPicker";

const money = (n: number) => `${n.toLocaleString("fr-FR")} FCFA`;
const today = () => new Date().toLocaleDateString("en-CA");
export function CollectiveCreditRequestDialog({
  group,
  project,
  members,
  onClose,
  onCreated,
}: {
  group: Group;
  project: GroupProject;
  members: User[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const { actor, creditAccess } = useGroupWorkspace(group.id);
  const participants = members.filter(
    (m) =>
      project.participantIds.includes(m.id) ||
      (!!m.matricule && project.participantIds.includes(m.matricule)),
  );
  const [selectedIds, setSelectedIds] = useState(() =>
    participants.map((m) => m.id),
  );
  const [totalAmount, setTotalAmount] = useState(project.estimatedBudget || 0);
  const [amounts, setAmounts] = useState<Record<string, number>>({});
  const [overrides, setOverrides] = useState<
    Record<string, GroupGuarantorChoice | null>
  >({});
  const [desiredDate, setDesiredDate] = useState(today);
  const [cause, setCause] = useState(
    `Financement de l’achat collectif « ${project.name} ».`,
  );
  const [step, setStep] = useState(0);
  const [requestId] = useState(() => crypto.randomUUID());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [createdIds, setCreatedIds] = useState<string[] | null>(null);
  const shares = splitCollectiveCredit(
    Number.isSafeInteger(totalAmount) && totalAmount >= 0 ? totalAmount : 0,
    selectedIds,
  ).map((s) => ({
    ...s,
    amount: amounts[s.memberId] ?? s.amount,
    ...(overrides[s.memberId]
      ? { guarantorId: overrides[s.memberId]!.id }
      : {}),
  }));
  const selectedMembers = selectedIds.map((id) =>
    participants.find((m) => m.id === id)!,
  );
  const selfGuarantor = (member: User) =>
    member.id === group.guarantorId || member.matricule === group.guarantorId;
  const guarantorName = (member: User) =>
    overrides[member.id]?.name || group.guarantorName || "Garant du groupe";
  const validate = () => {
    validateCollectiveCredit({ totalAmount, shares, desiredDate, cause });
    if (!group.guarantorId)
      throw new Error(
        "Renseignez le garant du groupe avant de créer les demandes.",
      );
    if (selectedMembers.some((m) => selfGuarantor(m) && !overrides[m.id]))
      throw new Error(
        "Le garant du groupe participe à l’emprunt : choisissez un autre garant pour sa propre part.",
      );
  };
  const submit = async () => {
    if (busy || !creditAccess.FIXE.manage || createdIds) return;
    setError("");
    try {
      validate();
      setBusy(true);
      const ids = await createCollectiveCreditRequest(
        {
          requestId,
          groupId: group.id,
          projectId: project.id,
          expectedGuarantorId: group.guarantorId!,
          totalAmount,
          shares,
          desiredDate,
          cause,
        },
        actor,
      );
      setCreatedIds(ids);
      onCreated();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Impossible de créer les demandes. Vous pouvez réessayer sans les dupliquer.",
      );
    } finally {
      setBusy(false);
    }
  };
  const allocated = shares.reduce((n, s) => n + s.amount, 0);
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !busy) onClose();
      }}
    >
      <ModalContent size="4xl" showCloseButton={!busy}>
        <ModalHeader
          icon={Wallet}
          className="[&_[data-slot=dialog-title]]:break-words"
          title={
            <>
              {createdIds
                ? `${createdIds.length} demande${createdIds.length > 1 ? "s" : ""} créée${createdIds.length > 1 ? "s" : ""}`
                : "Demande collective de crédit fixe"}
            </>
          }
          description={
            <>
              {project.name} ·{" "}
              {createdIds
                ? "Chaque membre dispose de sa propre demande en attente."
                : "Répartissez le financement entre les participants avant de créer leurs demandes individuelles."}
            </>
          }
        />
        <ModalBody key={step} className="space-y-4">
          {!createdIds && (
            <p className="rounded-lg bg-[#234D65]/5 p-3 text-sm">
              Garant du groupe :{" "}
              <strong>{group.guarantorName || "À renseigner"}</strong>. Le
              montant et la sélection recalculent les parts égales, que vous
              pouvez ensuite modifier.
            </p>
          )}
          {!createdIds && step === 0 && (
            <fieldset disabled={busy} className="space-y-4">
              <div>
                <Label htmlFor="collective-credit-total">
                  Montant total à financer (FCFA)
                </Label>
                <Input
                  id="collective-credit-total"
                  type="number"
                  min={1000}
                  step={1}
                  value={totalAmount || ""}
                  onChange={(e) => {
                    setTotalAmount(Number(e.target.value));
                    setAmounts({});
                  }}
                />
              </div>
              <div>
                <Label htmlFor="collective-credit-date">Date souhaitée</Label>
                <Input
                  id="collective-credit-date"
                  type="date"
                  value={desiredDate}
                  onChange={(e) => setDesiredDate(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="collective-credit-cause">
                  Motif de la demande
                </Label>
                <Textarea
                  id="collective-credit-cause"
                  maxLength={500}
                  value={cause}
                  onChange={(e) => setCause(e.target.value)}
                />
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="!text-sm font-semibold">
                  Participants financés ({shares.length})
                </h3>
                <Button
                  variant="outline"
                  type="button"
                  size="sm"
                  onClick={() => setAmounts({})}
                >
                  Répartir à parts égales
                </Button>
              </div>
              <div className="space-y-2">
                {participants.map((m) => {
                  const share = shares.find((s) => s.memberId === m.id);
                  return (
                    <div key={m.id} className="space-y-3 rounded-xl border p-3">
                      <label className="flex items-center gap-2 text-sm font-medium">
                        <Checkbox
                          checked={!!share}
                          onCheckedChange={(checked) => {
                            setSelectedIds((ids) =>
                              checked
                                ? [...ids, m.id]
                                : ids.filter((id) => id !== m.id),
                            );
                            setAmounts({});
                          }}
                        />
                        {memberName(m)}
                      </label>
                      {share && (
                        <>
                          <div>
                            <Label htmlFor={`collective-share-${m.id}`}>
                              Part de {memberName(m)} (FCFA)
                            </Label>
                            <Input
                              id={`collective-share-${m.id}`}
                              type="number"
                              min={1000}
                              max={10000000}
                              step={1}
                              value={share.amount || ""}
                              onChange={(e) =>
                                setAmounts((values) => ({
                                  ...values,
                                  [m.id]: Number(e.target.value),
                                }))
                              }
                            />
                          </div>
                          {selfGuarantor(m) ? (
                            <>
                              <p className="text-xs text-amber-800">
                                Ce participant est le garant du groupe : il ne
                                peut pas garantir sa propre part.
                              </p>
                              <GroupGuarantorPicker
                                label={`Autre garant pour ${memberName(m)} *`}
                                value={overrides[m.id] || null}
                                excludeIds={[m.id]}
                                onChange={(v) =>
                                  setOverrides((values) => ({
                                    ...values,
                                    [m.id]: v,
                                  }))
                                }
                              />
                            </>
                          ) : (
                            <p className="text-xs text-gray-500">
                              Garant : {guarantorName(m)}
                            </p>
                          )}
                        </>
                      )}
                    </div>
                  );
                })}
                {!participants.length && (
                  <p className="text-sm text-gray-500">
                    Ajoutez des participants au projet pour demander ce
                    financement.
                  </p>
                )}
              </div>
              <p
                aria-live="polite"
                className={`rounded-lg p-3 text-sm ${allocated === totalAmount ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-900"}`}
              >
                Total réparti : {money(allocated)} sur {money(totalAmount)}
                {allocated !== totalAmount &&
                  ` · Écart à corriger : ${money(totalAmount - allocated)}`}
              </p>
            </fieldset>
          )}
          {(step === 1 || createdIds) && (
            <>
              <div className="rounded-lg bg-gray-50 p-3 text-sm">
                <strong>{money(totalAmount)}</strong> répartis entre{" "}
                {shares.length} membre{shares.length > 1 ? "s" : ""}. Date
                souhaitée :{" "}
                {new Date(`${desiredDate}T12:00:00`).toLocaleDateString(
                  "fr-FR",
                )}
                .
              </div>
              <ul className="space-y-2">
                {shares.map((s, i) => (
                  <li
                    key={s.memberId}
                    className="rounded-xl border p-3 text-sm"
                  >
                    <p className="font-semibold">
                      {memberName(selectedMembers[i])} · {money(s.amount)}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      Garant : {guarantorName(selectedMembers[i])}
                    </p>
                    {createdIds && (
                      <Link
                        className="mt-2 block break-all text-[#234D65] underline"
                        href={`/credit-fixe/demandes/${encodeURIComponent(createdIds[i])}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {createdIds[i]}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
              <p className="text-sm text-gray-600">
                Chaque demande sera examinée séparément avant la création et la
                signature du contrat. Aucun crédit n’est approuvé ni aucun fonds
                remis par cette opération.
              </p>
            </>
          )}
          {error && (
            <p
              role="alert"
              className="rounded-lg bg-red-50 p-3 text-sm text-red-700"
            >
              {error}
            </p>
          )}
        </ModalBody>
        <ModalFooter>
          <Button
            variant="outline"
            disabled={busy}
            onClick={
              createdIds || step === 0
                ? onClose
                : () => {
                    setStep(0);
                    setError("");
                  }
            }
          >
            {createdIds
              ? "Fermer"
              : step
                ? "Modifier la répartition"
                : "Annuler"}
          </Button>
          {!createdIds && (
            <Button
              disabled={busy || !creditAccess.FIXE.manage}
              onClick={
                step === 0
                  ? () => {
                      try {
                        validate();
                        setStep(1);
                        setError("");
                      } catch (e) {
                        setError((e as Error).message);
                      }
                    }
                  : () => void submit()
              }
            >
              {busy && <Loader2 className="size-4 animate-spin" />}
              {step === 0
                ? "Vérifier la répartition"
                : `Créer ${shares.length} demande${shares.length > 1 ? "s" : ""} de crédit fixe`}
            </Button>
          )}
        </ModalFooter>
      </ModalContent>
    </Dialog>
  );
}
