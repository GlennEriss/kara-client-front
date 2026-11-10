'use client'

import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useRouter, useSearchParams } from 'next/navigation'
import { Check, Copy, Loader2, MessageCircle } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/responsive-dialog'
import { generateWhatsAppUrl } from '@/domains/memberships/utils/whatsappUrl'
import { useCharityEvent } from '@/hooks/bienfaiteur/useCharityEvents'
import type { CharityEvent } from '@/types/types'
import type { Event } from '../entities/event.types'
import { loadInvitationRecipients } from '../services/loadInvitationRecipients'
import { buildEventInvitationMessage, charityEventInvitation, communityEventInvitation, DEFAULT_MEMBERS_APP_URL, type EventInvitation, type InvitationRecipient } from '../utils/event-invitations'

export function CommunityEventWhatsAppInvitations({ event }: { event: Event }) {
  const charity = useCharityEvent(event.charityEventId || '')
  return <EventWhatsAppInvitations event={communityEventInvitation(event, charity.data)}
    contributionNotice={event.charityEventId
      ? charity.isLoading ? 'Vérification de la collecte associée…'
        : charity.isError ? 'Impossible de vérifier la collecte. Réessayez avant d’ajouter une invitation à contribuer.'
          : !charity.data || !charityEventInvitation(charity.data).contribution ? 'La collecte associée doit être publique et ouverte aux contributions.' : undefined
      : 'Pour proposer une contribution, associez une collecte dans « Modifier l’événement ».'} />
}

export function CharityEventWhatsAppInvitations({ event }: { event: CharityEvent }) {
  return <EventWhatsAppInvitations event={charityEventInvitation(event)} />
}

