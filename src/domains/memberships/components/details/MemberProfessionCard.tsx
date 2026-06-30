/**
 * Carte de profession / entreprise — éditable inline (admin).
 */

'use client'

import { useState } from 'react'
import { Briefcase } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useMemberInlineEdit } from '../../hooks/useMemberInlineEdit'
import { InlineEditActions } from './InlineEditActions'
import type { MemberDetails } from '../../hooks/useMembershipDetails'

interface MemberProfessionCardProps {
  member: MemberDetails | null
}

export function MemberProfessionCard({ member }: MemberProfessionCardProps) {
  const { editing, setEditing, saving, save } = useMemberInlineEdit(member?.id || '')
  const [profession, setProfession] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [companyAddress, setCompanyAddress] = useState('')
  const [seniority, setSeniority] = useState('')

  if (!member) return null

  const startEdit = () => {
    setProfession(member.profession || '')
    setCompanyName(member.companyName || '')
    setCompanyAddress(member.companyAddress || '')
    setSeniority(member.seniority || '')
    setEditing(true)
  }

  const onSave = () =>
    save({
      profession: profession.trim(),
      companyName: companyName.trim(),
      companyAddress: companyAddress.trim(),
      seniority: seniority.trim(),
    })

  return (
    <Card className="group bg-gradient-to-br from-amber-50/30 to-yellow-100/20 border-0 shadow-lg">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-lg font-bold text-gray-900">
            <Briefcase className="w-5 h-5 text-amber-600" /> Profession
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
      <CardContent className="pt-0 space-y-3" data-testid="member-profession-card">
        {editing ? (
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs text-gray-500">Profession</Label>
              <Input value={profession} onChange={(e) => setProfession(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-gray-500">Entreprise</Label>
              <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-gray-500">Adresse entreprise</Label>
              <Input value={companyAddress} onChange={(e) => setCompanyAddress(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-gray-500">Ancienneté</Label>
              <Input value={seniority} onChange={(e) => setSeniority(e.target.value)} />
            </div>
          </div>
        ) : (
          <>
            <div className="space-y-1">
              <div className="text-xs text-gray-500">Profession</div>
              <div className="font-medium">{member.profession || 'Non renseigné'}</div>
            </div>
            <div className="space-y-1">
              <div className="text-xs text-gray-500">Entreprise</div>
              <div className="font-medium">{member.companyName || 'Non renseigné'}</div>
            </div>
            {member.companyAddress && (
              <div className="space-y-1">
                <div className="text-xs text-gray-500">Adresse entreprise</div>
                <div className="font-medium">{member.companyAddress}</div>
              </div>
            )}
            {member.seniority && (
              <div className="space-y-1">
                <div className="text-xs text-gray-500">Ancienneté</div>
                <div className="font-medium">{member.seniority}</div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
