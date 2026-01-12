import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/firebase/adminAuth";

// Recherche un utilisateur Firebase Auth par UID (matricule)
// Body: { uid: string }
export async function POST(req: NextRequest) {
  // Vérifier si Firebase Admin est disponible
  if (!adminAuth) {
    return NextResponse.json(
      { error: "Firebase Admin non configuré" },
      { status: 503 }
    );
  }

  try {
    const { uid } = await req.json();
    if (!uid || typeof uid !== "string") {
      return NextResponse.json({ error: "uid requis" }, { status: 400 });
    }

    try {
      const userRecord = await adminAuth.getUser(uid);
      return NextResponse.json(
        {
          found: true,
          uid: userRecord.uid,
          phoneNumber: userRecord.phoneNumber ?? null,
          disabled: userRecord.disabled ?? false,
        },
        { status: 200 }
      );
    } catch (err: any) {
      if (err?.code === "auth/user-not-found") {
        return NextResponse.json({ found: false }, { status: 404 });
      }
      throw err;
    }
  } catch (error: any) {
    return NextResponse.json(
      { error: "Erreur lors de la recherche d'utilisateur", details: error?.message },
      { status: 500 }
    );
  }
}

