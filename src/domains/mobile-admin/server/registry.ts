import { z } from 'zod'
import {
  asDate,
  reasonField,
  publicAction,
  type FieldDefinition,
} from '@/domains/finance/actions'
import { fromFirestore } from '@/domains/mobile/server/calendar-service'
import type { AdminModule, Dataset } from '../catalog'
import type { AdminServices } from './context'
import { companyCrudSchema } from '@/schemas/company.schema'
import { jobSchema } from '@/schemas/schemas'
import {
  provinceSchema,
  departmentSchema,
  communeSchema,
  districtSchema,
  quarterSchema,
} from '@/domains/infrastructure/geography/schemas/geographie.schema'
import type { MobileCaller } from '@/domains/mobile/server/access'
export interface AdminAction {
  id: string
  label: string
  scope: 'workspace' | 'contract'
  permission: string
  fields: FieldDefinition[]
  destructive?: boolean
  superAdminOnly?: boolean
  readonly?: boolean
  sensitiveResult?: boolean
  requiredPermissions?: string[]
  schema?: z.ZodTypeAny
  run: (ctx: AdminContext, data: any) => Promise<unknown>
}
export interface AdminContext {
  module: AdminModule
  dataset: Dataset
  id: string
  row: Record<string, any>
  services: AdminServices
  caller: MobileCaller
  files: Record<string, File>
  operationId: string
  token: string
}
export const publicAdminAction = (
  action: AdminAction,
  row?: Record<string, any>,
) => {
  const result = publicAction({ ...action, schema: z.object({}) } as any)
  if (
    row &&
    (action.id.endsWith('.update') || action.id.startsWith('association.'))
  ) {
    const initial = (fields: any[], record: any): any[] =>
      fields.map((f) => ({
        ...f,
        ...(f.key === 'quarterId' && record?.quarterId && record?.quarter
          ? { options: [{ value: record.quarterId, label: [record.quarter, record.district, record.city].filter(Boolean).join(' · ') }] }
          : {}),
        ...(!f.required && ['text', 'multiline'].includes(f.kind)
          ? { keepEmpty: true }
          : {}),
        ...(record?.[f.key] !== undefined
          ? { initial: record[f.key] }
          : f.kind === 'time' &&
              record?.[
                (
                  {
                    startTime: 'startDate',
                    endTime: 'endDate',
                    pollCloseTime: 'pollClosesAt',
                  } as Record<string, string>
                )[f.key]
              ]
            ? {
                initial: new Intl.DateTimeFormat('fr-FR', {
                  timeZone: 'Africa/Libreville',
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: false,
                }).format(
                  new Date(
                    record[
                      (
                        {
                          startTime: 'startDate',
                          endTime: 'endDate',
                          pollCloseTime: 'pollClosesAt',
                        } as Record<string, string>
                      )[f.key]
                    ],
                  ),
                ),
              }
            : {}),
        ...(f.fields ? { fields: initial(f.fields, record?.[f.key]) } : {}),
      }))
    result.fields = initial(result.fields, row)
  }
  return result
}
export function actionSchema(action: AdminAction) {
  return (
    action.schema ??
    z
      .object(Object.fromEntries(action.fields.map((f) => [f.key, f.schema])))
      .strict()
  )
}
export const actor = (ctx: AdminContext) => ({
  id: ctx.caller.claims.uid,
  name: String(
    ctx.caller.claims.name || ctx.caller.claims.email || ctx.caller.claims.uid,
  ),
})
export const convertDates = (
  fields: FieldDefinition[],
  data: Record<string, any>,
): Record<string, any> =>
  Object.fromEntries(
    Object.entries(data).map(([key, v]) => {
      const f = fields.find((f) => f.key === key)
      return [
        key,
        f?.kind === 'date' && typeof v === 'string'
          ? asDate(v)
          : f?.kind === 'fields' && v && typeof v === 'object'
            ? convertDates(f.fields as FieldDefinition[], v)
            : v,
      ]
    }),
  )
