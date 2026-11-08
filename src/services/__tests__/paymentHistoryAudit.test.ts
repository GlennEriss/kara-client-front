import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type jsPDF from 'jspdf'
import type { CommissionPaymentPlacement, ContractCI, PaymentCI, Placement, SupportCI, User } from '@/types/types'
import { generateSingleVersementPDF } from '../caisse/versementPdfExport'
import { generateSingleVersementCIPDF } from '../caisse-imprevue/generateSingleVersementCIPDF'
import { generateSupportHistoryCIPDF } from '../caisse-imprevue/generateSupportHistoryCIPDF'
import { buildPlacementFacturePage1Data, generatePlacementFacturePDF, hasRecordedPlacementCommission, mapCommissionToPlacementVersement } from '../placement/facturePlacementPdfExport'

const captured = vi.hoisted(() => [] as Array<{ doc: jsPDF; positions: { text: unknown; y: number }[] }>)
vi.mock('jspdf', async (importOriginal) => {
  const actual = await importOriginal<typeof import('jspdf')>()
  return { ...actual, jsPDF: vi.fn((...args: ConstructorParameters<typeof actual.jsPDF>) => {
    const doc = new actual.jsPDF(...args)
    const positions: { text: unknown; y: number }[] = []
    const text = doc.text.bind(doc)
    vi.spyOn(doc, 'text').mockImplementation(((...params: Parameters<typeof doc.text>) => {
      positions.push({ text: params[0], y: Number(params[2]) })
      return text(...params)
    }) as typeof doc.text)
    vi.spyOn(doc, 'save').mockReturnValue(doc)
    captured.push({ doc, positions })
    return doc
  }) }
})

const member = { matricule: 'member-test', lastName: 'TEST', firstName: 'MEMBRE', address: { district: 'Akébé', additionalInfo: 'Entremetteur: PHIL' } } as User
const contract = { id: 'ci-test', memberId: 'member-test', firstPaymentDate: '2026-08-01', paymentFrequency: 'DAILY', subscriptionCIDuration: 12, subscriptionCIAmountPerMonth: 30_000, status: 'ACTIVE', memberAddress: 'Province, Ville, Quartier' } as unknown as ContractCI
const payment = (count: number) => ({ id: 'month-0', monthIndex: 0, targetAmount: 30_000, accumulatedAmount: count * 500, status: 'PARTIAL', versements: Array.from({ length: count }, (_, i) => ({ id: `v${i}`, date: '2026-08-10', time: `08:${String(i).padStart(2, '0')}`, amount: 500, mode: 'cash' })) }) as PaymentCI
const placement = { id: 'placement-test', benefactorId: 'member-test', amount: 1_000_000, rate: 10 } as Placement

