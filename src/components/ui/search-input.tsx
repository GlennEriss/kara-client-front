'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Search, X, Loader2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/**
 * Composant de recherche standardisé avec debounce
 * 
 * Utilisé dans tous les modules pour la recherche de données
 * Design système KARA avec animations modernes
 * 
 * Features :
 * - Icône de recherche animée
 * - Bouton de suppression (X) avec animation
 * - Debounce automatique pour limiter les requêtes
 * - Variantes de style (default, kara, minimal, glass)
 * - Indicateur de chargement
 * - Design cohérent KARA
 */

type SearchVariant = 'default' | 'kara' | 'minimal' | 'glass'

interface SearchInputProps {
  placeholder?: string
  value: string
  onChange: (value: string) => void
  onClear?: () => void
  debounceMs?: number
  className?: string
  disabled?: boolean
  autoFocus?: boolean
  isLoading?: boolean
  variant?: SearchVariant
  size?: 'sm' | 'md' | 'lg'
}

const variantStyles: Record<SearchVariant, {
  container: string
  input: string
  icon: string
  iconActive: string
  clearButton: string
}> = {
  default: {
    container: 'group',
    input: cn(
      'border-gray-200 bg-white',
      'focus:border-kara-primary-dark focus:ring-2 focus:ring-kara-primary-dark/20',
      'transition-all duration-300'
    ),
    icon: 'text-gray-400 group-focus-within:text-kara-primary-dark transition-colors duration-300',
    iconActive: 'text-kara-primary-dark',
    clearButton: 'hover:bg-gray-100 text-gray-400 hover:text-gray-600',
  },
  kara: {
    container: 'group',
    input: cn(
      'border-2 border-kara-primary-dark/20 bg-gradient-to-r from-white to-kara-neutral-50',
      'focus:border-kara-primary-dark focus:ring-4 focus:ring-kara-primary-light/30',
      'focus:shadow-lg focus:shadow-kara-primary-dark/10',
      'hover:border-kara-primary-dark/40 hover:shadow-md',
      'transition-all duration-300 ease-out'
    ),
    icon: cn(
      'text-kara-primary-dark/50',
      'group-focus-within:text-kara-primary-dark group-focus-within:scale-110',
      'transition-all duration-300'
    ),
    iconActive: 'text-kara-primary-dark scale-110',
    clearButton: cn(
      'hover:bg-kara-primary-light/20 text-kara-primary-dark/50',
      'hover:text-kara-primary-dark hover:scale-110',
      'active:scale-95 transition-all duration-200'
    ),
  },
  minimal: {
    container: 'group',
    input: cn(
      'border-0 border-b-2 border-gray-200 rounded-none bg-transparent',
      'focus:border-kara-primary-dark focus:ring-0',
      'hover:border-gray-300',
      'transition-colors duration-300'
    ),
    icon: 'text-gray-400 group-focus-within:text-kara-primary-dark transition-colors duration-300',
    iconActive: 'text-kara-primary-dark',
    clearButton: 'hover:bg-transparent text-gray-400 hover:text-kara-primary-dark',
  },
  glass: {
    container: 'group',
    input: cn(
      'border border-white/30 bg-white/70 backdrop-blur-md',
      'focus:border-kara-primary-dark/50 focus:ring-4 focus:ring-white/30 focus:bg-white/90',
      'hover:bg-white/80 hover:shadow-lg',
      'shadow-sm transition-all duration-300'
    ),
    icon: cn(
      'text-kara-primary-dark/60',
      'group-focus-within:text-kara-primary-dark',
      'transition-colors duration-300'
    ),
    iconActive: 'text-kara-primary-dark',
    clearButton: 'hover:bg-white/50 text-kara-primary-dark/50 hover:text-kara-primary-dark',
  },
}

const sizeStyles = {
  sm: {
    container: 'h-8',
    input: 'h-8 text-sm pl-8 pr-8',
    icon: 'h-3.5 w-3.5 left-2.5',
    clearButton: 'h-6 w-6',
  },
  md: {
    container: 'h-10',
    input: 'h-10 pl-10 pr-10',
    icon: 'h-4 w-4 left-3',
    clearButton: 'h-8 w-8',
  },
  lg: {
    container: 'h-12',
    input: 'h-12 text-lg pl-12 pr-12',
    icon: 'h-5 w-5 left-4',
    clearButton: 'h-9 w-9',
  },
}

export function SearchInput({
  placeholder = 'Rechercher...',
  value,
  onChange,
  onClear,
  debounceMs = 300,
  className,
  disabled = false,
  autoFocus = false,
  isLoading = false,
  variant = 'kara',
  size = 'md',
}: SearchInputProps) {
  const [localValue, setLocalValue] = useState(value)
  const [isFocused, setIsFocused] = useState(false)

  const styles = variantStyles[variant]
  const sizes = sizeStyles[size]

  // Debounce la valeur avant d'appeler onChange
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localValue !== value) {
        onChange(localValue)
      }
    }, debounceMs)

    return () => clearTimeout(timer)
  }, [localValue, debounceMs, onChange, value])

  // Synchroniser avec la valeur externe (pour reset par exemple)
  useEffect(() => {
    setLocalValue(value)
  }, [value])

  const handleClear = useCallback(() => {
    setLocalValue('')
    onChange('')
    onClear?.()
  }, [onChange, onClear])

  const hasValue = localValue.length > 0

  return (
    <div 
      className={cn('relative', styles.container, className)} 
      data-testid="search-input"
    >
      <div className="relative">
        {/* Icône de recherche ou loader */}
        <div 
          className={cn(
            'absolute top-1/2 -translate-y-1/2 pointer-events-none z-10',
            sizes.icon
          )}
        >
          {isLoading ? (
            <Loader2 
              className={cn(
                sizes.icon.replace('left-2.5', '').replace('left-3', '').replace('left-4', ''),
                'animate-spin text-kara-primary-light'
              )} 
            />
          ) : (
            <Search 
              className={cn(
                sizes.icon.replace('left-2.5', '').replace('left-3', '').replace('left-4', ''),
                hasValue || isFocused ? styles.iconActive : styles.icon
              )} 
            />
          )}
        </div>
        
        <Input
          type="text"
          placeholder={placeholder}
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          disabled={disabled}
          autoFocus={autoFocus}
          className={cn(
            sizes.input,
            styles.input,
            disabled && 'opacity-50 cursor-not-allowed'
          )}
        />
        
        {/* Bouton clear avec animation */}
        {hasValue && !disabled && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleClear}
            className={cn(
              'absolute right-1 top-1/2 -translate-y-1/2 p-0 rounded-full',
              'animate-in fade-in-0 zoom-in-75 duration-200',
              sizes.clearButton,
              styles.clearButton
            )}
            aria-label="Effacer la recherche"
          >
            <X className={cn(
              size === 'sm' ? 'h-3 w-3' : size === 'lg' ? 'h-5 w-5' : 'h-4 w-4'
            )} />
          </Button>
        )}
      </div>
      
      {/* Ligne d'accent animée (pour variant kara) */}
      {variant === 'kara' && (
        <div 
          className={cn(
            'absolute bottom-0 left-1/2 -translate-x-1/2 h-0.5 bg-gradient-to-r from-kara-primary-dark to-kara-primary-light rounded-full',
            'transition-all duration-300 ease-out',
            isFocused ? 'w-full opacity-100' : 'w-0 opacity-0'
          )}
        />
      )}
    </div>
  )
}
