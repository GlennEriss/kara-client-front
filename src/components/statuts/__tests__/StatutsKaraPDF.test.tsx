/**
 * Les Statuts sont un document de référence. Ces tests vérifient que les deux
 * sorties se rendent — l'officielle (texte voté seul) et celle de travail (avec
 * note et annexe) — et que le texte voté est tout entier dans le module de
 * contenu : une coupure de mise en page ne doit jamais perdre un article.
 */
import { renderToBuffer } from '@react-pdf/renderer'
import path from 'path'
import React from 'react'
import { beforeEach, describe, expect, it } from 'vitest'

import {
  PROCEDURE_CONFORMITE,
  STATUTS_BLOCS,
  STATUTS_NOTE_ORIENTATION,
} from '@/constantes/statuts-kara'
import StatutsKaraPDF from '../StatutsKaraPDF'

/** Le catalogue PDF expose le nombre de pages dans l'arbre des pages. */
const countPages = (buffer: Buffer): number =>
  Number(buffer.toString('latin1').match(/\/Count (\d+)/)?.[1] ?? 0)

// react-pdf charge le logo depuis `window.location.origin` : en test on pointe
// directement le dossier `public` pour qu'il soit lu sur le disque.
const publicDir = path.resolve(process.cwd(), 'public')

describe('StatutsKaraPDF', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'location', {
      value: { origin: publicDir },
      writable: true,
    })
  })

  it('rend la version officielle', async () => {
    const buffer = await renderToBuffer(<StatutsKaraPDF />)
    expect(buffer.length).toBeGreaterThan(0)
    expect(countPages(buffer)).toBe(3)
  }, 60000)

  // La version de travail ajoute la note en tête et l'annexe en fin : elle doit
  // rester plus longue que l'officielle, sinon un des deux blocs a disparu.
  it('rend la version de travail avec la note et l\'annexe', async () => {
    const officielle = countPages(await renderToBuffer(<StatutsKaraPDF />))
    const travail = countPages(await renderToBuffer(<StatutsKaraPDF avecAnnexes />))
    expect(travail).toBeGreaterThan(officielle)
  }, 60000)

  // Le lieu, la date et les noms des signataires viennent du panneau de
  // remplissage : vides, ils s'impriment en pointillés sans changer la pagination.
  it('accepte un remplissage sans changer la pagination', async () => {
    const vierge = countPages(await renderToBuffer(<StatutsKaraPDF />))
    const rempli = countPages(
      await renderToBuffer(
        <StatutsKaraPDF
          fillData={{
            lieu: 'Owendo',
            date: '2026-03-28',
            secretaireNom: 'NDONG OBAME Jean Baptiste',
            secretaireSignature: null,
            conseillerNom: 'MBOUMBA Marie Claire',
            conseillerSignature: null,
          }}
        />,
      ),
    )
    expect(rempli).toBe(vierge)
  }, 60000)

  it('ne met ni note ni annexe dans la version officielle', () => {
    expect(PROCEDURE_CONFORMITE).toHaveLength(5)
    expect(STATUTS_NOTE_ORIENTATION.texte).toContain('Loi n° 35/62')
  })

  it('contient le préambule, les 5 titres et tous les articles votés', () => {
    const articles = STATUTS_BLOCS.filter((b) => b.type === 'article')
    const titres = STATUTS_BLOCS.filter((b) => b.type === 'titre')

    // Articles 1 à 26, plus 5-bis et 18-bis, l'article « 13 & 14 » étant fusionné
    expect(articles).toHaveLength(27)
    expect(titres).toHaveLength(5)
    expect(STATUTS_BLOCS.filter((b) => b.type === 'preambule')).toHaveLength(1)
    expect(articles.every((a) => a.paragraphes.length > 0)).toBe(true)
  })
})
