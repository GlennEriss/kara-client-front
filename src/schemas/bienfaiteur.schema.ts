import { z } from 'zod'

// ========== SCHÉMA POUR LA CRÉATION D'UN ÉVÈNEMENT ==========

export const charityEventSchema = z.object({
  // Informations générales
  title: z
    .string()
    .min(3, 'Le titre doit contenir au moins 3 caractères')
    .max(150, 'Le titre ne peut pas dépasser 150 caractères'),
  
  location: z
    .string()
    .min(3, 'Le lieu doit contenir au moins 3 caractères')
    .max(100, 'Le lieu ne peut pas dépasser 100 caractères'),
  
  description: z
    .string()
    .min(10, 'La description doit contenir au moins 10 caractères')
    .max(2000, 'La description ne peut pas dépasser 2000 caractères'),
  
  // Dates
  startDate: z
    .string()
    .min(1, 'La date de début est requise')
    .refine((date) => {
      const selectedDate = new Date(date)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      return selectedDate >= today
    }, 'La date de début ne peut pas être dans le passé'),
  
  endDate: z
    .string()
    .min(1, 'La date de fin est requise'),
  
  // Financement
  targetAmount: z
    .string()
    .optional()
    .refine(
      (val) => !val || !isNaN(Number(val)) && Number(val) > 0,
      'Le montant cible doit être un nombre positif'
    ),
  
  minContributionAmount: z
    .string()
    .optional()
    .refine(
      (val) => !val || !isNaN(Number(val)) && Number(val) > 0,
      'Le montant minimum doit être un nombre positif'
    ),
  
  // Visuel (optionnel)
  coverPhotoFile: z
    .instanceof(File)
    .optional()
    .refine(
      (file) => !file || file.size <= 5 * 1024 * 1024,
      'La taille de l\'image ne doit pas dépasser 5MB'
    )
    .refine(
      (file) => !file || ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(file.type),
      'Format d\'image non supporté. Utilisez JPG, PNG ou WEBP'
    ),
  
  // Statut
  status: z.enum(['draft', 'upcoming', 'ongoing', 'closed', 'archived'], {
    message: 'Le statut est requis',
  }).default('draft'),
  
  isPublic: z.boolean().default(true),
}).refine(
  (data) => {
    const start = new Date(data.startDate)
    const end = new Date(data.endDate)
    return end > start
  },
  {
    message: 'La date de fin doit être postérieure à la date de début',
    path: ['endDate'],
  }
).refine(
  (data) => {
    if (data.targetAmount && data.minContributionAmount) {
      return Number(data.targetAmount) >= Number(data.minContributionAmount)
    }
    return true
  },
  {
    message: 'Le montant cible doit être supérieur ou égal au montant minimum',
    path: ['targetAmount'],
  }
)

export type CharityEventFormData = z.infer<typeof charityEventSchema>

export const defaultCharityEventValues: Partial<CharityEventFormData> = {
  title: '',
  location: '',
  description: '',
  startDate: '',
  endDate: '',
  targetAmount: '',
  minContributionAmount: '',
  status: 'draft',
  isPublic: true,
}

// ========== SCHÉMA POUR L'AJOUT D'UNE CONTRIBUTION ==========

