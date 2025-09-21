import React from 'react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { LucideIcon } from 'lucide-react'

interface InputAppProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  type?: string
  icon?: LucideIcon
  className?: string
  disabled?: boolean
}

export default function InputApp({
  value,
  onChange,
  placeholder,
  type = "text",
  icon: Icon,
  className,
  disabled = false
}: InputAppProps) {
  return (
    <div className="relative w-full">
      {Icon && (
        <Icon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#CBB171]" />
      )}
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        type={type}
        placeholder={placeholder}
        disabled={disabled}
        className={cn(
          "h-10 pl-10 pr-10 border-2 border-[#CBB171]/30 focus:border-[#224D62] focus:ring-4 focus:ring-[#224D62]/10 transition-all duration-300 w-full rounded-lg font-medium",
          value && "border-[#CBB171] bg-[#CBB171]/5",
          disabled && "opacity-50 cursor-not-allowed",
          className
        )}
      />
    </div>
  )
}
