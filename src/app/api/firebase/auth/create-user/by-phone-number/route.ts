import { adminAuth } from "@/firebase/adminAuth";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { uid, phoneNumber, displayName, requestId } = await req.json();
    if (!phoneNumber || !uid) {
      return NextResponse.json(
        { error: "uid et phoneNumber sont requis" },
        { status: 400 }
      );
    }

    let userRecord;
    try {
      userRecord = await adminAuth.getUserByPhoneNumber(phoneNumber);
      return NextResponse.json(
        { message: "Utilisateur trouvé", uid: userRecord.uid },
        { status: 200 }
      );
    } catch (err: any) {
      if (err.code === "auth/user-not-found") {
        userRecord = await adminAuth.createUser({
          uid,
          phoneNumber,
          displayName,
          disabled: false,
        });
        return NextResponse.json(
          { message: "Utilisateur créé", uid: userRecord.uid },
          { status: 201 }
        );
      }
      throw err;
    }
  } catch (error: any) {
    return NextResponse.json(
      { error: "Erreur lors de la création/recherche d'utilisateur", details: error?.message },
      { status: 500 }
    );
  }
}

