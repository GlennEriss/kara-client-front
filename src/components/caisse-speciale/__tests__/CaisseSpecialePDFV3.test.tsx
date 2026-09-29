import { renderToBuffer } from '@react-pdf/renderer'
import path from 'path'
import React from 'react'
import { beforeEach, describe, expect, it } from 'vitest'

import CaisseSpecialePDFV3 from '../CaisseSpecialePDFV3'

const publicDir = path.resolve(process.cwd(), 'public')

const countPages = (buffer: Buffer): number =>
  Number(buffer.toString('latin1').match(/\/Count (\d+)/)?.[1] ?? 0)

const member = {
  matricule: '7425.MK.210426',
  firstName: 'Alicia',
  lastName: 'MENGUE OKOME',
  birthDate: '1992-10-02',
  birthPlace: 'Owendo',
  identityDocumentNumber: 'GA12578655',
  nationality: 'GA',
  address: { district: 'Awoungou' },
  profession: 'Commerçante',
  email: 'alicia@example.com',
  contacts: ['+241 66 76 78 98', '+241 77 11 22 33'],
}

const emergencyContact = {
  firstName: 'Jean',
  lastName: 'OKOME',
  relationship: 'Frère',
  phone1: '+241 77 00 00 00',
  idNumber: 'GA123456789',
}

describe('CaisseSpecialePDFV3', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'location', {
      value: { origin: publicDir },
      writable: true,
    })
  })

  it.each([
    ['STANDARD', 150_000],
    ['JOURNALIERE_CHARITABLE', 3_000],
  ])('produit un contrat d’adhésion %s sur une page A4', async (caisseType, monthlyAmount) => {
    const buffer = await renderToBuffer(
      <CaisseSpecialePDFV3
        contract={{
          id: 'MK_CSP_7425_220426_1835',
          memberId: '7425.MK.210426',
          caisseType,
          monthlyAmount,
          monthsPlanned: 12,
          firstPaymentDate: '2026-04-22',
          contractStartAt: '2026-04-22',
          createdAt: '2026-04-22',
          emergencyContact,
          member,
        }}
        fillData={{ memberSignature: null, secretarySignature: null }}
      />,
    )

    expect(buffer.length).toBeGreaterThan(0)
    expect(countPages(buffer)).toBe(1)
  }, 60_000)
})
