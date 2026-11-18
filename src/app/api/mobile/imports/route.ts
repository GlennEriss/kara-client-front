import { createHash } from 'node:crypto'
import { z } from 'zod'
import { NextRequest, NextResponse } from 'next/server'
import { canWithAccess } from '@/domains/auth/access-policy'
import { requireMobileCaller, mobileJson } from '@/domains/mobile/server/access'
import { createAdminServices } from '@/domains/mobile-admin/server/context'
import { errorResponse } from '@/domains/mobile-admin/server/gateway'
import { createServerFirestorePort } from '@/domains/finance/server/firestore-port'
import {
  beginFinanceOperation,
  endFinanceOperation,
  financeFingerprint,
} from '@/domains/finance/server/operations'
import { createMemberDatabase } from '@/db/member.db'
import { createExcelImportWriter } from '@/domains/financial/caisse-imprevue/import/excelImportWriter'
import {
  detectSheetType,
  analyzeSheet,
  analyzeMembersSheet,
  parseMembersSheet,
  parseJournaliereSheet,
} from '@/domains/financial/caisse-imprevue/import/excelImportAnalyzer'
import { POST as importDocs } from '@/app/api/import-caisse-imprevue/import-docs/route'
import { POST as migratedMember } from '@/app/api/import-caisse-imprevue/migrated-member/route'
import { POST as rollback } from '@/app/api/import-caisse-imprevue/rollback/route'
import { POST as linkUnknown } from '@/app/api/import-caisse-imprevue/link-unknown/route'
import { POST as relinkUnknown } from '@/app/api/import-caisse-imprevue/relink-unknown/route'
import { POST as fixDates } from '@/app/api/import-caisse-imprevue/fix-dates/route'
import { POST as changeUid } from '@/app/api/admin/change-uid/route'
export const runtime = 'nodejs'
export const maxDuration = 300
const modes = [
  'sheets',
  'analyze',
  'execute',
  'drift',
  'rectify',
  'rollback',
  'link-unknown',
  'relink-unknown',
  'fix-dates',
  'change-uid',
] as const
export async function POST(request: NextRequest) {
  const caller = await requireMobileCaller(request)
  if (caller instanceof NextResponse) return caller
  if (caller.mustChangePassword || !canWithAccess(caller.access, 'imports.use'))
    return mobileJson({ error: 'Import non autorisé.' }, 403)
  let operation: Awaited<ReturnType<typeof beginFinanceOperation>> | undefined
  const services = createAdminServices(caller)
  try {
    if (Number(request.headers.get('content-length') || 0) > 12 * 1024 * 1024)
      throw Error('Le fichier dépasse 10 Mo.')
    const form = await request.formData()
    const raw = form.get('payload')
    if (typeof raw !== 'string' || raw.length > 6000)
      throw Error('Formulaire invalide.')
    const input = z
      .object({
        scope: z.enum(['members', 'caisse-imprevue', 'caisse-speciale']),
        mode: z.enum(modes),
        sheetName: z.string().max(180).optional(),
        sourceFile: z.string().max(180).optional(),
        analysisHash: z.string().max(100).optional(),
        operationId: z.string().uuid(),
        confirm: z.boolean().optional(),
        fromId: z.string().max(180).optional(),
        toId: z.string().max(180).optional(),
        email: z.string().email().optional(),
        password: z.string().min(6).max(180).optional(),
        dryRun: z.boolean().optional(),
      })
      .strict()
      .parse(JSON.parse(raw))
    const token =
      request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') || ''
    const port = createServerFirestorePort(services.db)
    const members = createMemberDatabase(port)
    const handlers: Record<string, (req: NextRequest) => Promise<Response>> = {
      '/api/import-caisse-imprevue/import-docs': importDocs,
      '/api/import-caisse-imprevue/migrated-member': migratedMember,
      '/api/import-caisse-imprevue/rollback': rollback,
      '/api/import-caisse-imprevue/link-unknown': linkUnknown,
      '/api/import-caisse-imprevue/relink-unknown': relinkUnknown,
      '/api/import-caisse-imprevue/fix-dates': fixDates,
      '/api/admin/change-uid': changeUid,
    }
    const scopedFetch = (async (url: any, init: any) => {
      const handler = handlers[String(url)]
      if (!handler) throw Error('Service de migration inconnu.')
      return handler(
        new NextRequest('http://localhost' + url, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            authorization: `Bearer ${token}`,
          },
          body: init.body,
        }),
      )
    }) as typeof fetch
    const writer = createExcelImportWriter({
      ...port,
      auth: { currentUser: { getIdToken: async () => token } } as any,
      addCaisseContractToUser: members.addCaisseContractToUser,
      getActiveSettings: services.csSettings.getActiveSettings,
      fetch: scopedFetch,
    })
    const file = form.get('file')
    let workbook: import('xlsx').WorkBook | undefined
    let buffer: Buffer | undefined
    if (file instanceof File) {
      if (
        file.size > 10 * 1024 * 1024 ||
        !file.name.toLowerCase().endsWith('.xlsx')
      )
        throw Error('Choisissez un classeur .xlsx de 10 Mo maximum.')
      buffer = Buffer.from(await file.arrayBuffer())
      if (buffer[0] !== 0x50 || buffer[1] !== 0x4b)
        throw Error('Classeur invalide.')
      const XLSX = await import('xlsx')
      workbook = XLSX.read(buffer, { cellDates: true })
      if (workbook.SheetNames.length > 100)
        throw Error('Classeur trop volumineux.')
    }
    if (input.mode === 'sheets') {
      if (!workbook) throw Error('Choisissez un fichier.')
      return mobileJson({
        sheets: workbook.SheetNames.filter((name) => {
          const type = detectSheetType(name)
          return input.scope === 'members'
            ? type === 'MEMBERS'
            : input.scope === 'caisse-speciale'
              ? type.startsWith('CS_')
              : type.startsWith('CI_')
        }),
        sourceFile: (file as File).name,
      })
    }
    const sourceFile = file instanceof File ? file.name : input.sourceFile || ''
    const sheetName = input.sheetName || ''
    const analysisHash = buffer
      ? createHash('sha256')
          .update(buffer)
          .update(input.scope + '|' + sheetName)
          .digest('hex')
      : undefined
    let analysis: any,
      existing: Awaited<
        ReturnType<typeof services.users.getUsersByMatricules>
      > = new Map(),
      enrich: ReturnType<typeof parseMembersSheet> = new Map()
    if (['analyze', 'execute', 'drift', 'rectify'].includes(input.mode)) {
      if (!workbook || !buffer || !workbook.Sheets[sheetName])
        throw Error('Sélectionnez la feuille à analyser.')
      const type = detectSheetType(sheetName)
      if (
        input.scope === 'members'
          ? type !== 'MEMBERS'
          : input.scope === 'caisse-speciale'
            ? !type.startsWith('CS_')
            : !type.startsWith('CI_')
      )
        throw Error('Cette feuille n’appartient pas à la section choisie.')
      const XLSX = await import('xlsx')
      const aoa = (name: string) => {
        const sheet = workbook!.Sheets[name]
        const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1')
        if (range.e.r > 20000 || range.e.c > 1000)
          throw Error('Limitez le classeur à 20 000 lignes et 1 000 colonnes.')
        return XLSX.utils.sheet_to_json<unknown[]>(sheet, {
          header: 1,
          raw: true,
          blankrows: false,
        })
      }
      const memberSheet = workbook.SheetNames.find(
        (n) => n.trim().toUpperCase() === 'MEMBRES',
      )
      if (memberSheet) enrich = parseMembersSheet(aoa(memberSheet))
      const dailySheet = workbook.SheetNames.find(
        (n) => n.trim().toUpperCase() === 'JOURNALIERE',
      )
      analysis =
        type === 'MEMBERS'
          ? analyzeMembersSheet(sheetName, aoa(sheetName))
          : analyzeSheet(sheetName, aoa(sheetName), {
              journaliere: dailySheet
                ? parseJournaliereSheet(aoa(dailySheet))
                : undefined,
            })
      const rows = analysis.members || analysis.rows
      existing = await services.users.getUsersByMatricules(
        rows.map((r: any) => r.matricule),
      )
      if (input.mode === 'analyze')
        return mobileJson({
          analysis,
          analysisHash,
          sourceFile,
          sheetName,
          existing: [...existing.keys()],
        })
      if (input.mode === 'drift')
        return mobileJson({
          drift: Object.fromEntries(
            await writer.checkContractsDrift(analysis.rows, analysis.target),
          ),
        })
      if (input.analysisHash !== analysisHash)
        throw Error('Le fichier ou la feuille a changé. Relancez l’analyse.')
    }
    if (input.mode === 'fix-dates' && input.dryRun)
      return mobileJson({
        result: await writer.fixImportDates({
          dryRun: true,
          sourceFile: sourceFile || undefined,
        }),
      })
    if (input.mode === 'relink-unknown' && input.dryRun) {
      if (!input.toId) throw Error('Renseignez le matricule cible.')
      return mobileJson({
        result: await writer.relinkUnknown({
          dryRun: true,
          toMatricule: input.toId,
          fromId: input.fromId,
        }),
      })
    }
    if (!input.confirm)
      throw Error('Confirmez cette opération après vérification de son aperçu.')
    operation = await beginFinanceOperation(
      services.db,
      caller.claims.uid,
      input.operationId,
      `import:${input.scope}:${sourceFile}:${sheetName}`,
      await financeFingerprint({ ...input, analysisHash }, {}),
    )
    if (operation.replay)
      return mobileJson({
        success: true,
        replay: true,
        result: operation.result,
      })
    let result: unknown
    const base = { adminId: caller.claims.uid, sheetName, sourceFile }
    if (input.mode === 'execute' || input.mode === 'rectify') {
      if (input.scope === 'members')
        result = await writer.writeMembers(analysis.members, {
          ...base,
          existing,
          enrich,
        })
      else {
        let rows = analysis.rows
        if (input.mode === 'rectify') {
          const drift = await writer.checkContractsDrift(rows, analysis.target)
          rows = rows.filter(
            (r: any) =>
              drift.get(writer.contractIdForRow(r, analysis.target))?.drifted,
          )
        }
        result = await writer.writeImport(rows, {
          ...base,
          members: existing,
          forfaits: await writer.fetchForfaits(),
          memberData: enrich,
          target: analysis.target,
        })
      }
    } else if (input.mode === 'rollback') {
      if (!sourceFile || !sheetName) throw Error('Fichier et feuille requis.')
      result =
        input.scope === 'members'
          ? await writer.rollbackMembers({ sourceFile, sheetName })
          : await writer.rollbackImport({ sourceFile, sheetName })
    } else if (input.mode === 'link-unknown')
      result = await writer.linkUnknownMembers()
    else if (input.mode === 'relink-unknown')
      result = await writer.relinkUnknown({
        dryRun: false,
        toMatricule: input.toId || '',
        fromId: input.fromId,
      })
    else if (input.mode === 'fix-dates')
      result = await writer.fixImportDates({
        dryRun: false,
        sourceFile: sourceFile || undefined,
      })
    else if (input.mode === 'change-uid') {
      if (!input.email || !input.toId || !input.password)
        throw Error(
          'Renseignez l’email, le matricule et le mot de passe du compte.',
        )
      result = await writer.changeAdminUid({
        email: input.email,
        newUid: input.toId,
        password: input.password,
      })
    } else throw Error('Opération inconnue.')
    await endFinanceOperation(
      services.db,
      operation.operation,
      operation.lock,
      'DONE',
      result,
    )
    return mobileJson({ success: true, result })
  } catch (e) {
    if (operation && !operation.replay)
      await endFinanceOperation(
        services.db,
        operation.operation,
        operation.lock,
        'FAILED',
      ).catch(() => {})
    return errorResponse(e)
  }
}
