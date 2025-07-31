'use client'

import React from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import ReactCountryFlag from 'react-country-flag'
import countries from 'world-countries'
import { Globe, CheckCircle, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import PRIORITY_COUNTRIES from '@/constantes/country-code'
import NATIONALITY_NAMES from '@/constantes/nationality'

interface SelectCountryProps {
  value?: string
  onValueChange?: (value: string) => void
  placeholder?: string
  defaultValue?: string
  className?: string
  error?: string
  showValidation?: boolean
  disabled?: boolean
}

// Générer la liste des nationalités
const generateNationalityOptions = () => {
  const options: Array<{ value: string; label: string; country: string }> = []
  
  // Ajouter les pays prioritaires en premier
  PRIORITY_COUNTRIES.forEach(countryCode => {
    const country = countries.find(c => c.cca2 === countryCode)
    if (country && NATIONALITY_NAMES[countryCode]) {
      options.push({
        value: countryCode,
        label: NATIONALITY_NAMES[countryCode],
        country: country.name.common
      })
    }
  })
  
  // Ajouter les autres pays (triés alphabétiquement)
  const remainingCountries = countries
    .filter(country => !PRIORITY_COUNTRIES.includes(country.cca2))
    .filter(country => NATIONALITY_NAMES[country.cca2]) // Seulement ceux avec nationalité définie
    .sort((a, b) => (NATIONALITY_NAMES[a.cca2] || '').localeCompare(NATIONALITY_NAMES[b.cca2] || ''))
  
  remainingCountries.forEach(country => {
    if (NATIONALITY_NAMES[country.cca2]) {
      options.push({
        value: country.cca2,
        label: NATIONALITY_NAMES[country.cca2],
        country: country.name.common
      })
    }
  })
  
  return options
}

const NATIONALITY_OPTIONS = generateNationalityOptions()

export const SelectCountry: React.FC<SelectCountryProps> = ({
  value,
  onValueChange,
  placeholder = "Sélectionner nationalité",
  defaultValue = "GA",
  className,
  error,
  showValidation = false,
  disabled = false
}) => {
  const currentValue = value || defaultValue
  const selectedOption = NATIONALITY_OPTIONS.find(n => n.value === currentValue)
  const hasValidValue = currentValue && !error
  
  return (
    <div className="relative w-full min-w-0">
      <Select 
        value={currentValue}
        onValueChange={onValueChange}
        defaultValue={defaultValue}
        disabled={disabled}
      >
        <SelectTrigger 
          className={cn(
            "border-[#CBB171]/30 focus:border-[#224D62] focus:ring-[#224D62]/20 transition-all duration-300 w-full",
            error && "border-red-300 focus:border-red-500 bg-red-50/50",
            hasValidValue && showValidation && "border-[#CBB171] bg-[#CBB171]/5",
            disabled && "opacity-50 cursor-not-allowed",
            className
          )}
        >
          <div className="flex items-center space-x-2">
            <Globe className="w-4 h-4 text-[#CBB171]" />
            {selectedOption ? (
              <div className="flex items-center space-x-2">
                <ReactCountryFlag 
                  countryCode={selectedOption.value} 
                  svg 
                  style={{ width: '1.2em', height: '1.2em' }}
                />
                <span>{selectedOption.label}</span>
              </div>
            ) : (
              <SelectValue placeholder={placeholder} />
            )}
          </div>
        </SelectTrigger>
        <SelectContent className="max-h-64">
          {NATIONALITY_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              <div className="flex items-center space-x-2">
                <ReactCountryFlag 
                  countryCode={option.value} 
                  svg 
                  style={{ width: '1.2em', height: '1.2em' }}
                />
                <span>{option.label}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      
      {/* Validation checkmark */}
      {hasValidValue && showValidation && (
        <CheckCircle className="absolute right-8 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#CBB171] animate-in zoom-in-50 duration-200 z-10" />
      )}
      
      {/* Error message */}
      {error && (
        <div className="flex items-center space-x-1 text-red-500 text-xs animate-in slide-in-from-left-2 duration-300 break-words mt-1">
          <AlertCircle className="w-3 h-3" />
          <span>{error}</span>
        </div>
      )}
    </div>
  )
}

// Export des utilitaires pour usage externe
export { NATIONALITY_OPTIONS, NATIONALITY_NAMES }

// Helper pour obtenir le nom de nationalité à partir du code pays
export const getNationalityLabel = (countryCode: string): string => {
  return NATIONALITY_NAMES[countryCode] || countryCode
}

// Helper pour obtenir les informations complètes d'un pays
export const getCountryInfo = (countryCode: string) => {
  const country = countries.find(c => c.cca2 === countryCode)
  const nationalityLabel = NATIONALITY_NAMES[countryCode]
  
  return {
    code: countryCode,
    name: country?.name.common || '',
    nationality: nationalityLabel || '',
    flag: countryCode,
    official: country?.name.official || ''
  }
}