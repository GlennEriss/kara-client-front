import { serializeFinanceValue } from './serialization'
import { decorateFinanceDetail } from './detail-extras'
import { isCreditModule } from '../credit-module'
import { hasCreditContractExtension } from '@/utils/credit-contract-documents'
import {
  contractActionAvailable,
  contractDocumentGate,
} from './contract-policy'
import { z } from 'zod'
import { settingsRow, enrichSettingsAuthors } from './settings-presentation'
import { financeListSchema } from './list-query'
import { NextResponse, type NextRequest } from 'next/server'
import { mobileJson, type MobileCaller } from '@/domains/mobile/server/access'
import { canWithAccess } from '@/domains/auth/access-policy'
import { financeActions } from '../registry'
import {
  financeModules,
  identifier,
  publicAction,
  type FinanceField,
  type FinanceModule,
  type FinanceScope,
} from '../actions'
import {
  canFinanceAction,
  financePermissionPrefix,
  guardFinanceTarget,
  requireFinanceCaller,
} from './authorization'
import { createFinanceServices, type FinanceServices } from './services'
import {
  presentedContracts,
  projectFinanceContract,
  financeTimeline,
} from './presentation'
import {
  enrichFinanceRows,
  financeContractDetail,
  listFinanceRows,
  readFinanceTarget,
} from './read-model'
import { validateFinanceFile } from './documents'
import {
  beginFinanceOperation,
  endFinanceOperation,
  financeFingerprint,
  FinanceRequestConflict,
} from './operations'

const moduleSchema = z.enum(financeModules)
const detailSchema = z
  .object({
    kind: z.enum(['contract', 'demand', 'settings']).default('contract'),
  })
  .strict()
const operationSchema = z
  .object({
    action: z.string().min(1).max(80),
    operationId: z.string().uuid(),
    payload: z.record(z.string(), z.unknown()),
  })
  .strict()
