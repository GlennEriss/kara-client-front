/**
 * Divise un nom ou prénom en paires de 2 mots si le nom contient plus de 2 mots
 * 
 * @param name - Le nom ou prénom à diviser
 * @returns Un tableau de chaînes, chaque chaîne contenant au maximum 2 mots
 * 
 * @example
 * formatNamePairs("MBOUMBOU MAKAYA EP MOULENGUI")
 * // ["MBOUMBOU MAKAYA", "EP MOULENGUI"]
 * 
 * @example
 * formatNamePairs("ELSIE NADINE")
 * // ["ELSIE NADINE"]
 * 
 * @example
 * formatNamePairs("JEAN")
 * // ["JEAN"]
 */
export function formatNamePairs(name: string): string[] {
  if (!name || typeof name !== 'string') {
    return []
  }

  const words = name.trim().split(/\s+/).filter(word => word.length > 0)
  
  if (words.length === 0) {
    return []
  }

  // Si le nom a 2 mots ou moins, retourner tel quel
  if (words.length <= 2) {
    return [words.join(' ')]
  }

  // Diviser en paires de 2 mots
  const pairs: string[] = []
  for (let i = 0; i < words.length; i += 2) {
    const pair = words.slice(i, i + 2).join(' ')
    pairs.push(pair)
  }

  return pairs
}
