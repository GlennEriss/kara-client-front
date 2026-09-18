'use client'

import React, { createContext, useCallback, useContext, useState } from 'react'
import { usePathname } from 'next/navigation'
import DocumentViewerModal from './DocumentViewerModal'
import { downloadFile } from '@/utils/downloadFile'
import { useAuth } from '@/domains/auth/hooks/useAuth'
import { logAdminAction } from '@/services/audit/auditLog'
import { moduleForPath } from '@/constantes/permissions'

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
  const { user } = useAuth()
  const pathname = usePathname()

  // La modale n'ouvre ni onglet ni ancre : elle échappe à l'interception posée
  // sur le DOM. La consultation est donc journalisée ici.
  const openDocument = useCallback(
    (next: DocumentPayload) => {
      setDoc(next)
      try {
        const moduleDef = pathname ? moduleForPath(pathname) : null
        logAdminAction({
          adminId: user?.uid || 'inconnu',
          adminName: user?.displayName?.trim() || user?.email || 'Administrateur',
          adminEmail: user?.email || undefined,
          action: 'view',
          module: moduleDef?.key || 'autre',
          moduleLabel: moduleDef?.label,
          targetType: 'fichier',
          targetId: next.filename,
          description: `Consultation du document « ${next.title || next.filename} »`,
          metadata: { fileName: next.filename, page: pathname || undefined },
        })
      } catch {
        // Ne jamais empêcher l'ouverture du document.
      }
    },
    [pathname, user],
  )

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
