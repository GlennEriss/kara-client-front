/**
 * @module membership.db
 * Database operations for membership requests (demandes d'adhésion)
 */

import { RegisterFormData } from "@/types/schemas";
import { createModel } from "./generic.db";
import { uploadProfilePhoto } from "./upload-image.db";
import { firebaseCollectionNames } from "@/constantes/firebase-collection-names";

const getFirestore = () => import("@/firebase/firestore");

/**
 * Fonction utilitaire pour nettoyer les valeurs undefined d'un objet
 * Firestore n'accepte pas les valeurs undefined
 */
function cleanUndefinedValues(obj: any): any {
    if (obj === null || obj === undefined) {
        return null;
    }
    
    if (Array.isArray(obj)) {
        return obj.map(cleanUndefinedValues).filter(item => item !== null);
    }
    
    if (typeof obj === 'object') {
        const cleaned: any = {};
        for (const [key, value] of Object.entries(obj)) {
            if (value !== undefined) {
                cleaned[key] = cleanUndefinedValues(value);
            }
        }
        return cleaned;
    }
    
    return obj;
}

// Interface pour les demandes d'adhésion
export interface MembershipRequest {
    id?: string;
    // Informations d'identité
    identity: {
        lastName: string;
        firstName: string;
        birthDate: string;
        birthPlace: string;
        birthCertificateNumber: string;
        prayerPlace: string;
        contacts: string[];
        email?: string;
        gender: string;
        nationality: string;
        identityDocument: string;
        maritalStatus: string;
        intermediaryCode?: string;
        photoURL?: string | null; // URL de la photo uploadée
        photoPath?: string | null; // Chemin Firebase Storage
    };
    // Adresse
    address: {
        province: string;
        city: string;
        district: string;
        arrondissement: string;
        additionalInfo?: string;
    };
    // Entreprise (optionnel)
    company: {
        isEmployed: boolean;
        companyName?: string;
        companyAddress?: {
            province?: string;
            city?: string;
            district?: string;
        };
        profession?: string;
        seniority?: string;
    };
    // Assurance (optionnel)
    insurance: {
        hasInsurance: boolean;
        insuranceName?: string;
        insuranceType?: string;
        policyNumber?: string;
        startDate?: string;
        expirationDate?: string;
        coverageAmount?: string;
        beneficiaries?: string[];
        additionalNotes?: string;
    };
    // Métadonnées (adapté à la convention du projet)
    state: 'IN_PROGRESS' | 'APPROVED' | 'REJECTED' | 'UNDER_REVIEW' | 'PENDING';
    status: 'pending' | 'approved' | 'rejected' | 'under_review'; // Statut métier
    createdAt?: any; // Timestamp Firestore (ajouté automatiquement par createModel)
    updatedAt?: any; // Timestamp Firestore (ajouté automatiquement par createModel)
    reviewedBy?: string; // ID de l'admin qui a reviewé
    reviewNotes?: string;
    membershipId?: string; // ID généré pour le membre une fois approuvé
}

/**
 * Crée une nouvelle demande d'adhésion en uploadant la photo (si fournie) et sauvegardant les données
 * 
 * @param {RegisterFormData} formData - Les données du formulaire d'inscription
 * @returns {Promise<string>} - L'ID de la demande créée
 * @throws {Error} - En cas d'erreur lors de la création
 */
