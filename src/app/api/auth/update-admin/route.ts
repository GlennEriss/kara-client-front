import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/firebase/adminAuth";

export async function POST(req: NextRequest) {
    try {
        const { uid, email, password, role, phoneNumber, photoURL, firstName, lastName, civility, birthDate } = await req.json();
        
        if (!uid) {
            return NextResponse.json({ error: "UID is required" }, { status: 400 });
        }

        // Préparer les données de mise à jour en gérant les valeurs undefined
        const updateData: any = {};
        
        if (email !== undefined) {
            updateData.email = email;
        }
        
        if (password !== undefined) {
            updateData.password = password;
        }
        
        if (firstName && lastName) {
            updateData.displayName = `${firstName} ${lastName}`;
        }
        
        if (phoneNumber !== undefined) {
            updateData.phoneNumber = phoneNumber;
        }
        
        // Ajouter photoURL seulement s'il est défini
        if (photoURL) {
            updateData.photoURL = photoURL;
        }
        
        // Mettre à jour l'utilisateur Firebase Auth
        const user = await adminAuth.updateUser(uid, updateData);
        
        // Mettre à jour les custom claims si nécessaire
        const customClaims: any = {};
        if (role !== undefined) {
            customClaims.role = role;
        }
        if (civility !== undefined) {
            customClaims.civility = civility;
        }
        if (birthDate !== undefined) {
            customClaims.birthDate = birthDate;
        }
        
        // Appliquer les custom claims seulement s'il y en a
        if (Object.keys(customClaims).length > 0) {
            await adminAuth.setCustomUserClaims(uid, customClaims);
        }
        
        return NextResponse.json(user);
    } catch (error) {
        console.error('Erreur lors de la mise à jour de l\'admin:', error);
        return NextResponse.json(
            { error: "Erreur lors de la mise à jour de l'administrateur" }, 
            { status: 500 }
        );
    }
}
