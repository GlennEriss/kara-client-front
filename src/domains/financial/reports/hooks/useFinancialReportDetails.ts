"use client";

import { useQuery } from "@tanstack/react-query";
import type { FinancialReport } from "../entities/financial-report.types";
import type {
  FinancialDetailSelection,
  FinancialReportDetails,
} from "../entities/financial-report-details.types";

export function useFinancialReportDetails(
  report: FinancialReport,
  selection: FinancialDetailSelection,
) {
  return useQuery<FinancialReportDetails>({
    queryKey: [
      "financialReportDetails",
      report.from,
      report.to,
      report.generatedAt,
      report.subject?.memberId,
      selection.module,
      selection.block,
      selection.line,
      selection.month,
    ],
    staleTime: 0,
    retry: 1,
    queryFn: async ({ signal }) => {
      const params = new URLSearchParams({
        from: report.from,
        to: report.to,
        asOf: report.generatedAt,
        module: selection.module,
        block: selection.block,
        line: selection.line,
      });
      if (selection.month) params.set("month", selection.month);
      if (report.subject) params.set("memberId", report.subject.memberId);
      const response = await fetch(`/api/financial-reports/details?${params}`, {
        signal,
        cache: "no-store",
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(
          body?.error || "Impossible de charger le détail du bilan",
        );
      }
      return response.json() as Promise<FinancialReportDetails>;
    },
  });
}
