/**
 * Tests unitaires pour exportRequestUtils
 * 
 * Tests des fonctions de génération de PDF et Excel pour les demandes d'adhésion
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  generateRequestPDF,
  generateRequestExcel,
} from '../../../utils/exportRequestUtils'
import { createMembershipRequestFixture, pendingPaidRequest } from '../../fixtures'

// Mock de jsPDF
const mockSave = vi.fn()
const mockText = vi.fn()
const mockSetFillColor = vi.fn()
const mockSetTextColor = vi.fn()
const mockSetFontSize = vi.fn()
const mockSetFont = vi.fn()
const mockRect = vi.fn()

const mockJsPDF = vi.fn(() => ({
  text: mockText,
  setFillColor: mockSetFillColor,
  setTextColor: mockSetTextColor,
  setFontSize: mockSetFontSize,
  setFont: mockSetFont,
  rect: mockRect,
  save: mockSave,
  internal: {
    pageSize: {
      height: 297,
    },
  },
}))

vi.mock('jspdf', () => ({
  jsPDF: mockJsPDF,
}))

// Mock de xlsx
const mockWriteFile = vi.fn()
const mockJsonToSheet = vi.fn(() => ({}))
const mockBookNew = vi.fn(() => ({}))
const mockBookAppendSheet = vi.fn()

vi.mock('xlsx', () => ({
  default: {
    utils: {
      json_to_sheet: mockJsonToSheet,
      book_new: mockBookNew,
      book_append_sheet: mockBookAppendSheet,
    },
    writeFile: mockWriteFile,
  },
  utils: {
    json_to_sheet: mockJsonToSheet,
    book_new: mockBookNew,
    book_append_sheet: mockBookAppendSheet,
  },
  writeFile: mockWriteFile,
}))

describe('exportRequestUtils', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ==================== generateRequestPDF ====================
  describe('generateRequestPDF', () => {
    it('devrait créer un document PDF avec jsPDF', async () => {
      const request = createMembershipRequestFixture()

      await generateRequestPDF(request)

      expect(mockJsPDF).toHaveBeenCalledWith('portrait', 'mm', 'a4')
    })

    it('devrait inclure le titre "KARA" dans l\'en-tête', async () => {
      const request = createMembershipRequestFixture()

      await generateRequestPDF(request)

      expect(mockText).toHaveBeenCalledWith('KARA', 20, 20)
    })

    it('devrait inclure le sous-titre "Demande d\'adhésion"', async () => {
      const request = createMembershipRequestFixture()

      await generateRequestPDF(request)

      expect(mockText).toHaveBeenCalledWith('Demande d\'adhésion', 20, 30)
    })

    it('devrait inclure le nom complet du demandeur', async () => {
      const request = createMembershipRequestFixture({
        identity: {
          ...createMembershipRequestFixture().identity,
          firstName: 'Jean',
          lastName: 'Dupont',
        },
      })

      await generateRequestPDF(request)

      expect(mockText).toHaveBeenCalledWith(
        'Nom complet: Jean Dupont',
        20,
        expect.any(Number)
      )
    })

    it('devrait inclure l\'email du demandeur', async () => {
      const request = createMembershipRequestFixture({
        identity: {
          ...createMembershipRequestFixture().identity,
          email: 'jean.dupont@test.com',
        },
      })

      await generateRequestPDF(request)

      expect(mockText).toHaveBeenCalledWith(
        'Email: jean.dupont@test.com',
        20,
        expect.any(Number)
      )
    })

    it('devrait inclure le téléphone du demandeur', async () => {
      const request = createMembershipRequestFixture({
        identity: {
          ...createMembershipRequestFixture().identity,
          contacts: ['+24165671734'],
        },
      })

      await generateRequestPDF(request)

      expect(mockText).toHaveBeenCalledWith(
        'Téléphone: +24165671734',
        20,
        expect.any(Number)
      )
    })

    it('devrait inclure le matricule si présent', async () => {
      const request = createMembershipRequestFixture({
        matricule: 'MK_2025_0001',
      })

      await generateRequestPDF(request)

      expect(mockText).toHaveBeenCalledWith(
        'Matricule: MK_2025_0001',
        20,
        expect.any(Number)
      )
    })

    it('devrait inclure la référence de la demande', async () => {
      const request = createMembershipRequestFixture({
        id: 'REQ-2026-001',
      })

      await generateRequestPDF(request)

      expect(mockText).toHaveBeenCalledWith(
        'Référence demande: REQ-2026-001',
        20,
        expect.any(Number)
      )
    })

    it('devrait inclure le statut du dossier', async () => {
      const request = createMembershipRequestFixture({
        status: 'pending',
      })

      await generateRequestPDF(request)

      expect(mockText).toHaveBeenCalledWith(
        expect.stringContaining('Statut:'),
        20,
        expect.any(Number)
      )
    })

    it('devrait inclure le statut de paiement "Payé"', async () => {
      const request = createMembershipRequestFixture({
        isPaid: true,
      })

      await generateRequestPDF(request)

      expect(mockText).toHaveBeenCalledWith(
        'Paiement: Payé',
        20,
        expect.any(Number)
      )
    })

    it('devrait inclure le statut de paiement "Non payé"', async () => {
      const request = createMembershipRequestFixture({
        isPaid: false,
      })

      await generateRequestPDF(request)

      expect(mockText).toHaveBeenCalledWith(
        'Paiement: Non payé',
        20,
        expect.any(Number)
      )
    })

    it('devrait inclure les détails du paiement si payé', async () => {
      const request = pendingPaidRequest()

      await generateRequestPDF(request)

      expect(mockText).toHaveBeenCalledWith(
        'Détails du paiement',
        20,
        expect.any(Number)
      )
      expect(mockText).toHaveBeenCalledWith(
        expect.stringContaining('Montant:'),
        20,
        expect.any(Number)
      )
    })

    it('devrait sauvegarder le PDF avec un nom de fichier correct', async () => {
      const request = createMembershipRequestFixture({
        id: 'REQ-2026-001',
      })

      await generateRequestPDF(request)

      expect(mockSave).toHaveBeenCalledWith(
        expect.stringMatching(/^demande_REQ-2026-001_\d{8}\.pdf$/)
      )
    })

    it('devrait utiliser "unknown" si id est absent', async () => {
      const request = createMembershipRequestFixture()
      delete (request as any).id

      await generateRequestPDF(request)

      expect(mockSave).toHaveBeenCalledWith(
        expect.stringMatching(/^demande_unknown_\d{8}\.pdf$/)
      )
    })

    it('devrait gérer les dates Firestore Timestamp', async () => {
      const firestoreDate = {
        toDate: () => new Date('2026-01-17T15:00:00'),
      }
      const request = createMembershipRequestFixture({
        createdAt: firestoreDate as any,
      })

      await expect(generateRequestPDF(request)).resolves.not.toThrow()
    })

    it('devrait gérer les valeurs manquantes avec "N/A"', async () => {
      const request = createMembershipRequestFixture({
        identity: {
          ...createMembershipRequestFixture().identity,
          email: undefined as any,
          contacts: [],
          birthDate: undefined as any,
          birthPlace: undefined as any,
          nationality: undefined as any,
        },
        address: {
          province: undefined as any,
          city: undefined as any,
          district: undefined as any,
          arrondissement: undefined as any,
        },
      })

      await generateRequestPDF(request)

      expect(mockText).toHaveBeenCalledWith('Email: N/A', 20, expect.any(Number))
      expect(mockText).toHaveBeenCalledWith('Téléphone: N/A', 20, expect.any(Number))
    })

    it('devrait gérer les paiements avec withFees à false', async () => {
      const request = pendingPaidRequest()
      request.payments![0].withFees = false

      await generateRequestPDF(request)

      expect(mockText).toHaveBeenCalledWith('Frais: Sans frais', 20, expect.any(Number))
    })

    it('devrait gérer les paiements avec withFees à true', async () => {
      const request = pendingPaidRequest()
      request.payments![0].withFees = true

      await generateRequestPDF(request)

      expect(mockText).toHaveBeenCalledWith('Frais: Avec frais', 20, expect.any(Number))
    })

    it('devrait utiliser le statut brut si pas de label', async () => {
      const request = createMembershipRequestFixture({
        status: 'unknown_status' as any,
      })

      await generateRequestPDF(request)

      expect(mockText).toHaveBeenCalledWith(
        expect.stringContaining('unknown_status'),
        20,
        expect.any(Number)
      )
    })

    it('devrait inclure l\'adresse du demandeur', async () => {
      const request = createMembershipRequestFixture({
        address: {
          province: 'Estuaire',
          city: 'Libreville',
          district: 'Centre-Ville',
          arrondissement: '1er Arrondissement',
        },
      })

      await generateRequestPDF(request)

      expect(mockText).toHaveBeenCalledWith(
        expect.stringContaining('Adresse:'),
        20,
        expect.any(Number)
      )
    })

    it('devrait inclure la date de naissance', async () => {
      const request = createMembershipRequestFixture({
        identity: {
          ...createMembershipRequestFixture().identity,
          birthDate: '1990-05-15',
        },
      })

      await generateRequestPDF(request)

      expect(mockText).toHaveBeenCalledWith(
        'Date de naissance: 1990-05-15',
        20,
        expect.any(Number)
      )
    })

    it('devrait inclure le lieu de naissance', async () => {
      const request = createMembershipRequestFixture({
        identity: {
          ...createMembershipRequestFixture().identity,
          birthPlace: 'Libreville',
        },
      })

      await generateRequestPDF(request)

      expect(mockText).toHaveBeenCalledWith(
        'Lieu de naissance: Libreville',
        20,
        expect.any(Number)
      )
    })

    it('devrait inclure la nationalité', async () => {
      const request = createMembershipRequestFixture({
        identity: {
          ...createMembershipRequestFixture().identity,
          nationality: 'GA',
        },
      })

      await generateRequestPDF(request)

      expect(mockText).toHaveBeenCalledWith(
        'Nationalité: GA',
        20,
        expect.any(Number)
      )
    })
  })

  // ==================== generateRequestExcel ====================
  describe('generateRequestExcel', () => {
    it('devrait créer un workbook Excel', async () => {
      const request = createMembershipRequestFixture()

      await generateRequestExcel(request)

      expect(mockBookNew).toHaveBeenCalled()
    })

    it('devrait convertir les données en feuille Excel', async () => {
      const request = createMembershipRequestFixture()

      await generateRequestExcel(request)

      expect(mockJsonToSheet).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            'Prénom': expect.any(String),
            'Nom': expect.any(String),
          }),
        ])
      )
    })

    it('devrait ajouter la feuille au workbook', async () => {
      const request = createMembershipRequestFixture()

      await generateRequestExcel(request)

      expect(mockBookAppendSheet).toHaveBeenCalledWith(
        expect.any(Object),
        expect.any(Object),
        'Demande'
      )
    })

    it('devrait sauvegarder le fichier Excel avec un nom correct', async () => {
      const request = createMembershipRequestFixture({
        id: 'REQ-2026-001',
      })

      await generateRequestExcel(request)

      expect(mockWriteFile).toHaveBeenCalledWith(
        expect.any(Object),
        expect.stringMatching(/^demande_REQ-2026-001_\d{8}\.xlsx$/)
      )
    })

    it('devrait inclure la référence de la demande', async () => {
      const request = createMembershipRequestFixture({
        id: 'REQ-2026-001',
      })

      await generateRequestExcel(request)

      expect(mockJsonToSheet).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            'Référence demande': 'REQ-2026-001',
          }),
        ])
      )
    })

    it('devrait inclure le matricule', async () => {
      const request = createMembershipRequestFixture({
        matricule: 'MK_2025_0001',
      })

      await generateRequestExcel(request)

      expect(mockJsonToSheet).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            'Matricule': 'MK_2025_0001',
          }),
        ])
      )
    })

    it('devrait inclure les informations d\'identité', async () => {
      const request = createMembershipRequestFixture({
        identity: {
          ...createMembershipRequestFixture().identity,
          civility: 'Monsieur',
          firstName: 'Jean',
          lastName: 'Dupont',
          email: 'jean@test.com',
          contacts: ['+24165671734'],
        },
      })

      await generateRequestExcel(request)

      expect(mockJsonToSheet).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            'Civilité': 'Monsieur',
            'Prénom': 'Jean',
            'Nom': 'Dupont',
            'Email': 'jean@test.com',
            'Téléphone': '+24165671734',
          }),
        ])
      )
    })

    it('devrait inclure l\'adresse', async () => {
      const request = createMembershipRequestFixture({
        address: {
          province: 'Estuaire',
          city: 'Libreville',
          district: 'Centre-Ville',
          arrondissement: '1er Arrondissement',
        },
      })

      await generateRequestExcel(request)

      expect(mockJsonToSheet).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            'Province': 'Estuaire',
            'Ville': 'Libreville',
            'Quartier': 'Centre-Ville',
            'Arrondissement': '1er Arrondissement',
          }),
        ])
      )
    })

    it('devrait inclure les informations de l\'entreprise', async () => {
      const request = createMembershipRequestFixture({
        company: {
          isEmployed: true,
          companyName: 'Test Corp',
          profession: 'Ingénieur',
          seniority: '5 ans',
        },
      })

      await generateRequestExcel(request)

      expect(mockJsonToSheet).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            'Entreprise': 'Test Corp',
            'Profession': 'Ingénieur',
            'Expérience': '5 ans',
          }),
        ])
      )
    })

    it('devrait inclure le statut du dossier', async () => {
      const request = createMembershipRequestFixture({
        status: 'pending',
      })

      await generateRequestExcel(request)

      expect(mockJsonToSheet).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            'Statut dossier': expect.any(String),
          }),
        ])
      )
    })

    it('devrait inclure le statut de paiement "Payé"', async () => {
      const request = createMembershipRequestFixture({
        isPaid: true,
      })

      await generateRequestExcel(request)

      expect(mockJsonToSheet).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            'Statut paiement': 'Payé',
          }),
        ])
      )
    })

    it('devrait inclure le statut de paiement "Non payé"', async () => {
      const request = createMembershipRequestFixture({
        isPaid: false,
      })

      await generateRequestExcel(request)

      expect(mockJsonToSheet).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            'Statut paiement': 'Non payé',
          }),
        ])
      )
    })

    it('devrait inclure les détails du paiement si payé', async () => {
      const request = pendingPaidRequest()

      await generateRequestExcel(request)

      expect(mockJsonToSheet).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            'Montant paiement': expect.any(Number),
            'Mode paiement': expect.any(String),
          }),
        ])
      )
    })

    it('devrait gérer les dates Firestore Timestamp', async () => {
      const firestoreDate = {
        toDate: () => new Date('2026-01-17T15:00:00'),
      }
      const request = createMembershipRequestFixture({
        createdAt: firestoreDate as any,
      })

      await expect(generateRequestExcel(request)).resolves.not.toThrow()
    })

    it('devrait inclure les informations de document', async () => {
      const request = createMembershipRequestFixture({
        documents: {
          identityDocument: 'CNI',
          identityDocumentNumber: '1234567890',
          expirationDate: '2030-01-15',
          issuingPlace: 'Libreville',
          issuingDate: '2020-01-15',
          termsAccepted: true,
        },
      })

      await generateRequestExcel(request)

      expect(mockJsonToSheet).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            'Type pièce identité': 'CNI',
            'Numéro pièce identité': '1234567890',
            'Date expiration': '2030-01-15',
          }),
        ])
      )
    })

    it('devrait utiliser "unknown" si id est absent', async () => {
      const request = createMembershipRequestFixture()
      delete (request as any).id

      await generateRequestExcel(request)

      expect(mockWriteFile).toHaveBeenCalledWith(
        expect.any(Object),
        expect.stringMatching(/^demande_unknown_\d{8}\.xlsx$/)
      )
    })

    it('devrait gérer les valeurs manquantes avec des chaînes vides', async () => {
      const request = createMembershipRequestFixture({
        matricule: undefined as any,
        identity: {
          ...createMembershipRequestFixture().identity,
          civility: undefined as any,
          firstName: undefined as any,
          lastName: undefined as any,
          email: undefined as any,
          contacts: [],
          gender: undefined as any,
          maritalStatus: undefined as any,
          birthDate: undefined as any,
          birthPlace: undefined as any,
          nationality: undefined as any,
        },
        address: {
          province: undefined as any,
          city: undefined as any,
          district: undefined as any,
          arrondissement: undefined as any,
          additionalInfo: undefined as any,
        },
        company: {
          isEmployed: false,
          companyName: undefined as any,
          profession: undefined as any,
          seniority: undefined as any,
        },
        documents: {
          identityDocument: undefined as any,
          identityDocumentNumber: undefined as any,
          expirationDate: undefined as any,
          issuingPlace: undefined as any,
          issuingDate: undefined as any,
          termsAccepted: true,
        },
      })

      await generateRequestExcel(request)

      expect(mockJsonToSheet).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            'Matricule': '',
            'Civilité': '',
            'Prénom': '',
            'Nom': '',
            'Email': '',
            'Téléphone': '',
          }),
        ])
      )
    })

    it('devrait gérer les paiements avec withFees undefined', async () => {
      const request = pendingPaidRequest()
      delete (request.payments![0] as any).withFees

      await generateRequestExcel(request)

      expect(mockJsonToSheet).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            'Frais': '',
          }),
        ])
      )
    })

    it('devrait utiliser le type/mode brut si pas de label', async () => {
      const request = pendingPaidRequest()
      request.payments![0].paymentType = 'UnknownType' as any
      request.payments![0].mode = 'unknown_mode' as any

      await generateRequestExcel(request)

      expect(mockJsonToSheet).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            'Type paiement': 'UnknownType',
            'Mode paiement': 'unknown_mode',
          }),
        ])
      )
    })
  })
})
