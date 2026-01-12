import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/firebase/adminAuth";

export async function POST(req: NextRequest) {
    // Vérifier si Firebase Admin est disponible
    if (!adminAuth) {
        return NextResponse.json(
            { error: "Firebase Admin non configuré" },
            { status: 503 }
        );
    }

    const { email, password, uid, role, phoneNumber, photoURL, firstName, lastName, civility, birthDate } = await req.json();
    
    // Préparer les données utilisateur en gérant photoURL undefined
    const userData: {
        uid: string;
        email: string;
        password: string;
        displayName: string;
        phoneNumber: string;
        photoURL?: string;
    } = {
        uid,
        email,
        password,
        displayName: `${firstName} ${lastName}`,
        phoneNumber,
    };
    
    // Ajouter photoURL seulement s'il est défini
    if (photoURL) {
        userData.photoURL = photoURL;
    }
    
    const user = await adminAuth.createUser(userData);
    
    await adminAuth.setCustomUserClaims(uid, {
        role,
        civility,
        birthDate
    })
    
    return NextResponse.json(user);
}
