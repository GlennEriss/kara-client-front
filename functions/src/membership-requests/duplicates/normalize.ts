/**
 * Normalisation des champs pour la détection des doublons
 * Voir documentation/membership-requests/doublons/functions/README.md
 */

export function normalizeEmail(email?: string | null): string | null {
  if (email == null || typeof email !== 'string') return null
  const t = email.trim()
  return t === '' ? null : t.toLowerCase()
}

export function normalizeDocNumber(docNumber?: string | null): string | null {
  if (docNumber == null || typeof docNumber !== 'string') return null
  const t = docNumber.trim().toUpperCase().replace(/\s+/g, '')
  return t === '' ? null : t
}

export function normalizePhone(phone?: string | null): string | null {
  if (phone == null || typeof phone !== 'string') return null
  const t = phone.replace(/[\s\-\(\)]/g, '')
  return t === '' ? null : t
}
