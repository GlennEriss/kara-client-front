"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Download, ExternalLink, RefreshCw, Search } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { ListPagination } from "@/components/ui/list-pagination";
import type { FinancialReport } from "../entities/financial-report.types";
import type {
  FinancialDetailParty,
  FinancialDetailSelection,
} from "../entities/financial-report-details.types";
import { useFinancialReportDetails } from "../hooks/useFinancialReportDetails";
import { exportFinancialReportDetailsCsv } from "../exports/exportFinancialReportDetailsCsv";
import { formatReportNumber } from "../exports/report-format";
import { financialStatusLabel } from "../utils/contract-report";
import { monthLabel } from "../utils/report-months";

const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

function Party({ party }: { party: FinancialDetailParty }) {
  return (
    <div className="min-w-0">
      {party.href ? (
        <Link
          href={party.href}
          target="_blank"
          rel="noopener noreferrer"
          className="break-words font-medium text-[#234D65] underline-offset-2 hover:underline"
        >
          {party.name}
          <ExternalLink className="ml-1 inline size-3" aria-hidden />
        </Link>
      ) : (
        <p className="break-words font-medium text-gray-800">{party.name}</p>
      )}
      <p className="mt-1 break-all text-xs text-gray-500">
        {party.kind === "group"
          ? "Groupe"
          : party.kind === "applicant"
            ? "Demandeur"
            : "Membre"}
        {(party.matricule || party.id) && ` · ${party.matricule || party.id}`}
      </p>
    </div>
  );
}

