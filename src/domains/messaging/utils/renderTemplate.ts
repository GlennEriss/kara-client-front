/**
 * Interpolation des modèles de messages : `{{variable}}` → valeur.
 *
 * Volontairement minimaliste (pas de logique conditionnelle) : les modèles sont
 * édités par des administrateurs, pas par des développeurs.
 */

export type TemplateVariables = Record<string, string | number | null | undefined>

/** Les espaces autour du nom sont tolérés : `{{ nom }}` fonctionne comme `{{nom}}`. */
const PLACEHOLDER = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g

/**
 * Remplace les variables du modèle. Une variable absente du dictionnaire est
 * remplacée par une chaîne vide plutôt que laissée telle quelle : un membre ne
 * doit jamais recevoir « {{montant}} » dans son message.
 */
export function renderTemplate(body: string, variables: TemplateVariables = {}): string {
  return body
    .replace(PLACEHOLDER, (_match, name: string) => {
      const value = variables[name]
      return value === null || value === undefined ? '' : String(value)
    })
    .trim()
}

/** Variables réellement utilisées dans un corps de message (pour l'aperçu). */
export function extractTemplateVariables(body: string): string[] {
  const found = new Set<string>()
  for (const match of body.matchAll(PLACEHOLDER)) {
    found.add(match[1])
  }
  return [...found]
}