const labels = {
  'caisse-speciale': 'Caisse spéciale',
  'caisse-imprevue': 'Caisse imprévue',
  'credit-speciale': 'Crédit spécial',
  'credit-fixe': 'Crédit fixe',
  'caisse-aide': 'Caisse aide',
}
const jsonValue = serializeFinanceValue
function errorResponse(error: unknown) {
  if (error instanceof z.ZodError)
    return mobileJson(
      {
        error: 'Vérifiez les champs du formulaire.',
        issues: error.issues.map((item) => ({
          path: item.path.join('.'),
          message: item.message,
        })),
      },
      422,
    )
  if (error instanceof FinanceRequestConflict)
    return mobileJson({ error: error.message }, 409)
  const business = error instanceof Error && !('code' in error)
  return mobileJson(
    {
      error: business
        ? error.message.slice(0, 350)
        : 'Le service n’a pas pu terminer l’opération. Vérifiez l’historique avant de réessayer.',
    },
    business ? 400 : 503,
  )
}
function permittedActions(
  caller: MobileCaller,
  module: FinanceModule,
  scope: FinanceScope,
  record?: Record<string, any>,
) {
  return financeActions(module)
    .filter((action) => {
      if (action.scope !== scope || !canFinanceAction(caller, action))
        return false
      if (
        scope === 'settings' &&
        action.id === 'settings.activate' &&
        record?.isActive
      )
        return false
      if (
        scope === 'contract' &&
        record &&
        !contractActionAvailable(module, record, action.id)
      )
        return false
      if (scope === 'demand' && record) {
        if (action.id === 'demand.convert')
          return record.status === 'APPROVED' && !record.contractId
        if (
          action.id === 'demand.approve' ||
          action.id === 'demand.reject' ||
          action.id === 'demand.update'
        )
          return ['PENDING', 'REOPENED'].includes(record.status)
        if (action.id === 'demand.reopen') return record.status === 'REJECTED'
        if (action.id === 'demand.delete' && record.contractId)
          return caller.access.isSuperAdmin
      }
      if (module === 'caisse-speciale' && record) {
        if (action.id === 'payment.group')
          return record.contractType === 'GROUP'
        if (action.id === 'payment.create')
          return record.contractType !== 'GROUP'
      }
      return true
    })
    .map((action) => {
      const result = publicAction(action)
      return record &&
        isCreditModule(module) &&
        hasCreditContractExtension(record) &&
        action.id === 'document.upload'
        ? { ...result, label: 'Téléverser un nouveau contrat signé' }
        : result
    })
}
async function access(request: NextRequest, moduleValue: string) {
  const module = moduleSchema.safeParse(moduleValue)
  if (!module.success) return mobileJson({ error: 'Section inconnue.' }, 404)
  const caller = await requireFinanceCaller(request, module.data)
  return caller instanceof NextResponse
    ? caller
    : { caller, module: module.data }
}
export async function getFinanceWorkspace(
  request: NextRequest,
  moduleValue: string,
) {
  const result = await access(request, moduleValue)
  if (result instanceof NextResponse) return result
  try {
    const input = financeListSchema.parse(
      Object.fromEntries(request.nextUrl.searchParams),
    )
    if (
      input.kind === 'settings' &&
      !canWithAccess(
        result.caller.access,
        `${financePermissionPrefix(result.module)}.settings`,
      )
    )
      return mobileJson({ error: 'Accès aux paramètres refusé.' }, 403)
    const services = createFinanceServices(result.caller)
    for (const [min, max] of [
      ['monthlyMin', 'monthlyMax'],
      ['amountMin', 'amountMax'],
      ['paidMin', 'paidMax'],
      ['remainingMin', 'remainingMax'],
      ['durationMin', 'durationMax'],
      ['createdFrom', 'createdTo'],
      ['dueFrom', 'dueTo'],
    ] as const) {
      if (input[min] != null && input[max] != null && input[min]! > input[max]!)
        return mobileJson(
          { error: 'La borne minimum doit précéder la borne maximum.' },
          422,
        )
    }
    const data =
      input.kind === 'contracts' && input.presentation === 'cards'
        ? await presentedContracts(services, result.module, input)
        : await listFinanceRows(services, result.module, input)
    return mobileJson({
      ...jsonValue(data),
      ...(input.kind === 'contracts'
        ? {
            items: data.items.map((row: Record<string, any>) => ({
              ...jsonValue(row),
              cardAccess: {
                actions: permittedActions(
                  result.caller,
                  result.module,
                  'contract',
                  row,
                )
                  .map((item) => item.id)
                  .filter((id) =>
                    [
                      'document.upload',
                      'document.replace',
                      'member-document.approve',
                      'member-document.reject',
                      'contract.delete',
                    ].includes(id),
                  ),
                canDownload: canWithAccess(
                  result.caller.access,
                  'documents.download',
                ),
              },
            })),
          }
        : {}),
      module: result.module,
      title: labels[result.module],
      kind: input.kind,
      actions: permittedActions(result.caller, result.module, 'workspace'),
      canSettings:
        !isCreditModule(result.module) &&
        canWithAccess(
          result.caller.access,
          `${financePermissionPrefix(result.module)}.settings`,
        ),
      canExport: canWithAccess(
        result.caller.access,
        `${financePermissionPrefix(result.module)}.export`,
      ),
    })
  } catch (error) {
    return errorResponse(error)
  }
}
export async function getFinanceDetail(
  request: NextRequest,
  moduleValue: string,
  entityId: string,
) {
  const result = await access(request, moduleValue)
  if (result instanceof NextResponse) return result
  try {
    const id = identifier.parse(entityId)
    const { kind } = detailSchema.parse(
      Object.fromEntries(request.nextUrl.searchParams),
    )
    if (
      kind === 'settings' &&
      !canWithAccess(
        result.caller.access,
        `${financePermissionPrefix(result.module)}.settings`,
      )
    )
      return mobileJson({ error: 'Accès aux paramètres refusé.' }, 403)
    const services = createFinanceServices(result.caller)
    const detail =
      kind === 'contract'
        ? await financeContractDetail(services, result.module, id)
        : {
            record: (
              await enrichFinanceRows(services, result.module, [
                await readFinanceTarget(services, result.module, kind, id),
              ])
            )[0],
          }
    if (kind === 'settings')
      detail.record = await enrichSettingsAuthors(
        services,
        settingsRow(result.module, detail.record),
      )
    if (kind === 'contract')
      detail.record = await projectFinanceContract(
        services,
        result.module,
        detail.record,
        new Date(),
        detail,
      )
    if (kind === 'contract') await decorateFinanceDetail(services, detail)
    return mobileJson({
      ...jsonValue(detail),
      ...(kind === 'contract'
        ? { documentGate: contractDocumentGate(result.module, detail.record) }
        : {}),
      ...(kind === 'contract' &&
      !isCreditModule(result.module) &&
      'payments' in detail
        ? {
            installments: financeTimeline(
              result.module,
              detail.record,
              detail.payments,
            ),
          }
        : {}),
      module: result.module,
      kind,
      actions: permittedActions(
        result.caller,
        result.module,
        kind,
        detail.record,
      ),
      canDownload: canWithAccess(result.caller.access, 'documents.download'),
    })
  } catch (error) {
    return errorResponse(error)
  }
}
function fileFields(fields: FinanceField[], prefix = ''): string[] {
  return fields.flatMap((item) =>
    item.kind === 'file'
      ? [prefix + item.key]
      : item.fields
        ? fileFields(item.fields, prefix + item.key + '.')
        : [],
  )
}
function setPath(record: Record<string, any>, path: string, value: unknown) {
  const keys = path.split('.')
  let node = record
  for (const key of keys.slice(0, -1)) {
    if (!node[key] || typeof node[key] !== 'object' || Array.isArray(node[key]))
      throw new Error('Pièce jointe sans formulaire associé.')
    node = node[key]
  }
  node[keys.at(-1)!] = value
}
async function readOperation(request: NextRequest) {
  if (Number(request.headers.get('content-length') || 0) > 24 * 1024 * 1024)
    throw new Error('Le formulaire et ses pièces jointes dépassent 24 Mo.')
  if (request.headers.get('content-type')?.includes('application/json'))
    return {
      input: operationSchema.parse(await request.json()),
      files: {} as Record<string, File>,
    }
  const form = await request.formData()
  const raw = form.get('payload')
  if (typeof raw !== 'string' || raw.length > 200_000)
    throw new Error('Formulaire invalide ou trop volumineux.')
  const input = operationSchema.parse({
    action: form.get('action'),
    operationId: form.get('operationId'),
    payload: JSON.parse(raw),
  })
  const files: Record<string, File> = {}
  let total = 0
  for (const [key, value] of form.entries()) {
    if (['payload', 'action', 'operationId'].includes(key)) continue
    if (
      typeof value === 'string' ||
      !/^[a-zA-Z][a-zA-Z0-9_.]{0,150}$/.test(key) ||
      files[key]
    )
      throw new Error('Pièce jointe invalide.')
    total += value.size
    if (total > 20 * 1024 * 1024)
      throw new Error('Les pièces jointes dépassent 20 Mo.')
    await validateFinanceFile(value)
    files[key] = value
  }
  return { input, files }
}
export async function postFinanceAction(
  request: NextRequest,
  moduleValue: string,
  entityId: string,
) {
  const result = await access(request, moduleValue)
  if (result instanceof NextResponse) return result
  let operation: Awaited<ReturnType<typeof beginFinanceOperation>> | undefined
  let services: FinanceServices | undefined
  try {
    const id = identifier.parse(entityId)
    const { input, files } = await readOperation(request)
    const action = financeActions(result.module).find(
      (item) => item.id === input.action,
    )
    if (!action)
      return mobileJson({ error: 'Cette opération est inconnue.' }, 404)
    if (!canFinanceAction(result.caller, action))
      return mobileJson(
        { error: 'Vos permissions ne permettent pas cette opération.' },
        403,
      )
    if (
      result.module === 'caisse-speciale' &&
      action.id.startsWith('payment.') &&
      files.proof?.type === 'application/pdf'
    )
      throw new Error(
        'La preuve de versement en caisse spéciale doit être une image JPEG, PNG ou WebP.',
      )
    const allowedFiles = fileFields(action.fields)
    if (Object.keys(files).some((key) => !allowedFiles.includes(key)))
      throw new Error('Cette pièce jointe ne correspond pas au formulaire.')
    const staged = structuredClone(input.payload)
    for (const key of Object.keys(files).filter((key) => key.includes('.')))
      setPath(staged, key, 'https://validation.invalid/document')
    const data = action.schema.parse(staged) as Record<string, any>
    for (const spec of action.fields)
      if (spec.kind === 'file' && data[spec.key] && !files[spec.key])
        throw new Error(`Ajoutez le fichier « ${spec.label} ».`)
    services = createFinanceServices(result.caller)
    await guardFinanceTarget(
      services,
      result.module,
      action,
      id,
      data,
      result.caller,
    )
    if (!action.readonly) {
      operation = await beginFinanceOperation(
        services.db,
        result.caller.claims.uid,
        input.operationId,
        `${result.module}:${action.scope}:${id === 'new' ? String(data.memberId || data.clientId || input.operationId) : id}`,
        await financeFingerprint(
          {
            module: result.module,
            id,
            action: action.id,
            payload: input.payload,
          },
          files,
        ),
      )
      if (operation.replay)
        return mobileJson({
          success: true,
          replay: true,
          result: operation.result,
        })
    }
    for (const key of Object.keys(files).filter((key) => key.includes('.'))) {
      const uploaded = await services.documents.uploadDocumentFile(
        files[key],
        String(data.memberId || data.clientId || result.caller.claims.uid),
        'CONTACT_DOCUMENT',
      )
      setPath(data, key, uploaded.url)
    }
    const output = jsonValue(
      await action.run({ services, caller: result.caller, id, files }, data),
    )
    if (operation)
      await endFinanceOperation(
        services.db,
        operation.operation,
        operation.lock,
        'DONE',
        output,
      )
    if (!action.readonly)
      await services.db
        .collection('auditLogs')
        .add({
          adminId: result.caller.claims.uid,
          adminName: String(
            result.caller.claims.name || result.caller.claims.uid,
          ),
          action: 'other',
          module: financePermissionPrefix(result.module),
          targetId: id,
          description: action.label,
          source: 'mobile-native',
          operationId: input.operationId,
          createdAt: new Date(),
        })
        .catch(() => {})
    return mobileJson({ success: true, result: output })
  } catch (error) {
    if (operation && !operation.replay && services)
      await endFinanceOperation(
        services.db,
        operation.operation,
        operation.lock,
        'FAILED',
      ).catch(() => {})
    // Uploaded contact documents may already be referenced if a later business
    // step failed; retain them for reconciliation rather than deleting evidence.
    return errorResponse(error)
  }
}
