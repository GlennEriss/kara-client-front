import { NextRequest, NextResponse } from "next/server";
import { requireAdminCaller } from "@/domains/auth/server/requireAdminCaller";
import { adminFirestore } from "@/firebase/adminFirestore";
import { buildFinancialReport } from "@/domains/financial/reports/builders/buildFinancialReport";
import { buildFinancialReportContracts } from "@/domains/financial/reports/builders/buildFinancialReportDetails";
import { loadFinancialReportSources } from "@/domains/financial/reports/services/loadFinancialReportSources";
import { loadMemberFinancialReportSources } from "@/domains/financial/reports/services/loadMemberFinancialReportSources";
import { enrichFinancialReportParties } from "@/domains/financial/reports/services/enrichFinancialReportDetails";
import {
  FINANCIAL_REPORT_MAX_MONTHS,
  MEMBER_FINANCIAL_REPORT_MAX_MONTHS,
} from "@/domains/financial/reports/entities/financial-report.types";
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
  const from = params.get("from") ?? "",
    to = params.get("to") ?? "";
  const error = periodError({ from, to }, maxMonths);
  if (error) return json({ error }, 400);
  const now = params.has("asOf") ? new Date(params.get("asOf")!) : new Date();
  if (!Number.isFinite(now.getTime()) || now.getTime() > Date.now() + 5000)
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
    const contracts = await enrichFinancialReportParties(
      adminFirestore,
      buildFinancialReportContracts(sources, report),
    );
    return json({ report, contracts, loadedAt: new Date().toISOString() });
  } catch (cause) {
    console.error(
      "[financial-reports/contracts] génération impossible:",
      cause,
    );
    return json(
      { error: "Impossible de charger le détail des contrats du bilan" },
      500,
    );
  }
}
