import { renderToBuffer } from '@react-pdf/renderer'
import path from 'path'
import React from 'react'
import { beforeEach, describe, expect, it } from 'vitest'

import DemandeRemboursementPDF, { type RefundRequestPdfData } from '../DemandeRemboursementPDF'

const countPages = (buffer: Buffer): number =>
  Number(buffer.toString('latin1').match(/\/Count (\d+)/)?.[1] ?? 0)

const data: RefundRequestPdfData = {
  productLabel: 'Caisse Imprévue',
  type: 'EARLY',
  member: { lastName: 'Mengue', firstName: 'Alicia', matricule: '7425.MK.210426', phone: '+241 66 76 78 98' },
  contract: { id: 'MK_CI_1', formula: 'Forfait A', durationMonths: 12, startDate: '2026-01-01', endDate: '2026-12-31' },
  request: { amount: 60_000, paymentMode: 'Airtel Money', reason: 'Frais médicaux', requestedAt: '2026-06-10' },
}

describe('DemandeRemboursementPDF', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'location', { value: { origin: path.resolve(process.cwd(), 'public') }, writable: true })
  })

  it.each(['EARLY', 'FINAL'] as const)('produit une demande %s sur une page A4', async (type) => {
    const buffer = await renderToBuffer(<DemandeRemboursementPDF data={{ ...data, type }} />)
    expect(countPages(buffer)).toBe(1)
  }, 60_000)
})
