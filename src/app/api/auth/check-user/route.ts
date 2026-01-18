import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/firebase/adminAuth";
import { adminFirestore } from "@/firebase/adminFirestore";

/**
 * API Route pour vérifier l'existence d'un utilisateur
 * 
 * Vérifie dans :
 * 1. Firebase Auth (par UID/matricule)
 * 2. Firestore collection 'users' (par UID/matricule)
 * 3. Firestore collection 'admins' (par UID/matricule) - compatibilité ancienne version
 * 
 * Body: { uid: string }
 * Returns: { found: boolean, inAuth: boolean, inUsers: boolean, inAdmins: boolean }
 */
export async function POST(req: NextRequest) {
  if (!adminAuth || !adminFirestore) {
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

    const trimmedUid = uid.trim();
    const results = {
      found: false,
      inAuth: false,
      inUsers: false,
      inAdmins: false,
    };

    // 1) Vérifier dans Firebase Auth
    try {
      const userRecord = await adminAuth.getUser(trimmedUid);
      results.inAuth = true;
      results.found = true;
    } catch (err: any) {
      if (err?.code !== "auth/user-not-found") {
        console.error("[check-user] Erreur Firebase Auth:", err);
      }
    }

    // 2) Vérifier dans Firestore collection 'users'
    try {
      const userDoc = await adminFirestore.collection('users').doc(trimmedUid).get();
      if (userDoc.exists) {
        results.inUsers = true;
        results.found = true;
      }
    } catch (err: any) {
      console.error("[check-user] Erreur Firestore users:", err);
    }

    // 3) Vérifier dans Firestore collection 'admins' (compatibilité)
    if (!results.found) {
      try {
        const adminDoc = await adminFirestore.collection('admins').doc(trimmedUid).get();
        if (adminDoc.exists) {
          results.inAdmins = true;
          results.found = true;
        }
      } catch (err: any) {
        console.error("[check-user] Erreur Firestore admins:", err);
      }
    }

    return NextResponse.json(results, { status: 200 });
  } catch (error: any) {
    console.error("[check-user] Erreur inattendue:", error);
    return NextResponse.json(
      { error: "Erreur lors de la vérification", details: error?.message },
      { status: 500 }
    );
  }
}
