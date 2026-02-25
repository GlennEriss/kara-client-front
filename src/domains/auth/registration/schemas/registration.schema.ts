/**
 * Schémas de validation pour le module registration
 * Ré-export des schémas existants pour cohérence
 */

export {
    defaultValues, documentsSchema, registerSchema,
    stepSchemas
} from '@/schemas/schemas'

export { addressSchema } from '@/schemas/address.schema'
export { companySchema } from '@/schemas/company.schema'
export { identitySchema } from '@/schemas/identity.schema'

export type {
    AddressFormData,
    DocumentsFormData, RegisterFormData
} from '@/schemas/schemas'
