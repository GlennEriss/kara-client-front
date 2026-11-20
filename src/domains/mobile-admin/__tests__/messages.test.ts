// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { FieldValue } from 'firebase-admin/firestore'
import { messageRows } from '../server/message-presentation'
import { messageActions } from '../operations/messages'
import { getAdminModule } from '../catalog'
import { actionSchema, type AdminContext } from '../server/registry'
import { MESSAGE_TEMPLATES } from '@/domains/messaging/constants/message-templates'
import { previewOf } from '@/domains/messaging/utils/previewTemplate'
const set = vi.fn()
const action = (id: string) =>
  messageActions(getAdminModule('messages')!).find((a) => a.id === id)!
const context = (id = 'birthday') =>
  ({
    id,
    row: messageRows().find((r) => r.id === id),
    caller: { claims: { uid: 'ADMIN' } },
    services: { db: { collection: () => ({ doc: () => ({ set }) }) } },
  }) as unknown as AdminContext
beforeEach(() => vi.clearAllMocks())
describe('lot 8 modèles de messages', () => {
  it('reprend le catalogue, les catégories et le repli du site pour les anciens textes ou liens invalides', () => {
    const rows = messageRows({
      templates: { birthday: '', unknown: 'Texte externe' },
      urls: {
        birthday: 'https://ignored.test',
        membershipCorrections: 'javascript:bad',
      },
    })
    expect(rows).toHaveLength(MESSAGE_TEMPLATES.length)
    expect(rows.find((r) => r.id === 'charityEventInvitation')?.label).toBe(
      'Charité — invitation à une collecte',
    )
    expect(rows.find((r) => r.id === 'birthday')).toMatchObject({
      body: MESSAGE_TEMPLATES.find((t) => t.key === 'birthday')!.defaultBody,
      baseUrl: '',
      isCustom: false,
      categoryLabel: 'Vie de l’association',
    })
    expect(rows.find((r) => r.id === 'membershipCorrections')).toMatchObject({
      linkEnabled: true,
      baseUrl: '',
    })
  })
  it('ne met à jour que les modèles modifiés et préserve les adresses des autres modèles', async () => {
    const a = action('message.save')
    await a.run(
      context(),
      actionSchema(a).parse({
        items: [{ key: 'birthday', body: 'Bonjour {{prenom}} !' }],
      }),
    )
    expect(set).toHaveBeenCalledWith(
      {
        templates: { birthday: 'Bonjour {{prenom}} !' },
        updatedBy: 'ADMIN',
        updatedAt: expect.any(Date),
      },
      { merge: true },
    )
    expect(set.mock.calls[0][0]).not.toHaveProperty('urls')
    expect(a.permission).toBe('messageTemplates.manage')
  })
  it('supprime la surcharge d’un texte revenu au défaut et normalise ou efface uniquement son adresse', async () => {
    const a = action('message.save'),
      row = messageRows().find((r) => r.id === 'membershipCorrections')!
    await a.run(context(row.id), {
      items: [
        {
          key: row.id,
          body: row.defaultBody,
          baseUrl: 'https://membres.example.test/portail/',
        },
      ],
    })
    expect(set.mock.calls[0][0]).toMatchObject({
      templates: { membershipCorrections: FieldValue.delete() },
      urls: { membershipCorrections: 'https://membres.example.test/portail' },
    })
    set.mockClear()
    await a.run(context(row.id), {
      items: [{ key: row.id, body: 'Bonjour', baseUrl: '' }],
    })
    expect(set.mock.calls[0][0].urls.membershipCorrections).toEqual(
      FieldValue.delete(),
    )
  })
  it('rejette les doublons, les messages vides, les clés inconnues et les liens avec identifiants avant toute écriture', async () => {
    const a = action('message.save'),
      schema = actionSchema(a)
    expect(
      schema.safeParse({ items: [{ key: 'birthday', body: '  ' }] }).success,
    ).toBe(false)
    expect(
      schema.safeParse({
        items: [
          { key: 'birthday', body: 'A' },
          { key: 'birthday', body: 'B' },
        ],
      }).success,
    ).toBe(false)
    await expect(
      a.run(context(), { items: [{ key: 'unknown', body: 'Message' }] }),
    ).rejects.toThrow('inconnu')
    await expect(
      a.run(context(), {
        items: [
          {
            key: 'membershipCorrections',
            body: 'Message',
            baseUrl: 'https://user:password@example.test',
          },
        ],
      }),
    ).rejects.toThrow('URL HTTPS')
    expect(set).not.toHaveBeenCalled()
  })
  it('prévisualise le brouillon avec les mêmes exemples et liens que le site sans persister ni envoyer de message', async () => {
    const a = action('message.preview'),
      ctx = context('membershipCorrections')
    const result = (await a.run(ctx, {
      body: 'Bonjour {{prenom}}, {{lien}} {{inconnue}}',
      baseUrl: 'https://membres.example.test',
    })) as any
    expect(result.message).toContain(
      'Bonjour Awa, https://membres.example.test/corrections/MK-2026-0142',
    )
    expect(result.unknownVariables).toContain('inconnue')
    expect(result.message).not.toContain('{{')
    expect(set).not.toHaveBeenCalled()
    expect(a.readonly).toBe(true)
    expect(a.permission).toBe('messageTemplates.view')
    expect(
      previewOf('Solde : {{montant}}.{{echeance}}', 'groupAgreementReminder'),
    ).toContain('25 000 FCFA')
  })
  it('le retour au texte par défaut conserve l’adresse de base du modèle', async () => {
    const ctx = context('membershipCorrections')
    ctx.row.baseUrl = 'https://membres.example.test'
    await action('message.reset').run(ctx, {})
    expect(set.mock.calls[0][0].urls).toEqual({
      membershipCorrections: 'https://membres.example.test',
    })
  })
})
