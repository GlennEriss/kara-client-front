"use client";

import { useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useQuery } from "@tanstack/react-query";
import {
  ExternalLink,
  Link2,
  Loader2,
  Plus,
  RefreshCw,
  Unlink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table } from "@/components/ui/table";
import type { Group, GroupProject, User } from "@/types/types";
import { memberName } from "@/domains/groups/group-model";
import {
  isOpenCreditProject,
  PREPARATION_STATUSES,
  PROJECT_CREDIT_TYPES,
  PROJECT_CREDIT_LABELS,
  type ProjectCreditType,
} from "@/domains/groups/project-credit-model";
import {
  linkProjectCredit,
  listParticipantCredits,
  loadProjectCredits,
  unlinkProjectCredit,
  unlinkProjectDemand,
} from "@/domains/groups/project-credit-service";
import { useGroupWorkspace } from "@/domains/groups/useGroupWorkspace";
import routes from "@/constantes/routes";
import { CollectiveCreditRequestDialog } from "./CollectiveCreditRequestDialog";

const CreateCreditDemandModal = dynamic(
  () => import("@/components/credit-speciale/CreateCreditDemandModal"),
  { ssr: false },
);
const money = (amount: number) =>
  `${Math.round(amount).toLocaleString("fr-FR")} FCFA`;
const creditRoutes = {
  FIXE: {
    contracts: routes.admin.creditFixeContrats,
    demands: routes.admin.creditFixeDemandes,
  },
  SPECIALE: {
    contracts: routes.admin.creditSpecialeContrats,
    demands: routes.admin.creditSpecialeDemandes,
  },
};
const label = (status: string) =>
  ({
    PENDING: "En attente",
    DRAFT: "Brouillon",
    APPROVED: "Approuvé",
    SIMULATED: "Simulé",
    ACTIVE: "Actif",
    PARTIAL: "Partiel",
    OVERDUE: "En retard",
    BLOCKED: "Bloqué",
    TRANSFORMED: "Partie fixe",
    DISCHARGED: "Déchargé",
    CLOSED: "Clos",
    WRITTEN_OFF: "En perte",
    EXTENDED: "Remplacé après rajout",
    CANCELED: "Annulé",
    REJECTED: "Rejeté",
  })[status] || status;

