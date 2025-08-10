import { adminAuth } from "@/firebase/adminAuth";
import { NextRequest, NextResponse } from "next/server";

// Met à jour un utilisateur Firebase Auth
// Body JSON attendu: { uid?: string, phoneNumber?: string, displayName?: string, photoURL?: string, disabled?: boolean }
export async function POST(req: NextRequest) {
  try {
    const { uid, phoneNumber, displayName, photoURL, disabled } = await req.json();

    let resolvedUid = uid as string | undefined;
    if (!resolvedUid && !phoneNumber) {
      return NextResponse.json(
        { error: "uid ou phoneNumber requis" },
        { status: 400 }
      );
    }

    // Résoudre l'UID à partir du numéro si nécessaire
    if (!resolvedUid && phoneNumber) {
      const userRecord = await adminAuth.getUserByPhoneNumber(phoneNumber);
      resolvedUid = userRecord.uid;
    }

    if (!resolvedUid) {
      return NextResponse.json(
        { error: "Impossible de résoudre l'UID" },
        { status: 400 }
      );
    }

    const updatePayload: any = {};
    if (typeof displayName === "string") updatePayload.displayName = displayName;
    if (typeof photoURL === "string") updatePayload.photoURL = photoURL;
    if (typeof disabled === "boolean") updatePayload.disabled = disabled;
    if (typeof phoneNumber === "string") updatePayload.phoneNumber = phoneNumber;

    const updated = await adminAuth.updateUser(resolvedUid, updatePayload);
    return NextResponse.json({ success: true, uid: updated.uid });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour de l'utilisateur", details: error?.message },
      { status: 500 }
    );
  }
}

