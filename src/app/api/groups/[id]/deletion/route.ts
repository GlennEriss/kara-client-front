import { NextRequest, NextResponse } from 'next/server'
import { getStorage } from 'firebase-admin/storage'
import { adminApp } from '@/firebase/admin'
import { adminFirestore } from '@/firebase/adminFirestore'
import { requireAdminCaller } from '@/domains/auth/server/requireAdminCaller'
import { deleteGroupPermanently, validateGroupDeletion } from '@/domains/groups/server/delete-group'

export const runtime = 'nodejs'

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const caller = await requireAdminCaller(request, { superAdmin: true })
  if (caller instanceof NextResponse) return caller
  const { id } = await context.params
  let confirmationId: unknown
  try {
    confirmationId = (await request.json()).confirmationId
    validateGroupDeletion(id, confirmationId)
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Confirmation invalide' }, { status: 400 })
  }
  if (!adminFirestore || !adminApp) return NextResponse.json({ error: 'Service temporairement indisponible' }, { status: 503 })
  try {
    await deleteGroupPermanently(adminFirestore, id, { id: caller.claims.uid, name: String(caller.claims.name || caller.claims.email || 'SuperAdmin') }, async () => {
      const bucketName = process.env.FIREBASE_STORAGE_BUCKET || process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
      if (!bucketName) throw new Error('Le stockage des justificatifs n’est pas configuré')
      await getStorage(adminApp!).bucket(bucketName).deleteFiles({ prefix: `group-agreements/${id}/` })
    })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'La suppression n’a pas pu être terminée. Le groupe reste verrouillé ; relancez la suppression pour terminer le nettoyage.' }, { status: 500 })
  }
}
