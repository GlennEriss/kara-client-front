'use client'

import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Building, 
  Search, 
  MapPin,
  Briefcase,
  Plus,
  Info
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { CompanySuggestion } from '@/hooks/company/useCompanySuggestions'

interface CompanySuggestionsDropdownProps {
  suggestions: CompanySuggestion[]
  isLoading: boolean
  onSelect: (suggestion: CompanySuggestion) => void
  onClose: () => void
  query: string
}

export default function CompanySuggestionsDropdown({
  suggestions,
  isLoading,
  onSelect,
  onClose,
  query
}: CompanySuggestionsDropdownProps) {
  
  if (isLoading) {
    return (
      <Card className="absolute top-full left-0 right-0 mt-1 z-20 border border-[#CBB171]/30 shadow-lg animate-in fade-in-0 slide-in-from-top-2 duration-200 w-full">
        <CardContent className="p-4">
          <div className="flex items-center justify-center space-x-2 text-[#224D62]/70">
            <div className="w-4 h-4 border-2 border-[#CBB171] border-t-transparent rounded-full animate-spin" />
            <span className="text-sm">Recherche d'entreprises...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (suggestions.length === 0) {
    return (
      <Card className="absolute top-full left-0 right-0 mt-1 z-20 border border-[#CBB171]/30 shadow-lg animate-in fade-in-0 slide-in-from-top-2 duration-200 w-full">
        <CardContent className="p-4">
          <div className="text-center text-sm text-gray-500">
            <Building className="w-6 h-6 mx-auto mb-2 text-gray-400" />
            <p>Aucune entreprise trouvée pour "{query}"</p>
            <p className="text-xs mt-1">Vous pourrez créer une nouvelle entreprise</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const existingCompanies = suggestions.filter(s => !s.isNew)
  const hasCompaniesWithAddress = existingCompanies.some(s => s.hasAddress)

  return (
    <Card className="absolute top-full left-0 right-0 mt-1 z-20 border border-[#CBB171]/30 shadow-lg animate-in fade-in-0 slide-in-from-top-2 duration-200 max-h-64 overflow-y-auto w-full">
      <CardContent className="p-3">
        {/* En-tête informatif */}
        <div className="mb-3 p-2 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
          <div className="flex items-start space-x-2">
            <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-blue-700">
              <p className="font-medium mb-1">💡 Suggestions intelligentes</p>
              {hasCompaniesWithAddress ? (
                <p>Les entreprises avec 📍 seront pré-remplies automatiquement</p>
              ) : (
                <p>Sélectionnez une entreprise existante ou créez-en une nouvelle</p>
              )}
            </div>
          </div>
        </div>

        {/* Liste des suggestions */}
        <div className="space-y-1">
          {suggestions.map((suggestion, index) => (
            <Button
              key={`${suggestion.name}-${index}`}
              variant="ghost"
              size="sm"
              className={cn(
                "w-full justify-start text-left hover:bg-[#224D62]/5 transition-all duration-200 text-sm p-3 rounded-lg border border-transparent hover:border-[#224D62]/20",
                suggestion.isNew && "bg-[#CBB171]/5 hover:bg-[#CBB171]/10 border-[#CBB171]/20"
              )}
              onMouseDown={(e) => {
                e.preventDefault() // Empêcher la perte de focus
                onSelect(suggestion)
              }}
            >
              <div className="flex items-center space-x-3 w-full">
                {/* Icône */}
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                  suggestion.isNew 
                    ? "bg-[#CBB171]/20 text-[#CBB171]" 
                    : "bg-[#224D62]/20 text-[#224D62]"
                )}>
                  {suggestion.isNew ? (
                    <Plus className="w-4 h-4" />
                  ) : (
                    <Building className="w-4 h-4" />
                  )}
                </div>

                {/* Contenu */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <span className={cn(
                      "font-medium truncate",
                      suggestion.isNew ? "text-[#CBB171]" : "text-[#224D62]"
                    )}>
                      {suggestion.name}
                    </span>
                    
                    {/* Badges */}
                    <div className="flex items-center space-x-1 flex-shrink-0">
                      {suggestion.hasAddress && (
                        <Badge variant="secondary" className="bg-green-100 text-green-700 text-[10px] px-1.5 py-0.5">
                          <MapPin className="w-2.5 h-2.5 mr-1" />
                          Adresse
                        </Badge>
                      )}
                      {suggestion.industry && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0.5 border-[#CBB171]/30 text-[#224D62]/70">
                          <Briefcase className="w-2.5 h-2.5 mr-1" />
                          {suggestion.industry}
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  {/* Description */}
                  <p className="text-xs text-gray-500 mt-1">
                    {suggestion.isNew 
                      ? "Créer une nouvelle entreprise" 
                      : "Entreprise existante"
                    }
                  </p>
                </div>
              </div>
            </Button>
          ))}
        </div>

        {/* Pied de page */}
        <div className="mt-3 pt-2 border-t border-gray-100">
          <p className="text-xs text-gray-400 text-center">
            {suggestions.length} suggestion{suggestions.length > 1 ? 's' : ''} trouvée{suggestions.length > 1 ? 's' : ''}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
