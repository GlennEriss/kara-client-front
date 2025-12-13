import { z } from 'zod'

// ================== SCHÉMA DEMANDE DE CRÉDIT ==================

export const creditTypeEnum = z.enum(['SPECIALE', 'FIXE', 'AIDE'])

export const creditDemandStatusEnum = z.enum(['PENDING', 'APPROVED', 'REJECTED'])

export const creditDemandSchema = z.object({
  clientId: z.string().min(1, 'L\'ID du client est requis'),
  clientFirstName: z.string()
    .min(2, 'Le prénom doit contenir au moins 2 caractères')
    .max(50, 'Le prénom ne peut pas dépasser 50 caractères'),
  clientLastName: z.string()
    .min(2, 'Le nom doit contenir au moins 2 caractères')
    .max(50, 'Le nom ne peut pas dépasser 50 caractères'),
  clientContacts: z.array(z.string())
    .min(1, 'Au moins un contact est requis')
    .refine((contacts) => contacts.every(c => c.length > 0), 'Tous les contacts doivent être valides'),
  
  creditType: creditTypeEnum,
  amount: z.number()
    .min(1000, 'Le montant minimum est de 1 000 FCFA')
    .max(10000000, 'Le montant maximum est de 10 000 000 FCFA'),
  monthlyPaymentAmount: z.number()
    .min(100, 'La mensualité minimum est de 100 FCFA')
    .optional(),
  cause: z.string()
    .min(10, 'La cause doit contenir au moins 10 caractères')
    .max(500, 'La cause ne peut pas dépasser 500 caractères'),
  
  status: creditDemandStatusEnum,
  
  // Garant (optionnel)
  guarantorId: z.string().optional(),
  guarantorFirstName: z.string().optional(),
  guarantorLastName: z.string().optional(),
  guarantorRelation: z.string().optional(),
  guarantorIsMember: z.boolean().optional(),
  
  // Dérogation (optionnel)
  eligibilityOverride: z.object({
    justification: z.string().min(10, 'La justification doit contenir au moins 10 caractères'),
    adminId: z.string().min(1, 'L\'ID de l\'admin est requis'),
    adminName: z.string().min(1, 'Le nom de l\'admin est requis'),
    createdAt: z.date(),
  }).optional(),
  
  // Score (optionnel, admin-only)
  score: z.number()
    .min(0, 'Le score minimum est 0')
    .max(10, 'Le score maximum est 10')
    .optional(),
  
  createdBy: z.string().min(1, 'L\'ID du créateur est requis'),
  updatedBy: z.string().optional(),
}).superRefine((data, ctx) => {
  // Validation : si garant fourni, les infos doivent être complètes
  if (data.guarantorId && (!data.guarantorFirstName || !data.guarantorLastName)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Si un garant est fourni, le prénom et le nom sont requis',
      path: ['guarantorFirstName'],
    })
  }
  
  // Validation : montant mensuel doit être cohérent avec le montant total
  if (data.monthlyPaymentAmount && data.monthlyPaymentAmount > data.amount) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'La mensualité ne peut pas être supérieure au montant total',
      path: ['monthlyPaymentAmount'],
    })
  }
  
  // Validation : limites selon le type de crédit
  if (data.creditType === 'SPECIALE' && data.monthlyPaymentAmount) {
    const maxDuration = Math.ceil(data.amount / data.monthlyPaymentAmount)
    if (maxDuration > 7) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Le crédit spéciale ne peut pas dépasser 7 mois. Augmentez la mensualité ou réduisez le montant.',
        path: ['monthlyPaymentAmount'],
      })
    }
  }
  
  if (data.creditType === 'AIDE' && data.monthlyPaymentAmount) {
    const maxDuration = Math.ceil(data.amount / data.monthlyPaymentAmount)
    if (maxDuration > 3) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Le crédit aide ne peut pas dépasser 3 mois. Augmentez la mensualité ou réduisez le montant.',
        path: ['monthlyPaymentAmount'],
      })
    }
  }
})

export type CreditDemandFormData = z.infer<typeof creditDemandSchema>

