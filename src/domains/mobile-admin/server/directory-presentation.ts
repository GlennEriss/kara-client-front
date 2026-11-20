/* eslint-disable no-restricted-imports -- Les libellés d’audit sont partagés avec le journal du site. */
import { AUDIT_ACTION_LABELS } from '@/services/audit/auditLog'
import { PERMISSION_MODULES } from '@/constantes/permissions'
import type { AdminServices } from './context'
import { archiveDay, validateArchiveFilters } from './archive-presentation'
type Row = Record<string, any>
export const geographyLevels = [
  'provinces',
  'departments',
  'communes',
  'districts',
  'quarters',
] as const
export const geographyLabels: Record<string, string> = {
  provinces: 'Provinces',
  departments: 'Départements',
  communes: 'Communes',
  districts: 'Arrondissements',
  quarters: 'Quartiers',
}
export const geographyParents: Record<string, [string, string]> = {
  departments: ['provinces', 'provinceId'],
  communes: ['departments', 'departmentId'],
  districts: ['communes', 'communeId'],
  quarters: ['districts', 'districtId'],
}
export const isDirectory = (key: string) =>
  ['journal', 'references', 'geography'].includes(key)
const norm = (v: unknown) =>
  String(v || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
const graphs = new WeakMap<AdminServices, Promise<Record<string, Row[]>>>()
export function geographyGraph(services: AdminServices) {
  let promise = graphs.get(services)
  if (!promise) {
    promise = Promise.all(
      geographyLevels.map(async (level) => {
        const snapshot = await services.db.collection(level).limit(10001).get()
        if (snapshot.size > 10000)
          throw Error(
            'Le volume géographique nécessite une recherche serveur plus précise.',
          )
        return [
          level,
          snapshot.docs.map((d) => ({ ...d.data(), id: d.id })),
        ] as const
      }),
    ).then((entries) => Object.fromEntries(entries))
    graphs.set(services, promise)
  }
  return promise
}
export function directoryRow(
  module: string,
  dataset: string,
  row: Row,
  graph: Record<string, Row[]> = {},
): Row {
  if (module === 'journal')
    return {
      ...row,
      displayName: row.description || 'Action administrative',
      actionLabel: (AUDIT_ACTION_LABELS as Row)[row.action] || 'Autre',
      moduleLabel:
        PERMISSION_MODULES.find((m) => m.key === row.module)?.label ||
        row.moduleLabel ||
        'Autre',
      adminName: row.adminName || 'Administrateur non renseigné',
    }
  if (module === 'references')
    return { ...row, displayName: row.name || 'Nom non renseigné' }
  const ancestry: Record<string, string> = {},
    names: Record<string, string> = {},
    visited = new Set<string>()
  let current = row,
    level = dataset
  while (geographyParents[level]) {
    const [parent, key] = geographyParents[level],
      id = current[key]
    if (!id || visited.has(parent)) break
    visited.add(parent)
    ancestry[key] = id
    const found = graph[parent]?.find((r) => r.id === id)
    names[key.replace('Id', 'Name')] = found?.name || 'Parent introuvable'
    if (!found) break
    current = found
    level = parent
  }
  const next =
    geographyLevels[
      geographyLevels.indexOf(dataset as (typeof geographyLevels)[number]) + 1
    ]
  const children = next
    ? graph[next]?.filter((r) => r[geographyParents[next][1]] === row.id)
        .length || 0
    : 0
  return {
    ...row,
    ...ancestry,
    ...names,
    displayName: row.name || 'Nom non renseigné',
    childDataset: next || null,
    childCount: children,
  }
}
export async function directoryRows(
  services: AdminServices,
  module: string,
  dataset: string,
  rows: Row[],
) {
  if (!isDirectory(module)) return rows
  const graph = module === 'geography' ? await geographyGraph(services) : {}
  return rows.map((row) => directoryRow(module, dataset, row, graph))
}
export function filterDirectoryRows(rows: Row[], input: Row, module: string) {
  validateArchiveFilters(input)
  const selected = rows.filter((row) => {
    const fields =
      module === 'journal'
        ? [row.adminName, row.description, row.targetId, row.targetType]
        : [
            row.name,
            row.code,
            row.alias,
            row.industry,
            row.description,
            ...Object.values(row.address || {}),
          ]
    if (input.search && !norm(fields.join(' ')).includes(norm(input.search)))
      return false
    for (const k of [
      'action',
      'module',
      'adminId',
      'provinceId',
      'departmentId',
      'communeId',
      'districtId',
    ])
      if (input[k] && row[k] !== input[k]) return false
    if (
      input.parentId &&
      ![
        row.provinceId,
        row.departmentId,
        row.communeId,
        row.districtId,
      ].includes(input.parentId)
    )
      return false
    const day = archiveDay(row.createdAt)
    if ((input.from && day < input.from) || (input.to && day > input.to))
      return false
    return true
  })
  return selected.sort((a, b) =>
    module === 'journal' || input.directorySort === 'recent'
      ? String(b.createdAt || '').localeCompare(String(a.createdAt || '')) ||
        a.id.localeCompare(b.id)
      : String(a.name || '').localeCompare(String(b.name || ''), 'fr') *
        (input.directorySort === 'nameDesc' ? -1 : 1),
  )
}
export async function directoryOverview(
  services: AdminServices,
  module: string,
  all: Row[],
  now = new Date(),
) {
  if (module === 'journal')
    return {
      total: all.length,
      today: all.filter((r) => archiveDay(r.createdAt) === archiveDay(now))
        .length,
      admins: new Set(all.map((r) => r.adminId)).size,
      deletions: all.filter((r) => r.action === 'delete').length,
      sampleLimit: 500,
      actions: Object.entries(AUDIT_ACTION_LABELS).map(([value, label]) => ({
        value,
        label,
      })),
      modules: [
        ...new Map(
          all.map((r) => [r.module, { value: r.module, label: r.moduleLabel }]),
        ).values(),
      ],
      authors: [
        ...new Map(
          all.map((r) => [r.adminId, { value: r.adminId, label: r.adminName }]),
        ).values(),
      ],
    }
  if (module === 'references')
    return {
      counts: await Promise.all(
        ['companies', 'professions'].map(async (key) => ({
          key,
          label: key === 'companies' ? 'Entreprises' : 'Métiers',
          value: (await services.db.collection(key).count().get()).data().count,
        })),
      ),
    }
  const graph = await geographyGraph(services)
  return {
    counts: geographyLevels.map((key) => ({
      key,
      label: geographyLabels[key],
      value: graph[key].length,
    })),
    hierarchy: Object.fromEntries(
      geographyLevels.map((level) => [
        level,
        graph[level].map((row) => {
          const r = directoryRow(module, level, row, graph)
          return {
            value: r.id,
            label: r.name,
            ...Object.fromEntries(
              [
                'provinceId',
                'departmentId',
                'communeId',
                'districtId',
                'provinceName',
                'departmentName',
                'communeName',
                'districtName',
              ]
                .filter((k) => r[k])
                .map((k) => [k, r[k]]),
            ),
          }
        }),
      ]),
    ),
  }
}
export function directoryExportRow(
  module: string,
  dataset: string,
  row: Row,
): Record<string, unknown> {
  if (module === 'journal')
    return {
      Date: archiveDay(row.createdAt),
      Heure: row.createdAt
        ? new Intl.DateTimeFormat('fr-FR', {
            timeZone: 'Africa/Libreville',
            hour: '2-digit',
            minute: '2-digit',
          }).format(new Date(row.createdAt))
        : '',
      Administrateur: row.adminName,
      Email: row.adminEmail || '',
      Action: row.actionLabel,
      Module: row.moduleLabel,
      'Type de cible': row.targetType || '',
      'Identifiant cible': row.targetId || '',
      Description: row.description || '',
    }
  if (module === 'references')
    return dataset === 'companies'
      ? {
          Nom: row.name,
          Secteur: row.industry || '',
          Province: row.address?.province || '',
          Ville: row.address?.city || '',
          Quartier: row.address?.district || '',
        }
      : { Nom: row.name, Description: row.description || '' }
  return {
    ...(row.code ? { Code: row.code } : {}),
    [geographyLabels[dataset]]: row.name,
    ...Object.fromEntries(
      [
        ['provinceName', 'Province'],
        ['departmentName', 'Département'],
        ['communeName', 'Commune'],
        ['districtName', 'Arrondissement'],
        ['postalCode', 'Code postal'],
        ['alias', 'Alias'],
      ]
        .filter(([k]) => row[k])
        .map(([k, label]) => [label, row[k]]),
    ),
    ...(row.childDataset
      ? { [geographyLabels[row.childDataset]]: row.childCount }
      : {}),
  }
}
