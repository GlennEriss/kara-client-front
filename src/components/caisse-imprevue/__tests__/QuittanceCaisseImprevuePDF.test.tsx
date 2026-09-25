import { renderToBuffer } from '@react-pdf/renderer'
import path from 'path'
import React from 'react'
import { beforeEach, describe, expect, it } from 'vitest'

import QuittanceCaisseImprevuePDF from '../QuittanceCaisseImprevuePDF'

const countPages = (buffer: Buffer): number =>
  Number(buffer.toString('latin1').match(/\/Count (\d+)/)?.[1] ?? 0)

// Le PDF suit la même charte que le règlement intérieur et charge son logo
// depuis `window.location.origin`. En test, on pointe directement sur public.
const publicDir = path.resolve(process.cwd(), 'public')

describe('QuittanceCaisseImprevuePDF', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'location', {
      value: { origin: publicDir },
      writable: true,
    })
  })

  it('produit un procès-verbal de liquidation sur une page A4', async () => {
    const pdf = await renderToBuffer(
      <QuittanceCaisseImprevuePDF
        contract={{
          id: 'CI-2026-0001',
          memberId: '1234.MK.567890',
          memberFirstName: 'Marie-Christelle',
          memberLastName: 'OBIANG MENGUE NDONG EYEGHE',
          memberContacts: ['77 12 34 56'],
          subscriptionCILabel: 'Forfait Solidarité',
          paymentFrequency: 'MONTHLY',
          firstPaymentDate: '2025-03-01',
          contractEndAt: '2026-02-28',
          subscriptionCIDuration: 12,
        }}
        refund={{
          type: 'FINAL',
          status: 'PAID',
          amountNominal: 120_000,
          amountBonus: 6_000,
          withdrawalAmount: 126_000,
          withdrawalMode: 'airtel_money',
          paidAt: '2026-02-28',
        }}
        memberData={{
          matricule: '1234.MK.567890',
          firstName: 'Marie-Christelle',
          lastName: 'OBIANG MENGUE NDONG EYEGHE',
          contacts: ['77 12 34 56'],
          identityDocumentNumber: 'CNI-GA-998877665544',
        }}
        totalAmountPaid={120_000}
      />,
    )

    expect(pdf.length).toBeGreaterThan(0)
    expect(countPages(pdf)).toBe(1)
  }, 60_000)
})