// Schéma pour le formulaire (sans createdBy/updatedBy qui sont ajoutés lors de la soumission)
export const creditDemandFormSchema = z.object({
  clientId: z.string().min(1, 'L\'ID du client est requis'),
  clientFirstName: z.string()
    .min(2, 'Le prénom doit contenir au moins 2 caractères')
    .max(50, 'Le prénom ne peut pas dépasser 50 caractères'),
  clientLastName: z.string()
    .min(2, 'Le nom doit contenir au moins 2 caractères')
    .max(50, 'Le nom ne peut pas dépasser 50 caractères'),
  clientContacts: z.array(z.string())
    .min(1, 'Au moins un contact est requis')
    .refine((contacts) => contacts.every(c => c.length > 0), 'Tous les contacts doivent être valides'),
  
  creditType: creditTypeEnum,
  amount: z.number()
    .min(1000, 'Le montant minimum est de 1 000 FCFA')
    .max(10000000, 'Le montant maximum est de 10 000 000 FCFA'),
  monthlyPaymentAmount: z.number()
    .min(100, 'La mensualité minimum est de 100 FCFA')
    .optional(),
  cause: z.string()
    .min(10, 'La cause doit contenir au moins 10 caractères')
    .max(500, 'La cause ne peut pas dépasser 500 caractères'),
  
  status: creditDemandStatusEnum,
  
  // Garant (optionnel)
  guarantorId: z.string().optional(),
  guarantorFirstName: z.string().optional(),
  guarantorLastName: z.string().optional(),
  guarantorRelation: z.string().optional(),
  guarantorIsMember: z.boolean().optional(),
  
  // Dérogation (optionnel)
  eligibilityOverride: z.object({
    justification: z.string().min(10, 'La justification doit contenir au moins 10 caractères'),
    adminId: z.string().min(1, 'L\'ID de l\'admin est requis'),
    adminName: z.string().min(1, 'Le nom de l\'admin est requis'),
    createdAt: z.date(),
  }).optional(),
  
  // Score (optionnel, admin-only)
  score: z.number()
    .min(0, 'Le score minimum est 0')
    .max(10, 'Le score maximum est 10')
    .optional(),
}).superRefine((data, ctx) => {
  // Validation : si garant fourni, les infos doivent être complètes
  if (data.guarantorId && (!data.guarantorFirstName || !data.guarantorLastName)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Si un garant est fourni, le prénom et le nom sont requis',
      path: ['guarantorFirstName'],
    })
  }
  
  // Validation : montant mensuel doit être cohérent avec le montant total
  if (data.monthlyPaymentAmount && data.monthlyPaymentAmount > data.amount) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'La mensualité ne peut pas être supérieure au montant total',
      path: ['monthlyPaymentAmount'],
    })
  }
  
  // Validation : limites selon le type de crédit
  if (data.creditType === 'SPECIALE' && data.monthlyPaymentAmount) {
    const maxDuration = Math.ceil(data.amount / data.monthlyPaymentAmount)
    if (maxDuration > 7) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Le crédit spéciale ne peut pas dépasser 7 mois. Augmentez la mensualité ou réduisez le montant.',
        path: ['monthlyPaymentAmount'],
      })
    }
  }
  
  if (data.creditType === 'AIDE' && data.monthlyPaymentAmount) {
    const maxDuration = Math.ceil(data.amount / data.monthlyPaymentAmount)
    if (maxDuration > 3) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Le crédit aide ne peut pas dépasser 3 mois. Augmentez la mensualité ou réduisez le montant.',
        path: ['monthlyPaymentAmount'],
      })
    }
  }
})

export type CreditDemandFormInput = z.infer<typeof creditDemandFormSchema>

// ================== SCHÉMA PAIEMENT ==================

export const creditPaymentModeEnum = z.enum(['CASH', 'MOBILE_MONEY', 'BANK_TRANSFER', 'CHEQUE'])

export const creditPaymentSchema = z.object({
  creditId: z.string().min(1, 'L\'ID du crédit est requis'),
  amount: z.number()
    .min(0, 'Le montant ne peut pas être négatif')
    .max(10000000, 'Le montant maximum est de 10 000 000 FCFA'),
  paymentDate: z.date(),
  paymentTime: z.string()
    .regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, 'Format d\'heure invalide (HH:mm)'),
  mode: creditPaymentModeEnum,
  proofUrl: z.string().url('L\'URL de la preuve doit être valide').optional(),
  comment: z.string().max(500, 'Le commentaire ne peut pas dépasser 500 caractères').optional(),
  note: z.number()
    .min(0, 'La note minimum est 0')
    .max(10, 'La note maximum est 10')
    .optional(),
  reference: z.string().max(100, 'La référence ne peut pas dépasser 100 caractères').optional(),
  receiptUrl: z.string().url('L\'URL du reçu doit être valide').optional(),
  createdBy: z.string().min(1, 'L\'ID du créateur est requis'),
  updatedBy: z.string().optional(),
})

export type CreditPaymentFormData = z.infer<typeof creditPaymentSchema>

// Schéma pour le formulaire (sans createdBy/updatedBy qui sont ajoutés lors de la soumission)
export const creditPaymentFormSchema = creditPaymentSchema.omit({ createdBy: true, updatedBy: true })

export type CreditPaymentFormInput = z.infer<typeof creditPaymentFormSchema>

// ================== SCHÉMA SIMULATION STANDARD ==================

