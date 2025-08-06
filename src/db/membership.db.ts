/**
 * @module membership.db
 * Database operations for membership requests (demandes d'adhésion)
 */

import { RegisterFormData } from "@/types/schemas";
import { createModel } from "./generic.db";
import { uploadProfilePhoto, uploadDocumentPhoto } from "./upload-image.db";
import { firebaseCollectionNames } from "@/constantes/firebase-collection-names";
import type { MembershipRequestStatus, MembershipRequest, PaginatedMembershipRequests } from "@/types/types";

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

// Interface étendue pour la base de données avec champs supplémentaires
export interface MembershipRequestDB extends Omit<MembershipRequest, 'id' | 'createdAt' | 'updatedAt'> {
    id?: string;
    // Champs spécifiques à la base de données pour les photos
    identity: MembershipRequest['identity'] & {
        photoURL?: string | null; // URL de la photo uploadée
        photoPath?: string | null; // Chemin Firebase Storage
    };
    // Champs spécifiques pour les documents avec URLs
    documents: MembershipRequest['documents'] & {
        documentPhotoFrontURL?: string | null; // URL de la photo recto uploadée
        documentPhotoFrontPath?: string | null; // Chemin Firebase Storage recto
        documentPhotoBackURL?: string | null; // URL de la photo verso uploadée
        documentPhotoBackPath?: string | null; // Chemin Firebase Storage verso
    };
    // Métadonnées (adapté à la convention du projet)
    state?: 'IN_PROGRESS' | 'APPROVED' | 'REJECTED' | 'UNDER_REVIEW' | 'PENDING';
    createdAt?: any; // Timestamp Firestore (ajouté automatiquement par createModel)
    updatedAt?: any; // Timestamp Firestore (ajouté automatiquement par createModel)
    reviewedBy?: string; // ID de l'admin qui a reviewé
    membershipId?: string; // ID généré pour le membre une fois approuvé
}

/**
 * Fonction utilitaire pour transformer MembershipRequestDB en MembershipRequest
 * Mappe correctement tous les champs nécessaires
 */
function transformDBToMembershipRequest(dbData: any): MembershipRequest {
    const { state, reviewedBy, membershipId, ...baseData } = dbData;
    
    return {
        ...baseData,
        // Garder les champs photo dans identity et documents car ils sont maintenant dans RegisterFormData
        identity: {
            ...dbData.identity
        },
        documents: {
            ...dbData.documents
        },
        // Mapper les champs si nécessaire
        processedBy: reviewedBy,
        memberNumber: membershipId,
    } as MembershipRequest;
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
        
        // Préparer les documents sans les photos initialement
        const { documentPhotoFront, documentPhotoBack, ...documentsWithoutPhotos } = formData.documents;
        
        let membershipData: Omit<MembershipRequestDB, 'id' | 'createdAt' | 'updatedAt'> = {
            identity: {
                ...identityWithoutPhoto
            },
            address: formData.address,
            company: formData.company,
            documents: {
                ...documentsWithoutPhotos
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
                const file = new File([blob], 'profile-photo.webp', { type: 'image/webp' });
                
                const { url: fileURL, path: filePATH } = await uploadProfilePhoto(
                    file,
                    userIdentifier
                );
                
                membershipData.identity.photoURL = fileURL;
                membershipData.identity.photoPath = filePATH;
                console.log('Profile photo uploaded:', fileURL)

            } catch (photoError) {
                console.warn("Erreur lors de l'upload de la photo de profil, continuons sans photo:", photoError);
                // On continue même si l'upload de photo échoue
            }
        }

        // Upload de la photo recto du document si fournie
        if (formData.documents.documentPhotoFront && typeof formData.documents.documentPhotoFront === 'string' && formData.documents.documentPhotoFront.startsWith('data:image/')) {
            try {
                // Convertir la data URL en File pour l'upload
                const response = await fetch(formData.documents.documentPhotoFront);
                const blob = await response.blob();
                const file = new File([blob], 'document-recto.webp', { type: 'image/webp' });
                
                const { url: frontURL, path: frontPATH } = await uploadDocumentPhoto(
                    file,
                    userIdentifier,
                    'recto'
                );
                
                membershipData.documents.documentPhotoFrontURL = frontURL;
                membershipData.documents.documentPhotoFrontPath = frontPATH;
                console.log('Document recto uploaded:', frontURL)

            } catch (frontPhotoError) {
                console.warn("Erreur lors de l'upload de la photo recto du document:", frontPhotoError);
                // On continue même si l'upload échoue
            }
        }

        // Upload de la photo verso du document si fournie
        if (formData.documents.documentPhotoBack && typeof formData.documents.documentPhotoBack === 'string' && formData.documents.documentPhotoBack.startsWith('data:image/')) {
            try {
                // Convertir la data URL en File pour l'upload
                const response = await fetch(formData.documents.documentPhotoBack);
                const blob = await response.blob();
                const file = new File([blob], 'document-verso.webp', { type: 'image/webp' });
                
                const { url: backURL, path: backPATH } = await uploadDocumentPhoto(
                    file,
                    userIdentifier,
                    'verso'
                );
                
                membershipData.documents.documentPhotoBackURL = backURL;
                membershipData.documents.documentPhotoBackPath = backPATH;
                console.log('Document verso uploaded:', backURL)

            } catch (backPhotoError) {
                console.warn("Erreur lors de l'upload de la photo verso du document:", backPhotoError);
                // On continue même si l'upload échoue
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
            const dbData = { id: docSnap.id, ...docSnap.data() };
            return transformDBToMembershipRequest(dbData);
        } else {
            return null;
        }
    } catch (error) {
        console.error("Erreur lors de la récupération de la demande:", error);
        return null;
    }
}

