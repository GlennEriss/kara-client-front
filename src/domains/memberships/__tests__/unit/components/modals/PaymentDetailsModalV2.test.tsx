/**
 * Tests unitaires pour PaymentDetailsModalV2
 * 
 * Tests du composant modal d'affichage des détails de paiement
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { PaymentDetailsModalV2 } from '../../../../components/modals/PaymentDetailsModalV2'
import type { Payment } from '@/types/types'
import * as paymentPDFUtils from '../../../../utils/paymentPDFUtils'

// Mock des utilitaires PDF
vi.mock('../../../../utils/paymentPDFUtils', () => ({
  generatePaymentPDF: vi.fn(),
  formatPaymentMode: vi.fn((mode: string) => mode === 'mobicash' ? 'Mobicash' : mode),
  formatPaymentType: vi.fn((type: string) => type === 'Membership' ? 'Adhésion' : type),
  normalizeDate: vi.fn((date: any) => date instanceof Date ? date : new Date(date)),
}))

// Mock de next/image
vi.mock('next/image', () => ({
  default: ({ src, alt, ...props }: any) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return <img src={src} alt={alt} {...props} />
  },
}))

// Mock de sonner (toast)
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}))

describe('PaymentDetailsModalV2', () => {
  const mockPayment: Payment = {
    date: new Date('2026-01-17T15:00:00'),
    time: '15:00',
    mode: 'mobicash',
    amount: 10300,
    acceptedBy: 'admin-id-123',
    paymentType: 'Membership',
    withFees: true,
    proofUrl: 'https://example.com/proof.jpg',
    recordedBy: 'admin-id-123',
    recordedByName: 'Admin KARA',
    recordedAt: new Date('2026-01-17T15:05:00'),
  }

  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    payment: mockPayment,
    memberName: 'Jean-Pierre NDONG',
    requestId: 'PAY-2357.MK.160126',
    matricule: '2357.MK.160126',
    memberEmail: 'jean.ndong@email.com',
    memberPhone: '+241 77 31 61 79',
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendu initial', () => {
    it('devrait ne rien rendre si payment est null', () => {
      const { container } = render(
        <PaymentDetailsModalV2
          isOpen={true}
          onClose={vi.fn()}
          payment={null}
        />
      )
      expect(container.firstChild).toBeNull()
    })

    it('devrait ne rien rendre si isOpen est false', () => {
      const { container } = render(
        <PaymentDetailsModalV2
          isOpen={false}
          onClose={vi.fn()}
          payment={mockPayment}
        />
      )
      const modal = screen.queryByTestId('modal-payment-details')
      expect(modal).not.toBeInTheDocument()
    })

    it('devrait afficher le modal quand isOpen est true et payment est fourni', () => {
      render(<PaymentDetailsModalV2 {...defaultProps} />)
      const modal = screen.getByTestId('modal-payment-details')
      expect(modal).toBeInTheDocument()
    })

    it('devrait afficher le titre du modal', () => {
      render(<PaymentDetailsModalV2 {...defaultProps} />)
      // Le titre apparaît deux fois (dans DialogTitle et dans une section), utiliser un sélecteur plus spécifique
      const titleElements = screen.getAllByText('Détails du paiement')
      expect(titleElements.length).toBeGreaterThan(0)
      // Vérifier que le titre principal (DialogTitle) existe
      const dialogTitle = titleElements.find(el => el.getAttribute('data-slot') === 'dialog-title' || el.tagName === 'H2')
      expect(dialogTitle).toBeInTheDocument()
    })

    it('devrait afficher la description du modal', () => {
      render(<PaymentDetailsModalV2 {...defaultProps} />)
      expect(screen.getByText('Informations complètes du paiement enregistré')).toBeInTheDocument()
    })
  })

  describe('Informations du membre', () => {
    it('devrait afficher le nom du membre', () => {
      render(<PaymentDetailsModalV2 {...defaultProps} />)
      expect(screen.getByText('Jean-Pierre NDONG')).toBeInTheDocument()
    })

    it('devrait afficher le matricule si fourni', () => {
      render(<PaymentDetailsModalV2 {...defaultProps} />)
      expect(screen.getByText('#2357.MK.160126')).toBeInTheDocument()
    })

    it('devrait ne pas afficher le matricule s\'il n\'est pas fourni', () => {
      render(
        <PaymentDetailsModalV2
          {...defaultProps}
          matricule={undefined}
        />
      )
      expect(screen.queryByText(/#\d+/)).not.toBeInTheDocument()
    })

    it('devrait afficher la référence du paiement', () => {
      render(<PaymentDetailsModalV2 {...defaultProps} />)
      expect(screen.getByText('PAY-2357.MK.160126')).toBeInTheDocument()
    })
  })

  describe('Détails du paiement', () => {
    it('devrait afficher le montant payé', () => {
      render(<PaymentDetailsModalV2 {...defaultProps} />)
      expect(screen.getByText('10 300')).toBeInTheDocument()
      expect(screen.getByText('FCFA')).toBeInTheDocument()
    })

    it('devrait afficher le type de paiement formaté', () => {
      render(<PaymentDetailsModalV2 {...defaultProps} />)
      // Le formatage est mocké, on vérifie que formatPaymentType est appelé
      expect(paymentPDFUtils.formatPaymentType).toHaveBeenCalledWith('Membership')
    })

    it('devrait afficher la date de versement', () => {
      render(<PaymentDetailsModalV2 {...defaultProps} />)
      // La date est formatée avec date-fns, on vérifie que normalizeDate est appelé
      expect(paymentPDFUtils.normalizeDate).toHaveBeenCalledWith(mockPayment.date)
    })

    it('devrait afficher l\'heure de versement', () => {
      render(<PaymentDetailsModalV2 {...defaultProps} />)
      expect(screen.getByText('15:00')).toBeInTheDocument()
    })

    it('devrait afficher "—" si l\'heure n\'est pas fournie', () => {
      const paymentWithoutTime = { ...mockPayment, time: '' }
      render(
        <PaymentDetailsModalV2
          {...defaultProps}
          payment={paymentWithoutTime}
        />
      )
      expect(screen.getByText('—')).toBeInTheDocument()
    })

    it('devrait afficher le mode de paiement formaté', () => {
      render(<PaymentDetailsModalV2 {...defaultProps} />)
      expect(paymentPDFUtils.formatPaymentMode).toHaveBeenCalledWith('mobicash')
    })

    it('devrait afficher paymentMethodOther si fourni', () => {
      const paymentWithOther = { ...mockPayment, mode: 'other' as const, paymentMethodOther: 'Paiement en ligne' }
      render(
        <PaymentDetailsModalV2
          {...defaultProps}
          payment={paymentWithOther}
        />
      )
      expect(screen.getByText('(Paiement en ligne)')).toBeInTheDocument()
    })

    it('devrait afficher les frais si withFees est défini', () => {
      render(<PaymentDetailsModalV2 {...defaultProps} />)
      expect(screen.getByText('Avec frais')).toBeInTheDocument()
    })

    it('devrait afficher "Sans frais" si withFees est false', () => {
      const paymentWithoutFees = { ...mockPayment, withFees: false }
      render(
        <PaymentDetailsModalV2
          {...defaultProps}
          payment={paymentWithoutFees}
        />
      )
      expect(screen.getByText('Sans frais')).toBeInTheDocument()
    })

    it('ne devrait pas afficher la section frais si withFees est undefined', () => {
      const paymentWithoutFeesInfo = { ...mockPayment, withFees: undefined }
      render(
        <PaymentDetailsModalV2
          {...defaultProps}
          payment={paymentWithoutFeesInfo}
        />
      )
      // On vérifie que la section frais n'existe pas
      const feesLabels = screen.queryAllByText(/Frais|Avec frais|Sans frais/)
      expect(feesLabels.length).toBe(0)
    })
  })

  describe('Preuve de paiement', () => {
    it('devrait afficher l\'image de preuve si proofUrl est fourni', () => {
      render(<PaymentDetailsModalV2 {...defaultProps} />)
      const image = screen.getByAltText('Preuve de paiement')
      expect(image).toBeInTheDocument()
      expect(image).toHaveAttribute('src', 'https://example.com/proof.jpg')
    })

    it('devrait afficher le lien "Ouvrir l\'image en grand" si proofUrl est fourni', () => {
      render(<PaymentDetailsModalV2 {...defaultProps} />)
      const link = screen.getByText("Ouvrir l'image en grand")
      expect(link).toBeInTheDocument()
      expect(link).toHaveAttribute('href', 'https://example.com/proof.jpg')
      expect(link).toHaveAttribute('target', '_blank')
    })

    it('devrait afficher la justification si proofJustification est fourni mais pas proofUrl', () => {
      const paymentWithJustification = { ...mockPayment, proofUrl: undefined, proofJustification: 'Paiement effectué en espèces' }
      render(
        <PaymentDetailsModalV2
          {...defaultProps}
          payment={paymentWithJustification}
        />
      )
      expect(screen.getByText('Paiement effectué en espèces')).toBeInTheDocument()
    })

    it('ne devrait pas afficher la section preuve si ni proofUrl ni proofJustification ne sont fournis', () => {
      const paymentWithoutProof = { ...mockPayment, proofUrl: undefined, proofJustification: undefined }
      render(
        <PaymentDetailsModalV2
          {...defaultProps}
          payment={paymentWithoutProof}
        />
      )
      expect(screen.queryByText('Preuve de paiement')).not.toBeInTheDocument()
    })
  })

  describe('Traçabilité', () => {
    it('devrait afficher le nom de l\'admin qui a enregistré', () => {
      render(<PaymentDetailsModalV2 {...defaultProps} />)
      expect(screen.getByText('Admin KARA')).toBeInTheDocument()
    })

    it('devrait afficher "Admin inconnu" si recordedByName et acceptedBy ne sont pas fournis', () => {
      const paymentWithoutName: Payment = { 
        ...mockPayment, 
        recordedByName: undefined as any, 
        acceptedBy: undefined as any 
      }
      render(
        <PaymentDetailsModalV2
          {...defaultProps}
          payment={paymentWithoutName}
        />
      )
      expect(screen.getByText('Admin inconnu')).toBeInTheDocument()
    })

    it('devrait afficher la date d\'enregistrement formatée', () => {
      render(<PaymentDetailsModalV2 {...defaultProps} />)
      // normalizeDate devrait être appelé pour recordedAt
      expect(paymentPDFUtils.normalizeDate).toHaveBeenCalledWith(mockPayment.recordedAt)
    })
  })

  describe('Boutons d\'action', () => {
    it('devrait afficher le bouton "Fermer"', () => {
      render(<PaymentDetailsModalV2 {...defaultProps} />)
      const closeButton = screen.getByText('Fermer')
      expect(closeButton).toBeInTheDocument()
    })

    it('devrait appeler onClose quand le bouton "Fermer" est cliqué', () => {
      const onClose = vi.fn()
      render(<PaymentDetailsModalV2 {...defaultProps} onClose={onClose} />)
      const closeButton = screen.getByText('Fermer')
      fireEvent.click(closeButton)
      expect(onClose).toHaveBeenCalledTimes(1)
    })

    it('devrait afficher le bouton "Télécharger le PDF"', () => {
      render(<PaymentDetailsModalV2 {...defaultProps} />)
      const downloadButton = screen.getByTestId('download-payment-pdf')
      expect(downloadButton).toBeInTheDocument()
      expect(screen.getByText('Télécharger le PDF')).toBeInTheDocument()
    })

    it('devrait appeler generatePaymentPDF quand le bouton PDF est cliqué', async () => {
      vi.mocked(paymentPDFUtils.generatePaymentPDF).mockResolvedValue()
      render(<PaymentDetailsModalV2 {...defaultProps} />)
      const downloadButton = screen.getByTestId('download-payment-pdf')
      fireEvent.click(downloadButton)

      await waitFor(() => {
        expect(paymentPDFUtils.generatePaymentPDF).toHaveBeenCalledWith({
          payment: mockPayment,
          memberName: 'Jean-Pierre NDONG',
          requestId: 'PAY-2357.MK.160126',
          matricule: '2357.MK.160126',
          memberEmail: 'jean.ndong@email.com',
          memberPhone: '+241 77 31 61 79',
        })
      })
    })

    it('devrait afficher "Génération..." pendant la génération du PDF', async () => {
      let resolvePDF: () => void
      const pdfPromise = new Promise<void>((resolve) => {
        resolvePDF = resolve
      })
      vi.mocked(paymentPDFUtils.generatePaymentPDF).mockReturnValue(pdfPromise)

      render(<PaymentDetailsModalV2 {...defaultProps} />)
      const downloadButton = screen.getByTestId('download-payment-pdf')
      fireEvent.click(downloadButton)

      await waitFor(() => {
        expect(screen.getByText('Génération...')).toBeInTheDocument()
      })

      // Résoudre la promesse pour terminer le test
      resolvePDF!()
      await waitFor(() => {
        expect(screen.queryByText('Génération...')).not.toBeInTheDocument()
      })
    })

    it('devrait désactiver le bouton PDF pendant la génération', async () => {
      let resolvePDF: () => void
      const pdfPromise = new Promise<void>((resolve) => {
        resolvePDF = resolve
      })
      vi.mocked(paymentPDFUtils.generatePaymentPDF).mockReturnValue(pdfPromise)

      render(<PaymentDetailsModalV2 {...defaultProps} />)
      const downloadButton = screen.getByTestId('download-payment-pdf')
      fireEvent.click(downloadButton)

      await waitFor(() => {
        expect(downloadButton).toBeDisabled()
      })

      resolvePDF!()
    })

    it('devrait gérer les erreurs lors de la génération du PDF', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {})

      vi.mocked(paymentPDFUtils.generatePaymentPDF).mockRejectedValue(new Error('Erreur PDF'))

      render(<PaymentDetailsModalV2 {...defaultProps} />)
      const downloadButton = screen.getByTestId('download-payment-pdf')
      fireEvent.click(downloadButton)

      await waitFor(() => {
        expect(paymentPDFUtils.generatePaymentPDF).toHaveBeenCalled()
      })

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith('Erreur lors de la génération du PDF:', expect.any(Error))
        expect(alertSpy).toHaveBeenCalledWith('Erreur lors de la génération du PDF. Veuillez réessayer.')
      })

      consoleErrorSpy.mockRestore()
      alertSpy.mockRestore()
    })
  })

  describe('Valeurs par défaut', () => {
    it('devrait utiliser "Membre" comme nom par défaut si memberName n\'est pas fourni', () => {
      render(
        <PaymentDetailsModalV2
          {...defaultProps}
          memberName={undefined}
        />
      )
      expect(screen.getByText('Membre')).toBeInTheDocument()
    })

    it('devrait utiliser une chaîne vide pour requestId si non fourni', () => {
      render(
        <PaymentDetailsModalV2
          {...defaultProps}
          requestId={undefined}
        />
      )
      // Le modal devrait toujours s'afficher
      expect(screen.getByTestId('modal-payment-details')).toBeInTheDocument()
    })
  })

  describe('Gestion des dates invalides', () => {
    it('devrait gérer une date invalide pour payment.date', () => {
      const paymentWithInvalidDate = { ...mockPayment, date: new Date('invalid') }
      vi.mocked(paymentPDFUtils.normalizeDate).mockReturnValue(null)

      render(
        <PaymentDetailsModalV2
          {...defaultProps}
          payment={paymentWithInvalidDate}
        />
      )
      // Le composant devrait toujours s'afficher même avec une date invalide
      expect(screen.getByTestId('modal-payment-details')).toBeInTheDocument()
    })

    it('devrait gérer une date invalide pour payment.recordedAt', () => {
      const paymentWithInvalidRecordedAt = { ...mockPayment, recordedAt: new Date('invalid') }
      vi.mocked(paymentPDFUtils.normalizeDate).mockReturnValue(null)

      render(
        <PaymentDetailsModalV2
          {...defaultProps}
          payment={paymentWithInvalidRecordedAt}
        />
      )
      // Le composant devrait afficher "Date invalide" ou gérer gracieusement
      expect(screen.getByTestId('modal-payment-details')).toBeInTheDocument()
    })
  })
})
