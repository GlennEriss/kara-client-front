import { getDownloadURL, ref, uploadBytes } from 'firebase/storage'
import { storage } from '@/firebase/storage'
import { agreementId } from './agreement-model'

export async function uploadAgreementPaymentProof(
  groupId: string,
  id: string,
  paymentId: string,
  file: File,
): Promise<string> {
  const formats: Record<string, string> = {
    'application/pdf': 'pdf',
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
  }
  const extension = formats[file.type]
  if (!extension || file.size <= 0 || file.size > 5 * 1024 * 1024)
    throw new Error('Choisissez une image JPG, PNG, WebP ou un PDF de 5 Mo maximum.')
  const digest = await crypto.subtle.digest('SHA-256', await file.arrayBuffer())
  const hash = [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
  const target = ref(
    storage,
    `group-agreements/${agreementId(groupId)}/${agreementId(id)}/${agreementId(paymentId)}/proof-${hash}.${extension}`,
  )
  try {
    return await getDownloadURL(target)
  } catch (error) {
    if ((error as { code?: string }).code !== 'storage/object-not-found') throw error
  }
  await uploadBytes(target, file, { contentType: file.type })
  return getDownloadURL(target)
}
