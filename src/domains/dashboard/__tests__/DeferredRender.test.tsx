import { act, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { DeferredRender } from '@/components/ui/deferred-render'

afterEach(() => vi.unstubAllGlobals())
describe('graphiques différés', () => {
  it('garde un emplacement puis affiche le contenu quand il devient visible', () => {
    let intersect!: IntersectionObserverCallback
    const disconnect = vi.fn()
    vi.stubGlobal('IntersectionObserver', class {
      constructor(callback: IntersectionObserverCallback) { intersect = callback }
      observe = vi.fn()
      disconnect = disconnect
    })
    render(<DeferredRender fallback={<div data-testid="placeholder" className="h-56" />}><div>Graphique des montants</div></DeferredRender>)
    expect(screen.getByTestId('placeholder')).toBeInTheDocument()
    expect(screen.queryByText('Graphique des montants')).not.toBeInTheDocument()
    act(() => intersect([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver))
    expect(screen.getByText('Graphique des montants')).toBeVisible()
    expect(screen.queryByTestId('placeholder')).not.toBeInTheDocument()
    expect(disconnect).toHaveBeenCalled()
  })
  it('affiche le contenu si le navigateur ne propose pas IntersectionObserver', () => {
    vi.stubGlobal('IntersectionObserver', undefined)
    render(<DeferredRender fallback="Chargement"><div>Graphique des montants</div></DeferredRender>)
    expect(screen.getByText('Graphique des montants')).toBeVisible()
  })
})
