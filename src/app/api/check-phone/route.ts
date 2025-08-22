import { NextRequest, NextResponse } from "next/server";
import { checkPhoneNumberExists } from "@/db/membership.db";

export async function POST(req: NextRequest) {
    try {
        const { phoneNumber, requestId } = await req.json();

        if (!phoneNumber) {
            return NextResponse.json({ error: "Numéro de téléphone requis" }, { status: 400 });
        }

        // Vérifier si le numéro existe déjà (en excluant la demande actuelle si requestId est fourni)
        const phoneCheck = await checkPhoneNumberExists(phoneNumber, requestId);
        
        if (phoneCheck.isUsed) {
            return NextResponse.json({ 
                exists: true,
                message: "Ce numéro de téléphone est déjà utilisé",
                details: {
                    firstName: phoneCheck.existingRequest?.identity.firstName,
                    lastName: phoneCheck.existingRequest?.identity.lastName,
                    status: phoneCheck.existingRequest?.status,
                    requestId: phoneCheck.existingRequest?.id
                }
            }, { status: 200 });
        }

        return NextResponse.json({ 
            exists: false,
            message: "Numéro de téléphone disponible"
        }, { status: 200 });

    } catch (err: any) {
        console.error('Erreur lors de la vérification du numéro:', err);
        return NextResponse.json({ 
            error: "Erreur lors de la vérification du numéro de téléphone",
            details: err.message 
        }, { status: 500 });
    }
}