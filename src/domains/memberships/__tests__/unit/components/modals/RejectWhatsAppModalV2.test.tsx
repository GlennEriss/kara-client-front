/**
 * Tests unitaires pour RejectWhatsAppModalV2
 * 
 * Tests le rendu, la sélection de numéro, l'édition du message, et l'ouverture WhatsApp
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { RejectWhatsAppModalV2 } from '../../../../components/modals/RejectWhatsAppModalV2'

// Mock des utilitaires WhatsApp
vi.mock('../../../../utils/whatsappUrl', () => ({
  generateRejectionWhatsAppUrl: vi.fn((phone, firstName, matricule, motifReject) => 
    `https://wa.me/24165671734?text=${encodeURIComponent(`Bonjour ${firstName}, motif: ${motifReject}`)}`
  ),
  generateWhatsAppUrl: vi.fn((phone, message) => 
    `https://wa.me/24165671734?text=${encodeURIComponent(message)}`
  ),
}))

// Mock window.open
const mockWindowOpen = vi.fn()
global.window.open = mockWindowOpen

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

vi.mock('@/components/ui/select', () => ({
  Select: ({ children, value, onValueChange, disabled, 'data-testid': testId, ...props }: any) => {
    const items: any[] = []
    const processChildren = (child: any) => {
      if (child?.type?.name === 'SelectItem' || child?.props?.value) {
        items.push(child)
      } else if (Array.isArray(child)) {
        child.forEach(processChildren)
      } else if (child?.props?.children) {
        processChildren(child.props.children)
      }
    }
    processChildren(children)
    
    return (
      <select 
        value={value || ''} 
        onChange={(e) => onValueChange?.(e.target.value)} 
        data-testid={testId || 'select'}
        disabled={disabled}
        {...props}
      >
        {items.map((item, idx) => (
          <option key={idx} value={item.props?.value}>{item.props?.children}</option>
        ))}
      </select>
    )
  },
  SelectContent: ({ children }: any) => <div>{children}</div>,
  SelectItem: ({ children, value }: any) => <option value={value}>{children}</option>,
  SelectTrigger: ({ children, className }: any) => <div className={className}>{children}</div>,
  SelectValue: ({ placeholder }: any) => <span>{placeholder}</span>,
}))

describe('RejectWhatsAppModalV2', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    phoneNumbers: ['+24165671734'],
    memberName: 'Jean Dupont',
    firstName: 'Jean',
    matricule: 'MK-2024-001234',
    motifReject: 'Documents incomplets',
    requestId: 'req-123',
    isLoading: false,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockWindowOpen.mockClear()
  })

  it('devrait rendre le modal avec un seul numéro de téléphone', async () => {
    render(<RejectWhatsAppModalV2 {...defaultProps} />)
    
    await waitFor(() => {
      expect(screen.getByTestId('reject-whatsapp-modal')).toBeInTheDocument()
      expect(screen.getByTestId('reject-whatsapp-modal-phone-display')).toHaveTextContent('+24165671734')
    })
  })

  it('devrait rendre le dropdown quand plusieurs numéros', async () => {
    render(
      <RejectWhatsAppModalV2
        {...defaultProps}
        phoneNumbers={['+24165671734', '+24107123456']}
      />
    )
    
    await waitFor(() => {
      expect(screen.getByTestId('reject-whatsapp-modal-phone-select')).toBeInTheDocument()
    })
  })

  it('devrait préremplir le message avec le template de rejet', async () => {
    render(<RejectWhatsAppModalV2 {...defaultProps} />)
    
    await waitFor(() => {
      const textarea = screen.getByTestId('reject-whatsapp-modal-message-textarea') as HTMLTextAreaElement
      expect(textarea.value).toContain('Jean')
      expect(textarea.value).toContain('MK-2024-001234')
      expect(textarea.value).toContain('Documents incomplets')
    })
  })

  it('devrait permettre la modification du message', async () => {
    render(<RejectWhatsAppModalV2 {...defaultProps} />)
    
    await waitFor(() => {
      const textarea = screen.getByTestId('reject-whatsapp-modal-message-textarea') as HTMLTextAreaElement
      fireEvent.change(textarea, { target: { value: 'Message modifié' } })
      expect(textarea.value).toBe('Message modifié')
    })
  })

  it('devrait ouvrir WhatsApp Web quand on clique sur Envoyer', async () => {
    render(<RejectWhatsAppModalV2 {...defaultProps} />)
    
    await waitFor(() => {
      const sendButton = screen.getByTestId('reject-whatsapp-modal-send-button')
      fireEvent.click(sendButton)
      
      expect(mockWindowOpen).toHaveBeenCalledWith(
        expect.stringContaining('https://wa.me/24165671734'),
        '_blank',
        'noopener,noreferrer'
      )
    })
  })

  it('devrait fermer le modal après l\'envoi', async () => {
    const onClose = vi.fn()
    render(<RejectWhatsAppModalV2 {...defaultProps} onClose={onClose} />)
    
    await waitFor(() => {
      const sendButton = screen.getByTestId('reject-whatsapp-modal-send-button')
      fireEvent.click(sendButton)
    })
    
    // Attendre que le setTimeout se déclenche
    await waitFor(() => {
      expect(onClose).toHaveBeenCalled()
    }, { timeout: 1000 })
  })

  it('devrait ne pas rendre le modal si aucun numéro disponible', () => {
    render(<RejectWhatsAppModalV2 {...defaultProps} phoneNumbers={[]} />)
    
    expect(screen.queryByTestId('reject-whatsapp-modal')).not.toBeInTheDocument()
  })

  it('devrait appeler onClose quand on clique sur Annuler', async () => {
    const onClose = vi.fn()
    render(<RejectWhatsAppModalV2 {...defaultProps} onClose={onClose} />)
    
    await waitFor(() => {
      const cancelButton = screen.getByTestId('reject-whatsapp-modal-cancel-button')
      fireEvent.click(cancelButton)
      expect(onClose).toHaveBeenCalled()
    })
  })
})
