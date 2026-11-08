import type {
  FinancialReportBlockKey,
  FinancialReportLineKind,
  FinancialReportLineUnit,
  FinancialReportModuleKey,
  MonthKey,
} from "./financial-report.types";

export interface FinancialDetailSelection {
  module: FinancialReportModuleKey;
  block: FinancialReportBlockKey;
  line: string;
  /** Absent = colonne Total / fin. */
  month?: MonthKey;
}

export interface FinancialDetailParty {
  id?: string;
  name: string;
  matricule?: string;
  kind: "member" | "group" | "applicant";
  href?: string;
}

export interface FinancialDetailRow {
  key: string;
  module: FinancialReportModuleKey;
  moduleTitle: string;
  sourceId: string;
  sourceLabel: string;
  sourceHref?: string;
  status: string;
  party: FinancialDetailParty;
  relatedParties: FinancialDetailParty[];
  /** Valeurs mensuelles ; pour un stock, ne pas additionner les mois. */
  values: number[];
  amount: number;
}

export interface FinancialReportDetails {
  selection: FinancialDetailSelection;
  lineLabel: string;
  description: string;
  kind: FinancialReportLineKind;
  unit: FinancialReportLineUnit;
  from: MonthKey;
  to: MonthKey;
  months: MonthKey[];
  monthLabels: string[];
  reportGeneratedAt: string;
  loadedAt: string;
  amount: number;
  allocatedAmount: number;
  reconciliationDifference: number;
  rows: FinancialDetailRow[];
}
