/**
 * Tests unitaires pour CorrectionsBlockV2
 * 
 * Tests du composant bloc "Corrections demandées" avec section "Accès corrections"
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react'
import { CorrectionsBlockV2 } from '../../../../components/shared/CorrectionsBlockV2'

// Mock de sonner (toast)
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}))

// Mock de window.location
const mockLocation = {
  origin: 'http://localhost:3000',
}

describe('CorrectionsBlockV2', () => {
  const defaultProps = {
    reviewNote: 'Photo floue\nAdresse incomplète\nSignature manquante',
    securityCode: '123456',
    securityCodeExpiry: new Date(Date.now() + 48 * 60 * 60 * 1000), // +48h
    requestId: 'test-request-123',
    processedByName: 'Admin Test',
    processedByMatricule: 'MAT-001',
    onCopyLink: vi.fn(),
    onSendWhatsApp: vi.fn(),
    onRenewCode: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    Object.defineProperty(window, 'location', {
      value: mockLocation,
      writable: true,
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('Rendu initial', () => {
    it('devrait ne rien rendre si reviewNote est vide', () => {
      const { container } = render(
        <CorrectionsBlockV2
          {...defaultProps}
          reviewNote=""
        />
      )
      expect(container.firstChild).toBeNull()
    })

    it('devrait afficher le bloc quand reviewNote est fourni', () => {
      render(<CorrectionsBlockV2 {...defaultProps} />)
      expect(screen.getByTestId('corrections-block')).toBeInTheDocument()
    })

    it('devrait afficher le titre "Corrections demandées"', () => {
      render(<CorrectionsBlockV2 {...defaultProps} />)
      expect(screen.getByTestId('corrections-block-title')).toHaveTextContent('Corrections demandées')
    })

    it('devrait afficher la liste des corrections', () => {
      render(<CorrectionsBlockV2 {...defaultProps} />)
      expect(screen.getByTestId('corrections-block-list')).toBeInTheDocument()
    })

    it('devrait afficher les 3 premières corrections', () => {
      render(<CorrectionsBlockV2 {...defaultProps} />)
      expect(screen.getByTestId('correction-item-0')).toHaveTextContent('Photo floue')
      expect(screen.getByTestId('correction-item-1')).toHaveTextContent('Adresse incomplète')
      expect(screen.getByTestId('correction-item-2')).toHaveTextContent('Signature manquante')
    })

    it('devrait afficher toutes les corrections (pas de limite)', () => {
      const manyCorrections = 'Correction 1\nCorrection 2\nCorrection 3\nCorrection 4\nCorrection 5'
      render(<CorrectionsBlockV2 {...defaultProps} reviewNote={manyCorrections} />)
      // Le composant affiche toutes les corrections, pas seulement 3
      expect(screen.getByTestId('correction-item-0')).toHaveTextContent('Correction 1')
      expect(screen.getByTestId('correction-item-1')).toHaveTextContent('Correction 2')
      expect(screen.getByTestId('correction-item-2')).toHaveTextContent('Correction 3')
      expect(screen.getByTestId('correction-item-3')).toHaveTextContent('Correction 4')
      expect(screen.getByTestId('correction-item-4')).toHaveTextContent('Correction 5')
    })
  })

  describe('Section "Accès corrections"', () => {
    it('devrait afficher la section "Accès corrections" si securityCode est fourni', () => {
      render(<CorrectionsBlockV2 {...defaultProps} />)
      expect(screen.getByTestId('corrections-access-title')).toBeInTheDocument()
    })

    it('ne devrait pas afficher la section si aucun callback ni code', () => {
      render(
        <CorrectionsBlockV2
          {...defaultProps}
          securityCode={undefined}
          onCopyLink={undefined}
          onSendWhatsApp={undefined}
          onRenewCode={undefined}
        />
      )
      expect(screen.queryByTestId('corrections-access-title')).not.toBeInTheDocument()
    })
  })

  describe('Lien de correction', () => {
    it('devrait afficher le lien de correction si onCopyLink est fourni', () => {
      render(<CorrectionsBlockV2 {...defaultProps} />)
      expect(screen.getByTestId('corrections-block-copy-link-button')).toBeInTheDocument()
    })

    it('devrait appeler onCopyLink quand le bouton copier est cliqué', async () => {
      const onCopyLink = vi.fn()
      const writeTextSpy = vi.fn().mockResolvedValue(undefined)
      Object.assign(navigator, {
        clipboard: {
          writeText: writeTextSpy,
        },
      })

      render(<CorrectionsBlockV2 {...defaultProps} onCopyLink={onCopyLink} />)
      
      const copyButton = screen.getByTestId('corrections-block-copy-link-button')
      await act(async () => {
        fireEvent.click(copyButton)
      })

      await waitFor(() => {
        expect(writeTextSpy).toHaveBeenCalled()
        expect(onCopyLink).toHaveBeenCalledTimes(1)
      })
    })

    it('ne devrait pas afficher le bouton copier lien si onCopyLink n\'est pas fourni', () => {
      render(
        <CorrectionsBlockV2
          {...defaultProps}
          onCopyLink={undefined}
        />
      )

      // Le bouton copier lien n'est affiché que si onCopyLink est fourni
      expect(screen.queryByTestId('corrections-block-copy-link-button')).not.toBeInTheDocument()
    })
  })

  describe('Code de sécurité', () => {
    it('devrait afficher le code masqué par défaut', () => {
      render(<CorrectionsBlockV2 {...defaultProps} />)
      const codeValue = screen.getByTestId('corrections-block-code-value')
      expect(codeValue).toHaveTextContent('••••••')
    })

    it('devrait afficher le code formaté quand visible', async () => {
      render(<CorrectionsBlockV2 {...defaultProps} />)
      
      const toggleButton = screen.getByTestId('corrections-block-toggle-code-button')
      fireEvent.click(toggleButton)

      const codeValue = screen.getByTestId('corrections-block-code-value')
      expect(codeValue).toHaveTextContent('12-34-56')
    })

    it('devrait basculer entre masqué et visible', async () => {
      render(<CorrectionsBlockV2 {...defaultProps} />)
      
      const toggleButton = screen.getByTestId('corrections-block-toggle-code-button')
      const codeValue = screen.getByTestId('corrections-block-code-value')

      // Masqué par défaut
      expect(codeValue).toHaveTextContent('••••••')

      // Cliquer pour afficher
      fireEvent.click(toggleButton)
      expect(codeValue).toHaveTextContent('12-34-56')

      // Cliquer pour masquer
      fireEvent.click(toggleButton)
      expect(codeValue).toHaveTextContent('••••••')
    })

    it('devrait copier le code dans le presse-papier', async () => {
      const writeTextSpy = vi.fn()
      Object.assign(navigator, {
        clipboard: {
          writeText: writeTextSpy,
        },
      })

      render(<CorrectionsBlockV2 {...defaultProps} />)

      const copyButton = screen.getByTestId('corrections-block-copy-code-button')
      fireEvent.click(copyButton)

      expect(writeTextSpy).toHaveBeenCalledWith('123456')
    })
  })

  describe('Validité du code', () => {
    it('devrait afficher le temps restant', () => {
      const expiry = new Date(Date.now() + 2 * 60 * 60 * 1000) // +2h
      render(<CorrectionsBlockV2 {...defaultProps} securityCodeExpiry={expiry} />)
      
      expect(screen.getByTestId('corrections-block-expiry')).toBeInTheDocument()
      expect(screen.getByTestId('corrections-block-expiry-remaining')).toBeInTheDocument()
    })

    it('devrait afficher la date d\'expiration', () => {
      const expiry = new Date('2026-01-20T12:00:00')
      render(<CorrectionsBlockV2 {...defaultProps} securityCodeExpiry={expiry} />)
      
      expect(screen.getByTestId('corrections-block-expiry-value')).toBeInTheDocument()
      expect(screen.getByTestId('corrections-block-expiry-value')).toHaveTextContent('20/01/2026')
    })

    it('devrait afficher "Expiré" si le code est expiré', async () => {
      const expiredDate = new Date(Date.now() - 1000)
      render(<CorrectionsBlockV2 {...defaultProps} securityCodeExpiry={expiredDate} />)
      
      // Le composant calcule automatiquement si le code est expiré via useEffect
      await waitFor(() => {
        const expiryRemaining = screen.getByTestId('corrections-block-expiry-remaining')
        expect(expiryRemaining).toHaveTextContent('Expiré')
      }, { timeout: 2000 })
    })
  })

  describe('Bouton régénérer', () => {
    it('devrait afficher le bouton régénérer si onRenewCode est fourni', () => {
      render(<CorrectionsBlockV2 {...defaultProps} />)
      expect(screen.getByTestId('corrections-block-renew-code-button')).toBeInTheDocument()
    })

    it('devrait appeler onRenewCode quand le bouton est cliqué', async () => {
      const onRenewCode = vi.fn()
      render(<CorrectionsBlockV2 {...defaultProps} onRenewCode={onRenewCode} />)
      
      const renewButton = screen.getByTestId('corrections-block-renew-code-button')
      fireEvent.click(renewButton)

      expect(onRenewCode).toHaveBeenCalledTimes(1)
    })
  })

  describe('Bouton WhatsApp', () => {
    it('devrait afficher le bouton WhatsApp si onSendWhatsApp est fourni', () => {
      render(<CorrectionsBlockV2 {...defaultProps} />)
      expect(screen.getByTestId('corrections-block-send-whatsapp-button')).toBeInTheDocument()
    })

    it('devrait appeler onSendWhatsApp quand le bouton est cliqué', async () => {
      const onSendWhatsApp = vi.fn()
      render(<CorrectionsBlockV2 {...defaultProps} onSendWhatsApp={onSendWhatsApp} />)
      
      const whatsappButton = screen.getByTestId('corrections-block-send-whatsapp-button')
      fireEvent.click(whatsappButton)

      expect(onSendWhatsApp).toHaveBeenCalledTimes(1)
    })
  })

  describe('Informations "Demandé par"', () => {
    it('devrait afficher le nom de l\'admin qui a demandé les corrections', () => {
      render(<CorrectionsBlockV2 {...defaultProps} />)
      expect(screen.getByTestId('corrections-block-requested-by-value')).toHaveTextContent('Admin Test')
    })

    it('devrait afficher le matricule de l\'admin', () => {
      render(<CorrectionsBlockV2 {...defaultProps} />)
      expect(screen.getByTestId('corrections-block-requested-by-matricule')).toHaveTextContent('(MAT-001)')
    })

    it('ne devrait pas afficher la section si aucune info n\'est fournie', () => {
      render(
        <CorrectionsBlockV2
          {...defaultProps}
          processedByName={undefined}
          processedByMatricule={undefined}
        />
      )
      expect(screen.queryByTestId('corrections-block-requested-by')).not.toBeInTheDocument()
    })
  })

  describe('Filtrage des corrections', () => {
    it('devrait ignorer les lignes vides', () => {
      const reviewNote = 'Correction 1\n\nCorrection 2\n   \nCorrection 3'
      render(<CorrectionsBlockV2 {...defaultProps} reviewNote={reviewNote} />)
      
      expect(screen.getByTestId('correction-item-0')).toHaveTextContent('Correction 1')
      expect(screen.getByTestId('correction-item-1')).toHaveTextContent('Correction 2')
      expect(screen.getByTestId('correction-item-2')).toHaveTextContent('Correction 3')
    })

    it('devrait trimmer les espaces en début et fin de ligne', () => {
      const reviewNote = '  Correction 1  \n  Correction 2  '
      render(<CorrectionsBlockV2 {...defaultProps} reviewNote={reviewNote} />)
      
      expect(screen.getByTestId('correction-item-0')).toHaveTextContent('Correction 1')
      expect(screen.getByTestId('correction-item-1')).toHaveTextContent('Correction 2')
    })
  })
})
