import { renderToBuffer } from '@react-pdf/renderer'
import path from 'path'
import React from 'react'
import { beforeEach, describe, expect, it } from 'vitest'

import QuittanceCaisseSpecialePDF from '../QuittanceCaisseSpecialePDF'

const countPages = (buffer: Buffer): number =>
  Number(buffer.toString('latin1').match(/\/Count (\d+)/)?.[1] ?? 0)

const publicDir = path.resolve(process.cwd(), 'public')

describe('QuittanceCaisseSpecialePDF', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'location', {
      value: { origin: publicDir },
      writable: true,
    })
  })

  it.each([
    ['FINAL', { amountNominal: 1_800_000, amountBonus: 90_000 }],
    ['EARLY', { amountNominal: 600_000, withdrawalAmount: 600_000, withdrawalMode: 'airtel_money' }],
  ])('produit un procès-verbal de liquidation %s sur une page A4', async (type, amounts) => {
    const pdf = await renderToBuffer(
      <QuittanceCaisseSpecialePDF
        contract={{
          id: 'MK_CSP_7425_220426_1835',
          memberId: '7425.MK.210426',
          caisseType: 'STANDARD',
          monthlyAmount: 150_000,
          monthsPlanned: 12,
          contractStartAt: '2025-03-01',
          nominalPaid: amounts.amountNominal,
          member: {
            matricule: '7425.MK.210426',
            firstName: 'Marie-Christelle',
            lastName: 'OBIANG MENGUE NDONG EYEGHE',
            contacts: ['77 12 34 56'],
            identityDocumentNumber: 'CNI-GA-998877665544',
          },
        }}
        refund={{ type, status: 'PAID', processedAt: '2026-02-28', ...amounts }}
      />,
    )

    expect(pdf.length).toBeGreaterThan(0)
    expect(countPages(pdf)).toBe(1)
  }, 60_000)
})
