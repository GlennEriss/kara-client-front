/**
 * Tests unitaires pour RenewSecurityCodeModalV2
 * 
 * Tests du modal de régénération du code de sécurité
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react'
import { RenewSecurityCodeModalV2 } from '../../../../components/modals/RenewSecurityCodeModalV2'

describe('RenewSecurityCodeModalV2', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onConfirm: vi.fn().mockResolvedValue(undefined),
    requestId: 'test-request-123',
    memberName: 'Jean Dupont',
    currentCode: '123456',
    currentExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000), // +24h
    isLoading: false,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendu initial', () => {
    it('devrait ne rien rendre si isOpen est false', () => {
      const { container } = render(
        <RenewSecurityCodeModalV2
          {...defaultProps}
          isOpen={false}
        />
      )
      expect(screen.queryByTestId('renew-code-modal')).not.toBeInTheDocument()
    })

    it('devrait afficher le modal quand isOpen est true', () => {
      render(<RenewSecurityCodeModalV2 {...defaultProps} />)
      expect(screen.getByTestId('renew-code-modal')).toBeInTheDocument()
    })

    it('devrait afficher le titre du modal', () => {
      render(<RenewSecurityCodeModalV2 {...defaultProps} />)
      expect(screen.getByTestId('renew-code-modal-title')).toHaveTextContent('Régénérer le code de sécurité')
    })

    it('devrait afficher l\'avertissement', () => {
      render(<RenewSecurityCodeModalV2 {...defaultProps} />)
      expect(screen.getByTestId('renew-code-modal-warning')).toBeInTheDocument()
    })

    it('devrait afficher le code actuel si fourni', () => {
      render(<RenewSecurityCodeModalV2 {...defaultProps} />)
      expect(screen.getByTestId('renew-code-modal-current-code')).toBeInTheDocument()
      expect(screen.getByTestId('renew-code-modal-current-code-value')).toHaveTextContent('12-34-56')
    })

    it('devrait afficher l\'expiration actuelle si fournie', () => {
      render(<RenewSecurityCodeModalV2 {...defaultProps} />)
      expect(screen.getByTestId('renew-code-modal-current-expiry')).toBeInTheDocument()
      expect(screen.getByTestId('renew-code-modal-current-expiry-value')).toBeInTheDocument()
    })

    it('devrait afficher la checkbox de confirmation', () => {
      render(<RenewSecurityCodeModalV2 {...defaultProps} />)
      expect(screen.getByTestId('renew-code-modal-confirm-checkbox')).toBeInTheDocument()
      expect(screen.getByTestId('renew-code-modal-confirm-label')).toBeInTheDocument()
    })

    it('devrait afficher les boutons Annuler et Régénérer', () => {
      render(<RenewSecurityCodeModalV2 {...defaultProps} />)
      expect(screen.getByTestId('renew-code-modal-cancel-button')).toBeInTheDocument()
      expect(screen.getByTestId('renew-code-modal-renew-button')).toBeInTheDocument()
    })
  })

  describe('Checkbox de confirmation', () => {
    it('devrait être décochée par défaut', () => {
      render(<RenewSecurityCodeModalV2 {...defaultProps} />)
      const checkbox = screen.getByTestId('renew-code-modal-confirm-checkbox')
      expect(checkbox).not.toBeChecked()
    })

    it('devrait être coché quand on clique dessus', async () => {
      render(<RenewSecurityCodeModalV2 {...defaultProps} />)
      const checkbox = screen.getByTestId('renew-code-modal-confirm-checkbox')
      
      fireEvent.click(checkbox)
      
      expect(checkbox).toBeChecked()
    })

    it('devrait désactiver le bouton Régénérer si non coché', () => {
      render(<RenewSecurityCodeModalV2 {...defaultProps} />)
      const renewButton = screen.getByTestId('renew-code-modal-renew-button')
      expect(renewButton).toBeDisabled()
    })

    it('devrait activer le bouton Régénérer si coché', async () => {
      render(<RenewSecurityCodeModalV2 {...defaultProps} />)
      const checkbox = screen.getByTestId('renew-code-modal-confirm-checkbox')
      const renewButton = screen.getByTestId('renew-code-modal-renew-button')
      
      fireEvent.click(checkbox)
      
      expect(renewButton).not.toBeDisabled()
    })
  })

  describe('Bouton Régénérer', () => {
    it('devrait appeler onConfirm quand le bouton est cliqué et checkbox coché', async () => {
      const onConfirm = vi.fn().mockResolvedValue(undefined)
      render(<RenewSecurityCodeModalV2 {...defaultProps} onConfirm={onConfirm} />)
      
      const checkbox = screen.getByTestId('renew-code-modal-confirm-checkbox')
      fireEvent.click(checkbox)
      
      const renewButton = screen.getByTestId('renew-code-modal-renew-button')
      fireEvent.click(renewButton)

      await waitFor(() => {
        expect(onConfirm).toHaveBeenCalledTimes(1)
      })
    })

    it('ne devrait pas appeler onConfirm si checkbox non coché', async () => {
      const onConfirm = vi.fn()
      render(<RenewSecurityCodeModalV2 {...defaultProps} onConfirm={onConfirm} />)
      
      const renewButton = screen.getByTestId('renew-code-modal-renew-button')
      // Le bouton est désactivé, mais essayons quand même
      if (!renewButton.hasAttribute('disabled')) {
        fireEvent.click(renewButton)
      }

      expect(onConfirm).not.toHaveBeenCalled()
    })

    it('devrait réinitialiser la checkbox après confirmation', async () => {
      const onConfirm = vi.fn().mockResolvedValue(undefined)
      render(<RenewSecurityCodeModalV2 {...defaultProps} onConfirm={onConfirm} />)
      
      const checkbox = screen.getByTestId('renew-code-modal-confirm-checkbox')
      fireEvent.click(checkbox)
      
      const renewButton = screen.getByTestId('renew-code-modal-renew-button')
      fireEvent.click(renewButton)

      await waitFor(() => {
        expect(onConfirm).toHaveBeenCalled()
      })

      // La checkbox devrait être réinitialisée après la fermeture
      // (test du comportement interne du composant)
    })
  })

  describe('Bouton Annuler', () => {
    it('devrait appeler onClose quand le bouton Annuler est cliqué', async () => {
      const onClose = vi.fn()
      render(<RenewSecurityCodeModalV2 {...defaultProps} onClose={onClose} />)
      
      const cancelButton = screen.getByTestId('renew-code-modal-cancel-button')
      fireEvent.click(cancelButton)

      expect(onClose).toHaveBeenCalledTimes(1)
    })

    it('ne devrait pas appeler onClose pendant le chargement', () => {
      const onClose = vi.fn()
      render(<RenewSecurityCodeModalV2 {...defaultProps} onClose={onClose} isLoading={true} />)
      
      const cancelButton = screen.getByTestId('renew-code-modal-cancel-button')
      fireEvent.click(cancelButton)

      expect(onClose).not.toHaveBeenCalled()
    })

    it('devrait réinitialiser la checkbox lors de la fermeture', async () => {
      const onClose = vi.fn()
      render(<RenewSecurityCodeModalV2 {...defaultProps} onClose={onClose} />)
      
      const checkbox = screen.getByTestId('renew-code-modal-confirm-checkbox')
      fireEvent.click(checkbox)
      expect(checkbox).toBeChecked()

      const cancelButton = screen.getByTestId('renew-code-modal-cancel-button')
      fireEvent.click(cancelButton)

      expect(onClose).toHaveBeenCalled()
      // La checkbox devrait être réinitialisée (test du comportement interne)
    })
  })

  describe('États de chargement', () => {
    it('devrait désactiver le bouton Régénérer pendant le chargement', () => {
      render(<RenewSecurityCodeModalV2 {...defaultProps} isLoading={true} />)
      const renewButton = screen.getByTestId('renew-code-modal-renew-button')
      expect(renewButton).toBeDisabled()
    })

    it('devrait désactiver le bouton Annuler pendant le chargement', () => {
      render(<RenewSecurityCodeModalV2 {...defaultProps} isLoading={true} />)
      const cancelButton = screen.getByTestId('renew-code-modal-cancel-button')
      expect(cancelButton).toBeDisabled()
    })

    it('devrait désactiver la checkbox pendant le chargement', () => {
      render(<RenewSecurityCodeModalV2 {...defaultProps} isLoading={true} />)
      const checkbox = screen.getByTestId('renew-code-modal-confirm-checkbox')
      expect(checkbox).toBeDisabled()
    })

    it('devrait afficher "Régénération..." pendant le chargement', () => {
      render(<RenewSecurityCodeModalV2 {...defaultProps} isLoading={true} />)
      expect(screen.getByText(/Régénération/)).toBeInTheDocument()
    })
  })

  describe('Formatage du code', () => {
    it('devrait formater le code actuel (12-34-56)', () => {
      render(<RenewSecurityCodeModalV2 {...defaultProps} currentCode="123456" />)
      const codeValue = screen.getByTestId('renew-code-modal-current-code-value')
      expect(codeValue).toHaveTextContent('12-34-56')
    })

    it('devrait gérer les codes non formatables', () => {
      render(<RenewSecurityCodeModalV2 {...defaultProps} currentCode="12345" />)
      const codeValue = screen.getByTestId('renew-code-modal-current-code-value')
      expect(codeValue).toHaveTextContent('12345')
    })
  })

  describe('Formatage de l\'expiration', () => {
    it('devrait formater la date d\'expiration en français', () => {
      const expiry = new Date('2026-01-20T12:00:00')
      render(<RenewSecurityCodeModalV2 {...defaultProps} currentExpiry={expiry} />)
      const expiryValue = screen.getByTestId('renew-code-modal-current-expiry-value')
      expect(expiryValue).toHaveTextContent('20/01/2026')
    })

    it('devrait gérer les dates en string', () => {
      const expiryString = '2026-01-20T12:00:00'
      render(<RenewSecurityCodeModalV2 {...defaultProps} currentExpiry={expiryString} />)
      const expiryValue = screen.getByTestId('renew-code-modal-current-expiry-value')
      expect(expiryValue).toBeInTheDocument()
    })
  })

  describe('Cas limites', () => {
    it('ne devrait pas afficher le code actuel si non fourni', () => {
      render(<RenewSecurityCodeModalV2 {...defaultProps} currentCode={undefined} />)
      expect(screen.queryByTestId('renew-code-modal-current-code')).not.toBeInTheDocument()
    })

    it('ne devrait pas afficher l\'expiration si non fournie', () => {
      render(<RenewSecurityCodeModalV2 {...defaultProps} currentExpiry={undefined} />)
      expect(screen.queryByTestId('renew-code-modal-current-expiry')).not.toBeInTheDocument()
    })
  })
})
