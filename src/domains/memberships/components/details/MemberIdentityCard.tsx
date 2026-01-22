/**
 * Carte d'identité avec informations personnelles et photo
 */

'use client'

import Image from 'next/image'
import { User, CarFront } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { MemberDetails } from '../../hooks/useMembershipDetails'

interface MemberIdentityCardProps {
  member: MemberDetails | null
}

export function MemberIdentityCard({ member }: MemberIdentityCardProps) {
  if (!member) return null

  return (
    <>
      {/* Informations personnelles */}
      <Card className="group bg-gradient-to-br from-blue-50/30 to-blue-100/20 border-0 shadow-lg">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg font-bold text-gray-900">
            <User className="w-5 h-5 text-blue-600" /> Informations personnelles
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 grid grid-cols-1 md:grid-cols-2 gap-3" data-testid="member-identity-card">
          <div className="space-y-1">
            <div className="text-xs text-gray-500">Genre</div>
            <div className="font-medium">{member.gender}</div>
          </div>
          <div className="space-y-1">
            <div className="text-xs text-gray-500">Nationalité</div>
            <div className="font-medium">{member.nationalityName}</div>
          </div>
          <div className="space-y-1">
            <div className="text-xs text-gray-500">Véhicule</div>
            <div className="font-medium flex items-center gap-2">
              <CarFront className={`w-4 h-4 ${member.hasCar ? 'text-emerald-600' : 'text-gray-400'}`} />
              {member.hasCar ? 'Oui' : 'Non'}
            </div>
          </div>
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
