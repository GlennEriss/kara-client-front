import { z } from 'zod'

// Schéma de validation pour la connexion membre avec email/mot de passe
export const memberLoginSchema = z.object({
  matricule: z.string({ message: "Le matricule est obligatoire" }).min(1, "Le matricule est obligatoire"),
  email: z.string({ message: "L'email est obligatoire" })
    .min(1, 'L\'email est obligatoire')
    .email('Format d\'email invalide'),
  password: z.string({ message: "Le mot de passe est obligatoire" })
    .min(1, 'Le mot de passe est obligatoire')
    .max(100, 'Le mot de passe ne peut pas dépasser 100 caractères')
})

export type MemberLoginFormData = z.infer<typeof memberLoginSchema>
