import React from 'react'
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form'
import FileInput from '@/components/ui/file-input'
import { compressImage, IMAGE_COMPRESSION_PRESETS } from '@/lib/utils'
import { toast } from 'sonner'

interface ProofFileFormProps {
  disabled?: boolean
}

export default function ProofFileForm({ disabled = false }: ProofFileFormProps) {
  return (
    <FormField
      name="proofFile"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Preuve de paiement *</FormLabel>
          <FormControl>
            <FileInput
              accept="image/*"
              maxSize={5}
              onFileSelect={async (selectedFile) => {
                if (!selectedFile) {
                  field.onChange(undefined)
                  return
                }
                try {
                  const dataUrl = await compressImage(selectedFile, IMAGE_COMPRESSION_PRESETS.document)
                  const res = await fetch(dataUrl)
                  const blob = await res.blob()
                  const webpFile = new File([blob], "proof.webp", { type: "image/webp" })
                  field.onChange(webpFile)
                  toast.success("Preuve compressée (WebP) prête")
                } catch (err) {
                  console.error(err)
                  toast.error("Échec de la compression de l'image")
                  field.onChange(undefined)
                }
              }}
               disabled={disabled}
               label=""
               placeholder="Glissez-déposez une image ou cliquez pour parcourir"
               currentFile={field.value}
               className="w-full"
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  )
}
