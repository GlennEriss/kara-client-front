/**
 * Persistance des modèles de messages personnalisés.
 *
 * Un seul document `settings/messageTemplates` contient les corps personnalisés,
 * indexés par clé de modèle. Les clés absentes retombent sur `defaultBody`.
 */

import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore'
import { db } from '@/firebase/firestore'
import { LINK_TEMPLATE_KEYS, normalizeMessageBaseUrl, type MessageTemplateUrls } from '../utils/message-template-links'

export const MESSAGE_TEMPLATES_DOC_PATH = ['settings', 'messageTemplates'] as const

/** Corps personnalisés, indexés par clé de modèle. */
export type MessageTemplateOverrides = Record<string, string>

interface MessageTemplatesDoc {
  templates?: MessageTemplateOverrides
  urls?: MessageTemplateUrls
  updatedAt?: unknown
  updatedBy?: string
}

export async function fetchMessageTemplateOverrides(): Promise<MessageTemplateOverrides> {
  return (await fetchMessageTemplateSettings()).overrides
}

export async function fetchMessageTemplateSettings(): Promise<{ overrides: MessageTemplateOverrides; urls: MessageTemplateUrls }> {
  const snap = await getDoc(doc(db, ...MESSAGE_TEMPLATES_DOC_PATH))
  if (!snap.exists()) return { overrides: {}, urls: {} }
  const data = snap.data() as MessageTemplatesDoc
  const templates = data.templates ?? {}
  // On ne garde que des chaînes non vides : un corps vide doit revenir au défaut.
  const overrides = Object.fromEntries(
    Object.entries(templates).filter(([, body]) => typeof body === 'string' && body.trim().length > 0)
  )
  const urls: MessageTemplateUrls = {}
  for (const [key, value] of Object.entries(data.urls ?? {})) {
    if (!LINK_TEMPLATE_KEYS.has(key) || typeof value !== 'string') continue
    try { const normalized = normalizeMessageBaseUrl(value); if (normalized) urls[key] = normalized } catch { /* Repli sur le site par défaut. */ }
  }
  return { overrides, urls }
}

export async function saveMessageTemplateOverrides(
  overrides: MessageTemplateOverrides,
  adminId?: string,
  urls: MessageTemplateUrls = {},
): Promise<void> {
  const normalizedUrls = Object.fromEntries(Object.entries(urls)
    .filter(([key, value]) => LINK_TEMPLATE_KEYS.has(key) && value.trim())
    .map(([key, value]) => [key, normalizeMessageBaseUrl(value)]))
  await setDoc(
    doc(db, ...MESSAGE_TEMPLATES_DOC_PATH),
    {
      templates: overrides,
      urls: normalizedUrls,
      updatedAt: serverTimestamp(),
      ...(adminId ? { updatedBy: adminId } : {}),
    },
    { mergeFields: ['templates', 'urls', 'updatedAt', ...(adminId ? ['updatedBy'] : [])] }
  )
}
