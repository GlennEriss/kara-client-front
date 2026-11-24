import { fireEvent, render, screen } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { RefundFileInput } from '../RefundFileInput'

it('associe le justificatif et le PDF signé à deux sélecteurs natifs distincts', () => {
  const onProof = vi.fn(), onPdf = vi.fn()
  render(<>
    <label htmlFor="proof">Preuve du retrait</label>
    <RefundFileInput id="proof" accept="image/jpeg,image/png,image/webp" onChange={onProof} />
    <label htmlFor="signed">Demande signée</label>
    <RefundFileInput id="signed" accept="application/pdf" onChange={onPdf} />
  </>)
  const proof = screen.getByLabelText('Preuve du retrait')
  const signed = screen.getByLabelText('Demande signée')
  expect(proof).toHaveAttribute('accept', 'image/jpeg,image/png,image/webp')
  expect(signed).toHaveAttribute('accept', 'application/pdf')
  fireEvent.change(proof, { target: { files: [new File(['jpg'], 'preuve.jpg', { type: 'image/jpeg' })] } })
  expect(onProof).toHaveBeenCalledTimes(1)
  expect(onPdf).not.toHaveBeenCalled()
})
