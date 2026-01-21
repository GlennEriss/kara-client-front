/**
 * Carte photo du demandeur (colonne latérale)
 */

'use client'

import { User, ExternalLink, Download } from 'lucide-react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { ModernCard } from './shared/ModernCard'
import type { MembershipRequest } from '../../entities'

interface DetailsPhotoCardProps {
  request: MembershipRequest
}

export function DetailsPhotoCard({ request }: DetailsPhotoCardProps) {
  return (
    <ModernCard 
      title="Photo du demandeur" 
      icon={User} 
      iconColor="text-cyan-600" 
      className="bg-linear-to-br from-cyan-50/30 to-cyan-100/20"
    >
      <div className="space-y-4" data-testid="details-photo-card">
        {request.identity.photoURL ? (
          <div className="relative group">
            <div className="absolute inset-0 bg-linear-to-t from-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 rounded-xl z-10"></div>
            <Image
              src={request.identity.photoURL}
              alt={`Photo de ${request.identity.firstName} ${request.identity.lastName}`}
              width={300}
              height={300}
              className="w-full h-48 lg:h-72 object-cover rounded-xl border-2 border-gray-200 shadow-lg group-hover:shadow-2xl transition-all duration-300"
              data-testid="details-identity-photo"
            />
            <div className="absolute top-3 right-3 lg:top-4 lg:right-4 opacity-0 group-hover:opacity-100 transition-all duration-300 z-20 flex gap-1 lg:gap-2">
              <Button
                size="sm"
                className="bg-white/90 hover:bg-white text-gray-700 border-0 shadow-xl h-8 lg:h-10 px-2 lg:px-4 text-xs"
                onClick={() => window.open(request.identity.photoURL!, '_blank')}
              >
                <ExternalLink className="w-3 h-3 lg:w-4 lg:h-4 lg:mr-1" />
                <span className="hidden lg:inline">Voir</span>
              </Button>
              <Button
                size="sm"
                className="bg-white/90 hover:bg-white text-gray-700 border-0 shadow-xl h-8 lg:h-10 px-2 lg:px-4"
                onClick={() => {
                  const link = document.createElement('a')
                  link.href = request.identity.photoURL!
                  link.download = `photo-${request.identity.firstName}-${request.identity.lastName}.jpg`
                  link.click()
                }}
              >
                <Download className="w-3 h-3 lg:w-4 lg:h-4" />
              </Button>
            </div>
          </div>
        ) : (
          <div className="w-full h-48 lg:h-72 bg-linear-to-br from-gray-100 to-gray-200 rounded-xl border-2 border-gray-200 flex items-center justify-center">
            <div className="text-center">
              <User className="w-10 h-10 lg:w-16 lg:h-16 text-gray-400 mx-auto mb-2 lg:mb-3" />
              <p className="text-gray-500 font-medium text-sm lg:text-base">Aucune photo fournie</p>
            </div>
          </div>
        )}
      </div>
    </ModernCard>
  )
}