// Interface importée de types.ts

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
            orderBy("createdAt", "desc"),
            limitToLast(limit)
        );

        if (status) {
            q = query(
                collectionRef,
                where("status", "==", status),
                orderBy("createdAt", "desc"),
                limitToLast(limit)
            );
        }

        const querySnapshot = await getDocs(q);
        const requests: MembershipRequest[] = [];

        querySnapshot.forEach((doc) => {
            const dbData = { id: doc.id, ...doc.data() };
            requests.push(transformDBToMembershipRequest(dbData));
        });

        return requests;
    } catch (error) {
        console.error("Erreur lors de la récupération des demandes:", error);
        return [];
    }
}

/**
 * Récupère les demandes d'adhésion avec pagination avancée
 * Utilise les curseurs Firebase pour une pagination efficace
 * 
 * @param {object} options - Options de pagination
 * @returns {Promise<PaginatedMembershipRequests>} - Résultats paginés
 */
export async function getMembershipRequestsPaginated(options: {
    page?: number;
    limit?: number;
    status?: MembershipRequestStatus | 'all';
    searchQuery?: string;
    startAfterDoc?: any;
    orderByField?: string;
    orderByDirection?: 'asc' | 'desc';
} = {}): Promise<PaginatedMembershipRequests> {
    try {
        const {
            page = 1,
            limit = 10,
            status,
            searchQuery,
            startAfterDoc,
            orderByField = 'createdAt',
            orderByDirection = 'desc'
        } = options;

        const { 
            collection, 
            db, 
            getDocs, 
            query, 
            orderBy, 
            limit: fbLimit, 
            where,
            startAfter,
            getCountFromServer
        } = await getFirestore();
        
        const collectionRef = collection(db, firebaseCollectionNames.membershipRequests || "membership-requests");
        
        // Construction de la requête de base
        let constraints: any[] = [
            orderBy(orderByField, orderByDirection),
            fbLimit(limit)
        ];

        // Filtrage par statut
        if (status && status !== 'all') {
            constraints.unshift(where("status", "==", status));
        }

        // Cursor pour la pagination
        if (startAfterDoc) {
            constraints.push(startAfter(startAfterDoc));
        }

        // Construction de la requête finale
        const q = query(collectionRef, ...constraints);

        // Exécution de la requête
        const querySnapshot = await getDocs(q);
        const requests: MembershipRequest[] = [];

        querySnapshot.forEach((doc) => {
            const dbData = { id: doc.id, ...doc.data() };
            requests.push(transformDBToMembershipRequest(dbData));
        });

        // Récupération du nombre total d'éléments pour la pagination
        let totalItemsQuery = query(collectionRef);
        if (status && status !== 'all') {
            totalItemsQuery = query(collectionRef, where("status", "==", status));
        }
        
        const totalCountSnapshot = await getCountFromServer(totalItemsQuery);
        const totalItems = totalCountSnapshot.data().count;

        // Calcul des informations de pagination
        const totalPages = Math.ceil(totalItems / limit);
        const hasNextPage = requests.length === limit;
        const hasPrevPage = page > 1;
        
        // Curseurs pour navigation
        const nextCursor = requests.length > 0 ? querySnapshot.docs[querySnapshot.docs.length - 1] : null;
        const prevCursor = requests.length > 0 ? querySnapshot.docs[0] : null;

        // Filtrage côté client pour la recherche (si nécessaire)
        let filteredRequests = requests;
        if (searchQuery && searchQuery.trim()) {
            const searchTerm = searchQuery.toLowerCase().trim();
            filteredRequests = requests.filter(request => 
                request.identity.firstName.toLowerCase().includes(searchTerm) ||
                request.identity.lastName.toLowerCase().includes(searchTerm) ||
                request.identity.email?.toLowerCase().includes(searchTerm) ||
                request.identity.nationality.toLowerCase().includes(searchTerm) ||
                request.identity.contacts.some(contact => contact.includes(searchTerm))
            );
        }

        return {
            data: filteredRequests,
            pagination: {
                currentPage: page,
                totalPages,
                totalItems,
                itemsPerPage: limit,
                hasNextPage,
                hasPrevPage,
                nextCursor,
                prevCursor
            }
        };

    } catch (error) {
        console.error("Erreur lors de la récupération paginée des demandes:", error);
        return {
            data: [],
            pagination: {
                currentPage: 1,
                totalPages: 0,
                totalItems: 0,
                itemsPerPage: options.limit || 10,
                hasNextPage: false,
                hasPrevPage: false,
                nextCursor: null,
                prevCursor: null
            }
        };
    }
}

