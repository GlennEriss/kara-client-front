'use client'

import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { MessageCircle } from 'lucide-react'

export function EventInvitationOption({ checked, onCheckedChange }: { checked: boolean; onCheckedChange: (checked: boolean) => void }) {
  return <div className="flex items-start justify-between gap-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
    <div>
      <Label htmlFor="prepare-event-whatsapp" className="flex items-center gap-2 font-semibold text-[#234D65]"><MessageCircle className="h-4 w-4" />Préparer les invitations WhatsApp</Label>
      <p className="mt-2 text-sm text-gray-500">Après la création et la publication, choisissez les membres à prévenir et proposez-leur de contribuer si une collecte est ouverte. Chaque envoi sera confirmé dans WhatsApp.</p>
    </div>
    <Switch id="prepare-event-whatsapp" checked={checked} onCheckedChange={onCheckedChange} />
  </div>
}
