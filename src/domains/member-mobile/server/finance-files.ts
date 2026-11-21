/* eslint-disable no-restricted-imports -- Adaptateur de lecture vers les générateurs PDF officiels, après contrôle de propriété membre. */
import type { Firestore } from 'firebase-admin/firestore'
import { createElement } from 'react'
import { renderToBuffer } from '@react-pdf/renderer'
import CaisseSpecialePDF from '@/components/caisse-speciale/CaisseSpecialePDFV3'
import CaisseImprevuePDF from '@/components/caisse-imprevue/CaisseImprevuePDFV3'
import { RecognitionDocumentPDF } from '../pdf/RecognitionDocumentPDF'
import DemandeRemboursementPDF from '@/components/pdf/mutuelle/DemandeRemboursementPDF'
import {
  nativePdfLogo,
  nativeReceiptLogo,
} from '@/domains/mobile-admin/server/pdf-logo'
import { withBusinessDates } from '@/domains/mobile/server/calendar-dates'
import { generateSingleVersementPDF } from '@/services/caisse/versementPdfExport'
import { generateSingleVersementCIPDF } from '@/services/caisse-imprevue/generateSingleVersementCIPDF'
import type { FinancePdfDelivery } from '@/services/finance-pdf-delivery'
import type { MemberCaller, MemberData } from './access'
import { memberProfile } from './read-model'
import { MemberError, memberIdentifier, memberIds } from './data'
import {
  financeChildren,
  contractDTO,
  ownedFinanceRecord,
  type MemberFinanceModule,
} from './finance-model'
import { readMemberFinanceFile } from './finance-storage'
import { generateFullVersementPDF } from '../pdf/cs-history'
import { generateFullVersementCIPDF } from '../pdf/ci-history'

