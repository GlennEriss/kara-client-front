import { adminAuth } from "@/firebase/adminAuth";
import { NextRequest, NextResponse } from "next/server";
import { updateMembershipRequestStatus } from "@/db/membership.db";

export async function POST(req: NextRequest) {
    try {
        const { phoneNumber, requestId, adminId } = await req.json();

        if (!phoneNumber || !requestId) {
            return NextResponse.json({ error: "Numéro de téléphone et ID de demande requis" }, { status: 400 });
        }

        // Normaliser le numéro de téléphone
        let normalizedPhone = phoneNumber.trim();
        
        // Vérifier s'il y a déjà un indicatif +221 ou +241
        if (normalizedPhone.startsWith('+221') || normalizedPhone.startsWith('+241')) {
            // Il y a déjà un indicatif valide, on le garde tel quel
            console.log('Indicatif déjà présent:', normalizedPhone);
        } else {
            // Pas d'indicatif valide, on ajoute +241 par défaut
            // D'abord nettoyer le numéro
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
            console.log('Indicatif +241 ajouté:', normalizedPhone);
        }

        let userRecord;
        
        try {
            // Vérifier si l'utilisateur existe déjà
            userRecord = await adminAuth.getUserByPhoneNumber(normalizedPhone);
            console.log('Utilisateur existant trouvé:', userRecord.uid);
        } catch (err: any) {
            if (err.code === 'auth/user-not-found') {
                // Créer l'utilisateur s'il n'existe pas
                userRecord = await adminAuth.createUser({
                    phoneNumber: normalizedPhone,
                    disabled: false
                });
                console.log('Nouvel utilisateur créé:', userRecord.uid);
            } else {
                throw err;
            }
        }

        // Mettre à jour le statut de la demande d'adhésion
        const updateSuccess = await updateMembershipRequestStatus(
            requestId,
            'approved',
            adminId,
            `Utilisateur Firebase créé avec l'UID: ${userRecord.uid}`
        );

        if (!updateSuccess) {
            return NextResponse.json({ error: "Erreur lors de la mise à jour du statut" }, { status: 500 });
        }

        return NextResponse.json({ 
            uid: userRecord.uid,
            success: true,
            message: "Utilisateur créé et demande approuvée avec succès"
        });

    } catch (err: any) {
        console.error('Erreur lors de la création utilisateur Firebase:', err);
        return NextResponse.json({ 
            error: "Erreur lors de la création de l'utilisateur Firebase",
            details: err.message 
        }, { status: 500 });
    }
} 