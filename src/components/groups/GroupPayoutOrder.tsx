"use client";

import { useState } from "react";
import { Loader2, Shuffle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { GroupProject } from "@/types/types";
import { isOpenProject } from "@/domains/groups/group-model";
import {
  activePayoutDraw,
  sameParticipants,
  shuffleParticipants,
  supportsPayoutOrder,
} from "@/domains/groups/payout-order";
import { saveGroupPayoutOrder } from "@/domains/groups/group-service";
import { useGroupWorkspace } from "@/domains/groups/useGroupWorkspace";

export function GroupPayoutOrder({
  groupId,
  project,
}: {
  groupId: string;
  project: GroupProject;
}) {
  const { actor, canManage, refresh, audit } = useGroupWorkspace(groupId);
  const [preview, setPreview] = useState<{
    ids: string[];
    expectedDrawId: string | null;
    kind: string;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const eligible = supportsPayoutOrder(project.kind);
  const current = activePayoutDraw(project);
  const history = project.payoutDraws ?? [];
  const canDraw = canManage && eligible && isOpenProject(project);
  const previewValid =
    preview &&
    sameParticipants(preview.ids, project.participantIds) &&
    preview.expectedDrawId === (project.payoutOrderDrawId ?? null) &&
    preview.kind === project.kind;
  if (!eligible && !history.length) return null;

  const draw = () => {
    setError("");
    try {
      setPreview({
        ids: shuffleParticipants(project.participantIds),
        expectedDrawId: project.payoutOrderDrawId ?? null,
        kind: project.kind,
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Le tirage a échoué.");
    }
  };
  const save = async () => {
    if (!preview || !previewValid || !canDraw || busy) return;
    setBusy(true);
    setError("");
    try {
      await saveGroupPayoutOrder(
        groupId,
        project.id,
        preview.ids,
        preview.expectedDrawId,
        actor,
      );
      setPreview(null);
      audit(`Ordre de récupération enregistré pour « ${project.name} ».`);
      await refresh();
      toast.success(
        "Ordre de récupération enregistré et visible par les membres.",
      );
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Impossible d’enregistrer cet ordre.",
      );
    } finally {
      setBusy(false);
    }
  };
  const order = (ids: string[], names: Record<string, string>) => (
    <ol className="space-y-2" aria-label="Ordre de récupération">
      {ids.map((id, index) => (
        <li
          key={id}
          className="flex items-center gap-3 rounded-lg bg-white p-2.5 text-sm"
        >
          <span
            className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[#234D65] text-xs font-semibold text-white"
            aria-label={`Position ${index + 1}`}
          >
            {index + 1}
          </span>
          <span className="min-w-0 break-words">{names[id] || id}</span>
        </li>
      ))}
    </ol>
  );
  return (
    <section
      className="space-y-3 rounded-xl border border-[#234D65]/15 bg-[#234D65]/5 p-4"
      aria-label="Tirage de l’ordre de récupération"
    >
      <div>
        <h3 className="!text-sm font-semibold text-[#234D65]">
          Ordre de récupération
        </h3>
        <p className="mt-1 text-xs text-gray-600">
          Un passage par participant, dans l’ordre tiré au sort.
        </p>
      </div>
      {!preview && current && (
        <>
          {order(current.participantIds, current.participantNames)}
          <p className="text-xs text-gray-500">
            Enregistré le {current.drawnAt.toLocaleString("fr-FR")} par{" "}
            {current.drawnByName}.
          </p>
        </>
      )}
      {!preview && !current && (
        <p className="rounded-lg bg-white p-3 text-sm text-gray-600">
          {history.length
            ? "À refaire : le type ou les participants ont changé depuis le dernier tirage. L’ancien ordre reste dans l’historique."
            : "L’ordre n’a pas encore été défini."}
        </p>
      )}
      {preview && (
        <>
          <p className="text-sm font-medium text-[#234D65]">
            Aperçu du tirage — à confirmer
          </p>
          {order(preview.ids, project.participantNames)}
          <p className="text-xs text-gray-600">
            {history.length
              ? "L’enregistrement remplace l’ordre actuel et conserve les tirages précédents dans l’historique."
              : "Cet ordre sera visible par les membres après enregistrement."}
          </p>
          {!previewValid && (
            <p role="alert" className="text-sm text-amber-800">
              Le projet a changé. Annulez cet aperçu et refaites le tirage.
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              disabled={busy || !previewValid || !canDraw}
              onClick={save}
            >
              {busy && <Loader2 className="size-4 animate-spin" />}Enregistrer
              cet ordre
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => {
                setPreview(null);
                setError("");
              }}
            >
              Annuler le tirage
            </Button>
          </div>
        </>
      )}
      {!preview && canDraw && (
        <>
          <Button
            size="sm"
            variant="outline"
            onClick={draw}
            disabled={busy || project.participantIds.length < 2}
          >
            <Shuffle className="size-4" />
            {history.length ? "Refaire le tirage" : "Tirer au sort l’ordre"}
          </Button>
          {project.participantIds.length < 2 && (
            <p className="text-xs text-gray-500">
              Ajoutez au moins deux participants au projet pour lancer le
              tirage.
            </p>
          )}
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
      {history.length > 0 && (
        <details className="rounded-lg border border-gray-200 bg-white p-3">
          <summary className="cursor-pointer text-sm font-medium">
            Historique des tirages ({history.length})
          </summary>
          <div className="mt-3 space-y-4">
            {[...history].reverse().map((item, index) => (
              <div key={item.id}>
                <p className="mb-2 text-xs text-gray-500">
                  Tirage n° {history.length - index} ·{" "}
                  {item.drawnAt.toLocaleString("fr-FR")} · {item.drawnByName}
                  {item.id === current?.id ? " · Ordre actuel" : ""}
                </p>
                {order(item.participantIds, item.participantNames)}
              </div>
            ))}
          </div>
        </details>
      )}
    </section>
  );
}
