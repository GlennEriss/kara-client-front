'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, Loader2, Plus, MapPin, LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface SuggestionItem {
  name: string
  isNew: boolean
  hasAddress?: boolean
  id?: string
  industry?: string
  description?: string
}

interface SuggestionsInputProps {
  value: string
  onChange: (value: string) => void
  onSuggestionSelect?: (suggestion: SuggestionItem) => void
  placeholder?: string
  icon?: LucideIcon
  label: string
  error?: string
  suggestions: SuggestionItem[]
  isLoading?: boolean
  className?: string
  disabled?: boolean
}

export default function SuggestionsInput({
  value,
  onChange,
  onSuggestionSelect,
  placeholder,
  icon: Icon,
  label,
  error,
  suggestions,
  isLoading = false,
  className,
  disabled = false
}: SuggestionsInputProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  // Ouvrir/fermer les suggestions
  useEffect(() => {
    if (value.length >= 2 && suggestions.length > 0) {
      setIsOpen(true)
    } else {
      setIsOpen(false)
    }
  }, [value, suggestions])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    onChange(newValue)
    setSelectedIndex(-1)
  }

  const handleSuggestionClick = (suggestion: SuggestionItem) => {
    const finalValue = suggestion.isNew 
      ? suggestion.name.replace(/^Créer "(.+)"$/, '$1')
      : suggestion.name
    
    onChange(finalValue)
    setIsOpen(false)
    setSelectedIndex(-1)
    
    if (onSuggestionSelect) {
      onSuggestionSelect(suggestion)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || suggestions.length === 0) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : prev
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1)
        break
      case 'Enter':
        e.preventDefault()
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          handleSuggestionClick(suggestions[selectedIndex])
        }
        break
      case 'Escape':
        setIsOpen(false)
        setSelectedIndex(-1)
        break
    }
  }

  const handleFocus = () => {
    if (value.length >= 2 && suggestions.length > 0) {
      setIsOpen(true)
    }
  }

  const handleBlur = () => {
    // Délai pour permettre le clic sur les suggestions
    setTimeout(() => {
      setIsOpen(false)
      setSelectedIndex(-1)
    }, 150)
  }

  return (
    <div className={cn("space-y-2 w-full relative", className)}>
      <label className="text-xs sm:text-sm font-medium text-[#224D62]">
        {label} <span className="text-red-500">*</span>
        <Badge variant="secondary" className="ml-2 bg-[#224D62]/10 text-[#224D62] text-[10px] sm:text-xs">
          Suggestions intelligentes
        </Badge>
      </label>
      
      <div className="relative w-full">
        {Icon && (
          <Icon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#CBB171] z-10" />
        )}
        
        <Input
          ref={inputRef}
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            "pl-10 pr-10 border-[#CBB171]/30 focus:border-[#224D62] focus:ring-[#224D62]/20 transition-all duration-300 w-full",
            error && "border-red-300 focus:border-red-500 bg-red-50/50",
            value && !error && "border-[#CBB171] bg-[#CBB171]/5",
            disabled && "opacity-50 cursor-not-allowed"
          )}
        />
        
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#CBB171] animate-spin" />
        )}
        
        {value && !isLoading && !error && (
          <CheckCircle className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#CBB171]" />
        )}
      </div>

      {/* Suggestions Dropdown */}
      {isOpen && suggestions.length > 0 && (
        <div 
          ref={listRef}
          className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-[#CBB171]/20 rounded-lg shadow-lg max-h-60 overflow-y-auto animate-in fade-in-0 slide-in-from-top-2 duration-200"
        >
          {suggestions.map((suggestion, index) => (
            <div
              key={`${suggestion.name}-${index}`}
              onClick={() => handleSuggestionClick(suggestion)}
              className={cn(
                "flex items-center justify-between px-4 py-3 cursor-pointer transition-colors duration-150",
                index === selectedIndex 
                  ? "bg-[#224D62]/10 border-l-4 border-[#224D62]" 
                  : "hover:bg-[#CBB171]/5"
              )}
            >
              <div className="flex items-center space-x-3 flex-1 min-w-0">
                {suggestion.isNew ? (
                  <Plus className="w-4 h-4 text-[#CBB171] flex-shrink-0" />
                ) : Icon ? (
                  <Icon className="w-4 h-4 text-[#224D62] flex-shrink-0" />
                ) : null}
                
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#224D62] truncate">
                    {suggestion.name}
                  </p>
                  
                  {suggestion.isNew ? (
                    <p className="text-xs text-[#CBB171]">
                      Créer une nouvelle entrée
                    </p>
                  ) : (
                    <div className="flex items-center space-x-2 mt-1">
                      {suggestion.hasAddress && (
                        <div className="flex items-center space-x-1">
                          <MapPin className="w-3 h-3 text-[#CBB171]" />
                          <span className="text-xs text-[#CBB171]">Adresse disponible</span>
                        </div>
                      )}
                      {suggestion.industry && (
                        <span className="text-xs text-[#224D62]/60">
                          {suggestion.industry}
                        </span>
                      )}
                      {suggestion.description && (
                        <span className="text-xs text-[#224D62]/60">
                          {suggestion.description}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
              
              {suggestion.isNew && (
                <Badge variant="outline" className="text-[10px] border-[#CBB171] text-[#CBB171]">
                  Nouveau
                </Badge>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Message d'erreur */}
      {error && (
        <p className="text-red-500 text-xs">
          {error}
        </p>
      )}
    </div>
  )
}
