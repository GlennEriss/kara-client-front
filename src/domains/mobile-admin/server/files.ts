/* eslint-disable no-restricted-imports -- Adaptateur natif utilisant les services et modèles métier existants du site. */
import { buildCharityContributionReceipt } from '@/services/bienfaiteur/charityContributionReceipt'
import {
  generatePlacementFacturePDF,
  buildPlacementFacturePage1Data,
  mapCommissionToPlacementVersement,
  hasRecordedPlacementCommission,
} from '@/services/placement/facturePlacementPdfExport'
import { nativePdfLogo } from './pdf-logo'
import { z } from 'zod'
import { NextResponse, type NextRequest } from 'next/server'
import { getStorage } from 'firebase-admin/storage'
import { adminApp } from '@/firebase/admin'
import { canWithAccess } from '@/domains/auth/access-policy'
import { renderToBuffer } from '@react-pdf/renderer'
import { createElement } from 'react'
import PlacementPDF from '@/components/placement/PlacementContractPDF'
import PlacementQuittance from '@/components/placement/PlacementFinalQuittancePDF'
import PlacementEarlyQuittance from '@/components/placement/PlacementEarlyExitQuittancePDF'
import StatutsPDF from '@/components/statuts/StatutsKaraPDF'
import ReglementPDF from '@/components/statuts/ReglementInterieurPDF'
import { mobileJson } from '@/domains/mobile/server/access'
import { identifier } from '@/domains/finance/actions'
import {
  adminAccess,
  datasetOf,
  readTarget,
  errorResponse,
  listSchema,
} from './gateway'
import { readRows, filterRows, relatedRows } from './read-model'
import { safePublicRecord, redactAdminAmounts } from './registry'
const schema = z
  .object({
    dataset: identifier.optional(),
    type: z.enum([
      'export',
      'document',
      'contract',
      'quittance',
      'early-quittance',
      'receipt',
      'official',
    ]),
    format: z.enum(['pdf', 'excel', 'csv']).optional(),
    filters: z.string().max(4000).optional(),
    key: z.string().max(200).optional(),
    related: identifier.optional(),
    childId: identifier.optional(),
  })
  .strict()
const payload = (
  data: Uint8Array | Buffer,
  mime: string,
  filename: string,
) => ({ base64: Buffer.from(data).toString('base64'), mime, filename })
const flatten = (
  record: any,
  prefix = '',
): Record<string, string | number | boolean> =>
  Object.fromEntries(
    Object.entries(record).flatMap(
      ([k, v]): [string, string | number | boolean][] =>
        v == null || /(url|path|signature|searchable)/i.test(k)
          ? []
          : typeof v === 'object'
            ? Object.entries(flatten(v, prefix + k + '.'))
            : typeof v === 'string' ||
                typeof v === 'number' ||
                typeof v === 'boolean'
              ? [[prefix + k, v]]
              : [],
    ),
  )
