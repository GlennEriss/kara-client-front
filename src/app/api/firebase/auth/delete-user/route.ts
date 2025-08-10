import { adminAuth } from "@/firebase/adminAuth";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    const { uid } = await req.json();
    if (!uid) {
        return NextResponse.json({ error: "UUID requis" }, { status: 400 });
    }
    await adminAuth.deleteUser(uid);
    return NextResponse.json({ message: "Utilisateur supprimé" }, { status: 200 });
}