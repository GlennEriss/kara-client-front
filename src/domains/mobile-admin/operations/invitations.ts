import { loadInvitationRecipients } from '@/domains/community/events/services/loadInvitationRecipients'
import {
  buildEventInvitationMessage,
  charityEventInvitation,
  communityEventInvitation,
  invitationRecipient,
} from '@/domains/community/events/utils/event-invitations'
import { MESSAGE_TEMPLATES } from '@/domains/messaging/constants/message-templates'
import { renderTemplate } from '@/domains/messaging/utils/renderTemplate'
import { boolField, idField } from '@/domains/finance/actions'
import { rows, textArea, type AdminModule } from '../catalog'
import type { AdminAction, AdminContext } from '../server/registry'
async function renderer(ctx: AdminContext) {
  const saved =
    (
      await ctx.services.db.collection('settings').doc('messageTemplates').get()
    ).data()?.templates || {}
  return (key: string, variables: Record<string, any> = {}) =>
    renderTemplate(
      saved[key] ||
        MESSAGE_TEMPLATES.find((t) => t.key === key)?.defaultBody ||
        '',
      variables,
    )
}
export function invitationActions(module: AdminModule): AdminAction[] {
  if (module.key === 'birthdays')
    return [
      {
        id: 'birthday.message',
        label: 'Préparer le message d’anniversaire',
        permission: 'birthdays.view',
        scope: 'contract',
        readonly: true,
        fields: [],
        run: async (ctx) => {
          const member = invitationRecipient(ctx.row as any)
          if (!member.phone)
            throw Error(
              member.unavailableReason || 'Aucun téléphone disponible.',
            )
          const render = await renderer(ctx)
          return {
            messages: [
              {
                name: member.name,
                phone: member.phone,
                text: render('birthday', {
                  prenom: ctx.row.firstName?.trim() || 'cher membre',
                  nom: `${ctx.row.lastName || ''} ${ctx.row.firstName || ''}`.trim(),
                  age: ctx.row.age,
                }),
              },
            ],
          }
        },
      },
    ]
  if (!['events', 'bienfaiteur'].includes(module.key)) return []
  return [
    {
      id: 'invitation.prepare',
      label: 'Préparer les invitations aux membres',
      permission:
        module.key === 'events' ? 'events.manage' : 'bienfaiteur.edit',
      scope: 'contract',
      readonly: true,
      fields: [
        {
          ...textArea('introduction', 'Message d’introduction'),
          initial:
            'LE KARA a le plaisir de vous inviter à cet événement. Votre participation est la bienvenue !',
        },
        {
          ...boolField(
            'includeContribution',
            'Proposer une contribution à la collecte associée',
          ),
          initial: true,
        },
        boolField('allMembers', 'Sélectionner tous les membres'),
        rows(
          'recipients',
          'Destinataires',
          [idField('memberId', 'Membre', 'members')],
          true,
        ),
      ],
      run: async (ctx, d) => {
        let invitation
        if (module.key === 'bienfaiteur') {
          const event = await ctx.services.charityEvents.getEventById(ctx.id)
          if (!event) throw Error('Collecte introuvable.')
          invitation = charityEventInvitation(event)
        } else {
          const event = await ctx.services.events.getEventById(ctx.id)
          if (!event) throw Error('Évènement introuvable.')
          const charity = event.charityEventId
            ? await ctx.services.charityEvents.getEventById(
                event.charityEventId,
              )
            : null
          invitation = communityEventInvitation(event, charity)
        }
        if (invitation.blockedReason) throw Error(invitation.blockedReason)
        const all = await loadInvitationRecipients(
          await ctx.services.firestore(),
        )
        const ids = new Set((d.recipients || []).map((r: any) => r.memberId))
        const selected = d.allMembers ? all : all.filter((m) => ids.has(m.id))
        if (!selected.length)
          throw Error('Choisissez au moins un destinataire.')
        const render = await renderer(ctx)
        return {
          messages: selected
            .filter((m) => m.phone)
            .map((recipient) => ({
              name: recipient.name,
              phone: recipient.phone,
              text: buildEventInvitationMessage({
                event: invitation,
                recipient,
                introduction: d.introduction,
                includeContribution: !!d.includeContribution,
                memberAppUrl: '',
                renderMessage: render,
              }),
            })),
          unavailable: selected
            .filter((m) => !m.phone)
            .map((m) => ({ name: m.name, reason: m.unavailableReason })),
        }
      },
    },
  ]
}
