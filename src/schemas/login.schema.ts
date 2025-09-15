import { z } from 'zod'

// Schéma de validation pour la connexion membre avec email/mot de passe
export const memberLoginSchema = z.object({
  matricule: z.string().min(1, "Le matricule est requis"),
  email: z.string()
    .email('Format d\'email invalide')
    .min(1, 'L\'email est requis'),
  password: z.string()
    .min(6, 'Le mot de passe doit contenir au moins 6 caractères')
    .max(100, 'Le mot de passe ne peut pas dépasser 100 caractères')
})

export type MemberLoginFormData = z.infer<typeof memberLoginSchema>

export const memberLoginDefaultValues: MemberLoginFormData = {
  matricule: '',
  email: '',
  password: ''
}
