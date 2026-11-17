/* eslint-disable no-restricted-imports -- Adaptateur temporaire vers les règles métier et modèles officiels existants. */
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { z } from 'zod'
import { NextResponse, type NextRequest } from 'next/server'
import { mobileJson } from '@/domains/mobile/server/access'
import { canWithAccess } from '@/domains/auth/access-policy'
import { adminApp } from '@/firebase/admin'
import { getStorage } from 'firebase-admin/storage'
import { requireFinanceCaller, financePermissionPrefix } from './authorization'
import { generateContractDocument } from './contract-pdf'
import { createFinanceServices } from './services'
import { financeContractDetail, listFinanceRows } from './read-model'
import { financeModules, identifier } from '../actions'
import { generateSingleVersementPDF } from '@/services/caisse/versementPdfExport'
import { generateSingleVersementCIPDF } from '@/services/caisse-imprevue/generateSingleVersementCIPDF'
import { generateFactureCreditSpecialPDF } from '@/services/credit-speciale/factureCreditSpecialPdfExport'
import {
  buildCreditSpecialFactureData,
  buildCreditSpecialFacturePage1Data,
} from '@/services/credit-speciale/creditSpecialeFactureHelpers'
import type { FinancePdfDelivery } from '@/services/finance-pdf-delivery'
const schema = z
  .object({
    type: z.enum(['receipt', 'document', 'export', 'contract', 'quittance']),
    id: identifier.optional(),
    kind: z.enum(['contracts', 'demands', 'settings']).optional(),
    format: z.enum(['pdf', 'excel']).optional(),
    blank: z.enum(['true', 'false']).optional(),
  })
  .strict()
