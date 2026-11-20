import type jsPDF from 'jspdf'
export interface FinancePdfDelivery {
  logo: { dataUrl: string; width: number; height: number } | null
  deliver: (document: jsPDF, filename: string) => void | Promise<void>
}
