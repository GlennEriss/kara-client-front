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

function generateMemberSearchableText(userId: string, data: any): string {
  const parts: string[] = []

  const matricule = (data.matricule || userId) as string
  if (matricule) parts.push(normalizeText(matricule))

  const firstName = (data.firstName || getPath<string>(data, 'firstName')) as string
  const lastName = (data.lastName || getPath<string>(data, 'lastName')) as string
  if (firstName) parts.push(normalizeText(firstName))
  if (lastName) parts.push(normalizeText(lastName))
  if (firstName && lastName) parts.push(normalizeText(`${firstName} ${lastName}`))

  const email = (data.email || getPath<string>(data, 'email')) as string
  if (email) parts.push(normalizeText(email))

  const contacts = (data.contacts || getPath<any>(data, 'contacts')) as unknown
  if (Array.isArray(contacts)) {
    for (const c of contacts) {
      if (typeof c === 'string' && c) parts.push(normalizePhone(c))
    }
  }

  const companyName = (data.companyName || getPath<string>(data, 'companyName')) as string
  if (companyName) parts.push(normalizeText(companyName))

  const profession = (data.profession || getPath<string>(data, 'profession')) as string
  if (profession) parts.push(normalizeText(profession))

  const address = (data.address || getPath<any>(data, 'address')) as any
  const province = address?.province || data.province
  const city = address?.city || data.city
  const arrondissement = address?.arrondissement || data.arrondissement
  const district = address?.district || data.district
  if (province) parts.push(normalizeText(province))
  if (city) parts.push(normalizeText(city))
  if (arrondissement) parts.push(normalizeText(arrondissement))
  if (district) parts.push(normalizeText(district))

  return parts.join(' ')
}

/**
 * Transform HTTP function for Algolia Firebase Extension.
 *
 * L’extension Algolia appelle cette URL (POST) :
 * https://{LOCATION}-{PROJECT_ID}.cloudfunctions.net/{TRANSFORM_FUNCTION}
 *
 * Payload: { data: <record> }
 * Response attendu: { result: <record_transformé> }
 */
export const transformMembersAlgoliaPayload = onRequest(
  { cors: false },
  (req, res) => {
    try {
      const payload = (req as any)?.body?.data
      if (!payload || typeof payload !== 'object') {
        res.status(400).json({ error: 'Missing body.data payload' })
        return
      }

      const userId = String(payload.objectID || payload.id || '')
      const result = { ...payload }

      // Normaliser quelques champs “plats” attendus côté front
      result.matricule = result.matricule || userId
      result.firstName = result.firstName || getPath<string>(payload, 'firstName') || ''
      result.lastName = result.lastName || getPath<string>(payload, 'lastName') || ''
      result.email = result.email || getPath<string>(payload, 'email') || ''
      result.contacts = result.contacts || getPath<any[]>(payload, 'contacts') || []

      // Aplatir l’adresse si l’extension a indexé les sous-champs
      const address = result.address || {}
      result.province = result.province || address.province || ''
      result.city = result.city || address.city || ''
      result.district = result.district || address.district || ''
      result.arrondissement = result.arrondissement || address.arrondissement || ''

      // Champ central de recherche (utilisé par le front)
      result.searchableText = generateMemberSearchableText(userId, result)

      res.json({ result })
    } catch (e: any) {
      res.status(500).json({ error: e?.message || 'Unexpected error' })
    }
  }
)

