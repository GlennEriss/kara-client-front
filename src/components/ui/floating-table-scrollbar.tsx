'use client'

import * as React from 'react'
import { createPortal } from 'react-dom'
import { ArrowLeftRight } from 'lucide-react'

type Bounds = { top: number; bottom: number; left: number; right: number }
type Layout = {
  visible: boolean
  left: number
  top: number
  width: number
  maximum: number
  position: number
  ratio: number
}
const EMPTY: Layout = {
  visible: false,
  left: 0,
  top: 0,
  width: 0,
  maximum: 0,
  position: 0,
  ratio: 1,
}

export function floatingScrollbarLayout(
  rect: Bounds,
  viewport: Bounds,
  clientWidth: number,
  scrollWidth: number,
  scrollLeft: number,
): Layout {
  const left = Math.max(rect.left, viewport.left + 8)
  const right = Math.min(rect.right, viewport.right - 8)
  const maximum = Math.max(0, scrollWidth - clientWidth)
  return {
    visible:
      maximum > 1 &&
      right - left >= 120 &&
      viewport.bottom - viewport.top >= 100 &&
      rect.top < viewport.bottom - 80 &&
      rect.bottom > viewport.bottom - 16,
    left,
    top: viewport.bottom - 40,
    width: Math.max(0, right - left),
    maximum,
    position: Math.min(maximum, Math.max(0, scrollLeft)),
    ratio: scrollWidth > 0 ? clientWidth / scrollWidth : 1,
  }
}

/** A real, always visible horizontal control while the native bottom scrollbar
 * is below the visible portion of a long table. It also follows scrollable
 * sheets/dialogs, rather than attaching itself outside their viewport. */
