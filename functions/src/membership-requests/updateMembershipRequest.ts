import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

// Initialiser admin si ce n'est pas déjà fait ailleurs
if (admin.apps.length === 0) {
    admin.initializeApp();
}

const db = admin.firestore();

interface UpdateMembershipRequestPayload {
    requestId: string;
    formData: any; // On pourrait typer plus strictement avec un package partagé
}

export const updateMembershipRequest = onCall(async (request) => {
    // 1. Vérification de l'authentification
    if (!request.auth) {
        throw new HttpsError(
            "unauthenticated",
            "Vous devez être connecté pour effectuer cette action."
        );
    }

    // 2. Vérification du rôle Admin (via Custom Claims ou vérification en base)
    // Pour l'instant, on suppose que l'accès au back-office est restreint aux admins
    // Idéalement: if (!request.auth.token.admin) { ... }

    const { requestId, formData } = request.data as UpdateMembershipRequestPayload;

    // 3. Validation des entrées
    if (!requestId) {
        throw new HttpsError("invalid-argument", "L'ID de la demande est requis.");
    }

    if (!formData) {
        throw new HttpsError("invalid-argument", "Les données du formulaire sont requises.");
    }

    try {
        const docRef = db.collection("membership-requests").doc(requestId);
        const docSnap = await docRef.get();

        // 4. Vérification de l'existence
        if (!docSnap.exists) {
            throw new HttpsError("not-found", "La demande d'adhésion est introuvable.");
        }

        // 5. Préparation des données de mise à jour
        // On ajoute les métadonnées de modification
        const updateData = {
            ...formData,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedBy: request.auth.uid,
        };

        // Nettoyage basique pour éviter d'écraser des champs critiques si formData est mal formé
        // Mais ici on fait confiance au payload partiel envoyé par le front
        // ATTENTION: Il faudrait idéalement valider chaque champ avec Zod ici aussi

        // 6. Application de la mise à jour
        await docRef.update(updateData);

        return { success: true, requestId };
    } catch (error) {
        console.error("Erreur lors de la mise à jour de la demande:", error);
        if (error instanceof HttpsError) {
            throw error;
        }
        throw new HttpsError("internal", "Une erreur interne est survenue.");
    }
});
