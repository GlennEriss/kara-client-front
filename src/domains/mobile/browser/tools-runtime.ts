import { signOut } from 'firebase/auth'
import { auth } from '@/firebase/auth'
import { MAX_TOOL_FILE_BYTES, TOOLS_KEY, postToolMessage, readToolMarker } from './tools-protocol'

const MIME: Record<string, string> = { pdf: 'application/pdf', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  xls: 'application/vnd.ms-excel', csv: 'text/csv', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg' }
const CSS = `
html[data-kara-mobile] { overscroll-behavior: none; color-scheme: light; }
html[data-kara-mobile] [data-kara-tool-tabs] { overflow-x: auto; padding-inline: 12px; }
html[data-kara-mobile] [data-kara-tool-tabs] [role=tablist] { width: max-content; }
html[data-kara-mobile] [role=dialog] { max-width: calc(100vw - 20px); }
html[data-kara-mobile] [role=switch][data-state=checked],html[data-kara-mobile] [role=checkbox][data-state=checked] { background-color:#234D65 !important; color:white !important; }
html[data-kara-mobile][data-kara-theme=dark] { color-scheme:dark; background:#0D1720; color:#E7F0F5; }
html[data-kara-mobile][data-kara-theme=dark] [class~="bg-white"],html[data-kara-mobile][data-kara-theme=dark] [class~="bg-background"] { background-color:#172630 !important; }
html[data-kara-mobile][data-kara-theme=dark] [class~="bg-gray-50"],html[data-kara-mobile][data-kara-theme=dark] [class~="bg-gray-100"] { background-color:#243D4C !important; }
html[data-kara-mobile][data-kara-theme=dark] :is([class~="text-gray-900"],[class~="text-gray-800"],[class~="text-gray-700"]) { color:#E7F0F5 !important; }
html[data-kara-mobile][data-kara-theme=dark] :is([class~="text-gray-600"],[class~="text-gray-500"],[class~="text-gray-400"]) { color:#A7B9C5 !important; }
html[data-kara-mobile][data-kara-theme=dark] :is([class~="border-gray-100"],[class~="border-gray-200"],[class~="border-gray-300"]) { border-color:#304651 !important; }
html[data-kara-mobile][data-kara-theme=dark] :is(input,textarea,select) { background:#0D1720; color:#E7F0F5; border-color:#304651; }
html[data-kara-mobile][data-kara-motion=reduce] *,html[data-kara-mobile][data-kara-motion=reduce] *::before,html[data-kara-mobile][data-kara-motion=reduce] *::after { animation-duration:0.01ms !important; transition-duration:0.01ms !important; scroll-behavior:auto !important; }
`
let installed = false
export function installToolsRuntime(): () => void {
  const marker = readToolMarker()
  if (!marker || installed) return () => {}
  installed = true
  const html = document.documentElement
  html.dataset.karaMobile = 'true'
  const style = document.createElement('style')
  style.textContent = CSS
  document.head.append(style)
  window.KaraMobileAppearance = ({ dark, reduceMotion }) => {
    html.dataset.karaTheme = dark ? 'dark' : 'light'
    html.dataset.karaMotion = reduceMotion ? 'reduce' : 'normal'
    const current = readToolMarker()
    if (current) sessionStorage.setItem(TOOLS_KEY, JSON.stringify({ ...current, dark, reduceMotion }))
  }
  window.KaraMobileAppearance(marker)
  window.KaraMobileLogout = async () => {
    sessionStorage.removeItem(TOOLS_KEY)
    try { await signOut(auth) } finally {
      try { await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' }) } catch { /* Le contexte de navigation est éphémère. */ }
      postToolMessage({ type: 'kara.tools.closed', sessionId: marker.sessionId })
    }
  }
  const sendError = () => postToolMessage({ type: 'kara.tools.error', sessionId: marker.sessionId,
    message: 'Le document ne peut pas être ouvert. Réessayez son téléchargement.' })
  const allowedFileUrl = (value: string) => {
    try {
      const url = new URL(value, window.location.origin)
      if (url.protocol === 'blob:') return url.origin === window.location.origin
      if (url.origin === window.location.origin) return true
      const bucket = auth.app.options.storageBucket
      return !!bucket && url.protocol === 'https:' && (
        url.hostname === 'firebasestorage.googleapis.com' && url.pathname.startsWith(`/v0/b/${bucket}/`) ||
        url.hostname === 'storage.googleapis.com' && url.pathname.startsWith(`/${bucket}/`))
    } catch { return false }
  }
  const sendFile = async (url: string, filename: string, action: 'preview' | 'share') => {
    try {
      if (!marker.capabilities.amounts || action === 'share' && !marker.capabilities.documents && !marker.capabilities.exports) throw new Error('Accès au document refusé')
      if (!allowedFileUrl(url)) throw new Error('Origine interdite')
      const response = await fetch(url, { credentials: new URL(url, location.origin).origin === location.origin ? 'same-origin' : 'omit' })
      if (!response.ok) throw new Error('Document inaccessible')
      const blob = await response.blob()
      if (!blob.size || blob.size > MAX_TOOL_FILE_BYTES) throw new Error('Document trop volumineux')
      const extension = filename.split('.').pop()?.toLowerCase() ?? ''
      const mime = MIME[extension] ?? blob.type.split(';')[0]
      if (!Object.values(MIME).includes(mime)) throw new Error('Format non pris en charge')
      const suffix = Object.entries(MIME).find(([, value]) => value === mime)?.[0] ?? 'pdf'
      const safeName = MIME[extension] ? filename : `${filename || 'document-LE-KARA'}.${suffix}`
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(String(reader.result).split(',')[1])
        reader.onerror = reject
        reader.readAsDataURL(blob)
      })
      postToolMessage({ type: 'kara.tools.file', sessionId: marker.sessionId, filename: safeName, mime, base64, action })
    } catch { sendError() }
  }
  window.KaraMobileDownload = url => { void sendFile(url, 'document-LE-KARA', 'share') }
  const interceptAnchor = (anchor: HTMLAnchorElement) => {
    const href = anchor.href
    if (href.startsWith('tel:') || /^https:\/\/(wa\.me|api\.whatsapp\.com)\//.test(href)) {
      postToolMessage({ type: 'kara.tools.external', sessionId: marker.sessionId, url: href })
      return true
    } else if ((anchor.hasAttribute('download') || href.startsWith('blob:')) && allowedFileUrl(href)) {
      void sendFile(href, anchor.download || 'document-LE-KARA', 'share')
      return true
    }
    return false
  }
  const click = (event: MouseEvent) => {
    const anchor = event.target instanceof Element ? event.target.closest('a') : null
    if (anchor && interceptAnchor(anchor)) {
      event.preventDefault()
      event.stopImmediatePropagation()
    }
  }
  document.addEventListener('click', click, true)
  // jsPDF/FileSaver déclenche un événement non bouillonnant sur un lien détaché.
  // Ces téléchargements ne passent jamais par l'écouteur du document.
  const originalClick = HTMLAnchorElement.prototype.click
  const originalDispatch = HTMLAnchorElement.prototype.dispatchEvent
  HTMLAnchorElement.prototype.click = function() {
    if (!interceptAnchor(this)) originalClick.call(this)
  }
  HTMLAnchorElement.prototype.dispatchEvent = function(event) {
    if (event.type === 'click' && interceptAnchor(this)) {
      event.preventDefault()
      return false
    }
    return originalDispatch.call(this, event)
  }
  const originalOpen = window.open
  window.open = function(url, target, features) {
    const value = url?.toString() ?? ''
    if (value.startsWith('blob:') && allowedFileUrl(value)) { void sendFile(value, 'document-LE-KARA', 'preview'); return null }
    if (value.startsWith('tel:') || /^https:\/\/(wa\.me|api\.whatsapp\.com)\//.test(value)) {
      postToolMessage({ type: 'kara.tools.external', sessionId: marker.sessionId, url: value }); return null
    }
    return originalOpen.call(window, url, target, features)
  }
  const seen = new Set<string>()
  const inspectFrames = () => document.querySelectorAll<HTMLIFrameElement>('iframe[src^="blob:"]').forEach(frame => {
    if (seen.has(frame.src) || !allowedFileUrl(frame.src)) return
    seen.add(frame.src)
    void sendFile(frame.src, 'recu-LE-KARA', 'preview')
  })
  const observer = new MutationObserver(inspectFrames)
  observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['src'] })
  inspectFrames()
  return () => {
    installed = false
    document.removeEventListener('click', click, true)
    HTMLAnchorElement.prototype.click = originalClick
    HTMLAnchorElement.prototype.dispatchEvent = originalDispatch
    observer.disconnect()
    window.open = originalOpen
    delete window.KaraMobileAppearance
    delete window.KaraMobileDownload
    delete window.KaraMobileLogout
    delete html.dataset.karaMobile
    delete html.dataset.karaTheme
    delete html.dataset.karaMotion
    style.remove()
  }
}