describe('audit des autres historiques PDF', () => {
  beforeEach(() => { captured.length = 0; vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false })) })
  afterEach(() => vi.unstubAllGlobals())

  it('CS quotidienne : exporte les deux versements du même jour sans journées fictives à zéro', async () => {
    const p = { dueMonthIndex: 0, status: 'DUE', dueAt: new Date('2026-08-30'), contribs: [{ amount: 1_111, paidAt: new Date('2026-08-10'), time: '09:11', mode: 'cash' }, { amount: 2_222, paidAt: new Date('2026-08-10'), time: '17:22', mode: 'cash' }] }
    await generateSingleVersementPDF({ contract: { id: 'cs-test', caisseType: 'JOURNALIERE', contractStartAt: new Date('2026-08-01') }, contractId: 'cs-test', member, group: null, payments: [p], payment: p, getAdminDisplayName: () => '-' })
    const pdf = captured[0].doc.output()
    expect(pdf).toContain('1 111 FCFA')
    expect(pdf).toContain('2 222 FCFA')
    expect(pdf).toContain('3 333 FCFA')
    expect(pdf).toContain('09:11')
    expect(pdf).toContain('17:22')
    expect(pdf).not.toContain('NON CONFORME')
    expect(captured[0].doc.getNumberOfPages()).toBe(2)
  })

  it('CI quotidienne : conserve les deux remises du même jour', async () => {
    await generateSingleVersementCIPDF(contract, payment(2), { contractId: contract.id, member, getAdminDisplayName: () => '-' })
    const pdf = captured[0].doc.output()
    expect(pdf).toContain('08:00')
    expect(pdf).toContain('08:01')
    expect(pdf).toContain('1 000 FCFA')
    expect(pdf).toContain('Ak')
    expect(pdf).not.toContain('Entremetteur')
    expect(pdf).not.toContain('NON CONFORME')
    expect(captured[0].doc.getNumberOfPages()).toBe(2)
  })

  it('CI mensuelle : pagine 45 remises sans perdre la dernière ni dépasser le pied de page', async () => {
    await generateSingleVersementCIPDF({ ...contract, paymentFrequency: 'MONTHLY' }, payment(45), { contractId: contract.id, member, getAdminDisplayName: () => '-' })
    const { doc, positions } = captured[0]
    expect(doc.getNumberOfPages()).toBeGreaterThan(2)
    expect(doc.output()).toContain('08:44')
    expect(doc.output()).toContain('22 500 FCFA')
    const bodyPositions = positions.filter(p => !(typeof p.text === 'string' && p.text.startsWith('Page ')))
    expect(bodyPositions.every(p => p.y < doc.internal.pageSize.getHeight() - 17)).toBe(true)
  })

  it('CI : refuse un reçu sans versement enregistré', async () => {
    await expect(generateSingleVersementCIPDF(contract, payment(0), { contractId: contract.id, getAdminDisplayName: () => '-' })).rejects.toThrow('Aucun versement')
    expect(captured).toHaveLength(0)
  })

  it('aides CI : les demandes en attente et refusées ne deviennent pas des aides versées', async () => {
    const supports = [
      { id: 'active', amount: 12_345, amountRepaid: 0, amountRemaining: 12_345, status: 'ACTIVE', requestedAt: new Date('1997-01-01') },
      { id: 'pending', amount: 98_765, status: 'PENDING_ADMIN' },
      { id: 'rejected', amount: 87_654, status: 'REJECTED' },
    ] as SupportCI[]
    await generateSupportHistoryCIPDF(contract, supports, { contractId: contract.id, member })
    const pdf = captured[0].doc.output()
    expect(pdf).toContain('12 345 FCFA')
    expect(pdf).not.toContain('98 765')
    expect(pdf).not.toContain('87 654')
    expect(pdf).not.toContain('1997')
  })

  it('placements : le quartier ne reprend pas les notes d’import', () => {
    expect(buildPlacementFacturePage1Data(placement, member).memberQuarter).toBe('Akébé')
    expect(buildPlacementFacturePage1Data(placement, { ...member, address: undefined }).memberQuarter).toBe('Non renseigné')
  })

  it('placements : conserve le montant partiellement payé sans le confondre avec la commission prévue', () => {
    const commission = { id: 'partial', amount: 10_000, paidAmount: 4_000, status: 'Partial', dueDate: new Date('2026-08-10') } as CommissionPaymentPlacement
    const result = mapCommissionToPlacementVersement({ placement, commission })
    expect(hasRecordedPlacementCommission(commission)).toBe(true)
    expect(result.amount).toBe(4_000)
    expect(result.commissionAmount).toBe(10_000)
    expect(result.comment).toContain('partiellement')
    expect(() => mapCommissionToPlacementVersement({ placement, commission: { ...commission, status: 'Due', paidAmount: undefined } })).toThrow('Aucun versement')
  })

  it('placements : ne remplace pas une date de paiement absente par la date d’échéance', async () => {
    const commission = { id: 'paid', amount: 10_000, status: 'Paid', dueDate: new Date('2026-08-10') } as CommissionPaymentPlacement
    await generatePlacementFacturePDF({ page1Data: buildPlacementFacturePage1Data(placement, member), versements: [mapCommissionToPlacementVersement({ placement, commission })], filename: 'test.pdf' })
    expect(captured[0].doc.output()).toContain('VERSEMENT DU: -')
  })
})
