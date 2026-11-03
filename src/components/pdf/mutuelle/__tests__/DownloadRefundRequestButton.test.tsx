import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { RefundRequestPdfData } from '../DemandeRemboursementPDF'
import { DownloadRefundRequestButton } from '../DownloadRefundRequestButton'
import { toast } from 'sonner'

const mocks = vi.hoisted(() => ({ pdf: vi.fn(), toBlob: vi.fn() }))
vi.mock('@react-pdf/renderer', () => ({ pdf: mocks.pdf }))
vi.mock('../DemandeRemboursementPDF', () => ({ default: () => null }))

const data: RefundRequestPdfData = {
  productLabel: 'Caisse Imprévue',
  type: 'EARLY',
  member: { lastName: 'MBOUMBA', firstName: 'Jeanne' },
  contract: { id: 'contrat-42' },
  request: { amount: 42_000 },
}

describe('téléchargement à la demande du PDF', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.pdf.mockReturnValue({ toBlob: mocks.toBlob })
    vi.stubGlobal('URL', class extends URL {
      static createObjectURL = vi.fn(() => 'blob:demande')
      static revokeObjectURL = vi.fn()
    })
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('prépare le bon document au clic et bloque les téléchargements simultanés', async () => {
    let resolveBlob!: (blob: Blob) => void
    mocks.toBlob.mockReturnValue(new Promise<Blob>((resolve) => { resolveBlob = resolve }))
    render(<DownloadRefundRequestButton data={data} fileName="demande-contrat-42.pdf" />)
    expect(mocks.pdf).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button'))
    expect(screen.getByRole('button', { name: /Préparation du document/ })).toBeDisabled()
    await waitFor(() => expect(mocks.pdf).toHaveBeenCalledTimes(1))
    expect(mocks.pdf.mock.calls[0][0].props.data).toEqual(data)

    const download = vi.spyOn(HTMLAnchorElement.prototype, 'click')
    await act(async () => resolveBlob(new Blob(['document'], { type: 'application/pdf' })))
    await waitFor(() => expect(screen.getByRole('button')).toBeEnabled())
    expect(download).toHaveBeenCalledTimes(1)
    expect(download.mock.instances[0]).toHaveAttribute('download', 'demande-contrat-42.pdf')
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:demande')
  })

  it('affiche une erreur et permet de réessayer après un échec de génération', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    mocks.toBlob.mockRejectedValueOnce(new Error('PDF indisponible')).mockResolvedValueOnce(new Blob(['document']))
    render(<DownloadRefundRequestButton data={data} fileName="demande.pdf" />)
    fireEvent.click(screen.getByRole('button'))
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Impossible de générer la demande de remboursement'))
    expect(screen.getByRole('button')).toBeEnabled()
    fireEvent.click(screen.getByRole('button'))
    await waitFor(() => expect(HTMLAnchorElement.prototype.click).toHaveBeenCalledTimes(1))
  })
})
