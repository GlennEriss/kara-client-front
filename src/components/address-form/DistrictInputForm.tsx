'use client'

import React from 'react'
import { FormField, FormLabel, FormControl, FormMessage } from '@/components/ui/form'
import { useFormContext } from 'react-hook-form'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { MapPin, Info } from 'lucide-react'
import { cn } from '@/lib/utils'
import { RegisterFormData } from '@/schemas/schemas'

interface DistrictInputFormProps {
  selectedLocation?: any
  disabled?: boolean
  required?: boolean
  label?: string
  placeholder?: string
}

export default function DistrictInputForm({ 
  selectedLocation,
  disabled = false,
  required = true,
  label = "Quartier",
  placeholder = "Ex: Glass, Akanda, Lalala..."
}: DistrictInputFormProps) {
  const form = useFormContext<RegisterFormData>()
  
  return (
    <FormField
      control={form.control}
      name="address.district"
      render={({ field, fieldState }) => (
        <div className="space-y-2 animate-in fade-in-0 slide-in-from-right-4 duration-700 w-full min-w-0">
          <Label className="text-xs sm:text-sm font-medium text-[#224D62]">
            {label} {required && <span className="text-red-500">*</span>}
            {selectedLocation && (
              <Badge variant="secondary" className={cn(
                "ml-2 text-[10px] sm:text-xs",
                selectedLocation 
                  ? "bg-green-100 text-green-700" 
                  : "bg-[#224D62]/10 text-[#224D62]"
              )}>
                {selectedLocation ? 'Modifiable' : 'Automatique'}
              </Badge>
            )}
          </Label>
          
          <div className="relative w-full min-w-0">
            <MapPin className={cn(
              "absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 z-10",
              selectedLocation ? "text-[#CBB171]" : "text-gray-400"
            )} />
            <Input
              {...field}
              placeholder={placeholder}
              disabled={disabled}
              className={cn(
                "pl-10 pr-10 border-2 border-[#CBB171]/30 focus:border-[#224D62] focus:ring-4 focus:ring-[#224D62]/10 transition-all duration-300 w-full rounded-lg font-medium",
                field.value && "border-[#CBB171] bg-[#CBB171]/5",
                disabled && "opacity-50 cursor-not-allowed",
                fieldState.error && "border-red-300 focus:border-red-500 bg-red-50/50"
              )}
            />
          </div>
          
          {/* Message d'erreur */}
          {fieldState.error && (
            <div className="flex items-center space-x-1 text-red-500 text-xs animate-in slide-in-from-left-2 duration-300 break-words">
              <span>{fieldState.error.message}</span>
            </div>
          )}

          {/* Notice informative */}
          {selectedLocation && (
            <div className="flex items-center space-x-2 text-gray-500 text-xs animate-in slide-in-from-right-2 duration-300 break-words">
              <Info className="w-3 h-3 flex-shrink-0" />
              <span>
                Sélectionnez d'abord un quartier dans la recherche. Vous pourrez ensuite corriger la syntaxe si nécessaire.
              </span>
            </div>
          )}
          
          <FormMessage />
        </div>
      )}
    />
  )
}
