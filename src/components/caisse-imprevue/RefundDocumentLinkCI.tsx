'use client'

import { useDocumentCI } from '@/hooks/caisse-imprevue/useDocumentCI'
import { useDocumentViewer } from '@/components/documents/DocumentViewerProvider'
import { Download, Loader2 } from 'lucide-react'

interface RefundDocumentLinkCIProps {
  documentId?: string
}

export default function RefundDocumentLinkCI({ documentId }: RefundDocumentLinkCIProps) {
  const { data: document, isLoading } = useDocumentCI(documentId)
  const { openDocument } = useDocumentViewer()

  if (!documentId) {
    return <span className="text-xs text-gray-500">Indisponible</span>
  }

  if (isLoading) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-gray-500">
        <Loader2 className="h-3 w-3 animate-spin" />
        Chargement...
      </span>
    )
  }

  if (!document?.url) {
    return <span className="text-xs text-gray-500">Indisponible</span>
  }

  const handleDownload = () => {
    const filename = document.originalFileName ?? 'document.pdf'
    openDocument({ url: document.url, filename, title: document.libelle || 'Document de remboursement' })
  }

  return (
    <button
      type="button"
      onClick={handleDownload}
      className="text-indigo-600 hover:underline font-medium inline-flex items-center gap-1 text-sm cursor-pointer"
    >
      <Download className="h-4 w-4" />
      Télécharger
    </button>
  )
}