export default function FinancialReportDetailDialog({
  report,
  selection,
  expectedAmount,
  onClose,
}: {
  report: FinancialReport;
  selection: FinancialDetailSelection;
  expectedAmount: number;
  onClose: () => void;
}) {
  const query = useFinancialReportDetails(report, selection);
  const [search, setSearch] = useState("");
  const [moduleFilter, setModuleFilter] = useState("");
  const [sort, setSort] = useState("amount");
  const [page, setPage] = useState(1);
  const details = query.data;
  const rows = useMemo(() => {
    const term = normalize(search.trim());
    return (details?.rows ?? [])
      .filter(
        (row) =>
          (!moduleFilter || row.module === moduleFilter) &&
          normalize(
            [
              row.party.name,
              row.party.id,
              row.party.matricule,
              row.sourceId,
              row.sourceLabel,
              row.moduleTitle,
              financialStatusLabel(row.status),
              ...row.relatedParties.map(
                (p) => `${p.name} ${p.id ?? ""} ${p.matricule ?? ""}`,
              ),
            ].join(" "),
          ).includes(term),
      )
      .sort((a, b) =>
        sort === "name"
          ? a.party.name.localeCompare(b.party.name, "fr")
          : Math.abs(b.amount) - Math.abs(a.amount) ||
            a.party.name.localeCompare(b.party.name, "fr"),
      );
  }, [details, search, moduleFilter, sort]);
  const totalPages = Math.max(1, Math.ceil(rows.length / 20));
  const currentPage = Math.min(page, totalPages);
  const period = selection.month
    ? monthLabel(selection.month)
    : `${monthLabel(report.from)} — ${monthLabel(report.to)}`;
  const amount = (value: number) =>
    `${formatReportNumber(value)}${details?.unit === "fcfa" ? " FCFA" : ""}`;
  const modules = [
    ...new Map(details?.rows.map((r) => [r.module, r.moduleTitle])).entries(),
  ];
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="flex max-h-[90dvh] min-w-0 flex-col overflow-hidden p-0 sm:!max-w-5xl">
        <DialogHeader className="shrink-0 border-b px-5 pb-4 pt-5 pr-10">
          <DialogTitle className="break-words !text-lg">
            {details?.lineLabel || "Personnes et contrats concernés"}
          </DialogTitle>
          <DialogDescription>
            {period}
            {report.subject ? ` · ${report.subject.name}` : ""}
            {details?.kind === "stock" ? " · Situation en fin de mois" : ""}
          </DialogDescription>
        </DialogHeader>
        <div className="min-h-0 space-y-4 overflow-y-auto px-4 pb-5 sm:px-5">
          {query.isPending && (
            <div
              role="status"
              aria-label="Chargement du détail"
              className="space-y-3 pt-4"
            >
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-48 w-full" />
            </div>
          )}
          {query.isError && (
            <Alert variant="destructive" className="mt-4">
              <AlertDescription>
                <p>{query.error.message}</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() => void query.refetch()}
                >
                  Réessayer
                </Button>
              </AlertDescription>
            </Alert>
          )}
          {details && (
            <>
              <p className="pt-4 text-sm text-gray-600">
                {details.description}
              </p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <div className="col-span-2 rounded-xl bg-[#234D65]/5 p-3 sm:col-span-1">
                  <p className="text-xs text-gray-500">
                    Montant détaillé
                    {details.kind === "stock" ? " en fin de période" : ""}
                  </p>
                  <p className="mt-1 text-xl font-bold text-[#234D65]">
                    {amount(details.amount)}
                  </p>
                </div>
                <div className="rounded-xl border p-3">
                  <p className="text-xs text-gray-500">Contrats / dossiers</p>
                  <p className="mt-1 text-xl font-semibold">
                    {details.rows.length}
                  </p>
                </div>
                <div className="rounded-xl border p-3">
                  <p className="text-xs text-gray-500">Personnes / groupes</p>
                  <p className="mt-1 text-xl font-semibold">
                    {
                      new Set(
                        details.rows
                          .flatMap((r) => [r.party, ...r.relatedParties])
                          .map(
                            (party) =>
                              `${party.kind}:${party.href ?? party.id ?? party.name}`,
                          ),
                      ).size
                    }
                  </p>
                </div>
              </div>
              {details.amount !== expectedAmount && (
                <Alert className="border-amber-200 bg-amber-50">
                  <AlertDescription>
                    Les données ont évolué depuis la génération du bilan : le
                    tableau affichait {amount(expectedAmount)}, le détail
                    recalculé donne {amount(details.amount)}. Régénérez le bilan
                    pour le mettre à jour.
                  </AlertDescription>
                </Alert>
              )}
              {details.reconciliationDifference !== 0 && (
                <Alert className="border-amber-200 bg-amber-50">
                  <AlertDescription>
                    Écart de ventilation :{" "}
                    {amount(details.reconciliationDifference)} entre la ligne du
                    bilan et la somme des contrats (
                    {amount(details.allocatedAmount)}). Les arrondis par contrat
                    peuvent différer de l’arrondi global ; cet écart est indiqué
                    séparément.
                  </AlertDescription>
                </Alert>
              )}
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative min-w-0 flex-1 basis-full sm:basis-56">
                  <Search
                    className="absolute left-3 top-3 size-4 text-gray-400"
                    aria-hidden
                  />
                  <Input
                    aria-label="Rechercher une personne ou un contrat"
                    placeholder="Nom, matricule, contrat…"
                    className="pl-9"
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setPage(1);
                    }}
                  />
                </div>
                {modules.length > 1 && (
                  <select
                    aria-label="Filtrer le module"
                    className="h-10 max-w-full rounded-md border px-2 text-sm"
                    value={moduleFilter}
                    onChange={(e) => {
                      setModuleFilter(e.target.value);
                      setPage(1);
                    }}
                  >
                    <option value="">Tous les modules</option>
                    {modules.map(([key, title]) => (
                      <option key={key} value={key}>
                        {title}
                      </option>
                    ))}
                  </select>
                )}
                <select
                  aria-label="Trier le détail"
                  className="h-10 max-w-full rounded-md border px-2 text-sm"
                  value={sort}
                  onChange={(e) => {
                    setSort(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="amount">Montants les plus importants</option>
                  <option value="name">Noms A–Z</option>
                </select>
                <Button
                  size="icon"
                  variant="outline"
                  aria-label="Actualiser le détail"
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
                  onClick={() => exportFinancialReportDetailsCsv(details, rows)}
                >
                  <Download className="size-4" />
                  Exporter le détail (CSV)
                </Button>
              </div>
              {!rows.length ? (
                <div className="rounded-xl border border-dashed p-8 text-center text-sm text-gray-500">
                  {details.rows.length
                    ? "Aucun résultat pour ces filtres."
                    : "Aucun contrat ou dossier ne contribue à cette ligne sur la période choisie."}
                </div>
              ) : (
                <>
                  <Table
                    topScroll
                    className="min-w-[720px]"
                    aria-label="Personnes et contrats du bilan"
                  >
                    <thead>
                      <tr className="bg-[#234D65] text-left text-xs text-white">
                        <th className="w-[30%] px-3 py-3">Personne / groupe</th>
                        <th className="w-[34%] px-3 py-3">Contrat / dossier</th>
                        <th className="px-3 py-3">Statut actuel</th>
                        <th className="px-3 py-3 text-right">
                          {details.unit === "count" ? "Nombre" : "Montant"}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows
                        .slice((currentPage - 1) * 20, currentPage * 20)
                        .map((row) => (
                          <tr
                            key={row.key}
                            className="border-t align-top text-sm"
                          >
                            <td className="max-w-64 px-3 py-3">
                              <Party party={row.party} />
                              {row.relatedParties.length > 0 && (
                                <div className="mt-2 space-y-1 border-t pt-2">
                                  <p className="text-xs text-gray-500">
                                    Personnes / groupes associés
                                  </p>
                                  {row.relatedParties.map((p, i) => (
                                    <Party key={p.id ?? i} party={p} />
                                  ))}
                                </div>
                              )}
                            </td>
                            <td className="max-w-72 px-3 py-3">
                              <p className="mb-1 text-xs text-gray-500">
                                {row.moduleTitle}
                                {row.module === "adhesions"
                                  ? " · Dossier"
                                  : row.module === "caisses_collectives" || row.module === "vehicules"
                                    ? " · Opération"
                                    : " · Contrat"}
                              </p>
                              {row.sourceHref ? (
                                <Link
                                  href={row.sourceHref}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="break-all font-mono text-xs text-[#234D65] underline-offset-2 hover:underline"
                                >
                                  {row.sourceLabel}
                                  <ExternalLink
                                    className="ml-1 inline size-3"
                                    aria-hidden
                                  />
                                </Link>
                              ) : (
                                <p className="break-all font-mono text-xs">
                                  {row.sourceLabel}
                                </p>
                              )}
                            </td>
                            <td className="px-3 py-3 text-xs text-gray-600">
                              {financialStatusLabel(row.status)}
                            </td>
                            <td
                              className={`whitespace-nowrap px-3 py-3 text-right font-semibold tabular-nums ${row.amount < 0 ? "text-red-600" : ""}`}
                            >
                              {amount(row.amount)}
                              <details className="mt-2 text-left font-normal">
                                <summary className="cursor-pointer text-xs text-[#234D65]">
                                  Par mois
                                </summary>
                                <dl className="mt-2 space-y-1 text-xs">
                                  {row.values.map((n, i) => (
                                    <div
                                      key={details.months[i]}
                                      className="flex justify-between gap-4"
                                    >
                                      <dt>{details.monthLabels[i]}</dt>
                                      <dd>{amount(n)}</dd>
                                    </div>
                                  ))}
                                </dl>
                              </details>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t bg-slate-50 font-semibold">
                        <td className="px-3 py-3 text-sm" colSpan={3}>
                          Total{" "}
                          {rows.length !== details.rows.length
                            ? "filtré"
                            : "des contrats / dossiers"}{" "}
                          · {rows.length} ligne(s)
                        </td>
                        <td className="whitespace-nowrap px-3 py-3 text-right text-sm tabular-nums">
                          {amount(
                            rows.reduce((sum, row) => sum + row.amount, 0),
                          )}
                        </td>
                      </tr>
                    </tfoot>
                  </Table>
                  {totalPages > 1 && (
                    <ListPagination
                      currentPage={currentPage}
                      totalPages={totalPages}
                      onPrev={() => setPage(currentPage - 1)}
                      onNext={() => setPage(currentPage + 1)}
                      summary={`${rows.length} contrats / dossiers`}
                    />
                  )}
                </>
              )}
              <p className="text-xs leading-relaxed text-gray-500">
                {details.kind === "stock"
                  ? "Les encours sont calculés à la fin du mois choisi, ou à la fin du dernier mois de la période. Les mois ne s’additionnent pas."
                  : "Chaque ligne ventile le montant du mois ou de la période par contrat ou dossier."}{" "}
                Les statuts affichés sont les statuts actuels. Détail actualisé
                le {new Date(details.loadedAt).toLocaleString("fr-FR")}.
              </p>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