export async function createMembershipRequest(formData: RegisterFormData): Promise<string> {
    try {
        // Créer un identifiant unique basé sur l'email ou le premier numéro de téléphone
        const userIdentifier = formData.identity.email || 
                              formData.identity.contacts[0] || 
                              `${formData.identity.firstName}_${formData.identity.lastName}_${Date.now()}`;

        // Préparer les données de base (adaptées à createModel)
        // Préparer l'identité sans les propriétés photo initialement
        const { photo, ...identityWithoutPhoto } = formData.identity;
        
        let membershipData: Omit<MembershipRequest, 'id' | 'createdAt' | 'updatedAt'> = {
            identity: {
                ...identityWithoutPhoto
            },
            address: formData.address,
            company: formData.company,
            insurance: {
                ...formData.insurance,
                hasInsurance: formData.insurance.hasCar // hasInsurance = hasCar pour la compatibilité
            },
            state: 'IN_PROGRESS', // Convention du projet (sera ajouté par createModel)
            status: 'pending', // Statut métier spécifique aux adhésions
        };
        console.log('photo', typeof formData.identity.photo)
        // Upload de la photo de profil si fournie (data URL string)
        if (formData.identity.photo && typeof formData.identity.photo === 'string' && formData.identity.photo.startsWith('data:image/')) {
            try {
                // Convertir la data URL en File pour l'upload
                const response = await fetch(formData.identity.photo);
                const blob = await response.blob();
                const file = new File([blob], 'profile-photo.jpg', { type: blob.type });
                
                const { url: fileURL, path: filePATH } = await uploadProfilePhoto(
                    file,
                    userIdentifier
                );
                
                membershipData.identity.photoURL = fileURL;
                membershipData.identity.photoPath = filePATH;
                console.log('fileURL', fileURL)
                console.log('filePATH', filePATH)

            } catch (photoError) {
                console.warn("Erreur lors de l'upload de la photo, continuons sans photo:", photoError);
                // On continue même si l'upload de photo échoue
            }
        }

        // Les propriétés photoURL et photoPath seront ajoutées seulement si l'upload réussit

        // Nettoyer toutes les valeurs undefined avant d'envoyer à Firestore
        const cleanedMembershipData = cleanUndefinedValues(membershipData);
console.log('cleanedMembershipData', cleanedMembershipData)
        // Sauvegarder dans Firestore (createModel ajoute automatiquement les timestamps)
        const membershipId = await createModel<typeof membershipData>(
            cleanedMembershipData, 
            firebaseCollectionNames.membershipRequests || "membership-requests"
        );

        if (!membershipId) {
            throw new Error("Erreur lors de la création de la demande d'adhésion");
        }

        console.log(`Demande d'adhésion créée avec succès: ${membershipId}`);
        return membershipId;

    } catch (error) {
        console.error("Erreur lors de la création de la demande d'adhésion:", error);
        throw new Error("Impossible de soumettre la demande d'adhésion");
    }
}

/**
 * Récupère une demande d'adhésion par son ID
 * 
 * @param {string} requestId - L'ID de la demande
 * @returns {Promise<MembershipRequest | null>} - La demande trouvée ou null
 */
export async function getMembershipRequestById(requestId: string): Promise<MembershipRequest | null> {
    try {
        const { collection, db, doc, getDoc } = await getFirestore();
        const docRef = doc(db, firebaseCollectionNames.membershipRequests || "membership-requests", requestId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            return { id: docSnap.id, ...docSnap.data() } as MembershipRequest;
        } else {
            return null;
        }
    } catch (error) {
        console.error("Erreur lors de la récupération de la demande:", error);
        return null;
    }
}

/**
 * Récupère toutes les demandes d'adhésion avec pagination
 * 
 * @param {number} limit - Nombre maximum de résultats
 * @param {string} status - Filtrer par statut (optionnel)
 * @returns {Promise<MembershipRequest[]>} - Liste des demandes
 */
export async function getAllMembershipRequests(
    limit: number = 50, 
    status?: string
): Promise<MembershipRequest[]> {
    try {
        const { collection, db, getDocs, query, orderBy, limitToLast, where } = await getFirestore();
        const collectionRef = collection(db, firebaseCollectionNames.membershipRequests || "membership-requests");
        
        let q = query(
            collectionRef,
            orderBy("submittedAt", "desc"),
            limitToLast(limit)
        );

        if (status) {
            q = query(
                collectionRef,
                where("status", "==", status),
                orderBy("submittedAt", "desc"),
                limitToLast(limit)
            );
        }

        const querySnapshot = await getDocs(q);
        const requests: MembershipRequest[] = [];

        querySnapshot.forEach((doc) => {
            requests.push({ id: doc.id, ...doc.data() } as MembershipRequest);
        });

        return requests;
    } catch (error) {
        console.error("Erreur lors de la récupération des demandes:", error);
        return [];
    }
}

