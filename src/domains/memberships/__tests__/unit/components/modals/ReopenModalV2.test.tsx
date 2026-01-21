/**
 * Tests unitaires pour ReopenModalV2
 * 
 * Tests le rendu, la validation, et les interactions
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { ReopenModalV2 } from '../../../../components/modals/ReopenModalV2'

// Mock des composants UI (même pattern que RejectModalV2)
vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open, onOpenChange }: any) => (
    open ? <div data-testid="dialog" onClick={() => onOpenChange(false)}>{children}</div> : null
  ),
  DialogContent: ({ children, className, ...props }: any) => (
    <div data-testid="dialog-content" className={className} {...props}>{children}</div>
  ),
  DialogDescription: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  DialogFooter: ({ children }: any) => <div>{children}</div>,
  DialogHeader: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  DialogTitle: ({ children, ...props }: any) => <div {...props}>{children}</div>,
}))

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, ...props }: any) => (
    <button onClick={onClick} disabled={disabled} {...props}>{children}</button>
  ),
}))

vi.mock('@/components/ui/label', () => ({
  Label: ({ children, htmlFor, ...props }: any) => <label htmlFor={htmlFor} {...props}>{children}</label>,
}))

vi.mock('@/components/ui/textarea', () => ({
  Textarea: ({ value, onChange, disabled, ...props }: any) => (
    <textarea value={value} onChange={onChange} disabled={disabled} {...props} />
  ),
}))

describe('ReopenModalV2', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onConfirm: vi.fn().mockResolvedValue(undefined),
    requestId: 'req-123',
    memberName: 'Jean Dupont',
    matricule: 'MK-2024-001234',
    previousRejectReason: 'Documents incomplets',
    isLoading: false,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('devrait rendre le modal avec les informations du membre et le motif de rejet initial', () => {
    render(<ReopenModalV2 {...defaultProps} />)
    
    expect(screen.getByTestId('reopen-modal')).toBeInTheDocument()
    expect(screen.getByTestId('reopen-modal-member-name')).toHaveTextContent('Jean Dupont')
    expect(screen.getByTestId('reopen-modal-matricule')).toHaveTextContent('MK-2024-001234')
    expect(screen.getByTestId('reopen-modal-previous-reject-reason')).toHaveTextContent('Documents incomplets')
  })

  it('devrait ne pas rendre le modal si isOpen est false', () => {
    render(<ReopenModalV2 {...defaultProps} isOpen={false} />)
    
    expect(screen.queryByTestId('reopen-modal')).not.toBeInTheDocument()
  })

  it('devrait valider la longueur minimale du motif (minimum 10 caractères)', () => {
    render(<ReopenModalV2 {...defaultProps} />)
    
    const input = screen.getByTestId('reopen-modal-reason-input')
    fireEvent.change(input, { target: { value: 'Court' } })
    
    expect(screen.getByTestId('reopen-modal-submit-button')).toBeDisabled()
  })

  it('devrait activer le bouton de soumission quand le motif est valide', () => {
    render(<ReopenModalV2 {...defaultProps} />)
    
    const input = screen.getByTestId('reopen-modal-reason-input')
    fireEvent.change(input, { target: { value: 'Nouvelle information disponible. Le dossier nécessite un réexamen.' } })
    
    expect(screen.getByTestId('reopen-modal-submit-button')).not.toBeDisabled()
  })

  it('devrait afficher le compteur de caractères', () => {
    render(<ReopenModalV2 {...defaultProps} />)
    
    const input = screen.getByTestId('reopen-modal-reason-input')
    fireEvent.change(input, { target: { value: 'Nouvelle information disponible' } })
    
    const counter = screen.getByTestId('reopen-modal-reason-counter')
    expect(counter.textContent).toBeTruthy()
  })

  it('devrait appeler onConfirm avec le motif valide', async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined)
    render(<ReopenModalV2 {...defaultProps} onConfirm={onConfirm} />)
    
    const input = screen.getByTestId('reopen-modal-reason-input')
    fireEvent.change(input, { target: { value: 'Nouvelle information disponible. Le dossier nécessite un réexamen.' } })
    
    const submitButton = screen.getByTestId('reopen-modal-submit-button')
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(onConfirm).toHaveBeenCalledWith('Nouvelle information disponible. Le dossier nécessite un réexamen.')
    })
  })

  it('devrait afficher l\'état de chargement pendant la soumission', () => {
    render(<ReopenModalV2 {...defaultProps} isLoading={true} />)
    
    expect(screen.getByTestId('reopen-modal-loading')).toBeInTheDocument()
    expect(screen.getByTestId('reopen-modal-submit-button')).toBeDisabled()
  })

  it('devrait appeler onClose quand on clique sur Annuler', () => {
    const onClose = vi.fn()
    render(<ReopenModalV2 {...defaultProps} onClose={onClose} />)
    
    const cancelButton = screen.getByTestId('reopen-modal-cancel-button')
    fireEvent.click(cancelButton)
    
    expect(onClose).toHaveBeenCalled()
  })

  it('devrait désactiver le champ de saisie pendant le chargement', () => {
    render(<ReopenModalV2 {...defaultProps} isLoading={true} />)
    
    const input = screen.getByTestId('reopen-modal-reason-input')
    expect(input).toBeDisabled()
  })

  it('devrait désactiver le bouton Annuler pendant le chargement', () => {
    render(<ReopenModalV2 {...defaultProps} isLoading={true} />)
    
    const cancelButton = screen.getByTestId('reopen-modal-cancel-button')
    expect(cancelButton).toBeDisabled()
  })
})
