import { onRequest } from 'firebase-functions/v2/https'

function normalizeText(text: unknown): string {
  if (!text || typeof text !== 'string') return ''
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

function normalizePhone(value: unknown): string {
  if (!value || typeof value !== 'string') return ''
  return value.replace(/[\s\-\(\)]/g, '').toLowerCase()
}

function getPath<T = unknown>(obj: any, path: string): T | undefined {
  if (!obj || typeof obj !== 'object') return undefined
  return path.split('.').reduce<any>((acc, key) => (acc == null ? undefined : acc[key]), obj) as T | undefined
}

function generateMembershipRequestSearchableText(requestId: string, data: any): string {
  const parts: string[] = []

  if (requestId) parts.push(normalizeText(requestId))

  if (data.matricule) parts.push(normalizeText(data.matricule))

  const firstName = data.firstName || getPath<string>(data, 'identity.firstName') || ''
  const lastName = data.lastName || getPath<string>(data, 'identity.lastName') || ''
  if (firstName) parts.push(normalizeText(firstName))
  if (lastName) parts.push(normalizeText(lastName))
  if (firstName && lastName) parts.push(normalizeText(`${firstName} ${lastName}`))

  const email = data.email || getPath<string>(data, 'identity.email') || ''
  if (email) parts.push(normalizeText(email))

  const contacts = data.contacts || getPath<any>(data, 'identity.contacts')
  if (Array.isArray(contacts)) {
    for (const c of contacts) {
      if (typeof c === 'string' && c) parts.push(normalizePhone(c))
    }
  }

  return parts.join(' ')
}

/**
 * Transform HTTP function for Algolia Firebase Extension (membership-requests).
 *
 * Payload: { data: <record> }
 * Response: { data: <record_transformé> }
 */
export const transformMembershipRequestsAlgoliaPayload = onRequest(
  { cors: false },
  (req, res) => {
    try {
      const payload = (req as any)?.body?.data
      if (!payload || typeof payload !== 'object') {
        res.status(400).json({ error: 'Missing body.data payload' })
        return
      }

      const requestId = String(payload.objectID || payload.id || '')
      const result = { ...payload }

      // Aplatir identity.* → firstName/lastName/email/contacts (attendu côté front)
      result.firstName = result.firstName || getPath<string>(payload, 'identity.firstName') || ''
      result.lastName = result.lastName || getPath<string>(payload, 'identity.lastName') || ''
      result.email = result.email || getPath<string>(payload, 'identity.email') || ''
      result.contacts = result.contacts || getPath<any[]>(payload, 'identity.contacts') || []

      // Champ central de recherche (utilisé par le front)
      result.searchableText = generateMembershipRequestSearchableText(requestId, result)

      // IMPORTANT: L'extension Firebase Algolia attend { data: ... } et non { result: ... }
      res.json({ data: result })
    } catch (e: any) {
      res.status(500).json({ error: e?.message || 'Unexpected error' })
    }
  }
)

