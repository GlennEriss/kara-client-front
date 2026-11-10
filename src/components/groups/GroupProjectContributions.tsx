"use client";
import { useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table } from "@/components/ui/table";
import { Loader2, RefreshCw } from "lucide-react";
import type { Group, GroupProject, User } from "@/types/types";
import { useGroupWorkspace } from "@/domains/groups/useGroupWorkspace";
import {
  configureContributions,
  listContributions,
  recordContributionPayment,
  allocateContributionFinancing,
} from "@/domains/groups/contribution-service";
import {
  plannedContribution,
  paidContribution,
  remainingContribution,
  todayLibreville,
  CONTRIBUTION_FREQUENCIES,
  contributionFrequency,
  contributionPeriodLabel,
  currentContributionPeriod,
  planPeriods,
  type ContributionFrequency,
  type ContributionPlanInput,
  type GroupContribution,
  type ContributionPayment,
} from "@/domains/groups/contribution-model";
const CreateCreditDemandModal = dynamic(
  () => import("@/components/credit-speciale/CreateCreditDemandModal"),
  { ssr: false },
);
const money = (n: number) => `${n.toLocaleString("fr-FR")} FCFA`;
export function GroupProjectContributions({
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
  const { actor, canManage, creditAccess, refresh } =
    useGroupWorkspace(groupId);
  const plan = project.contributionPlan;
  const [frequency, setFrequency] = useState<ContributionFrequency>(contributionFrequency(plan));
  const [startDate, setStartDate] = useState(plan?.startDate || todayLibreville());
  const [amount, setAmount] = useState(plan?.amount || 10000);
  const [startMonth, setStart] = useState(
    plan?.startMonth || todayLibreville().slice(0, 7),
  );
  const [months, setMonths] = useState(
    plan?.periodCount || plan?.months || Math.min(60, Math.max(1, project.participantIds.length)),
  );
  const [dueDay, setDueDay] = useState(plan?.dueDay || 5);
  const [selectedMonth, setMonth] = useState(plan ? currentContributionPeriod(plan) : "");
  const period = plan?.periods.some((p) => p.period === selectedMonth)
    ? selectedMonth
    : plan ? currentContributionPeriod(plan) : "";
  const config = CONTRIBUTION_FREQUENCIES[frequency];
  const savedFrequency = contributionFrequency(plan);
  const saved = CONTRIBUTION_FREQUENCIES[savedFrequency];
  const monthly = savedFrequency === "MONTHLY";
  const monthLabel = (p: string) => contributionPeriodLabel(p, savedFrequency);
  const configuration: ContributionPlanInput = frequency === "MONTHLY"
    ? { amount, frequency, startMonth, months, dueDay }
    : { amount, frequency, startDate, periodCount: months };
  let preview: ReturnType<typeof planPeriods> = [];
  try { preview = planPeriods(configuration); } catch { /* Le formulaire affichera l’erreur lors de sa validation. */ }
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const [payment, setPayment] = useState<{
    row: GroupContribution;
    kind: "direct" | "support";
    id: string;
  } | null>(null);
  const [paymentAmount, setPaymentAmount] = useState(0),
    [date, setDate] = useState(todayLibreville),
    [source, setSource] =
      useState<Exclude<ContributionPayment["source"], "CREDIT_FIXE">>("CASH");
  const [reference, setReference] = useState(""),
    [note, setNote] = useState("");
  const [financing, setFinancing] = useState<GroupContribution | null>(null);
  const query = useQuery({
    queryKey: ["group-contributions", groupId, project.id],
    queryFn: () => listContributions(groupId, project.id),
    enabled: !!plan,
    staleTime: 0,
    refetchOnWindowFocus: true,
  });
  const rows =
    plan?.participants.map(
      (p) =>
        query.data?.find((r) => r.period === period && r.memberId === p.id) ||
        plannedContribution(project, period, p.id),
    ) || [];
  const total = rows.reduce((n, r) => n + r.amount, 0),
    paid = rows.reduce((n, r) => n + paidContribution(r), 0);
  const act = async (action: () => Promise<unknown>) => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await action();
      setPayment(null);
      await refresh();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Impossible d’enregistrer cette opération.",
      );
    } finally {
      setBusy(false);
    }
  };
  const openPayment = (row: GroupContribution, kind: "direct" | "support") => {
    setPayment({ row, kind, id: crypto.randomUUID() });
    setPaymentAmount(remainingContribution(row));
    setDate(todayLibreville());
    setReference("");
    setNote("");
    setError("");
  };
  if (project.kind !== "TONTINE") return null;
  return (
    <section
      aria-label="Cotisations de la caisse collective"
      className="space-y-4 rounded-xl border border-[#234D65]/20 p-4"
    >
      <div className="flex justify-between gap-2">
        <div>
          <h3 className="!text-base font-semibold text-[#234D65]">
            Cotisations {plan ? saved.adjective : config.adjective}
          </h3>
          <p className="mt-1 text-xs text-gray-500">
            Les versements et les prises en charge sont enregistrés par
            l’administration.
          </p>
        </div>
        {plan && (
          <Button
            size="icon"
            variant="ghost"
            aria-label="Actualiser les cotisations"
            disabled={query.isFetching}
            onClick={() => void query.refetch()}
          >
            <RefreshCw
              className={`size-4 ${query.isFetching ? "animate-spin" : ""}`}
            />
          </Button>
        )}
      </div>
      {!plan?.locked &&
        canManage &&
        ["PLANNED", "ACTIVE"].includes(project.status) && (
          <details open={!plan} className="rounded-lg border p-3">
            <summary className="cursor-pointer text-sm font-medium">
              {plan
                ? "Modifier le cycle avant sa première opération"
                : "Configurer le cycle de cotisations"}
            </summary>
            <fieldset
              disabled={busy}
              className="mt-3 grid gap-3 sm:grid-cols-2"
            >
              <div className="sm:col-span-2">
                <Label htmlFor={`contribution-frequency-${project.id}`}>Fréquence des cotisations et des prises</Label>
                <select id={`contribution-frequency-${project.id}`} className="h-10 w-full rounded-md border bg-white px-2 text-sm"
                  value={frequency} onChange={e => {
                    const next = e.target.value as ContributionFrequency;
                    setFrequency(next);
                    setMonths(current => Math.min(current, next === "MONTHLY" ? 60 : 400));
                  }}>
                  {Object.entries(CONTRIBUTION_FREQUENCIES).map(([value, item]) => <option key={value} value={value}>{item.label}</option>)}
                </select>
                <p className="mt-1 text-xs text-gray-500">Une cotisation par membre et une prise de caisse par {config.unit}.</p>
              </div>
              <div>
                <Label htmlFor={`contribution-amount-${project.id}`}>
                  Cotisation par membre et par {config.unit} (FCFA)
                </Label>
                <Input
                  id={`contribution-amount-${project.id}`}
                  type="number"
                  min={1000}
                  max={10000000}
                  step={1}
                  value={amount || ""}
                  onChange={(e) => setAmount(Number(e.target.value))}
                />
              </div>
              <div>
                <Label htmlFor={`contribution-start-${project.id}`}>
                  {frequency === "MONTHLY" ? "Premier mois" : "Première cotisation / prise"}
                </Label>
                <Input
                  id={`contribution-start-${project.id}`}
                  type={frequency === "MONTHLY" ? "month" : "date"}
                  value={frequency === "MONTHLY" ? startMonth : startDate}
                  onChange={(e) => frequency === "MONTHLY" ? setStart(e.target.value) : setStartDate(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor={`contribution-months-${project.id}`}>
                  Nombre de {config.plural}
                </Label>
                <Input
                  id={`contribution-months-${project.id}`}
                  type="number"
                  min={1}
                  max={frequency === "MONTHLY" ? 60 : 400}
                  value={months}
                  onChange={(e) => setMonths(Number(e.target.value))}
                />
              </div>
              {frequency === "MONTHLY" && <div>
                <Label htmlFor={`contribution-day-${project.id}`}>
                  Jour d’échéance du mois
                </Label>
                <Input
                  id={`contribution-day-${project.id}`}
                  type="number"
                  min={1}
                  max={31}
                  value={dueDay}
                  onChange={(e) => setDueDay(Number(e.target.value))}
                />
              </div>}
              {!!preview.length && <div className="rounded-lg bg-[#234D65]/5 p-3 text-xs sm:col-span-2">
                <strong>{preview.length} prise(s) prévues · une par {config.unit}</strong>
                <p className="mt-1">Du {preview[0].dueDate} au {preview[preview.length - 1].dueDate}. Chaque période : {project.participantIds.length} membre(s) × {money(amount)} = {money(amount * project.participantIds.length)} de caisse brute.</p>
              </div>}
              <p className="text-xs text-gray-500 sm:col-span-2">
                Le cycle reprend les participants actuels du projet. Son
                montant, sa fréquence, ses échéances et ses participants sont conservés dès la
                première opération ; créez un nouveau projet pour un autre
                cycle. {frequency === "MONTHLY" ? "Pour un mois plus court, l’échéance tombe le dernier jour." : frequency === "WEEKLY" ? "Les échéances reviennent tous les 7 jours, au même jour de la semaine." : "Les échéances se suivent chaque jour, week-ends compris."}
              </p>
              <Button
                size="sm"
                onClick={() =>
                  void act(() =>
                    configureContributions(
                      groupId,
                      project.id,
                      configuration,
                      actor,
                    ),
                  )
                }
              >
                {busy && <Loader2 className="size-4 animate-spin" />}
                {plan ? "Enregistrer le cycle" : "Créer le cycle"}
              </Button>
            </fieldset>
          </details>
        )}
      {!plan && !canManage && (
        <p className="text-sm text-gray-500">
          Le cycle n’a pas encore été configuré par un administrateur.
        </p>
      )}
      {plan && (
        <>
          <p className="text-xs text-gray-500">
            {money(plan.amount)} par membre et par {saved.unit} · {plan.periods.length} {saved.plural} ·{" "}
            {plan.participants.length} participants
            {plan.locked ? " · Cycle enregistré" : ""}
          </p>
          <Label htmlFor={`contribution-period-${project.id}`}>
            {monthly ? "Mois de cotisation" : savedFrequency === "DAILY" ? "Jour de cotisation" : "Semaine de cotisation"}
          </Label>
          <select
            id={`contribution-period-${project.id}`}
            className="h-10 w-full rounded-md border bg-white px-2 text-sm"
            value={period}
            onChange={(e) => {
              setMonth(e.target.value);
              setPayment(null);
              setError("");
            }}
          >
            {plan.periods.map((p) => (
              <option key={p.period} value={p.period}>
                {monthLabel(p.period)}
              </option>
            ))}
          </select>
          {query.isPending && (
            <p role="status" className="text-sm">
              Chargement des versements…
            </p>
          )}
          {query.isError && (
            <p role="alert" className="text-sm text-red-700">
              Impossible de charger les versements.{" "}
              <button
                className="underline"
                onClick={() => void query.refetch()}
              >
                Réessayer
              </button>
            </p>
          )}
          {!query.isPending && !query.isError && (
            <>
              <dl className="grid grid-cols-3 gap-2 text-xs">
                {[
                  ["Attendu", total],
                  ["Réglé / pris en charge", paid],
                  ["Reste à régler", total - paid],
                ].map(([l, n]) => (
                  <div key={l} className="rounded-lg bg-gray-50 p-2">
                    <dt>{l}</dt>
                    <dd className="mt-1 font-semibold">{money(Number(n))}</dd>
                  </div>
                ))}
              </dl>
              <Table
                topScroll
                className="min-w-[700px]"
                aria-label={monthly ? "Cotisations du mois" : "Cotisations de la période"}
              >
                <thead>
                  <tr className="text-left text-xs">
                    <th className="p-2">Membre</th>
                    <th className="p-2">Cotisation</th>
                    <th className="p-2">Réglé</th>
                    <th className="p-2">Reste</th>
                    <th className="p-2">Suivi</th>
                    {canManage && <th className="p-2">Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => {
                    const remaining = remainingContribution(r);
                    const member = members.find((m) => m.id === r.memberId);
                    return (
                      <tr key={r.id} className="border-t align-top text-xs">
                        <td className="p-2 font-medium">{r.memberName}</td>
                        <td className="whitespace-nowrap p-2">
                          {money(r.amount)}
                        </td>
                        <td className="whitespace-nowrap p-2">
                          {money(paidContribution(r))}
                        </td>
                        <td className="whitespace-nowrap p-2 font-semibold">
                          {money(remaining)}
                        </td>
                        <td className="p-2">
                          {remaining === 0
                            ? r.payments.some((p) => p.source === "CREDIT_FIXE")
                              ? "Prise en charge confirmée"
                              : "Réglée"
                            : paidContribution(r) > 0
                              ? "Partiellement réglée"
                              : r.dueDate < todayLibreville()
                                ? "En retard"
                                : "À régler"}
                          {r.financingDemandId && (
                            <p className="mt-1 text-gray-500">
                              Dossier de prise en charge lié
                            </p>
                          )}
                          {creditAccess.FIXE.view && r.financingDemandId && (
                            <Link
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mt-1 block break-all text-[#234D65] underline"
                              href={`/credit-fixe/${r.financingContractId ? "contrats" : "demandes"}/${encodeURIComponent(r.financingContractId || r.financingDemandId)}`}
                            >
                              Voir le dossier
                            </Link>
                          )}
                        </td>
                        {canManage && (
                          <td className="space-y-2 p-2">
                            {remaining > 0 && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled={busy}
                                  onClick={() => openPayment(r, "direct")}
                                >
                                  Enregistrer un versement
                                </Button>
                                {creditAccess.FIXE.manage &&
                                  !r.financingDemandId && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      disabled={
                                        !member ||
                                        !group?.guarantorId ||
                                        !["PLANNED", "ACTIVE"].includes(
                                          project.status,
                                        )
                                      }
                                      onClick={() => setFinancing(r)}
                                    >
                                      Financer par crédit fixe
                                    </Button>
                                  )}
                                {creditAccess.FIXE.manage &&
                                  r.financingContractId && (
                                    <Button
                                      size="sm"
                                      disabled={busy}
                                      onClick={() => openPayment(r, "support")}
                                    >
                                      Confirmer la prise en charge
                                    </Button>
                                  )}
                              </>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
              <details className="rounded-lg border p-3">
                <summary className="cursor-pointer text-sm font-medium">
                  Historique des versements {monthly ? "du mois" : "de la période"}
                </summary>
                <ul className="mt-3 space-y-2">
                  {rows.flatMap((r) =>
                    r.payments.map((p) => (
                      <li
                        key={`${r.id}-${p.id}`}
                        className="rounded-lg bg-gray-50 p-3 text-xs"
                      >
                        <strong>
                          {r.memberName} · {money(p.amount)}
                        </strong>
                        <p>
                          {p.date} ·{" "}
                          {p.source === "CREDIT_FIXE"
                            ? "Prise en charge par crédit fixe"
                            : {
                                CASH: "Espèces",
                                AIRTEL_MONEY: "Airtel Money",
                                MOBICASH: "Mobicash",
                                BANK_TRANSFER: "Virement bancaire",
                              }[p.source]}{" "}
                          · {p.byName}
                        </p>
                        {p.reference && <p>Référence : {p.reference}</p>}
                        {p.note && <p>{p.note}</p>}
                      </li>
                    )),
                  )}
                  {rows.every((r) => !r.payments.length) && (
                    <li className="text-xs text-gray-500">
                      Aucun versement enregistré pour {monthly ? "ce mois" : "cette période"}.
                    </li>
                  )}
                </ul>
              </details>
            </>
          )}
        </>
      )}
      {payment && (
        <div
          role="region"
          aria-label="Enregistrer le règlement"
          className="space-y-3 rounded-lg border border-[#234D65]/30 bg-gray-50 p-3"
        >
          <h4 className="text-sm font-semibold">
            {payment.kind === "support"
              ? "Confirmer l’affectation du crédit fixe"
              : "Versement direct"}{" "}
            · {payment.row.memberName} · {monthLabel(payment.row.period)}
          </h4>
          {payment.kind === "support" && (
            <p className="text-xs">
              Confirmez uniquement après signature et affectation effective de
              l’avance à cette cotisation. Cette opération ne crée pas de second
              crédit.
            </p>
          )}
          <fieldset disabled={busy} className="grid gap-3 sm:grid-cols-2">
            {payment.kind === "direct" && (
              <>
                <div>
                  <Label htmlFor="contribution-payment-amount">
                    Montant versé (FCFA)
                  </Label>
                  <Input
                    id="contribution-payment-amount"
                    type="number"
                    min={1}
                    max={remainingContribution(payment.row)}
                    value={paymentAmount || ""}
                    onChange={(e) => setPaymentAmount(Number(e.target.value))}
                  />
                </div>
                <div>
                  <Label htmlFor="contribution-payment-source">
                    Moyen de paiement
                  </Label>
                  <select
                    id="contribution-payment-source"
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
                  <Label htmlFor="contribution-reference">
                    Référence (facultatif)
                  </Label>
                  <Input
                    id="contribution-reference"
                    value={reference}
                    maxLength={120}
                    onChange={(e) => setReference(e.target.value)}
                  />
                </div>
              </>
            )}
            <div>
              <Label htmlFor="contribution-payment-date">Date effective</Label>
              <Input
                id="contribution-payment-date"
                type="date"
                max={todayLibreville()}
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="contribution-payment-note">
                Note (facultatif)
              </Label>
              <Input
                id="contribution-payment-note"
                value={note}
                maxLength={500}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
          </fieldset>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              disabled={busy}
              onClick={() =>
                void act(() =>
                  payment.kind === "direct"
                    ? recordContributionPayment(
                        groupId,
                        project.id,
                        payment.row.period,
                        payment.row.memberId,
                        {
                          id: payment.id,
                          amount: paymentAmount,
                          date,
                          source,
                          reference,
                          note,
                        },
                        actor,
                      )
                    : allocateContributionFinancing(
                        groupId,
                        project.id,
                        payment.row.period,
                        payment.row.memberId,
                        { date, note },
                        actor,
                      ),
                )
              }
            >
              {busy && <Loader2 className="size-4 animate-spin" />}Confirmer
              l’enregistrement
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => setPayment(null)}
            >
              Annuler
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
      {financing && members.some((m) => m.id === financing.memberId) && (
        <CreateCreditDemandModal
          isOpen
          onClose={() => setFinancing(null)}
          initialClientId={financing.memberId}
          initialClient={members.find((m) => m.id === financing.memberId)!}
          initialCreditType="FIXE"
          lockCreditType
          initialAmount={remainingContribution(financing)}
          lockAmount
          initialCause={`Prise en charge de la cotisation de ${monthLabel(financing.period)} pour le projet « ${project.name} ».`}
          initialGuarantorId={
            group?.guarantorId !== financing.memberId
              ? group?.guarantorId
              : undefined
          }
          groupProject={{
            groupId,
            projectId: project.id,
            projectName: project.name,
            contributionId: financing.id,
            contributionPeriod: financing.period,
          }}
          onCreated={() => void refresh()}
        />
      )}
    </section>
  );
}
