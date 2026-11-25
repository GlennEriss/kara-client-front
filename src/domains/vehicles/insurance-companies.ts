export const insurerSettingsId = 'insuranceCompanies'
export const defaultInsurers = ['AXA', 'NSIA', 'OGAR'] as const

export function insurerKey(name?: string | null) {
  return (name ?? '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ').trim()
}

export function insurerLabel(name: string | null | undefined, choices: readonly string[] = defaultInsurers) {
  const key = insurerKey(name)
  return choices.find(choice => insurerKey(choice) === key) ?? name ?? ''
}

export function readInsurerNames(data?: { names?: unknown }): string[] {
  if (!Array.isArray(data?.names)) return [...defaultInsurers]
  const names = new Map<string, string>()
  for (const name of data.names) {
    if (typeof name !== 'string') continue
    const clean = name.trim().replace(/\s+/g, ' ')
    const key = insurerKey(clean)
    if (!key || names.has(key)) continue
    names.set(key, insurerLabel(clean))
  }
  return [...names.values()].sort((a, b) => a.localeCompare(b, 'fr'))
}

export function resolveInsurerSelection(name: string, choices?: readonly string[], legacy?: string) {
  const key = insurerKey(name)
  if (!key) return null
  return choices?.find(choice => insurerKey(choice) === key) ?? (name === legacy ? insurerLabel(name) : null)
}