export function GroupProjectCredits({
  groupId,
  group,
  project,
  members,
}: {
  groupId: string;
  group?: Group;
  project: GroupProject;
  members: User[];
}) {
  const { actor, canViewCredits, canManageCredits, creditAccess, refresh } =
    useGroupWorkspace(groupId);
  const [preferredCreditType, setPreferredCreditType] =
    useState<ProjectCreditType>("FIXE");
  const viewableTypes = PROJECT_CREDIT_TYPES.filter(
    (type) => creditAccess[type].view,
  );
  const manageableTypes = PROJECT_CREDIT_TYPES.filter(
    (type) => creditAccess[type].manage,
  );
  const creditType = manageableTypes.includes(preferredCreditType)
    ? preferredCreditType
    : (manageableTypes[0] ?? preferredCreditType);
  const [participantId, setParticipantId] = useState("");
  const [attach, setAttach] = useState(false);
  const [contractId, setContractId] = useState("");
  const [creating, setCreating] = useState(false);
  const [collectiveOpen, setCollectiveOpen] = useState(false);
  const [unlinkId, setUnlinkId] = useState<{
    kind: "contract" | "demand";
    id: string;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const participant = members.find(
    (m) => m.id === participantId && project.participantIds.includes(m.id),
  );
  const canAttach = canManageCredits && isOpenCreditProject(project);
  const query = useQuery({
    queryKey: ["group-project-credits", groupId, project.id, viewableTypes],
    queryFn: () => loadProjectCredits(groupId, project.id, viewableTypes),
    enabled: !!canViewCredits,
    staleTime: 30_000,
    refetchOnWindowFocus: "always",
    refetchOnMount: "always",
  });
  const candidates = useQuery({
    queryKey: [
      "participant-project-credits",
      participant?.id,
      participant?.matricule,
    ],
    queryFn: () =>
      listParticipantCredits(
        [participant!.id, participant!.matricule].filter(
          (id): id is string => !!id,
        ),
      ),
    enabled: !!canViewCredits && attach && !!participant,
    staleTime: 0,
  });
  const available = (candidates.data ?? []).filter(
    (c) => !c.groupProject && c.creditType === creditType,
  );
  const perform = async (action: () => Promise<void>) => {
    if (!canManageCredits || busy) return;
    setBusy(true);
    setError("");
    try {
      await action();
      setUnlinkId(null);
      setAttach(false);
      setContractId("");
      await refresh();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Impossible de modifier le rattachement.",
      );
    } finally {
      setBusy(false);
    }
  };
  if (!canViewCredits)
    return (
      <section className="rounded-xl border p-4 text-sm text-gray-500">
        Le suivi des financements nécessite l’accès au crédit fixe ou spécial.
      </section>
    );
  return (
    <section
      aria-label="Financement du projet"
      className="space-y-4 rounded-xl border border-[#234D65]/20 p-4"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="!text-base font-semibold text-[#234D65]">
            Financement du projet
          </h3>
          <p className="mt-1 text-xs text-gray-500">
            Un contrat individuel par participant financé. Les cotisations et le
            tirage restent suivis séparément.
          </p>
        </div>
        <Button
          size="icon"
          variant="ghost"
          aria-label="Actualiser les financements"
          disabled={query.isFetching}
          onClick={() => void query.refetch()}
        >
          <RefreshCw
            className={`size-4 ${query.isFetching ? "animate-spin" : ""}`}
          />
        </Button>
      </div>
      {query.isPending && (
        <p role="status" className="flex gap-2 text-sm text-gray-500">
          <Loader2 className="size-4 animate-spin" />
          Chargement des financements…
        </p>
      )}
      {query.isError && (
        <p role="alert" className="text-sm text-red-700">
          Impossible de charger les crédits.{" "}
          <button className="underline" onClick={() => void query.refetch()}>
            Réessayer
          </button>
        </p>
      )}
      {query.data && (
        <>
          <dl className="grid grid-cols-2 gap-2 text-sm">
            {[
              ["Fonds remis depuis l’ouverture", query.data.totals.financed],
              ["Remboursements reçus", query.data.totals.repayments],
              ["Reste dû à ce jour", query.data.totals.outstanding],
              ["Intérêts encaissés", query.data.totals.interestCollected],
              ["Pénalités encaissées", query.data.totals.penaltiesCollected],
            ].map(([title, value]) => (
              <div key={title} className="min-w-0 rounded-lg bg-gray-50 p-3">
                <dt className="text-xs text-gray-500">{title}</dt>
                <dd className="mt-1 break-words font-semibold text-[#234D65]">
                  {money(Number(value))}
                </dd>
              </div>
            ))}
          </dl>
          {query.data.contracts.length === 0 && (
            <p className="text-sm text-gray-500">
              Aucun contrat de crédit lié à ce projet.
            </p>
          )}
          {query.data.contracts.length > 0 && (
            <Table
              topScroll
              className="min-w-[620px]"
              aria-label="Crédits du projet"
            >
              <thead>
                <tr className="bg-gray-50 text-left text-xs">
                  <th className="p-2">Participant / contrat</th>
                  <th className="p-2">Type</th>
                  <th className="p-2">Statut</th>
                  <th className="p-2 text-right">Fonds remis</th>
                  <th className="p-2 text-right">Remboursé</th>
                  <th className="p-2 text-right">Reste dû</th>
                  {canManageCredits && (
                    <th className="p-2">
                      <span className="sr-only">Actions</span>
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {query.data.contracts.map((c) => (
                  <tr key={c.id} className="border-t align-top text-xs">
                    <td className="max-w-52 p-2">
                      <p className="break-words font-medium">{c.clientName}</p>
                      <Link
                        href={`${creditRoutes[c.creditType].contracts}/${encodeURIComponent(c.id)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 block break-all text-[#234D65] underline"
                      >
                        {c.id}
                        <ExternalLink className="ml-1 inline size-3" />
                      </Link>
                      {!project.participantIds.includes(c.clientId) &&
                        !members.some(
                          (member) =>
                            project.participantIds.includes(member.id) &&
                            member.matricule === c.clientId,
                        ) && (
                          <p className="mt-1 text-gray-500">
                            Participant historique
                          </p>
                        )}
                    </td>
                    <td className="p-2 whitespace-nowrap">
                      {PROJECT_CREDIT_LABELS[c.creditType]}
                    </td>
                    <td className="p-2">
                      {label(c.status)}
                      {PREPARATION_STATUSES.has(c.status) && (
                        <p className="mt-1 text-gray-500">Fonds non remis</p>
                      )}
                    </td>
                    <td className="whitespace-nowrap p-2 text-right">
                      {money(c.financed)}
                    </td>
                    <td className="whitespace-nowrap p-2 text-right">
                      {money(c.repayments)}
                    </td>
                    <td className="whitespace-nowrap p-2 text-right font-semibold">
                      {money(c.outstanding)}
                    </td>
                    {canManageCredits && (
                      <td className="p-2">
                        {creditAccess[c.creditType].manage && (
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`Détacher le contrat ${c.id}`}
                            disabled={busy}
                            onClick={() =>
                              setUnlinkId({ kind: "contract", id: c.id })
                            }
                          >
                            <Unlink className="size-4" />
                          </Button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
          {query.data.demands.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Demandes sans contrat lié</h4>
              {query.data.demands.map((d) => (
                <div
                  key={d.id}
                  className="flex items-start gap-2 rounded-lg bg-gray-50"
                >
                  <Link
                    key={d.id}
                    href={`${creditRoutes[d.creditType as ProjectCreditType].demands}/${encodeURIComponent(d.id)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block rounded-lg bg-gray-50 p-3 text-xs text-[#234D65]"
                  >
                    <span className="font-medium">
                      {d.clientFirstName} {d.clientLastName}
                    </span>{" "}
                    · {PROJECT_CREDIT_LABELS[d.creditType as ProjectCreditType]}{" "}
                    · {label(d.status)}
                    <span className="mt-1 block break-all underline">
                      {d.id} <ExternalLink className="inline size-3" />
                    </span>
                  </Link>
                  {creditAccess[d.creditType as ProjectCreditType].manage && (
                    <Button
                      className="mt-2 mr-2 shrink-0"
                      variant="ghost"
                      size="icon"
                      aria-label={`Détacher la demande ${d.id}`}
                      disabled={busy}
                      onClick={() => setUnlinkId({ kind: "demand", id: d.id })}
                    >
                      <Unlink className="size-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
          <p className="text-xs text-gray-500">
            Les contrats en préparation ne sont pas comptés comme fonds remis.
            Les montants reprennent le moteur du bilan financier, depuis
            l’ouverture des crédits ; ce récapitulatif ne crée aucune seconde
            dette.
          </p>
        </>
      )}
      {canAttach && (
        <div className="space-y-2 rounded-xl bg-[#234D65]/5 p-4">
          <h4 className="text-sm font-semibold text-[#234D65]">
            Financer l’achat ensemble
          </h4>
          <p className="text-xs text-gray-600">
            Répartissez le montant entre les participants : une demande de
            crédit fixe sera créée pour chacun, avec le garant du groupe.
          </p>
          {creditAccess.FIXE.manage && (
            <Button
              size="sm"
              disabled={!group?.guarantorId || !project.participantIds.length}
              onClick={() => setCollectiveOpen(true)}
            >
              Demande collective de crédit fixe
            </Button>
          )}
          {!group?.guarantorId && (
            <p className="text-xs text-amber-800">
              Renseignez le garant dans les informations du groupe pour utiliser
              la demande collective.
            </p>
          )}
          {group?.guarantorName && (
            <p className="text-xs text-gray-600">
              Garant : {group.guarantorName}
            </p>
          )}
        </div>
      )}
      {canAttach && (
        <fieldset disabled={busy} className="space-y-3 border-t pt-3">
          <label
            className="block text-sm font-medium"
            htmlFor={`project-credit-participant-${project.id}`}
          >
            Participant à financer
          </label>
          <select
            id={`project-credit-participant-${project.id}`}
            className="h-10 w-full rounded-md border bg-white px-2 text-sm"
            value={participantId}
            onChange={(e) => {
              setParticipantId(e.target.value);
              setContractId("");
              setError("");
            }}
          >
            <option value="">Choisir un participant</option>
            {members
              .filter((m) => project.participantIds.includes(m.id))
              .map((m) => (
                <option key={m.id} value={m.id}>
                  {memberName(m)}
                </option>
              ))}
          </select>
          <label
            className="block text-sm font-medium"
            htmlFor={`project-credit-type-${project.id}`}
          >
            Type de financement
          </label>
          <select
            id={`project-credit-type-${project.id}`}
            className="h-10 w-full rounded-md border bg-white px-2 text-sm"
            value={creditType}
            onChange={(e) => {
              setPreferredCreditType(e.target.value as ProjectCreditType);
              setContractId("");
              setError("");
            }}
          >
            {manageableTypes.map((type) => (
              <option key={type} value={type}>
                {PROJECT_CREDIT_LABELS[type]}
                {type === "FIXE" ? " (recommandé)" : ""}
              </option>
            ))}
          </select>
          <p className="text-xs text-gray-500">
            {creditType === "FIXE"
              ? "Intérêts calculés une seule fois : le montant à rembourser est connu dès le départ."
              : "Dans le modèle mensuel classique, les intérêts du crédit spécial sont calculés sur le reste dû pendant la phase spéciale."}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              disabled={!participant}
              onClick={() => setCreating(true)}
            >
              <Plus className="size-4" />
              Nouvelle demande de crédit
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={!participant}
              onClick={() => setAttach((v) => !v)}
            >
              <Link2 className="size-4" />
              Rattacher un contrat existant
            </Button>
          </div>
          {attach && participant && (
            <div className="space-y-2 rounded-lg bg-gray-50 p-3">
              {candidates.isPending ? (
                <p className="text-sm">
                  Recherche des contrats du participant…
                </p>
              ) : candidates.isError ? (
                <p className="text-sm text-red-700">
                  Impossible de charger les contrats.{" "}
                  <button
                    onClick={() => void candidates.refetch()}
                    className="underline"
                  >
                    Réessayer
                  </button>
                </p>
              ) : available.length === 0 ? (
                <p className="text-sm text-gray-500">
                  Aucun contrat de{" "}
                  {PROJECT_CREDIT_LABELS[creditType].toLowerCase()} non rattaché
                  pour ce participant.
                </p>
              ) : (
                <>
                  <label
                    className="sr-only"
                    htmlFor={`project-existing-credit-${project.id}`}
                  >
                    Contrat à rattacher
                  </label>
                  <select
                    id={`project-existing-credit-${project.id}`}
                    className="h-10 w-full max-w-full rounded-md border bg-white px-2 text-sm"
                    value={contractId}
                    onChange={(e) => setContractId(e.target.value)}
                  >
                    <option value="">Choisir un contrat</option>
                    {available.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.id} · {PROJECT_CREDIT_LABELS[creditType]} ·{" "}
                        {money(c.amount)} · {label(c.status)}
                      </option>
                    ))}
                  </select>
                  <Button
                    size="sm"
                    disabled={!available.some((c) => c.id === contractId)}
                    onClick={() =>
                      void perform(() =>
                        linkProjectCredit(
                          groupId,
                          project.id,
                          contractId,
                          actor,
                          creditType,
                        ),
                      )
                    }
                  >
                    {busy && <Loader2 className="size-4 animate-spin" />}
                    Confirmer le rattachement
                  </Button>
                </>
              )}
            </div>
          )}
        </fieldset>
      )}
      {unlinkId && (
        <div className="space-y-3 rounded-lg bg-amber-50 p-3 text-sm">
          <p>
            {unlinkId.kind === "contract"
              ? "Détacher ce contrat du projet ? Le crédit et ses remboursements restent inchangés ; le membre doit toujours rembourser selon son contrat."
              : "Détacher cette demande du projet ? La demande est conservée et son parcours de validation continue séparément du groupe."}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => setUnlinkId(null)}
            >
              Annuler
            </Button>
            <Button
              size="sm"
              disabled={busy}
              onClick={() =>
                void perform(() =>
                  unlinkId.kind === "contract"
                    ? unlinkProjectCredit(
                        groupId,
                        project.id,
                        unlinkId.id,
                        actor,
                      )
                    : unlinkProjectDemand(
                        groupId,
                        project.id,
                        unlinkId.id,
                        actor,
                      ),
                )
              }
            >
              Confirmer le détachement
            </Button>
          </div>
        </div>
      )}
      {error && (
        <p
          role="alert"
          className="rounded-lg bg-red-50 p-3 text-sm text-red-700"
        >
          {error}
        </p>
      )}
      {creating && participant && (
        <CreateCreditDemandModal
          isOpen
          onClose={() => setCreating(false)}
          initialClientId={participant.id}
          initialClient={participant}
          initialGuarantorId={
            group?.guarantorId &&
            ![participant.id, participant.matricule].includes(group.guarantorId)
              ? group.guarantorId
              : undefined
          }
          initialCreditType={creditType}
          lockCreditType
          groupProject={{
            groupId,
            projectId: project.id,
            projectName: project.name,
          }}
          onCreated={() => {
            void refresh();
          }}
        />
      )}
      {collectiveOpen && group && (
        <CollectiveCreditRequestDialog
          group={group}
          project={project}
          members={members}
          onClose={() => setCollectiveOpen(false)}
          onCreated={() => void refresh()}
        />
      )}
    </section>
  );
}
