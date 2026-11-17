'use client'

import { useEffect, useState } from 'react'
import { postToolMessage, type ToolSession } from '@/domains/mobile/browser/tools-protocol'
import { bootstrapToolsSession } from '@/domains/mobile/browser/bootstrap-session'

export default function MobileToolsBootstrap() {
  const [error, setError] = useState('')
  useEffect(() => {
    if (!window.ReactNativeWebView) { setError('Ouvrez cet outil depuis l’application LE KARA.'); return }
    let active = true
    let starting = false
    window.KaraMobileStart = async (session: ToolSession) => {
      if (starting || !active) return
      starting = true
      try {
        await bootstrapToolsSession(session, url => window.location.replace(url), () => active)
      } catch {
        if (active) {
          setError('Impossible d’ouvrir votre session. Fermez cet écran et réessayez.')
          postToolMessage({ type: 'kara.tools.error', sessionId: session.sessionId, message: 'Impossible d’ouvrir votre session. Réessayez.' })
        }
        starting = false
      }
    }
    postToolMessage({ type: 'kara.tools.ready', version: 1 })
    return () => { active = false; delete window.KaraMobileStart }
  }, [])
  return <main className="flex min-h-dvh items-center justify-center bg-[#F5F7F9] p-6 text-center text-[#234D65]">
    <div role={error ? 'alert' : 'status'}><h1 className="mb-3 text-xl font-bold">LE KARA</h1>
      <p>{error || 'Ouverture sécurisée de vos outils…'}</p></div>
  </main>
}
