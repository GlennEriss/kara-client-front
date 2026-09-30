/**
 * URL d'aperçu d'un PDF dans une iframe. Sans droit de téléchargement, la
 * barre d'outils du lecteur PDF (enregistrer, imprimer) est masquée — Chrome et
 * Edge respectent ce paramètre ; c'est une gêne, pas une protection.
 */
export function pdfPreviewUrl(url: string, canDownload: boolean): string {
  if (canDownload) return url
  return `${url.split('#')[0]}#toolbar=0&navpanes=0`
}
