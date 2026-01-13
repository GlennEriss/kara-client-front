import { IDocumentRepository, DocumentListQuery, DocumentListResult, DocumentSortInput } from "./IDocumentRepository";
import { Document } from "../entities/document.types";
import { firebaseCollectionNames } from "@/constantes/firebase-collection-names";
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getStorageInstance } from '@/firebase/storage';

const getFirestore = () => import("@/firebase/firestore");

export class DocumentRepository implements IDocumentRepository {
    readonly name = "DocumentRepository";

    async getDocuments(params: DocumentListQuery): Promise<DocumentListResult> {
        const { memberId, type } = params;
        const page = Math.max(1, params.page ?? 1);
        const pageSize = Math.max(1, params.pageSize ?? 10);
        const sort: DocumentSortInput[] = (params.sort && params.sort.length > 0)
            ? params.sort
            : [
                { field: 'type', direction: 'asc' },
                { field: 'createdAt', direction: 'desc' },
            ];

        try {
            const {
                collection,
                query,
                where,
                orderBy,
                limit,
                startAfter,
                getDocs,
                getCountFromServer,
                db
            } = await getFirestore();

            const collectionRef = collection(db, firebaseCollectionNames.documents || "documents");

            const constraints: any[] = [
                where("memberId", "==", memberId)
            ];

            if (type) {
                constraints.push(where("type", "==", type));
            }

            const sortConstraints = sort.map(sortItem => orderBy(sortItem.field, sortItem.direction));

            const baseQuery = query(collectionRef, ...constraints, ...sortConstraints);

            const countSnapshot = await getCountFromServer(baseQuery);
            const totalItems = countSnapshot.data().count;
            const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

            let paginatedQuery = query(baseQuery, limit(pageSize));

            if (page > 1) {
                const offset = (page - 1) * pageSize;
                const offsetQuery = query(baseQuery, limit(offset));
                const offsetSnapshot = await getDocs(offsetQuery);
                const lastDoc = offsetSnapshot.docs[offsetSnapshot.docs.length - 1];
                if (lastDoc) {
                    paginatedQuery = query(baseQuery, startAfter(lastDoc), limit(pageSize));
                }
            }

            const snapshot = await getDocs(paginatedQuery);

            const documents = snapshot.docs.map(doc => ({
                id: doc.id,
                ...(doc.data() as any),
                createdAt: doc.data().createdAt?.toDate() || new Date(),
                updatedAt: doc.data().updatedAt?.toDate() || new Date(),
            })) as Document[];

            const typesSnapshot = await getDocs(
                query(
                    collectionRef,
                    where("memberId", "==", memberId)
                )
            );

            const availableTypes = Array.from(
                new Set(
                    typesSnapshot.docs
                        .map(doc => doc.data()?.type)
                        .filter(Boolean) as string[]
                )
            ).sort((a, b) => a.localeCompare(b));

            return {
                documents,
                page,
                pageSize,
                totalItems,
                totalPages,
                availableTypes,
            };
        } catch (error) {
            console.error("Erreur lors de la récupération des documents:", error);
            throw error;
        }
    }

    /**
     * Téléverse un fichier PDF vers Firebase Storage
     * @param {File} file - Le fichier à téléverser
     * @param {string} memberId - ID du membre
     * @param {string} documentType - Type de document
     * @returns {Promise<{url: string, path: string, size: number}>}
     */
    async uploadDocumentFile(file: File, memberId: string, documentType: string): Promise<{ url: string; path: string; size: number }> {
        try {
            const storage = getStorageInstance();
            
            const timestamp = Date.now();
            const fileName = `${timestamp}_${documentType}_${file.name}`;
            const filePath = `contracts-ci/${memberId}/${fileName}`;

            const storageRef = ref(storage, filePath);
            
            // Métadonnées du fichier
            const metadata = {
                contentType: file.type,
                customMetadata: {
                    memberId: memberId,
                    documentType: documentType,
                    uploadedAt: new Date().toISOString()
                }
            };

            // Upload du fichier
            const snapshot = await uploadBytes(storageRef, file, metadata);

            // Récupérer l'URL de téléchargement
            const downloadURL = await getDownloadURL(snapshot.ref);
            
            return {
                url: downloadURL,
                path: filePath,
                size: file.size
            };
        } catch (error: any) {
            console.error('❌ Upload failed:', error);
            
            // Gestion des erreurs d'autorisation
            if (error.code === 'storage/unauthorized') {
                console.log('🔄 Unauthorized error, retrying...');
                
                try {
                    const storage = getStorageInstance();
                    const timestamp = Date.now();
                    const fileName = `${timestamp}_${documentType}_${file.name}`;
                    const filePath = `contracts-ci/${memberId}/${fileName}`;
                    const storageRef = ref(storage, filePath);
                    
                    const snapshot = await uploadBytes(storageRef, file);
                    const downloadURL = await getDownloadURL(snapshot.ref);
                    
                    console.log('✅ Retry successful!');
                    return {
                        url: downloadURL,
                        path: filePath,
                        size: file.size
                    };
                } catch (retryError: any) {
                    throw new Error(`Failed to upload document: ${retryError.message}`);
                }
            }
            
            throw new Error(`Failed to upload document: ${error.message}`);
        }
    }

