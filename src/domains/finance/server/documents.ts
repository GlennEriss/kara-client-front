import { randomUUID } from 'node:crypto'
import { getStorage } from 'firebase-admin/storage'
import { adminApp } from '@/firebase/admin'
import { DocumentRepository } from '@/domains/infrastructure/documents/repositories/DocumentRepository'

export const MAX_FINANCE_FILE_BYTES = 8 * 1024 * 1024
export async function validateFinanceFile(
  file: File,
  maxBytes = MAX_FINANCE_FILE_BYTES,
): Promise<void> {
  if (!file.size || file.size > maxBytes)
    throw new Error(
      `Le document doit peser entre 1 octet et ${Math.round(maxBytes / (1024 * 1024))} Mo.`,
    )
  const bytes = Buffer.from(await file.slice(0, 16).arrayBuffer())
  const valid =
    (file.type === 'application/pdf' &&
      bytes.subarray(0, 5).toString() === '%PDF-') ||
    (file.type === 'image/jpeg' && bytes[0] === 255 && bytes[1] === 216) ||
    (file.type === 'image/png' &&
      bytes
        .subarray(0, 8)
        .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) ||
    (file.type === 'image/webp' &&
      bytes.subarray(0, 4).toString() === 'RIFF' &&
      bytes.subarray(8, 12).toString() === 'WEBP')
  if (!valid)
    throw new Error(
      'Seuls les PDF et les images JPEG, PNG ou WebP valides sont acceptés.',
    )
}

/** Same download-token URLs as the web app, without a browser upload session. */
export class ServerFinanceDocuments extends DocumentRepository {
  private bucket() {
    if (!adminApp) throw new Error('Stockage indisponible')
    return getStorage(adminApp).bucket(
      process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    )
  }
  override async uploadDocumentFile(
    file: File,
    memberId: string,
    documentType: string,
    onProgress?: (percent: number) => void,
  ) {
    await validateFinanceFile(file)
    const segment = (value: string) =>
      value.replace(/[^a-zA-Z0-9_.-]/g, '_').slice(0, 180)
    const extension = {
      'application/pdf': 'pdf',
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
    }[file.type]!
    const path =
      documentType === 'GROUP_AGREEMENT_PROOF'
        ? `group-agreements/${segment(memberId)}/${randomUUID()}.${extension}`
        : `mobile-finance/${segment(memberId)}/${segment(documentType)}/${randomUUID()}.${extension}`
    const token = randomUUID()
    const bucket = this.bucket()
    await bucket.file(path).save(Buffer.from(await file.arrayBuffer()), {
      resumable: false,
      contentType: file.type,
      metadata: {
        metadata: { firebaseStorageDownloadTokens: token },
        cacheControl: 'private, max-age=0',
      },
    })
    onProgress?.(100)
    return {
      path,
      size: file.size,
      url: `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(path)}?alt=media&token=${token}`,
    }
  }
  override async deleteFile(path: string) {
    if (
      !path ||
      path.startsWith('/') ||
      path.includes('..') ||
      path.includes('://')
    )
      throw new Error('Chemin de document invalide')
    await this.bucket().file(path).delete({ ignoreNotFound: true })
  }
  override async uploadImage(
    imageUrl: string,
    memberId: string,
    contractId: string,
    imageType: string,
  ) {
    if (!/^data:image\/(jpeg|png|webp);base64,/.test(imageUrl))
      throw new Error('Image invalide')
    const [header, encoded] = imageUrl.split(',')
    const file = new File([Buffer.from(encoded, 'base64')], 'justificatif', {
      type: header.slice(5, header.indexOf(';')),
    })
    return this.uploadDocumentFile(file, memberId, `${imageType}-${contractId}`)
  }
}
