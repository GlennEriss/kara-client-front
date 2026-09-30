const STORED_DOCUMENT_HOSTS = [/^firebasestorage\.googleapis\.com$/, /^storage\.googleapis\.com$/, /\.firebasestorage\.app$/]

/**
 * URL d'un document Firebase Storage : seule origine acceptée par le proxy
 * `/api/download`. Sans cette restriction, il téléchargerait n'importe quelle
 * adresse depuis le serveur (SSRF).
 */
export function isFirebaseStorageUrl(raw: string | null | undefined): boolean {
  if (!raw) return false
  try {
    const parsed = new URL(raw)
    return parsed.protocol === 'https:' && STORED_DOCUMENT_HOSTS.some((pattern) => pattern.test(parsed.hostname))
  } catch {
    return false
  }
}
