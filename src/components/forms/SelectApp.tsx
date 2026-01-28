import React from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'

export interface SelectOption {
  value: string
  label: string
}

interface SelectAppProps {
  options: SelectOption[]
  value?: string
  onChange?: (value: string) => void
  placeholder?: string
  className?: string
  disabled?: boolean
}

export default function SelectApp({
  options,
  value,
  onChange,
  placeholder = "Sélectionner une option",
  className,
  disabled = false
}: SelectAppProps) {
  // Log pour déboguer les changements de valeur
  React.useEffect(() => {
    console.log('🔍 SelectApp value changed:', value)
  }, [value])
  
  // Normaliser la valeur : utiliser undefined au lieu de chaîne vide pour le composant Select
  const normalizedValue = value && value.trim() !== '' ? value : undefined
  
  return (
    <Select
      value={normalizedValue}
      onValueChange={onChange}
      disabled={disabled}
    >
      <SelectTrigger className={cn(
        "h-10 border-2 border-[#CBB171]/30 focus:border-[#224D62] focus:ring-4 focus:ring-[#224D62]/10 transition-all duration-300 w-full rounded-lg font-medium",
        value && "border-[#CBB171] bg-[#CBB171]/5",
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
