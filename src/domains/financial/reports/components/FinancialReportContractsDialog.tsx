"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import {
  Download,
  ExternalLink,
  Loader2,
  Search,
  RefreshCw,
  ChevronDown,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ListPagination } from "@/components/ui/list-pagination";
import type {
  FinancialReport,
  FinancialReportModuleKey,
} from "../entities/financial-report.types";
import type { FinancialContractReport } from "../entities/financial-report-details.types";
import { useFinancialReportContracts } from "../hooks/useFinancialReportContracts";
import {
  formatReportNumber,
  reportPeriodLabel,
} from "../exports/report-format";
import {
  financialReportChanged,
  financialSearch,
  financialStatusLabel,
} from "../utils/contract-report";
import { exportFinancialContractsCsv } from "../exports/exportFinancialContractsCsv";
const value = (c: FinancialContractReport, block: string, line: string) =>
  c.blocks.find((b) => b.key === block)?.lines.find((l) => l.key === line)
    ?.total ?? 0;
export function ContractMonthlyTables({
  contract,
  report,
}: {
  contract: FinancialContractReport;
  report: FinancialReport;
}) {
  const [showZero, setShowZero] = useState(false);
  return (
    <div className="space-y-4">
      {!!contract.facts.length && (
        <dl className="grid gap-3 rounded-lg bg-gray-50 p-3 text-xs sm:grid-cols-2">
          {contract.facts.map((f) => (
            <div key={f.label}>
              <dt className="text-gray-500">{f.label}</dt>
              <dd className="mt-1 font-medium">{f.value}</dd>
            </div>
          ))}
        </dl>
      )}
      <label className="flex items-center gap-2 text-xs text-gray-600">
        <input
          type="checkbox"
          checked={showZero}
          onChange={(e) => setShowZero(e.target.checked)}
        />
        Afficher aussi les lignes à zéro
      </label>
      {contract.blocks.map((block) => {
        const lines = block.lines.filter(
          (l) => showZero || l.values.some((v) => v !== 0),
        );
        if (!lines.length) return null;
        return (
          <section key={block.key} className="space-y-2">
            <h4 className="text-sm font-semibold text-[#234D65]">
              {block.title}
            </h4>
            <Table
              topScroll
              className="min-w-[650px]"
              aria-label={`${block.title} du contrat ${contract.sourceLabel}`}
            >
              <thead>
                <tr className="bg-slate-100 text-xs text-left">
                  <th className="min-w-60 p-2">Indicateur</th>
                  {report.monthLabels.map((m, i) => (
                    <th
                      key={report.months[i]}
                      className="whitespace-nowrap p-2 text-right"
                    >
                      {m}
                    </th>
                  ))}
                  <th className="whitespace-nowrap p-2 text-right">
                    Total / fin
                  </th>
                </tr>
              </thead>
              <tbody>
                {lines.map((l) => (
                  <tr
                    key={l.key}
                    className={`border-t text-xs ${l.level === "total" || l.level === "subtotal" ? "bg-slate-50 font-semibold" : ""}`}
                  >
                    <td className="p-2" title={l.description}>
                      {l.label}
                      {l.kind === "stock" && (
                        <span className="block font-normal text-gray-500">
                          Situation en fin de mois
                        </span>
                      )}
                      {l.level === "info" && (
                        <span className="block font-normal text-gray-500">
                          Pour information
                        </span>
                      )}
                    </td>
                    {[...l.values, l.total].map((n, i) => (
                      <td
                        key={i}
                        className={`whitespace-nowrap p-2 text-right tabular-nums ${n < 0 ? "text-red-600" : ""}`}
                      >
                        {formatReportNumber(n)}
                        {l.unit === "count" ? "" : " F"}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </Table>
          </section>
        );
      })}
      <p className="text-xs text-gray-500">
        Les flux s’additionnent sur la période. Les encours correspondent à la
        fin du mois, sans additionner les mois. Le statut et les informations du
        dossier sont actuels.
      </p>
    </div>
  );
}
export default function FinancialReportContractsDialog({
  report,
  initialModule,
  onClose,
}: {
  report: FinancialReport;
  initialModule?: FinancialReportModuleKey;
  onClose: () => void;
}) {
  const query = useFinancialReportContracts(report);
  const [search, setSearch] = useState(""),
    [module, setModule] = useState(
      initialModule === "synthesis" ? "" : (initialModule ?? ""),
    ),
    [status, setStatus] = useState("");
  const [page, setPage] = useState(1),
    [expanded, setExpanded] = useState<string | null>(null);
  const contracts = useMemo(() => query.data?.contracts ?? [], [query.data]);
  const rows = useMemo(() => {
    const term = financialSearch(search.trim());
    return contracts.filter(
      (c) =>
        (!module || c.module === module) &&
        (!status || c.status === status) &&
        financialSearch(
          [
            c.party.name,
            c.party.matricule,
            c.party.id,
            c.sourceLabel,
            c.sourceId,
            c.moduleTitle,
            financialStatusLabel(c.status),
            ...c.relatedParties.map((p) => `${p.name} ${p.matricule ?? ""}`),
          ].join(" "),
        ).includes(term),
    );
  }, [contracts, module, status, search]);
  const current = Math.min(page, Math.max(1, Math.ceil(rows.length / 20)));
  const modules = [
    ...new Map(contracts.map((c) => [c.module, c.moduleTitle])).entries(),
  ];
  const statuses = [...new Set(contracts.map((c) => c.status))].sort();
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="flex max-h-[90dvh] min-w-0 flex-col overflow-hidden p-0 sm:!max-w-6xl">
        <DialogHeader className="shrink-0 border-b px-5 pb-4 pt-5 pr-10">
          <DialogTitle>Contrats et dossiers du bilan</DialogTitle>
          <DialogDescription>
            {reportPeriodLabel(report)}
            {report.subject ? ` · ${report.subject.name}` : ""} · Tous les
            dossiers qui contribuent aux chiffres de la période.
          </DialogDescription>
        </DialogHeader>
        <div className="min-h-0 space-y-4 overflow-y-auto p-4 sm:p-5">
          {query.isPending && (
            <p role="status" className="flex items-center gap-2 text-sm">
              <Loader2 className="size-4 animate-spin" />
              Chargement des contrats et de leurs chiffres…
            </p>
          )}
          {query.isError && (
            <Alert variant="destructive">
              <AlertDescription>
                {query.error.message}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void query.refetch()}
                >
                  Réessayer
                </Button>
              </AlertDescription>
            </Alert>
          )}
          {query.data && (
            <>
              {financialReportChanged(report, query.data.report) && (
                <Alert className="border-amber-200 bg-amber-50">
                  <AlertDescription>
                    Les données ont évolué depuis la génération du bilan. Les
                    dossiers ci-dessous sont actualisés ; régénérez le bilan
                    pour aligner les tableaux et les exports.
                  </AlertDescription>
                </Alert>
              )}
              <div className="flex flex-wrap gap-2">
                <div className="relative min-w-0 flex-1 basis-full sm:basis-60">
                  <Search className="absolute left-3 top-3 size-4 text-gray-400" />
                  <Input
                    aria-label="Rechercher dans les contrats du bilan"
                    placeholder="Nom, matricule, référence du contrat…"
                    className="pl-9"
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setPage(1);
                    }}
                  />
                </div>
                <select
                  aria-label="Module des contrats"
                  className="h-10 max-w-full rounded-md border px-2 text-sm"
                  value={module}
                  onChange={(e) => {
                    setModule(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="">Tous les modules</option>
                  {modules.map(([k, l]) => (
                    <option key={k} value={k}>
                      {l}
                    </option>
                  ))}
                </select>
                <select
                  aria-label="Statut des contrats"
                  className="h-10 max-w-full rounded-md border px-2 text-sm"
                  value={status}
                  onChange={(e) => {
                    setStatus(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="">Tous les statuts</option>
                  {statuses.map((s) => (
                    <option key={s} value={s}>
                      {financialStatusLabel(s)}
                    </option>
                  ))}
                </select>
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="Actualiser les contrats du bilan"
                  disabled={query.isFetching}
                  onClick={() => void query.refetch()}
                >
                  <RefreshCw
                    className={`size-4 ${query.isFetching ? "animate-spin" : ""}`}
                  />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!rows.length}
                  onClick={() =>
                    exportFinancialContractsCsv(query.data!.report, rows)
                  }
                >
                  <Download className="size-4" />
                  Détail complet (CSV)
                </Button>
              </div>
              <p className="text-xs text-gray-500">
                {rows.length} contrat(s), dossier(s) ou opération(s) · Ouvrez «
                Détail mensuel » pour consulter chaque indicateur. Les exports
                Excel et PDF du bilan peuvent également inclure ces annexes.
              </p>
              {!rows.length ? (
                <p className="rounded-lg border border-dashed p-6 text-center text-sm text-gray-500">
                  Aucun dossier pour cette période ou ces filtres.
                </p>
              ) : (
                <ul className="space-y-3">
                  {rows.slice((current - 1) * 20, current * 20).map((c) => (
                    <li
                      key={c.key}
                      className="min-w-0 space-y-3 rounded-xl border p-3 sm:p-4"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs text-gray-500">
                            {c.moduleTitle} · {c.sourceKind} ·{" "}
                            {financialStatusLabel(c.status)}
                          </p>
                          <p className="mt-1 break-words text-sm font-semibold text-[#234D65]">
                            {c.party.href ? (
                              <Link
                                href={c.party.href}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hover:underline"
                              >
                                {c.party.name}
                              </Link>
                            ) : (
                              c.party.name
                            )}
                            {c.party.matricule && (
                              <span className="ml-2 font-normal text-gray-500">
                                {c.party.matricule}
                              </span>
                            )}
                          </p>
                          <p className="mt-1 break-all text-xs">
                            {c.sourceLabel}
                          </p>
                          {!!c.relatedParties.length && (
                            <p className="mt-1 text-xs text-gray-500">
                              Personnes / groupes associés :{" "}
                              {c.relatedParties.map((p) => p.name).join(", ")}
                            </p>
                          )}
                        </div>
                        {c.sourceHref && (
                          <Button asChild variant="outline" size="sm">
                            <Link
                              href={c.sourceHref}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <ExternalLink className="size-3" />
                              Ouvrir la fiche
                            </Link>
                          </Button>
                        )}
                      </div>
                      <dl className="grid grid-cols-3 gap-2 text-xs">
                        {[
                          [
                            "Entrées / affectations",
                            value(c, "treasury", "in_total"),
                          ],
                          ["Sorties", value(c, "treasury", "out_total")],
                          ["Résultat", value(c, "result", "net")],
                        ].map(([l, n]) => (
                          <div key={l} className="rounded-lg bg-slate-50 p-2">
                            <dt className="text-gray-500">{l}</dt>
                            <dd
                              className={`mt-1 font-semibold tabular-nums ${Number(n) < 0 ? "text-red-600" : ""}`}
                            >
                              {formatReportNumber(Number(n))} FCFA
                            </dd>
                          </div>
                        ))}
                      </dl>
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label={`Détail mensuel du dossier ${c.sourceLabel}`}
                        aria-expanded={expanded === c.key}
                        onClick={() =>
                          setExpanded(expanded === c.key ? null : c.key)
                        }
                      >
                        <ChevronDown
                          className={`size-4 ${expanded === c.key ? "rotate-180" : ""}`}
                        />
                        Détail mensuel
                      </Button>
                      {expanded === c.key && (
                        <ContractMonthlyTables
                          contract={c}
                          report={query.data!.report}
                        />
                      )}
                    </li>
                  ))}
                </ul>
              )}
              {rows.length > 20 && (
                <ListPagination
                  currentPage={current}
                  totalPages={Math.ceil(rows.length / 20)}
                  onPrev={() => setPage(current - 1)}
                  onNext={() => setPage(current + 1)}
                  summary={`${rows.length} contrats / dossiers`}
                />
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
