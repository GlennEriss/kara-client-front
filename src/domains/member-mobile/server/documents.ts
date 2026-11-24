import type { Firestore } from 'firebase-admin/firestore'
import { mobileDateKey } from '@/domains/mobile/contracts'
import { officialDocument } from '@/domains/mobile-admin/server/official-documents'
import {
  iso,
  ownedRows,
  memberIds,
  memberIdentifier,
  MemberError,
} from './data'
import type { MemberCaller, MemberData } from './access'

export const documentCategories = {
  ADHESION: 'Adhésion',
  CAISSE: 'Caisses',
  CREDIT: 'Accompagnements exceptionnels',
  PLACEMENT: 'Apports solidaires',
  CHARITY: 'Charité',
  OTHER: 'Autres',
}
const categories: Record<string, keyof typeof documentCategories> = {
  ADHESION: 'ADHESION',
  ADHESION_CS: 'ADHESION',
  ADHESION_CI: 'ADHESION',
  CANCELED_CS: 'CAISSE',
  CANCELED_CI: 'CAISSE',
  FINISHED_CS: 'CAISSE',
  FINISHED_CI: 'CAISSE',
  SUPPORT_CI: 'CAISSE',
  EARLY_REFUND_CI: 'CAISSE',
  FINAL_REFUND_CI: 'CAISSE',
  EARLY_REFUND_CS: 'CAISSE',
  FINAL_REFUND_CS: 'CAISSE',
  CHARITY_CONTRIBUTION_RECEIPT: 'CHARITY',
  PLACEMENT_CONTRACT: 'PLACEMENT',
  PLACEMENT_COMMISSION_PROOF: 'PLACEMENT',
  PLACEMENT_FINAL_QUITTANCE: 'PLACEMENT',
  CREDIT_SPECIALE_CONTRACT: 'CREDIT',
  CREDIT_SPECIALE_CONTRACT_SIGNED: 'CREDIT',
  CREDIT_SPECIALE_RECEIPT: 'CREDIT',
  CREDIT_SPECIALE_DISCHARGE: 'CREDIT',
  CREDIT_SPECIALE_QUITTANCE: 'CREDIT',
  CREDIT_SPECIALE_QUITTANCE_SIGNED: 'CREDIT',
}
const typeLabels: Record<string, string> = {
  ADHESION: 'Fiche d’adhésion',
  ADHESION_CS: 'Adhésion Caisse spéciale',
  ADHESION_CI: 'Adhésion Caisse imprévue',
  CANCELED_CS: 'Résiliation — Caisse spéciale',
  CANCELED_CI: 'Résiliation — Caisse imprévue',
  FINISHED_CS: 'Fin de contrat — Caisse spéciale',
  FINISHED_CI: 'Fin de contrat — Caisse imprévue',
  SUPPORT_CI: 'Aide — Caisse imprévue',
  EARLY_REFUND_CI: 'Retrait anticipé — Caisse imprévue',
  FINAL_REFUND_CI: 'Remboursement final — Caisse imprévue',
  EARLY_REFUND_CS: 'Retrait anticipé — Caisse spéciale',
  FINAL_REFUND_CS: 'Remboursement final — Caisse spéciale',
  CHARITY_CONTRIBUTION_RECEIPT: 'Reçu de contribution — Charité',
  PLACEMENT_CONTRACT: 'Contrat — Apport solidaire',
  PLACEMENT_COMMISSION_PROOF: 'Justificatif de reversement — Apport solidaire',
  PLACEMENT_FINAL_QUITTANCE: 'Quittance finale — Apport solidaire',
  CREDIT_SPECIALE_CONTRACT: 'Contrat — Accompagnement exceptionnel',
  CREDIT_SPECIALE_CONTRACT_SIGNED:
    'Contrat signé — Accompagnement exceptionnel',
  CREDIT_SPECIALE_RECEIPT: 'Reçu de versement — Accompagnement',
  CREDIT_SPECIALE_DISCHARGE: 'Décharge — Accompagnement',
  CREDIT_SPECIALE_QUITTANCE: 'Quittance — Accompagnement',
  CREDIT_SPECIALE_QUITTANCE_SIGNED: 'Quittance signée — Accompagnement',
}
export interface MemberDocument {
  id: string
  category: keyof typeof documentCategories
  typeLabel: string
  label: string
  format: string
  size: number
  createdAt: string
  contractId: string | null
  file: { kind: 'document' | 'subscription' | 'adhesion-user'; id: string }
  url: string
}
const documentDate = (value: unknown) => {
  const result = iso(value)
  return result && new Date(result).getTime() > 0 ? result : ''
}
const text = (v: unknown) => (typeof v === 'string' ? v : '')
function sheet(
  kind: 'subscription' | 'adhesion-user',
  id: string,
  data: MemberData,
): MemberDocument | null {
  const url = text(data.adhesionPdfURL)
  if (!url) return null
  const start = iso(
      data.dateStart ?? data.startDate ?? data.dateEnd ?? data.endDate,
    ),
    year = start ? ` ${mobileDateKey(new Date(start)).slice(0, 4)}` : ''
  return {
    id: `adhesion:${kind}:${id}`,
    category: 'ADHESION',
    typeLabel: 'Fiche d’adhésion',
    label: `Fiche d’adhésion${kind === 'subscription' ? year : ''}`,
    format: 'pdf',
    size: 0,
    createdAt: documentDate(
      data.adhesionPdfUpdatedAt ??
        data.updatedAt ??
        data.dateStart ??
        data.startDate ??
        data.createdAt,
    ),
    contractId: null,
    file: { kind, id },
    url,
  }
}
export function storedDocument(data: MemberData): MemberDocument | null {
  const url = text(data.url),
    type = text(data.type) || 'ADHESION'
  if (!url) return null
  const typeLabel = Object.hasOwn(typeLabels, type)
    ? typeLabels[type]
    : 'Document personnel'
  return {
    id: `document:${data.id}`,
    category: Object.hasOwn(categories, type) ? categories[type] : 'OTHER',
    typeLabel,
    label: text(data.libelle) || typeLabel,
    format: text(data.format) || 'pdf',
    size: Number.isFinite(Number(data.size))
      ? Math.max(0, Number(data.size))
      : 0,
    createdAt: documentDate(data.createdAt),
    contractId: text(data.contractId) || null,
    file: { kind: 'document', id: data.id },
    url,
  }
}
/** Fiche d'adhésion depuis les mêmes sources que le web : documents,
 * abonnements et users. La version documents est prioritaire lors du dédoublonnage. */
