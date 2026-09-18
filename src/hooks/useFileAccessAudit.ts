'use client'

/**
 * Journalise l'accès aux fichiers depuis l'admin : téléchargements ET
 * ouvertures d'un document stocké.
 *
 * Il n'existe pas de fonction unique par laquelle passent les exports : le
 * dépôt compte 86 fichiers qui déclenchent un téléchargement, par trois
 * mécanismes différents. Tous finissent cependant par agir sur une balise
 * `<a download>` :
 *
 *   - `xlsx` et le code applicatif appellent `link.click()`
 *   - `jsPDF` envoie `dispatchEvent(new MouseEvent('click'))`
 *
 * On intercepte donc ces deux méthodes sur `HTMLAnchorElement`, plutôt que
 * d'instrumenter chaque appel — sinon le moindre export ajouté demain
 * échapperait au journal.
 *
 * Le filtre est étroit : seuls les ancres portant un attribut `download` non
 * vide sont journalisées, ce qui exclut la navigation ordinaire.
 */

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/domains/auth/hooks/useAuth'
import { logAdminAction } from '@/services/audit/auditLog'
import { moduleForPath } from '@/constantes/permissions'

/** Deux déclenchements rapprochés du même fichier = un seul téléchargement. */
const DEDUPE_WINDOW_MS = 1500

/**
 * Reconnaît l'URL d'un document conservé (Firebase Storage ou proxy interne).
 *
 * Les `blob:` et `data:` sont écartés : ce sont des documents générés à la
 * volée (quittances, factures), qui n'existent que dans l'onglet courant. Les
 * liens externes — WhatsApp, réseaux sociaux — et la navigation interne le sont
 * aussi.
 */
export function isStoredDocumentUrl(rawUrl: string | null | undefined): boolean {
  if (!rawUrl) return false
  const url = rawUrl.trim()
  if (!url || url.startsWith('blob:') || url.startsWith('data:') || url === 'about:blank') return false
  if (url.startsWith('/api/download')) return true
  return /firebasestorage\.googleapis\.com|\.firebasestorage\.app|storage\.googleapis\.com/.test(url)
}

/** Dernier segment de l'URL, sans les paramètres de requête. */
export function fileNameFromUrl(rawUrl: string): string {
  try {
    const parsed = new URL(rawUrl, 'http://localhost')
    const fromParam = parsed.searchParams.get('filename')
    if (fromParam) return fromParam
    const path = decodeURIComponent(parsed.pathname)
    return path.split('/').filter(Boolean).pop() || 'document'
  } catch {
    return 'document'
  }
}

interface InstalledPatch {
  click: HTMLAnchorElement['click']
  dispatchEvent: HTMLAnchorElement['dispatchEvent']
  windowOpen: typeof window.open
}

let installed: InstalledPatch | null = null
/** Réinstallé une seule fois, même si plusieurs composants montent le hook. */
let listeners = 0

export function useFileAccessAudit() {
  const { user } = useAuth()
  const pathname = usePathname()

  // Les valeurs sont lues au moment du téléchargement : le patch est posé une
  // fois, il ne doit pas capturer un utilisateur ou une page périmés.
  const contextRef = useRef({ pathname, user })
  contextRef.current = { pathname, user }

  const lastRef = useRef<{ key: string; at: number } | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const record = (kind: 'download' | 'view', fileName: string) => {
      const name = fileName.trim()
      if (!name) return

      const now = Date.now()
      const last = lastRef.current
      if (last && last.key === `${kind}:${name}` && now - last.at < DEDUPE_WINDOW_MS) return
      lastRef.current = { key: `${kind}:${name}`, at: now }

      const { pathname: currentPath, user: currentUser } = contextRef.current
      const moduleDef = currentPath ? moduleForPath(currentPath) : null

      logAdminAction({
        adminId: currentUser?.uid || 'inconnu',
        adminName: currentUser?.displayName?.trim() || currentUser?.email || 'Administrateur',
        adminEmail: currentUser?.email || undefined,
        action: kind === 'download' ? 'export' : 'view',
        module: moduleDef?.key || 'autre',
        moduleLabel: moduleDef?.label,
        targetType: 'fichier',
        targetId: name,
        description:
          kind === 'download'
            ? `Téléchargement du fichier « ${name} »`
            : `Consultation du document « ${name} »`,
        metadata: { fileName: name, page: currentPath || undefined },
      })
    }

    /**
     * Une ancre sert soit à télécharger (attribut `download`), soit à ouvrir le
     * document dans un onglet. Les deux comptent, avec une action distincte.
     */
    const recordAnchor = (anchor: HTMLAnchorElement) => {
      const download = anchor.getAttribute('download')?.trim()
      if (download) {
        record('download', download)
        return
      }
      const href = anchor.getAttribute('href')
      if (isStoredDocumentUrl(href)) record('view', fileNameFromUrl(href as string))
    }

    listeners += 1
    if (!installed) {
      const proto = HTMLAnchorElement.prototype
      installed = {
        click: proto.click,
        dispatchEvent: proto.dispatchEvent,
        windowOpen: window.open,
      }

      // `window.open` reste le chemin le plus répandu pour consulter un document
      // dans un nouvel onglet — une quarantaine d'appels dans l'admin.
      window.open = function patchedOpen(
        this: Window,
        url?: string | URL,
        target?: string,
        features?: string,
      ) {
        try {
          const href = typeof url === 'string' ? url : url?.toString()
          if (isStoredDocumentUrl(href)) record('view', fileNameFromUrl(href as string))
        } catch {
          /* la journalisation ne doit jamais empêcher l'ouverture */
        }
        return installed!.windowOpen.call(window, url as never, target as never, features as never)
      } as typeof window.open

      proto.click = function patchedClick(this: HTMLAnchorElement) {
        try {
          recordAnchor(this)
        } catch {
          // La journalisation ne doit jamais empêcher un téléchargement.
        }
        return installed!.click.call(this)
      }

      proto.dispatchEvent = function patchedDispatch(this: HTMLAnchorElement, event: Event) {
        try {
          if (event?.type === 'click') recordAnchor(this)
        } catch {
          /* idem */
        }
        return installed!.dispatchEvent.call(this, event)
      }
    }

    return () => {
      listeners -= 1
      if (listeners === 0 && installed) {
        HTMLAnchorElement.prototype.click = installed.click
        HTMLAnchorElement.prototype.dispatchEvent = installed.dispatchEvent
        window.open = installed.windowOpen
        installed = null
      }
    }
  }, [])
}
