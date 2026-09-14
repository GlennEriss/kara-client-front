import { describe, it, expect } from 'vitest'
import React from 'react'
import fs from 'fs'
import path from 'path'
import { renderToBuffer } from '@react-pdf/renderer'
import StatutsKaraPDF from '@/components/statuts/StatutsKaraPDF'

const SIG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAQAAAACCAYAAABytg0kAAAAFUlEQVR4AWP8z8Dwn4GKgHHUwFEDAQ+LBQFDvBpRAAAAAElFTkSuQmCC'

describe('tmp', () => {
  it('render', async () => {
    Object.defineProperty(window, 'location', { value: { origin: path.resolve(process.cwd(), 'public') }, writable: true })
    fs.writeFileSync('/tmp/s-vierge.pdf', await renderToBuffer(<StatutsKaraPDF />))
    fs.writeFileSync('/tmp/s-rempli.pdf', await renderToBuffer(
      <StatutsKaraPDF fillData={{ lieu: 'Owendo', date: '2026-03-28', secretaireNom: 'NDONG OBAME Jean Baptiste', secretaireSignature: null, conseillerNom: 'MBOUMBA Marie Claire', conseillerSignature: null }} />
    ))
    expect(1).toBe(1)
  }, 60000)
})
