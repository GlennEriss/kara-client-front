/** Only read a URL already attached to the authenticated contract, in its Firebase bucket. */
export function financeAttachmentPath(
  detail: unknown,
  requested: string | undefined,
  bucket: string,
) {
  const belongs = (value: unknown): boolean =>
    value === requested ||
    (!!value && typeof value === 'object' && Object.values(value).some(belongs))
  if (!requested || !belongs(detail))
    throw new Error('Pièce jointe introuvable dans ce contrat.')
  const parsed = new URL(requested)
  if (
    !bucket ||
    parsed.protocol !== 'https:' ||
    parsed.username ||
    parsed.password
  )
    throw new Error('Référence de stockage invalide.')
  const prefix = `/v0/b/${bucket}/o/`
  if (
    parsed.hostname === 'firebasestorage.googleapis.com' &&
    parsed.pathname.startsWith(prefix)
  )
    return decodeURIComponent(parsed.pathname.slice(prefix.length))
  if (
    parsed.hostname === 'storage.googleapis.com' &&
    parsed.pathname.startsWith(`/${bucket}/`)
  )
    return decodeURIComponent(parsed.pathname.slice(bucket.length + 2))
  throw new Error('Cette pièce ne relève pas du stockage de l’application.')
}
