import { randomUUID } from 'node:crypto'
import { getStorage } from 'firebase-admin/storage'
import { adminApp } from '@/firebase/admin'
import { validateFinanceFile } from '@/domains/finance/server/documents'
export async function validateAdminFile(file: File, charity = false) {
  if (charity && file.type.startsWith('video/')) {
    if (!file.size || file.size > 50 * 1024 * 1024)
      throw Error('La vidéo ne doit pas dépasser 50 Mo.')
    const bytes = Buffer.from(await file.slice(0, 16).arrayBuffer())
    const valid =
      (['video/mp4', 'video/quicktime'].includes(file.type) &&
        bytes.subarray(4, 8).toString() === 'ftyp') ||
      (file.type === 'video/webm' &&
        bytes.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3])))
    if (!valid) throw Error('Choisissez une vidéo MP4, MOV ou WebM valide.')
    return
  }
  await validateFinanceFile(file, charity ? 10 * 1024 * 1024 : undefined)
}
/** Port de stockage limité aux chemins des médias et preuves bienfaiteur. */
export function createCharityStorage() {
  const bucket = () => {
    if (!adminApp) throw Error('Stockage indisponible.')
    return getStorage(adminApp).bucket(
      process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    )
  }
  const ref = (_storage: unknown, path: string) => {
    if (
      !path.startsWith('charity-events/') ||
      path.includes('..') ||
      path.includes('://') ||
      path.length > 700
    )
      throw Error('Chemin de média invalide.')
    return { fullPath: path }
  }
  const upload = async (reference: { fullPath: string }, file: File) => {
    await validateAdminFile(file, true)
    const token = randomUUID()
    await bucket()
      .file(reference.fullPath)
      .save(Buffer.from(await file.arrayBuffer()), {
        resumable: false,
        contentType: file.type,
        metadata: {
          metadata: { firebaseStorageDownloadTokens: token },
          cacheControl: 'private, max-age=0',
        },
      })
    return { ref: reference }
  }
  return {
    ref,
    uploadBytes: upload,
    uploadBytesResumable: (reference: { fullPath: string }, file: File) => {
      const completion = upload(reference, file)
      const task = {
        snapshot: {
          ref: reference,
          bytesTransferred: 0,
          totalBytes: file.size,
        },
        on: (
          _event: string,
          progress: (snapshot: any) => void,
          error: (cause: unknown) => void,
          done: () => void,
        ) => {
          completion.then(() => {
            task.snapshot.bytesTransferred = file.size
            progress(task.snapshot)
            done()
          }, error)
          return () => {}
        },
      }
      return task
    },
    getDownloadURL: async (reference: { fullPath: string }) => {
      const b = bucket()
      const [metadata] = await b.file(reference.fullPath).getMetadata()
      const token = String(
        metadata.metadata?.firebaseStorageDownloadTokens || '',
      ).split(',')[0]
      if (!token)
        throw Error('Ce média ne dispose pas de référence de téléchargement.')
      return `https://firebasestorage.googleapis.com/v0/b/${b.name}/o/${encodeURIComponent(reference.fullPath)}?alt=media&token=${token}`
    },
    deleteObject: async (reference: { fullPath: string }) => {
      await bucket().file(reference.fullPath).delete({ ignoreNotFound: true })
    },
    getStorageInstance: () => ({}),
  }
}
