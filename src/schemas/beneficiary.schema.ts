import { z } from 'zod'

/**
 * Bénéficiaire désigné (ayant-droit) déclaré à l'adhésion.
 *
 * Reprend la section 3 de l'engagement d'adhésion : c'est la personne à qui
 * l'allocation de secours prévue à l'Article 5 du Règlement Intérieur est
 * versée en cas de décès du membre.
 */

const trimString = (val: unknown) => (typeof val === 'string' ? val.trim() : val)

/**
 * L'ayant droit doit être un membre : on enregistre son matricule (choisi dans
 * la recherche des membres). Champ facultatif : sans ayant droit, le membre
 * « INCONNU » est enregistré (voir `resolveBeneficiary`).
 * Les champs `relationship`, `phone`, `idNumber` restent lisibles pour les
 * anciennes déclarations.
 */
export const beneficiarySchema = z.object({
  matricule: z.preprocess(
    trimString,
    z.string()
      .regex(/^(\d+\.MK\.\d+)?$/, "Choisissez un membre : l'ayant droit doit être un membre de LE KARA")
      .optional()
  ),
  lastName: z.string().optional(),
  firstName: z.string().optional(),
  isUnknown: z.boolean().optional(),
  relationship: z.string().optional(),
  phone: z.string().optional(),
  idNumber: z.string().optional(),
})

export type BeneficiaryFormData = z.infer<typeof beneficiarySchema>

export const beneficiaryDefaultValues: BeneficiaryFormData = {
  matricule: '',
  lastName: '',
  firstName: '',
}