/**
 * Met à jour le statut d'une demande d'adhésion
 * 
 * @param {string} requestId - L'ID de la demande
 * @param {string} newStatus - Le nouveau statut
 * @param {string} reviewedBy - ID de l'admin qui fait la review (optionnel)
 * @returns {Promise<boolean>} - True si la mise à jour a réussi
 */
export async function updateMembershipRequestStatus(
    requestId: string,
    newStatus: MembershipRequestStatus,
    reviewedBy?: string,
    reviewNote?: string
): Promise<boolean> {
    try {
        const { db, doc, updateDoc, serverTimestamp } = await getFirestore();
        const docRef = doc(db, firebaseCollectionNames.membershipRequests || "membership-requests", requestId);

        const updates: any = {
            status: newStatus,
            updatedAt: serverTimestamp(),
        };

        if (reviewedBy) updates.reviewedBy = reviewedBy;
        
        // Sauvegarder la note de correction si fournie
        if (reviewNote && reviewNote.trim()) {
            updates['reviewNote'] = reviewNote.trim();
        }

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
            const dbData = { id: doc.id, ...doc.data() };
            requests.push(transformDBToMembershipRequest(dbData));
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
            const dbData = { id: doc.id, ...doc.data() };
            requests.push(transformDBToMembershipRequest(dbData));
        });

        return requests;
    } catch (error) {
        console.error("Erreur lors de la recherche par téléphone:", error);
        return [];
    }
}

/**
 * Vérifie si un numéro de téléphone est déjà utilisé dans une autre demande d'adhésion
 * 
 * @param {string} phoneNumber - Le numéro de téléphone à vérifier
 * @param {string} excludeRequestId - ID de la demande à exclure de la vérification (optionnel)
 * @returns {Promise<{isUsed: boolean, existingRequest?: MembershipRequest}>} - Résultat de la vérification
 */
export async function checkPhoneNumberExists(
    phoneNumber: string, 
    excludeRequestId?: string
): Promise<{isUsed: boolean, existingRequest?: MembershipRequest}> {
    try {
        // Normaliser le numéro de téléphone (même logique que dans l'API)
        let normalizedPhone = phoneNumber.trim();
        
        // Vérifier s'il y a déjà un indicatif +221 ou +241
        if (!normalizedPhone.startsWith('+221') && !normalizedPhone.startsWith('+241')) {
            // Nettoyer le numéro
            normalizedPhone = normalizedPhone.replace(/[\s\-\(\)]/g, '');
            // Supprimer le + s'il y en a un au début
            if (normalizedPhone.startsWith('+')) {
                normalizedPhone = normalizedPhone.substring(1);
            }
            // Supprimer le 0 en début s'il y en a un
            if (normalizedPhone.startsWith('0')) {
                normalizedPhone = normalizedPhone.substring(1);
            }
            // Ajouter l'indicatif +241 par défaut
            normalizedPhone = '+241' + normalizedPhone;
        }

        console.log('Vérification du numéro normalisé:', normalizedPhone);

        // Chercher toutes les demandes avec ce numéro de téléphone
        const existingRequests = await findMembershipRequestsByPhone(normalizedPhone);
        
        // Filtrer pour exclure la demande actuelle si spécifiée
        const filteredRequests = existingRequests.filter(request => 
            excludeRequestId ? request.id !== excludeRequestId : true
        );

        if (filteredRequests.length > 0) {
            return {
                isUsed: true,
                existingRequest: filteredRequests[0] // Retourner la première demande trouvée
            };
        }

        return { isUsed: false };

    } catch (error) {
        console.error("Erreur lors de la vérification du numéro de téléphone:", error);
        // En cas d'erreur, considérer comme non utilisé pour ne pas bloquer l'utilisateur
        return { isUsed: false };
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