    /**
     * Télécharge une image depuis une URL et la re-upload vers Firebase Storage
     * Utile pour réorganiser les images uploadées temporairement
     * @param {string} imageUrl - URL de l'image à télécharger
     * @param {string} memberId - ID du membre
     * @param {string} contractId - ID du contrat
     * @param {string} imageType - Type d'image (ex: 'emergency-contact-document')
     * @returns {Promise<{url: string, path: string}>}
     */
    async uploadImage(imageUrl: string, memberId: string, contractId: string, imageType: string): Promise<{ url: string; path: string }> {
        try {
            console.log('📥 Téléchargement de l\'image depuis:', imageUrl)
            
            // Télécharger l'image depuis l'URL
            const response = await fetch(imageUrl)
            if (!response.ok) {
                throw new Error(`Échec du téléchargement de l'image: ${response.statusText}`)
            }
            
            const blob = await response.blob()
            const file = new File([blob], `${imageType}.jpg`, { type: blob.type })
            
            console.log('📤 Upload de l\'image vers Firebase Storage...')
            
            const storage = getStorageInstance()
            const timestamp = Date.now()
            const fileName = `${timestamp}_${imageType}_${memberId}.jpg`
            const filePath = `contracts-ci/${memberId}/${contractId}/${fileName}`
            
            const storageRef = ref(storage, filePath)
            
            // Métadonnées du fichier
            const metadata = {
                contentType: blob.type,
                customMetadata: {
                    memberId: memberId,
                    contractId: contractId,
                    imageType: imageType,
                    uploadedAt: new Date().toISOString()
                }
            }
            
            // Upload du fichier
            const snapshot = await uploadBytes(storageRef, file, metadata)
            
            // Récupérer l'URL de téléchargement
            const downloadURL = await getDownloadURL(snapshot.ref)
            
            console.log('✅ Image uploadée avec succès!')
            console.log('📍 Path:', filePath)
            console.log('🔗 URL:', downloadURL)
            
            return {
                url: downloadURL,
                path: filePath
            }
        } catch (error: any) {
            console.error('❌ Erreur lors de l\'upload de l\'image:', error)
            throw new Error(`Failed to upload image: ${error.message}`)
        }
    }

    /**
     * Crée un nouveau document avec un ID personnalisé
     * @param {Omit<Document, 'id' | 'createdAt' | 'updatedAt'>} data - Données du document
     * @returns {Promise<Document>}
     */
    async createDocument(data: Omit<Document, 'id' | 'createdAt' | 'updatedAt'>, customId?: string): Promise<Document> {
        try {
            const { doc, setDoc, db, serverTimestamp } = await getFirestore();

            // Utiliser l'ID personnalisé fourni, sinon générer l'ID par défaut
            let documentId: string;
            if (customId) {
                documentId = customId;
            } else {
                // Générer l'ID personnalisé : MK_{documentType}_{memberId}_{ddMMyy}_{HHmm}
                const now = new Date();
                const day = String(now.getDate()).padStart(2, '0');
                const month = String(now.getMonth() + 1).padStart(2, '0');
                const year = String(now.getFullYear()).slice(-2);
                const hours = String(now.getHours()).padStart(2, '0');
                const minutes = String(now.getMinutes()).padStart(2, '0');
                
                documentId = `MK_${data.type}_${data.memberId}_${day}${month}${year}_${hours}${minutes}`;
            }


            const documentRef = doc(db, firebaseCollectionNames.documents || "documents", documentId);

            await setDoc(documentRef, {
                ...data,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });

            // Récupérer le document créé
            const createdDoc = await this.getDocumentById(documentId);
            
            if (!createdDoc) {
                throw new Error("Erreur lors de la récupération du document créé");
            }

            return createdDoc;

        } catch (error) {
            console.error("Erreur lors de la création du document:", error);
            throw error;
        }
    }

