import { NextRequest, NextResponse } from "next/server";
import { requireAdminCaller } from "@/domains/auth/server/requireAdminCaller";
import { adminFirestore } from "@/firebase/adminFirestore";
import { buildFinancialReport } from "@/domains/financial/reports/builders/buildFinancialReport";
import { buildFinancialReportDetails } from "@/domains/financial/reports/builders/buildFinancialReportDetails";
import { loadFinancialReportSources } from "@/domains/financial/reports/services/loadFinancialReportSources";
import { loadMemberFinancialReportSources } from "@/domains/financial/reports/services/loadMemberFinancialReportSources";
import { enrichFinancialReportDetails } from "@/domains/financial/reports/services/enrichFinancialReportDetails";
import {
  FINANCIAL_REPORT_MAX_MONTHS,
  MEMBER_FINANCIAL_REPORT_MAX_MONTHS,
} from "@/domains/financial/reports/entities/financial-report.types";
import type { FinancialDetailSelection } from "@/domains/financial/reports/entities/financial-report-details.types";
import { periodError } from "@/domains/financial/reports/utils/report-months";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const caller = await requireAdminCaller(request, { superAdmin: true });
  if (caller instanceof NextResponse) return caller;
  const json = (body: unknown, status = 200) =>
    NextResponse.json(body, {
      status,
      headers: { "Cache-Control": "private, no-store" },
    });
  if (!adminFirestore)
    return json({ error: "Base de données indisponible" }, 503);
  const params = request.nextUrl.searchParams;
  const memberId = params.get("memberId")?.trim() || undefined;
  if (
    memberId &&
    (memberId.includes("/") || memberId === "." || memberId === "..")
  )
    return json({ error: "Identifiant membre invalide" }, 400);
  const maxMonths = memberId
    ? MEMBER_FINANCIAL_REPORT_MAX_MONTHS
    : FINANCIAL_REPORT_MAX_MONTHS;
  const from = params.get("from") ?? "";
  const to = params.get("to") ?? "";
  const error = periodError({ from, to }, maxMonths);
  if (error) return json({ error }, 400);
  const module = params.get("module") ?? "";
  const block = params.get("block") ?? "";
  const line = params.get("line") ?? "";
  if (
    ![
      "synthesis",
      "caisse_speciale",
      "caisse_imprevue",
      "credit_speciale",
      "credit_fixe",
      "credit_aide",
      "placements",
      "adhesions",
    ].includes(module) ||
    !["treasury", "result", "outstanding", "risks"].includes(block) ||
    !/^[a-z_]+$/.test(line)
  )
    return json({ error: "Ligne du bilan invalide" }, 400);
  const month = params.get("month") || undefined;
  if (
    month &&
    (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month) || month < from || month > to)
  )
    return json({ error: "Mois hors de la période du bilan" }, 400);
  const asOf = params.get("asOf");
  const now = asOf ? new Date(asOf) : new Date();
  if (Number.isNaN(now.getTime()) || now.getTime() > Date.now() + 5000)
    return json({ error: "Date du bilan invalide" }, 400);
  try {
    const loaded = memberId
      ? await loadMemberFinancialReportSources(adminFirestore, memberId)
      : null;
    if (memberId && !loaded) return json({ error: "Membre introuvable" }, 404);
    const sources =
      loaded?.sources ?? (await loadFinancialReportSources(adminFirestore));
    const report = buildFinancialReport(
      sources,
      { from, to, now },
      { subject: loaded?.subject, maxMonths },
    );
    const selection = {
      module,
      block,
      line,
      month,
    } as FinancialDetailSelection;
    if (
      !report.modules
        .find((m) => m.key === module)
        ?.blocks.find((b) => b.key === block)
        ?.lines.some((l) => l.key === line)
    )
      return json({ error: "Ligne du bilan introuvable" }, 404);
    const details = buildFinancialReportDetails(sources, report, selection);
    return json(await enrichFinancialReportDetails(adminFirestore, details));
  } catch (cause) {
    console.error("[financial-reports/details] génération impossible:", cause);
    return json(
      { error: "Impossible de charger les personnes et contrats concernés" },
      500,
    );
  }
}
