import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/firebase/adminAuth";
import { adminFirestore } from "@/firebase/adminFirestore";
import { adminApp } from "@/firebase/admin";

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
    const body = await req.json();
    const { uid } = body;
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
      await adminAuth.getUser(trimmedUid);
      results.inAuth = true;
      results.found = true;
    } catch (err: any) {
      // Ignorer auth/user-not-found, continuer la vérification
    }

    // 2) Vérifier dans Firestore collection 'users'
    try {
      const userDoc = await adminFirestore.collection('users').doc(trimmedUid).get();
      if (userDoc.exists) {
        results.inUsers = true;
        results.found = true;
      }
    } catch (err: any) {
      // Ignorer les erreurs, continuer la vérification
    }

    // 3) Vérifier dans Firestore collection 'admins' (compatibilité)
    // IMPORTANT: Toujours vérifier dans 'admins' même si trouvé dans Auth
    // car l'utilisateur peut exister dans Auth mais pas dans Firestore 'users'
    try {
      const adminDoc = await adminFirestore.collection('admins').doc(trimmedUid).get();
      if (adminDoc.exists) {
        results.inAdmins = true;
        results.found = true;
      }
    } catch (err: any) {
      // Ignorer les erreurs, continuer
    }

    return NextResponse.json(results, { status: 200 });
  } catch (error: any) {
    console.error("[check-user] Erreur:", error?.message);
    return NextResponse.json(
      { error: "Erreur lors de la vérification" },
      { status: 500 }
    );
  }
}
