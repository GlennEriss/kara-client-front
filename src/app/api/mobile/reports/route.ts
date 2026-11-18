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
    const { kind, format, textLevel, modules, blocks, annexes, ...params } = z
      .object({
        kind: z
          .enum(['report', 'details', 'contracts', 'export'])
          .default('report'),
        from: z.string().regex(/^20\d{2}-(0[1-9]|1[0-2])$/),
        to: z.string().regex(/^20\d{2}-(0[1-9]|1[0-2])$/),
        memberId: z.string().max(180).optional(),
        module: z.string().max(80).optional(),
        block: z.string().max(80).optional(),
        line: z.string().max(80).optional(),
        month: z.string().max(10).optional(),
        asOf: z.string().max(40).optional(),
        format: z.enum(['pdf', 'excel']).default('pdf'),
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
        : kind === 'contracts' || (kind === 'export' && annexes === 'yes')
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
    if (kind !== 'export') return mobileJson(data)
    const report = data.report || data
    const selectedModules = modules?.split(',')
    const selectedBlocks = blocks?.split(',')
    report.modules = report.modules
      .filter((m: any) => !selectedModules || selectedModules.includes(m.key))
      .map((m: any) => ({
        ...m,
        blocks: m.blocks.filter(
          (b: any) => !selectedBlocks || selectedBlocks.includes(b.key),
        ),
      }))
    if (!report.modules.length)
      throw Error('Sélectionnez au moins une section.')
    const contracts = (data.contracts || []).filter(
      (r: any) => !selectedModules || selectedModules.includes(r.module),
    )
    const mime =
      format === 'excel'
        ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        : 'application/pdf'
    const buffer =
      format === 'excel'
        ? Buffer.from(
            await (
              await buildFinancialReportWorkbook(report, textLevel, contracts)
            ).xlsx.writeBuffer(),
          )
        : Buffer.from(
            (
              await buildFinancialReportPdf(report, textLevel, contracts)
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