export function FloatingTableScrollbar({
  containerRef,
  tableId,
}: {
  containerRef: React.RefObject<HTMLDivElement | null>
  tableId: string
}) {
  const [layout, setLayout] = React.useState<Layout>(EMPTY)
  const [portalHost, setPortalHost] = React.useState<HTMLElement | null>(null)
  const track = React.useRef<HTMLDivElement>(null)
  const drag = React.useRef<{
    x: number
    position: number
    travel: number
    maximum: number
  } | null>(null)

  React.useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const host = container.closest<HTMLElement>('[role="dialog"]') || document.body
    setPortalHost(host)
    const clipping: { element: HTMLElement; x: boolean; y: boolean }[] = []
    for (let parent = container.parentElement; parent; parent = parent.parentElement) {
      const style = getComputedStyle(parent)
      const x = /auto|scroll|hidden|clip/.test(style.overflowX || style.overflow)
      const y = /auto|scroll|hidden|clip/.test(style.overflowY || style.overflow)
      if (x || y) clipping.push({ element: parent, x, y })
    }
    let frame = 0
    const measure = () => {
      frame = 0
      const visual = window.visualViewport
      const viewport: Bounds = {
        top: visual?.offsetTop || 0,
        left: visual?.offsetLeft || 0,
        bottom: (visual?.offsetTop || 0) + (visual?.height || window.innerHeight),
        right: (visual?.offsetLeft || 0) + (visual?.width || window.innerWidth),
      }
      for (const ancestor of clipping) {
        const rect = ancestor.element.getBoundingClientRect()
        if (ancestor.x) {
          viewport.left = Math.max(viewport.left, rect.left)
          viewport.right = Math.min(viewport.right, rect.right)
        }
        if (ancestor.y) {
          viewport.top = Math.max(viewport.top, rect.top)
          viewport.bottom = Math.min(viewport.bottom, rect.bottom)
        }
      }
      const next = floatingScrollbarLayout(
        container.getBoundingClientRect(),
        viewport,
        container.clientWidth,
        container.scrollWidth,
        container.scrollLeft,
      )
      if (host !== document.body) {
        const origin = host.getBoundingClientRect()
        next.left -= origin.left
        next.top -= origin.top
      }
      setLayout((current) =>
        Object.keys(next).every((key) => current[key as keyof Layout] === next[key as keyof Layout])
          ? current
          : next,
      )
    }
    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(measure)
    }
    measure()
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(schedule)
    observer?.observe(container)
    const table = container.querySelector('table')
    if (table) observer?.observe(table)
    clipping.forEach(({ element }) => observer?.observe(element))
    window.addEventListener('scroll', schedule, { capture: true, passive: true })
    window.addEventListener('resize', schedule)
    window.visualViewport?.addEventListener('resize', schedule)
    window.visualViewport?.addEventListener('scroll', schedule)
    return () => {
      observer?.disconnect()
      window.removeEventListener('scroll', schedule, true)
      window.removeEventListener('resize', schedule)
      window.visualViewport?.removeEventListener('resize', schedule)
      window.visualViewport?.removeEventListener('scroll', schedule)
      if (frame) window.cancelAnimationFrame(frame)
    }
  }, [containerRef])

  const scrollTo = (position: number) => {
    const container = containerRef.current
    if (!container) return
    container.scrollLeft = Math.max(0, Math.min(layout.maximum, position))
    setLayout((current) => ({ ...current, position: container.scrollLeft }))
  }
  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const position = containerRef.current?.scrollLeft || 0
    const page = (containerRef.current?.clientWidth || 0) * 0.9
    const target: Record<string, number> = {
      ArrowLeft: position - 48,
      ArrowRight: position + 48,
      PageUp: position - page,
      PageDown: position + page,
      Home: 0,
      End: layout.maximum,
    }
    if (event.key in target) {
      event.preventDefault()
      scrollTo(target[event.key])
    }
  }
  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return
    const rect = event.currentTarget.getBoundingClientRect()
    const thumbWidth = Math.max(32, rect.width * layout.ratio)
    const travel = Math.max(1, rect.width - thumbWidth)
    const thumbLeft = layout.maximum ? (layout.position / layout.maximum) * travel : 0
    const x = event.clientX - rect.left
    if (x < thumbLeft || x > thumbLeft + thumbWidth)
      scrollTo(((x - thumbWidth / 2) / travel) * layout.maximum)
    drag.current = {
      x: event.clientX,
      position: containerRef.current?.scrollLeft || 0,
      travel,
      maximum: layout.maximum,
    }
    event.currentTarget.setPointerCapture(event.pointerId)
    event.currentTarget.focus({ preventScroll: true })
    event.preventDefault()
  }

  if (!layout.visible || !portalHost) return null
  const percentage = layout.maximum ? layout.position / layout.maximum : 0
  // translateX uses the thumb's own width: pairing left % with -translate %
  // keeps its right edge within the track even when the minimum width applies.
  return createPortal(
    <div
      data-slot="floating-table-scrollbar"
      className={`flex h-8 items-center gap-2 rounded-lg border border-[#234D65]/20 bg-white/95 px-3 shadow-lg backdrop-blur-sm animate-in fade-in duration-150 motion-reduce:animate-none ${portalHost === document.body ? 'fixed z-40' : 'absolute z-[60]'}`}
      style={{ left: layout.left, top: layout.top, width: layout.width }}
    >
      <ArrowLeftRight aria-hidden="true" className="h-4 w-4 shrink-0 text-[#234D65]" />
      <div
        ref={track}
        role="scrollbar"
        tabIndex={0}
        aria-label="Défilement horizontal du tableau, toujours accessible"
        aria-controls={tableId}
        aria-orientation="horizontal"
        aria-valuemin={0}
        aria-valuemax={Math.round(layout.maximum)}
        aria-valuenow={Math.round(layout.position)}
        className="relative h-6 min-w-0 flex-1 cursor-pointer touch-none rounded outline-none focus-visible:ring-2 focus-visible:ring-[#234D65] focus-visible:ring-offset-1"
        onKeyDown={onKeyDown}
        onPointerDown={onPointerDown}
        onPointerMove={(event) => {
          if (drag.current)
            scrollTo(
              drag.current.position +
                ((event.clientX - drag.current.x) / drag.current.travel) * drag.current.maximum,
            )
        }}
        onPointerUp={(event) => {
          drag.current = null
          if (event.currentTarget.hasPointerCapture(event.pointerId))
            event.currentTarget.releasePointerCapture(event.pointerId)
        }}
        onPointerCancel={() => {
          drag.current = null
        }}
        onLostPointerCapture={() => {
          drag.current = null
        }}
      >
        <div aria-hidden="true" className="absolute inset-x-0 top-2 h-2 rounded-full bg-gray-200" />
        <div
          aria-hidden="true"
          data-slot="floating-scrollbar-thumb"
          className="pointer-events-none absolute top-1.5 h-3 min-w-8 rounded-full bg-[#234D65]"
          style={{
            width: `${layout.ratio * 100}%`,
            left: `${percentage * 100}%`,
            transform: `translateX(-${percentage * 100}%)`,
          }}
        />
      </div>
    </div>,
    portalHost,
  )
}
