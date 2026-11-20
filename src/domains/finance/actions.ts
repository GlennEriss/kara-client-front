import { z } from 'zod'
import type { FinanceServices } from './server/services'
import type { MobileCaller } from '@/domains/mobile/server/access'

export const financeModules = [
  'caisse-speciale',
  'caisse-imprevue',
  'credit-speciale',
  'credit-fixe',
  'caisse-aide',
] as const
export type FinanceModule = (typeof financeModules)[number]
export type FinanceScope = 'workspace' | 'demand' | 'contract' | 'settings'
export type InputKind =
  | 'text'
  | 'hidden'
  | 'multiline'
  | 'number'
  | 'money'
  | 'date'
  | 'time'
  | 'select'
  | 'boolean'
  | 'member'
  | 'group'
  | 'file'
  | 'signature'
  | 'fields'
  | 'rows'
export interface FinanceField {
  key: string
  label: string
  kind: InputKind
  required: boolean
  options?: { value: string; label: string }[]
  source?: string
  fields?: FinanceField[]
  min?: number
  max?: number
  initial?: unknown
  accept?: string[]
  maxBytes?: number
  keepEmpty?: boolean
  help?: string
}
export interface FieldDefinition extends FinanceField {
  schema: z.ZodTypeAny
}
export type ActionContext = {
  services: FinanceServices
  caller: MobileCaller
  id: string
  files: Record<string, File>
}
export interface FinanceAction {
  id: string
  label: string
  permission: string
  scope: FinanceScope
  fields: FieldDefinition[]
  destructive?: boolean
  superAdminOnly?: boolean
  readonly?: boolean
  schema: z.ZodTypeAny
  run(context: ActionContext, input: any): Promise<unknown>
}
export const identifier = z
  .string()
  .min(1)
  .max(180)
  .refine(
    (value) =>
      !/[\\/?#]/.test(value) &&
      !Array.from(value).some((char) => char.charCodeAt(0) < 32) &&
      !['.', '..'].includes(value),
    'Identifiant invalide',
  )
export const civilDate = z
  .string()
  .regex(/^20\d{2}-\d{2}-\d{2}$/)
  .refine((value) => {
    const date = new Date(value + 'T12:00:00Z')
    return (
      !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
    )
  }, 'Date invalide')
export const clockTime = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Heure invalide')
export const paymentModes = [
  { value: 'cash', label: 'Espèces' },
  { value: 'bank_transfer', label: 'Virement bancaire' },
  { value: 'airtel_money', label: 'Airtel Money' },
  { value: 'mobicash', label: 'Mobicash' },
  { value: 'other', label: 'Autre' },
]
export const field = (
  key: string,
  label: string,
  kind: InputKind,
  schema: z.ZodTypeAny,
  extra: Partial<FinanceField> = {},
): FieldDefinition => ({
  key,
  label,
  kind,
  schema,
  required: !schema.isOptional(),
  ...extra,
})
export const textField = (key: string, label: string, required = true) =>
  field(
    key,
    label,
    'text',
    required
      ? z.string().trim().min(1).max(300)
      : z.string().trim().max(300).optional(),
  )
export const reasonField = (key = 'reason', label = 'Motif') =>
  field(
    key,
    label,
    'multiline',
    z
      .string()
      .trim()
      .min(3, 'Précisez le motif (3 caractères minimum).')
      .max(2000),
  )
export const moneyField = (
  key = 'amount',
  label = 'Montant (FCFA)',
  required = true,
) =>
  field(
    key,
    label,
    'money',
    required
      ? z.number().int().positive().max(1_000_000_000)
      : z.number().int().nonnegative().max(1_000_000_000).optional(),
    { min: required ? 1 : 0 },
  )
export const numberField = (key: string, label: string, min = 0, max = 1200) =>
  field(key, label, 'number', z.number().int().min(min).max(max), { min, max })
export const dateField = (key = 'date', label = 'Date') =>
  field(key, label, 'date', civilDate)
export const timeField = (key = 'time', label = 'Heure') =>
  field(key, label, 'time', clockTime)
export const boolField = (key: string, label: string) =>
  field(key, label, 'boolean', z.boolean().optional(), { initial: false })
export const idField = (
  key: string,
  label: string,
  source: string,
  required = true,
) =>
  field(
    key,
    label,
    source === 'members' ? 'member' : source === 'groups' ? 'group' : 'select',
    required ? identifier : identifier.optional(),
    { source },
  )
export function selectField(
  key: string,
  label: string,
  options: { value: string; label: string }[],
  optional = false,
) {
  const schema = z.enum(
    options.map((item) => item.value) as [string, ...string[]],
  )
  return field(key, label, 'select', optional ? schema.optional() : schema, {
    options,
  })
}
export const fileField = (
  key: string,
  label: string,
  required = true,
  help?: string,
) =>
  field(
    key,
    label,
    'file',
    required ? z.literal(true) : z.literal(true).optional(),
    { help },
  )
export const paymentFields = (credit = false): FieldDefinition[] => [
  moneyField(),
  dateField(),
  timeField(),
  selectField(
    'mode',
    'Moyen de paiement',
    credit
      ? paymentModes.filter((item) => item.value !== 'other')
      : paymentModes,
  ),
  boolField('withFees', 'Avec frais de transaction'),
  textField('paymentMethodOther', 'Précisez le moyen de paiement', false),
  idField('agentRecouvrementId', 'Agent de recouvrement', 'agents', false),
]
export const asDate = (date: string, time = '12:00') =>
  new Date(`${date}T${time}:00+01:00`)
export const actorName = (caller: MobileCaller) =>
  String(caller.claims.name || caller.claims.email || caller.claims.uid)
export function defineAction(
  module: FinanceModule,
  id: string,
  label: string,
  scope: FinanceScope,
  permission: string,
  fields: FieldDefinition[],
  run: FinanceAction['run'],
  extra: Partial<FinanceAction> = {},
): FinanceAction {
  const prefix = {
    'caisse-speciale': 'caisseSpeciale',
    'caisse-imprevue': 'caisseImprevue',
    'credit-speciale': 'creditSpeciale',
    'credit-fixe': 'creditFixe',
    'caisse-aide': 'creditAide',
  }[module]
  return {
    id,
    label,
    scope,
    permission: `${prefix}.${permission}`,
    fields,
    schema: z
      .object(Object.fromEntries(fields.map((item) => [item.key, item.schema])))
      .strict(),
    run,
    ...extra,
  }
}
export function publicAction(action: FinanceAction) {
  const publicField = (definition: FinanceField): FinanceField => {
    const { schema: _schema, ...item } = definition as FieldDefinition
    void _schema
    return {
      ...item,
      ...(item.fields ? { fields: item.fields.map(publicField) } : {}),
    }
  }
  return {
    id: action.id,
    label: action.label,
    scope: action.scope,
    destructive: !!action.destructive,
    readonly: !!action.readonly,
    fields: action.fields.map(publicField),
  }
}

export function requiredFile(context: ActionContext, key: string) {
  const file = context.files[key]
  if (!file)
    throw new Error('Ajoutez le justificatif demandé avant de continuer.')
  return file
}
