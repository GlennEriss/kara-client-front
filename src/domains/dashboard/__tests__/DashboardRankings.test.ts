import { describe, expect, it } from 'vitest'
import { buildFinancialReport } from '@/domains/financial/reports/builders/buildFinancialReport'
import type { FinancialReportSources } from '@/domains/financial/reports/entities/financial-report-sources.types'
import type { CreditContract } from '@/types/types'
import { buildDashboardFinancialRankings, buildRecentMembersRanking } from '../services/buildDashboardRankings'

const now = new Date('2026-11-10T12:00:00Z')
const members = [
  { id: 'alice', matricule: 'MK1', firstName: 'Alice', lastName: 'ONDO' },
  { id: 'bob', matricule: 'MK2', firstName: 'Bob', lastName: 'MBA' },
]
const range = { from: new Date('2026-11-01T00:00:00+01:00'), to: new Date('2026-11-10T23:59:59.999+01:00') }
function sources(): FinancialReportSources {
  return {
    caisseSpecialeContracts: [], caisseSpecialePayments: [], caisseSpecialeRefunds: [],
    caisseImprevueContracts: [], caisseImprevuePayments: [], caisseImprevueSupports: [], caisseImprevueRefunds: [],
    creditContracts: [], creditPayments: [], creditPenalties: [], guarantorPayments: [],
    placements: [], placementCommissions: [], placementEarlyExits: [], membershipRequests: [],
  }
}
function rank(s: FinancialReportSources, module: Parameters<typeof buildDashboardFinancialRankings>[2], period = range) {
  return buildDashboardFinancialRankings(s, buildFinancialReport(s, { from: '2026-11', to: '2026-11', now }), module, members, period, now)
}
const credit = (id: string, clientId: string, type: CreditContract['creditType'] = 'FIXE') => ({
  id, clientId, creditType: type, status: 'ACTIVE', amount: 1000, initialAmount: 1000, totalAmount: 1100,
  amountRemaining: 1100, amountPaid: 0, duration: 2, interestRate: 10, monthlyPaymentAmount: 550,
  disbursementDate: new Date('2026-08-01'), createdAt: new Date('2026-08-01'),
  firstPaymentDate: new Date('2026-09-01'), restMonths: [],
}) as unknown as CreditContract

