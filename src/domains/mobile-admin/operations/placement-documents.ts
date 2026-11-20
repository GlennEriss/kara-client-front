import { createElement } from 'react'
import { renderToBuffer } from '@react-pdf/renderer'
import PlacementContract, {
  listPlacementContractFields,
} from '@/components/placement/PlacementContractPDF'
import PlacementFinal, {
  listPlacementLiquidationFields,
} from '@/components/placement/PlacementFinalQuittancePDF'
import PlacementEarly, {
  listPlacementEarlyExitFields,
} from '@/components/placement/PlacementEarlyExitQuittancePDF'
import {
  missingDocumentFields,
  type DocumentField,
} from '@/components/pdf/mutuelle/MutuelleDocumentKit'
import { idField, textField } from '@/domains/finance/actions'
import { rows, select, type AdminModule, type Dataset } from '../catalog'
import type { AdminAction, AdminContext } from '../server/registry'
import type { AdminServices } from '../server/context'
import { nativePdfLogo } from '../server/pdf-logo'
export async function placementDocumentData(
  services: AdminServices,
  id: string,
) {
  const placement = await services.placementService.getPlacement(id)
  if (!placement) throw Error('Placement introuvable.')
  const member = await services.members.getMemberById(placement.benefactorId)
  const commissions = await services.placementService.listCommissions(id)
  const earlyExit = await services.placementService.getEarlyExit(id)
  return { placement, member, commissions, earlyExit, amountInWords: '' }
}
export function placementFields(
  data: Awaited<ReturnType<typeof placementDocumentData>>,
  type: string,
): DocumentField[] {
  return missingDocumentFields(
    type === 'contract'
      ? listPlacementContractFields(data)
      : type === 'quittance'
        ? listPlacementLiquidationFields(data)
        : data.earlyExit
          ? listPlacementEarlyExitFields({ ...data, earlyExit: data.earlyExit })
          : [],
  )
}
export function placementDocumentActions(
  module: AdminModule,
  dataset: Dataset,
): AdminAction[] {
  if (module.key !== 'placements' || dataset.key !== 'contracts') return []
  return [
    {
      id: 'placement.document.complete',
      label: 'Compléter et générer un document PDF',
      permission: 'documents.download',
      scope: 'contract',
      readonly: true,
      fields: [
        select('documentType', 'Document', [
          'contract',
          'quittance',
          'early-quittance',
        ]),
        textField('place', 'Lieu de signature', false),
        rows(
          'values',
          'Informations manquantes à compléter',
          [
            idField('key', 'Information', 'documentFields'),
            {
              ...textField('value', 'Valeur (dates au format AAAA-MM-JJ)'),
              help: 'Renseignez uniquement les informations manquantes que vous souhaitez ajouter au document.',
            },
          ],
          true,
        ),
      ],
      run: async (ctx: AdminContext, d) => {
        const data = await placementDocumentData(ctx.services, ctx.id)
        if (d.documentType === 'early-quittance' && !data.earlyExit)
          throw Error('Aucun retrait anticipé enregistré.')
        const fields = placementFields(data, d.documentType)
        for (const value of d.values || []) {
          const f = fields.find((f) => f.key === value.key)
          if (!f)
            throw Error(
              'Cette information n’est pas manquante dans le document choisi.',
            )
          if (
            f.type === 'date' &&
            (!/^\d{4}-\d{2}-\d{2}$/.test(value.value) ||
              Number.isNaN(new Date(value.value).getTime()))
          )
            throw Error(`Vérifiez la date « ${f.label} ».`)
        }
        const component =
          d.documentType === 'contract'
            ? PlacementContract
            : d.documentType === 'quittance'
              ? PlacementFinal
              : PlacementEarly
        const buffer = await renderToBuffer(
          createElement<any>(component, {
            ...data,
            completion: {
              place: d.place || '',
              values: Object.fromEntries(
                (d.values || []).map((v: any) => [v.key, v.value]),
              ),
            },
            logoSrc: await nativePdfLogo(),
          }),
        )
        return {
          documents: [
            {
              filename: `LE-KARA-${d.documentType}-${ctx.id}.pdf`,
              mime: 'application/pdf',
              base64: buffer.toString('base64'),
            },
          ],
        }
      },
    },
  ]
}
