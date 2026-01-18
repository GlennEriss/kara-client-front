import { IUserRepository } from './IUserRepository';
import type { User } from '@/types/types';
import { firebaseCollectionNames } from '@/constantes/firebase-collection-names';

const getFirestore = () => import('@/firebase/firestore');

/**
 * Repository pour la gestion des utilisateurs dans Firestore
 * 
 * @see https://github.com/kara-gabon/kara-client-front/wiki/Architecture#repositories
 */
export class UserRepository implements IUserRepository {
  readonly name = 'UserRepository';

  /**
   * Récupère un utilisateur par son UID (matricule)
   * 
   * @param uid - L'UID de l'utilisateur (égal au matricule)
   * @returns L'utilisateur trouvé ou null si non trouvé
   */
  async getUserByUid(uid: string): Promise<User | null> {
    try {
      const { doc, getDoc, db, Timestamp } = await getFirestore();
      const collectionName = firebaseCollectionNames.users || 'users';
      
      // Log pour déboguer (temporaire) - visible dans la console du navigateur
      if (typeof window !== 'undefined') {
        console.log('[UserRepository.getUserByUid] Recherche:', {
          uid: uid.trim(),
          collection: collectionName,
          env: process.env.NEXT_PUBLIC_APP_ENV || 'non défini (défaut: development)',
        });
      }
      
      const userDocRef = doc(db, collectionName, uid.trim());
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) {
        // Log pour déboguer
        console.warn('[UserRepository] Utilisateur non trouvé:', {
          uid: uid.trim(),
          collection: collectionName,
          env: typeof window !== 'undefined' ? (process.env.NEXT_PUBLIC_APP_ENV || 'non défini (défaut: development)') : 'server',
        });
        return null;
      }

      const data = userDoc.data();
      
      // Convertir les timestamps Firestore en Date
      const createdAt = data.createdAt?.toDate ? data.createdAt.toDate() : new Date();
      const updatedAt = data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date();

      return {
        id: userDoc.id,
        ...data,
        createdAt,
        updatedAt,
      } as User;
    } catch (error) {
      console.error('Erreur lors de la récupération de l\'utilisateur par UID:', error);
      throw error;
    }
  }

  /**
   * Récupère un utilisateur par son email
   * 
   * @param email - L'email de l'utilisateur
   * @returns L'utilisateur trouvé ou null si non trouvé
   */
  async getUserByEmail(email: string): Promise<User | null> {
    try {
      const { collection, query, where, getDocs, db } = await getFirestore();
      const collectionName = firebaseCollectionNames.users || 'users';
      const collectionRef = collection(db, collectionName);
      
      // Rechercher par email (le champ email peut être optionnel)
      const q = query(collectionRef, where('email', '==', email.trim().toLowerCase()));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        return null;
      }

      // Prendre le premier résultat (normalement il ne devrait y en avoir qu'un)
      const userDoc = querySnapshot.docs[0];
      const data = userDoc.data();

      // Convertir les timestamps Firestore en Date
      const createdAt = data.createdAt?.toDate ? data.createdAt.toDate() : new Date();
      const updatedAt = data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date();

      return {
        id: userDoc.id,
        ...data,
        createdAt,
        updatedAt,
      } as User;
    } catch (error) {
      console.error('Erreur lors de la récupération de l\'utilisateur par email:', error);
      throw error;
    }
  }

  /**
   * Vérifie si un utilisateur existe par son UID
   * 
   * Utilise l'API route pour vérifier dans Firebase Auth et Firestore
   * (users + admins) pour éviter les problèmes de permissions côté client.
   * 
   * Pour la compatibilité avec l'ancienne version, vérifie dans :
   * 1. Firebase Auth (par UID/matricule)
   * 2. Firestore collection 'users' (par UID/matricule)
   * 3. Firestore collection 'admins' (par UID/matricule)
   * 
   * @param uid - L'UID de l'utilisateur
   * @returns true si l'utilisateur existe (dans Auth, users ou admins), false sinon
   */
  async userExists(uid: string): Promise<boolean> {
    try {
      // Utiliser l'API route pour éviter les problèmes de permissions Firestore
      // L'API route utilise Admin SDK côté serveur (pas de restrictions)
      const response = await fetch('/api/auth/check-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: uid.trim() }),
      });

      if (!response.ok) {
        console.error('[UserRepository.userExists] Erreur API:', response.status, response.statusText);
        return false;
      }

      const result = await response.json();
      
      // Log pour déboguer
      if (typeof window !== 'undefined') {
        console.log('[UserRepository.userExists] Résultat:', {
          uid: uid.trim(),
          found: result.found,
          inAuth: result.inAuth,
          inUsers: result.inUsers,
          inAdmins: result.inAdmins,
        });
      }

      return result.found === true;
    } catch (error) {
      console.error('Erreur lors de la vérification de l\'existence de l\'utilisateur:', error);
      return false;
    }
  }
}
