import { NextRequest, NextResponse } from 'next/server'
import { adminAuth } from '@/firebase/adminAuth'
import { mobileCapabilities, mobileJson, requireMobileCaller } from '@/domains/mobile/server/access'

export const runtime = 'nodejs'
export async function GET(request: NextRequest) {
  const caller = await requireMobileCaller(request)
  if (caller instanceof NextResponse) return caller
  try {
    const account = await adminAuth!.getUser(caller.claims.uid)
    return mobileJson({
      uid: account.uid, email: account.email ?? caller.claims.email ?? '',
      displayName: account.displayName || 'Administrateur KARA',
      roleLabel: caller.access.isSuperAdmin ? 'Super administrateur' : caller.access.restrictedRole === 'AgentRecouvrement' ? 'Agent de recouvrement' : 'Administrateur',
      mustChangePassword: caller.mustChangePassword,
      capabilities: mobileCapabilities(caller.access),
    })
  } catch {
    return mobileJson({ error: 'Impossible de charger votre profil. Réessayez.' }, 503)
  }
}
