/**
 * Persistance des modèles de messages personnalisés.
 *
 * Un seul document `settings/messageTemplates` contient les corps personnalisés,
 * indexés par clé de modèle. Les clés absentes retombent sur `defaultBody`.
 */

import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore'
import { db } from '@/firebase/firestore'

export const MESSAGE_TEMPLATES_DOC_PATH = ['settings', 'messageTemplates'] as const

/** Corps personnalisés, indexés par clé de modèle. */
export type MessageTemplateOverrides = Record<string, string>

interface MessageTemplatesDoc {
  templates?: MessageTemplateOverrides
  updatedAt?: unknown
  updatedBy?: string
}

export async function fetchMessageTemplateOverrides(): Promise<MessageTemplateOverrides> {
  const snap = await getDoc(doc(db, ...MESSAGE_TEMPLATES_DOC_PATH))
  if (!snap.exists()) return {}
  const data = snap.data() as MessageTemplatesDoc
  const templates = data.templates ?? {}
  // On ne garde que des chaînes non vides : un corps vide doit revenir au défaut.
  return Object.fromEntries(
    Object.entries(templates).filter(([, body]) => typeof body === 'string' && body.trim().length > 0)
  )
}

export async function saveMessageTemplateOverrides(
  overrides: MessageTemplateOverrides,
  adminId?: string
): Promise<void> {
  await setDoc(
    doc(db, ...MESSAGE_TEMPLATES_DOC_PATH),
    {
      templates: overrides,
      updatedAt: serverTimestamp(),
      ...(adminId ? { updatedBy: adminId } : {}),
    },
    { merge: true }
  )
}
