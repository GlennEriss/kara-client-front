/* eslint-disable no-restricted-imports -- Présentation native du journal existant ; constantes et moteur partagés avec le site. */
import { canWithAccess, resolveAdminAccess } from '@/domains/auth/access-policy'
import { PERMISSION_MODULES } from '@/constantes/permissions'
import {
  CALL_OUTCOME_LABELS,
  CONTACT_CHANNEL_LABELS,
  type CallLog,
} from '@/services/call-logs/callLog'
import { callLogSummary } from '@/utils/call-log-summary'
import type { AdminServices } from './context'
import type { MobileCaller } from '@/domains/mobile/server/access'
import { archiveDay, validateArchiveFilters } from './archive-presentation'

type Row = Record<string, any>
export const isStaff = (key: string) =>
  ['admins', 'agents', 'calls'].includes(key)
export const adminRoleLabels: Record<string, string> = {
  SuperAdmin: 'Super Administrateur',
  Admin: 'Administrateur',
  Secretary: 'Secrétaire',
  AgentRecouvrement: 'Agent de recouvrement',
  GestionnaireVehicules: 'Gestionnaire des véhicules',
}
const day = (v: unknown) => (v ? archiveDay(v) : '')
const normalize = (v: unknown) =>
  String(v || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('fr')
export function staffRow(key: string, row: Row, now = new Date()): Row {
  if (key === 'admins') {
    const roles = row.roles || (row.role ? [row.role] : ['Admin'])
    return {
      ...row,
      roles,
      displayName:
        [row.firstName, row.lastName].filter(Boolean).join(' ') ||
        row.name ||
        'Administrateur',
      roleLabels: roles.map(
        (r: string) => adminRoleLabels[r] || 'Rôle non renseigné',
      ),
      isActive: row.isActive !== false,
    }
  }
  if (key === 'agents') {
    const birth = day(row.dateNaissance),
      today = day(now),
      expiration = day(row.pieceIdentite?.dateExpiration)
    let age = birth
      ? Number(today.slice(0, 4)) -
        Number(birth.slice(0, 4)) -
        (today.slice(5) < birth.slice(5) ? 1 : 0)
      : null
    if (age != null && (age < 0 || age > 130)) age = null
    const days = expiration
      ? Math.ceil((Date.parse(expiration) - Date.parse(today)) / 86400000)
      : null
    return {
      ...row,
      actif: row.actif !== false,
      displayName: [row.nom, row.prenom].filter(Boolean).join(' ') || 'Agent',
      age,
      birthdayMonth: !!birth && birth.slice(5, 7) === today.slice(5, 7),
      birthdayToday: !!birth && birth.slice(5) === today.slice(5),
      identityDays: days,
      identityStatus:
        days == null
          ? 'unknown'
          : days < 0
            ? 'expired'
            : days <= 30
              ? 'expiring'
              : 'valid',
    }
  }
  return {
    ...row,
    displayName: row.name || 'Personne non renseignée',
    channelLabel:
      (CONTACT_CHANNEL_LABELS as Row)[row.channel] || 'Canal non renseigné',
    outcomeLabel:
      (CALL_OUTCOME_LABELS as Row)[row.outcome] || 'Résultat non renseigné',
    assigneeName: row.assignee?.name || 'Non attribuée',
  }
}
export function filterStaffRows(rows: Row[], input: Row, key: string) {
  validateArchiveFilters(input)
  const filtered = rows.filter((row) => {
    const haystack =
      key === 'calls'
        ? [row.name, row.matricule, row.summary, row.adminName]
        : [
            row.displayName,
            row.id,
            row.email,
            row.tel1,
            row.tel2,
            ...(row.contacts || []),
          ]
    if (
      input.search &&
      !normalize(haystack.join(' ')).includes(normalize(input.search))
    )
      return false
    if (input.staffRole && !row.roles?.includes(input.staffRole)) return false
    if (
      input.isActive &&
      String(key === 'agents' ? row.actif : row.isActive) !== input.isActive
    )
      return false
    if (input.agentTab === 'birthdays' && (!row.birthdayMonth || !row.actif))
      return false
    for (const k of ['channel', 'outcome', 'product', 'adminId', 'status'])
      if (input[k] && row[k] !== input[k]) return false
    const date = day(row.scheduledDate || row.createdAt)
    if ((input.from && date < input.from) || (input.to && date > input.to))
      return false
    return true
  })
  return filtered.sort((a, b) => {
    if (input.staffSort && input.staffSort !== 'recent') {
      const first = input.staffSort.startsWith('first')
      const label = (r: Row) =>
        first ? r.prenom || r.firstName : r.nom || r.lastName
      return (
        String(label(a) || '').localeCompare(String(label(b) || ''), 'fr') *
        (input.staffSort.endsWith('Desc') ? -1 : 1)
      )
    }
    return (
      String(b.createdAt || '').localeCompare(String(a.createdAt || '')) ||
      a.id.localeCompare(b.id)
    )
  })
}
const opts = (map: Record<string, string>) =>
  Object.entries(map).map(([value, label]) => ({ value, label }))
export async function staffOverview(
  services: AdminServices,
  caller: MobileCaller,
  key: string,
  dataset: string,
  all: Row[],
  selected: Row[],
) {
  if (key === 'admins') {
    const publicContact = canWithAccess(caller.access, 'settings.manage')
      ? (
          await services.db.collection('settings').doc('publicContact').get()
        ).data() || {}
      : null
    const permissionGroups = PERMISSION_MODULES.map((m) => ({
      key: m.key,
      label: m.label,
      system: !!m.system,
      actions: m.actions.map((a) => ({ value: a.key, label: a.label })),
    }))
    return {
      total: all.length,
      active: all.filter((r) => r.isActive).length,
      inactive: all.filter((r) => !r.isActive).length,
      roles: opts(adminRoleLabels).map((r) => ({
        ...r,
        count: all.filter((a) => a.roles.includes(r.value)).length,
      })),
      permissionGroups,
      rolePresets: Object.fromEntries(
        ['AgentRecouvrement', 'GestionnaireVehicules'].map((role) => [
          role,
          resolveAdminAccess([{ role }], {}).permissions,
        ]),
      ),
      publicContact: publicContact && {
        memberWhatsappNumber:
          publicContact.memberWhatsappNumber ||
          publicContact.whatsappNumber ||
          '+24174369729',
        guestWhatsappNumber:
          publicContact.guestWhatsappNumber ||
          publicContact.phoneNumber ||
          publicContact.memberWhatsappNumber ||
          publicContact.whatsappNumber ||
          '+24174369729',
      },
    }
  }
  if (key === 'agents')
    return {
      total: all.length,
      active: all.filter((r) => r.actif).length,
      inactive: all.filter((r) => !r.actif).length,
      male: all.filter((r) => r.sexe === 'M').length,
      female: all.filter((r) => r.sexe === 'F').length,
      birthdays: all.filter((r) => r.actif && r.birthdayMonth).length,
    }
  const asLog = (r: Row): CallLog =>
    ({
      ...r,
      createdAt: new Date(r.createdAt || 0),
      promiseToPayAt: r.promiseToPayAt ? new Date(r.promiseToPayAt) : undefined,
    }) as CallLog
  return {
    ...(dataset === 'logs'
      ? callLogSummary(selected.map(asLog), all.map(asLog))
      : {
          total: selected.length,
          planned: selected.filter((r) => r.status === 'planned').length,
          completed: selected.filter((r) => r.status === 'completed').length,
        }),
    channels: opts(CONTACT_CHANNEL_LABELS),
    outcomes: opts(CALL_OUTCOME_LABELS),
    products: [...new Set(all.map((r) => r.product).filter(Boolean))]
      .sort()
      .map((value) => ({ value, label: value })),
    admins: [
      ...new Map(
        all
          .filter((r) => r.adminId)
          .map((r) => [
            r.adminId,
            { value: r.adminId, label: r.adminName || 'Administrateur' },
          ]),
      ).values(),
    ],
  }
}
export function staffExportRow(key: string, row: Row): Record<string, unknown> {
  if (key === 'calls' && row.scheduledDate)
    return {
      'Date prévue': row.scheduledDate,
      'Membre / Groupe': row.name || '',
      Matricule: row.matricule || '',
      Produit: row.product || '',
      'Attribuée à': row.assigneeName || 'Non attribuée',
      État: row.status === 'completed' ? 'Terminée' : 'À effectuer',
      'Montant dû (FCFA)': row.totalOverdue ?? '',
      'Créée par': row.createdByName || '',
      'Terminée par': row.completedByName || '',
      'Terminée le': day(row.completedAt),
    }
  if (key === 'calls')
    return {
      Date: day(row.createdAt),
      Heure: row.createdAt
        ? new Intl.DateTimeFormat('fr-FR', {
            timeZone: 'Africa/Libreville',
            hour: '2-digit',
            minute: '2-digit',
          }).format(new Date(row.createdAt))
        : '',
      'Membre / Groupe': row.name || '',
      Matricule: row.matricule || '',
      Produit: row.product || '',
      Canal: row.channelLabel || '',
      Issue: row.outcomeLabel || '',
      Promesse: day(row.promiseToPayAt),
      'Montant dû (FCFA)': row.totalOverdue ?? '',
      Par: row.adminName || '',
      Commentaire: row.summary || '',
    }
  return {}
}
