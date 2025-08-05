import { adminAuth } from "@/firebase/adminAuth";
import { NextRequest, NextResponse } from "next/server";
import { updateMembershipRequestStatus, getMembershipRequestById, checkPhoneNumberExists } from "@/db/membership.db";
import { createUserWithMatricule, addSubscriptionToUser, generateMatricule } from "@/db/user.db";
import { createDefaultSubscription } from "@/db/subscription.db";
import type { User, UserRole, MembershipType } from "@/types/types";

/**
 * Convertit un membershipType en UserRole
 */
function membershipTypeToRole(membershipType: string): UserRole {
  switch (membershipType) {
    case 'adherant':
      return 'Adherant';
    case 'bienfaiteur':
      return 'Bienfaiteur';
    case 'sympathisant':
      return 'Sympathisant';
    default:
      return 'Adherant'; // Par défaut
  }
}

export async function POST(req: NextRequest) {
    try {
        const { phoneNumber, requestId, adminId, membershipType } = await req.json();

        if (!phoneNumber || !requestId) {
            return NextResponse.json({ error: "Numéro de téléphone et ID de demande requis" }, { status: 400 });
        }

        if (!membershipType) {
            return NextResponse.json({ error: "Type de membre requis" }, { status: 400 });
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

        // Vérifier si le numéro de téléphone est déjà utilisé dans une autre demande
        const phoneCheck = await checkPhoneNumberExists(normalizedPhone, requestId);
        if (phoneCheck.isUsed) {
            return NextResponse.json({ 
                error: "Ce numéro de téléphone est déjà utilisé dans une autre demande d'adhésion",
                details: `Demande existante: ${phoneCheck.existingRequest?.identity.firstName} ${phoneCheck.existingRequest?.identity.lastName} (${phoneCheck.existingRequest?.status})`
            }, { status: 409 });
        }
        console.log('Numéro de téléphone vérifié - aucun conflit détecté');

        // Générer le matricule AVANT la création de l'utilisateur Firebase
        const matricule = await generateMatricule();
        console.log('Matricule généré:', matricule);

        let userRecord;
        
        try {
            // Vérifier si l'utilisateur existe déjà
            userRecord = await adminAuth.getUserByPhoneNumber(normalizedPhone);
            console.log('Utilisateur existant trouvé:', userRecord.uid);
        } catch (err: any) {
            if (err.code === 'auth/user-not-found') {
                // Créer l'utilisateur s'il n'existe pas
                userRecord = await adminAuth.createUser({
                    uid: matricule,
                    phoneNumber: normalizedPhone,
                    disabled: false
                });
                console.log('Nouvel utilisateur créé:', userRecord.uid);
            } else {
                throw err;
            }
        }

        console.log('Type de membre sélectionné:', membershipType);

        // Récupérer les données de la demande d'adhésion
        const membershipRequest = await getMembershipRequestById(requestId);
        if (!membershipRequest) {
            return NextResponse.json({ error: "Demande d'adhésion non trouvée" }, { status: 404 });
        }

        // Créer le document utilisateur dans la collection users
        // Utiliser le matricule déjà généré comme ID du document
        const userRole = membershipTypeToRole(membershipType);
        const userData: Omit<User, 'id' | 'matricule' | 'createdAt' | 'updatedAt'> = {
            lastName: membershipRequest.identity.lastName,
            firstName: membershipRequest.identity.firstName,
            birthDate: membershipRequest.identity.birthDate,
            contacts: membershipRequest.identity.contacts,
            gender: membershipRequest.identity.gender,
            email: membershipRequest.identity.email,
            nationality: membershipRequest.identity.nationality,
            hasCar: membershipRequest.identity.hasCar,
            photoURL: membershipRequest.identity.photoURL,
            photoPath: membershipRequest.identity.photoPath,
            subscriptions: [], // Sera mis à jour après création de la souscription
            dossier: requestId, // Référence vers la demande d'adhésion
            membershipType: membershipType as MembershipType,
            roles: [userRole], // Ajouter le membershipType dans le tableau roles
            isActive: true,
        };

        const createdUser = await createUserWithMatricule(userData, matricule);
        console.log('Document utilisateur créé avec matricule:', createdUser.matricule);
        console.log('Rôles attribués:', createdUser.roles);

        // Créer la souscription par défaut
        const subscription = await createDefaultSubscription(
            createdUser.id, // Le matricule est l'ID
            membershipType as MembershipType,
            adminId || 'system'
        );
        console.log('Souscription créée:', subscription.id);

        // Ajouter la souscription à l'utilisateur
        await addSubscriptionToUser(createdUser.id, subscription.id);
        console.log('Souscription ajoutée à l\'utilisateur');

        // Mettre à jour le statut de la demande d'adhésion
        const updateSuccess = await updateMembershipRequestStatus(
            requestId,
            'approved',
            adminId,
        );

        if (!updateSuccess) {
            return NextResponse.json({ error: "Erreur lors de la mise à jour du statut" }, { status: 500 });
        }

        return NextResponse.json({ 
            uid: userRecord.uid,
            matricule: createdUser.matricule,
            subscriptionId: subscription.id,
            success: true,
            message: `Utilisateur créé avec succès. Matricule: ${createdUser.matricule}`
        });

    } catch (err: any) {
        console.error('Erreur lors de la création utilisateur Firebase:', err);
        return NextResponse.json({ 
            error: "Erreur lors de la création de l'utilisateur Firebase",
            details: err.message 
        }, { status: 500 });
    }
} 