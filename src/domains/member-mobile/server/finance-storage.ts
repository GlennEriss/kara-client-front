import { randomUUID } from 'node:crypto'
import { getStorage } from 'firebase-admin/storage'
import { adminApp } from '@/firebase/admin'
import { MemberError } from './data'
import type { MemberCaller } from './access'
import type { UploadedMemberFiles } from './finance-actions'

export const memberFileTypes: Record<string, string> = {
  'application/pdf': 'pdf',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}
export function validateMemberUpload(bytes: Buffer, mime: string) {
  const valid =
    mime === 'application/pdf'
      ? bytes.subarray(0, 5).toString() === '%PDF-'
      : mime === 'image/jpeg'
        ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
        : mime === 'image/png'
          ? bytes
              .subarray(0, 8)
              .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
          : mime === 'image/webp'
            ? bytes.subarray(0, 4).toString() === 'RIFF' &&
              bytes.subarray(8, 12).toString() === 'WEBP'
            : false
  if (!valid || !bytes.length || bytes.length > 8 * 1024 * 1024)
    throw new MemberError(
      'Joignez un PDF ou une image valide, de 8 Mo maximum.',
    )
}
export async function uploadMemberFinanceFiles(
  form: FormData,
  caller: MemberCaller,
  id: string,
  allowed: string[],
) {
  const output: UploadedMemberFiles = {}
  try {
    for (const [key, value] of form.entries()) {
      if (typeof value === 'string') continue
      if (!allowed.includes(key))
        throw new MemberError('Pièce jointe inattendue.')
      if (output[key])
        throw new MemberError('Une seule pièce jointe est autorisée par champ.')
      if (
        value.size <= 0 ||
        value.size > 8 * 1024 * 1024 ||
        !memberFileTypes[value.type]
      )
        throw new MemberError('Format ou taille de fichier invalide.')
      const bytes = Buffer.from(await value.arrayBuffer())
      validateMemberUpload(bytes, value.type)
      const bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
      if (!adminApp || !bucketName)
        throw new MemberError('Stockage indisponible.', 503)
      // Un chemin neuf par tentative : un retry ne peut remplacer une pièce déjà validée.
      const path = `members/${caller.matricule}/${id}/mobile/${randomUUID()}-${key}.${memberFileTypes[value.type]}`
      const token = randomUUID(),
        file = getStorage(adminApp).bucket(bucketName).file(path)
      await file.save(bytes, {
        resumable: false,
        metadata: {
          contentType: value.type,
          metadata: { firebaseStorageDownloadTokens: token },
        },
      })
      output[key] = {
        url: `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodeURIComponent(path)}?alt=media&token=${token}`,
        path,
        mime: value.type,
        size: bytes.length,
        name: value.name.slice(0, 140),
      }
    }
    return output
  } catch (error) {
    await deleteMemberUploads(output)
    throw error
  }
}
export async function deleteMemberUploads(files: UploadedMemberFiles) {
  if (!adminApp) return
  const bucket = getStorage(adminApp).bucket(
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  )
  await Promise.allSettled(
    Object.values(files).map((f) =>
      bucket.file(f.path).delete({ ignoreNotFound: true }),
    ),
  )
}
export function memberStoragePath(source: string, bucket: string) {
  try {
    const url = new URL(source)
    if (url.protocol !== 'https:' || url.username || url.password || !bucket)
      throw Error()
    if (
      url.hostname === 'firebasestorage.googleapis.com' &&
      url.pathname.startsWith(`/v0/b/${bucket}/o/`)
    )
      return decodeURIComponent(url.pathname.slice(`/v0/b/${bucket}/o/`.length))
    if (
      url.hostname === 'storage.googleapis.com' &&
      url.pathname.startsWith(`/${bucket}/`)
    )
      return decodeURIComponent(url.pathname.slice(bucket.length + 2))
  } catch {
    // Une source mal formée est refusée ci-dessous, sans requête réseau.
  }
  throw new MemberError('Source de document non autorisée.')
}
export async function readMemberFinanceFile(source: string, name: string) {
  const bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || ''
  const path = memberStoragePath(source, bucketName)
  if (!adminApp) throw new MemberError('Stockage indisponible.', 503)
  const file = getStorage(adminApp).bucket(bucketName).file(path),
    [meta] = await file.getMetadata()
  const mime = meta.contentType || ''
  if (!memberFileTypes[mime] || Number(meta.size) > 20 * 1024 * 1024)
    throw new MemberError('Format ou taille non pris en charge.')
  const [bytes] = await file.download()
  return {
    base64: bytes.toString('base64'),
    mime,
    filename: `${name.replace(/[^\w.-]/g, '_')}.${memberFileTypes[mime]}`,
  }
}
