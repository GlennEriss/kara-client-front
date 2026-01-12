import { IService } from '@/services/interfaces/IService';
import { ZodSafeParseSuccess } from 'zod';

/**
 * Interface du service de login
 * 
 * @see https://github.com/kara-gabon/kara-client-front/wiki/Architecture#services
 */
export interface ILoginService extends IService {
  /**
   * Authentifie un utilisateur avec matricule, email et password
   * 
   * @param data - Données de connexion validées (matricule, email, password)
   * @returns Le token ID Firebase de l'utilisateur authentifié
   * @throws Error si l'utilisateur n'existe pas, si les identifiants sont incorrects, ou si le matricule ne correspond pas à l'email
   */
  signIn(data: ZodSafeParseSuccess<{
    matricule: string;
    email: string;
    password: string;
  }>): Promise<string>;
}
