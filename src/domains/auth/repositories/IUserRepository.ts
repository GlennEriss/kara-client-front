import { IRepository } from '@/repositories/IRepository';
import type { User } from '@/types/types';

/**
 * Interface du repository pour la gestion des utilisateurs
 * 
 * @see https://github.com/kara-gabon/kara-client-front/wiki/Architecture#repositories
 */
export interface IUserRepository extends IRepository {
  /**
   * Récupère un utilisateur par son UID (matricule)
   * 
   * @param uid - L'UID de l'utilisateur (égal au matricule)
   * @returns L'utilisateur trouvé ou null si non trouvé
   */
  getUserByUid(uid: string): Promise<User | null>;

  /**
   * Récupère un utilisateur par son email
   * 
   * @param email - L'email de l'utilisateur
   * @returns L'utilisateur trouvé ou null si non trouvé
   */
  getUserByEmail(email: string): Promise<User | null>;

  /**
   * Vérifie si un utilisateur existe par son UID
   * 
   * @param uid - L'UID de l'utilisateur
   * @returns true si l'utilisateur existe, false sinon
   */
  userExists(uid: string): Promise<boolean>;
}
