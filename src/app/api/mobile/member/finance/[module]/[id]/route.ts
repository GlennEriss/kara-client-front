import { NextRequest, NextResponse } from 'next/server'
import { adminFirestore } from '@/firebase/adminFirestore'
import { requireMemberCaller } from '@/domains/member-mobile/server/access'
import { mobileJson } from '@/domains/mobile/server/access'
import {
  checkMemberFinanceAccess,
  contractDTO,
  demandDTO,
  financeChildren,
  memberFinanceModule,
  ownedFinanceRecord,
} from '@/domains/member-mobile/server/finance-model'
import {
  applyMemberFinanceOperation,
  memberOperationSchema,
  operationIdSchema,
  type UploadedMemberFiles,
} from '@/domains/member-mobile/server/finance-actions'
import {
  deleteMemberUploads,
  uploadMemberFinanceFiles,
} from '@/domains/member-mobile/server/finance-storage'
import { MemberError } from '@/domains/member-mobile/server/data'
export const runtime = 'nodejs'
type Context = { params: Promise<{ module: string; id: string }> }
export async function GET(request: NextRequest, context: Context) {
  const caller = await requireMemberCaller(request)
  if (caller instanceof NextResponse) return caller
  try {
    const params = await context.params,
      module = memberFinanceModule(params.module),
      kind = request.nextUrl.searchParams.get('kind') || 'contracts'
    await checkMemberFinanceAccess(adminFirestore!, caller, module)
    const record = await ownedFinanceRecord(
      adminFirestore!,
      caller,
      module,
      params.id,
      kind,
    )
    return mobileJson(
      kind === 'demands'
        ? demandDTO(record)
        : contractDTO(
            module,
            record,
            await financeChildren(adminFirestore!, module, params.id),
          ),
    )
  } catch (e) {
    return failure(e)
  }
}
export async function POST(request: NextRequest, context: Context) {
  const caller = await requireMemberCaller(request)
  if (caller instanceof NextResponse) return caller
  let files: UploadedMemberFiles = {}
  try {
    const params = await context.params,
      module = memberFinanceModule(params.module)
    await checkMemberFinanceAccess(adminFirestore!, caller, module)
    if (Number(request.headers.get('content-length')) > 26 * 1024 * 1024)
      throw new MemberError('Pièces jointes trop volumineuses.', 413)
    const form = await request.formData(),
      operationId = form.get('operationId')
    if (!operationIdSchema.safeParse(operationId).success)
      throw new MemberError('Référence d’opération invalide.')
    const parsed = memberOperationSchema.safeParse(
      JSON.parse(String(form.get('payload') || 'null')),
    )
    if (!parsed.success)
      throw new MemberError(
        parsed.error.issues[0]?.message || 'Opération invalide.',
      )
    await ownedFinanceRecord(
      adminFirestore!,
      caller,
      module,
      params.id,
      parsed.data.action === 'cancel-demand' ? 'demands' : 'contracts',
    )
    files = await uploadMemberFinanceFiles(
      form,
      caller,
      params.id,
      parsed.data.action === 'declare'
        ? ['proof']
        : parsed.data.action === 'refund' && module === 'caisse-speciale'
          ? ['proofPhoto', 'signedDocument']
          : ['upload-signed', 'support', 'support-document', 'refund'].includes(
                parsed.data.action,
              )
            ? ['signedDocument']
            : [],
    )
    const result = await applyMemberFinanceOperation(
      adminFirestore!,
      caller,
      module,
      params.id,
      parsed.data,
      files,
      String(operationId),
    )
    if (result.replayed) await deleteMemberUploads(files)
    return mobileJson(result)
  } catch (e) {
    await deleteMemberUploads(files)
    return failure(e)
  }
}
function failure(e: unknown) {
  return mobileJson(
    {
      error:
        e instanceof MemberError
          ? e.message
          : 'L’opération n’a pas pu aboutir. Réessayez.',
    },
    e instanceof MemberError ? e.status : 503,
  )
}
