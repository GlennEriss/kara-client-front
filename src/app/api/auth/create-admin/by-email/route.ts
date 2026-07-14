import { adminAuth } from "@/firebase/adminAuth";
import { NextRequest, NextResponse } from "next/server";

function normalizePhoneNumber(value: unknown): string | undefined {
    const raw = typeof value === "string" ? value.trim() : "";
    if (!raw) return undefined;

    const digits = raw.replace(/[^\d]/g, "");
    if (!digits) return undefined;
    if (raw.startsWith("+")) return `+${digits}`;
    if (digits.startsWith("241")) return `+${digits}`;

    return `+241${digits.replace(/^0+/, "")}`;
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
        const { email, password, uid, role, phoneNumber, photoURL, firstName, lastName, civility, birthDate } = await req.json();

        if (!uid || !email || !password) {
            return NextResponse.json(
                { error: "uid, email et password sont requis" },
                { status: 400 }
            );
        }

        // Préparer les données utilisateur en gérant les champs optionnels.
        const userData: {
            uid: string;
            email: string;
            password: string;
            displayName: string;
            phoneNumber?: string;
            photoURL?: string;
        } = {
            uid,
            email: String(email).trim().toLowerCase(),
            password,
            displayName: `${firstName || ''} ${lastName || ''}`.trim(),
        };

        const normalizedPhoneNumber = normalizePhoneNumber(phoneNumber);
        if (normalizedPhoneNumber) {
            userData.phoneNumber = normalizedPhoneNumber;
        }

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
    } catch (error: any) {
        console.error('[create-admin/by-email] échec:', error);
        const code = typeof error?.code === 'string' ? error.code : '';
        const isConflict = code.includes('already-exists') || code.includes('email-already-exists') || code.includes('uid-already-exists');
        return NextResponse.json(
            {
                error: error?.message || "Erreur lors de la création du compte Auth admin",
                code,
            },
            { status: isConflict ? 409 : 500 }
        );
    }
}