function normalizeFirestoreDates(value: any): any {
  if (value?.toDate instanceof Function) return value.toDate()
  if (value instanceof Date) return value
  if (Array.isArray(value)) return value.map(normalizeFirestoreDates)
  if (value && typeof value === 'object')
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, normalizeFirestoreDates(v)]),
    )
  return value
}
export const memberPaymentLabels: Record<string, string> = {
  airtel_money: 'Airtel Money',
  mobicash: 'Mobicash',
  cash: 'Espèces',
  bank_transfer: 'Virement bancaire',
  other: 'Autre',
}
function pdfMember(caller: MemberCaller) {
  const p = memberProfile(caller)
  return {
    ...p.identity,
    matricule: caller.matricule,
    address: p.address,
    profession: p.company.profession,
    companyName: p.company.companyName,
    identityDocumentNumber: p.documents.identityDocumentNumber,
    identityDocumentIssuingDate: p.documents.issuingDate,
  }
}
/** Source choisie dans le contrat déjà contrôlé, jamais une URL fournie par le client. */
export async function memberFinanceAttachmentSource(
  db: Firestore,
  record: MemberData,
  children: Awaited<ReturnType<typeof financeChildren>>,
  type: string,
  fileId: string,
  ownerIds: string[] = [record.memberId],
) {
  let source = '',
    documentId = ''
  if (type === 'official') {
    source = record.contractPdf?.url || ''
    documentId = record.contractStartId || ''
  }
  if (type === 'submitted') documentId = record.memberSignedDocumentId || ''
  if (type === 'declaration-proof')
    source = children.declarations.find((d) => d.id === fileId)?.proofUrl || ''
  if (type === 'refund-document' || type === 'refund-proof') {
    const r = children.refunds.find((r) => r.id === fileId)
    if (r) {
      source =
        type === 'refund-proof'
          ? r.proofUrl
          : r.adminDocumentUrl || r.documentUrl
      documentId = type === 'refund-document' ? r.documentId || '' : ''
    }
  }
  if (type === 'support-document') {
    const s = children.supports.find((s) => s.id === fileId)
    if (s) {
      source = s.adminDocumentUrl || s.documentUrl
      documentId = s.documentId || ''
    }
  }
  if (type === 'versement-proof') {
    const [paymentId, index] = fileId.split(':')
    const p = children.payments.find((p) => p.id === paymentId),
      rows = p?.contribs || p?.versements
    if (Array.isArray(rows) && /^\d+$/.test(index || ''))
      source = rows[Number(index)]?.proofUrl || ''
  }
  if (!source && memberIdentifier(documentId)) {
    const d = (await db.collection('documents').doc(documentId).get()).data()
    if (
      d &&
      (!d.memberId || ownerIds.includes(d.memberId)) &&
      (d.contractId === record.id || (!d.contractId && type !== 'submitted')) &&
      (type !== 'submitted' || ownerIds.includes(d.memberId))
    )
      source = d.url || d.fileUrl || d.fileURL || ''
  }
  if (typeof source !== 'string' || !source)
    throw new MemberError('Document introuvable.', 404)
  return source
}
export async function memberFinanceFile(
  db: Firestore,
  caller: MemberCaller,
  module: MemberFinanceModule,
  id: string,
  type: string,
  fileId = '',
  draft?: MemberData,
) {
  const raw = await ownedFinanceRecord(db, caller, module, id),
    children = await financeChildren(db, module, id)
  const record = withBusinessDates(normalizeFirestoreDates(raw)) as MemberData
  const dto = contractDTO(module, raw, children),
    member = withBusinessDates(pdfMember(caller)) as MemberData
  const filename = `LE-KARA-${type}-${id}.pdf`
  if (
    ![
      'contract-template',
      'receipt',
      'history',
      'refund-template',
      'support-template',
    ].includes(type)
  ) {
    const source = await memberFinanceAttachmentSource(
      db,
      raw,
      children,
      type,
      fileId,
      memberIds(caller),
    )
    return readMemberFinanceFile(source, `LE-KARA-${type}-${id}`)
  }
  const render = async (component: any, props: MemberData) => ({
    base64: (
      await renderToBuffer(createElement<any>(component, props))
    ).toString('base64'),
    mime: 'application/pdf',
    filename,
  })
  if (type === 'contract-template')
    return render(
      module === 'caisse-speciale' ? CaisseSpecialePDF : CaisseImprevuePDF,
      { contract: { ...record, member }, logoSrc: await nativePdfLogo() },
    )
  if (type === 'refund-template') {
    if (
      !draft ||
      !['EARLY', 'FINAL'].includes(draft.type) ||
      !Number.isFinite(draft.amount) ||
      draft.amount <= 0 ||
      draft.amount > dto.nominalPaid ||
      typeof draft.reason !== 'string' ||
      draft.reason.length < 10 ||
      draft.reason.length > 500 ||
      !Object.hasOwn(memberPaymentLabels, draft.mode)
    )
      throw new MemberError(
        'Complétez le montant, le motif et le moyen de retrait avant de préparer la demande.',
      )
    return render(DemandeRemboursementPDF, {
      data: {
        productLabel:
          module === 'caisse-speciale' ? 'Caisse Spéciale' : 'Caisse Imprévue',
        type: draft.type,
        member,
        contract: {
          id,
          formula: dto.type,
          durationMonths: dto.duration,
          startDate: dto.startAt,
          endDate: dto.endAt,
        },
        request: {
          amount: draft.amount,
          paymentMode: memberPaymentLabels[draft.mode],
          reason: draft.reason,
          requestedAt: new Date(),
        },
      },
      logoSrc: await nativePdfLogo(),
    })
  }
  if (type === 'support-template') {
    if (module !== 'caisse-imprevue')
      throw new MemberError('Document inconnu.', 404)
    return render(RecognitionDocumentPDF, {
      contract: {
        ...record,
        memberFirstName: member.firstName,
        memberLastName: member.lastName,
      },
      datePriseAide: new Date(),
      dateProchaineEcheance: new Date(dto.payments.find(p=>p.status !== 'PAID')?.dueAt || dto.nextDueAt || dto.startAt),
      logoSrc: await nativePdfLogo(),
    })
  }
  const payments = children.payments.map((p) =>
    withBusinessDates(normalizeFirestoreDates(p)),
  ) as MemberData[]
  let output: { base64: string; mime: string; filename: string } | undefined
  const delivery: FinancePdfDelivery = {
    logo: await nativeReceiptLogo(),
    deliver: (doc, name) => {
      output = {
        base64: Buffer.from(doc.output('arraybuffer')).toString('base64'),
        mime: 'application/pdf',
        filename: name,
      }
    },
  }
  if (type === 'receipt') {
    const payment = payments.find((p) => p.id === fileId)
    if (!payment) throw new MemberError('Versement introuvable.', 404)
    if (module === 'caisse-speciale')
      await generateSingleVersementPDF(
        {
          contract: record,
          contractId: id,
          member,
          group: null,
          payments,
          payment,
          getAdminDisplayName: () => 'Gestionnaire LE KARA',
        },
        delivery,
      )
    else
      await generateSingleVersementCIPDF(
        record as any,
        payment as any,
        {
          contractId: id,
          member: member as any,
          getAdminDisplayName: () => 'Gestionnaire LE KARA',
        },
        delivery,
      )
    if (!output) throw new MemberError('Aucun reçu disponible.', 404)
    return output
  }
  if (!payments.length)
    throw new MemberError(
      'Aucun échéancier disponible pour cet historique.',
      404,
    )
  if (module === 'caisse-speciale')
    await generateFullVersementPDF(
      {
        contract: record,
        contractId: id,
        member,
        group: null,
        payments,
        getAdminDisplayName: () => 'Gestionnaire LE KARA',
      },
      delivery,
    )
  else
    await generateFullVersementCIPDF(
      {
        contract: record,
        contractId: id,
        member,
        payments,
        getAdminDisplayName: () => 'Gestionnaire LE KARA',
      },
      delivery,
    )
  if (!output) throw new MemberError('Historique indisponible.', 404)
  return output
}
