import { ILoginService } from './ILoginService';
import { IUserRepository } from '../repositories/IUserRepository';
import { ZodSafeParseSuccess } from 'zod';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/firebase/auth';

/**
 * Service de gestion de l'authentification
 * 
 * @see https://github.com/kara-gabon/kara-client-front/wiki/Architecture#services
 */
export class LoginService implements ILoginService {
  readonly name = 'LoginService';

  constructor(private userRepository: IUserRepository) {}

  /**
   * Authentifie un utilisateur avec matricule, email et password
   * 
   * @param data - Données de connexion validées (matricule, email, password)
   * @returns Le token ID Firebase de l'utilisateur authentifié
   * @throws Error si l'utilisateur n'existe pas, si les identifiants sont incorrects, ou si le matricule ne correspond pas à l'email
   */
  async signIn(data: ZodSafeParseSuccess<{
    matricule: string;
    email: string;
    password: string;
  }>): Promise<string> {
    const { matricule, email, password } = data.data;

    // 1) Vérifier l'existence de l'utilisateur par UID (matricule)
    const userExists = await this.userRepository.userExists(matricule.trim());
    if (!userExists) {
      throw new Error('USER_NOT_FOUND');
    }

    // 2) Tentative de connexion avec email/mot de passe Firebase
    let userCred;
    try {
      userCred = await signInWithEmailAndPassword(auth, email, password);
    } catch (error: any) {
      // Transformer les erreurs Firebase en erreurs métier
      if (error.code === 'auth/user-not-found') {
        throw new Error('USER_NOT_FOUND');
      } else if (error.code === 'auth/wrong-password') {
        throw new Error('WRONG_PASSWORD');
      } else if (error.code === 'auth/invalid-email') {
        throw new Error('INVALID_EMAIL');
      } else if (error.code === 'auth/too-many-requests') {
        throw new Error('TOO_MANY_REQUESTS');
      }
      throw error;
    }

    if (!userCred.user) {
      throw new Error('AUTHENTICATION_FAILED');
    }

    // 3) Vérifier que l'utilisateur connecté correspond au matricule
    if (userCred.user.uid !== matricule.trim()) {
      throw new Error('MATRICULE_EMAIL_MISMATCH');
    }

    // 4) Obtenir le token ID pour l'authentification côté serveur
    return await userCred.user.getIdToken();
  }
}
