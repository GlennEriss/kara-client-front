export const TOOLS_KEY = 'kara.mobile.tools.v1'
export const MAX_TOOL_FILE_BYTES = 20 * 1024 * 1024
export interface ToolCapabilities { amounts: boolean; documents: boolean; exports: boolean }
export interface ToolMarker { capabilities: ToolCapabilities; version: 1; sessionId: string; uid: string; dark: boolean; reduceMotion: boolean }
export interface ToolSession {
  capabilities: ToolCapabilities;
  version: 1; sessionId: string; uid: string; customToken: string; path: string; exchangeBefore: number
  dark: boolean; reduceMotion: boolean
}
export function readToolMarker(): ToolMarker | null {
  if (typeof window === 'undefined' || !window.ReactNativeWebView) return null
  try {
    const value = JSON.parse(sessionStorage.getItem(TOOLS_KEY) ?? 'null')
    return value?.version === 1 && /^[a-f0-9]{48}$/.test(value.sessionId) && typeof value.uid === 'string' &&
      ['amounts', 'documents', 'exports'].every(key => typeof value.capabilities?.[key] === 'boolean') ? value : null
  } catch { return null }
}
export function postToolMessage(message: Record<string, unknown>) {
  window.ReactNativeWebView?.postMessage(JSON.stringify(message))
}
declare global {
  interface Window {
    ReactNativeWebView?: { postMessage: (data: string) => void }
    KaraMobileStart?: (session: ToolSession) => Promise<void>
    KaraMobileAppearance?: (appearance: { dark: boolean; reduceMotion: boolean }) => void
    KaraMobileLogout?: () => Promise<void>
    KaraMobileDownload?: (url: string) => void
  }
}
