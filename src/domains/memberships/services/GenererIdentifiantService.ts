import { MembersRepositoryV2 } from '@/domains/memberships/repositories/MembersRepositoryV2'

const RESET_PASSWORD_API = '/api/auth/admin/reset-member-password'

export interface IdentifiantsPdfData {
  matricule: string
  identifiant: string
  motDePasse: string
}

/**
 * Service pour la fonctionnalité "Générer identifiant" :
 * réinitialise le mot de passe du membre à la valeur du matricule,
 * puis retourne les données pour génération du PDF (matricule, identifiant, mot de passe).
 */
export class GenererIdentifiantService {
  private static instance: GenererIdentifiantService

  private constructor(
    private readonly memberRepo: MembersRepositoryV2 = MembersRepositoryV2.getInstance()
  ) {}

  static getInstance(): GenererIdentifiantService {
    if (!GenererIdentifiantService.instance) {
      GenererIdentifiantService.instance = new GenererIdentifiantService()
    }
    return GenererIdentifiantService.instance
  }

  /**
   * Réinitialise le mot de passe du membre à la valeur du matricule,
   * puis retourne les données pour le PDF (matricule, identifiant, mot de passe).
   * @throws Error si le membre est introuvable ou si l'API de réinitialisation échoue
   */
  async resetPasswordAndGetPdfData(
    memberId: string,
    matricule: string
  ): Promise<IdentifiantsPdfData> {
    const member = await this.memberRepo.getById(memberId)
    if (!member) {
      throw new Error('Membre introuvable')
    }

    const response = await fetch(RESET_PASSWORD_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        memberId,
        newPassword: matricule,
      }),
    })

    if (!response.ok) {
      const data = await response.json().catch(() => ({}))
      const message =
        data?.details || data?.error || response.statusText
      throw new Error(message)
    }

    const identifiant = member.email?.trim() || member.matricule || matricule
    return {
      matricule,
      identifiant,
      motDePasse: matricule,
    }
  }
}
