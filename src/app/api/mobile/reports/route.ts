import {
  selectReportContent,
  REPORT_BLOCK_KEYS,
} from '@/domains/financial/reports/exports/export-options'
import { z } from 'zod'
import { NextRequest, NextResponse } from 'next/server'
import { requireMobileCaller, mobileJson } from '@/domains/mobile/server/access'
import { GET as reportGET } from '@/app/api/financial-reports/route'
import { GET as contractsGET } from '@/app/api/financial-reports/contracts/route'
import { GET as detailsGET } from '@/app/api/financial-reports/details/route'
import { GET as memberGET } from '@/app/api/financial-reports/member/route'
import { buildFinancialReportPdf } from '@/domains/financial/reports/exports/exportFinancialReportPdf'
import { buildFinancialReportWorkbook } from '@/domains/financial/reports/exports/exportFinancialReportExcel'
import { errorResponse } from '@/domains/mobile-admin/server/gateway'
import { FINANCIAL_REPORT_GUIDE } from '@/domains/financial/reports/entities/financial-report-guide'
import { financialDetailsCsv } from '@/domains/financial/reports/exports/exportFinancialReportDetailsCsv'
import { financialContractsCsv } from '@/domains/financial/reports/exports/exportFinancialContractsCsv'
import {
  financialSearch,
  financialStatusLabel,
  selectContractContent,
} from '@/domains/financial/reports/utils/contract-report'
import { readApplicationFile } from '@/domains/mobile-admin/server/files'
import { canWithAccess } from '@/domains/auth/access-policy'
export const runtime = 'nodejs'
export async function GET(request: NextRequest) {
  const caller = await requireMobileCaller(request)
  if (caller instanceof NextResponse) return caller
  if (!caller.access.isSuperAdmin || caller.mustChangePassword)
    return mobileJson(
      { error: 'Cette section est réservée au SuperAdmin.' },
      403,
    )
  try {
    const {
      kind,
      format,
      textLevel,
      modules,
      blocks,
      annexes,
      search,
      status,
      moduleFilter,
      sourceKey,
      factIndex,
      ...params
    } = z
      .object({
        kind: z
          .enum(['report', 'details', 'contracts', 'export', 'attachment'])
          .default('report'),
        from: z.string().regex(/^20\d{2}-(0[1-9]|1[0-2])$/),
        to: z.string().regex(/^20\d{2}-(0[1-9]|1[0-2])$/),
        memberId: z.string().max(180).optional(),
        all: z.literal('1').optional(),
        module: z.string().max(80).optional(),
        block: z.string().max(80).optional(),
        line: z.string().max(80).optional(),
        month: z.string().max(10).optional(),
        asOf: z.string().max(40).optional(),
        format: z.enum(['pdf', 'excel', 'csv']).default('pdf'),
        search: z.string().max(180).default(''),
        status: z.string().max(80).default(''),
        moduleFilter: z.string().max(80).default(''),
        sourceKey: z.string().max(500).optional(),
        factIndex: z.coerce.number().int().min(0).max(100).optional(),
        textLevel: z.enum(['full', 'minimal', 'none']).default('full'),
        modules: z.string().max(1000).optional(),
        blocks: z.string().max(1000).optional(),
        annexes: z.enum(['yes', 'no']).default('no'),
      })
      .strict()
      .parse(Object.fromEntries(request.nextUrl.searchParams))
    const handler =
      kind === 'details'
        ? detailsGET
        : kind === 'contracts' ||
            kind === 'attachment' ||
            (kind === 'export' && annexes === 'yes')
          ? contractsGET
          : params.memberId
            ? memberGET
            : reportGET
    const inner = new NextRequest(
      'http://localhost/api/financial-reports?' +
        new URLSearchParams(
          Object.fromEntries(
            Object.entries(params).filter(([, v]) => v !== undefined),
          ) as Record<string, string>,
        ),
      { headers: request.headers },
    )
    const response = await handler(inner)
    const data = await response.json()
    if (!response.ok) return mobileJson(data, response.status)
    if (kind === 'attachment') {
      if (!canWithAccess(caller.access, 'documents.download'))
        return mobileJson({ error: 'Téléchargement non autorisé.' }, 403)
      const source = data.contracts?.find((c: any) => c.key === sourceKey)
      const href = source?.facts?.[factIndex ?? -1]?.href
      if (typeof href !== 'string')
        throw Error('Justificatif introuvable dans ce bilan.')
      return mobileJson(await readApplicationFile(href))
    }
    const filtered = (rows: any[]) =>
      rows.filter(
        (r) =>
          (!moduleFilter || r.module === moduleFilter) &&
          (!status || financialStatusLabel(r.status) === status) &&
          financialSearch(
            [
              r.party?.name,
              r.party?.matricule,
              r.sourceId,
              r.sourceLabel,
              r.moduleTitle,
              financialStatusLabel(r.status),
              ...(r.relatedParties || []).map(
                (p: any) => `${p.name} ${p.matricule || ''}`,
              ),
            ].join(' '),
          ).includes(financialSearch(search)),
      )
    if (format === 'csv') {
      if (!['details', 'contracts'].includes(kind))
        throw Error('Choisissez un détail à exporter en CSV.')
      const csv =
        kind === 'details'
          ? financialDetailsCsv(data, filtered(data.rows))
          : financialContractsCsv(data.report, filtered(data.contracts))
      return mobileJson({
        base64: Buffer.from(csv).toString('base64'),
        mime: 'text/csv',
        filename: `LE-KARA-${kind}-${params.from}-${params.to}.csv`,
      })
    }
    if (kind === 'details')
      data.rows = data.rows.map((row: any) => ({
        ...row,
        displayStatus: financialStatusLabel(row.status),
      }))
    if (kind === 'contracts')
      data.contracts = data.contracts.map((row: any) => ({
        ...row,
        displayStatus: financialStatusLabel(row.status),
      }))
    if (kind !== 'export')
      return mobileJson({
        ...data,
        ...(kind === 'report' ? { guide: FINANCIAL_REPORT_GUIDE } : {}),
      })
    const report = data.report || data
    const selectedModules = modules?.split(',')
    const selectedBlocks = blocks?.split(',')
    const options = {
      modules: report.modules
        .filter((m: any) => !selectedModules || selectedModules.includes(m.key))
        .map((m: any) => m.key),
      blocks: REPORT_BLOCK_KEYS.filter(
        (key) => !selectedBlocks || selectedBlocks.includes(key),
      ),
    }
    const selection = selectReportContent(report, options)
    if (!selection.modules.length)
      throw Error('Sélectionnez au moins une section et une partie du bilan.')
    const contracts = selectContractContent(data.contracts || [], options)
    const mime =
      format === 'excel'
        ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        : 'application/pdf'
    const buffer =
      format === 'excel'
        ? Buffer.from(
            await (
              await buildFinancialReportWorkbook(
                selection,
                textLevel,
                contracts,
              )
            ).xlsx.writeBuffer(),
          )
        : Buffer.from(
            (
              await buildFinancialReportPdf(selection, textLevel, contracts)
            ).output('arraybuffer'),
          )
    return mobileJson({
      base64: buffer.toString('base64'),
      mime,
      filename: `LE-KARA-bilan-${params.from}-${params.to}.${format === 'excel' ? 'xlsx' : 'pdf'}`,
    })
  } catch (e) {
    return errorResponse(e)
  }
}
