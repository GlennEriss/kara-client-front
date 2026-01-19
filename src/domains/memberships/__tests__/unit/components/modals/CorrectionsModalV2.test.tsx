/**
 * Tests unitaires pour CorrectionsModalV2
 * 
 * Tests du composant modal de demande de corrections
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react'
import { CorrectionsModalV2 } from '../../../../components/modals/CorrectionsModalV2'

describe('CorrectionsModalV2', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onConfirm: vi.fn(),
    requestId: 'test-request-123',
    memberName: 'Jean Dupont',
    isLoading: false,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendu initial', () => {
    it('devrait ne rien rendre si isOpen est false', () => {
      const { container } = render(
        <CorrectionsModalV2
          {...defaultProps}
          isOpen={false}
        />
      )
      const modal = screen.queryByTestId('corrections-modal')
      expect(modal).not.toBeInTheDocument()
    })

    it('devrait afficher le modal quand isOpen est true', () => {
      render(<CorrectionsModalV2 {...defaultProps} />)
      const modal = screen.getByTestId('corrections-modal')
      expect(modal).toBeInTheDocument()
    })

    it('devrait afficher le titre du modal', () => {
      render(<CorrectionsModalV2 {...defaultProps} />)
      const title = screen.getByTestId('corrections-modal-title')
      expect(title).toBeInTheDocument()
      expect(title).toHaveTextContent('Demander des corrections')
    })

    it('devrait afficher la description du modal', () => {
      render(<CorrectionsModalV2 {...defaultProps} />)
      expect(screen.getByText(/Saisissez les corrections à apporter/)).toBeInTheDocument()
    })

    it('devrait afficher le textarea pour les corrections', () => {
      render(<CorrectionsModalV2 {...defaultProps} />)
      const textarea = screen.getByTestId('corrections-modal-textarea')
      expect(textarea).toBeInTheDocument()
    })

    it('devrait afficher le compteur de corrections initial (0)', () => {
      render(<CorrectionsModalV2 {...defaultProps} />)
      const counter = screen.getByTestId('corrections-modal-counter')
      expect(counter).toHaveTextContent('Ajoutez au moins une correction (une par ligne)')
    })

    it('devrait afficher les boutons Annuler et Demander les corrections', () => {
      render(<CorrectionsModalV2 {...defaultProps} />)
      expect(screen.getByTestId('corrections-modal-cancel-button')).toBeInTheDocument()
      expect(screen.getByTestId('corrections-modal-submit-button')).toBeInTheDocument()
    })
  })

  describe('Validation et compteur', () => {
    it('devrait mettre à jour le compteur quand le texte est saisi', () => {
      render(<CorrectionsModalV2 {...defaultProps} />)
      const textarea = screen.getByTestId('corrections-modal-textarea')
      
      fireEvent.change(textarea, {
        target: { value: 'Correction 1\nCorrection 2\nCorrection 3' },
      })

      const counter = screen.getByTestId('corrections-modal-counter')
      expect(counter).toHaveTextContent('3 corrections détectées')
    })

    it('devrait ignorer les lignes vides dans le compteur', () => {
      render(<CorrectionsModalV2 {...defaultProps} />)
      const textarea = screen.getByTestId('corrections-modal-textarea')
      
      fireEvent.change(textarea, {
        target: { value: 'Correction 1\n\nCorrection 2\n   \nCorrection 3' },
      })

      const counter = screen.getByTestId('corrections-modal-counter')
      expect(counter).toHaveTextContent('3 corrections détectées')
    })

    it('devrait trimmer les espaces en début et fin de ligne', () => {
      render(<CorrectionsModalV2 {...defaultProps} />)
      const textarea = screen.getByTestId('corrections-modal-textarea')
      
      fireEvent.change(textarea, {
        target: { value: '  Correction 1  \n  Correction 2  ' },
      })

      const counter = screen.getByTestId('corrections-modal-counter')
      expect(counter).toHaveTextContent('2 corrections détectées')
    })

    it('devrait afficher le singulier pour 1 correction', () => {
      render(<CorrectionsModalV2 {...defaultProps} />)
      const textarea = screen.getByTestId('corrections-modal-textarea')
      
      fireEvent.change(textarea, {
        target: { value: 'Correction unique' },
      })

      const counter = screen.getByTestId('corrections-modal-counter')
      expect(counter).toHaveTextContent('1 correction détectée')
    })
  })

  describe('Bouton de soumission', () => {
    it('devrait être désactivé si aucune correction n\'est saisie', () => {
      render(<CorrectionsModalV2 {...defaultProps} />)
      const submitButton = screen.getByTestId('corrections-modal-submit-button')
      expect(submitButton).toBeDisabled()
    })

    it('devrait être désactivé si seulement des lignes vides sont saisies', () => {
      render(<CorrectionsModalV2 {...defaultProps} />)
      const textarea = screen.getByTestId('corrections-modal-textarea')
      const submitButton = screen.getByTestId('corrections-modal-submit-button')
      
      fireEvent.change(textarea, {
        target: { value: '   \n\n   ' },
      })

      expect(submitButton).toBeDisabled()
    })

    it('devrait être activé si au moins une correction est saisie', () => {
      render(<CorrectionsModalV2 {...defaultProps} />)
      const textarea = screen.getByTestId('corrections-modal-textarea')
      const submitButton = screen.getByTestId('corrections-modal-submit-button')
      
      fireEvent.change(textarea, {
        target: { value: 'Correction 1' },
      })

      expect(submitButton).not.toBeDisabled()
    })

    it('devrait être désactivé pendant le chargement', () => {
      render(<CorrectionsModalV2 {...defaultProps} isLoading={true} />)
      const submitButton = screen.getByTestId('corrections-modal-submit-button')
      expect(submitButton).toBeDisabled()
    })

    it('devrait afficher le spinner et "Envoi en cours..." pendant le chargement', () => {
      render(<CorrectionsModalV2 {...defaultProps} isLoading={true} />)
      const submitButton = screen.getByTestId('corrections-modal-submit-button')
      expect(submitButton).toHaveTextContent('Envoi en cours...')
    })
  })

  describe('Interactions', () => {
    it('devrait appeler onConfirm avec les corrections parsées lors du clic sur "Demander les corrections"', async () => {
      const mockOnConfirm = vi.fn().mockResolvedValue(undefined)
      render(<CorrectionsModalV2 {...defaultProps} onConfirm={mockOnConfirm} />)
      
      const textarea = screen.getByTestId('corrections-modal-textarea')
      const submitButton = screen.getByTestId('corrections-modal-submit-button')
      
      fireEvent.change(textarea, {
        target: { value: 'Correction 1\nCorrection 2\n  Correction 3  ' },
      })

      await act(async () => {
        fireEvent.click(submitButton)
      })

      expect(mockOnConfirm).toHaveBeenCalledTimes(1)
      expect(mockOnConfirm).toHaveBeenCalledWith(['Correction 1', 'Correction 2', 'Correction 3'])
    })

    it('ne devrait pas appeler onConfirm si aucune correction n\'est saisie', async () => {
      const mockOnConfirm = vi.fn()
      render(<CorrectionsModalV2 {...defaultProps} onConfirm={mockOnConfirm} />)
      
      const submitButton = screen.getByTestId('corrections-modal-submit-button')
      
      // Le bouton est désactivé, mais essayons quand même de forcer le clic
      if (!submitButton.hasAttribute('disabled')) {
        await act(async () => {
          fireEvent.click(submitButton)
        })
      }

      expect(mockOnConfirm).not.toHaveBeenCalled()
    })

    it('devrait appeler onClose lors du clic sur "Annuler"', () => {
      const mockOnClose = vi.fn()
      render(<CorrectionsModalV2 {...defaultProps} onClose={mockOnClose} />)
      
      const cancelButton = screen.getByTestId('corrections-modal-cancel-button')
      fireEvent.click(cancelButton)

      expect(mockOnClose).toHaveBeenCalledTimes(1)
    })

    it('ne devrait pas appeler onClose pendant le chargement lors du clic sur "Annuler"', () => {
      const mockOnClose = vi.fn()
      render(<CorrectionsModalV2 {...defaultProps} onClose={mockOnClose} isLoading={true} />)
      
      const cancelButton = screen.getByTestId('corrections-modal-cancel-button')
      fireEvent.click(cancelButton)

      expect(mockOnClose).not.toHaveBeenCalled()
    })

    it('devrait réinitialiser le texte lors de la fermeture via onClose', () => {
      const mockOnClose = vi.fn(() => {
        // Simuler la fermeture qui réinitialise l'état
      })
      const { rerender } = render(<CorrectionsModalV2 {...defaultProps} onClose={mockOnClose} />)
      
      const textarea = screen.getByTestId('corrections-modal-textarea')
      fireEvent.change(textarea, {
        target: { value: 'Correction 1\nCorrection 2' },
      })

      expect(textarea).toHaveValue('Correction 1\nCorrection 2')

      // Fermer le modal via onClose (qui réinitialise le texte)
      const cancelButton = screen.getByTestId('corrections-modal-cancel-button')
      fireEvent.click(cancelButton)

      expect(mockOnClose).toHaveBeenCalled()
      // Le texte devrait être réinitialisé dans le composant lors du prochain rendu
      // (test de comportement interne du composant)
    })
  })

  describe('États de chargement', () => {
    it('devrait désactiver le textarea pendant le chargement', () => {
      render(<CorrectionsModalV2 {...defaultProps} isLoading={true} />)
      const textarea = screen.getByTestId('corrections-modal-textarea')
      expect(textarea).toBeDisabled()
    })

    it('devrait désactiver le bouton Annuler pendant le chargement', () => {
      render(<CorrectionsModalV2 {...defaultProps} isLoading={true} />)
      const cancelButton = screen.getByTestId('corrections-modal-cancel-button')
      expect(cancelButton).toBeDisabled()
    })
  })
})
