/**
 * Carte de contacts (email, téléphones, WhatsApp) — éditable inline (admin).
 */

'use client'

import { useState } from 'react'
import { Phone, Mail, MessageCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { resolveWhatsappNumber } from '../../utils/whatsappUrl'
import { useMemberInlineEdit } from '../../hooks/useMemberInlineEdit'
import { InlineEditActions } from './InlineEditActions'
import type { MemberDetails } from '../../hooks/useMembershipDetails'

interface MemberContactCardProps {
  member: MemberDetails | null
}

export function MemberContactCard({ member }: MemberContactCardProps) {
  const { editing, setEditing, saving, save } = useMemberInlineEdit(member?.id || '')
  const [email, setEmail] = useState('')
  const [phones, setPhones] = useState('')
  const [whatsapp, setWhatsapp] = useState('')

  if (!member) return null

  const startEdit = () => {
    setEmail(member.email || '')
    setPhones((member.contacts || []).join(', '))
    setWhatsapp(member.whatsappNumber || '')
    setEditing(true)
  }

  const onSave = () =>
    save({
      email: email.trim(),
      contacts: phones
        .split(',')
        .map((p) => p.trim())
        .filter(Boolean),
      whatsappNumber: whatsapp.trim(),
    })

  return (
    <Card className="group bg-gradient-to-br from-emerald-50/30 to-emerald-100/20 border-0 shadow-lg">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-lg font-bold text-gray-900">
            <Phone className="w-5 h-5 text-green-600" /> Contacts
          </CardTitle>
          <InlineEditActions
            editing={editing}
            saving={saving}
            onEdit={startEdit}
            onSave={onSave}
            onCancel={() => setEditing(false)}
          />
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-3" data-testid="member-contact-card">
        {editing ? (
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs text-gray-500">Email</Label>
              <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="email@exemple.com" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-gray-500">Téléphones (séparés par des virgules)</Label>
              <Input value={phones} onChange={(e) => setPhones(e.target.value)} placeholder="077 00 00 00, 066 00 00 00" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-gray-500">WhatsApp</Label>
              <Input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="Laisser vide = 1er numéro" />
            </div>
          </div>
        ) : (
          <>
            <div className="space-y-1">
              <div className="text-xs text-gray-500">Email</div>
              <div className="font-medium flex items-center gap-2">
                <Mail className="w-4 h-4 text-blue-600" /> {member.email || 'Non renseigné'}
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-xs text-gray-500">Téléphones</div>
              <div className="font-medium">{member.contacts?.join(', ') || 'Non renseigné'}</div>
            </div>
            <div className="space-y-1">
              <div className="text-xs text-gray-500">
                {member.whatsappNumber ? 'WhatsApp' : 'WhatsApp (1er numéro par défaut)'}
              </div>
              <div className="font-medium flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-[#25D366]" />
                {resolveWhatsappNumber(member.whatsappNumber, member.contacts) || 'Non renseigné'}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
