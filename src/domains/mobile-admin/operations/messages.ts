import { z } from 'zod'
import { FieldValue } from 'firebase-admin/firestore'
import { MESSAGE_TEMPLATES } from '@/domains/messaging/constants/message-templates'
import {
  extractTemplateVariables,
  renderTemplate,
} from '@/domains/messaging/utils/renderTemplate'
import { previewOf } from '@/domains/messaging/utils/previewTemplate'
import {
  LINK_TEMPLATE_KEYS,
  normalizeMessageBaseUrl,
  messageLinkVariables,
} from '@/domains/messaging/utils/message-template-links'
import { field, textField } from '@/domains/finance/actions'
import { actor, type AdminAction, type AdminContext } from '../server/registry'
import type { AdminModule } from '../catalog'
const item = z
  .object({
    key: z.string().max(100),
    body: z
      .string()
      .trim()
      .min(1, 'Le message ne peut pas être vide.')
      .max(20000),
    baseUrl: z.string().max(1000).optional(),
  })
  .strict()
async function save(ctx: AdminContext, items: z.infer<typeof item>[]) {
  const templates: Record<string, unknown> = {},
    urls: Record<string, unknown> = {}
  for (const change of items) {
    const template = MESSAGE_TEMPLATES.find((t) => t.key === change.key)
    if (!template) throw Error('Modèle inconnu.')
    templates[change.key] =
      change.body.trim() === template.defaultBody.trim()
        ? FieldValue.delete()
        : change.body.trim()
    if (LINK_TEMPLATE_KEYS.has(change.key)) {
      const url = normalizeMessageBaseUrl(change.baseUrl || '')
      urls[change.key] = url || FieldValue.delete()
    }
  }
  await ctx.services.db
    .collection('settings')
    .doc('messageTemplates')
    .set(
      {
        templates,
        ...(Object.keys(urls).length ? { urls } : {}),
        updatedBy: actor(ctx).id,
        updatedAt: new Date(),
      },
      { merge: true },
    )
  return { saved: items.length }
}
export function messageActions(module: AdminModule): AdminAction[] {
  if (module.key !== 'messages') return []
  return [
    {
      id: 'message.save',
      label: 'Enregistrer les modifications',
      scope: 'workspace',
      permission: 'messageTemplates.manage',
      fields: [
        field(
          'items',
          'Modèles modifiés',
          'rows',
          z.array(item).min(1).max(MESSAGE_TEMPLATES.length),
          {
            fields: [
              textField('key', 'Modèle'),
              field('body', 'Texte du message', 'multiline', item.shape.body),
              textField('baseUrl', 'Adresse de base des liens', false),
            ],
          },
        ),
      ],
      schema: z
        .object({ items: z.array(item).min(1).max(MESSAGE_TEMPLATES.length) })
        .strict()
        .refine(
          (v) => new Set(v.items.map((i) => i.key)).size === v.items.length,
          'Un modèle ne peut être présent qu’une fois.',
        ),
      run: (ctx, d) => save(ctx, d.items),
    },
    {
      id: 'message.update',
      label: 'Modifier ce modèle',
      scope: 'contract',
      permission: 'messageTemplates.manage',
      fields: [
        field('body', 'Texte du message', 'multiline', item.shape.body),
        textField('baseUrl', 'Adresse de base des liens', false),
      ],
      run: (ctx, d) => save(ctx, [{ key: ctx.id, ...d }]),
    },
    {
      id: 'message.reset',
      label: 'Revenir au texte par défaut',
      scope: 'contract',
      permission: 'messageTemplates.manage',
      fields: [],
      run: (ctx) =>
        save(ctx, [
          { key: ctx.id, body: ctx.row.defaultBody, baseUrl: ctx.row.baseUrl },
        ]),
    },
    {
      id: 'message.preview',
      label: 'Prévisualiser ce modèle',
      scope: 'contract',
      permission: 'messageTemplates.view',
      readonly: true,
      fields: [],
      schema: z
        .object({
          body: item.shape.body.optional(),
          baseUrl: z.string().max(1000).optional(),
          variables: z
            .array(
              z
                .object({
                  name: z.string().max(100),
                  value: z.string().max(5000),
                })
                .strict(),
            )
            .max(100)
            .optional(),
        })
        .strict(),
      run: async (ctx, d) => {
        const body = d.body || ctx.row.body || ctx.row.defaultBody,
          baseUrl = LINK_TEMPLATE_KEYS.has(ctx.id)
            ? normalizeMessageBaseUrl(d.baseUrl ?? ctx.row.baseUrl ?? '')
            : ''
        return {
          message: d.variables
            ? renderTemplate(
                body,
                messageLinkVariables(
                  Object.fromEntries(
                    d.variables.map((v: any) => [v.name, v.value]),
                  ),
                  baseUrl,
                ),
              )
            : previewOf(body, ctx.id, baseUrl),
          unknownVariables: extractTemplateVariables(body).filter(
            (name) => !ctx.row.variables?.some((v: any) => v.name === name),
          ),
        }
      },
    },
  ]
}
