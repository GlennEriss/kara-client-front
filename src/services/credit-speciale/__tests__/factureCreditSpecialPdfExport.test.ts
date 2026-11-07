import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type jsPDF from 'jspdf'
import type { FactureCreditSpecialPDFData } from '@/components/credit-speciale/FactureCreditSpecialPDF'
import { generateGlobalFactureCreditSpecialPDF, type FactureCreditSpecialPage1Data } from '../factureCreditSpecialPdfExport'

const documents = vi.hoisted(() => [] as jsPDF[])
vi.mock('jspdf', async (importOriginal) => {
  const actual = await importOriginal<typeof import('jspdf')>()
  return {
    ...actual,
    jsPDF: vi.fn((...args: ConstructorParameters<typeof actual.jsPDF>) => {
      const doc = new actual.jsPDF(...args)
      vi.spyOn(doc, 'save').mockReturnValue(doc)
      documents.push(doc)
      return doc
    }),
  }
})

const page1Data = {
  contractId: 'credit-test', memberMatricule: '4953', memberLastName: 'MEMBRE', memberFirstName: 'TEST',
  memberBirthPlace: 'Libreville', memberBirthDateFormatted: '20/07/1999', memberNationality: 'Gabonaise',
  memberIdDocument: '-', memberPhone1: '-', memberPhone2: '-', memberGender: 'HOMME', memberAge: '27 ANS',
  memberQuarter: 'Non renseigné', memberProfession: '-',
  emergencyName: '-', emergencyRelation: '-', emergencyPhone1: '-', emergencyPhone2: '-', emergencyId: '-',
} satisfies FactureCreditSpecialPage1Data

const facture = (month: number): FactureCreditSpecialPDFData => ({
  paymentDate: `2026-${String(month + 8).padStart(2, '0')}-10`, capital: 150_000, taux: 10, interets: 15_000, montantGlobal: 165_000,
  dateEcheance: `2026-${String(month + 7).padStart(2, '0')}-30`, dateRemise: `2026-${String(month + 8).padStart(2, '0')}-10`, heureRemise: '14:00',
  moyen: 'Airtel Money', frais: false, montantRemis: 40_000, penalite: 0, remarque: 'CONFORME', note: 0,
  nouveauCapital1: 125_000, nouveauCapital2: 125_000, capitalMoisProchain: 137_500,
})
describe('PDF global des versements', () => {
  beforeEach(() => {
    documents.length = 0
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }))
  })
  afterEach(() => vi.unstubAllGlobals())

  it('produit uniquement la fiche membre et les deux reçus de versement', async () => {
    await generateGlobalFactureCreditSpecialPDF({
      page1Data, factures: [1, 2].map((month) => ({ factureData: facture(month) })), outputMode: 'save',
    })
    const doc = documents[0]
    const pdf = doc.output()
    expect(doc.getNumberOfPages()).toBe(3)
    expect(pdf.match(/VERSEMENT DU:/g)).toHaveLength(2)
    expect(pdf).not.toContain('IMPAYE')
    expect(pdf).not.toContain('5 500 FCFA')
    expect(pdf).not.toContain('4 167 FCFA')
    expect(pdf).not.toContain('12H00')
    expect(pdf).not.toContain('PENALITE IMPAYEE')
    expect(pdf).toContain('Page 3 sur 3')
  })

  it('ne génère pas d’historique en l’absence de versements', async () => {
    await expect(generateGlobalFactureCreditSpecialPDF({ page1Data, factures: [], outputMode: 'save' }))
      .rejects.toThrow('Aucune facture à générer')
    expect(documents).toHaveLength(0)
  })

  it('numérote correctement un historique de plusieurs reçus', async () => {
    const factures = Array.from({ length: 8 }, () => ({ factureData: facture(1) }))
    await generateGlobalFactureCreditSpecialPDF({ page1Data, factures, outputMode: 'save' })
    const doc = documents[0]
    const total = doc.getNumberOfPages()
    expect(total).toBe(9)
    const pdf = doc.output()
    expect(pdf.match(/VERSEMENT DU:/g)).toHaveLength(8)
    for (let page = 1; page <= total; page++) expect(pdf).toContain(`Page ${page} sur ${total}`)
  })

  it('ne rajoute aucune page de récapitulatif quand il n’y a pas d’impayés', async () => {
    await generateGlobalFactureCreditSpecialPDF({ page1Data: null, factures: [{ factureData: facture(1) }], outputMode: 'save' })
    expect(documents[0].getNumberOfPages()).toBe(1)
    expect(documents[0].output()).not.toContain('PENALITES IMPAYEES')
    expect(documents[0].output()).toContain('Page 1 sur 1')
  })

  it('conserve le reçu d’une pénalité effectivement réglée', async () => {
    const paidPenalty = { ...facture(1), montantRemis: 5_500, penalite: 5_500, remarque: 'Pénalité payée' }
    await generateGlobalFactureCreditSpecialPDF({
      page1Data, factures: [{ factureData: paidPenalty, titleDate: '2026-08-30 - PENALITE PAYEE' }], outputMode: 'save',
    })
    expect(documents[0].getNumberOfPages()).toBe(2)
    expect(documents[0].output()).toContain('PENALITE PAYEE')
    expect(documents[0].output()).toContain('5 500 FCFA')
  })
})
