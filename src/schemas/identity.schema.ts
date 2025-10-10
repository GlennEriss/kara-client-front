import { z } from 'zod'

// Énumérations pour les options fixes (valeurs en français)
export const CivilityEnum = z.enum(['Monsieur', 'Madame', 'Mademoiselle'])

export const GenderEnum = z.enum(['Homme', 'Femme'])

export const MaritalStatusEnum = z.enum([
    'Célibataire',
    'Veuf/Veuve',
    'Marié(e)',
    'Concubinage'
])

// ================== IDENTITÉ SCHEMA ==================
export const identitySchema = z.object({
    civility: CivilityEnum,

    lastName: z.preprocess(
        (val) => (typeof val === 'string' ? val.trim() : val),
        z.string("Le nom est obligatoire")
            .min(2, 'Le nom doit contenir au moins 2 caractères')
            .max(50, 'Le nom ne peut pas dépasser 50 caractères')
            .regex(/^[a-zA-ZÀ-ÿ\s'-]+$/, 'Le nom ne peut contenir que des lettres, espaces, apostrophes et tirets')
    ),

    firstName: z.preprocess(
        (val) => (typeof val === 'string' ? val.trim() : val),
        z.string()
            .max(50, 'Le prénom ne peut pas dépasser 50 caractères')
    ).optional().superRefine((value, ctx) => {
        // Si pas de valeur ou valeur vide, c'est valide
        if (!value || value.trim() === '') return

        const trimmedValue = value.trim()

        // Vérifier la longueur minimale
        if (trimmedValue.length < 2) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'Le prénom doit contenir au moins 2 caractères',
                path: ['firstName']
            })
            return
        }

        // Vérifier le format
        if (!/^[a-zA-ZÀ-ÿ\s'-]+$/.test(trimmedValue)) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'Le prénom ne peut contenir que des lettres, espaces, apostrophes et tirets',
                path: ['firstName']
            })
        }
    }),

    birthDate: z.string("La date de naissance est requise")
        .min(1, 'La date de naissance est requise')
        .refine((date) => {
            const birthDate = new Date(date)
            const today = new Date()
            const age = today.getFullYear() - birthDate.getFullYear()
            return age >= 18 && age <= 120
        }, 'Vous devez avoir au moins 18 ans'),

    birthPlace: z.preprocess(
        (val) => (typeof val === 'string' ? val.trim() : val),
        z.string("Le lieu de naissance est requis")
            .min(2, 'Le lieu de naissance doit contenir au moins 2 caractères')
            .max(100, 'Le lieu de naissance ne peut pas dépasser 100 caractères')
    ),

    birthCertificateNumber: z.preprocess(
        (val) => (typeof val === 'string' ? val.trim() : val),
        z.string("Le numéro d'acte de naissance est requis")
            .min(1, 'Le numéro d\'acte de naissance est requis')
            .max(50, 'Le numéro d\'acte de naissance ne peut pas dépasser 50 caractères')
    ),

    prayerPlace: z.preprocess(
        (val) => (typeof val === 'string' ? val.trim() : val),
        z.string("Le lieu de prière est requis")
            .min(2, 'Le lieu de prière doit contenir au moins 2 caractères')
            .max(100, 'Le lieu de prière ne peut pas dépasser 100 caractères')
    ),

    religion: z.preprocess(
        (val) => (typeof val === 'string' ? val.trim() : val),
        z.string("La religion est requise")
            .min(1, 'La religion est requise')
            .max(50, 'La religion ne peut pas dépasser 50 caractères')
    ),

    contacts: z.array(z.string().optional())
        .max(2, 'Maximum 2 numéros de téléphone')
        .superRefine((contacts: Array<string | undefined>, ctx) => {
            let numValid = 0
            const seen = new Set<string>()
            contacts.forEach((value, index) => {
                const str = typeof value === 'string' ? value : ''
                const trimmed = str.trim()
                if (trimmed === '') {
                    // Ignorer les champs vides (gérés par l'UI)
                    return
                }
                
                // Vérifier le format gabonais: +241 + 8 chiffres (Libertis: 62/66, Moov: 65, Airtel: 74/77)
                if (!trimmed.startsWith('+241')) {
                    ctx.addIssue({
                        code: z.ZodIssueCode.custom,
                        path: [index],
                        message: 'Le numéro doit commencer par +241'
                    })
                    return
                }
                
                if (trimmed.length !== 12) {
                    ctx.addIssue({
                        code: z.ZodIssueCode.custom,
                        path: [index],
                        message: 'Le numéro doit contenir exactement 12 caractères (+241 + 8 chiffres)'
                    })
                    return
                }
                
                // Extraire les 8 derniers chiffres après +241
                const phoneDigits = trimmed.substring(4) // Enlever +241
                
                // Vérifier que ce sont bien des chiffres
                if (!/^\d{8}$/.test(phoneDigits)) {
                    ctx.addIssue({
                        code: z.ZodIssueCode.custom,
                        path: [index],
                        message: 'Seuls les chiffres sont autorisés après +241'
                    })
                    return
                }
                
                // Vérifier spécifiquement les 2 premiers chiffres (opérateurs gabonais)
                const operatorCode = phoneDigits.substring(0, 2)
                if (!['62', '65', '66', '74', '77'].includes(operatorCode)) {
                    let operatorName = 'inconnu'
                    let validOptions = ''
                    
                    if (operatorCode.startsWith('6')) {
                        operatorName = 'Libertis/Moov'
                        validOptions = 'Pour Libertis, utilisez 62 ou 66. Pour Moov, utilisez 65'
                    } else if (operatorCode.startsWith('7')) {
                        operatorName = 'Airtel'
                        validOptions = 'Pour Airtel, utilisez 74 ou 77'
                    } else {
                        validOptions = 'Opérateurs valides : Libertis (62, 66), Moov (65) ou Airtel (74, 77)'
                    }
                    
                    ctx.addIssue({
                        code: z.ZodIssueCode.custom,
                        path: [index],
                        message: `Code opérateur "${operatorCode}" invalide. ${validOptions}`
                    })
                    return
                }
                
                numValid += 1
                if (seen.has(trimmed)) {
                    ctx.addIssue({
                        code: z.ZodIssueCode.custom,
                        path: [index],
                        message: 'Les numéros de téléphone doivent être uniques'
                    })
                } else {
                    seen.add(trimmed)
                }
            })
            if (numValid === 0) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: [],
                    message: 'Au moins un numéro de téléphone valide est requis'
                })
            }
        }),

    email: z.preprocess(
        (val) => (typeof val === 'string' && val.trim() === '' ? undefined : val),
        z.string()
            .email('Format d\'email invalide')
            .max(100, 'L\'email ne peut pas dépasser 100 caractères')
            .optional()
    ),

    gender: GenderEnum,

    nationality: z.preprocess(
        (val) => (typeof val === 'string' ? val.trim() : val),
        z.string("La nationalité est requise")
            .min(2, 'La nationalité doit contenir au moins 2 caractères')
            .max(50, 'La nationalité ne peut pas dépasser 50 caractères')
            .regex(/^[a-zA-ZÀ-ÿ\s'-]+$/, 'La nationalité ne peut contenir que des lettres, espaces, apostrophes et tirets')
    ),

    maritalStatus: MaritalStatusEnum,

    // Champs pour le conjoint (requis si marié, en couple, en concubinage ou pacsé)
    spouseLastName: z.string()
        .optional()
        .refine((value) => {
            // Si pas de valeur ou valeur vide, c'est valide (sera géré par la validation conditionnelle)
            if (!value || value.trim() === '') return true
            // Si une valeur est fournie, elle doit respecter les règles
            return value.length >= 2 && value.length <= 50 && /^[a-zA-ZÀ-ÿ\s'-]+$/.test(value)
        }, 'Le nom du conjoint doit contenir entre 2 et 50 caractères et uniquement des lettres, espaces, apostrophes et tirets'),

    spouseFirstName: z.string()
        .optional()
        .refine((value) => {
            // Si pas de valeur ou valeur vide, c'est valide (sera géré par la validation conditionnelle)
            if (!value || value.trim() === '') return true
            // Si une valeur est fournie, elle doit respecter les règles
            return value.length >= 2 && value.length <= 50 && /^[a-zA-ZÀ-ÿ\s'-]+$/.test(value)
        }, 'Le prénom du conjoint doit contenir entre 2 et 50 caractères et uniquement des lettres, espaces, apostrophes et tirets'),

    spousePhone: z.string()
        .optional()
        .superRefine((value, ctx) => {
            // Si pas de valeur ou valeur vide, c'est valide (sera géré par la validation conditionnelle)
            if (!value || value.trim() === '') return
            
            const trimmed = value.trim()
            
            // Vérifier le format gabonais: +241 + 8 chiffres (Libertis: 62/66, Moov: 65, Airtel: 74/77)
            if (!trimmed.startsWith('+241')) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: 'Le numéro du conjoint doit commencer par +241'
                })
                return
            }
            
            if (trimmed.length !== 12) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: 'Le numéro du conjoint doit contenir exactement 12 caractères (+241 + 8 chiffres)'
                })
                return
            }
            
            // Extraire les 8 derniers chiffres après +241
            const phoneDigits = trimmed.substring(4) // Enlever +241
            
            // Vérifier que ce sont bien des chiffres
            if (!/^\d{8}$/.test(phoneDigits)) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: 'Seuls les chiffres sont autorisés après +241 pour le numéro du conjoint'
                })
                return
            }
            
            // Vérifier spécifiquement les 2 premiers chiffres (opérateurs gabonais)
            const operatorCode = phoneDigits.substring(0, 2)
            if (!['62', '65', '66', '74', '77'].includes(operatorCode)) {
                let validOptions = ''
                
                if (operatorCode.startsWith('6')) {
                    validOptions = 'Pour Libertis, utilisez 62 ou 66. Pour Moov, utilisez 65'
                } else if (operatorCode.startsWith('7')) {
                    validOptions = 'Pour Airtel, utilisez 74 ou 77'
                } else {
                    validOptions = 'Opérateurs valides : Libertis (62, 66), Moov (65) ou Airtel (74, 77)'
                }
                
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: `Code opérateur "${operatorCode}" invalide pour le conjoint. ${validOptions}`
                })
            }
        }),

    intermediaryCode: z.preprocess(
        (val) => (typeof val === 'string' ? val.trim() : val),
        z.string("Le code entremetteur est requis")
            .min(2, 'Le nom doit contenir au moins 2 caractères')
            .max(50, 'Le code entremetteur ne peut pas dépasser 50 caractères')
            .regex(
                /^\d{4}\.MK\.\d{6}$/,
                'Format requis: [Numéro].MK.[Date] (ex: 0001.MK.160925)'
            )
    ),

    // Nouvelle question simple pour la voiture
    hasCar: z.boolean().default(false),

    photo: z.union([
        z.string().startsWith('data:image/', 'Format de photo invalide'),
        z.instanceof(File)
    ])
        .refine(
            (value: any) => {
                if (!value) return false // Photo obligatoire
                if (typeof value === 'string') {
                    // Pour les data URLs, on ne peut pas vérifier la taille facilement
                    // mais on peut vérifier le format
                    return value.startsWith('data:image/jpeg') ||
                        value.startsWith('data:image/png') ||
                        value.startsWith('data:image/webp')
                }
                if (value instanceof File) {
                    return value.size <= 5 * 1024 * 1024 && // 5MB
                        ['image/jpeg', 'image/png', 'image/webp'].includes(value.type)
                }
                return false
            },
            'Une photo de profil est requise au format JPEG, PNG ou WebP (max 5MB)'
        )
}).refine((data) => {
    // Si la situation matrimoniale indique un conjoint, les champs du conjoint deviennent obligatoires
    const marriedStatuses = ['Marié(e)', 'Concubinage']

    if (marriedStatuses.includes(data.maritalStatus)) {
        // Pour les situations avec conjoint, vérifier que les champs sont remplis
        const hasSpouseLastName = data.spouseLastName && data.spouseLastName.trim().length >= 2
        const hasSpouseFirstName = data.spouseFirstName && data.spouseFirstName.trim().length >= 2
        const hasSpousePhone = data.spousePhone && data.spousePhone.trim().length >= 8

        return hasSpouseLastName && hasSpouseFirstName && hasSpousePhone
    } else {
        // Pour les situations sans conjoint, les champs du conjoint ne doivent pas bloquer la validation
        // même s'ils contiennent des données (on les ignore)
        return true
    }
}, {
    message: 'Les informations du conjoint sont requises pour votre situation matrimoniale',
    path: ['spouseLastName']
})

// ================== TYPES INFÉRÉS ==================
export type Civility = z.infer<typeof CivilityEnum>
export type Gender = z.infer<typeof GenderEnum>
export type MaritalStatus = z.infer<typeof MaritalStatusEnum>
export type IdentityFormData = z.infer<typeof identitySchema>

// ================== VALEURS PAR DÉFAUT ==================
export const identityDefaultValues: Partial<IdentityFormData> = {
    civility: 'Monsieur',
    contacts: [''],
    gender: 'Homme',
    nationality: 'GA',
    maritalStatus: 'Célibataire',
    hasCar: false,
}
