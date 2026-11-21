import { NextRequest, NextResponse } from 'next/server'
import { adminFirestore } from '@/firebase/adminFirestore'
import { requireMemberCaller } from '@/domains/member-mobile/server/access'
import { mobileJson } from '@/domains/mobile/server/access'
import {
  checkMemberFinanceAccess,
  memberFinanceModule,
} from '@/domains/member-mobile/server/finance-model'
import { memberFinanceFile } from '@/domains/member-mobile/server/finance-files'
import { MemberError } from '@/domains/member-mobile/server/data'
export const runtime = 'nodejs'
type Context = { params: Promise<{ module: string; id: string }> }
async function handle(request: NextRequest, context: Context) {
  const caller = await requireMemberCaller(request)
  if (caller instanceof NextResponse) return caller
  try {
    const params = await context.params,
      module = memberFinanceModule(params.module)
    await checkMemberFinanceAccess(adminFirestore!, caller, module)
    const type = request.nextUrl.searchParams.get('type') || ''
    if (
      ![
        'official',
        'submitted',
        'contract-template',
        'receipt',
        'history',
        'refund-template',
        'support-template',
        'declaration-proof',
        'refund-document',
        'refund-proof',
        'support-document',
        'versement-proof',
      ].includes(type)
    )
      throw new MemberError('Document inconnu.', 404)
    if (Number(request.headers.get('content-length')) > 4000)
      throw new MemberError('Demande trop volumineuse.', 413)
    const draft = request.method === 'POST' ? await request.json() : undefined
    return mobileJson(
      await memberFinanceFile(
        adminFirestore!,
        caller,
        module,
        params.id,
        type,
        request.nextUrl.searchParams.get('fileId') || '',
        draft,
      ),
    )
  } catch (e) {
    return mobileJson(
      {
        error:
          e instanceof MemberError
            ? e.message
            : 'Impossible de préparer ce document.',
      },
      e instanceof MemberError ? e.status : 503,
    )
  }
}
export const GET = handle
export const POST = handle
