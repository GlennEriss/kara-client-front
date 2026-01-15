import React, { useState, useRef } from 'react'
import { X, Phone, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

// Opérateurs gabonais avec leurs préfixes
const GABON_OPERATORS = [
  { prefixes: ['60', '62', '66'], name: 'Libertis', color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
  { prefixes: ['65'], name: 'Moov', color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-200' },
  { prefixes: ['74', '76', '77'], name: 'Airtel', color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' },
]

interface GabonPhoneInputProps {
  value: string
  onChange: (value: string) => void
  onRemove?: () => void
  canRemove?: boolean
  error?: string
  placeholder?: string
  disabled?: boolean
}

/**
 * Détecte l'opérateur à partir des 2 premiers chiffres
 */
const detectOperator = (number: string) => {
  const cleaned = number.replace(/\D/g, '')
  if (cleaned.length >= 2) {
    const prefix = cleaned.substring(0, 2)
    return GABON_OPERATORS.find(op => op.prefixes.includes(prefix))
  }
  return null
}

/**
 * Formate le numéro pour l'affichage : XX XX XX XX
 */
const formatDisplay = (number: string): string => {
  const cleaned = number.replace(/\D/g, '')
  const parts = []
  for (let i = 0; i < cleaned.length; i += 2) {
    parts.push(cleaned.substring(i, i + 2))
  }
  return parts.join(' ')
}

/**
 * Extrait les 8 chiffres du numéro (sans +241)
 */
const extractDigits = (number: string): string => {
  if (!number) return ''
  // Si commence par +241, extraire après
  if (number.startsWith('+241')) {
    return number.substring(4).replace(/\D/g, '')
  }
  return number.replace(/\D/g, '')
}

/**
 * Valide un numéro gabonais
 */
const isValidGabonPhone = (number: string): boolean => {
  const digits = extractDigits(number)
  if (digits.length !== 8) return false
  
  const prefix = digits.substring(0, 2)
  return GABON_OPERATORS.some(op => op.prefixes.includes(prefix))
}

export default function GabonPhoneInput({
  value,
  onChange,
  onRemove,
  canRemove = false,
  error,
  placeholder = 'XX XX XX XX',
  disabled = false
}: GabonPhoneInputProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isFocused, setIsFocused] = useState(false)
  
  const digits = extractDigits(value)
  const displayValue = formatDisplay(digits)
  const operator = detectOperator(digits)
  const isValid = digits.length === 8 && isValidGabonPhone(value)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Extraire uniquement les chiffres
    const inputValue = e.target.value.replace(/\D/g, '')
    
    // Limiter à 8 chiffres
    const limited = inputValue.substring(0, 8)
    
    // Sauvegarder position curseur
    const cursorPos = e.target.selectionStart || 0
    const beforeCursor = e.target.value.substring(0, cursorPos)
    const digitsBeforeCursor = beforeCursor.replace(/\D/g, '').length
    
    // Appeler onChange avec format +241XXXXXXXX
    onChange(limited ? `+241${limited}` : '')
    
    // Restaurer position curseur après le re-render
    requestAnimationFrame(() => {
      if (inputRef.current) {
        inputRef.current.focus()
        const formatted = formatDisplay(limited)
        // Calculer nouvelle position en comptant les espaces
        let newPos = 0
        let digitCount = 0
        for (let i = 0; i < formatted.length && digitCount < digitsBeforeCursor; i++) {
          if (/\d/.test(formatted[i])) digitCount++
          newPos = i + 1
        }
        inputRef.current.setSelectionRange(newPos, newPos)
      }
    })
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Permettre les touches de contrôle
    if (['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.key)) {
      return
    }
    // Bloquer tout sauf les chiffres
    if (!/^\d$/.test(e.key)) {
      e.preventDefault()
    }
  }

  return (
    <div className="space-y-1.5">
      <div className={cn(
        "relative flex items-center gap-2 rounded-xl border-2 transition-all duration-200",
        "bg-white overflow-hidden",
        error ? "border-red-300" : isFocused ? "border-blue-400 shadow-sm" : "border-slate-200 hover:border-slate-300",
        disabled && "opacity-50 cursor-not-allowed bg-slate-50",
        operator && !error && "border-current"
      )}
      style={operator && !error ? { borderColor: operator.color.replace('text-', '#') } : undefined}
      >
        {/* Indicatif +241 avec drapeau */}
        <div className={cn(
          "flex items-center gap-2 px-3 py-2.5 border-r-2 transition-colors",
          operator ? `${operator.bg} ${operator.border}` : "bg-slate-50 border-slate-200"
        )}>
          <span className="text-xl leading-none">🇬🇦</span>
          <span className="font-semibold text-slate-700 text-sm">+241</span>
        </div>

        {/* Champ de saisie */}
        <div className="flex-1 relative">
          <input
            ref={inputRef}
            type="tel"
            inputMode="numeric"
            value={displayValue}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={placeholder}
            disabled={disabled}
            className={cn(
              "w-full h-11 px-3 bg-transparent border-0 outline-none",
              "text-base font-medium tracking-wider placeholder:text-slate-400",
              "disabled:cursor-not-allowed"
            )}
            maxLength={11} // 8 chiffres + 3 espaces
          />

          {/* Badge opérateur */}
          {operator && digits.length >= 2 && (
            <div className={cn(
              "absolute right-2 top-1/2 -translate-y-1/2",
              "px-2.5 py-1 rounded-full text-xs font-bold",
              "animate-in fade-in zoom-in duration-200",
              operator.bg, operator.color
            )}>
              {operator.name}
            </div>
          )}

          {/* Icône validation */}
          {isValid && (
            <div className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center animate-in zoom-in duration-200">
              <Check className="w-4 h-4 text-white" />
            </div>
          )}
        </div>

        {/* Bouton supprimer */}
        {canRemove && onRemove && (
          <button
            type="button"
            onClick={onRemove}
            disabled={disabled}
            className={cn(
              "px-3 h-11 flex items-center justify-center",
              "text-slate-400 hover:text-red-500 hover:bg-red-50",
              "transition-colors disabled:cursor-not-allowed disabled:opacity-50"
            )}
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Message d'erreur */}
      {error && (
        <p className="text-xs text-red-500 pl-1 animate-in fade-in slide-in-from-top-1 duration-200">
          {error}
        </p>
      )}

      {/* Message de validation pour les nombres partiels */}
      {digits.length > 0 && digits.length < 8 && !error && (
        <p className="text-xs text-amber-600 pl-1">
          {8 - digits.length} chiffre{8 - digits.length > 1 ? 's' : ''} restant{8 - digits.length > 1 ? 's' : ''}
        </p>
      )}
    </div>
  )
}

// Export également une version multi-contacts
export function GabonPhoneInputList({
  values,
  onChange,
  maxContacts = 3,
  error
}: {
  values: string[]
  onChange: (values: string[]) => void
  maxContacts?: number
  error?: string
}) {
  const addContact = () => {
    if (values.length < maxContacts) {
      onChange([...values, ''])
    }
  }

  const removeContact = (index: number) => {
    if (values.length > 1) {
      onChange(values.filter((_, i) => i !== index))
    }
  }

  const updateContact = (index: number, value: string) => {
    const updated = [...values]
    updated[index] = value
    onChange(updated)
  }

  return (
    <div className="space-y-3">
      {values.map((contact, index) => (
        <GabonPhoneInput
          key={index}
          value={contact}
          onChange={(value) => updateContact(index, value)}
          onRemove={() => removeContact(index)}
          canRemove={values.length > 1}
        />
      ))}

      {values.length < maxContacts && (
        <button
          type="button"
          onClick={addContact}
          className="w-full h-11 rounded-xl border-2 border-dashed border-slate-300 hover:border-blue-400 hover:bg-blue-50 text-slate-600 hover:text-blue-600 font-medium transition-all duration-200 flex items-center justify-center gap-2"
        >
          <Phone className="w-4 h-4" />
          Ajouter un contact ({values.length}/{maxContacts})
        </button>
      )}

      {error && (
        <p className="text-xs text-red-500 pl-1">{error}</p>
      )}

      <p className="text-xs text-slate-500 pl-1 flex items-center gap-1.5">
        <Check className="w-3 h-3" />
        Opérateurs : Libertis (60, 62, 66) • Moov (65) • Airtel (74, 76, 77)
      </p>
    </div>
  )
}
