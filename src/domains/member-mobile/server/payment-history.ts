import type { Firestore } from 'firebase-admin/firestore'
import type { MemberCaller, MemberData } from './access'
import { iso, memberIdentifier, memberIds, ownedRows } from './data'
import { mobileDateKey } from '@/domains/mobile/contracts'

const funds = [
  ['caisseContracts', 'caisse-speciale', 'contribs'],
  ['contractsCI', 'caisse-imprevue', 'versements'],
] as const

export const paymentHistoryLabels = {
  membership: 'Adhésion et abonnement',
  'caisse-speciale': 'Caisse spéciale',
  'caisse-imprevue': 'Caisse imprévue',
  charity: 'Charités',
} as const
export type HistoryDomain = keyof typeof paymentHistoryLabels
type HistoryEntry = { id: string; date: string; time: string; amount: number; mode: string; domain: HistoryDomain }

export function centralHistoryDomain(row: MemberData): HistoryDomain | undefined {
  if (
    row.creditContractId || row.creditDemandId || row.creditId || row.creditType || row.placementId ||
    /credit|accompagnement|placement|benefactor/i.test(String(row.paymentType ?? '')) ||
    /credit|accompagnement|placement/i.test(String(row.sourceType ?? '')) ||
    /^(credit[^/]*|placements)\//i.test(String(row.sourcePath ?? ''))
  ) return
  if (row.sourceType === 'caisse-imprevue' || ['UnexpectedFund', 'CaisseImprevue'].includes(row.paymentType) || row.caisseImprevueContractId || row.contractCIId) return 'caisse-imprevue'
  if (row.sourceType === 'caisse-speciale' || ['SpecialFund', 'CaisseSpeciale'].includes(row.paymentType) || row.caisseContractId) return 'caisse-speciale'
  if (['Membership', 'Subscription'].includes(row.paymentType) || ['membership-request', 'subscription'].includes(row.sourceType) || row.membershipRequestId || row.subscriptionId) return 'membership'
  if (row.paymentType === 'Charity') return 'charity'
}

function historyEntry(id: string, domain: HistoryDomain, row: MemberData, rawDate: unknown): HistoryEntry | undefined {
  const converted = iso(rawDate)
  const amount = Number(row.amount)
  if (!converted || !Number.isFinite(amount) || amount <= 0) return
  return {
    id, domain, amount, date: mobileDateKey(new Date(converted)),
    time: typeof row.time === 'string' ? row.time : '',
    mode: typeof row.mode === 'string' ? row.mode : '',
  }
}

export async function memberPaymentHistory(db: Firestore, caller: MemberCaller) {
  const ids = memberIds(caller)
  const aliases = [...new Set([...ids, caller.member.dossier, caller.dossier.id].filter(memberIdentifier))]
  const [central, ...contractLists] = await Promise.all([
    Promise.all(['beneficiaryId', 'sourceId'].map(field => db.collection('payments').where(field, 'in', aliases).get())),
    ...funds.map(([collection]) => ownedRows(db, collection, 'memberId', caller)),
  ])
  const byId = new Map<string, HistoryEntry>()
  for (const snapshot of central) {
    for (const doc of snapshot.docs) {
      const row = doc.data()
      // Priorité au bénéficiaire renseigné pour les versements de caisses de groupe.
      if (!aliases.includes(row.beneficiaryId || row.sourceId)) continue
      const domain = centralHistoryDomain(row)
      if (!domain) continue
      const path = typeof row.sourcePath === 'string' && /^(contractsCI|caisseContracts)\/[^/]+\/payments\/[^/]+$/.test(row.sourcePath)
        ? row.sourcePath : ''
      const versementId = domain === 'caisse-imprevue' ? row.versementId
        : row.contributionType === 'individual' ? row.contributionId
          : row.contributionType === 'legacy' ? '__single__' : ''
      const id = path && versementId ? `${path}:${versementId}` : doc.id
      const entry = historyEntry(id, domain, row, row.date)
      if (entry) byId.set(id, entry)
    }
  }
  for (const [index, [collection, domain, field]] of funds.entries()) {
    const contracts = contractLists[index].filter(row => ids.includes(row.memberId) && row.contractType !== 'GROUP')
    // Borne le nombre de lectures simultanées pour les comptes anciens.
    for (let offset = 0; offset < contracts.length; offset += 8) {
      const snapshots = await Promise.all(contracts.slice(offset, offset + 8).map(c =>
        db.collection(collection).doc(c.id).collection('payments').get(),
      ))
      for (const snapshot of snapshots) {
        for (const doc of snapshot.docs) {
          const row = doc.data()
          const items = Array.isArray(row[field]) ? row[field] : []
          const records = items.length ? items : domain === 'caisse-speciale' && row.status === 'PAID'
            ? [{ ...row, id: '__single__', amount: row.accumulatedAmount ?? row.amount }] : []
          for (const [i, item] of records.entries()) {
            const id = `${doc.ref.path}:${item.id || i}`
            if (byId.has(id)) continue
            const entry = historyEntry(id, domain, item, item.date || item.paidAt || item.createdAt)
            if (entry) byId.set(id, entry)
          }
        }
      }
    }
  }
  return [...byId.values()].sort((a, b) => b.date.localeCompare(a.date) || b.time.localeCompare(a.time) || a.id.localeCompare(b.id))
}

export async function memberPaymentHistoryPdf(items: HistoryEntry[]) {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')])
  const doc = new jsPDF()
  doc.setFontSize(16).setTextColor(35, 77, 101).text('Historique des versements', 14, 17)
  const currency = (value: number) => new Intl.NumberFormat('fr-FR').format(value).replace(/[\u00a0\u202f]/g, ' ') + ' FCFA'
  doc.setFontSize(10).text('LE KARA | Total : ' + currency(items.reduce((sum, p) => sum + p.amount, 0)), 14, 24)
  autoTable(doc, {
    startY: 30,
    head: [['Date', 'Catégorie', 'Montant']],
    body: items.map(p => [p.date.split('-').reverse().join('/'), paymentHistoryLabels[p.domain], currency(p.amount)]),
    headStyles: { fillColor: [35, 77, 101] },
    columnStyles: { 2: { halign: 'right' } },
  })
  return {
    filename: 'LE-KARA-historique-versements.pdf',
    mime: 'application/pdf',
    base64: Buffer.from(doc.output('arraybuffer')).toString('base64'),
  }
}
