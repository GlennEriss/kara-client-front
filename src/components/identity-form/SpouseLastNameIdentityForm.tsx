import React from 'react'
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { User, CheckCircle } from 'lucide-react'

export default function SpouseLastNameIdentityForm() {
  return (
    <div className="space-y-2 animate-in fade-in-0 slide-in-from-left-4 duration-700 delay-1200 w-full min-w-0">
      <FormField
        name="spouseLastName"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-xs sm:text-sm font-medium text-[#224D62]">
              Nom du conjoint <span className="text-red-500">*</span>
            </FormLabel>
            
            <FormControl>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#CBB171]" />
                <Input
                  {...field}
                  placeholder="Nom du conjoint"
                  className={cn(
                    "pl-10 pr-10 border-[#CBB171]/30 focus:border-[#224D62] focus:ring-[#224D62]/20 transition-all duration-300 w-full",
                    field.value && "border-[#CBB171] bg-[#CBB171]/5"
                  )}
                />
                {field.value && (
                  <CheckCircle className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#CBB171] animate-in zoom-in-50 duration-200" />
                )}
              </div>
            </FormControl>
            
            <FormMessage className="animate-in slide-in-from-left-2 duration-300 break-words text-xs" />
          </FormItem>
        )}
      />
    </div>
  )
}
