/**
 * Le Règlement Intérieur est un document de référence : ces tests vérifient
 * qu'il se rend entièrement, que le remplissage ne change pas la pagination, et
 * que les deux grilles réglementaires (cotisations, prestations) sont bien au
 * complet dans le module de contenu — une coupure de mise en page ne doit
 * jamais faire disparaître une ligne de barème.
 */
import { renderToBuffer } from '@react-pdf/renderer'
import path from 'path'
import React from 'react'
import { beforeEach, describe, expect, it } from 'vitest'

import {
  GRILLE_CONTRIBUTIONS,
  GRILLE_PRESTATIONS,
  REGLEMENT_BLOCS,
} from '@/constantes/reglement-interieur'
import ReglementInterieurPDF from '../ReglementInterieurPDF'

// react-pdf charge le logo depuis `window.location.origin` : en test on pointe
// directement le dossier `public` pour qu'il soit lu sur le disque.
const publicDir = path.resolve(process.cwd(), 'public')

/** Le catalogue PDF expose le nombre de pages dans l'arbre des pages. */
const countPages = (buffer: Buffer): number =>
  Number(buffer.toString('latin1').match(/\/Count (\d+)/)?.[1] ?? 0)

describe('ReglementInterieurPDF', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'location', {
      value: { origin: publicDir },
      writable: true,
    })
  })

  it('rend le document complet', async () => {
    const buffer = await renderToBuffer(<ReglementInterieurPDF />)
    expect(buffer.length).toBeGreaterThan(0)
    expect(countPages(buffer)).toBeGreaterThanOrEqual(4)
  }, 60000)

  it('accepte un remplissage sans changer la pagination', async () => {
    const vierge = countPages(await renderToBuffer(<ReglementInterieurPDF />))
    const rempli = countPages(
      await renderToBuffer(
        <ReglementInterieurPDF
          fillData={{
            lieu: 'Owendo (Awoungou)',
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

  it('contient les 18 articles, les 7 titres et les deux grilles', () => {
    expect(REGLEMENT_BLOCS.filter((b) => b.type === 'article')).toHaveLength(18)
    expect(REGLEMENT_BLOCS.filter((b) => b.type === 'titre')).toHaveLength(7)
    expect(REGLEMENT_BLOCS.filter((b) => b.type === 'preambule')).toHaveLength(1)

    // Niveaux A à E, et les 6 événements sociaux du barème
    expect(GRILLE_CONTRIBUTIONS).toHaveLength(5)
    expect(GRILLE_PRESTATIONS).toHaveLength(6)
  })
})
