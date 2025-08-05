'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { 
  Search, 
  Filter, 
  X, 
  Calendar,
  Users,
  Car,
  ChevronDown,
  RotateCcw
} from 'lucide-react'
import { UserFilters, MembershipType, MEMBERSHIP_TYPE_LABELS } from '@/types/types'
import { useDebounce } from '@/hooks/useDebounce'

interface MemberFiltersProps {
  filters: UserFilters
  onFiltersChange: (filters: UserFilters) => void
  onReset: () => void
}

const MemberFilters = ({ filters, onFiltersChange, onReset }: MemberFiltersProps) => {
  const [searchTerm, setSearchTerm] = useState(filters.searchQuery || '')
  const [isExpanded, setIsExpanded] = useState(false)
  
  // Debounce search term
  const debouncedSearchTerm = useDebounce(searchTerm, 300)
  
  useEffect(() => {
    onFiltersChange({
      ...filters,
      searchQuery: debouncedSearchTerm
    })
  }, [debouncedSearchTerm])

  const handleMembershipTypeChange = (type: MembershipType, checked: boolean) => {
    const currentTypes = filters.membershipType || []
    const newTypes = checked 
      ? [...currentTypes, type]
      : currentTypes.filter(t => t !== type)
    
    onFiltersChange({
      ...filters,
      membershipType: newTypes.length > 0 ? newTypes : undefined
    })
  }

  const handleSubscriptionStatusChange = (value: string) => {
    if (value === 'all') {
      const { isActive, ...otherFilters } = filters
      onFiltersChange(otherFilters)
    } else {
      onFiltersChange({
        ...filters,
        isActive: value === 'valid'
      })
    }
  }

  const handleCarOwnershipChange = (value: string) => {
    if (value === 'all') {
      const { hasCar, ...otherFilters } = filters
      onFiltersChange(otherFilters)
    } else {
      onFiltersChange({
        ...filters,
        hasCar: value === 'yes'
      })
    }
  }

  const getActiveFiltersCount = () => {
    let count = 0
    if (filters.membershipType?.length) count++
    if (filters.isActive !== undefined) count++
    if (filters.hasCar !== undefined) count++
    if (filters.searchQuery) count++
    return count
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <div className="md:flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-[#224D62] flex items-center">
            <Filter className="h-5 w-5 mr-2" />
            Filtres et Recherche
            {getActiveFiltersCount() > 0 && (
              <Badge variant="secondary" className="ml-2">
                {getActiveFiltersCount()}
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onReset}
              className="text-gray-600 hover:text-[#224D62]"
            >
              <RotateCcw className="h-4 w-4 mr-1" />
              Réinitialiser
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-[#224D62]"
            >
              Filtres <ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Barre de recherche */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Rechercher par nom, prénom, matricule ou email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4"
          />
          {searchTerm && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSearchTerm('')}
              className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Filtres avancés - collapsibles */}
        {isExpanded && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-4 border-t">
            {/* Type de membre */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 flex items-center">
                <Users className="h-4 w-4 mr-1" />
                Type de Membre
              </label>
              <div className="space-y-2">
                {Object.entries(MEMBERSHIP_TYPE_LABELS).map(([type, label]) => (
                  <div key={type} className="flex items-center space-x-2">
                    <Checkbox
                      id={`type-${type}`}
                      checked={filters.membershipType?.includes(type as MembershipType) || false}
                      onCheckedChange={(checked) => 
                        handleMembershipTypeChange(type as MembershipType, checked as boolean)
                      }
                    />
                    <label 
                      htmlFor={`type-${type}`}
                      className="text-sm text-gray-700 cursor-pointer"
                    >
                      {label}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Statut d'abonnement */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 flex items-center">
                <Calendar className="h-4 w-4 mr-1" />
                Statut d'Abonnement
              </label>
              <Select
                value={
                  filters.isActive === undefined ? 'all' : 
                  filters.isActive ? 'valid' : 'invalid'
                }
                onValueChange={handleSubscriptionStatusChange}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les statuts</SelectItem>
                  <SelectItem value="valid">Abonnement valide</SelectItem>
                  <SelectItem value="invalid">Abonnement expiré</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Possession de véhicule */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 flex items-center">
                <Car className="h-4 w-4 mr-1" />
                Véhicule
              </label>
              <Select
                value={
                  filters.hasCar === undefined ? 'all' : 
                  filters.hasCar ? 'yes' : 'no'
                }
                onValueChange={handleCarOwnershipChange}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous</SelectItem>
                  <SelectItem value="yes">Avec véhicule</SelectItem>
                  <SelectItem value="no">Sans véhicule</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {/* Filtres actifs */}
        {getActiveFiltersCount() > 0 && (
          <div className="flex flex-wrap gap-2 pt-2 border-t">
            {filters.searchQuery && (
              <Badge variant="secondary" className="flex items-center">
                Recherche: "{filters.searchQuery}"
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSearchTerm('')}
                  className="ml-1 h-4 w-4 p-0"
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            )}
            
            {filters.membershipType?.map(type => (
              <Badge key={type} variant="secondary" className="flex items-center">
                {MEMBERSHIP_TYPE_LABELS[type]}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleMembershipTypeChange(type, false)}
                  className="ml-1 h-4 w-4 p-0"
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            ))}
            
            {filters.isActive !== undefined && (
              <Badge variant="secondary" className="flex items-center">
                {filters.isActive ? 'Abonnement valide' : 'Abonnement expiré'}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSubscriptionStatusChange('all')}
                  className="ml-1 h-4 w-4 p-0"
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            )}
            
            {filters.hasCar !== undefined && (
              <Badge variant="secondary" className="flex items-center">
                {filters.hasCar ? 'Avec véhicule' : 'Sans véhicule'}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleCarOwnershipChange('all')}
                  className="ml-1 h-4 w-4 p-0"
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}



export default MemberFilters