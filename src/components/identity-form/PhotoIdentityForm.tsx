import React, { useRef } from 'react'
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { Camera, CheckCircle } from 'lucide-react'
import useStep1Form from '@/hooks/register/useStep1Form'

export default function PhotoIdentityForm() {
  const { 
    form, 
    isDragOver, 
    setIsDragOver,
    handleFileChange,
    handleDrop
  } = useStep1Form()
  const { watch } = form
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // Récupérer la photo depuis le formulaire
  const photoValue = watch('identity.photo')

  return (
    <div className="lg:col-span-1 w-full min-w-0">
      <div className="text-center space-y-4 w-full">
        <FormField
          name="photo"
          render={({ field, fieldState }) => (
            <FormItem>
              <FormLabel className="text-sm sm:text-base font-bold text-[#224D62]">
                Photo de profil <span className="text-red-500">*</span>
              </FormLabel>
              
              <FormControl>
                <div
                  className={cn(
                    "relative w-32 h-32 sm:w-40 sm:h-40 mx-auto rounded-full border-2 border-dashed transition-all duration-300 cursor-pointer group",
                    isDragOver
                      ? "border-[#224D62] bg-[#224D62]/5 shadow-lg scale-105"
                      : "border-[#224D62]/30 hover:border-[#224D62]/50 hover:bg-[#224D62]/5 hover:scale-105",
                    photoValue && "border-solid border-[#224D62]/50 bg-[#224D62]/5",
                    fieldState.error && "border-red-300 bg-red-50"
                  )}
                  onDrop={handleDrop}
                  onDragOver={(e) => { e.preventDefault(); setIsDragOver(true) }}
                  onDragLeave={() => setIsDragOver(false)}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {photoValue ? (
                    <div className="w-full h-full rounded-full overflow-hidden">
                      <Avatar className="w-full h-full">
                        <AvatarImage src={photoValue} alt="Photo de profil" />
                        <AvatarFallback className="bg-[#224D62]/10">
                          <Camera className="w-8 h-8 sm:w-10 sm:h-10 text-[#224D62]" />
                        </AvatarFallback>
                      </Avatar>
                      {/* Badge de succès */}
                      <div className="absolute -top-2 -right-2">
                        <Badge className="bg-gradient-to-r from-[#CBB171] to-[#224D62] text-white text-xs shadow-sm">
                          <CheckCircle className="w-3 h-3 mr-1" />
                        </Badge>
                      </div>
                    </div>
                  ) : (
                    <div className="w-full h-full rounded-full flex items-center justify-center bg-gradient-to-r from-[#224D62]/10 to-[#CBB171]/10 group-hover:from-[#224D62]/20 group-hover:to-[#CBB171]/20 transition-all duration-300">
                      <Camera className="w-8 h-8 sm:w-10 sm:h-10 text-[#224D62] group-hover:scale-110 transition-transform" />
                    </div>
                  )}

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </div>
              </FormControl>

              {/* Texte d'aide */}
              <div className="space-y-1">
                <p className="text-sm text-gray-600 font-medium">
                  Cliquez pour ajouter une photo
                </p>
                <p className="text-xs text-gray-500">
                  PNG, JPG, WebP (max 5MB) → Compressé en WebP
                </p>
              </div>

              <FormMessage className="text-center" />
            </FormItem>
          )}
        />
      </div>
    </div>
  )
}