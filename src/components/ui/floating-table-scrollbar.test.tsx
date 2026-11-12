import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { Table } from './table'
import { floatingScrollbarLayout } from './floating-table-scrollbar'

const viewport = { top: 0, bottom: 800, left: 0, right: 1200 }
let bounds = { top: -200, bottom: 1600, left: 100, right: 500 }
let width = 1200
let frames: FrameRequestCallback[] = []
const disconnect = vi.fn()
beforeEach(() => {
  bounds = { top: -200, bottom: 1600, left: 100, right: 500 }
  width = 1200
  frames = []
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      disconnect = disconnect
    },
  )
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
    frames.push(callback)
    return frames.length
  })
  vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {})
  vi.spyOn(Element.prototype, 'clientWidth', 'get').mockImplementation(function (this: Element) {
    return this.getAttribute('data-slot') === 'table-container' ? 400 : 0
  })
  vi.spyOn(Element.prototype, 'scrollWidth', 'get').mockImplementation(function (this: Element) {
    return this.getAttribute('data-slot') === 'table-container' ? width : 0
  })
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
    const rect =
      this.getAttribute('role') === 'dialog'
        ? { left: 50, right: 600, top: 100, bottom: 700 }
        : bounds
    return {
      ...rect,
      x: rect.left,
      y: rect.top,
      height: rect.bottom - rect.top,
      width: rect.right - rect.left,
      toJSON: () => rect,
    }
  })
})
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})
const flush = () =>
  act(() => {
    const pending = frames.splice(0)
    pending.forEach((callback) => callback(0))
  })
const example = (
  <Table topScroll floatingScroll>
    <thead>
      <tr>
        <th>Membre</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Alice</td>
      </tr>
    </tbody>
  </Table>
)

describe('barre horizontale flottante', () => {
  it('apparaît seulement pour un tableau large dont le bas reste hors de la zone visible', () => {
    expect(floatingScrollbarLayout(bounds, viewport, 400, 1200, 0).visible).toBe(true)
    expect(floatingScrollbarLayout(bounds, viewport, 400, 400, 0).visible).toBe(false)
    expect(floatingScrollbarLayout({ ...bounds, top: 900 }, viewport, 400, 1200, 0).visible).toBe(
      false,
    )
    expect(
      floatingScrollbarLayout({ ...bounds, bottom: 700 }, viewport, 400, 1200, 0).visible,
    ).toBe(false)
  })
  it('se limite à la largeur visible du tableau et conserve une position valide', () => {
    expect(
      floatingScrollbarLayout({ ...bounds, left: -100, right: 1300 }, viewport, 400, 1200, 9999),
    ).toMatchObject({ left: 8, width: 1184, position: 800, maximum: 800, top: 760 })
  })
  it('pilote le tableau au clavier et reste synchronisée avec la barre du haut', () => {
    const view = render(example)
    const scrollbar = screen.getByRole('scrollbar')
    const container = view.container.querySelector<HTMLElement>('[data-slot="table-container"]')!
    const top = screen.getByRole('region', { name: 'Défilement horizontal du tableau' })
    expect(scrollbar).toHaveAttribute('aria-controls', view.container.querySelector('table')!.id)
    fireEvent.keyDown(scrollbar, { key: 'ArrowRight' })
    expect(container.scrollLeft).toBe(48)
    fireEvent.scroll(container)
    flush()
    expect(top.scrollLeft).toBe(48)
    fireEvent.scroll(top, { target: { scrollLeft: 300 } })
    flush()
    expect(container.scrollLeft).toBe(300)
    expect(scrollbar).toHaveAttribute('aria-valuenow', '300')
    fireEvent.keyDown(scrollbar, { key: 'End' })
    expect(container.scrollLeft).toBe(800)
    fireEvent.keyDown(scrollbar, { key: 'Home' })
    expect(container.scrollLeft).toBe(0)
  })
  it('disparaît quand le bas devient visible ou qu’un redimensionnement supprime le débordement', () => {
    render(example)
    expect(screen.getByRole('scrollbar')).toBeInTheDocument()
    bounds = { ...bounds, bottom: 500 }
    fireEvent.scroll(window)
    flush()
    expect(screen.queryByRole('scrollbar')).not.toBeInTheDocument()
    bounds = { ...bounds, bottom: 1600 }
    width = 400
    fireEvent.resize(window)
    flush()
    expect(screen.queryByRole('scrollbar')).not.toBeInTheDocument()
  })
  it('reste dans la modale et respecte sa zone de lecture, pour le focus et le défilement', () => {
    render(
      <div role="dialog" style={{ position: 'fixed', overflow: 'hidden' }}>
        {example}
      </div>,
    )
    const dialog = screen.getByRole('dialog')
    const control = screen.getByRole('scrollbar')
    expect(dialog.contains(control)).toBe(true)
    expect(control.parentElement).toHaveStyle({ top: '560px', left: '50px' })
  })
})
