'use client'

import React, { createContext, useCallback, useContext, useState } from 'react'
import DocumentViewerModal from './DocumentViewerModal'
import { downloadFile } from '@/utils/downloadFile'

export interface DocumentPayload {
  /** URL du document (Firebase Storage). */
  url?: string | null
  /** Nom de fichier pour le téléchargement. */
  filename: string
  /** Titre de la modale (par défaut « Document »). */
  title?: string
  /** Sous-titre optionnel (ex: nom du membre · #id). */
  subtitle?: string
}

interface DocumentViewerContextValue {
  /** Ouvre la modale d'aperçu/téléchargement (mobile-first, via proxy). */
  openDocument: (doc: DocumentPayload) => void
}

const DocumentViewerContext = createContext<DocumentViewerContextValue | null>(null)

/**
 * Fournit une modale unique d'aperçu/téléchargement de document (mécanisme
 * mobile validé de la Caisse Imprévue), montée une seule fois dans le layout.
 * Toute la partie admin peut appeler `useDocumentViewer().openDocument(...)`.
 */
export function DocumentViewerProvider({ children }: { children: React.ReactNode }) {
  const [doc, setDoc] = useState<DocumentPayload | null>(null)
  const openDocument = useCallback((next: DocumentPayload) => setDoc(next), [])

  return (
    <DocumentViewerContext.Provider value={{ openDocument }}>
      {children}
      <DocumentViewerModal
        isOpen={!!doc}
        onClose={() => setDoc(null)}
        url={doc?.url}
        filename={doc?.filename ?? 'document.pdf'}
        title={doc?.title ?? 'Document'}
        subtitle={doc?.subtitle}
      />
    </DocumentViewerContext.Provider>
  )
}

/**
 * Accès à la modale de document. En dehors du provider, effectue un
 * téléchargement direct (repli robuste) afin de ne jamais casser un appel.
 */
export function useDocumentViewer(): DocumentViewerContextValue {
  const ctx = useContext(DocumentViewerContext)
  if (ctx) return ctx
  return {
    openDocument: (d) => {
      downloadFile(d.url, d.filename)
    },
  }
}
