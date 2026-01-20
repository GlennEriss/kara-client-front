/**
 * Tests unitaires pour ApprovalModalV2
 * 
 * Tests le rendu, la validation, l'upload PDF, et les interactions
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { ApprovalModalV2 } from '../../../../components/modals/ApprovalModalV2'
import type { MembershipRequest } from '@/types/types'

// Mock des dépendances
vi.mock('sonner', () => ({
  toast: {
    info: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
  },
}))

vi.mock('@/db/upload-image.db', () => ({
  createFile: vi.fn(),
}))

// Mock des composants UI
vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: any) => (
    open ? <div data-testid="dialog">{children}</div> : null
  ),
  DialogContent: ({ children, className, ...props }: any) => (
    <div data-testid="dialog-content" className={className} {...props}>{children}</div>
  ),
  DialogDescription: ({ children }: any) => <div>{children}</div>,
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
  Label: ({ children, ...props }: any) => <label {...props}>{children}</label>,
}))

vi.mock('@/components/ui/select', () => ({
  Select: ({ children, onValueChange, value, 'data-testid': testId, disabled, ...props }: any) => {
    // Extraire les SelectItem des enfants
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
        <option value="adherant">Adhérent</option>
        <option value="bienfaiteur">Bienfaiteur</option>
        <option value="sympathisant">Sympathisant</option>
      </select>
    )
  },
  SelectContent: ({ children }: any) => <div>{children}</div>,
  SelectItem: ({ children, value }: any) => <option value={value}>{children}</option>,
  SelectTrigger: ({ children, className }: any) => <div className={className}>{children}</div>,
  SelectValue: ({ placeholder }: any) => <span>{placeholder}</span>,
}))

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, ...props }: any) => <span {...props}>{children}</span>,
}))

vi.mock('@/components/ui/alert', () => ({
  Alert: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  AlertDescription: ({ children }: any) => <div>{children}</div>,
}))

vi.mock('@/components/ui/card', () => ({
  Card: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  CardContent: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  CardHeader: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  CardTitle: ({ children, ...props }: any) => <div {...props}>{children}</div>,
}))

vi.mock('../../../../components/shared', () => ({
  StatusBadgeV2: ({ status }: any) => <span data-testid="status-badge">{status}</span>,
  PaymentBadgeV2: ({ isPaid }: any) => <span data-testid="payment-badge">{isPaid ? 'Payé' : 'Non payé'}</span>,
}))

describe('ApprovalModalV2', () => {
  const mockRequest: MembershipRequest = {
    id: 'request-123',
    matricule: '1234.MK.567890',
    status: 'pending',
    isPaid: true,
    identity: {
      firstName: 'Jean',
      lastName: 'Dupont',
      civility: 'Monsieur',
      birthDate: '1990-01-01',
      birthPlace: 'Libreville',
      birthCertificateNumber: '123456',
      prayerPlace: 'Église',
      religion: 'Christianisme',
      contacts: ['+241061234567'],
      email: 'jean.dupont@example.com',
      gender: 'Homme',
      nationality: 'Gabonaise',
      maritalStatus: 'Célibataire',
      intermediaryCode: '0000.MK.00001',
      hasCar: false,
    },
    address: {
      province: 'Estuaire',
      city: 'Libreville Centre',
      district: 'Centre-Ville',
      arrondissement: '1er Arrondissement',
    },
    company: {
      isEmployed: false,
    },
    documents: {
      identityDocument: 'CNI',
      identityDocumentNumber: '123456',
      expirationDate: '2030-12-31',
      issuingPlace: 'Libreville',
      issuingDate: '2020-01-01',
      termsAccepted: true,
    },
    payments: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  const mockOnApprove = vi.fn().mockResolvedValue(undefined)
  const mockOnClose = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendu du modal', () => {
    it('should render modal when open', () => {
      render(
        <ApprovalModalV2
          isOpen={true}
          onClose={mockOnClose}
          onApprove={mockOnApprove}
          request={mockRequest}
        />
      )

      expect(screen.getByTestId('approval-modal')).toBeInTheDocument()
      expect(screen.getByTestId('approval-modal-title')).toHaveTextContent("Approuver une Demande d'Adhésion")
    })

    it('should not render modal when closed', () => {
      render(
        <ApprovalModalV2
          isOpen={false}
          onClose={mockOnClose}
          onApprove={mockOnApprove}
          request={mockRequest}
        />
      )

      expect(screen.queryByTestId('approval-modal')).not.toBeInTheDocument()
    })

    it('should display request information', () => {
      render(
        <ApprovalModalV2
          isOpen={true}
          onClose={mockOnClose}
          onApprove={mockOnApprove}
          request={mockRequest}
        />
      )

      expect(screen.getByTestId('approval-modal-matricule')).toHaveTextContent('1234.MK.567890')
      expect(screen.getByTestId('approval-modal-dossier-section')).toBeInTheDocument()
    })
  })

  describe('Validation des champs', () => {
    it('should disable approve button when fields are empty', () => {
      render(
        <ApprovalModalV2
          isOpen={true}
          onClose={mockOnClose}
          onApprove={mockOnApprove}
          request={mockRequest}
        />
      )

      const approveButton = screen.getByTestId('approval-modal-approve-button')
      expect(approveButton).toBeDisabled()
    })

    it('should enable approve button when all fields are filled', async () => {
      const { createFile } = await import('@/db/upload-image.db')
      vi.mocked(createFile).mockResolvedValue({
        url: 'https://storage.example.com/pdf/test.pdf',
        path: 'membership-adhesion-pdfs/request-123/test.pdf',
      })

      render(
        <ApprovalModalV2
          isOpen={true}
          onClose={mockOnClose}
          onApprove={mockOnApprove}
          request={mockRequest}
        />
      )

      // Sélectionner le type de membre
      const membershipTypeSelect = screen.getByTestId('approval-modal-membership-type-select')
      fireEvent.change(membershipTypeSelect, { target: { value: 'adherant' } })

      // Uploader un PDF
      const pdfInput = screen.getByTestId('approval-modal-pdf-file-input')
      const file = new File(['pdf content'], 'test.pdf', { type: 'application/pdf' })
      fireEvent.change(pdfInput, { target: { files: [file] } })

      // Attendre que l'upload soit terminé
      await waitFor(() => {
        const approveButton = screen.getByTestId('approval-modal-approve-button')
        expect(approveButton).toBeEnabled()
      })
    })

    it('should show error when trying to approve without membership type', async () => {
      render(
        <ApprovalModalV2
          isOpen={true}
          onClose={mockOnClose}
          onApprove={mockOnApprove}
          request={mockRequest}
        />
      )

      const approveButton = screen.getByTestId('approval-modal-approve-button')
      // Le bouton devrait être désactivé quand les champs ne sont pas remplis
      expect(approveButton).toBeDisabled()
      
      // Test de la validation : on remplit seulement le PDF mais pas le type de membre
      const { createFile } = await import('@/db/upload-image.db')
      vi.mocked(createFile).mockResolvedValue({
        url: 'https://storage.example.com/pdf/test.pdf',
        path: 'membership-adhesion-pdfs/request-123/test.pdf',
      })

      const pdfInput = screen.getByTestId('approval-modal-pdf-file-input')
      const file = new File(['pdf content'], 'test.pdf', { type: 'application/pdf' })
      fireEvent.change(pdfInput, { target: { files: [file] } })

      // Attendre que l'upload soit terminé
      await waitFor(() => {
        expect(createFile).toHaveBeenCalled()
      })

      // Le bouton devrait toujours être désactivé car le type de membre n'est pas sélectionné
      const approveButtonAfterUpload = screen.getByTestId('approval-modal-approve-button')
      expect(approveButtonAfterUpload).toBeDisabled()
    })
  })

  describe('Upload PDF', () => {
    it('should accept valid PDF file', async () => {
      const { createFile } = await import('@/db/upload-image.db')
      vi.mocked(createFile).mockResolvedValue({
        url: 'https://storage.example.com/pdf/test.pdf',
        path: 'membership-adhesion-pdfs/request-123/test.pdf',
      })

      render(
        <ApprovalModalV2
          isOpen={true}
          onClose={mockOnClose}
          onApprove={mockOnApprove}
          request={mockRequest}
        />
      )

      const pdfInput = screen.getByTestId('approval-modal-pdf-file-input')
      const file = new File(['pdf content'], 'test.pdf', { type: 'application/pdf' })
      fireEvent.change(pdfInput, { target: { files: [file] } })

      await waitFor(() => {
        expect(createFile).toHaveBeenCalledWith(
          file,
          'request-123',
          'membership-adhesion-pdfs/request-123'
        )
      })
    })

    it('should reject non-PDF file', async () => {
      const { toast } = await import('sonner')

      render(
        <ApprovalModalV2
          isOpen={true}
          onClose={mockOnClose}
          onApprove={mockOnApprove}
          request={mockRequest}
        />
      )

      const pdfInput = screen.getByTestId('approval-modal-pdf-file-input')
      const file = new File(['image content'], 'test.jpg', { type: 'image/jpeg' })
      fireEvent.change(pdfInput, { target: { files: [file] } })

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Veuillez sélectionner un fichier PDF valide')
      })
    })

    it('should reject PDF file larger than 10MB', async () => {
      const { toast } = await import('sonner')

      render(
        <ApprovalModalV2
          isOpen={true}
          onClose={mockOnClose}
          onApprove={mockOnApprove}
          request={mockRequest}
        />
      )

      const pdfInput = screen.getByTestId('approval-modal-pdf-file-input')
      // Créer un fichier de 11 MB
      const largeContent = new Array(11 * 1024 * 1024).fill('a').join('')
      const file = new File([largeContent], 'large.pdf', { type: 'application/pdf' })
      fireEvent.change(pdfInput, { target: { files: [file] } })

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Le fichier PDF ne doit pas dépasser 10MB')
      })
    })

    it('should allow removing uploaded PDF', async () => {
      const { createFile } = await import('@/db/upload-image.db')
      vi.mocked(createFile).mockResolvedValue({
        url: 'https://storage.example.com/pdf/test.pdf',
        path: 'membership-adhesion-pdfs/request-123/test.pdf',
      })

      render(
        <ApprovalModalV2
          isOpen={true}
          onClose={mockOnClose}
          onApprove={mockOnApprove}
          request={mockRequest}
        />
      )

      const pdfInput = screen.getByTestId('approval-modal-pdf-file-input')
      const file = new File(['pdf content'], 'test.pdf', { type: 'application/pdf' })
      fireEvent.change(pdfInput, { target: { files: [file] } })

      await waitFor(() => {
        expect(screen.getByTestId('approval-modal-pdf-file-name')).toBeInTheDocument()
      })

      const removeButton = screen.getByTestId('approval-modal-pdf-remove-button')
      fireEvent.click(removeButton)

      await waitFor(() => {
        expect(screen.queryByTestId('approval-modal-pdf-file-name')).not.toBeInTheDocument()
      })
    })
  })

  describe('Approbation', () => {
    it('should call onApprove with correct parameters', async () => {
      const { createFile } = await import('@/db/upload-image.db')
      vi.mocked(createFile).mockResolvedValue({
        url: 'https://storage.example.com/pdf/test.pdf',
        path: 'membership-adhesion-pdfs/request-123/test.pdf',
      })

      render(
        <ApprovalModalV2
          isOpen={true}
          onClose={mockOnClose}
          onApprove={mockOnApprove}
          request={mockRequest}
        />
      )

      // Sélectionner le type de membre
      const membershipTypeSelect = screen.getByTestId('approval-modal-membership-type-select')
      fireEvent.change(membershipTypeSelect, { target: { value: 'adherant' } })

      // Uploader un PDF
      const pdfInput = screen.getByTestId('approval-modal-pdf-file-input')
      const file = new File(['pdf content'], 'test.pdf', { type: 'application/pdf' })
      fireEvent.change(pdfInput, { target: { files: [file] } })

      // Attendre que l'upload soit terminé
      await waitFor(() => {
        const approveButton = screen.getByTestId('approval-modal-approve-button')
        expect(approveButton).toBeEnabled()
      })

      // Cliquer sur Approuver
      const approveButton = screen.getByTestId('approval-modal-approve-button')
      fireEvent.click(approveButton)

      await waitFor(() => {
        expect(mockOnApprove).toHaveBeenCalledWith({
          membershipType: 'adherant',
          adhesionPdfURL: 'https://storage.example.com/pdf/test.pdf',
          companyId: null,
          professionId: null,
        })
      })
    })
  })

  describe('Fermeture du modal', () => {
    it('should call onClose when cancel button is clicked', async () => {
      render(
        <ApprovalModalV2
          isOpen={true}
          onClose={mockOnClose}
          onApprove={mockOnApprove}
          request={mockRequest}
        />
      )

      const cancelButton = screen.getByTestId('approval-modal-cancel-button')
      fireEvent.click(cancelButton)

      expect(mockOnClose).toHaveBeenCalled()
    })

    it('should not close modal when loading', () => {
      render(
        <ApprovalModalV2
          isOpen={true}
          onClose={mockOnClose}
          onApprove={mockOnApprove}
          request={mockRequest}
          isLoading={true}
        />
      )

      const cancelButton = screen.getByTestId('approval-modal-cancel-button')
      expect(cancelButton).toBeDisabled()
    })
  })

  describe('Affichage des sections conditionnelles', () => {
    it('should show company section when hasCompany is true', () => {
      const requestWithCompany: MembershipRequest = {
        ...mockRequest,
        company: {
          isEmployed: true,
          companyName: 'Test Company',
          profession: 'Test Profession',
        },
      }

      render(
        <ApprovalModalV2
          isOpen={true}
          onClose={mockOnClose}
          onApprove={mockOnApprove}
          request={requestWithCompany}
        />
      )

      expect(screen.getByTestId('approval-modal-company-section')).toBeInTheDocument()
      expect(screen.getByTestId('approval-modal-profession-section')).toBeInTheDocument()
    })

    it('should not show company section when hasCompany is false', () => {
      render(
        <ApprovalModalV2
          isOpen={true}
          onClose={mockOnClose}
          onApprove={mockOnApprove}
          request={mockRequest}
        />
      )

      expect(screen.queryByTestId('approval-modal-company-section')).not.toBeInTheDocument()
      expect(screen.queryByTestId('approval-modal-profession-section')).not.toBeInTheDocument()
    })
  })
})
