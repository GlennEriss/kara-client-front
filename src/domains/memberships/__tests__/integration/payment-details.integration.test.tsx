/**
 * Tests d'intégration pour PaymentDetailsModalV2
 * 
 * Tests de l'intégration entre le composant modal et les utilitaires PDF
 * Vérifie que les données sont correctement passées et formatées
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { PaymentDetailsModalV2 } from '../../components/modals/PaymentDetailsModalV2'
import * as paymentPDFUtils from '../../utils/paymentPDFUtils'
import type { Payment } from '@/types/types'

// Mock de next/image
vi.mock('next/image', () => ({
  default: ({ src, alt, ...props }: any) => {
    // eslint-disable-next-line @next/next/no-img-element
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

describe('PaymentDetailsModalV2 - Intégration', () => {
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
    requestId: '2357.MK.160126',
    matricule: '2357.MK.160126',
    memberEmail: 'jean.ndong@email.com',
    memberPhone: '+241 77 31 61 79',
  }

  beforeEach(() => {
    vi.clearAllMocks()
    // Espionner les fonctions utilitaires pour les tests d'intégration
    vi.spyOn(paymentPDFUtils, 'generatePaymentPDF').mockResolvedValue()
    vi.spyOn(paymentPDFUtils, 'formatPaymentMode').mockImplementation((mode) => mode === 'mobicash' ? 'Mobicash' : mode)
    vi.spyOn(paymentPDFUtils, 'formatPaymentType').mockImplementation((type) => type === 'Membership' ? 'Adhésion' : type)
    vi.spyOn(paymentPDFUtils, 'normalizeDate').mockImplementation((date) => date instanceof Date ? date : new Date(date))
  })

  describe('Intégration avec paymentPDFUtils', () => {
    it('devrait appeler generatePaymentPDF avec toutes les données nécessaires', async () => {
      render(<PaymentDetailsModalV2 {...defaultProps} />)
      const downloadButton = screen.getByTestId('download-payment-pdf')
      fireEvent.click(downloadButton)

      await waitFor(() => {
        expect(paymentPDFUtils.generatePaymentPDF).toHaveBeenCalledWith({
          payment: mockPayment,
          memberName: 'Jean-Pierre NDONG',
          requestId: '2357.MK.160126',
          matricule: '2357.MK.160126',
          memberEmail: 'jean.ndong@email.com',
          memberPhone: '+241 77 31 61 79',
        })
      })
    })

    it('devrait formater correctement le mode de paiement pour l\'affichage', () => {
      render(<PaymentDetailsModalV2 {...defaultProps} />)

      expect(paymentPDFUtils.formatPaymentMode).toHaveBeenCalledWith('mobicash')
    })

    it('devrait formater correctement le type de paiement pour l\'affichage', () => {
      render(<PaymentDetailsModalV2 {...defaultProps} />)

      expect(paymentPDFUtils.formatPaymentType).toHaveBeenCalledWith('Membership')
    })

    it('devrait normaliser les dates pour l\'affichage', () => {
      render(<PaymentDetailsModalV2 {...defaultProps} />)

      // normalizeDate devrait être appelé pour payment.date et payment.recordedAt
      expect(paymentPDFUtils.normalizeDate).toHaveBeenCalledWith(mockPayment.date)
      expect(paymentPDFUtils.normalizeDate).toHaveBeenCalledWith(mockPayment.recordedAt)
    })

    it('devrait gérer les différents modes de paiement', () => {
      const modes: Payment['mode'][] = ['airtel_money', 'mobicash', 'cash', 'bank_transfer', 'other']
      
      modes.forEach(mode => {
        const paymentWithMode = { ...mockPayment, mode }
        // Ré-espionner après clearAllMocks
        vi.spyOn(paymentPDFUtils, 'formatPaymentMode')
        render(
          <PaymentDetailsModalV2
            {...defaultProps}
            payment={paymentWithMode}
          />
        )
        expect(paymentPDFUtils.formatPaymentMode).toHaveBeenCalledWith(mode)
      })
    })

    it('devrait gérer les différents types de paiement', () => {
      const types: Payment['paymentType'][] = ['Membership', 'Subscription', 'Tontine', 'Charity']
      
      types.forEach(type => {
        const paymentWithType = { ...mockPayment, paymentType: type }
        // Ré-espionner après clearAllMocks
        vi.spyOn(paymentPDFUtils, 'formatPaymentType')
        render(
          <PaymentDetailsModalV2
            {...defaultProps}
            payment={paymentWithType}
          />
        )
        expect(paymentPDFUtils.formatPaymentType).toHaveBeenCalledWith(type)
      })
    })
  })

  describe('Cohérence des données affichées', () => {
    it('devrait afficher le même montant que celui dans le payment', () => {
      render(<PaymentDetailsModalV2 {...defaultProps} />)
      // Le montant est formaté avec toLocaleString('fr-FR') dans le composant
      // 10300 devient "10 300" (avec espace insécable \u202f ou espace normal) selon la locale
      // Chercher le texte "FCFA" qui est juste après le montant
      const fcfElement = screen.getByText('FCFA')
      expect(fcfElement).toBeInTheDocument()
      // Le montant devrait être dans le même élément ou parent
      // Le formatage fr-FR utilise un espace insécable, donc chercher "10" et "300" séparément
      const parentElement = fcfElement.parentElement
      const textContent = parentElement?.textContent || ''
      // Vérifier que le texte contient "10" et "300" (séparés par un espace normal ou insécable)
      expect(textContent).toMatch(/10\s*300/)
    })

    it('devrait afficher la même heure que celle dans le payment', () => {
      render(<PaymentDetailsModalV2 {...defaultProps} />)
      expect(screen.getByText(mockPayment.time)).toBeInTheDocument()
    })

    it('devrait afficher le même nom que celui fourni en prop', () => {
      render(<PaymentDetailsModalV2 {...defaultProps} />)
      expect(screen.getByText(defaultProps.memberName)).toBeInTheDocument()
    })

    it('devrait afficher le même matricule que celui fourni en prop', () => {
      render(<PaymentDetailsModalV2 {...defaultProps} />)
      expect(screen.getByText(`#${defaultProps.matricule}`)).toBeInTheDocument()
    })
  })

  describe('Gestion des cas limites', () => {
    it('devrait gérer un paiement sans preuve de paiement', () => {
      const paymentWithoutProof = { ...mockPayment, proofUrl: undefined, proofJustification: undefined }
      render(
        <PaymentDetailsModalV2
          {...defaultProps}
          payment={paymentWithoutProof}
        />
      )
      expect(screen.queryByText('Preuve de paiement')).not.toBeInTheDocument()
    })

    it('devrait gérer un paiement avec justification mais sans image', () => {
      const paymentWithJustification = {
        ...mockPayment,
        proofUrl: undefined,
        proofJustification: 'Paiement effectué en espèces, aucune preuve disponible',
      }
      render(
        <PaymentDetailsModalV2
          {...defaultProps}
          payment={paymentWithJustification}
        />
      )
      expect(screen.getByText('Preuve de paiement')).toBeInTheDocument()
      expect(screen.getByText('Paiement effectué en espèces, aucune preuve disponible')).toBeInTheDocument()
    })

    it('devrait gérer un paiement avec mode "other" et paymentMethodOther', () => {
      const paymentOther = {
        ...mockPayment,
        mode: 'other' as const,
        paymentMethodOther: 'Paiement via plateforme externe',
      }
      render(
        <PaymentDetailsModalV2
          {...defaultProps}
          payment={paymentOther}
        />
      )
      expect(screen.getByText('(Paiement via plateforme externe)')).toBeInTheDocument()
    })

    it('devrait gérer un paiement sans frais', () => {
      const paymentWithoutFees = { ...mockPayment, withFees: false }
      render(
        <PaymentDetailsModalV2
          {...defaultProps}
          payment={paymentWithoutFees}
        />
      )
      expect(screen.getByText('Sans frais')).toBeInTheDocument()
    })

    it('devrait gérer un paiement avec frais', () => {
      render(<PaymentDetailsModalV2 {...defaultProps} />)
      expect(screen.getByText('Avec frais')).toBeInTheDocument()
    })

    it('devrait gérer un paiement sans heure', () => {
      const paymentWithoutTime = { ...mockPayment, time: '' }
      render(
        <PaymentDetailsModalV2
          {...defaultProps}
          payment={paymentWithoutTime}
        />
      )
      expect(screen.getByText('—')).toBeInTheDocument()
    })
  })

  describe('Flux de génération PDF', () => {
    it('devrait générer un PDF avec succès et réinitialiser l\'état', async () => {
      vi.spyOn(paymentPDFUtils, 'generatePaymentPDF').mockResolvedValue()

      render(<PaymentDetailsModalV2 {...defaultProps} />)
      const downloadButton = screen.getByTestId('download-payment-pdf')
      
      // Vérifier que le bouton est activé initialement
      expect(downloadButton).not.toBeDisabled()

      fireEvent.click(downloadButton)

      // Le bouton devrait être désactivé pendant la génération
      await waitFor(() => {
        expect(downloadButton).toBeDisabled()
      })

      // Attendre que la génération se termine
      await waitFor(() => {
        expect(paymentPDFUtils.generatePaymentPDF).toHaveBeenCalled()
      })

      // Le bouton devrait être réactivé après la génération
      await waitFor(() => {
        expect(downloadButton).not.toBeDisabled()
      }, { timeout: 3000 })
    })

    it('devrait gérer une erreur lors de la génération PDF sans casser le composant', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {})

      vi.spyOn(paymentPDFUtils, 'generatePaymentPDF').mockRejectedValue(new Error('Erreur de génération'))

      render(<PaymentDetailsModalV2 {...defaultProps} />)
      const downloadButton = screen.getByTestId('download-payment-pdf')
      
      fireEvent.click(downloadButton)

      await waitFor(() => {
        expect(paymentPDFUtils.generatePaymentPDF).toHaveBeenCalled()
      })

      // Le composant devrait toujours être fonctionnel après l'erreur
      await waitFor(() => {
        expect(downloadButton).not.toBeDisabled()
      }, { timeout: 3000 })

      expect(screen.getByTestId('modal-payment-details')).toBeInTheDocument()

      consoleErrorSpy.mockRestore()
      alertSpy.mockRestore()
    })
  })

  describe('Intégration avec les formats de date', () => {
    it('devrait normaliser un Timestamp Firestore', () => {
      const firestoreTimestamp = {
        toDate: () => new Date('2026-01-17T15:00:00'),
      }
      const paymentWithTimestamp = {
        ...mockPayment,
        date: firestoreTimestamp as any,
      }

      vi.spyOn(paymentPDFUtils, 'normalizeDate').mockImplementation((date: any) => {
        if (date && typeof date === 'object' && 'toDate' in date) {
          return date.toDate()
        }
        return date instanceof Date ? date : new Date(date)
      })

      render(
        <PaymentDetailsModalV2
          {...defaultProps}
          payment={paymentWithTimestamp}
        />
      )

      expect(paymentPDFUtils.normalizeDate).toHaveBeenCalledWith(firestoreTimestamp)
    })

    it('devrait normaliser une date string', () => {
      const dateString = '2026-01-17T15:00:00'
      const paymentWithStringDate = {
        ...mockPayment,
        date: dateString as any,
      }

      render(
        <PaymentDetailsModalV2
          {...defaultProps}
          payment={paymentWithStringDate}
        />
      )

      expect(paymentPDFUtils.normalizeDate).toHaveBeenCalledWith(dateString)
    })

    it('devrait normaliser un objet Date', () => {
      const dateObj = new Date('2026-01-17T15:00:00')
      render(<PaymentDetailsModalV2 {...defaultProps} />)

      expect(paymentPDFUtils.normalizeDate).toHaveBeenCalledWith(dateObj)
    })
  })
})
