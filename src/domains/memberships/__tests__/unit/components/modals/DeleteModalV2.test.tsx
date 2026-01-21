/**
 * Tests unitaires pour DeleteModalV2
 * 
 * Tests le rendu, la validation du matricule, et les interactions
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { DeleteModalV2 } from '../../../../components/modals/DeleteModalV2'

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

vi.mock('@/components/ui/input', () => ({
  Input: ({ value, onChange, disabled, ...props }: any) => (
    <input value={value} onChange={onChange} disabled={disabled} {...props} />
  ),
}))

vi.mock('@/components/ui/alert', () => ({
  Alert: ({ children, variant, ...props }: any) => <div role="alert" data-variant={variant} {...props}>{children}</div>,
  AlertDescription: ({ children }: any) => <div>{children}</div>,
}))

describe('DeleteModalV2', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onConfirm: vi.fn().mockResolvedValue(undefined),
    requestId: 'req-123',
    memberName: 'Jean Dupont',
    matricule: 'MK-2024-001234',
    isLoading: false,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('devrait rendre le modal avec l\'avertissement et les informations du membre', () => {
    render(<DeleteModalV2 {...defaultProps} />)
    
    expect(screen.getByTestId('delete-modal')).toBeInTheDocument()
    expect(screen.getByTestId('delete-modal-warning')).toBeInTheDocument()
    expect(screen.getByTestId('delete-modal-member-name')).toHaveTextContent('Jean Dupont')
    expect(screen.getByTestId('delete-modal-matricule-display')).toHaveTextContent('MK-2024-001234')
  })

  it('devrait ne pas rendre le modal si isOpen est false', () => {
    render(<DeleteModalV2 {...defaultProps} isOpen={false} />)
    
    expect(screen.queryByTestId('delete-modal')).not.toBeInTheDocument()
  })

  it('devrait désactiver le bouton de soumission si le matricule ne correspond pas', () => {
    render(<DeleteModalV2 {...defaultProps} />)
    
    const input = screen.getByTestId('delete-modal-matricule-input')
    fireEvent.change(input, { target: { value: 'MK-2024-001235' } }) // Différent
    
    expect(screen.getByTestId('delete-modal-submit-button')).toBeDisabled()
  })

  it('devrait activer le bouton de soumission si le matricule correspond', () => {
    render(<DeleteModalV2 {...defaultProps} />)
    
    const input = screen.getByTestId('delete-modal-matricule-input')
    fireEvent.change(input, { target: { value: 'MK-2024-001234' } }) // Correspond
    
    expect(screen.getByTestId('delete-modal-submit-button')).not.toBeDisabled()
  })

  it('devrait afficher une erreur si le matricule saisi ne correspond pas', () => {
    render(<DeleteModalV2 {...defaultProps} />)
    
    const input = screen.getByTestId('delete-modal-matricule-input')
    fireEvent.change(input, { target: { value: 'MK-2024-001235' } })
    
    expect(screen.getByTestId('delete-modal-matricule-error')).toBeInTheDocument()
  })

  it('devrait appeler onConfirm avec le matricule confirmé', async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined)
    render(<DeleteModalV2 {...defaultProps} onConfirm={onConfirm} />)
    
    const input = screen.getByTestId('delete-modal-matricule-input')
    fireEvent.change(input, { target: { value: 'MK-2024-001234' } })
    
    const submitButton = screen.getByTestId('delete-modal-submit-button')
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(onConfirm).toHaveBeenCalledWith('MK-2024-001234')
    })
  })

  it('devrait afficher l\'état de chargement pendant la soumission', () => {
    render(<DeleteModalV2 {...defaultProps} isLoading={true} />)
    
    expect(screen.getByTestId('delete-modal-loading')).toBeInTheDocument()
    expect(screen.getByTestId('delete-modal-submit-button')).toBeDisabled()
  })

  it('devrait appeler onClose quand on clique sur Annuler', () => {
    const onClose = vi.fn()
    render(<DeleteModalV2 {...defaultProps} onClose={onClose} />)
    
    const cancelButton = screen.getByTestId('delete-modal-cancel-button')
    fireEvent.click(cancelButton)
    
    expect(onClose).toHaveBeenCalled()
  })

  it('devrait désactiver le champ de saisie pendant le chargement', () => {
    render(<DeleteModalV2 {...defaultProps} isLoading={true} />)
    
    const input = screen.getByTestId('delete-modal-matricule-input')
    expect(input).toBeDisabled()
  })

  it('devrait désactiver le bouton Annuler pendant le chargement', () => {
    render(<DeleteModalV2 {...defaultProps} isLoading={true} />)
    
    const cancelButton = screen.getByTestId('delete-modal-cancel-button')
    expect(cancelButton).toBeDisabled()
  })
})