    /**
     * Récupère un document par son ID
     * @param {string} id - L'ID du document
     * @returns {Promise<Document | null>}
     */
    async getDocumentById(id: string): Promise<Document | null> {
        try {
            const { doc, getDoc, db } = await getFirestore();
            
            const documentRef = doc(db, firebaseCollectionNames.documents || "documents", id);
            const docSnap = await getDoc(documentRef);
            
            if (!docSnap.exists()) {
                return null;
            }
            
            const data = docSnap.data();
            
            return {
                id: docSnap.id,
                ...(data as any),
                createdAt: data.createdAt?.toDate() || new Date(),
                updatedAt: data.updatedAt?.toDate() || new Date(),
            } as Document;

        } catch (error) {
            console.error("Erreur lors de la récupération du document:", error);
            return null;
        }
    }

    /**
     * Récupère tous les documents d'un contrat
     * @param {string} contractId - L'ID du contrat
     * @returns {Promise<Document[]>}
     */
    async getDocumentsByContractId(contractId: string): Promise<Document[]> {
        try {
            const { collection, query, where, getDocs, db } = await getFirestore();

            const q = query(
                collection(db, firebaseCollectionNames.documents || "documents"),
                where("contractId", "==", contractId)
            );

            const snapshot = await getDocs(q);
            
            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                createdAt: doc.data().createdAt?.toDate() || new Date(),
                updatedAt: doc.data().updatedAt?.toDate() || new Date(),
            })) as Document[];

        } catch (error) {
            console.error("Erreur lors de la récupération des documents du contrat:", error);
            return [];
        }
    }

    /**
     * Récupère tous les documents d'un membre
     * @param {string} memberId - L'ID du membre
     * @returns {Promise<Document[]>}
     */
    async getDocumentsByMemberId(memberId: string): Promise<Document[]> {
        try {
            const { collection, query, where, getDocs, db } = await getFirestore();

            const q = query(
                collection(db, firebaseCollectionNames.documents || "documents"),
                where("memberId", "==", memberId)
            );

            const snapshot = await getDocs(q);
            
            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                createdAt: doc.data().createdAt?.toDate() || new Date(),
                updatedAt: doc.data().updatedAt?.toDate() || new Date(),
            })) as Document[];

        } catch (error) {
            console.error("Erreur lors de la récupération des documents du membre:", error);
            return [];
        }
    }

    /**
     * Récupère tous les documents avec filtres optionnels (DÉPRÉCIÉ - Utiliser getPaginatedDocuments)
     * @param {DocumentFilters} filters - Filtres optionnels
     * @returns {Promise<Document[]>}
     */
    async getAllDocuments(filters?: any): Promise<Document[]> {
        try {
            const { collection, query, where, getDocs, db, orderBy } = await getFirestore();

            let q = query(
                collection(db, firebaseCollectionNames.documents || "documents"),
                orderBy("createdAt", "desc")
            );

            // Appliquer les filtres si fournis
            if (filters?.type) {
                q = query(q, where("type", "==", filters.type));
            }

            if (filters?.format) {
                q = query(q, where("format", "==", filters.format));
            }

            if (filters?.memberId) {
                q = query(q, where("memberId", "==", filters.memberId));
            }

            const snapshot = await getDocs(q);
            
            let documents = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                createdAt: doc.data().createdAt?.toDate() || new Date(),
                updatedAt: doc.data().updatedAt?.toDate() || new Date(),
            })) as Document[];

            // Filtres côté client pour recherche et dates
            if (filters?.searchQuery) {
                const searchLower = filters.searchQuery.toLowerCase();
                documents = documents.filter(doc => 
                    doc.libelle?.toLowerCase().includes(searchLower) ||
                    doc.id?.toLowerCase().includes(searchLower) ||
                    doc.memberId?.toLowerCase().includes(searchLower)
                );
            }

            if (filters?.startDate) {
                documents = documents.filter(doc => 
                    doc.createdAt >= filters.startDate
                );
            }

            if (filters?.endDate) {
                const endOfDay = new Date(filters.endDate);
                endOfDay.setHours(23, 59, 59, 999);
                documents = documents.filter(doc => 
                    doc.createdAt <= endOfDay
                );
            }

            return documents;

        } catch (error) {
            console.error("Erreur lors de la récupération de tous les documents:", error);
            return [];
        }
    }

    /**
     * Récupère les documents avec pagination
     * @param {DocumentFilters} filters - Filtres et options de pagination
     * @returns {Promise<PaginatedDocuments>}
     */
    async getPaginatedDocuments(filters?: any): Promise<any> {
        try {
            const { collection, query, where, getDocs, getCountFromServer, db, orderBy, limit, startAfter } = await getFirestore();

            const pageSize = filters?.limit || 20;
            const currentPage = filters?.page || 1;

            // Construction de la requête de base
            let baseQuery = query(
                collection(db, firebaseCollectionNames.documents || "documents"),
                orderBy("createdAt", "desc")
            );

            // Appliquer les filtres Firestore
            if (filters?.type) {
                baseQuery = query(baseQuery, where("type", "==", filters.type));
            }

            if (filters?.format) {
                baseQuery = query(baseQuery, where("format", "==", filters.format));
            }

            if (filters?.memberId) {
                baseQuery = query(baseQuery, where("memberId", "==", filters.memberId));
            }

            // Compter le total de documents (avec filtres)
            const countSnapshot = await getCountFromServer(baseQuery);
            const totalCount = countSnapshot.data().count;

            // Pagination avec offset
            const offset = (currentPage - 1) * pageSize;
            
            // Créer la requête paginée
            let paginatedQuery = query(baseQuery, limit(pageSize));

            // Si on n'est pas à la première page, on doit skip les documents précédents
            if (offset > 0) {
                // Récupérer les documents jusqu'à l'offset pour obtenir le dernier document
                const offsetQuery = query(baseQuery, limit(offset));
                const offsetSnapshot = await getDocs(offsetQuery);
                
                if (offsetSnapshot.docs.length > 0) {
                    const lastDoc = offsetSnapshot.docs[offsetSnapshot.docs.length - 1];
                    paginatedQuery = query(baseQuery, startAfter(lastDoc), limit(pageSize));
                }
            }

            // Exécuter la requête paginée
            const snapshot = await getDocs(paginatedQuery);
            
            const documents = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                createdAt: doc.data().createdAt?.toDate() || new Date(),
                updatedAt: doc.data().updatedAt?.toDate() || new Date(),
            })) as Document[];

            const totalPages = Math.ceil(totalCount / pageSize);

            return {
                documents,
                total: totalCount,
                hasMore: currentPage < totalPages,
                currentPage,
                totalPages,
            };

        } catch (error) {
            console.error("Erreur lors de la récupération paginée des documents:", error);
            return {
                documents: [],
                total: 0,
                hasMore: false,
                currentPage: 1,
                totalPages: 0,
            };
        }
    }

    /**
     * Met à jour un document
     * @param {string} id - L'ID du document
     * @param {Partial<Omit<Document, 'id' | 'createdAt'>>} data - Données à mettre à jour
     * @returns {Promise<Document | null>}
     */
    async updateDocument(id: string, data: Partial<Omit<Document, 'id' | 'createdAt'>>): Promise<Document | null> {
        try {
            const { doc, updateDoc, db, serverTimestamp } = await getFirestore();

            const documentRef = doc(db, firebaseCollectionNames.documents || "documents", id);

            await updateDoc(documentRef, {
                ...data,
                updatedAt: serverTimestamp(),
            });

            return await this.getDocumentById(id);

        } catch (error) {
            console.error("Erreur lors de la mise à jour du document:", error);
            throw error;
        }
    }

    /**
     * Supprime un document
     * @param {string} id - L'ID du document
     * @returns {Promise<void>}
     */
    async deleteDocument(id: string): Promise<void> {
        try {
            const { doc, deleteDoc, db } = await getFirestore();

            const documentRef = doc(db, firebaseCollectionNames.documents || "documents", id);
            await deleteDoc(documentRef);

            console.log(`Document ${id} supprimé avec succès`);

        } catch (error) {
            console.error("Erreur lors de la suppression du document:", error);
            throw error;
        }
    }
}
