/**
 * Carte d'adresse — éditable inline (admin) + capture GPS.
 */

'use client'

import { useState } from 'react'
import { MapPin } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useMemberInlineEdit } from '../../hooks/useMemberInlineEdit'
import { InlineEditActions } from './InlineEditActions'
import type { MemberDetails } from '../../hooks/useMembershipDetails'
import { MemberLocationCapture } from './MemberLocationCapture'

interface MemberAddressCardProps {
  member: MemberDetails | null
}

export function MemberAddressCard({ member }: MemberAddressCardProps) {
  const { editing, setEditing, saving, save } = useMemberInlineEdit(member?.id || '')
  const [form, setForm] = useState({
    province: '',
    city: '',
    district: '',
    arrondissement: '',
    additionalInfo: '',
  })

  if (!member) return null
  const address = member.address

  const startEdit = () => {
    setForm({
      province: address?.province || '',
      city: address?.city || '',
      district: address?.district || '',
      arrondissement: address?.arrondissement || '',
      additionalInfo: address?.additionalInfo || '',
    })
    setEditing(true)
  }

  const field = (key: keyof typeof form, value: string) => setForm((f) => ({ ...f, [key]: value }))

  const onSave = () =>
    save({
      address: {
        province: form.province.trim(),
        city: form.city.trim(),
        district: form.district.trim(),
        arrondissement: form.arrondissement.trim(),
        additionalInfo: form.additionalInfo.trim(),
      },
    })

  return (
    <Card className="group bg-gradient-to-br from-rose-50/30 to-pink-100/20 border-0 shadow-lg">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-lg font-bold text-gray-900">
            <MapPin className="w-5 h-5 text-rose-600" /> Adresse
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
      <CardContent className="pt-0 space-y-3" data-testid="member-address-card">
        {editing ? (
          <div className="space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label className="text-xs text-gray-500">Province</Label>
                <Input value={form.province} onChange={(e) => field('province', e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-gray-500">Ville</Label>
                <Input value={form.city} onChange={(e) => field('city', e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-gray-500">Quartier</Label>
                <Input value={form.district} onChange={(e) => field('district', e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-gray-500">Arrondissement</Label>
                <Input value={form.arrondissement} onChange={(e) => field('arrondissement', e.target.value)} />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-gray-500">Infos complémentaires</Label>
              <Input value={form.additionalInfo} onChange={(e) => field('additionalInfo', e.target.value)} />
            </div>
          </div>
        ) : address ? (
          <>
            <div className="space-y-1">
              <div className="text-xs text-gray-500">Province</div>
              <div className="font-medium">{address.province || '—'}</div>
            </div>
            <div className="space-y-1">
              <div className="text-xs text-gray-500">Ville</div>
              <div className="font-medium">{address.city || '—'}</div>
            </div>
            <div className="space-y-1">
              <div className="text-xs text-gray-500">Quartier</div>
              <div className="font-medium">{address.district || '—'}</div>
            </div>
            {address.arrondissement && (
              <div className="space-y-1">
                <div className="text-xs text-gray-500">Arrondissement</div>
                <div className="font-medium">{address.arrondissement}</div>
              </div>
            )}
            {address.additionalInfo && (
              <div className="space-y-1">
                <div className="text-xs text-gray-500">Infos complémentaires</div>
                <div className="font-medium">{address.additionalInfo}</div>
              </div>
            )}
          </>
        ) : (
          <div className="text-sm text-gray-400">Adresse non renseignée</div>
        )}

        <MemberLocationCapture member={member} />
      </CardContent>
    </Card>
  )
}
