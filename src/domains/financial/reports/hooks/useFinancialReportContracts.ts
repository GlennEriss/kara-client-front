"use client";
import { useQuery } from "@tanstack/react-query";
import type { FinancialReport } from "../entities/financial-report.types";
import type { FinancialReportContracts } from "../entities/financial-report-details.types";
export const financialContractsKey = (report: FinancialReport) => [
  "financialReportContracts",
  report.from,
  report.to,
  report.generatedAt,
  report.subject?.memberId,
];
export async function fetchFinancialReportContracts(
  report: FinancialReport,
  signal?: AbortSignal,
): Promise<FinancialReportContracts> {
  const params = new URLSearchParams({
    from: report.from,
    to: report.to,
    asOf: report.generatedAt,
  });
  if (report.subject) params.set("memberId", report.subject.memberId);
  const response = await fetch(`/api/financial-reports/contracts?${params}`, {
    signal,
    cache: "no-store",
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(
      body?.error || "Impossible de charger les contrats du bilan",
    );
  }
  return response.json();
}
export function useFinancialReportContracts(report: FinancialReport) {
  return useQuery({
    queryKey: financialContractsKey(report),
    queryFn: ({ signal }) => fetchFinancialReportContracts(report, signal),
    staleTime: 0,
    retry: 1,
  });
}
