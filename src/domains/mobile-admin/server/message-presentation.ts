import {
  MESSAGE_TEMPLATES,
  MESSAGE_TEMPLATE_CATEGORY_LABELS,
} from '@/domains/messaging/constants/message-templates'
import {
  LINK_TEMPLATE_KEYS,
  normalizeMessageBaseUrl,
} from '@/domains/messaging/utils/message-template-links'
export function messageRows(saved: Record<string, any> = {}) {
  return MESSAGE_TEMPLATES.map((template) => {
    const label = template.label.replace(/^Bienfaiteur —/, 'Charité —')
    const body =
      typeof saved.templates?.[template.key] === 'string' &&
      saved.templates[template.key].trim()
        ? saved.templates[template.key]
        : template.defaultBody
    let baseUrl = ''
    if (
      LINK_TEMPLATE_KEYS.has(template.key) &&
      typeof saved.urls?.[template.key] === 'string'
    )
      try {
        baseUrl = normalizeMessageBaseUrl(saved.urls[template.key])
      } catch {
        /* Même repli que le site sur les anciennes adresses invalides. */
      }
    return {
      ...template,
      label,
      id: template.key,
      displayName: label,
      body,
      baseUrl,
      linkEnabled: LINK_TEMPLATE_KEYS.has(template.key),
      categoryLabel: MESSAGE_TEMPLATE_CATEGORY_LABELS[template.category],
      status: template.category,
      isCustom: body.trim() !== template.defaultBody.trim() || !!baseUrl,
    }
  })
}
