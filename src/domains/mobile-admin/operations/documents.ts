import { nativePdfLogo } from '../server/pdf-logo'
import { z } from 'zod'
import sharp from 'sharp'
import { field } from '@/domains/finance/actions'
import { createElement } from 'react'
import { renderToBuffer } from '@react-pdf/renderer'
import StatutsPDF from '@/components/statuts/StatutsKaraPDF'
import ReglementPDF from '@/components/statuts/ReglementInterieurPDF'
import { STATUTS_VERSION } from '@/constantes/statuts-kara'
import { REGLEMENT_VERSION } from '@/constantes/reglement-interieur'
import {
  textField,
  dateField,
  fileField,
  boolField,
} from '@/domains/finance/actions'
import type { AdminModule } from '../catalog'
import { actor, type AdminAction, type AdminContext } from '../server/registry'
const signatureField = (key: string, label: string) =>
  field(
    key,
    label,
    'signature',
    z
      .array(
        z
          .array(
            z
              .object({
                x: z.number().finite().min(0).max(300),
                y: z.number().finite().min(0).max(180),
              })
              .strict(),
          )
          .max(5000),
      )
      .max(200)
      .optional(),
  )
async function fill(ctx: AdminContext, data: any) {
  const result = {
    lieu: data.lieu || '',
    date: data.date || '',
    secretaireNom: data.secretaireNom || '',
    conseillerNom: data.conseillerNom || '',
    secretaireSignature: ctx.row.secretaireSignature || null,
    conseillerSignature: ctx.row.conseillerSignature || null,
  }
  for (const key of ['secretaireSignature', 'conseillerSignature'] as const) {
    if (ctx.files[key]) {
      const f = ctx.files[key]
      if (
        !['image/png', 'image/jpeg', 'image/webp'].includes(f.type) ||
        f.size > 1024 * 1024
      )
        throw Error('Les signatures doivent être des images de moins de 1 Mo.')
      result[key] =
        `data:${f.type};base64,${Buffer.from(await f.arrayBuffer()).toString('base64')}`
    }
    const strokes = data[key + 'Drawing'] as
      { x: number; y: number }[][] | undefined
    if (strokes?.some((s) => s.length > 1)) {
      if (strokes.reduce((n, s) => n + s.length, 0) > 5000)
        throw Error('Signature trop détaillée.')
      const paths = strokes
        .filter((s) => s.length > 1)
        .map(
          (s) =>
            `<polyline points="${s.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ')}"/>`,
        )
        .join('')
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="360" viewBox="0 0 300 180"><g fill="none" stroke="#234D65" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${paths}</g></svg>`
      result[key] =
        'data:image/png;base64,' +
        (await sharp(Buffer.from(svg)).png().toBuffer()).toString('base64')
    }
    if (data['clear' + key]) result[key] = null
  }
  return result
}
export function documentActions(module: AdminModule): AdminAction[] {
  if (module.key !== 'documents') return []
  const fields = [
    textField('lieu', 'Lieu d’adoption', false),
    {
      ...dateField('date', 'Date d’adoption'),
      required: false,
      schema: dateField('date', 'Date d’adoption').schema.optional(),
    },
    textField('secretaireNom', 'Secrétaire exécutif', false),
    textField('conseillerNom', 'Conseiller juridique', false),
    signatureField(
      'secretaireSignatureDrawing',
      'Tracer la signature du secrétaire',
    ),
    {
      ...fileField(
        'secretaireSignature',
        'Importer la signature du secrétaire exécutif',
        false,
      ),
      accept: ['image/png', 'image/jpeg', 'image/webp'],
      maxBytes: 1024 * 1024,
    },
    boolField('clearsecretaireSignature', 'Effacer la signature du secrétaire'),
    signatureField(
      'conseillerSignatureDrawing',
      'Tracer la signature du conseiller',
    ),
    {
      ...fileField(
        'conseillerSignature',
        'Importer la signature du conseiller juridique',
        false,
      ),
      accept: ['image/png', 'image/jpeg', 'image/webp'],
      maxBytes: 1024 * 1024,
    },
    boolField('clearconseillerSignature', 'Effacer la signature du conseiller'),
  ]
  return [
    {
      id: 'association.preview',
      label: 'Remplir et générer le PDF',
      scope: 'contract',
      permission: 'documents.download',
      fields: [
        ...fields,
        boolField(
          'avecAnnexes',
          'Version de travail avec annexes (statuts seulement)',
        ),
      ],
      readonly: true,
      run: async (ctx, d) => ({
        documents: [
          {
            base64: (
              await renderToBuffer(
                createElement<any>(
                  ctx.id === 'statuts' ? StatutsPDF : ReglementPDF,
                  {
                    fillData: await fill(ctx, d),
                    logoSrc: await nativePdfLogo(),
                    avecAnnexes: ctx.id === 'statuts' && !!d.avecAnnexes,
                  },
                ),
              )
            ).toString('base64'),
            filename: `LE-KARA-${ctx.id}${d.avecAnnexes ? '-travail' : ''}.pdf`,
            mime: 'application/pdf',
          },
        ],
      }),
    },
    {
      id: 'association.publish',
      label: 'Publier la version officielle aux membres',
      scope: 'contract',
      permission: 'documents.download',
      fields,
      run: async (ctx, d) => {
        const id = ctx.id as 'statuts' | 'reglement-interieur'
        await ctx.services.publications.publierDocument(
          id,
          await fill(ctx, d),
          id === 'statuts' ? STATUTS_VERSION : REGLEMENT_VERSION,
          actor(ctx).id,
        )
        return { success: true }
      },
    },
  ]
}
