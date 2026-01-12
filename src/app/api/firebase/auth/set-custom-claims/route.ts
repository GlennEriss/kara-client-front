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

  try {
    const { uuid, claims } = await req.json();
    if (!uuid || !claims) {
      return NextResponse.json({ error: "UUID et claims requis" }, { status: 400 });
    }
    await adminAuth.setCustomUserClaims(uuid, claims);
    return NextResponse.json({ message: "Claims définis" }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Erreur lors de la définition des claims", details: error?.message },
      { status: 500 }
    );
  }
}

