// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'
const state = vi.hoisted(() => ({
  caller: vi.fn(),
  db: null as any,
  upload: vi.fn(),
  cleanup: vi.fn(),
  file: vi.fn(),
}))
vi.mock('../server/access', () => ({ requireMemberCaller: state.caller }))
vi.mock('@/firebase/adminFirestore', () => ({
  get adminFirestore() {
    return state.db
  },
}))
vi.mock('../server/finance-storage', () => ({
  uploadMemberFinanceFiles: state.upload,
  deleteMemberUploads: state.cleanup,
}))
vi.mock('../server/finance-files', () => ({ memberFinanceFile: state.file }))
import { memberCaller as caller, memoryDb } from './memory-db'
import {
  GET as list,
  POST as create,
} from '@/app/api/mobile/member/finance/[module]/route'
import {
  GET as detail,
  POST as mutate,
} from '@/app/api/mobile/member/finance/[module]/[id]/route'
import { GET as file } from '@/app/api/mobile/member/finance/[module]/[id]/file/route'
const context = {
  params: Promise.resolve({ module: 'caisse-imprevue', id: 'CI' }),
}
const request = (suffix = '', body?: unknown) =>
  new NextRequest(
    `https://test/api/mobile/member/finance/caisse-imprevue${suffix}`,
    body
      ? {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(body),
        }
      : undefined,
  )
beforeEach(() => {
  vi.clearAllMocks()
  state.caller.mockResolvedValue(caller)
  state.db = memoryDb({}).db
  state.upload.mockResolvedValue({})
  state.file.mockResolvedValue({
    base64: 'JVBERi0=',
    mime: 'application/pdf',
    filename: 'test.pdf',
  })
})
describe('routes financières personnelles membre', () => {
  it('contrôle la session avant toute lecture, pièce jointe ou écriture', async () => {
    state.caller.mockResolvedValue(
      NextResponse.json({ error: 'Interdit' }, { status: 403 }),
    )
    for (const handler of [list, create, detail, mutate, file])
      expect((await handler(request(), context)).status).toBe(403)
    expect(state.upload).not.toHaveBeenCalled()
    expect(state.file).not.toHaveBeenCalled()
  })
  it('refuse les contrats tiers avant de traiter les fichiers', async () => {
    state.db = memoryDb({ 'contractsCI/CI': { memberId: 'OTHER' } }).db
    expect((await detail(request('/CI'), context)).status).toBe(404)
    const form = new FormData()
    form.set('operationId', 'test-operation-000001')
    form.set('payload', JSON.stringify({ action: 'upload-signed' }))
    const r = new NextRequest(
      'https://test/api/mobile/member/finance/caisse-imprevue/CI',
      { method: 'POST', body: form },
    )
    expect((await mutate(r, context)).status).toBe(404)
    expect(state.upload).not.toHaveBeenCalled()
  })
  it('ne laisse pas le body remplacer le membre ni injecter des montants de forfait', async () => {
    const { db, writes } = memoryDb({})
    state.db = db
    const response = await create(
      request('', {
        operationId: 'test-operation-000001',
        payload: {
          memberId: 'OTHER',
          subscriptionCIID: 'P',
          subscriptionCIAmountPerMonth: 1,
        },
      }),
      context,
    )
    expect(response.status).toBe(400)
    expect(writes).toHaveLength(0)
  })
  it('les réponses restent privées, et les actions admin sont refusées', async () => {
    const { db, writes } = memoryDb({
      'contractsCI/CI': { memberId: caller.uid, status: 'ACTIVE' },
    })
    state.db = db
    const response = await detail(request('/CI'), context)
    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toBe('no-store, private')
    const form = new FormData()
    form.set('operationId', 'test-operation-000001')
    form.set('payload', JSON.stringify({ action: 'approve' }))
    expect(
      (
        await mutate(
          new NextRequest('https://test/CI', { method: 'POST', body: form }),
          context,
        )
      ).status,
    ).toBe(400)
    expect(writes).toHaveLength(0)
  })
  it('ne transmet pas de type de fichier arbitraire au lecteur', async () => {
    expect(
      (
        await file(
          request('/CI/file?type=admin-export&url=https://evil.test'),
          context,
        )
      ).status,
    ).toBe(404)
    expect(state.file).not.toHaveBeenCalled()
  })
})
