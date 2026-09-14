import { describe, it, expect } from 'vitest'
import React from 'react'
import fs from 'fs'
import path from 'path'
import { renderToBuffer } from '@react-pdf/renderer'
import ReglementInterieurPDF from '@/components/statuts/ReglementInterieurPDF'

describe('tmp', () => {
  it('render', async () => {
    Object.defineProperty(window, 'location', { value: { origin: path.resolve(process.cwd(), 'public') }, writable: true })
    fs.writeFileSync('/tmp/ri.pdf', await renderToBuffer(<ReglementInterieurPDF />))
    fs.writeFileSync('/tmp/ri-plein.pdf', await renderToBuffer(<ReglementInterieurPDF fillData={{ lieu: 'Owendo (Awoungou)', date: '2026-03-28', secretaireNom: 'NDONG OBAME Jean Baptiste', secretaireSignature: null, conseillerNom: 'MBOUMBA Marie Claire', conseillerSignature: null }} />))
    expect(1).toBe(1)
  }, 60000)
})
