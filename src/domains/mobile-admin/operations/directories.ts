import { districtBulkCreateSchema } from '@/domains/infrastructure/geography/schemas/geographie.schema'
import { field, idField } from '@/domains/finance/actions'
import type { AdminModule, Dataset } from '../catalog'
import type { AdminAction } from '../server/registry'
export function directoryActions(
  module: AdminModule,
  dataset: Dataset,
): AdminAction[] {
  if (module.key !== 'geography' || dataset.key !== 'districts') return []
  return [
    {
      id: 'district.bulk',
      label: 'Créer des arrondissements en série',
      scope: 'workspace',
      permission: 'geography.manage',
      schema: districtBulkCreateSchema.strict(),
      fields: [
        idField('communeId', 'Commune', 'communes'),
        field(
          'count',
          'Nombre d’arrondissements',
          'number',
          districtBulkCreateSchema.shape.count,
          { min: 1, max: 50 },
        ),
      ],
      run: async (ctx, data) => ({
        count: (
          await ctx.services.geography.createDistrictsBulk(
            data.communeId,
            data.count,
            ctx.caller.claims.uid,
          )
        ).length,
      }),
    },
  ]
}
