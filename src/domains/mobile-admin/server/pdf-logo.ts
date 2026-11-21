import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
/** Logo incorporé au PDF : aucun accès à window ni chargement HTTP pendant le rendu serveur. */
export async function nativePdfLogo() {
  const bytes = await readFile(resolve(process.cwd(), 'public/Logo-Kara.jpg'))
  return 'data:image/jpeg;base64,' + bytes.toString('base64')
}
/** Dimensions du PNG officiel, lues sans dépendance d’imagerie native. */
export async function nativeReceiptLogo() {
  const bytes = await readFile(resolve(process.cwd(), 'public/assets/caisse-speciale/caissesp-logo.png'))
  if(bytes.length < 24 || bytes.toString('ascii',12,16)!=='IHDR')throw new Error('Logo PNG invalide')
  return { dataUrl:'data:image/png;base64,'+bytes.toString('base64'),width:bytes.readUInt32BE(16),height:bytes.readUInt32BE(20) }
}