export const charityContributionSchema = z.object({
  // Type de contributeur
  participantType: z.enum(['member', 'group'], {
    message: 'Le type de contributeur est requis',
  }),
  
  // ID du membre ou du groupe
  memberId: z.string().optional(),
  groupId: z.string().optional(),
  
  // Type de contribution
  contributionType: z.enum(['money', 'in_kind'], {
    message: 'Le type de contribution est requis',
  }),
  
  // Pour contribution financière
  amount: z
    .string()
    .optional()
    .refine(
      (val) => !val || (!isNaN(Number(val)) && Number(val) > 0),
      'Le montant doit être un nombre positif'
    ),
  
  paymentMethod: z
    .enum(['cash', 'bank_transfer', 'airtel_money', 'mobicash', 'other'])
    .optional(),
  
  // Pour contribution en nature
  inKindDescription: z
    .string()
    .max(500, 'La description ne peut pas dépasser 500 caractères')
    .optional(),
  
  estimatedValue: z
    .string()
    .optional()
    .refine(
      (val) => !val || (!isNaN(Number(val)) && Number(val) >= 0),
      'La valeur estimée doit être un nombre positif ou nul'
    ),
  
  // Preuve (image) - OBLIGATOIRE
  proofFile: z
    .instanceof(File, {
      message: 'La preuve de contribution est obligatoire'
    })
    .refine(
      (file) => file.size <= 10 * 1024 * 1024,
      'La taille du fichier ne doit pas dépasser 10MB'
    )
    .refine(
      (file) => ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'].includes(file.type),
      'Format non supporté. Utilisez JPG, PNG, WEBP ou PDF'
    ),
  
  // Date de contribution
  contributionDate: z
    .string()
    .min(1, 'La date de contribution est requise')
    .refine((date) => {
      const selectedDate = new Date(date)
      const today = new Date()
      return selectedDate <= today
    }, 'La date de contribution ne peut pas être dans le futur'),
  
  // Statut
  status: z.enum(['pending', 'confirmed', 'canceled'], {
    message: 'Le statut est requis',
  }).default('confirmed'),
  
  // Notes (optionnel)
  notes: z
    .string()
    .max(500, 'Les notes ne peuvent pas dépasser 500 caractères')
    .optional(),
}).refine(
  (data) => {
    // Au moins un ID doit être fourni
    return data.memberId || data.groupId
  },
  {
    message: 'Vous devez sélectionner un membre ou un groupe',
    path: ['memberId'],
  }
).refine(
  (data) => {
    // Pour une contribution financière, le montant est obligatoire
    if (data.contributionType === 'money') {
      return data.amount && Number(data.amount) > 0
    }
    return true
  },
  {
    message: 'Le montant est requis pour une contribution financière',
    path: ['amount'],
  }
).refine(
  (data) => {
    // Pour une contribution financière, la méthode de paiement est obligatoire
    if (data.contributionType === 'money') {
      return !!data.paymentMethod
    }
    return true
  },
  {
    message: 'La méthode de paiement est requise pour une contribution financière',
    path: ['paymentMethod'],
  }
).refine(
  (data) => {
    // Pour une contribution en nature, la description est obligatoire
    if (data.contributionType === 'in_kind') {
      return data.inKindDescription && data.inKindDescription.trim().length >= 10
    }
    return true
  },
  {
    message: 'La description est requise pour une contribution en nature (minimum 10 caractères)',
    path: ['inKindDescription'],
  }
)

export type CharityContributionFormData = z.infer<typeof charityContributionSchema>

export const defaultCharityContributionValues: Partial<CharityContributionFormData> = {
  participantType: 'member',
  memberId: '',
  groupId: '',
  contributionType: 'money',
  amount: '',
  paymentMethod: 'cash',
  inKindDescription: '',
  estimatedValue: '',
  contributionDate: new Date().toISOString().split('T')[0],
  status: 'confirmed',
  notes: '',
}

// ========== SCHÉMA POUR L'AJOUT D'UN PARTICIPANT ==========

export const charityParticipantSchema = z.object({
  // Type de participant
  participantType: z.enum(['member', 'group'], {
    message: 'Le type de participant est requis',
  }),
  
  // ID du membre ou du groupe
  memberId: z.string().optional(),
  groupId: z.string().optional(),
}).refine(
  (data) => {
    // Au moins un ID doit être fourni
    return data.memberId || data.groupId
  },
  {
    message: 'Vous devez sélectionner un membre ou un groupe',
    path: ['memberId'],
  }
)

export type CharityParticipantFormData = z.infer<typeof charityParticipantSchema>

export const defaultCharityParticipantValues: Partial<CharityParticipantFormData> = {
  participantType: 'member',
  memberId: '',
  groupId: '',
}

// ========== SCHÉMA POUR L'UPLOAD DE MÉDIAS ==========

export const charityMediaSchema = z.object({
  // Type de média
  type: z.enum(['photo', 'video'], {
    message: 'Le type de média est requis',
  }),
  
  // Fichier
  file: z
    .instanceof(File)
    .refine(
      (file) => file.size <= 50 * 1024 * 1024,
      'La taille du fichier ne doit pas dépasser 50MB'
    )
    .refine(
      (file) => {
        const photoFormats = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
        const videoFormats = ['video/mp4', 'video/webm', 'video/quicktime']
        return [...photoFormats, ...videoFormats].includes(file.type)
      },
      'Format non supporté. Photos: JPG, PNG, WEBP. Vidéos: MP4, WEBM, MOV'
    ),
  
  // Métadonnées (optionnelles)
  title: z
    .string()
    .max(100, 'Le titre ne peut pas dépasser 100 caractères')
    .optional(),
  
  description: z
    .string()
    .max(500, 'La description ne peut pas dépasser 500 caractères')
    .optional(),
  
  takenAt: z
    .string()
    .optional(),
})

export type CharityMediaFormData = z.infer<typeof charityMediaSchema>

export const defaultCharityMediaValues: Partial<CharityMediaFormData> = {
  type: 'photo',
  title: '',
  description: '',
  takenAt: '',
}

