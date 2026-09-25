import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook } from '@testing-library/react'

const logAdminAction = vi.fn()

vi.mock('@/services/audit/auditLog', () => ({
  logAdminAction: (entry: unknown) => logAdminAction(entry),
}))
vi.mock('@/domains/auth/hooks/useAuth', () => ({
  useAuth: () => ({ user: { uid: 'u1', email: 'admin@kara.ga', displayName: 'Admin LE KARA' } }),
}))
vi.mock('next/navigation', () => ({ usePathname: () => '/memberships' }))

import { isStoredDocumentUrl, useFileAccessAudit } from '../useFileAccessAudit'

/** Ancre équipée comme le font jsPDF, xlsx et `downloadFile`. */
function anchor(download?: string) {
  const a = document.createElement('a')
  a.href = 'blob:http://localhost/abc'
  if (download !== undefined) a.setAttribute('download', download)
  return a
}

describe('useFileAccessAudit', () => {
  beforeEach(() => logAdminAction.mockClear())
  afterEach(() => vi.useRealTimers())

  it('journalise un téléchargement déclenché par click() — cas xlsx', () => {
    const { unmount } = renderHook(() => useFileAccessAudit())
    anchor('journal_relances.xlsx').click()
    expect(logAdminAction).toHaveBeenCalledTimes(1)
    const entry = logAdminAction.mock.calls[0]![0] as Record<string, unknown>
    expect(entry.action).toBe('export')
    expect(entry.targetId).toBe('journal_relances.xlsx')
    expect(entry.description).toContain('journal_relances.xlsx')
    unmount()
  })

  it('journalise un téléchargement déclenché par dispatchEvent — cas jsPDF', () => {
    const { unmount } = renderHook(() => useFileAccessAudit())
    anchor('contrat.pdf').dispatchEvent(new MouseEvent('click'))
    expect(logAdminAction).toHaveBeenCalledTimes(1)
    expect((logAdminAction.mock.calls[0]![0] as any).targetId).toBe('contrat.pdf')
    unmount()
  })

  it('ignore une ancre de navigation ordinaire', () => {
    const { unmount } = renderHook(() => useFileAccessAudit())
    anchor().click()
    anchor('').click()
    expect(logAdminAction).not.toHaveBeenCalled()
    unmount()
  })

  it('ne compte qu\'une fois deux déclenchements rapprochés du même fichier', () => {
    const { unmount } = renderHook(() => useFileAccessAudit())
    const a = anchor('export.xlsx')
    a.click()
    a.dispatchEvent(new MouseEvent('click'))
    expect(logAdminAction).toHaveBeenCalledTimes(1)
    unmount()
  })

  it('rétablit les méthodes d\'origine au démontage', () => {
    const originalClick = HTMLAnchorElement.prototype.click
    const originalDispatch = HTMLAnchorElement.prototype.dispatchEvent
    const { unmount } = renderHook(() => useFileAccessAudit())
    expect(HTMLAnchorElement.prototype.click).not.toBe(originalClick)
    unmount()
    expect(HTMLAnchorElement.prototype.click).toBe(originalClick)
    expect(HTMLAnchorElement.prototype.dispatchEvent).toBe(originalDispatch)
  })

  it('journalise la consultation d\'un document stocké ouvert dans un onglet', () => {
    const { unmount } = renderHook(() => useFileAccessAudit())
    const a = document.createElement('a')
    a.href = 'https://firebasestorage.googleapis.com/v0/b/x/o/contrats%2Ffiche.pdf?alt=media&token=abc'
    a.target = '_blank'
    a.click()
    expect(logAdminAction).toHaveBeenCalledTimes(1)
    const entry = logAdminAction.mock.calls[0]![0] as any
    expect(entry.action).toBe('view')
    expect(entry.targetId).toBe('fiche.pdf')
    unmount()
  })

  it('journalise une consultation via window.open', () => {
    const { unmount } = renderHook(() => useFileAccessAudit())
    window.open('https://firebasestorage.googleapis.com/v0/b/x/o/piece.jpg?alt=media', '_blank')
    expect(logAdminAction).toHaveBeenCalledTimes(1)
    expect((logAdminAction.mock.calls[0]![0] as any).action).toBe('view')
    unmount()
  })

  it('ignore un document généré localement (blob) et la navigation interne', () => {
    const { unmount } = renderHook(() => useFileAccessAudit())
    window.open('blob:http://localhost/9f2', '_blank')
    window.open('about:blank', '_blank')
    window.open('https://wa.me/24177123456?text=bonjour', '_blank')
    expect(logAdminAction).not.toHaveBeenCalled()
    unmount()
  })

  it('n\'empêche pas le téléchargement si la journalisation échoue', () => {
    logAdminAction.mockImplementationOnce(() => { throw new Error('offline') })
    const { unmount } = renderHook(() => useFileAccessAudit())
    expect(() => anchor('rapport.pdf').click()).not.toThrow()
    unmount()
  })
})

describe('isStoredDocumentUrl', () => {
  it('reconnaît un document conservé', () => {
    expect(isStoredDocumentUrl('https://firebasestorage.googleapis.com/v0/b/x/o/a.pdf')).toBe(true)
    expect(isStoredDocumentUrl('/api/download?url=x&filename=a.pdf')).toBe(true)
  })

  it('écarte les documents générés et les liens externes', () => {
    expect(isStoredDocumentUrl('blob:http://localhost/9f2')).toBe(false)
    expect(isStoredDocumentUrl('data:application/pdf;base64,AAA')).toBe(false)
    expect(isStoredDocumentUrl('about:blank')).toBe(false)
    expect(isStoredDocumentUrl('https://wa.me/241')).toBe(false)
    expect(isStoredDocumentUrl(undefined)).toBe(false)
  })
})
