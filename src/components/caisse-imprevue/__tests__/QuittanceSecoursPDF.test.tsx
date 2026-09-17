/**
 * La quittance de secours est une décharge signée : elle doit tenir sur une
 * seule page, remplie comme vierge — un débordement casserait le bloc de
 * signature en deux pages.
 */
import { renderToBuffer } from '@react-pdf/renderer'
import path from 'path'
import React from 'react'
import { beforeEach, describe, expect, it } from 'vitest'

import QuittanceSecoursPDF, {
  quittanceSecoursFillDataParDefaut,
  type QuittanceSecoursFillData,
} from '../QuittanceSecoursPDF'

// react-pdf charge le logo depuis `window.location.origin` : en test on pointe
// directement le dossier `public` pour qu'il soit lu sur le disque.
const publicDir = path.resolve(process.cwd(), 'public')

/** Le catalogue PDF expose le nombre de pages dans l'arbre des pages. */
const countPages = (buffer: Buffer): number =>
  Number(buffer.toString('latin1').match(/\/Count (\d+)/)?.[1] ?? 0)

const rempli: QuittanceSecoursFillData = {
  ...quittanceSecoursFillDataParDefaut(),
  beneficiaireNom: 'OBIANG MENGUE NDONG EYEGHE Marie-Christelle',
  matricule: '1234.MK.567890',
  cniReceptionnaire: 'CNI-GA-998877665544',
  telephone: '77 12 34 56',
  evenement: 'Décès',
  pieceJustificative: "Acte de décès n° 447/2026 délivré par la Mairie d'Owendo le 12 mars 2026",
  montantChiffres: '30 000',
  montantLettres: 'Trente mille',
  modeReglement: 'Airtel Money / Moov Money',
  lieu: 'Owendo',
  date: '2026-03-28',
}

describe('QuittanceSecoursPDF', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'location', {
      value: { origin: publicDir },
      writable: true,
    })
  })

  it('tient sur une page, document vierge', async () => {
    const buffer = await renderToBuffer(
      <QuittanceSecoursPDF fillData={quittanceSecoursFillDataParDefaut()} />,
    )
    expect(buffer.length).toBeGreaterThan(0)
    expect(countPages(buffer)).toBe(1)
  }, 60000)

  it('tient sur une page, document rempli', async () => {
    expect(countPages(await renderToBuffer(<QuittanceSecoursPDF fillData={rempli} />))).toBe(1)
  }, 60000)
})
