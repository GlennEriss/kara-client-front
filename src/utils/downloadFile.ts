/**
 * Déclenche le téléchargement d'un fichier distant (ex: Firebase Storage) en le
 * faisant transiter par le proxy `/api/download`, qui force
 * `Content-Disposition: attachment`. Un simple `window.open(url)` ouvre souvent
 * le fichier en aperçu au lieu de le télécharger, ou échoue selon le navigateur.
 */
export function downloadFile(url: string | undefined | null, filename: string) {
  if (!url) {
    return false
  }
  const proxyUrl = `/api/download?url=${encodeURIComponent(url)}&filename=${encodeURIComponent(filename)}`
  const link = document.createElement('a')
  link.href = proxyUrl
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  return true
}
