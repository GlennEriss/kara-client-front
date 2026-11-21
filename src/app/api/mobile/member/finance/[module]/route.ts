import { NextRequest, NextResponse } from 'next/server'
import { adminFirestore } from '@/firebase/adminFirestore'
import { requireMemberCaller } from '@/domains/member-mobile/server/access'
import { mobileJson } from '@/domains/mobile/server/access'
import {
  checkMemberFinanceAccess,
  memberFinanceList,
  memberFinanceModule,
} from '@/domains/member-mobile/server/finance-model'
import {
  createMemberFinanceDemand,
  operationIdSchema,
} from '@/domains/member-mobile/server/finance-actions'
import { MemberError } from '@/domains/member-mobile/server/data'
export const runtime = 'nodejs'
type Context = { params: Promise<{ module: string }> }
export async function GET(request: NextRequest, context: Context) {
  const caller = await requireMemberCaller(request)
  if (caller instanceof NextResponse) return caller
  try {
    const module = memberFinanceModule((await context.params).module)
    await checkMemberFinanceAccess(adminFirestore!, caller, module)
    return mobileJson(await memberFinanceList(adminFirestore!, caller, module))
  } catch (e) {
    return failure(e)
  }
}
export async function POST(request: NextRequest, context: Context) {
  const caller = await requireMemberCaller(request)
  if (caller instanceof NextResponse) return caller
  try {
    const module = memberFinanceModule((await context.params).module)
    await checkMemberFinanceAccess(adminFirestore!, caller, module)
    if (Number(request.headers.get('content-length')) > 12000)
      throw new MemberError('Demande trop volumineuse.', 413)
    const body = await request.json()
    if (
      !operationIdSchema.safeParse(body?.operationId).success ||
      Object.keys(body).some((k) => !['operationId', 'payload'].includes(k))
    )
      throw new MemberError('Demande invalide.')
    return mobileJson(
      await createMemberFinanceDemand(
        adminFirestore!,
        caller,
        module,
        body.payload,
        body.operationId,
      ),
    )
  } catch (e) {
    return failure(e)
  }
}
function failure(e: unknown) {
  return mobileJson(
    {
      error:
        e instanceof MemberError
          ? e.message
          : 'Impossible de charger ou transmettre votre demande.',
    },
    e instanceof MemberError ? e.status : 503,
  )
}