export function EventWhatsAppInvitations({ event, contributionNotice }: { event: EventInvitation; contributionNotice?: string }) {
  const router = useRouter()
  const params = useSearchParams()
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [opened, setOpened] = useState<Set<string>>(new Set())
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [includeContribution, setIncludeContribution] = useState(true)
  const [introduction, setIntroduction] = useState('LE KARA a le plaisir de vous inviter à cet événement. Votre participation est la bienvenue !')
  const recipients = useQuery({
    queryKey: ['event-invitation-recipients'], queryFn: loadInvitationRecipients,
    enabled: open && !event.blockedReason, staleTime: 60_000,
  })
  useEffect(() => {
    if (params.get('notify') === 'whatsapp' && !event.blockedReason) {
      setOpen(true)
      const next = new URLSearchParams(params.toString())
      next.delete('notify')
      router.replace(`${window.location.pathname}${next.size ? `?${next}` : ''}`, { scroll: false })
    }
  }, [params, event.blockedReason, router])

  const members = useMemo(() => recipients.data || [], [recipients.data])
  const available = members.filter(member => member.phone)
  const filtered = members.filter(member => `${member.name} ${member.matricule} ${member.phone || ''}`.toLocaleLowerCase('fr').includes(search.toLocaleLowerCase('fr')))
  const totalPages = Math.max(1, Math.ceil(filtered.length / 20))
  const visible = filtered.slice((page - 1) * 20, page * 20)
  const chosen = available.filter(member => selected.has(member.id))
  const nextRecipient = chosen.find(member => !opened.has(member.id))
  const previewRecipient = nextRecipient || chosen[0] || available[0]
  const canOpen = !event.blockedReason && !!introduction.trim()
  const message = (recipient: InvitationRecipient) => buildEventInvitationMessage({ event, recipient, introduction, includeContribution,
    memberAppUrl: process.env.NEXT_PUBLIC_MEMBERS_APP_URL || DEFAULT_MEMBERS_APP_URL })

  const toggle = (id: string, checked: boolean) => setSelected(current => {
    const next = new Set(current)
    if (checked) next.add(id)
    else next.delete(id)
    return next
  })

  const openWhatsApp = (recipient: InvitationRecipient) => {
    if (!canOpen || !recipient.phone) return
    // A real click opens one conversation; never claim delivery or receipt.
    const link = document.createElement('a')
    link.href = generateWhatsAppUrl(recipient.phone, message(recipient))
    link.target = '_blank'
    link.rel = 'noopener noreferrer'
    link.click()
    setOpened(current => new Set(current).add(recipient.id))
  }

  return <>
    <Card className="rounded-2xl border-gray-100 shadow-sm">
      <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 font-semibold text-[#234D65]"><MessageCircle className="h-5 w-5" />Prévenir les membres</h2>
          <p className="mt-1 text-sm text-gray-500">{event.blockedReason || 'Une invitation WhatsApp personnalisée pour chaque membre, avec la possibilité de contribuer à la collecte.'}</p>
        </div>
        <Button type="button" variant="outline" className="shrink-0 border-[#234D65]/20 text-[#234D65]" onClick={() => setOpen(true)} disabled={!!event.blockedReason}>
          <MessageCircle className="mr-2 h-4 w-4" />Inviter par WhatsApp
        </Button>
      </CardContent>
    </Card>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="grid-cols-1 sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle><MessageCircle />Inviter les membres</DialogTitle>
          <DialogDescription>{event.title} — Choisissez les destinataires, puis ouvrez chaque conversation. Confirmez l’envoi dans WhatsApp.</DialogDescription>
        </DialogHeader>
        {event.blockedReason && <p role="alert" className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">{event.blockedReason}</p>}
        <div className="grid min-w-0 grid-cols-1 gap-5 lg:grid-cols-2">
          <div className="min-w-0 space-y-3">
            <h3 className="font-semibold text-[#234D65]">1. Choisir les membres</h3>
            {recipients.isLoading && <p role="status" className="flex items-center gap-2 text-sm"><Loader2 className="h-4 w-4 animate-spin" />Chargement des membres…</p>}
            {recipients.isError && <div role="alert" className="space-y-2 text-sm text-red-700"><p>Impossible de charger les membres.</p><Button variant="outline" onClick={() => recipients.refetch()}>Réessayer</Button></div>}
            <p className="text-xs text-gray-500">{selected.size} sélectionné(s) · {available.length} joignable(s) · {members.length - available.length} sans numéro valide</p>
            <Input aria-label="Rechercher un destinataire" value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} placeholder="Nom, matricule ou téléphone" />
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" disabled={!available.length} onClick={() => setSelected(new Set(available.map(member => member.id)))}>Tous les membres joignables</Button>
              <Button type="button" variant="ghost" size="sm" disabled={!selected.size} onClick={() => setSelected(new Set())}>Désélectionner</Button>
            </div>
            <div className="max-h-72 overflow-y-auto rounded-xl border border-gray-100">
              {visible.map(member => <div key={member.id} className="flex items-center gap-2 border-b border-gray-100 p-3 last:border-0">
                <Checkbox aria-label={`Sélectionner ${member.name}`} checked={selected.has(member.id)} disabled={!member.phone} onCheckedChange={checked => toggle(member.id, checked === true)} />
                <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium" title={member.name}>{member.name}</p><p className="truncate text-xs text-gray-500">{member.matricule}</p><p className="text-xs text-gray-500">{member.phone || member.unavailableReason}</p></div>
                {member.phone && <Button type="button" size="sm" variant="ghost" aria-label={`Ouvrir WhatsApp pour ${member.name}`} disabled={!canOpen} onClick={() => openWhatsApp(member)}>
                  {opened.has(member.id) ? <><Check className="mr-1 h-4 w-4" />Rouvrir</> : <MessageCircle className="h-4 w-4" />}
                </Button>}
              </div>)}
              {!recipients.isLoading && !recipients.isError && !visible.length && <p className="p-4 text-sm text-gray-500">Aucun membre trouvé.</p>}
            </div>
            {totalPages > 1 && <div className="flex items-center justify-between text-xs"><Button type="button" variant="ghost" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Précédent</Button><span>Page {page} sur {totalPages}</span><Button type="button" variant="ghost" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Suivant</Button></div>}
          </div>
          <div className="min-w-0 space-y-3">
            <h3 className="font-semibold text-[#234D65]">2. Préparer le message</h3>
            <div className="space-y-1.5"><Label htmlFor={`intro-${event.id}`}>Message d’introduction</Label><Textarea id={`intro-${event.id}`} value={introduction} onChange={e => setIntroduction(e.target.value)} rows={3} maxLength={1500} /></div>
            {event.contribution ? <div className="flex items-center justify-between gap-3 rounded-xl bg-gray-50 p-3"><Label htmlFor={`contribute-${event.id}`}>Proposer de contribuer à la collecte</Label><Switch id={`contribute-${event.id}`} checked={includeContribution} onCheckedChange={setIncludeContribution} /></div>
              : <p className="text-xs text-gray-500">{contributionNotice || 'Aucune collecte ouverte aux contributions.'}</p>}
            <div className="rounded-xl border border-gray-100 bg-gray-50 p-3"><p className="mb-2 text-xs font-semibold uppercase text-gray-500">Aperçu {previewRecipient ? `pour ${previewRecipient.name}` : ''}</p><p className="max-h-60 overflow-y-auto whitespace-pre-wrap break-words text-sm">{previewRecipient ? message(previewRecipient) : 'Sélectionnez un membre joignable pour prévisualiser le message.'}</p></div>
            <Button type="button" variant="ghost" size="sm" disabled={!previewRecipient || !canOpen} onClick={async () => {
              if (!previewRecipient) return
              try { await navigator.clipboard.writeText(message(previewRecipient)); toast.success('Message copié') }
              catch { toast.error('Impossible de copier le message') }
            }}><Copy className="mr-1 h-4 w-4" />Copier le message</Button>
          </div>
        </div>
        <div className="min-w-0 space-y-3 border-t border-gray-100 pt-3">
          <p className="text-xs text-gray-500">{chosen.filter(member => opened.has(member.id)).length} conversation(s) ouverte(s) sur {chosen.length} sélectionnée(s). Ce compteur ne confirme ni l’envoi ni la réception et reste valable sur cette page.</p>
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end"><Button variant="outline" onClick={() => setOpen(false)}>Fermer</Button><Button type="button" disabled={!nextRecipient || !canOpen} className="min-w-0 bg-[#234D65] hover:bg-[#2c5a73] sm:max-w-[75%]" onClick={() => nextRecipient && openWhatsApp(nextRecipient)}><MessageCircle className="mr-2 h-4 w-4 shrink-0" /><span className="truncate">{nextRecipient ? `Ouvrir pour ${nextRecipient.name}` : chosen.length ? 'Conversations ouvertes' : 'Sélectionnez des membres'}</span></Button></div>
        </div>
      </DialogContent>
    </Dialog>
  </>
}
