// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { createElement } from 'react'
import { renderToBuffer } from '@react-pdf/renderer'
import Statuts from '@/components/statuts/StatutsKaraPDF'
import Reglement from '@/components/statuts/ReglementInterieurPDF'
import { IdentifiantsMembrePDF } from '@/domains/memberships/components/IdentifiantsMembrePDF'
import { nativePdfLogo } from '../server/pdf-logo'
describe('documents officiels utilisables par l’application native', () => {
  it.each([
    ['statuts', Statuts],
    ['règlement', Reglement],
  ] as const)(
    'génère les %s avec le logo incorporé sans navigateur',
    async (_name, component) => {
      expect(typeof window).toBe('undefined')
      const logoSrc = await nativePdfLogo()
      expect(logoSrc).toMatch(/^data:image\/jpeg;base64,/)
      const bytes = await renderToBuffer(
        createElement<any>(component, { logoSrc }),
      )
      expect(bytes.subarray(0, 5).toString()).toBe('%PDF-')
      expect(bytes.length).toBeGreaterThan(10000)
    },
  )
  it('génère le document d’identifiants temporaires sans téléchargement web', async () => {
    const bytes = await renderToBuffer(
      createElement<any>(IdentifiantsMembrePDF, {
        recipient: 'administrateur',
        data: {
          matricule: 'TEST.MK.1',
          email: 'admin@example.test',
          identifiant: 'admin@example.test',
          motDePasse: 'temporary-test',
        },
      }),
    )
    expect(bytes.subarray(0, 5).toString()).toBe('%PDF-')
  })
})
