"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { GroupProject } from "@/types/types";
import { useGroupWorkspace } from "@/domains/groups/useGroupWorkspace";
import { listContributions } from "@/domains/groups/contribution-service";
import {
  paidContribution,
  todayLibreville,
  contributionFrequency,
  contributionPeriodLabel,
  currentContributionPeriod,
  CONTRIBUTION_FREQUENCIES,
} from "@/domains/groups/contribution-model";
import {
  activePayoutDraw,
  sameParticipants,
} from "@/domains/groups/payout-order";
import {
  configurePayoutFee,
  listGroupPayouts,
  recordGroupPayout,
  type PayoutInput,
} from "@/domains/groups/payout-service";
const money = (n: number) => `${n.toLocaleString("fr-FR")} FCFA`;
export function GroupProjectPayouts(props: {
  groupId: string;
  project: GroupProject;
}) {
  return props.project.kind === "TONTINE" && props.project.contributionPlan ? (
    <PayoutWorkspace {...props} />
  ) : null;
}
function PayoutWorkspace({
  groupId,
  project,
}: {
  groupId: string;
  project: GroupProject;
}) {
  const { actor, canManage, refresh } = useGroupWorkspace(groupId);
  const plan = project.contributionPlan!;
  const frequency = contributionFrequency(plan);
  const unit = CONTRIBUTION_FREQUENCIES[frequency].unit;
  const monthLabel = (p: string) => contributionPeriodLabel(p, frequency);
  const [selected, setSelected] = useState(() => currentContributionPeriod(plan));
  const period =
    plan.periods.find((p) => p.period === selected)?.period ||
    currentContributionPeriod(plan) ||
    "";
  const [enabled, setEnabled] = useState(project.payoutFee?.enabled ?? false);
  const [fee, setFee] = useState(project.payoutFee?.amount || 1000);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [recipient, setRecipient] = useState(""),
    [date, setDate] = useState(todayLibreville);
  const [source, setSource] = useState<PayoutInput["source"]>("CASH");
  const [reference, setReference] = useState(""),
    [note, setNote] = useState("");
  const [preview, setPreview] = useState<PayoutInput | null>(null);
  const payouts = useQuery({
    queryKey: ["group-payouts", groupId, project.id],
    queryFn: () => listGroupPayouts(groupId, project.id),
    staleTime: 0,
  });
  const contributions = useQuery({
    queryKey: ["group-contributions", groupId, project.id],
    queryFn: () => listContributions(groupId, project.id),
    staleTime: 0,
  });
  const gross = plan.amount * plan.participants.length;
  const retained = project.payoutFee?.enabled ? project.payoutFee.amount : 0;
  const already = payouts.data?.find((p) => p.period === period);
  const complete =
    plan.participants.length > 0 &&
    plan.participants.every((p) => {
      const row = contributions.data?.find(
        (r) => r.memberId === p.id && r.period === period,
      );
      return row && paidContribution(row) === plan.amount;
    });
  const draw = activePayoutDraw(project);
  const suggestion =
    draw &&
    sameParticipants(
      draw.participantIds,
      plan.participants.map((p) => p.id),
    )
      ? draw.participantIds[plan.periods.findIndex((p) => p.period === period)]
      : "";
  const beneficiaryId = recipient || suggestion || "";
  const beneficiary = plan.participants.find((p) => p.id === beneficiaryId);
  const act = async (action: () => Promise<unknown>) => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await action();
      setPreview(null);
      await refresh();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Impossible d’enregistrer la remise.",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <section
      aria-label="Remises de la caisse collective"
      className="space-y-4 rounded-xl border border-[#234D65]/20 p-4"
    >
      <div>
        <h3 className="!text-base font-semibold text-[#234D65]">
          Remises aux bénéficiaires
        </h3>
        <p className="mt-1 text-xs text-gray-500">
          Une remise par {unit}, après règlement de toutes les cotisations de la période.
          L’enregistrement constate une remise effective ; il ne déclenche aucun
          transfert.
        </p>
      </div>
      <div className="rounded-lg bg-gray-50 p-3 text-sm">
        Redevance Kara actuelle : <strong>{money(retained)} par remise</strong>
        {!project.payoutFee?.enabled && " · Désactivée"}
      </div>
      {canManage && ["PLANNED", "ACTIVE"].includes(project.status) && (
        <details className="rounded-lg border p-3">
          <summary className="cursor-pointer text-sm font-medium">
            Configurer la redevance facultative
          </summary>
          <fieldset disabled={busy} className="mt-3 space-y-3">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
              />
              Retenir une redevance Kara à chaque remise
            </label>
            {enabled && (
              <div>
                <Label htmlFor={`payout-fee-${project.id}`}>
                  Montant fixe par remise (FCFA)
                </Label>
                <Input
                  id={`payout-fee-${project.id}`}
                  type="number"
                  min={1}
                  max={gross - 1}
                  step={1}
                  value={fee || ""}
                  onChange={(e) => setFee(Number(e.target.value))}
                />
              </div>
            )}
            <p className="text-xs text-gray-500">
              Le bénéficiaire reçoit le montant de la caisse moins cette
              retenue. Une modification s’applique uniquement aux remises à
              venir.
            </p>
            <Button
              size="sm"
              onClick={() =>
                void act(() =>
                  configurePayoutFee(
                    groupId,
                    project.id,
                    { enabled, amount: fee },
                    actor,
                  ),
                )
              }
            >
              Enregistrer la redevance
            </Button>
          </fieldset>
        </details>
      )}
      <div>
        <Label htmlFor={`payout-period-${project.id}`}>{frequency === "MONTHLY" ? "Mois de remise" : frequency === "DAILY" ? "Jour de remise" : "Semaine de remise"}</Label>
        <select
          id={`payout-period-${project.id}`}
          className="h-10 w-full rounded-md border bg-white px-2 text-sm"
          value={period}
          onChange={(e) => {
            setSelected(e.target.value);
            setRecipient("");
            setPreview(null);
            setError("");
          }}
        >
          {plan.periods.map((p) => (
            <option key={p.period} value={p.period}>
              {monthLabel(p.period)}
            </option>
          ))}
        </select>
      </div>
      {payouts.isPending || contributions.isPending ? (
        <p role="status" className="text-sm">
          Chargement des remises…
        </p>
      ) : payouts.isError || contributions.isError ? (
        <p role="alert" className="text-sm text-red-700">
          Impossible de charger le suivi.{" "}
          <button
            className="underline"
            onClick={() =>
              void Promise.all([payouts.refetch(), contributions.refetch()])
            }
          >
            Réessayer
          </button>
        </p>
      ) : already ? (
        <div className="rounded-lg bg-green-50 p-3 text-sm">
          <strong>Remise enregistrée à {already.beneficiaryName}</strong>
          <p>
            {already.date} · Brut {money(already.grossAmount)} · Redevance{" "}
            {money(already.feeAmount)} · Net remis {money(already.netAmount)}
          </p>
          <p className="mt-1 text-xs">
            Enregistrée par {already.byName}. Les montants sont conservés dans
            l’historique.
          </p>
        </div>
      ) : (
        <>
          <dl className="grid gap-2 text-sm sm:grid-cols-3">
            {[
              ["Montant de la caisse", gross],
              ["Redevance Kara retenue", retained],
              ["Net au bénéficiaire", gross - retained],
            ].map(([l, n]) => (
              <div key={l} className="rounded-lg bg-gray-50 p-3">
                <dt className="text-xs text-gray-500">{l}</dt>
                <dd className="mt-1 font-semibold">{money(Number(n))}</dd>
              </div>
            ))}
          </dl>
          {!complete && (
            <p className="text-sm text-amber-800">
              En attente du règlement ou de la prise en charge de toutes les
              cotisations de cette période.
            </p>
          )}
          {canManage && complete && project.status !== "CANCELLED" && (
            <>
              <fieldset
                disabled={busy || !!preview}
                className="grid gap-3 sm:grid-cols-2"
              >
                <div className="sm:col-span-2">
                  <Label htmlFor={`payout-recipient-${project.id}`}>
                    Bénéficiaire de la remise
                  </Label>
                  <select
                    id={`payout-recipient-${project.id}`}
                    className="h-10 w-full rounded-md border bg-white px-2 text-sm"
                    value={beneficiaryId}
                    onChange={(e) => setRecipient(e.target.value)}
                  >
                    <option value="">Choisir un participant</option>
                    {plan.participants.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                  {suggestion && (
                    <p className="mt-1 text-xs text-gray-500">
                      L’ordre de passage propose le bénéficiaire. Vérifiez ce
                      choix avant de confirmer.
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor={`payout-date-${project.id}`}>
                    Date effective de remise
                  </Label>
                  <Input
                    id={`payout-date-${project.id}`}
                    type="date"
                    max={todayLibreville()}
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor={`payout-source-${project.id}`}>
                    Moyen de remise
                  </Label>
                  <select
                    id={`payout-source-${project.id}`}
                    className="h-10 w-full rounded-md border bg-white px-2 text-sm"
                    value={source}
                    onChange={(e) => setSource(e.target.value as typeof source)}
                  >
                    <option value="CASH">Espèces</option>
                    <option value="AIRTEL_MONEY">Airtel Money</option>
                    <option value="MOBICASH">Mobicash</option>
                    <option value="BANK_TRANSFER">Virement bancaire</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor={`payout-reference-${project.id}`}>
                    Référence (facultatif)
                  </Label>
                  <Input
                    id={`payout-reference-${project.id}`}
                    maxLength={120}
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor={`payout-note-${project.id}`}>
                    Note (facultatif)
                  </Label>
                  <Input
                    id={`payout-note-${project.id}`}
                    maxLength={500}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                  />
                </div>
              </fieldset>
              {!preview ? (
                <Button
                  size="sm"
                  disabled={!beneficiary || busy}
                  onClick={() => {
                    setError("");
                    setPreview({
                      operationId: crypto.randomUUID(),
                      beneficiaryId,
                      date,
                      source,
                      reference,
                      note,
                      expectedGross: gross,
                      expectedFee: retained,
                    });
                  }}
                >
                  Vérifier la remise
                </Button>
              ) : (
                <div className="space-y-3 rounded-lg border border-[#234D65]/30 bg-gray-50 p-3 text-sm">
                  <p>
                    Confirmer la remise effective de{" "}
                    <strong>
                      {money(preview.expectedGross - preview.expectedFee)}
                    </strong>{" "}
                    à{" "}
                    <strong>
                      {
                        plan.participants.find(
                          (p) => p.id === preview.beneficiaryId,
                        )?.name
                      }
                    </strong>{" "}
                    le {preview.date}.
                  </p>
                  <p>
                    Caisse : {money(preview.expectedGross)} · Redevance retenue
                    par Kara : {money(preview.expectedFee)}. Cette opération est
                    définitive.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      disabled={busy}
                      onClick={() =>
                        void act(() =>
                          recordGroupPayout(
                            groupId,
                            project.id,
                            period,
                            preview,
                            actor,
                          ),
                        )
                      }
                    >
                      {busy
                        ? "Enregistrement…"
                        : "Confirmer la remise effective"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy}
                      onClick={() => setPreview(null)}
                    >
                      Modifier
                    </Button>
                  </div>
                </div>
              )}
            </>
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
      {!!payouts.data?.length && (
        <details className="rounded-lg border p-3">
          <summary className="cursor-pointer text-sm font-medium">
            Historique des remises ({payouts.data.length})
          </summary>
          <ul className="mt-3 space-y-3">
            {payouts.data.map((p) => (
              <li key={p.id} className="rounded-lg bg-gray-50 p-3 text-xs">
                <strong>
                  {contributionPeriodLabel(p.period, p.frequency ?? frequency)} · {p.beneficiaryName}
                </strong>
                <p className="mt-1">
                  Caisse {money(p.grossAmount)} · Redevance {money(p.feeAmount)}{" "}
                  · Net remis {money(p.netAmount)}
                </p>
                <p>
                  {p.date} ·{" "}
                  {p.source === "CASH"
                    ? "Espèces"
                    : p.source === "BANK_TRANSFER"
                      ? "Virement bancaire"
                      : p.source === "AIRTEL_MONEY"
                        ? "Airtel Money"
                        : "Mobicash"}{" "}
                  · {p.byName}
                </p>
                {p.reference && <p>Référence : {p.reference}</p>}
                {p.note && <p>{p.note}</p>}
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}