export async function getAdminFile(
  request: NextRequest,
  key: string,
  id: string,
) {
  const access = await adminAccess(request, key)
  if (access instanceof NextResponse) return access
  try {
    const input = schema.parse(Object.fromEntries(request.nextUrl.searchParams))
    const dataset = datasetOf(access.module, input.dataset)
    if (
      !canWithAccess(
        access.caller.access,
        input.type === 'export'
          ? `${access.module.permission}.export`
          : 'documents.download',
      ) &&
      !(
        input.type === 'export' &&
        ['references', 'geography', 'groups', 'journal'].includes(key) &&
        canWithAccess(
          access.caller.access,
          `${access.module.permission}.${key === 'journal' ? 'view' : 'manage'}`,
        )
      )
    )
      return mobileJson({ error: 'Téléchargement non autorisé.' }, 403)
    if (input.type === 'export') {
      const filters = listSchema
        .omit({ dataset: true })
        .parse(input.filters ? JSON.parse(input.filters) : {})
      const rows = filterRows(
        await readRows(access.services, access.module, dataset, access.caller),
        filters,
        key,
      ).map((r) =>
        flatten(
          safePublicRecord(
            redactAdminAmounts(
              r,
              access.caller.access.restrictedRole !== 'AgentRecouvrement',
            ),
          ),
        ),
      )
      if (rows.length > 2000)
        throw Error(
          'Limitez l’export à 2 000 résultats en précisant les filtres.',
        )
      const columns = [...new Set(rows.flatMap((r) => Object.keys(r)))]
      if (input.format === 'csv') {
        const cell = (v: unknown) =>
          '"' + String(v ?? '').replace(/"/g, '""') + '"'
        const csv =
          '\uFEFF' +
          [
            columns.map(cell).join(','),
            ...rows.map((r) => columns.map((k) => cell(r[k])).join(',')),
          ].join('\r\n')
        return mobileJson(
          payload(
            Buffer.from(csv, 'utf8'),
            'text/csv',
            `LE-KARA-${key}-${dataset.key}.csv`,
          ),
        )
      }
      if (input.format === 'excel') {
        const { Workbook } = await import('exceljs')
        const workbook = new Workbook()
        workbook.creator = 'LE KARA'
        const sheet = workbook.addWorksheet(access.module.label.slice(0, 31))
        sheet.columns = columns.map((k) => ({ header: k, key: k, width: 26 }))
        rows.forEach((r) => sheet.addRow(r))
        sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }
        sheet.getRow(1).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF234D65' },
        }
        return mobileJson(
          payload(
            Buffer.from(await workbook.xlsx.writeBuffer()),
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            `LE-KARA-${key}-${dataset.key}.xlsx`,
          ),
        )
      }
      const { jsPDF } = await import('jspdf')
      const autoTable = (await import('jspdf-autotable')).default
      const pdf = new jsPDF({ orientation: 'landscape' })
      pdf.setFontSize(18).text(`LE KARA — ${access.module.label}`, 12, 18)
      autoTable(pdf, {
        startY: 28,
        head: [columns],
        body: rows.map((r) => columns.map((k) => String(r[k] ?? ''))),
        horizontalPageBreak: true,
        horizontalPageBreakRepeat: columns.includes('id') ? 0 : undefined,
        headStyles: { fillColor: [35, 77, 101] },
        styles: { fontSize: 8, cellWidth: 35 },
      })
      return mobileJson(
        payload(
          Buffer.from(pdf.output('arraybuffer')),
          'application/pdf',
          `LE-KARA-${key}-${dataset.key}.pdf`,
        ),
      )
    }
    const row = await readTarget(
      access.services,
      access.module,
      dataset,
      id,
      access.caller,
    )
    if (key === 'bienfaiteur' && input.type === 'receipt') {
      const event = await access.services.charityEvents.getEventById(id)
      if (!event) throw Error('Collecte introuvable.')
      const contributions =
        await access.services.charityContributions.getEventContributions(id)
      const contribution = contributions.find((c) => c.id === input.childId)
      if (!contribution)
        throw Error('Contribution introuvable dans cette collecte.')
      const { doc, fileName } = await buildCharityContributionReceipt(
        contribution,
        event,
      )
      return mobileJson(
        payload(
          Buffer.from(doc.output('arraybuffer')),
          'application/pdf',
          fileName,
        ),
      )
    }
    if (key === 'placements' && input.type === 'receipt') {
      const placement = await access.services.placementService.getPlacement(id)
      if (!placement) throw Error('Placement introuvable.')
      const member = await access.services.members.getMemberById(
        placement.benefactorId,
      )
      const commissions = (
        await access.services.placementService.listCommissions(id)
      ).filter(
        (c) =>
          hasRecordedPlacementCommission(c) &&
          (!input.childId || c.id === input.childId),
      )
      if (!commissions.length)
        throw Error('Aucune commission réglée à inclure.')
      let result: ReturnType<typeof payload> | undefined
      await generatePlacementFacturePDF(
        {
          page1Data: buildPlacementFacturePage1Data(placement, member),
          versements: commissions.map((commission) =>
            mapCommissionToPlacementVersement({ placement, commission }),
          ),
          filename: `LE-KARA-commissions-${id}.pdf`,
        },
        {
          logo: { dataUrl: await nativePdfLogo(), width: 500, height: 500 },
          deliver: (pdf, filename) => {
            result = payload(
              Buffer.from(pdf.output('arraybuffer')),
              'application/pdf',
              filename,
            )
          },
        },
      )
      return mobileJson(result)
    }
    if (
      key === 'placements' &&
      ['contract', 'quittance', 'early-quittance'].includes(input.type)
    ) {
      const placement = await access.services.placementService.getPlacement(id)
      if (!placement) throw Error('Placement introuvable.')
      const member = await access.services.members.getMemberById(
        placement.benefactorId,
      )
      const commissions =
        await access.services.placementService.listCommissions(id)
      const earlyExit = await access.services.placementService.getEarlyExit(id)
      const component =
        input.type === 'contract'
          ? PlacementPDF
          : input.type === 'quittance'
            ? PlacementQuittance
            : PlacementEarlyQuittance
      if (input.type === 'early-quittance' && !earlyExit)
        throw Error('Aucun retrait anticipé enregistré.')
      return mobileJson(
        payload(
          await renderToBuffer(
            createElement<any>(component, {
              placement,
              member,
              logoSrc: await nativePdfLogo(),
              commissions,
              earlyExit,
            }),
          ),
          'application/pdf',
          `LE-KARA-${input.type}-${id}.pdf`,
        ),
      )
    }
    if (key === 'documents' && input.type === 'official')
      return mobileJson(
        payload(
          await renderToBuffer(
            createElement<any>(id === 'statuts' ? StatutsPDF : ReglementPDF, {
              fillData: row,
              logoSrc: await nativePdfLogo(),
            }),
          ),
          'application/pdf',
          `LE-KARA-${id}.pdf`,
        ),
      )
    if (input.type !== 'document' || !input.key)
      throw Error('Document inconnu.')
    let target: any = row
    if (input.related) {
      const linked = await relatedRows(
        access.services,
        access.module,
        row,
        access.caller,
      )
      target = linked
        .find((g) => g.key === input.related)
        ?.items.find((r) => r.id === input.childId)
      if (!target) throw Error('Pièce jointe introuvable dans ce dossier.')
    }
    if (
      !/^[a-zA-Z][a-zA-Z0-9_.]*$/i.test(input.key) ||
      !/url$/i.test(input.key)
    )
      throw Error('Référence de pièce jointe invalide.')
    const url = input.key.split('.').reduce((obj, k) => obj?.[k], target)
    if (typeof url !== 'string') throw Error('Pièce jointe introuvable.')
    const parsed = new URL(url)
    const bucketName =
      process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
      process.env.FIREBASE_STORAGE_BUCKET
    if (!bucketName || !adminApp) throw Error('Stockage indisponible.')
    let path: string
    if (
      parsed.protocol === 'https:' &&
      parsed.hostname === 'firebasestorage.googleapis.com' &&
      parsed.pathname.startsWith(`/v0/b/${bucketName}/o/`)
    )
      path = decodeURIComponent(
        parsed.pathname.slice(`/v0/b/${bucketName}/o/`.length),
      )
    else if (
      parsed.protocol === 'https:' &&
      parsed.hostname === 'storage.googleapis.com' &&
      parsed.pathname.startsWith(`/${bucketName}/`)
    )
      path = decodeURIComponent(parsed.pathname.slice(bucketName.length + 2))
    else
      throw Error(
        'Cette pièce jointe n’appartient pas au stockage de l’application.',
      )
    const file = getStorage(adminApp).bucket(bucketName).file(path)
    const [meta] = await file.getMetadata()
    if (Number(meta.size) > (key === 'bienfaiteur' ? 50 : 20) * 1024 * 1024)
      throw Error('Le fichier dépasse 20 Mo.')
    const mime = meta.contentType || 'application/pdf'
    if (
      ![
        'application/pdf',
        'image/png',
        'image/jpeg',
        'image/webp',
        ...(key === 'bienfaiteur'
          ? ['video/mp4', 'video/quicktime', 'video/webm']
          : []),
      ].includes(mime)
    )
      throw Error('Format non pris en charge.')
    const [buffer] = await file.download()
    return mobileJson(
      payload(buffer, mime, path.split('/').pop() || 'document-LE-KARA'),
    )
  } catch (e) {
    return errorResponse(e)
  }
}
