/**
 * Carte d'identité (infos personnelles) — éditable inline (admin) — + photo.
 */

'use client'

import { useState } from 'react'
import Image from 'next/image'
import { User, CarFront } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useMemberInlineEdit } from '../../hooks/useMemberInlineEdit'
import { InlineEditActions } from './InlineEditActions'
import type { MemberDetails } from '../../hooks/useMembershipDetails'

interface MemberIdentityCardProps {
  member: MemberDetails | null
}

const selectClass =
  'flex h-9 w-full rounded-md border border-gray-200 bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-[#234D65]/40'

export function MemberIdentityCard({ member }: MemberIdentityCardProps) {
  const { editing, setEditing, saving, save } = useMemberInlineEdit(member?.id || '')
  const [form, setForm] = useState({
    gender: '',
    nationality: '',
    hasCar: false,
    birthDate: '',
    birthPlace: '',
    maritalStatus: '',
    religion: '',
  })

  if (!member) return null

  const startEdit = () => {
    setForm({
      gender: member.gender || '',
      nationality: member.nationality || '',
      hasCar: !!member.hasCar,
      birthDate: member.birthDate || '',
      birthPlace: member.birthPlace || '',
      maritalStatus: member.maritalStatus || '',
      religion: member.religion || '',
    })
    setEditing(true)
  }

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [key]: value }))

  const onSave = () =>
    save({
      gender: form.gender,
      nationality: form.nationality.trim(),
      hasCar: form.hasCar,
      birthDate: form.birthDate,
      birthPlace: form.birthPlace.trim(),
      maritalStatus: form.maritalStatus.trim(),
      religion: form.religion.trim(),
    })

  return (
    <>
      <Card className="group bg-gradient-to-br from-blue-50/30 to-blue-100/20 border-0 shadow-lg">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2 text-lg font-bold text-gray-900">
              <User className="w-5 h-5 text-blue-600" /> Informations personnelles
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
        <CardContent className="pt-0" data-testid="member-identity-card">
          {editing ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label className="text-xs text-gray-500">Genre</Label>
                <select className={selectClass} value={form.gender} onChange={(e) => set('gender', e.target.value)}>
                  <option value="">—</option>
                  <option value="Homme">Homme</option>
                  <option value="Femme">Femme</option>
                </select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-gray-500">Véhicule</Label>
                <select
                  className={selectClass}
                  value={form.hasCar ? 'oui' : 'non'}
                  onChange={(e) => set('hasCar', e.target.value === 'oui')}
                >
                  <option value="non">Non</option>
                  <option value="oui">Oui</option>
                </select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-gray-500">Nationalité</Label>
                <Input value={form.nationality} onChange={(e) => set('nationality', e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-gray-500">Date de naissance</Label>
                <Input type="date" value={form.birthDate} onChange={(e) => set('birthDate', e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-gray-500">Lieu de naissance</Label>
                <Input value={form.birthPlace} onChange={(e) => set('birthPlace', e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-gray-500">État civil</Label>
                <Input value={form.maritalStatus} onChange={(e) => set('maritalStatus', e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-gray-500">Religion</Label>
                <Input value={form.religion} onChange={(e) => set('religion', e.target.value)} />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <div className="text-xs text-gray-500">Genre</div>
                <div className="font-medium">{member.gender || '—'}</div>
              </div>
              <div className="space-y-1">
                <div className="text-xs text-gray-500">Nationalité</div>
                <div className="font-medium">{member.nationalityName || '—'}</div>
              </div>
              <div className="space-y-1">
                <div className="text-xs text-gray-500">Véhicule</div>
                <div className="font-medium flex items-center gap-2">
                  <CarFront className={`w-4 h-4 ${member.hasCar ? 'text-emerald-600' : 'text-gray-400'}`} />
                  {member.hasCar ? 'Oui' : 'Non'}
                </div>
              </div>
              {member.birthDate && (
                <div className="space-y-1">
                  <div className="text-xs text-gray-500">Date de naissance</div>
                  <div className="font-medium">{member.birthDate}</div>
                </div>
              )}
              {member.birthPlace && (
                <div className="space-y-1">
                  <div className="text-xs text-gray-500">Lieu de naissance</div>
                  <div className="font-medium">{member.birthPlace}</div>
                </div>
              )}
              {member.maritalStatus && (
                <div className="space-y-1">
                  <div className="text-xs text-gray-500">État civil</div>
                  <div className="font-medium">{member.maritalStatus}</div>
                </div>
              )}
              {member.religion && (
                <div className="space-y-1">
                  <div className="text-xs text-gray-500">Religion</div>
                  <div className="font-medium">{member.religion}</div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Photo du membre */}
      <Card className="group bg-gradient-to-br from-indigo-50/30 to-indigo-100/20 border-0 shadow-lg">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg font-bold text-gray-900">
            <User className="w-5 h-5 text-indigo-600" /> Photo du membre
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {member.photoURL ? (
            <Image
              src={member.photoURL}
              alt={`Photo de ${member.displayName}`}
              width={300}
              height={300}
              className="w-full h-48 lg:h-72 object-cover rounded-xl border-2 border-gray-200 shadow-lg"
              data-testid="member-photo"
            />
          ) : (
            <div className="w-full h-48 lg:h-72 bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl border-2 border-gray-200 flex items-center justify-center">
              <div className="text-center">
                <User className="w-10 h-10 lg:w-16 lg:h-16 text-gray-400 mx-auto mb-2 lg:mb-3" />
                <p className="text-gray-500 font-medium text-sm lg:text-base">Aucune photo fournie</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  )
}