export async function memberDocuments(db: Firestore, caller: MemberCaller) {
  const [stored, subscriptions] = await Promise.all([
    ownedRows(db, 'documents', 'memberId', caller),
    ownedRows(db, 'subscriptions', 'userId', caller),
  ])
  const rows: MemberDocument[] = []
  for (const row of stored) {
    const d = storedDocument(row)
    if (d && d.category !== 'PLACEMENT') rows.push(d)
  }
  for (const row of subscriptions) {
    const d = sheet('subscription', row.id, row)
    if (d) rows.push(d)
  }
  for (const id of memberIds(caller)) {
    const data =
      id === caller.uid
        ? caller.member
        : (await db.collection('users').doc(id).get()).data()
    if (data && (!data.matricule || data.matricule === caller.matricule)) {
      const d = sheet('adhesion-user', id, data)
      if (d) rows.push(d)
    }
  }
  const byUrl = new Map<string, MemberDocument>()
  for (const row of rows) if (!byUrl.has(row.url)) byUrl.set(row.url, row)
  return [...byUrl.values()]
    .sort(
      (a, b) =>
        b.createdAt.localeCompare(a.createdAt) || a.id.localeCompare(b.id),
    )
    .map(({ url: _url, ...row }) => row)
}
export async function personalDocumentSource(
  db: Firestore,
  caller: MemberCaller,
  kind: string,
  id: string,
) {
  if (!memberIdentifier(id)) throw new MemberError('Document inconnu.', 404)
  if (kind === 'document') {
    const data = (await db.collection('documents').doc(id).get()).data()
    if (!data || text(data.type).toUpperCase().startsWith('PLACEMENT_') || !memberIds(caller).includes(data.memberId))
      throw new MemberError('Document introuvable.', 404)
    return {
      url: text(data.url),
      name:
        text(data.libelle) ||
        typeLabels[text(data.type)] ||
        'document-personnel',
    }
  }
  if (kind === 'adhesion-user' && memberIds(caller).includes(id)) {
    const data =
      id === caller.uid
        ? caller.member
        : (await db.collection('users').doc(id).get()).data()
    if (!data || (data.matricule && data.matricule !== caller.matricule))
      throw new MemberError('Document introuvable.', 404)
    return { url: text(data.adhesionPdfURL), name: 'fiche-adhesion' }
  }
  throw new MemberError('Document introuvable.', 404)
}
/** Le membre voit uniquement le texte officiel et le bloc adopté. Ni brouillon,
 * ni annexes de travail, ni opérations de publication de l'administration. */
export async function memberOfficialDocument(db: Firestore, id: string) {
  if (!['statuts', 'reglement-interieur'].includes(id))
    throw new MemberError('Document officiel inconnu.', 404)
  const snapshot = await db.collection('association-documents').doc(id).get(),
    saved = snapshot.data()
  const fill = {
    lieu: text(saved?.lieu),
    date: text(saved?.date),
    secretaireNom: text(saved?.secretaireNom),
    conseillerNom: text(saved?.conseillerNom),
    secretaireSignature: text(saved?.secretaireSignature) || null,
    conseillerSignature: text(saved?.conseillerSignature) || null,
  }
  const official = officialDocument(id)
  return {
    id,
    title: official.title,
    textVersion: official.textVersion,
    heading: official.heading,
    content: official.content,
    tables: official.tables,
    published: !!saved,
    publication: saved ? fill : null,
  }
}
