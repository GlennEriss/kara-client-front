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
                email: data.email || '',
                role: data.role || 'Admin',
            };
            
            return admin;

        } catch (error) {
            console.error("Erreur lors de la récupération de l'administrateur par ID:", error);
            return null;
        }
    }
}