export async function getFinanceFile(
  request: NextRequest,
  moduleValue: string,
  entityId: string,
) {
  const module = z.enum(financeModules).safeParse(moduleValue),
    id = identifier.safeParse(entityId)
  if (!module.success || !id.success)
    return mobileJson({ error: 'Document inconnu.' }, 404)
  const caller = await requireFinanceCaller(request, module.data)
  if (caller instanceof NextResponse) return caller
  const query = schema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams),
  )
  if (!query.success) return mobileJson({ error: 'Document invalide.' }, 400)
  if (
    !canWithAccess(
      caller.access,
      query.data.type === 'export'
        ? `${financePermissionPrefix(module.data)}.export`
        : 'documents.download',
    )
  )
    return mobileJson(
      { error: 'Vous ne pouvez pas télécharger ce document.' },
      403,
    )
  try {
    const services = createFinanceServices(caller)
    let output: { base64: string; mime: string; filename: string } | undefined
    const deliver: FinancePdfDelivery['deliver'] = (doc, filename) => {
      output = {
        base64: Buffer.from(doc.output('arraybuffer')).toString('base64'),
        mime: 'application/pdf',
        filename,
      }
    }
    if (['contract', 'quittance'].includes(query.data.type))
      return mobileJson(
        await generateContractDocument(
          services,
          module.data,
          id.data,
          query.data.type === 'quittance',
          query.data.blank === 'true',
        ),
      )
    if (query.data.type === 'export') {
      if (
        query.data.kind === 'settings' &&
        !canWithAccess(
          caller.access,
          `${financePermissionPrefix(module.data)}.settings`,
        )
      )
        return mobileJson({ error: 'Accès aux paramètres refusé.' }, 403)
      const kind = query.data.kind || 'contracts'
      const result = await listFinanceRows(services, module.data, {
        kind,
        search: '',
        page: 1,
        limit: 500,
        cursor: undefined,
      })
      if (result.nextCursor)
        return mobileJson(
          {
            error: 'L’export est limité à 500 dossiers. Réduisez la sélection.',
          },
          400,
        )
      const rows = result.items.map((row) => ({
        Référence: row.id,
        Membre: row.memberName,
        Statut: row.status || '',
        Montant:
          row.monthlyAmount ||
          row.amount ||
          row.subscriptionCIAmountPerMonth ||
          row.amountPerMonth ||
          0,
      }))
      if (query.data.format === 'excel') {
        const { Workbook } = await import('exceljs')
        const workbook = new Workbook(),
          sheet = workbook.addWorksheet('LE KARA')
        sheet.columns = Object.keys(rows[0] || { Référence: '' }).map(
          (key) => ({ header: key, key, width: 30 }),
        )
        rows.forEach((row) => sheet.addRow(row))
        sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }
        sheet.getRow(1).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF234D65' },
        }
        output = {
          base64: Buffer.from(await workbook.xlsx.writeBuffer()).toString(
            'base64',
          ),
          mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          filename: `LE-KARA-${module.data}-${kind}.xlsx`,
        }
      } else {
        const { jsPDF } = await import('jspdf')
        const doc = new jsPDF()
        const autoTable = (await import('jspdf-autotable')).default
        doc.setFontSize(18).text('LE KARA', 14, 18)
        doc.setFontSize(11).text(`${module.data} - ${kind}`, 14, 27)
        autoTable(doc, {
          startY: 34,
          head: [Object.keys(rows[0] || { Référence: '' })],
          body: rows.map((row) => Object.values(row)),
          headStyles: { fillColor: [35, 77, 101] },
        })
        await deliver(doc, `LE-KARA-${module.data}-${kind}.pdf`)
      }
    } else if (query.data.type === 'document') {
      const detail: any = await financeContractDetail(
        services,
        module.data,
        id.data,
      )
      const document = detail.documents.find(
        (row: any) => row.id === query.data.id,
      )
      if (!document?.path)
        return mobileJson(
          { error: 'Document introuvable dans ce contrat.' },
          404,
        )
      if (!adminApp) throw new Error('Stockage indisponible')
      const file = getStorage(adminApp)
        .bucket(process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET)
        .file(document.path)
      const [metadata] = await file.getMetadata()
      if (Number(metadata.size) > 20 * 1024 * 1024)
        return mobileJson({ error: 'Le document dépasse 20 Mo.' }, 400)
      const [buffer] = await file.download()
      output = {
        base64: buffer.toString('base64'),
        mime: metadata.contentType || 'application/pdf',
        filename:
          document.originalFileName || `document-LE-KARA-${document.id}.pdf`,
      }
    } else {
      if (!query.data.id)
        return mobileJson({ error: 'Sélectionnez un versement.' }, 400)
      const detail: any = await financeContractDetail(
        services,
        module.data,
        id.data,
      )
      const payment = detail.payments.find(
        (row: any) => row.id === query.data.id,
      )
      if (!payment) return mobileJson({ error: 'Versement introuvable.' }, 404)
      const names = new Map<string, string>()
      const adminIds = [
        ...new Set<string>(
          [
            payment.updatedBy,
            payment.createdBy,
            ...(payment.versements || payment.contribs || []).map(
              (row: any) => row.createdBy,
            ),
          ].filter(Boolean),
        ),
      ]
      await Promise.all(
        adminIds.map(async (uid) => {
          const admin = await services.admins.getAdminById(uid)
          names.set(
            uid,
            `${admin?.firstName || ''} ${admin?.lastName || ''}`.trim() || uid,
          )
        }),
      )
      let logo: FinancePdfDelivery['logo'] = null
      try {
        const buffer = await readFile(
          resolve(
            process.cwd(),
            'public/assets/caisse-speciale/caissesp-logo.png',
          ),
        )
        // Le logo local est un PNG : ses dimensions sont dans l’en-tête IHDR.
        // Évite une dépendance native pour la seule lecture de ce fichier fixe.
        if (
          buffer.length < 24 ||
          !buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) ||
          buffer.toString('ascii', 12, 16) !== 'IHDR'
        ) throw new Error('Logo PNG invalide')
        logo = {
          dataUrl: `data:image/png;base64,${buffer.toString('base64')}`,
          width: buffer.readUInt32BE(16),
          height: buffer.readUInt32BE(20),
        }
      } catch {
        /* Les reçus restent disponibles si le logo ne peut pas être chargé. */
      }
      const delivery = { logo, deliver }
      if (module.data === 'caisse-speciale')
        await generateSingleVersementPDF(
          {
            contract: detail.record,
            contractId: id.data,
            member: detail.member,
            group: detail.group,
            payments: detail.payments,
            payment,
            getAdminDisplayName: (uid) => names.get(uid) || 'Administrateur',
          },
          delivery,
        )
      else if (module.data === 'caisse-imprevue') {
        const member = await services.members.getMemberById(
          detail.record.memberId,
        )
        await generateSingleVersementCIPDF(
          detail.record,
          payment,
          {
            contractId: id.data,
            member,
            getAdminDisplayName: (uid) =>
              names.get(uid || '') || 'Administrateur',
          },
          delivery,
        )
      } else {
        const member = await services.members.getMemberById(
          detail.record.clientId,
        )
        await generateFactureCreditSpecialPDF(
          {
            factureData: buildCreditSpecialFactureData({
              contract: detail.record,
              payment,
            }),
            page1Data: buildCreditSpecialFacturePage1Data(
              detail.record,
              member,
            ),
          },
          delivery,
        )
      }
    }
    if (!output) throw new Error('Document non généré')
    return mobileJson(output)
  } catch {
    return mobileJson(
      { error: 'Le document n’a pas pu être généré. Réessayez.' },
      503,
    )
  }
}
