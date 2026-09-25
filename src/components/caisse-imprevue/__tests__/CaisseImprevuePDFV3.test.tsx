import { renderToBuffer } from '@react-pdf/renderer'
import path from 'path'
import React from 'react'
import { beforeEach, describe, expect, it } from 'vitest'

import CaisseImprevuePDFV3 from '../CaisseImprevuePDFV3'

const publicDir = path.resolve(process.cwd(), 'public')

const countPages = (buffer: Buffer): number =>
  Number(buffer.toString('latin1').match(/\/Count (\d+)/)?.[1] ?? 0)

describe('CaisseImprevuePDFV3', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'location', {
      value: { origin: publicDir },
      writable: true,
    })
  })

  it('produit un contrat d’adhésion CI sur une page A4', async () => {
    const buffer = await renderToBuffer(
      <CaisseImprevuePDFV3
        contract={{
          id: 'MK_CI_CONTRACT_7425.MK.210426_220426_1835',
          memberId: '7425.MK.210426',
          memberFirstName: 'Alicia',
          memberLastName: 'MENGUE OKOME',
          memberContacts: ['+241 66 76 78 98'],
          memberEmail: 'alicia@example.com',
          memberBirthDate: '1992-10-02',
          memberNationality: 'Gabonaise',
          memberAddress: 'Awoungou',
          memberProfession: 'Commerçante',
          subscriptionCICode: 'FORFAIT-A',
          subscriptionCILabel: 'Forfait A',
          subscriptionCIAmountPerMonth: 10_000,
          subscriptionCINominal: 50_000,
          subscriptionCIDuration: 5,
          paymentFrequency: 'DAILY',
          firstPaymentDate: '2026-04-22',
          createdAt: '2026-04-22',
          emergencyContact: {
            firstName: 'Jean',
            lastName: 'OKOME',
            relationship: 'Frère',
            phone1: '+241 77 00 00 00',
            idNumber: 'GA123456789',
          },
          member: {
            firstName: 'Alicia',
            lastName: 'MENGUE OKOME',
            birthDate: '1992-10-02',
            birthPlace: 'Owendo',
            identityDocumentNumber: 'GA12578655',
            nationality: 'Gabonaise',
            address: { district: 'Awoungou' },
            profession: 'Commerçante',
            email: 'alicia@example.com',
            contacts: ['+241 66 76 78 98'],
          },
        } as any}
        fillData={{ memberSignature: null, secretarySignature: null }}
      />,
    )

    expect(buffer.length).toBeGreaterThan(0)
    expect(countPages(buffer)).toBe(1)
  }, 60_000)
})
