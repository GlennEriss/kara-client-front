'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'

/** Garde la place du contenu, puis le monte quand il approche de la zone visible. */
export function DeferredRender({ children, fallback }: { children: ReactNode; fallback: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    if (visible) return
    if (typeof IntersectionObserver === 'undefined') { setVisible(true); return }
    const observer = new IntersectionObserver((entries) => {
      if (entries.some(entry => entry.isIntersecting)) { setVisible(true); observer.disconnect() }
    }, { rootMargin: '200px' })
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [visible])
  return <div ref={ref}>{visible ? children : fallback}</div>
}
