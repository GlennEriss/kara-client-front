'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { 
  User,
  Phone,
  Mail,
  MapPin,
  Car,
  Calendar,
  FileText,
  Eye,
  MoreVertical,
  CheckCircle,
  XCircle
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MemberWithSubscription } from '@/db/member.db'
import { MEMBERSHIP_TYPE_LABELS } from '@/types/types'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

interface MemberCardProps {
  member: MemberWithSubscription
  onViewSubscriptions: (memberId: string) => void
  onViewDetails: (memberId: string) => void
}

const MemberCard = ({ member, onViewSubscriptions, onViewDetails }: MemberCardProps) => {
  const [imageError, setImageError] = useState(false)

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase()
  }

  const formatDate = (date: Date) => {
    try {
      return format(date, 'dd/MM/yyyy', { locale: fr })
    } catch {
      return 'Date invalide'
    }
  }

  const getSubscriptionStatus = () => {
    if (!member.lastSubscription) {
      return {
        label: 'Aucun abonnement',
        color: 'bg-gray-100 text-gray-700',
        icon: XCircle
      }
    }

    if (member.isSubscriptionValid) {
      return {
        label: 'Abonnement valide',
        color: 'bg-green-100 text-green-700',
        icon: CheckCircle
      }
    }

    return {
      label: 'Abonnement expiré',
      color: 'bg-red-100 text-red-700',
      icon: XCircle
    }
  }

  const getMembershipTypeColor = (type: string) => {
    const colors = {
      adherant: 'bg-[#224D62] text-white',
      bienfaiteur: 'bg-[#CBB171] text-white',
      sympathisant: 'bg-green-600 text-white'
    }
    return colors[type as keyof typeof colors] || 'bg-gray-500 text-white'
  }

  const subscriptionStatus = getSubscriptionStatus()

  return (
    <Card className="hover:shadow-lg transition-all duration-300 border border-gray-200 hover:border-[#CBB171]/50">
      <CardHeader className="pb-3">
        <div className="space-y-3">
          {/* Première ligne : Avatar + Menu (espace réservé et protégé) */}
          <div className="flex items-center justify-between">
            <Avatar className="h-10 w-10 sm:h-12 sm:w-12 border-2 border-[#224D62]/20 flex-shrink-0">
              {member.photoURL && !imageError ? (
                <AvatarImage 
                  src={member.photoURL} 
                  alt={`${member.firstName} ${member.lastName}`}
                  onError={() => setImageError(true)}
                />
              ) : (
                <AvatarFallback className="bg-[#224D62] text-white font-semibold text-sm">
                  {getInitials(member.firstName, member.lastName)}
                </AvatarFallback>
              )}
            </Avatar>

            {/* Menu actions - toujours à droite, jamais poussé */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 w-8 p-0 flex-shrink-0"
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44 sm:w-48">
                <DropdownMenuItem onClick={() => onViewDetails(member.id)}>
                  <Eye className="h-4 w-4 mr-2" />
                  Voir détails
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onViewSubscriptions(member.id)}>
                  <Calendar className="h-4 w-4 mr-2" />
                  Voir abonnements
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <FileText className="h-4 w-4 mr-2" />
                  Fiche d'adhésion
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Deuxième ligne : Nom complet sur toute la largeur */}
          <div className="space-y-2">
            <h3 className="font-semibold text-gray-900 text-sm sm:text-base leading-tight">
              <span className="block truncate" title={`${member.firstName} ${member.lastName}`}>
                {member.firstName} {member.lastName}
              </span>
            </h3>
            
            {/* Matricule */}
            <p className="text-xs sm:text-sm text-gray-600 truncate">
              {member.matricule}
            </p>
            
            {/* Badges - layout horizontal */}
            <div className="flex flex-wrap gap-2 items-center">
              <Badge 
                variant="secondary" 
                className={`text-xs ${getMembershipTypeColor(member.membershipType)}`}
              >
                {MEMBERSHIP_TYPE_LABELS[member.membershipType]}
              </Badge>
              
              {/* Badge abonnement - toujours visible */}
              <Badge className={`text-xs ${subscriptionStatus.color}`}>
                {subscriptionStatus.label}
              </Badge>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0 space-y-3">
        {/* Informations d'abonnement - conditionnelles et compactes */}
        {member.lastSubscription && (
          <div className="space-y-1 text-xs sm:text-sm bg-blue-50 p-2 rounded-lg">
            <div className="flex justify-between">
              <span className="text-gray-600">Expire le:</span>
              <span className="font-medium">
                {formatDate(member.lastSubscription.dateEnd)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Montant:</span>
              <span className="font-medium">
                {member.lastSubscription.montant} {member.lastSubscription.currency}
              </span>
            </div>
          </div>
        )}

        {/* Informations de contact - layout responsive */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 sm:gap-2">
          {member.contacts && member.contacts.length > 0 && (
            <div className="flex items-center space-x-2 text-xs sm:text-sm text-gray-600">
              <Phone className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
              <span className="truncate">{member.contacts[0]}</span>
            </div>
          )}
          
          {member.email && (
            <div className="flex items-center space-x-2 text-xs sm:text-sm text-gray-600">
              <Mail className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
              <span className="truncate">{member.email}</span>
            </div>
          )}

          <div className="flex items-center space-x-2 text-xs sm:text-sm text-gray-600">
            <MapPin className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
            <span className="truncate">{member.nationality}</span>
          </div>

          {member.hasCar && (
            <div className="flex items-center space-x-2 text-xs sm:text-sm text-gray-600">
              <Car className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
              <span className="truncate">Véhicule</span>
            </div>
          )}
        </div>

        {/* Date d'adhésion */}
        <div className="pt-2 border-t border-gray-100">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>Membre depuis</span>
            <span>{formatDate(member.createdAt)}</span>
          </div>
        </div>

        {/* Actions rapides - layout adaptatif */}
        <div className="pt-2 space-y-2 sm:space-y-0">
          {/* Mobile : stack vertical */}
          <div className="flex flex-col space-y-2 sm:hidden">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onViewDetails(member.id)}
              className="w-full text-[#224D62] border-[#224D62] hover:bg-[#224D62] hover:text-white"
            >
              <User className="h-4 w-4 mr-2" />
              Voir détails
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onViewSubscriptions(member.id)}
              className="w-full text-[#CBB171] border-[#CBB171] hover:bg-[#CBB171] hover:text-white"
            >
              <Calendar className="h-4 w-4 mr-2" />
              Voir abonnements
            </Button>
          </div>

          {/* Desktop/Tablette : horizontal avec tailles adaptatives */}
          <div className="hidden sm:flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onViewDetails(member.id)}
              className="flex-1 text-[#224D62] border-[#224D62] hover:bg-[#224D62] hover:text-white text-xs lg:text-sm"
            >
              <User className="h-3 w-3 lg:h-4 lg:w-4 mr-1" />
              <span className="hidden md:inline">Détails</span>
              <span className="md:hidden">Info</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onViewSubscriptions(member.id)}
              className="flex-1 text-[#CBB171] border-[#CBB171] hover:bg-[#CBB171] hover:text-white text-xs lg:text-sm"
            >
              <Calendar className="h-3 w-3 lg:h-4 lg:w-4 mr-1" />
              <span className="hidden md:inline">Abonnements</span>
              <span className="md:hidden">Abos</span>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default MemberCard