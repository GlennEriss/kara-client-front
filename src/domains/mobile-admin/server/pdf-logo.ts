import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
/** Logo incorporé au PDF : aucun accès à window ni chargement HTTP pendant le rendu serveur. */
export async function nativePdfLogo() {
  const bytes = await readFile(resolve(process.cwd(), 'public/Logo-Kara.jpg'))
  return 'data:image/jpeg;base64,' + bytes.toString('base64')
}
