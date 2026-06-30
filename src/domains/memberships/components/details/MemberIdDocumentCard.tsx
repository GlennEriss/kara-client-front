/**
 * Carte « Pièce d'identité » : type/numéro + téléversement des images ou PDF
 * (recto / verso) par l'admin. Fonctionne pour tous les membres (utile pour les
 * membres importés sans document). Stocké sur le document membre.
 */

'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useQueryClient } from '@tanstack/react-query'
import { IdCard, FileText, Loader2, Upload, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { createFile } from '@/db/upload-image.db'
import { updateUser } from '@/db/user.db'
import type { MemberDetails } from '../../hooks/useMembershipDetails'

interface MemberIdDocumentCardProps {
  member: MemberDetails | null
}

/** Emplacement recto OU verso : aperçu (image/PDF) + bouton téléverser/remplacer. */
function DocSlot({
  label,
  url,
  uploading,
  onUpload,
}: {
  label: string
  url?: string
  uploading: boolean
  onUpload: (file: File) => void
}) {
  const [isImage, setIsImage] = useState(true)
  const inputId = `id-doc-${label}`

  return (
    <div className="space-y-2">
      <div className="text-xs font-semibold text-gray-500">{label}</div>
      <div className="relative flex h-40 items-center justify-center overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
        {url && isImage ? (
          <Image
            src={url}
            alt={label}
            width={300}
            height={300}
            className="h-full w-full object-contain"
            onError={() => setIsImage(false)}
            unoptimized
          />
        ) : url ? (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center gap-1 text-sm font-medium text-[#234D65] hover:underline"
          >
            <FileText className="h-8 w-8" /> Voir le document <ExternalLink className="h-3 w-3" />
          </a>
        ) : (
          <span className="text-xs text-gray-400">Aucun document</span>
        )}
        {uploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/70">
            <Loader2 className="h-5 w-5 animate-spin text-[#234D65]" />
          </div>
        )}
      </div>
      <label htmlFor={inputId} className="block">
        <input
          id={inputId}
          type="file"
          accept="image/*,application/pdf"
          className="hidden"
          disabled={uploading}
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) onUpload(f)
            e.target.value = ''
          }}
        />
        <Button asChild size="sm" variant="outline" className="w-full" disabled={uploading}>
          <span>
            <Upload className="mr-1 h-3.5 w-3.5" /> {url ? 'Remplacer' : 'Téléverser'}
          </span>
        </Button>
      </label>
    </div>
  )
}

export function MemberIdDocumentCard({ member }: MemberIdDocumentCardProps) {
  const queryClient = useQueryClient()
  const [uploadingSide, setUploadingSide] = useState<'front' | 'back' | null>(null)

  if (!member) return null

  const handleUpload = async (side: 'front' | 'back', file: File) => {
    setUploadingSide(side)
    try {
      const { url } = await createFile(file, member.id as string, `member-id-documents/${member.id}/${side}`)
      const field = side === 'front' ? 'identityDocumentFrontURL' : 'identityDocumentBackURL'
      const ok = await updateUser(member.id as string, { [field]: url })
      if (!ok) throw new Error('save failed')
      await queryClient.invalidateQueries({ queryKey: ['membership-details', 'member', member.id] })
      toast.success('Document enregistré')
    } catch {
      toast.error("Échec du téléversement du document")
    } finally {
      setUploadingSide(null)
    }
  }

  return (
    <Card className="group border-0 bg-gradient-to-br from-amber-50/30 to-amber-100/20 shadow-lg">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg font-bold text-gray-900">
          <IdCard className="h-5 w-5 text-amber-600" /> Pièce d&apos;identité
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pt-0" data-testid="member-id-document-card">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <div className="text-xs text-gray-500">Type</div>
            <div className="font-medium">{member.identityDocument || '—'}</div>
          </div>
          <div className="space-y-1">
            <div className="text-xs text-gray-500">Numéro</div>
            <div className="font-medium">{member.identityDocumentNumber || '—'}</div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <DocSlot
            label="Recto"
            url={member.identityDocumentFrontURL}
            uploading={uploadingSide === 'front'}
            onUpload={(f) => handleUpload('front', f)}
          />
          <DocSlot
            label="Verso"
            url={member.identityDocumentBackURL}
            uploading={uploadingSide === 'back'}
            onUpload={(f) => handleUpload('back', f)}
          />
        </div>
      </CardContent>
    </Card>
  )
}