/**
 * Met à jour le statut d'une demande d'adhésion
 * 
 * @param {string} requestId - L'ID de la demande
 * @param {string} newStatus - Le nouveau statut
 * @param {string} reviewedBy - ID de l'admin qui fait la review (optionnel)
 * @param {string} reviewNotes - Notes de review (optionnel)
 * @returns {Promise<boolean>} - True si la mise à jour a réussi
 */
export async function updateMembershipRequestStatus(
    requestId: string,
    newStatus: MembershipRequest['status'],
    reviewedBy?: string,
    reviewNotes?: string
): Promise<boolean> {
    try {
        const { db, doc, updateDoc, serverTimestamp } = await getFirestore();
        const docRef = doc(db, firebaseCollectionNames.membershipRequests || "membership-requests", requestId);

        const updates: any = {
            status: newStatus,
            updatedAt: serverTimestamp(),
        };

        if (reviewedBy) updates.reviewedBy = reviewedBy;
        if (reviewNotes) updates.reviewNotes = reviewNotes;

        await updateDoc(docRef, updates);
        return true;
    } catch (error) {
        console.error("Erreur lors de la mise à jour du statut:", error);
        return false;
    }
}

/**
 * Recherche des demandes d'adhésion par email
 * 
 * @param {string} email - L'email à rechercher
 * @returns {Promise<MembershipRequest[]>} - Les demandes trouvées
 */
export async function findMembershipRequestsByEmail(email: string): Promise<MembershipRequest[]> {
    try {
        const { getDocs, where, query, collection, db } = await getFirestore();
        const q = query(
            collection(db, firebaseCollectionNames.membershipRequests || "membership-requests"),
            where("identity.email", "==", email)
        );
        
        const querySnapshot = await getDocs(q);
        const requests: MembershipRequest[] = [];

        querySnapshot.forEach((doc) => {
            requests.push({ id: doc.id, ...doc.data() } as MembershipRequest);
        });

        return requests;
    } catch (error) {
        console.error("Erreur lors de la recherche par email:", error);
        return [];
    }
}

/**
 * Recherche des demandes d'adhésion par numéro de téléphone
 * 
 * @param {string} phoneNumber - Le numéro de téléphone à rechercher
 * @returns {Promise<MembershipRequest[]>} - Les demandes trouvées
 */
export async function findMembershipRequestsByPhone(phoneNumber: string): Promise<MembershipRequest[]> {
    try {
        const { getDocs, where, query, collection, db } = await getFirestore();
        const q = query(
            collection(db, firebaseCollectionNames.membershipRequests || "membership-requests"),
            where("identity.contacts", "array-contains", phoneNumber)
        );
        
        const querySnapshot = await getDocs(q);
        const requests: MembershipRequest[] = [];

        querySnapshot.forEach((doc) => {
            requests.push({ id: doc.id, ...doc.data() } as MembershipRequest);
        });

        return requests;
    } catch (error) {
        console.error("Erreur lors de la recherche par téléphone:", error);
        return [];
    }
}

/**
 * Supprime une demande d'adhésion (soft delete en changeant le statut)
 * 
 * @param {string} requestId - L'ID de la demande
 * @returns {Promise<boolean>} - True si la suppression a réussi
 */
export async function deleteMembershipRequest(requestId: string): Promise<boolean> {
    try {
        const { db, doc, updateDoc, serverTimestamp } = await getFirestore();
        const docRef = doc(db, firebaseCollectionNames.membershipRequests || "membership-requests", requestId);

        await updateDoc(docRef, {
            status: 'deleted',
            updatedAt: serverTimestamp(),
        });

        return true;
    } catch (error) {
        console.error("Erreur lors de la suppression:", error);
        return false;
    }
}