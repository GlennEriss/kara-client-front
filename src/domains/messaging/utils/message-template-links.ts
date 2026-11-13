import type { TemplateVariables } from './renderTemplate'

export type MessageTemplateUrls = Record<string, string>
export const LINK_TEMPLATE_KEYS = new Set([
  'communityEventInvitation', 'charityEventInvitation', 'eventContributionNotice', 'membershipCorrections',
])

/** L'adresse du site est configurable ; l'identifiant du dossier, le chemin
 * et les paramètres du lien restent ceux de l'opération réelle. */
export function normalizeMessageBaseUrl(value: string): string {
  if (!value.trim()) return ''
  const url = new URL(value.trim())
  if ((url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname))) || url.username || url.password || url.search || url.hash) {
    throw new Error('Renseignez une URL HTTPS de site, sans identifiant, paramètres ni fragment.')
  }
  return url.toString().replace(/\/+$/, '')
}

export function messageLinkVariables(variables: TemplateVariables, baseUrl?: string): TemplateVariables {
  if (!baseUrl) return variables
  const base = normalizeMessageBaseUrl(baseUrl)
  return Object.fromEntries(Object.entries(variables).map(([key, value]) => {
    if (!['lien', 'lienEvenement', 'instructions', 'contribution'].includes(key) || typeof value !== 'string') return [key, value]
    return [key, value.replace(/https?:\/\/[^\s<>"']+/g, (original) => {
      try {
        const url = new URL(original)
        const target = new URL(base)
        const prefix = target.pathname.replace(/\/+$/, '')
        if (url.origin === target.origin && (!prefix || url.pathname === prefix || url.pathname.startsWith(`${prefix}/`))) return original
        return `${base}${url.pathname}${url.search}${url.hash}`
      } catch { return original }
    })]
  }))
}
