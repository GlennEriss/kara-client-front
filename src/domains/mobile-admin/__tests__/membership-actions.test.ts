import { describe, it, expect, vi } from 'vitest'
vi.mock('@/app/api/auth/admin/reset-member-password/route', () => ({
  POST: vi.fn(),
}))
import { memberActions } from '../operations/members'
import { getAdminModule } from '../catalog'
import { actionSchema, type AdminContext } from '../server/registry'

function paymentFixture() {
  const module = getAdminModule('member-requests')!,
    dataset = module.datasets[0]
  const action = memberActions(module, dataset).find(
    (a) => a.id === 'request.payment',
  )!
  const processPayment = vi.fn().mockResolvedValue(undefined)
  const uploadDocumentFile = vi
    .fn()
    .mockResolvedValue({
      url: 'https://files.example.test/proof.jpg',
      path: 'proof.jpg',
    })
  const ctx = {
    module,
    dataset,
    id: 'REQUEST-1',
    row: { status: 'pending' },
    token: 'fake-test-token',
    files: {},
    caller: { claims: { uid: 'admin-test' } },
    services: {
      documents: { uploadDocumentFile },
      memberships: () => ({ service: { processPayment } }),
    },
  } as unknown as AdminContext
  return { action, ctx, processPayment, uploadDocumentFile }
}
const input = {
  amount: 10300,
  date: '2026-11-18',
  time: '12:00',
  mode: 'cash',
  withFees: false,
}
describe('paiement d’adhésion natif conforme au site', () => {
  it('accepte une image sans rendre obligatoire le champ de justification masqué', async () => {
    const { action, ctx, processPayment } = paymentFixture()
    ctx.files.proof = new File(['image-test'], 'proof.jpg', {
      type: 'image/jpeg',
    })
    expect(
      action.fields.find((f) => f.key === 'proofJustification')?.required,
    ).toBe(false)
    const data = actionSchema(action).parse({ ...input, proof: true })
    await action.run(ctx, data)
    expect(processPayment).toHaveBeenCalledWith(
      expect.objectContaining({
        requestId: ctx.id,
        paymentInfo: expect.objectContaining({
          paymentType: 'Membership',
          proofUrl: 'https://files.example.test/proof.jpg',
          amount: 10300,
        }),
      }),
    )
  })
  it.each(['', 'trop court', 'a'.repeat(501)])(
    'refuse une justification absente ou hors limites sans enregistrer (%s)',
    async (justification) => {
      const { action, ctx, processPayment, uploadDocumentFile } =
        paymentFixture()
      await expect(
        action.run(ctx, { ...input, proofJustification: justification }),
      ).rejects.toThrow()
      expect(processPayment).not.toHaveBeenCalled()
      expect(uploadDocumentFile).not.toHaveBeenCalled()
    },
  )
  it.each([
    ['application/pdf', 100],
    ['image/jpeg', 5242881],
  ])(
    'refuse une preuve %s de %s octets avant tout téléversement',
    async (type, size) => {
      const { action, ctx, processPayment, uploadDocumentFile } =
        paymentFixture()
      ctx.files.proof = { type, size } as File
      await expect(action.run(ctx, input)).rejects.toThrow('5 Mo')
      expect(processPayment).not.toHaveBeenCalled()
      expect(uploadDocumentFile).not.toHaveBeenCalled()
    },
  )
})
