import { IMemberRepository } from "./IMemberRepository";
import { Filleul, MembershipRequest, User } from "@/types/types";
import { firebaseCollectionNames } from "@/constantes/firebase-collection-names";

const getFirestore = () => import("@/firebase/firestore");

export class MemberRepository implements IMemberRepository {
    readonly name = "MemberRepository";

    /**
     * Récupère tous les filleuls ayant un code intermédiaire spécifique
     * Cherche dans les MembershipRequest approuvées car les membres approuvés 
     * conservent leurs données d'origine avec le code intermédiaire
     * 
     * @param {string} intermediaryCode - Le code intermédiaire à rechercher
     * @returns {Promise<Filleul[]>} - Liste des filleuls trouvés
     */
    async getFilleulsByIntermediaryCode(intermediaryCode: string): Promise<Filleul[]> {
        try {
            const { collection, db, getDocs, query, where } = await getFirestore();

            // Chercher dans les MembershipRequest approuvées qui contiennent le code intermédiaire
            const q = query(
                collection(db, firebaseCollectionNames.membershipRequests || "membership-requests"),
                where("identity.intermediaryCode", "==", intermediaryCode),
                where("status", "==", "approved")
            );

            const querySnapshot = await getDocs(q);
            const filleuls: Filleul[] = [];

            querySnapshot.forEach((doc) => {
                const membershipData = { id: doc.id, ...doc.data() } as MembershipRequest;

                // Transformer MembershipRequest en Filleul
                const filleulData: Filleul = {
                    lastName: membershipData.identity.lastName,
                    firstName: membershipData.identity.firstName,
                    matricule: membershipData.matricule || doc.id,
                    photoURL: membershipData.identity.photoURL,
                    photoPath: membershipData.identity.photoPath,
                    createdAt: (membershipData.createdAt as any)?.toDate ? (membershipData.createdAt as any).toDate() : new Date()
                };

                filleuls.push(filleulData);
            });

            return filleuls;

        } catch (error) {
            console.error("Erreur lors de la récupération des filleuls par code intermédiaire:", error);
            return [];
        }
    }

    /**
     * Récupère un membre par son ID (matricule)
     * Cherche dans la collection users
     * 
     * @param {string} memberId - L'ID/matricule du membre
     * @returns {Promise<User | null>} - Le membre trouvé ou null
     */
    async getMemberById(memberId: string): Promise<User | null> {
        try {
            const { doc, getDoc } = await getFirestore();
            const { db } = await getFirestore();
            
            // Chercher dans la collection users avec l'ID comme document ID
            const userRef = doc(db, firebaseCollectionNames.users || "users", memberId);
            const docSnap = await getDoc(userRef);
            
            if (!docSnap.exists()) {
                console.log(`Membre non trouvé avec l'ID: ${memberId}`);
                return null;
            }
            
            const data = docSnap.data();
            
            // Convertir les timestamps Firebase en Date
            const user: User = {
                id: docSnap.id,
                ...(data as any),
                createdAt: (data.createdAt as any)?.toDate ? (data.createdAt as any).toDate() : new Date(),
                updatedAt: (data.updatedAt as any)?.toDate ? (data.updatedAt as any).toDate() : new Date(),
            };
            
            return user;

        } catch (error) {
            console.error("Erreur lors de la récupération du membre par ID:", error);
            return null;
        }
    }

    /**
     * Recherche de membres par matricule, prénom ou nom
     * Cherche dans la collection users
     * 
     * @param {string} searchQuery - La requête de recherche
     * @returns {Promise<User[]>} - Liste des membres trouvés
     */
    async searchMembers(searchQuery: string): Promise<User[]> {
        try {
            const { collection, db, getDocs, query, where, or } = await getFirestore();
            const normalizedQuery = searchQuery.trim().toLowerCase();

            if (!normalizedQuery) {
                return [];
            }

            // Déterminer si c'est un matricule (format: XXXX.XX.XXXXXX)
            const isMatricule = /^\d+\.\w+\.\d+/.test(normalizedQuery);

            let q;
            if (isMatricule) {
                // Recherche exacte par matricule
                q = query(
                    collection(db, firebaseCollectionNames.users || "users"),
                    where("matricule", "==", normalizedQuery)
                );
            } else {
                // Recherche par prénom ou nom (insensible à la casse)
                // Note: Firestore ne supporte pas le LIKE, donc on récupère tous les utilisateurs
                // et on filtre côté client pour une recherche plus flexible
                q = query(collection(db, firebaseCollectionNames.users || "users"));
            }

            const querySnapshot = await getDocs(q);
            const members: User[] = [];

            querySnapshot.forEach((doc) => {
                const data = doc.data();
                const user: User = {
                    id: doc.id,
                    ...(data as any),
                    createdAt: (data.createdAt as any)?.toDate ? (data.createdAt as any).toDate() : new Date(),
                    updatedAt: (data.updatedAt as any)?.toDate ? (data.updatedAt as any).toDate() : new Date(),
                };

                // Si ce n'est pas une recherche par matricule, filtrer côté client
                if (!isMatricule) {
                    const firstName = (user.firstName || '').toLowerCase();
                    const lastName = (user.lastName || '').toLowerCase();
                    
                    if (firstName.includes(normalizedQuery) || lastName.includes(normalizedQuery)) {
                        members.push(user);
                    }
                } else {
                    members.push(user);
                }
            });

            return members;

        } catch (error) {
            console.error("Erreur lors de la recherche de membres:", error);
            return [];
        }
    }

    /**
     * Met à jour la liste des rôles d'un membre
     */
    async updateMemberRoles(memberId: string, roles: string[]): Promise<void> {
        try {
            const { doc, db, updateDoc, serverTimestamp } = await getFirestore();
            const userRef = doc(db, firebaseCollectionNames.users || "users", memberId);
            await updateDoc(userRef, {
                roles,
                updatedAt: serverTimestamp()
            });
        } catch (error) {
            console.error("Erreur lors de la mise à jour des rôles du membre:", error);
            throw error;
        }
    }
}