/**
 * Schémas de validation pour le module registration
 * Ré-export des schémas existants pour cohérence
 */

export {
  registerSchema,
  stepSchemas,
  documentsSchema,
  defaultValues,
} from '@/schemas/schemas'

export { identitySchema } from '@/schemas/identity.schema'
export { addressSchema } from '@/schemas/address.schema'
export { companySchema } from '@/schemas/company.schema'

export type {
  RegisterFormData,
  AddressFormData,
  DocumentsFormData,
} from '@/schemas/schemas'
