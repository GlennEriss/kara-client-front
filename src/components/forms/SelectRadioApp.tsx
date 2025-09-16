import React from 'react'
import { cn } from '@/lib/utils'

export interface RadioOption {
  value: string
  label: string
}

interface SelectRadioAppProps {
  options: RadioOption[]
  value?: string
  onChange?: (value: string) => void
  className?: string
  disabled?: boolean
  name?: string
}

export default function SelectRadioApp({
  options,
  value,
  onChange,
  className,
  disabled = false,
  name
}: SelectRadioAppProps) {
  return (
    <div className={cn("flex flex-wrap gap-4 sm:gap-6", className)}>
      {options.map((option) => (
        <label
          key={option.value}
          className="flex items-center space-x-2 cursor-pointer group"
        >
          <input
            type="radio"
            name={name}
            value={option.value}
            checked={value === option.value}
            onChange={(e) => onChange?.(e.target.value)}
            disabled={disabled}
            className="w-4 h-4 border-[#224D62]/30 transition-all duration-200"
            style={{
              accentColor: '#224D62'
            }}
          />
          <span className="text-sm font-medium text-[#224D62] group-hover:text-[#CBB171] transition-colors duration-200">
            {option.label}
          </span>
        </label>
      ))}
    </div>
  )
}
