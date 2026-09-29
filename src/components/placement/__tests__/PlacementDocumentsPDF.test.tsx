import { renderToBuffer } from '@react-pdf/renderer'
import path from 'path'
import React from 'react'
import { beforeEach, describe, expect, it } from 'vitest'

import PlacementContractPDF from '../PlacementContractPDF'
import PlacementFinalQuittancePDF from '../PlacementFinalQuittancePDF'

const countPages = (buffer: Buffer): number =>
  Number(buffer.toString('latin1').match(/\/Count (\d+)/)?.[1] ?? 0)

const placement = {
  id: 'PL_001',
  benefactorId: 'benefactor-1',
  amount: 2_000_000,
  rate: 3,
  periodMonths: 6,
  payoutMode: 'MonthlyCommission_CapitalEnd',
  status: 'Closed',
  startDate: new Date('2026-01-01'),
  endDate: new Date('2026-07-01'),
  urgentContact: { name: 'OKOME', firstName: 'Jean', phone: '+241 77 00 00 00', relationship: 'Frère' },
  createdAt: new Date('2025-12-20'),
  updatedAt: new Date('2025-12-20'),
  createdBy: 'admin',
} as any

const member = {
  matricule: '7425.MK.210426',
  firstName: 'Alicia',
  lastName: 'MENGUE OKOME',
  contacts: ['+241 66 76 78 98'],
} as any

describe('documents de placement', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'location', {
      value: { origin: path.resolve(process.cwd(), 'public') },
      writable: true,
    })
  })

  it('produit le contrat d’adhésion au volet Bienfaiteur sur une page A4', async () => {
    const buffer = await renderToBuffer(<PlacementContractPDF placement={placement} member={member} />)
    expect(countPages(buffer)).toBe(1)
  }, 60_000)

  it('produit le procès-verbal de liquidation du placement sur une page A4', async () => {
    const commissions = [1, 2, 3, 4, 5, 6].map((index) => ({
      id: `commission-${index}`,
      status: 'Paid',
      dueDate: new Date(2026, index, 1),
      amount: 60_000,
      paidAt: new Date(2026, index, 2),
    })) as any
    const buffer = await renderToBuffer(
      <PlacementFinalQuittancePDF
        placement={placement}
        member={member}
        commissions={commissions}
        amountInWords="deux millions trois cent soixante mille"
      />,
    )
    expect(countPages(buffer)).toBe(1)
  }, 60_000)
})

describe('procès-verbal de liquidation anticipée', () => {
  it('se génère sur une page A4, lieu et informations manquantes complétés', async () => {
    const { default: PlacementEarlyExitQuittancePDF } = await import('../PlacementEarlyExitQuittancePDF')
    Object.defineProperty(window, 'location', {
      value: { origin: path.resolve(process.cwd(), 'public') },
      writable: true,
    })
    const buffer = await renderToBuffer(
      <PlacementEarlyExitQuittancePDF
        placement={placement}
        member={member}
        earlyExit={{ id: 'exit-1', placementId: 'PL_001', requestedAt: new Date('2026-03-15'), commissionDue: 60_000, payoutAmount: 2_060_000 } as any}
        commissions={[]}
        completion={{ place: 'Libreville', values: { 'earlyExit.paidDate': '2026-03-20', 'earlyExit.paymentMode': 'Espèces' } }}
      />,
    )
    expect(countPages(buffer)).toBe(1)
  }, 60_000)
})
