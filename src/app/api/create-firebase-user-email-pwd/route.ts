import { adminAuth } from "@/firebase/adminAuth";
import { NextRequest, NextResponse } from "next/server";
import { updateMembershipRequestStatus, getMembershipRequestById } from "@/db/membership.db";
import { createUserWithMatricule, addSubscriptionToUser } from "@/db/user.db";
import { createDefaultSubscription, updateSubscription } from "@/db/subscription.db";
import { ServiceFactory } from "@/factories/ServiceFactory";
import { registerAddress } from "@/db/address.db";
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
    // Vérifier si Firebase Admin est disponible
    if (!adminAuth) {
        return NextResponse.json(
            { error: "Firebase Admin non configuré" },
            { status: 503 }
        );
    }

    try {
        const { requestId, adminId, membershipType, companyName, professionName, adhesionPdfURL } = await req.json();

        if (!requestId) {
            return NextResponse.json({ error: "ID de demande requis" }, { status: 400 });
        }

        if (!membershipType) {
            return NextResponse.json({ error: "Type de membre requis" }, { status: 400 });
        }

        // Utiliser le matricule existant de la demande d'adhésion
        const membershipRequest = await getMembershipRequestById(requestId);
        if (!membershipRequest) {
            return NextResponse.json({ error: "Demande d'adhésion non trouvée" }, { status: 404 });
        }

        const matricule = membershipRequest.matricule;
        console.log('Matricule utilisé depuis la demande:', matricule);

        // Générer l'email automatiquement : nomprenom4premierschiffresMatricule@kara.ga
        // Sécuriser au cas où firstName / lastName seraient manquants
        const rawFirstName = (membershipRequest.identity.firstName || '').toString();
        const rawLastName = (membershipRequest.identity.lastName || '').toString();
        const firstName = rawFirstName.toLowerCase().replace(/[^a-z]/g, '');
        const lastName = rawLastName.toLowerCase().replace(/[^a-z]/g, '');
        const matriculeDigits = matricule.replace(/\D/g, '').slice(0, 4); // Prendre les 4 premiers chiffres
        const namePart = (firstName + lastName) || 'member';
        const generatedEmail = `${namePart}${matriculeDigits}@kara.ga`;
        
        console.log('Email généré automatiquement:', generatedEmail);

        let userRecord;
        
        try {
            // Vérifier si l'utilisateur existe déjà par email
            userRecord = await adminAuth.getUserByEmail(generatedEmail);
            console.log('Utilisateur existant trouvé:', userRecord.uid);
        } catch (err: any) {
            if (err.code === 'auth/user-not-found') {
                // Créer l'utilisateur s'il n'existe pas
                userRecord = await adminAuth.createUser({
                    uid: matricule,
                    email: generatedEmail,
                    password: '123456', // Mot de passe par défaut
                    disabled: false
                });
                console.log('Nouvel utilisateur créé avec email:', userRecord.uid);
            } else {
                throw err;
            }
        }

        console.log('Type de membre sélectionné:', membershipType);

        // Créer le document utilisateur dans la collection users
        // Utiliser le matricule déjà généré comme ID du document
        const userRole = membershipTypeToRole(membershipType);
        const userData: Omit<User, 'id' | 'matricule' | 'createdAt' | 'updatedAt'> = {
            lastName: membershipRequest.identity.lastName || '',
            firstName: membershipRequest.identity.firstName || '',
            birthDate: membershipRequest.identity.birthDate || '',
            birthPlace: membershipRequest.identity.birthPlace || '',
            contacts: membershipRequest.identity.contacts || [],
            gender: membershipRequest.identity.gender || 'male',
            email: membershipRequest.identity.email || '',
            nationality: membershipRequest.identity.nationality || '',
            hasCar: membershipRequest.identity.hasCar || false,
            address: membershipRequest.address,
            companyName: companyName || membershipRequest.company?.companyName || '',
            profession: professionName || membershipRequest.company?.profession || '',
            photoURL: membershipRequest.identity.photoURL,
            photoPath: membershipRequest.identity.photoPath,
            identityDocument: membershipRequest.documents.identityDocument || '',
            identityDocumentNumber: membershipRequest.documents.identityDocumentNumber || '',
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

        // Mettre à jour la souscription avec l'URL du PDF si fournie
        if (adhesionPdfURL) {
            try {
                await updateSubscription(subscription.id, { adhesionPdfURL });
                console.log('URL PDF ajoutée à la souscription');
            } catch (e) {
                console.warn("Impossible d'ajouter l'URL PDF à la souscription:", e);
            }
        }

        // Ajouter la souscription à l'utilisateur
        await addSubscriptionToUser(createdUser.id, subscription.id);
        console.log('Souscription ajoutée à l\'utilisateur');

        // Enregistrer l'adresse dans la structure hiérarchique
        if (membershipRequest.address) {
            try {
                await registerAddress(membershipRequest.address);
                console.log('Adresse enregistrée dans la structure hiérarchique');
            } catch (error) {
                console.error('Erreur lors de l\'enregistrement de l\'adresse:', error);
                // Ne pas bloquer le processus d'approbation pour cette erreur
            }
        }

        // Persister l'entreprise et la profession si elles sont fournies
        let companyId = null;
        let professionId = null;

        if (membershipRequest.company?.isEmployed) {
            // Persister l'entreprise si un nom est fourni (soit par défaut, soit modifié)
            if (companyName || membershipRequest.company?.companyName) {
                try {
                    const finalCompanyName = companyName || membershipRequest.company.companyName;
                    
                    // Préparer l'adresse complète de l'entreprise
                    const companyAddress = membershipRequest.company.companyAddress ? {
                        address: {
                            province: membershipRequest.company.companyAddress.province,
                            city: membershipRequest.company.companyAddress.city,
                            district: membershipRequest.company.companyAddress.district,
                            arrondissement: membershipRequest.address?.arrondissement,
                            additionalInfo: membershipRequest.address?.additionalInfo
                        }
                    } : undefined;
                    
                    const companyService = ServiceFactory.getCompanyService();
                    const companyResult = await companyService.findOrCreate(
                        finalCompanyName,
                        adminId || 'system',
                        companyAddress
                    );
                    companyId = companyResult.id;
                    console.log(companyResult.isNew ? 'Nouvelle entreprise créée avec adresse:' : 'Entreprise existante trouvée:', companyId);
                } catch (error) {
                    console.error('Erreur lors de la persistance de l\'entreprise:', error);
                    // Ne pas bloquer le processus d'approbation pour cette erreur
                }
            }

            // Persister la profession si un nom est fourni (soit par défaut, soit modifié)
            if (professionName || membershipRequest.company?.profession) {
                try {
                    const finalProfessionName = professionName || membershipRequest.company.profession;
                    const professionService = ServiceFactory.getProfessionService();
                    const professionResult = await professionService.findOrCreate(
                        finalProfessionName,
                        adminId || 'system'
                    );
                    professionId = professionResult.id;
                    console.log(professionResult.isNew ? 'Nouvelle profession créée:' : 'Profession existante trouvée:', professionId);
                } catch (error) {
                    console.error('Erreur lors de la persistance de la profession:', error);
                    // Ne pas bloquer le processus d'approbation pour cette erreur
                }
            }
        }

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
            email: generatedEmail,
            password: '123456', // Mot de passe par défaut
            subscriptionId: subscription.id,
            companyId,
            professionId,
            success: true,
            message: `Utilisateur créé avec succès. Matricule: ${createdUser.matricule}, Email: ${generatedEmail}`
        });

    } catch (err: any) {
        console.error('Erreur lors de la création utilisateur Firebase:', err);
        return NextResponse.json({ 
            error: "Erreur lors de la création de l'utilisateur Firebase",
            details: err.message 
        }, { status: 500 });
    }
} 