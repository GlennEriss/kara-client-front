import type { AdminServices } from './context'
type Row = Record<string, any>
export const paymentTypeLabels: Record<string, string> = {
  Membership: 'Adhésion',
  Subscription: 'Abonnement',
  SpecialFund: 'Caisse spéciale',
  UnexpectedFund: 'Caisse imprévue',
  SpecialCredit: 'Crédit spécial',
  FixedCredit: 'Crédit fixe',
  AidCredit: 'Caisse aide',
  Charity: 'Charité',
  Benefactor: 'Bienfaiteur',
}
export const documentTypeLabels: Record<string, string> = {
  ADHESION_CS: 'Adhésion Caisse spéciale',
  ADHESION_CI: 'Adhésion Caisse imprévue',
  ADHESION: 'Adhésion association',
  CANCELED_CS: 'Annulation Caisse spéciale',
  CANCELED_CI: 'Annulation Caisse imprévue',
  FINISHED_CS: 'Fin Caisse spéciale',
  FINISHED_CI: 'Fin Caisse imprévue',
  SUPPORT_CI: 'Demande d’aide Caisse imprévue',
  EARLY_REFUND_CI: 'Retrait anticipé Caisse imprévue',
  EARLY_REFUND_CS: 'Retrait anticipé Caisse spéciale',
  FINAL_REFUND_CI: 'Remboursement final Caisse imprévue',
  FINAL_REFUND_CS: 'Remboursement final Caisse spéciale',
  CHARITY_EVENT_MEDIA: 'Média de charité',
  CHARITY_CONTRIBUTION_RECEIPT: 'Reçu de charité',
  CHARITY_EVENT_REPORT: 'Rapport de charité',
  PLACEMENT_CONTRACT: 'Contrat de placement',
  PLACEMENT_COMMISSION_PROOF: 'Preuve de commission placement',
  PLACEMENT_EARLY_EXIT_PROOF: 'Preuve de retrait anticipé placement',
  PLACEMENT_EARLY_EXIT_QUITTANCE: 'Quittance de retrait anticipé placement',
  PLACEMENT_FINAL_QUITTANCE: 'Quittance finale placement',
  PLACEMENT_EARLY_EXIT_ADDENDUM: 'Avenant de retrait anticipé placement',
  PLACEMENT_EARLY_EXIT_DOCUMENT: 'Retrait anticipé signé',
  CREDIT_SPECIALE_CONTRACT: 'Contrat crédit spécial',
  CREDIT_SPECIALE_CONTRACT_SIGNED: 'Contrat crédit spécial signé',
  CREDIT_SPECIALE_RECEIPT: 'Reçu de crédit spécial',
  CREDIT_SPECIALE_DISCHARGE: 'Décharge crédit spécial',
  CREDIT_SPECIALE_QUITTANCE: 'Quittance crédit spécial',
  CREDIT_SPECIALE_QUITTANCE_SIGNED: 'Quittance crédit spécial signée',
}
export const formatLabels: Record<string, string> = {
  pdf: 'PDF',
  word: 'Word',
  excel: 'Excel',
  image: 'Image',
  text: 'Texte',
}
export const modeLabels: Record<string, string> = {
  cash: 'Espèces',
  airtel_money: 'Airtel Money',
  mobicash: 'Mobicash',
  bank_transfer: 'Virement bancaire',
  other: 'Autre',
}
export const isArchive = (key: string) =>
  ['payment-history', 'contract-history'].includes(key)
