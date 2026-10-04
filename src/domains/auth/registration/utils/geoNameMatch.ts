/**
 * Retrouve une entrée géographique (province, commune…) à partir de son nom.
 *
 * Les demandes faites depuis l'espace membre n'enregistrent que les noms de
 * l'adresse, pas les identifiants des listes. On s'en sert pour pré-remplir
 * les listes déroulantes lors d'une correction.
 */
export function normalizeGeoName(name?: string | null): string {
  return (name ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[\s'’-]+/g, ' ')
    .trim()
    .toLowerCase()
}

export function findByGeoName<T extends { name: string }>(items: readonly T[], name?: string | null): T | undefined {
  const target = normalizeGeoName(name)
  if (!target) return undefined
  return items.find((item) => normalizeGeoName(item.name) === target)
}