export const standardSimulationSchema = z.object({
  amount: z.number()
    .min(1000, 'Le montant minimum est de 1 000 FCFA')
    .max(10000000, 'Le montant maximum est de 10 000 000 FCFA'),
  interestRate: z.number()
    .min(0, 'Le taux d\'intérêt ne peut pas être négatif')
    .max(100, 'Le taux d\'intérêt ne peut pas dépasser 100%'),
  monthlyPayment: z.number()
    .min(100, 'La mensualité minimum est de 100 FCFA'),
  firstPaymentDate: z.date(),
  creditType: creditTypeEnum,
}).superRefine((data, ctx) => {
  // Validation : la mensualité doit permettre de rembourser le montant
  if (data.monthlyPayment > data.amount) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'La mensualité ne peut pas être supérieure au montant total',
      path: ['monthlyPayment'],
    })
  }
  
  // Validation : limites selon le type
  const estimatedDuration = Math.ceil(data.amount / data.monthlyPayment)
  if (data.creditType === 'SPECIALE' && estimatedDuration > 7) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Le crédit spéciale ne peut pas dépasser 7 mois',
      path: ['monthlyPayment'],
    })
  }
  
  if (data.creditType === 'AIDE' && estimatedDuration > 3) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Le crédit aide ne peut pas dépasser 3 mois',
      path: ['monthlyPayment'],
    })
  }
})

export type StandardSimulationFormData = z.infer<typeof standardSimulationSchema>

// ================== SCHÉMA SIMULATION PERSONNALISÉE ==================

export const customSimulationSchema = z.object({
  amount: z.number()
    .min(1000, 'Le montant minimum est de 1 000 FCFA')
    .max(10000000, 'Le montant maximum est de 10 000 000 FCFA'),
  interestRate: z.number()
    .min(0, 'Le taux d\'intérêt ne peut pas être négatif')
    .max(100, 'Le taux d\'intérêt ne peut pas dépasser 100%'),
  monthlyPayments: z.array(z.object({
    month: z.number().min(1, 'Le numéro de mois doit être au moins 1'),
    amount: z.number().min(0, 'Le montant ne peut pas être négatif'),
  }))
    .min(1, 'Au moins un paiement mensuel est requis')
    .max(120, 'La durée maximum est de 120 mois'),
  firstPaymentDate: z.date(),
  creditType: creditTypeEnum,
}).superRefine((data, ctx) => {
  // Validation : la somme des paiements doit être au moins égale au montant
  const totalPayments = data.monthlyPayments.reduce((sum, p) => sum + p.amount, 0)
  if (totalPayments < data.amount) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'La somme des paiements mensuels doit être au moins égale au montant emprunté',
      path: ['monthlyPayments'],
    })
  }
  
  // Validation : limites selon le type
  const duration = data.monthlyPayments.length
  if (data.creditType === 'SPECIALE' && duration > 7) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Le crédit spéciale ne peut pas dépasser 7 mois',
      path: ['monthlyPayments'],
    })
  }
  
  if (data.creditType === 'AIDE' && duration > 3) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Le crédit aide ne peut pas dépasser 3 mois',
      path: ['monthlyPayments'],
    })
  }
  
  // Validation : les mois doivent être consécutifs et commencer à 1
  const months = data.monthlyPayments.map(p => p.month).sort((a, b) => a - b)
  for (let i = 0; i < months.length; i++) {
    if (months[i] !== i + 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Les mois doivent être consécutifs et commencer à 1',
        path: ['monthlyPayments'],
      })
      break
    }
  }
})

export type CustomSimulationFormData = z.infer<typeof customSimulationSchema>

// ================== SCHÉMA SIMULATION PROPOSÉE ==================

export const proposedSimulationSchema = z.object({
  totalAmount: z.number()
    .min(1000, 'Le montant minimum est de 1 000 FCFA')
    .max(10000000, 'Le montant maximum est de 10 000 000 FCFA'),
  duration: z.number()
    .min(1, 'La durée minimum est de 1 mois')
    .max(7, 'La durée maximum est de 7 mois pour crédit spéciale'),
  interestRate: z.number()
    .min(0, 'Le taux d\'intérêt ne peut pas être négatif')
    .max(100, 'Le taux d\'intérêt ne peut pas dépasser 100%'),
  firstPaymentDate: z.date(),
  creditType: creditTypeEnum,
}).superRefine((data, ctx) => {
  // Validation : limites selon le type
  if (data.creditType === 'SPECIALE' && data.duration > 7) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Le crédit spéciale ne peut pas dépasser 7 mois',
      path: ['duration'],
    })
  }
  
  if (data.creditType === 'AIDE' && data.duration > 3) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Le crédit aide ne peut pas dépasser 3 mois',
      path: ['duration'],
    })
  }
})

export type ProposedSimulationFormData = z.infer<typeof proposedSimulationSchema>

// ================== VALEURS PAR DÉFAUT ==================

export const creditDemandDefaultValues: Partial<CreditDemandFormInput> = {
  status: 'PENDING',
  guarantorIsMember: false,
  clientContacts: [],
}

export const creditPaymentDefaultValues: Partial<CreditPaymentFormData> = {
  paymentDate: new Date(),
  paymentTime: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
  mode: 'CASH',
}

