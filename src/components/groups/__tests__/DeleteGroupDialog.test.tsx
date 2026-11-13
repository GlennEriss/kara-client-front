import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { DeleteGroupDialog } from '../DeleteGroupDialog'
import type { Group } from '@/types/types'
afterEach(() => vi.unstubAllGlobals())
describe('confirmation de suppression d’un groupe', () => {
  it('attend l’identifiant exact et affiche le périmètre de suppression', async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ ok: true }))
    vi.stubGlobal('fetch', fetchMock)
    const deleted = vi.fn()
    render(<DeleteGroupDialog group={{ id: 'g1', name: 'Groupe exemple' } as Group} onClose={vi.fn()} onDeleted={deleted} />)
    const remove = screen.getByRole('button', { name: 'Supprimer définitivement' })
    expect(remove).toBeDisabled()
    expect(screen.getByText(/Les contrats de caisse et de crédit restent/)).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Identifiant du groupe à supprimer'), { target: { value: 'g1' } })
    fireEvent.click(remove)
    await waitFor(() => expect(deleted).toHaveBeenCalledOnce())
    expect(fetchMock).toHaveBeenCalledWith('/api/groups/g1/deletion', expect.objectContaining({ method: 'DELETE', body: JSON.stringify({ confirmationId: 'g1' }) }))
  })
})
