/**
 * Normalise un nom pour la recherche (supprime accents, majuscules, etc.)
 * Fonction partagée pour Companies et Professions
 */
export function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim()
}