export function baseActions(
  module: AdminModule,
  dataset: Dataset,
): AdminAction[] {
  const list: AdminAction[] = []
  const modelSchema =
    module.key === 'references'
      ? (dataset.key === 'companies' ? companyCrudSchema : jobSchema).strict()
      : module.key === 'geography'
        ? (
            {
              provinces: provinceSchema,
              departments: departmentSchema,
              communes: communeSchema,
              districts: districtSchema,
              quarters: quarterSchema,
            } as const
          )[dataset.key as 'provinces']?.strict()
        : undefined
  const save = async (
    ctx: AdminContext,
    data: Record<string, any>,
    create = false,
  ) => {
    const payload = convertDates(dataset.fields, data)
    if (module.key === 'references') {
      const service =
        dataset.key === 'companies'
          ? ctx.services.company
          : ctx.services.profession
      return create
        ? service.create(payload as any, ctx.caller.claims.uid)
        : service.update(ctx.id, payload)
    }
    const name: Record<string, string> = {
      provinces: 'Province',
      departments: 'Department',
      communes: 'Commune',
      districts: 'District',
      quarters: 'Quarter',
    }
    const method = `${create ? 'create' : 'update'}${name[dataset.key]}`
    const service = ctx.services.geography as any
    return create
      ? service[method](payload, ctx.caller.claims.uid)
      : service[method](ctx.id, payload, ctx.caller.claims.uid)
  }
  if (dataset.create)
    list.push({
      id: 'record.create',
      label: 'Ajouter',
      scope: 'workspace',
      permission: `${module.permission}.${dataset.create}`,
      fields: dataset.fields,
      schema: modelSchema,
      run: (ctx, d) => save(ctx, d, true),
    })
  if (dataset.edit)
    list.push({
      id: 'record.update',
      label: 'Modifier',
      scope: 'contract',
      permission: `${module.permission}.${dataset.edit}`,
      fields: dataset.fields,
      schema: modelSchema,
      run: (ctx, d) => save(ctx, d),
    })
  if (dataset.delete)
    list.push({
      id: 'record.delete',
      label: 'Supprimer',
      scope: 'contract',
      permission: `${module.permission}.${dataset.delete}`,
      fields: [reasonField()],
      destructive: true,
      run: async (ctx) => {
        if (module.key === 'references')
          await (
            dataset.key === 'companies'
              ? ctx.services.company
              : ctx.services.profession
          ).delete(ctx.id)
        else {
          const names: Record<string, string> = {
            provinces: 'Province',
            departments: 'Department',
            communes: 'Commune',
            districts: 'District',
            quarters: 'Quarter',
          }
          await (ctx.services.geography as any)[`delete${names[dataset.key]}`](
            ctx.id,
          )
        }
        return { deleted: true }
      },
    })
  return list
}
export const serialize = (value: unknown) =>
  JSON.parse(JSON.stringify(fromFirestore(value)))
export function safePublicRecord(value: any): any {
  if (Array.isArray(value)) return value.map(safePublicRecord)
  if (value && typeof value === 'object')
    return Object.fromEntries(
      Object.entries(value)
        .filter(
          ([key]) =>
            !/(password|private.?key|secret|refresh.?token|id.?token|security.?code|reset.?token)/i.test(
              key,
            ),
        )
        .map(([key, item]) => [key, safePublicRecord(item)]),
    )
  return value
}

/** Les mêmes montants masqués que sur le calendrier web pour le recouvrement. */
export function redactAdminAmounts(value: any, canSeeAmounts: boolean): any {
  if (canSeeAmounts) return value
  if (Array.isArray(value))
    return value.map((item) => redactAdminAmounts(item, false))
  if (value && typeof value === 'object')
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        /(amount|montant|price|premium|commission|capital|balance|totalOverdue|monthlyPayment)/i.test(
          key,
        ) && typeof item === 'number'
          ? null
          : redactAdminAmounts(item, false),
      ]),
    )
  return value
}
