import { MembersRepositoryV2 } from '@/domains/memberships/repositories/MembersRepositoryV2'

const RESET_PASSWORD_API = '/api/auth/admin/reset-member-password'

export interface IdentifiantsPdfData {
  matricule: string
  email: string | null
  identifiant: string
  motDePasse: string
}

/**
 * Service pour la fonctionnalité "Générer identifiant" :
 * réinitialise le mot de passe du membre à une valeur aléatoire,
 * puis retourne les données pour génération du PDF (matricule, email, identifiant, mot de passe).
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
   * Réinitialise le mot de passe du membre à une valeur aléatoire,
   * puis retourne les données pour le PDF (matricule, email, identifiant, mot de passe).
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
      }),
    })

    if (!response.ok) {
      const data = await response.json().catch(() => ({}))
      const message =
        data?.details || data?.error || response.statusText
      throw new Error(message)
    }

    const data = (await response.json().catch(() => ({}))) as {
      email?: string | null
      newPassword?: string
    }
    const email = (data?.email ?? null) ? String(data.email).trim() : null
    const newPassword = data?.newPassword ? String(data.newPassword) : ''

    const identifiant = email || member.email?.trim() || member.matricule || matricule
    return {
      matricule,
      email,
      identifiant,
      motDePasse: newPassword,
    }
  }
}