const norm = (v: unknown) =>
  String(v ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('fr')
const name = (r: Row) =>
  [r.firstName || r.identity?.firstName, r.lastName || r.identity?.lastName]
    .filter(Boolean)
    .join(' ')
const safeId = (id: unknown): id is string =>
  typeof id === 'string' && !!id && !/[\\/]/.test(id)
/** Resolve each actor once, in bounded Firestore batches, without returning profiles. */
export async function archiveRows(
  services: AdminServices,
  key: string,
  rows: Row[],
) {
  if (!isArchive(key)) return rows
  const ids = [
    ...new Set(
      rows
        .map((r) => (key === 'payment-history' ? r.beneficiaryId : r.memberId))
        .filter(safeId),
    ),
  ]
  const actors = [
    ...new Set(rows.map((r) => r.acceptedBy || r.createdBy).filter(safeId)),
  ]
  const people = new Map<string, string>(),
    admins = new Map<string, string>()
  for (const [collection, list, target] of [
    ['users', ids, people],
    ['admins', actors, admins],
  ] as const) {
    for (let offset = 0; offset < list.length; offset += 200) {
      const docs = await services.db.getAll(
        ...list
          .slice(offset, offset + 200)
          .map((id) => services.db.collection(collection).doc(id)),
      )
      for (const doc of docs) {
        const r = doc.data()
        if (r && name(r)) target.set(doc.id, name(r))
      }
    }
  }
  const missing = ids.filter((id) => !people.has(id))
  for (let offset = 0; offset < missing.length; offset += 200) {
    const docs = await services.db.getAll(
      ...missing
        .slice(offset, offset + 200)
        .map((id) => services.db.collection('membership-requests').doc(id)),
    )
    for (const doc of docs) {
      const r = doc.data()
      if (r && name(r)) people.set(doc.id, name(r))
    }
  }
  return rows
    .map((r): Row => {
      const beneficiary =
        key === 'payment-history' ? r.beneficiaryId : r.memberId
      return {
        ...r,
        memberId: r.memberId || r.beneficiaryId,
        beneficiaryName:
          people.get(beneficiary) ||
          r.beneficiaryName ||
          'Identité non renseignée',
        memberName:
          people.get(beneficiary) || r.memberName || 'Identité non renseignée',
        adminId: r.acceptedBy || r.createdBy,
        adminName:
          admins.get(r.acceptedBy || r.createdBy) ||
          'Administrateur non renseigné',
        typeLabel:
          (key === 'payment-history'
            ? paymentTypeLabels[r.paymentType]
            : documentTypeLabels[r.type]) || 'Type non renseigné',
        modeLabel: modeLabels[r.mode] || 'Moyen non renseigné',
        formatLabel: formatLabels[r.format] || 'Format non renseigné',
        displayName:
          key === 'payment-history'
            ? paymentTypeLabels[r.paymentType] || 'Paiement'
            : r.libelle || r.originalFileName || 'Document archivé',
      }
    })
    .sort((a, b) =>
      String(
        key === 'payment-history' ? b.date || '' : b.createdAt || '',
      ).localeCompare(
        String(key === 'payment-history' ? a.date || '' : a.createdAt || ''),
      ),
    )
}
export function archiveDay(value: unknown) {
  if (!value) return ''
  const date = new Date(String(value))
  if (!Number.isFinite(date.getTime())) return ''
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Libreville',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}
export function validateArchiveFilters(input: Row) {
  for (const [from, to] of [
    ['from', 'to'],
    ['createdFrom', 'createdTo'],
    ['updatedFrom', 'updatedTo'],
  ]) {
    for (const key of [from, to])
      if (input[key]) {
        const d = new Date(input[key] + 'T12:00:00Z')
        if (
          !Number.isFinite(d.getTime()) ||
          d.toISOString().slice(0, 10) !== input[key]
        )
          throw Error('Choisissez une date valide.')
      }
    if (input[from] && input[to] && input[from] > input[to])
      throw Error('La date de début doit précéder la date de fin.')
  }
  if (
    input.minAmount != null &&
    input.maxAmount != null &&
    input.minAmount > input.maxAmount
  )
    throw Error('Le montant minimum doit être inférieur au maximum.')
}
export function filterArchiveRows(rows: Row[], input: Row, key: string) {
  validateArchiveFilters(input)
  return rows.filter((r) => {
    if (key === 'payment-history' && !input.memberId) return false
    if (
      input.memberId &&
      ![r.beneficiaryId, r.memberId].includes(input.memberId)
    )
      return false
    if (
      input.search &&
      !norm(
        [
          r.displayName,
          r.id,
          r.memberId,
          r.beneficiaryName,
          r.memberName,
          r.libelle,
          r.originalFileName,
        ].join(' '),
      ).includes(norm(input.search))
    )
      return false
    for (const k of ['paymentType', 'mode', 'adminId', 'type'])
      if (input[k] && r[k] !== input[k]) return false
    if (input.fileFormat && r.format !== input.fileFormat) return false
    if (input.minAmount != null && Number(r.amount) < input.minAmount)
      return false
    if (input.maxAmount != null && Number(r.amount) > input.maxAmount)
      return false
    for (const [from, to, date] of [
      ['from', 'to', key === 'payment-history' ? 'date' : 'createdAt'],
      ['createdFrom', 'createdTo', 'createdAt'],
      ['updatedFrom', 'updatedTo', 'updatedAt'],
    ]) {
      const day = archiveDay(r[date])
      if (input[from] && (!day || day < input[from])) return false
      if (input[to] && (!day || day > input[to])) return false
    }
    return true
  })
}
export function archiveOverview(
  key: string,
  all: Row[],
  selected: Row[],
  input: Row,
) {
  const source = input.memberId
    ? all.filter((r) => [r.memberId, r.beneficiaryId].includes(input.memberId))
    : all
  const sample = key === 'payment-history' ? selected.slice(0, 500) : selected
  const options = (field: string, label: string) => [
    ...new Map(
      source
        .filter((r) => r[field])
        .map((r) => [
          r[field],
          { value: r[field], label: r[label] || r[field] },
        ]),
    ).values(),
  ]
  return {
    beneficiaries: [
      ...new Map(
        all
          .filter((r) => r.memberId)
          .map((r) => [
            r.memberId,
            { value: r.memberId, label: `${r.memberName} · ${r.memberId}` },
          ]),
      ).values(),
    ],
    admins: options('adminId', 'adminName'),
    types: Object.entries(
      key === 'payment-history' ? paymentTypeLabels : documentTypeLabels,
    ).map(([value, label]) => ({ value, label })),
    formats: Object.entries(formatLabels).map(([value, label]) => ({
      value,
      label,
    })),
    modes: Object.entries(modeLabels).map(([value, label]) => ({
      value,
      label,
    })),
    total: selected.length,
    amount: sample.reduce((s, r) => s + Number(r.amount || 0), 0),
    sampleCount: sample.length,
    limited: sample.length < selected.length,
    distribution: Object.entries(paymentTypeLabels).map(([value, label]) => ({
      value,
      label,
      count: sample.filter((r) => r.paymentType === value).length,
      amount: sample
        .filter((r) => r.paymentType === value)
        .reduce((s, r) => s + Number(r.amount || 0), 0),
    })),
    ci: selected.filter((r) => String(r.type).includes('CI')).length,
    cs: selected.filter((r) => String(r.type).includes('CS')).length,
    memberships: selected.filter((r) => r.type === 'ADHESION').length,
  }
}
export function archiveExportRow(
  key: string,
  r: Row,
): Record<string, string | number> {
  return key === 'payment-history'
    ? {
        Type: r.typeLabel,
        'Montant (FCFA)': r.amount ?? '',
        Date: archiveDay(r.date),
        Moyen: r.modeLabel,
        'Enregistré par': r.adminName,
        Bénéficiaire: r.beneficiaryName,
      }
    : {
        Document: r.displayName,
        Type: r.typeLabel,
        Format: r.formatLabel,
        Membre: r.memberName,
        Matricule: r.memberId || '',
        'Taille (octets)': r.size ?? '',
        Date: archiveDay(r.createdAt),
      }
}