describe('classements financiers du dashboard', () => {
  it('regroupe les contrats et identifiants d’une même personne, avec nom, matricule et lien', () => {
    const s = sources()
    s.caisseSpecialeContracts = [{ id: 'cs1', memberId: 'alice', createdAt: '2026-01-01' }, { id: 'cs2', memberId: 'MK1' }, { id: 'cs3', memberId: 'bob' }]
    s.caisseSpecialePayments = [
      { id: 'a', parentId: 'cs1', status: 'PAID', amount: 40_000, paidAt: '2026-11-02' },
      { id: 'b', parentId: 'cs2', status: 'PAID', amount: 30_000, paidAt: '2026-11-03' },
      { id: 'c', parentId: 'cs3', status: 'PAID', amount: 50_000, paidAt: '2026-11-04' },
    ]
    expect(rank(s, 'caisse_speciale')[0].items).toEqual([
      { id: 'alice', label: 'ONDO Alice', subLabel: 'MK1', href: '/memberships/alice', value: 70_000 },
      { id: 'bob', label: 'MBA Bob', subLabel: 'MK2', href: '/memberships/bob', value: 50_000 },
    ])
  })

  it('filtre les dates des contributions, sans compter deux fois le total du document ou les pénalités', () => {
    const s = sources()
    s.caisseSpecialeContracts = [{ id: 'cs', memberId: 'alice' }]
    s.caisseSpecialePayments = [{ id: 'p', parentId: 'cs', status: 'PAID', amount: 900_000,
      contribs: [{ amount: 10_000, paidAt: '2026-10-31' }, { amount: 20_000, penalty: 500, paidAt: '2026-11-05' }],
      groupContributions: [{ amount: 5_000, createdAt: '2026-11-06' }], updatedAt: '2026-11-06',
    }]
    expect(rank(s, 'caisse_speciale')[0].items[0].value).toBe(25_000)
    expect(rank(s, 'caisse_speciale')[1].items[0].value).toBe(35_000)
  })

  it('lit les versements détaillés et les anciens paiements de caisse imprévue sans cumul supplémentaire', () => {
    const s = sources()
    s.caisseImprevueContracts = [{ id: 'ci', memberId: 'bob' }]
    s.caisseImprevuePayments = [
      { id: 'p1', parentId: 'ci', accumulatedAmount: 30_000, versements: [{ amount: 10_000, date: '2026-10-31' }, { amount: 20_000, createdAt: '2026-11-05' }] },
      { id: 'p2', parentId: 'ci', accumulatedAmount: 5_000, updatedAt: '2026-11-06' },
      { id: 'other', parentId: 'absent', accumulatedAmount: 999_999, updatedAt: '2026-11-06' },
    ]
    expect(rank(s, 'caisse_imprevue')[0].items[0].value).toBe(25_000)
  })

  it('retient dix membres aux montants positifs, dans un ordre stable, sans versements futurs ou non réglés', () => {
    const s = sources()
    s.caisseSpecialeContracts = Array.from({ length: 13 }, (_, i) => ({ id: `c${i}`, memberId: `m${i}` }))
    s.caisseSpecialePayments = s.caisseSpecialeContracts.map((c, i) => ({ id: `p${i}`, parentId: c.id, status: 'PAID', amount: i * 1000, paidAt: '2026-11-05' }))
    s.caisseSpecialePayments.push({ id: 'future', parentId: 'c0', status: 'PAID', amount: 1_000_000, paidAt: '2026-12-01' })
    s.caisseSpecialePayments.push({ id: 'not-paid', parentId: 'c0', status: 'PENDING', amount: 1_000_000, paidAt: '2026-11-05' })
    expect(rank(s, 'caisse_speciale')[0].items.map(i => i.value)).toEqual([12000, 11000, 10000, 9000, 8000, 7000, 6000, 5000, 4000, 3000])
  })

  it('ne limite pas l’épargne actuelle à la période et déduit les remboursements payés', () => {
    const s = sources()
    s.caisseSpecialeContracts = [{ id: 'cs', memberId: 'alice' }]
    s.caisseSpecialePayments = [{ id: 'p', parentId: 'cs', status: 'PAID', amount: 50_000, paidAt: '2026-09-01' }]
    s.caisseSpecialeRefunds = [{ id: 'r', parentId: 'cs', status: 'PAID', withdrawalAmount: 20_000, withdrawalDate: '2026-10-01' }]
    expect(rank(s, 'caisse_speciale')[0].items).toEqual([])
    expect(rank(s, 'caisse_speciale')[1].items[0].value).toBe(30_000)
    expect(rank(s, 'caisse_speciale')[1].description).toContain('à ce jour')
  })

  it('sépare les trois types de crédits, garde les anciens contrats et ouvre la fiche du membre', () => {
    const s = sources()
    s.creditContracts = [credit('cf-alice', 'alice'), credit('cf-bob', 'bob'), credit('aide', 'alice', 'AIDE')]
    s.creditPayments = [
      { id: 'p1', creditId: 'cf-bob', amount: 550, paymentDate: new Date('2026-11-03') },
      { id: 'p2', creditId: 'aide', amount: 900, paymentDate: new Date('2026-11-03') },
    ] as FinancialReportSources['creditPayments']
    const blocks = rank(s, 'credit_fixe')
    expect(blocks[0].items).toMatchObject([{ id: 'bob', value: 550 }])
    expect(blocks[1].items).toMatchObject([{ id: 'alice', value: 1100 }, { id: 'bob', value: 550 }])
    expect(blocks[2]).toMatchObject({ tone: 'danger', items: [
      { id: 'alice', value: 1100, href: '/memberships/alice' },
      { id: 'bob', value: 550, href: '/memberships/bob' },
    ] })
    expect(rank(s, 'credit_aide')[0].items[0].value).toBe(900)
  })

  it('classe les placements par capital reçu et capital restant à rendre, sans ajouter les commissions', () => {
    const s = sources()
    s.placements = [
      { id: 'pl1', benefactorId: 'alice', status: 'Active', amount: 100_000, createdAt: '2026-01-01', handoverDate: '2026-11-02' },
      { id: 'pl2', benefactorId: 'bob', status: 'Closed', amount: 80_000, handoverDate: '2026-10-02', capitalRepaidAt: '2026-11-01', capitalRepaidAmount: 80_000 },
      { id: 'draft', benefactorId: 'bob', status: 'Draft', amount: 1_000_000, handoverDate: '2026-11-02' },
    ]
    const blocks = rank(s, 'placements')
    expect(blocks[0].items).toMatchObject([{ id: 'alice', value: 100_000 }])
    expect(blocks[1].items).toMatchObject([{ id: 'alice', value: 100_000 }])
  })

  it('exclut les dossiers de groupe des tops de membres et distingue les homonymes', () => {
    const s = sources()
    s.caisseSpecialeContracts = [
      { id: 'cs1', groupeId: 'g1', groupName: 'Groupe Espoir' },
      { id: 'cs2', memberId: 'm1', memberName: 'Même nom' },
      { id: 'cs3', memberId: 'm2', memberName: 'Même nom' },
    ]
    s.caisseSpecialePayments = s.caisseSpecialeContracts.map(c => ({ id: `p-${c.id}`, parentId: c.id, status: 'PAID', amount: 5000, paidAt: '2026-11-05' }))
    const items = rank(s, 'caisse_speciale')[0].items
    expect(items).toHaveLength(2)
    expect(items.find(i => i.id === 'group:g1')).toBeUndefined()
    expect(items.filter(i => i.label === 'Même nom').map(i => i.id)).toEqual(['m1', 'm2'])
  })

  it('n’invente aucun gagnant lorsque les données sont absentes', () => {
    for (const block of rank(sources(), 'credit_speciale')) expect(block.items).toEqual([])
  })

  it('additionne les retards des différents contrats d’un même membre', () => {
    const s = sources()
    s.creditContracts = [credit('cf1', 'alice'), credit('cf2', 'MK1')]
    expect(rank(s, 'credit_fixe').find(block => block.key === 'top_late')?.items).toEqual([
      { id: 'alice', label: 'ONDO Alice', value: 2200, subLabel: 'MK1 · 2 contrat(s) en retard', href: '/memberships/alice' },
    ])
  })

  it('présente les dernières souscriptions, dédupliquées par membre et datées dans la période', () => {
    const s = sources()
    s.caisseSpecialeContracts = [
      { id: 'a-old', memberId: 'alice', createdAt: '2026-11-05', status: 'CLOSED' },
      { id: 'a-new', memberId: 'MK1', createdAt: '2026-11-08', status: 'ACTIVE' },
      { id: 'b', memberId: 'bob', createdAt: '2026-11-07', status: 'ACTIVE' },
      { id: 'future', memberId: 'bob', createdAt: '2026-12-01', status: 'ACTIVE' },
      { id: 'draft', memberId: 'bob', createdAt: '2026-11-09', status: 'DRAFT' },
      { id: 'group', groupeId: 'g1', createdAt: '2026-11-09', status: 'ACTIVE' },
    ]
    const recent = rank(s, 'caisse_speciale').find(block => block.key === 'recent_subscribers')!
    expect(recent.kind).toBe('recent')
    expect(recent.items).toMatchObject([
      { id: 'alice', date: '2026-11-08T00:00:00.000Z', subLabel: 'MK1 · Dossier a-new' },
      { id: 'bob', date: '2026-11-07T00:00:00.000Z' },
    ])
    expect(recent.items).toHaveLength(2)
  })

  it('limite aussi les dernières souscriptions à dix membres distincts', () => {
    const s = sources()
    s.placements = Array.from({ length: 12 }, (_, i) => ({ id: `p${i}`, benefactorId: `m${i}`, status: 'Active',
      createdAt: `2026-11-09T${String(i).padStart(2, '0')}:00:00Z` }))
    const recent = rank(s, 'placements').find(block => block.key === 'recent_subscribers')!
    expect(recent.items.map(item => item.id)).toEqual(['m11', 'm10', 'm9', 'm8', 'm7', 'm6', 'm5', 'm4', 'm3', 'm2'])
  })

  it('date les nouveaux membres par leur approbation, sinon par la création de leur fiche', () => {
    const recent = buildRecentMembersRanking([
      { ...members[0], dossier: 'request-a', createdAt: '2026-09-01' },
      { ...members[1], createdAt: '2026-11-09' },
      { id: 'future', createdAt: '2026-12-01' },
      { id: 'missing-date' },
    ], [{ id: 'request-a', status: 'approved', approvedAt: '2026-11-08' }], range, now)
    expect(recent.kind).toBe('recent')
    expect(recent.items).toMatchObject([
      { id: 'bob', date: '2026-11-09T00:00:00.000Z', subLabel: 'MK2 · Fiche membre créée' },
      { id: 'alice', date: '2026-11-08T00:00:00.000Z', subLabel: 'MK1 · Adhésion approuvée' },
    ])
    expect(recent.items).toHaveLength(2)
  })

  it('n’assimile pas la date de création d’une demande en attente à une adhésion approuvée', () => {
    const recent = buildRecentMembersRanking([{ ...members[0], createdAt: '2026-09-01' }], [
      { id: 'request', matricule: 'MK1', status: 'pending', approvedAt: '2026-11-08' },
    ], range, now)
    expect(recent.items).toEqual([])
  })
})
