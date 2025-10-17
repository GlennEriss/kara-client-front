import { IAdminRepository } from "./IAdminRepository";
import { Admin } from "@/types/types";

const getFirestore = () => import("@/firebase/firestore");

export class AdminRepository implements IAdminRepository {
    readonly name = "AdminRepository";

    /**
     * Récupère un administrateur par son ID
     * @param {string} id - L'ID de l'administrateur
     * @returns {Promise<Admin | null>} - L'administrateur trouvé ou null
     */
    async getAdminById(id: string): Promise<Admin | null> {
        try {
            const { doc, getDoc, db } = await getFirestore();
            
            // Les admins sont stockés dans la collection 'admins'
            const adminRef = doc(db, "admins", id);
            const docSnap = await getDoc(adminRef);
            
            if (!docSnap.exists()) {
                console.log(`Administrateur non trouvé avec l'ID: ${id}`);
                return null;
            }
            
            const data = docSnap.data();
            
            const admin: Admin = {
                id: docSnap.id,
                lastName: data.lastName || data.name || 'Inconnu',
                firstName: data.firstName || data.prenom || '',
                birthDate: data.birthDate || '',
                civility: data.civility || 'Monsieur',
                gender: data.gender || 'Homme',
                email: data.email || '',
                contacts: data.contacts || [],
                roles: data.roles || (data.role ? [data.role] : ['Admin']),
                photoURL: data.photoURL || null,
                photoPath: data.photoPath || null,
                isActive: data.isActive !== undefined ? data.isActive : true,
                createdBy: data.createdBy,
                updatedBy: data.updatedBy,
                createdAt: data.createdAt?.toDate?.() || undefined,
                updatedAt: data.updatedAt?.toDate?.() || undefined,
            };
            
            return admin;

        } catch (error) {
            console.error("Erreur lors de la récupération de l'administrateur par ID:", error);
            return null;
        }
    }
}

