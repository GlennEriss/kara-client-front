'use client'

import { useRef, useState, useEffect } from 'react'
import { Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { validateAgentPhotoFile } from '@/db/upload-image.db'

interface AgentPhotoUploadProps {
  value: File | null
  previewUrl?: string | null
  onChange: (file: File | null) => void
  onRemove?: () => void
  onError?: (message: string) => void
  disabled?: boolean
}

export function AgentPhotoUpload({ value, previewUrl, onChange, onRemove, onError, disabled }: AgentPhotoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [objectUrl, setObjectUrl] = useState<string | null>(null)

  useEffect(() => {
    if (value && !previewUrl) {
      const url = URL.createObjectURL(value)
      setObjectUrl(url)
      return () => URL.revokeObjectURL(url)
    }
    setObjectUrl(null)
  }, [value, previewUrl])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      validateAgentPhotoFile(file)
      onChange(file)
      onError?.('')
    } catch (err) {
      onError?.(err instanceof Error ? err.message : 'Fichier invalide')
    }
    e.target.value = ''
  }

  const handleRemove = () => {
    onChange(null)
    onRemove?.()
    if (inputRef.current) inputRef.current.value = ''
  }

  const displayPreview = previewUrl || objectUrl

  return (
    <div className="space-y-2">
      <div
        className={cn(
          'flex items-center gap-4 p-4 rounded-lg border-2 border-dashed transition-colors',
          'bg-muted/30 hover:bg-muted/50',
          disabled && 'opacity-50 pointer-events-none'
        )}
      >
        <label className="cursor-pointer shrink-0">
          <div
            className={cn(
              'w-24 h-24 rounded-full overflow-hidden flex items-center justify-center',
              'border-2 border-dashed border-muted-foreground/30 hover:border-primary/50',
              'bg-muted/50 transition-colors'
            )}
          >
            {displayPreview ? (
              <img src={displayPreview} alt="Preview" className="w-full h-full object-cover" />
            ) : (
              <Plus className="w-10 h-10 text-muted-foreground" />
            )}
          </div>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp"
            className="hidden"
            onChange={handleChange}
            disabled={disabled}
          />
        </label>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-muted-foreground">
            {displayPreview ? 'Cliquer pour remplacer la photo' : 'Cliquer pour ajouter une photo'}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">jpeg, png, webp - max 5 MB</p>
          {displayPreview && (
            <Button type="button" variant="ghost" size="sm" className="mt-2 text-destructive hover:text-destructive" onClick={handleRemove}>
              <X className="w-4 h-4 mr-1" />
              Supprimer
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
