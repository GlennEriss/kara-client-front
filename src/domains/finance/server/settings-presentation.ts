import type { FinanceModule } from '../actions'
import type { FinanceServices } from './services'
import { fromFirestore } from '@/domains/mobile/server/calendar-service'
import { caisseTypes } from '../operations/demands'
type Row = Record<string, any>
export function settingsRow(module: FinanceModule, row: Row): Row {
  const value = fromFirestore(row) as Row
  return {
    ...value,
    displayName:
      module === 'caisse-speciale'
        ? value.id
        : value.label || `Forfait ${value.code}`,
    caisseType:
      module === 'caisse-speciale'
        ? value.caisseType || 'STANDARD'
        : value.caisseType,
    typeLabel:
      module === 'caisse-speciale'
        ? caisseTypes.find((t) => t.value === (value.caisseType || 'STANDARD'))
            ?.label || 'Type non renseigné'
        : undefined,
    statusLabel:
      module === 'caisse-speciale'
        ? value.isActive
          ? 'Actif'
          : 'Inactif'
        : value.status === 'ACTIVE'
          ? 'Actif'
          : 'Inactif',
  }
}
export function selectSettings(rows: Row[], input: Row) {
  const normalize = (v: unknown) =>
    String(v || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
  const result = rows.filter(
    (row) =>
      (!input.search ||
        normalize(
          [row.id, row.label, row.code, row.typeLabel].join(' '),
        ).includes(normalize(input.search))) &&
      (!input.type || row.caisseType === input.type) &&
      (!input.status ||
        (row.status || (row.isActive ? 'ACTIVE' : 'INACTIVE')) ===
          input.status),
  )
  return result.sort((a, b) =>
    input.settingsSort === 'nameAsc'
      ? String(a.label || a.code || a.id).localeCompare(
          String(b.label || b.code || b.id),
          'fr',
        )
      : String(
          b[input.settingsSort === 'effective' ? 'effectiveAt' : 'createdAt'] ||
            '',
        ).localeCompare(
          String(
            a[
              input.settingsSort === 'effective' ? 'effectiveAt' : 'createdAt'
            ] || '',
          ),
        ),
  )
}
export function settingsOverview(module: FinanceModule, rows: Row[]) {
  return {
    total: rows.length,
    active: rows.filter((r) =>
      module === 'caisse-speciale' ? r.isActive : r.status === 'ACTIVE',
    ).length,
    types:
      module === 'caisse-speciale'
        ? caisseTypes.map((t) => ({
            ...t,
            count: rows.filter((r) => r.caisseType === t.value).length,
            active: rows.filter((r) => r.caisseType === t.value && r.isActive)
              .length,
          }))
        : [],
    usedCodes: module === 'caisse-imprevue' ? rows.map((r) => r.code) : [],
  }
}
export async function enrichSettingsAuthors(
  services: FinanceServices,
  row: Row,
) {
  const resolved = new Map<string, Promise<any>>()
  const author = async (id: unknown) => {
    if (typeof id !== 'string' || !id || /[\\/]/.test(id)) return null
    if (!resolved.has(id)) resolved.set(id, services.admins.getAdminById(id))
    const admin = await resolved.get(id)
    return admin
      ? {
          name:
            [admin.firstName, admin.lastName].filter(Boolean).join(' ') ||
            'Administrateur',
          email: admin.email || null,
        }
      : null
  }
  const [createdByAdmin, updatedByAdmin] = await Promise.all([
    author(row.createdBy),
    author(row.updatedBy),
  ])
  return { ...row, createdByAdmin, updatedByAdmin }
}
export function settingsExportRow(
  module: FinanceModule,
  r: Row,
): Record<string, unknown> {
  if (module === 'caisse-imprevue')
    return {
      Code: r.code,
      Libellé: r.label || '',
      Statut: r.statusLabel,
      'Mensualité (FCFA)': r.amountPerMonth,
      'Nominal (FCFA)': r.nominal,
      'Durée (mois)': r.durationInMonths,
      'Appui minimum (FCFA)': r.supportMin,
      'Appui maximum (FCFA)': r.supportMax,
      'Pénalité (%)': r.penaltyRate,
      'Délai de pénalité (jours)': r.penaltyDelayDays,
    }
  const penalty = r.penaltyRules?.day4To12 || {}
  return {
    ID: r.id,
    'Type de caisse': r.typeLabel,
    Statut: r.statusLabel,
    'Date d’effet': r.effectiveAt || '',
    ...Object.fromEntries(
      Array.from({ length: 9 }, (_, i) => [
        `Bonus M${i + 4} (%)`,
        r.bonusTable?.[`M${i + 4}`] || 0,
      ]),
    ),
    'Pénalité par jour (%)': penalty.perDay ?? '',
    'Utilise des paliers': Array.isArray(penalty.steps) ? 'Oui' : 'Non',
    Paliers: Array.isArray(penalty.steps)
      ? penalty.steps
          .map(
            (s: Row) =>
              `J+${Number(s.from) + 3} à J+${Number(s.to) + 3} : ${s.rate} %/jour`,
          )
          .join(' ; ')
      : '',
    'Créé le': r.createdAt || '',
    'Modifié le': r.updatedAt || '',
  }
}
