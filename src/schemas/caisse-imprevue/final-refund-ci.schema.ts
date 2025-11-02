import { z } from 'zod'

// Modes de retrait disponibles
export const WITHDRAWAL_MODES = [
  { value: 'cash', label: 'Espèce' },
  { value: 'bank_transfer', label: 'Virement bancaire' },
  { value: 'airtel_money', label: 'Airtel Money' },
  { value: 'mobicash', label: 'Mobicash' },
] as const

export const withdrawalModeSchema = z.enum(
  ['cash', 'bank_transfer', 'airtel_money', 'mobicash'],
  {
    message: 'Le mode de retrait est requis',
  }
)

// Schema pour la demande de remboursement final CI
export const finalRefundCISchema = z.object({
  // Motif du retrait (obligatoire, 10-500 caractères)
  reason: z
    .string()
    .min(10, 'Le motif doit contenir au moins 10 caractères')
    .max(500, 'Le motif ne peut pas dépasser 500 caractères')
    .trim(),

  // Date de retrait (obligatoire, ne peut pas être dans le futur)
  withdrawalDate: z
    .string()
    .min(1, 'La date de retrait est requise')
    .refine(
      (date) => {
        const withdrawalDate = new Date(date)
        const today = new Date()
        today.setHours(23, 59, 59, 999)
        return withdrawalDate <= today
      },
      { message: 'La date de retrait ne peut pas être dans le futur' }
    ),

  // Heure de retrait (obligatoire, format HH:mm)
  withdrawalTime: z
    .string()
    .min(1, 'L\'heure de retrait est requise')
    .regex(
      /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/,
      'Format d\'heure invalide (HH:MM)'
    ),

  // Montant retiré (non modifiable, fixé au montant total versé)
  // Ce champ sera pré-rempli automatiquement et non modifiable
  withdrawalAmount: z
    .number('Le montant doit être un nombre')
    .positive('Le montant doit être positif')
    .int('Le montant doit être un nombre entier'),

  // Mode de retrait (obligatoire)
  withdrawalMode: withdrawalModeSchema,

  // Preuve du retrait (obligatoire, image uniquement, max 20MB)
  withdrawalProof: z
    .instanceof(File, { message: 'La preuve du retrait est requise' })
    .refine(
      (file) => {
        // Accepter uniquement les images
        const validTypes = [
          'image/jpeg',
          'image/png',
          'image/webp',
        ]
        return validTypes.includes(file.type)
      },
      { message: 'Le fichier doit être une image (JPEG, PNG, WebP)' }
    )
    .refine(
      (file) => file.size <= 20 * 1024 * 1024, // 20MB
      { message: 'La taille du fichier ne peut pas dépasser 20MB' }
    ),

  // Document PDF signé (obligatoire, PDF uniquement, max 10MB)
  documentPdf: z
    .instanceof(File, { message: 'Le document PDF signé est requis' })
    .refine(
      (file) => file.type === 'application/pdf',
      { message: 'Le document doit être un fichier PDF' }
    )
    .refine(
      (file) => file.size <= 10 * 1024 * 1024, // 10MB
      { message: 'La taille du PDF ne peut pas dépasser 10MB' }
    ),
})

// Type TypeScript dérivé
export type FinalRefundCIFormData = z.infer<typeof finalRefundCISchema>

// Valeurs par défaut
export const defaultFinalRefundCIValues: Partial<FinalRefundCIFormData> = {
  reason: '',
  withdrawalDate: new Date().toISOString().split('T')[0],
  withdrawalTime: new Date()
    .toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
    .slice(0, 5),
  withdrawalAmount: 0,
  withdrawalMode: 'cash',
}

