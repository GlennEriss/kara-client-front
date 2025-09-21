import { z } from 'zod'
import { PaymentMode } from '@/types/types'

// ————————————————————————————————————————————————————————————
// Schema pour les contrats individuels
// ————————————————————————————————————————————————————————————
export const individualContractSchema = z.object({
  // Informations de base
  contractId: z.string(),
  memberId: z.string(),
  
  // Paiement sélectionné
  selectedMonthIndex: z.number().min(-1),
  
  // Informations de paiement
  paymentDate: z.string().min(1, 'La date de paiement est obligatoire'),
  paymentTime: z.string().min(1, 'L\'heure de paiement est obligatoire'),
  paymentMode: z.enum(['airtel_money', 'mobicash', 'cash', 'bank_transfer'], {
    message: 'Le mode de paiement est obligatoire'
  }),
  
  // Preuve de paiement
  proofFile: z.instanceof(File, {
    message: 'La preuve de paiement est obligatoire'
  }).optional(),
})

export type IndividualContractFormData = z.infer<typeof individualContractSchema>

// ————————————————————————————————————————————————————————————
// Schema pour les contrats de groupe
// ————————————————————————————————————————————————————————————
export const groupContractSchema = z.object({
  // Informations de base
  contractId: z.string(),
  groupeId: z.string(),
  
  // Paiement sélectionné
  selectedMonthIndex: z.number().min(-1),
  
  // Informations de paiement
  paymentDate: z.string().min(1, 'La date de paiement est obligatoire'),
  paymentTime: z.string().min(1, 'L\'heure de paiement est obligatoire'),
  paymentMode: z.enum(['airtel_money', 'mobicash', 'cash', 'bank_transfer'], {
    message: 'Le mode de paiement est obligatoire'
  }),
  
  // Membre du groupe qui effectue le versement
  selectedGroupMemberId: z.string().min(1, 'Le membre du groupe est obligatoire'),
  
  // Montant à verser par le membre
  amount: z.number().min(1, 'Le montant à verser doit être supérieur à 0'),
  
  // Preuve de paiement
  proofFile: z.instanceof(File, {
    message: 'La preuve de paiement est obligatoire'
  }).optional(),
})

export type GroupContractFormData = z.infer<typeof groupContractSchema>

// ————————————————————————————————————————————————————————————
// Union type pour les deux types de contrats
// ————————————————————————————————————————————————————————————
export const standardContractSchema = z.discriminatedUnion('contractType', [
  individualContractSchema.extend({ contractType: z.literal('INDIVIDUAL') }),
  groupContractSchema.extend({ contractType: z.literal('GROUP') })
])

export type StandardContractFormData = z.infer<typeof standardContractSchema>

// ————————————————————————————————————————————————————————————
// Valeurs par défaut
// ————————————————————————————————————————————————————————————
export const individualContractDefaultValues: Partial<IndividualContractFormData> = {
  paymentDate: new Date().toISOString().split('T')[0],
  paymentTime: (() => {
    const now = new Date()
    return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
  })(),
  paymentMode: 'airtel_money' as PaymentMode,
  selectedMonthIndex: -1,
}

export const groupContractDefaultValues: Partial<GroupContractFormData> = {
  paymentDate: new Date().toISOString().split('T')[0],
  paymentTime: (() => {
    const now = new Date()
    return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
  })(),
  paymentMode: 'airtel_money' as PaymentMode,
  selectedMonthIndex: -1,
  selectedGroupMemberId: '',
  amount: 0,
}
