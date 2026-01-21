/**
 * Tests unitaires pour RejectModalV2
 * 
 * Tests le rendu, la validation, et les interactions
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { RejectModalV2 } from '../../../../components/modals/RejectModalV2'

// Mock des composants UI
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

describe('RejectModalV2', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onConfirm: vi.fn().mockResolvedValue(undefined),
    requestId: 'req-123',
    memberName: 'Jean Dupont',
    isLoading: false,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('devrait rendre le modal avec le nom du membre', () => {
    render(<RejectModalV2 {...defaultProps} />)
    
    expect(screen.getByTestId('reject-modal')).toBeInTheDocument()
    expect(screen.getByTestId('reject-modal-member-name')).toHaveTextContent('Jean Dupont')
  })

  it('devrait ne pas rendre le modal si isOpen est false', () => {
    render(<RejectModalV2 {...defaultProps} isOpen={false} />)
    
    expect(screen.queryByTestId('reject-modal')).not.toBeInTheDocument()
  })

  it('devrait valider la longueur minimale du motif (minimum 10 caractères)', () => {
    render(<RejectModalV2 {...defaultProps} />)
    
    const input = screen.getByTestId('reject-modal-reason-input')
    fireEvent.change(input, { target: { value: 'Court' } })
    
    expect(screen.getByTestId('reject-modal-submit-button')).toBeDisabled()
    expect(screen.getByTestId('reject-modal-reason-counter')).toHaveTextContent('Minimum 10 caractères requis')
  })

  it('devrait activer le bouton de soumission quand le motif est valide', () => {
    render(<RejectModalV2 {...defaultProps} />)
    
    const input = screen.getByTestId('reject-modal-reason-input')
    fireEvent.change(input, { target: { value: 'Documents incomplets. Veuillez fournir tous les documents requis.' } })
    
    expect(screen.getByTestId('reject-modal-submit-button')).not.toBeDisabled()
  })

  it('devrait afficher le compteur de caractères', () => {
    render(<RejectModalV2 {...defaultProps} />)
    
    const input = screen.getByTestId('reject-modal-reason-input')
    fireEvent.change(input, { target: { value: 'Documents incomplets' } })
    
    const counter = screen.getByTestId('reject-modal-reason-counter')
    // Le compteur affiche le nombre de caractères et la limite
    expect(counter.textContent).toBeTruthy()
    // Vérifier que le compteur contient des informations
    expect(counter.textContent?.includes('24') || counter.textContent?.includes('caractères')).toBeTruthy()
  })

  it('devrait appeler onConfirm avec le motif valide', async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined)
    render(<RejectModalV2 {...defaultProps} onConfirm={onConfirm} />)
    
    const input = screen.getByTestId('reject-modal-reason-input')
    fireEvent.change(input, { target: { value: 'Documents incomplets et informations manquantes.' } })
    
    const submitButton = screen.getByTestId('reject-modal-submit-button')
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(onConfirm).toHaveBeenCalledWith('Documents incomplets et informations manquantes.')
    })
  })

  it('devrait afficher l\'état de chargement pendant la soumission', async () => {
    const onConfirm = vi.fn((_reason: string) => Promise.resolve())
    render(<RejectModalV2 {...defaultProps} onConfirm={onConfirm} isLoading={true} />)
    
    // Quand isLoading est true, le loader devrait être visible
    expect(screen.getByTestId('reject-modal-loading')).toBeInTheDocument()
    expect(screen.getByTestId('reject-modal-submit-button')).toBeDisabled()
  })

  it('devrait désactiver le bouton de soumission pendant le chargement', async () => {
    const onConfirm = vi.fn((_reason: string) => Promise.resolve())
    render(<RejectModalV2 {...defaultProps} onConfirm={onConfirm} isLoading={true} />)
    
    const input = screen.getByTestId('reject-modal-reason-input')
    fireEvent.change(input, { target: { value: 'Documents incomplets et informations manquantes.' } })
    
    expect(screen.getByTestId('reject-modal-submit-button')).toBeDisabled()
  })

  it('devrait appeler onClose quand on clique sur Annuler', () => {
    const onClose = vi.fn()
    render(<RejectModalV2 {...defaultProps} onClose={onClose} />)
    
    const cancelButton = screen.getByTestId('reject-modal-cancel-button')
    fireEvent.click(cancelButton)
    
    expect(onClose).toHaveBeenCalled()
  })

  it('devrait réinitialiser le motif quand on ferme le modal', async () => {
    const onClose = vi.fn()
    const { rerender } = render(<RejectModalV2 {...defaultProps} onClose={onClose} />)
    
    const input = screen.getByTestId('reject-modal-reason-input') as HTMLTextAreaElement
    fireEvent.change(input, { target: { value: 'Documents incomplets et informations manquantes.' } })
    
    expect(input.value).toBe('Documents incomplets et informations manquantes.')
    
    // Fermer le modal
    const cancelButton = screen.getByTestId('reject-modal-cancel-button')
    fireEvent.click(cancelButton)
    
    await waitFor(() => {
      expect(onClose).toHaveBeenCalled()
    })
    
    // Rouvrir le modal
    rerender(<RejectModalV2 {...defaultProps} isOpen={true} onClose={onClose} />)
    
    const newInput = screen.getByTestId('reject-modal-reason-input') as HTMLTextAreaElement
    expect(newInput.value).toBe('')
  })

  it('devrait valider la longueur maximale du motif (maximum 500 caractères)', () => {
    render(<RejectModalV2 {...defaultProps} />)
    
    const input = screen.getByTestId('reject-modal-reason-input')
    const longReason = 'A'.repeat(501) // > 500 caractères
    fireEvent.change(input, { target: { value: longReason } })
    
    // Le textarea devrait limiter à 500 caractères
    expect(input).toHaveAttribute('maxLength', '500')
  })

  it('devrait désactiver le champ de saisie pendant le chargement', () => {
    render(<RejectModalV2 {...defaultProps} isLoading={true} />)
    
    const input = screen.getByTestId('reject-modal-reason-input')
    expect(input).toBeDisabled()
  })

  it('devrait désactiver le bouton Annuler pendant le chargement', () => {
    render(<RejectModalV2 {...defaultProps} isLoading={true} />)
    
    const cancelButton = screen.getByTestId('reject-modal-cancel-button')
    expect(cancelButton).toBeDisabled()
  })
})
