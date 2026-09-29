import { renderToBuffer } from '@react-pdf/renderer'
import path from 'path'
import React from 'react'
import { beforeEach, describe, expect, it } from 'vitest'

import AdhesionCreditSpecialeV3, { EMPTY_ADHESION_CREDIT_SPECIALE_FILL_DATA } from '../AdhesionCreditSpecialeV3'
import QuittanceCreditSpecialePDF from '../QuittanceCreditSpecialePDF'

const countPages = (buffer: Buffer): number =>
  Number(buffer.toString('latin1').match(/\/Count (\d+)/)?.[1] ?? 0)

const member = {
  matricule: '7425.MK.210426',
  firstName: 'Alicia',
  lastName: 'MENGUE OKOME',
  birthDate: '1992-10-02',
  identityDocument: 'CNI',
  identityDocumentNumber: 'GA12578655',
  nationality: 'GA',
  address: { district: 'Awoungou' },
  contacts: ['+241 66 76 78 98'],
}

const contract = {
  id: 'MK_CSP_7425_1',
  creditType: 'SPECIALE',
  clientId: 'client-1',
  clientFirstName: 'Alicia',
  clientLastName: 'MENGUE OKOME',
  clientContacts: ['+241 66 76 78 98'],
  guarantorFirstName: 'Jean',
  guarantorLastName: 'OKOME',
  amount: 500_000,
  totalAmount: 600_000,
  interestRate: 5,
  monthlyPaymentAmount: 100_000,
  duration: 7,
  firstPaymentDate: new Date('2026-01-10'),
  disbursementDate: new Date('2026-01-02'),
  dischargedAt: new Date('2026-07-10'),
} as any

describe('documents de crédit', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'location', {
      value: { origin: path.resolve(process.cwd(), 'public') },
      writable: true,
    })
  })

  it('produit la reconnaissance de dette, le protocole et l’acte de cautionnement', async () => {
    const buffer = await renderToBuffer(
      <AdhesionCreditSpecialeV3
        contract={contract}
        memberData={member}
        guarantorData={{ firstName: 'Jean', lastName: 'OKOME', contacts: ['+241 77 00 00 00'] }}
        fillData={{ ...EMPTY_ADHESION_CREDIT_SPECIALE_FILL_DATA, accompanimentType: 'REGULIER' }}
      />,
    )

    expect(buffer.length).toBeGreaterThan(0)
    // Un acte par page au minimum : le protocole et le cautionnement commencent sur une nouvelle page.
    expect(countPages(buffer)).toBeGreaterThanOrEqual(3)
  }, 60_000)

  it('produit le procès-verbal de liquidation du crédit sur une page A4', async () => {
    const buffer = await renderToBuffer(<QuittanceCreditSpecialePDF contract={contract} memberData={member as any} />)

    expect(buffer.length).toBeGreaterThan(0)
    expect(countPages(buffer)).toBe(1)
  }, 60_000)
})
