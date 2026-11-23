// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'
vi.mock('@/firebase/admin', () => ({ adminApp: null }))
import { memberCaller as caller, memoryDb } from './memory-db'
import {
  memberFinanceAttachmentSource,
  memberFinanceFile,
} from '../server/finance-files'
import {
  memberStoragePath,
  validateMemberUpload,
} from '../server/finance-storage'

const record = {
  id: 'CI',
  memberId: caller.matricule,
  status: 'ACTIVE',
  firstPaymentDate: '2026-01-01',
  subscriptionCIDuration: 12,
  paymentFrequency: 'MONTHLY',
  subscriptionCICode: 'A',
  subscriptionCIAmountPerMonth: 10000,
}
describe('documents des caisses membre', () => {
  it('ne lit que les pièces du contrat contrôlé, sans accepter une URL libre', async () => {
    const { db } = memoryDb({
      'documents/OWN': { contractId: 'CI', url: 'https://fixture/own' },
      'documents/OTHER': {
        contractId: 'FOREIGN',
        url: 'https://fixture/secret',
      },
      'documents/FORGED': {
        contractId: 'CI',
        memberId: 'FOREIGN',
        url: 'https://fixture/secret',
      },
    })
    const children = {
      payments: [],
      declarations: [{ id: 'D', proofUrl: 'https://fixture/proof' }],
      refunds: [],
      supports: [],
    }
    expect(
      await memberFinanceAttachmentSource(
        db,
        { ...record, contractStartId: 'OWN' },
        children,
        'official',
        '',
      ),
    ).toBe('https://fixture/own')
    expect(
      await memberFinanceAttachmentSource(
        db,
        record,
        children,
        'declaration-proof',
        'D',
      ),
    ).toBe('https://fixture/proof')
    await expect(
      memberFinanceAttachmentSource(
        db,
        { ...record, contractStartId: 'OTHER' },
        children,
        'official',
        '',
      ),
    ).rejects.toMatchObject({ status: 404 })
    await expect(
      memberFinanceAttachmentSource(
        db,
        record,
        children,
        'declaration-proof',
        'FOREIGN',
      ),
    ).rejects.toMatchObject({ status: 404 })
    await expect(
      memberFinanceAttachmentSource(
        db,
        { ...record, memberSignedDocumentId: 'FORGED' },
        children,
        'submitted',
        '',
      ),
    ).rejects.toMatchObject({ status: 404 })
    await expect(
      memberFinanceFile(
        db,
        caller,
        'caisse-imprevue',
        'FOREIGN',
        'contract-template',
      ),
    ).rejects.toMatchObject({ status: 404 })
  })
  it('résout le justificatif avec les mêmes versements que le détail membre', async () => {
    const { db } = memoryDb({})
    const children = {
      payments: [
        { id: 'M0', status: 'PAID', proofUrl: 'https://fixture/legacy' },
        { id: 'M1', status: 'PAID', contribs: [], versements: [{ proofUrl: 'https://fixture/item' }] },
      ],
      declarations: [],
      refunds: [],
      supports: [],
    }
    const findProof = (fileId: string, module: 'caisse-speciale' | 'caisse-imprevue') =>
      memberFinanceAttachmentSource(db, record, children, 'versement-proof', fileId, undefined, module)
    await expect(findProof('M0:legacy', 'caisse-speciale')).resolves.toBe('https://fixture/legacy')
    await expect(findProof('M1:0', 'caisse-speciale')).resolves.toBe('https://fixture/item')
    await expect(findProof('M0:legacy', 'caisse-imprevue')).rejects.toMatchObject({ status: 404 })
    await expect(findProof('M1:legacy', 'caisse-speciale')).rejects.toMatchObject({ status: 404 })
  })
  it('refuse les sources externes et les fausses extensions ou types MIME', () => {
    expect(
      memberStoragePath(
        'https://firebasestorage.googleapis.com/v0/b/test-bucket/o/member%2Ffile.pdf?alt=media',
        'test-bucket',
      ),
    ).toBe('member/file.pdf')
    for (const url of [
      'https://evil.test/a.pdf',
      'https://firebasestorage.googleapis.com/v0/b/other/o/file',
      'file:///etc/passwd',
      'http://storage.googleapis.com/test-bucket/a',
    ])
      expect(() => memberStoragePath(url, 'test-bucket')).toThrow()
    expect(() =>
      validateMemberUpload(Buffer.from('<html>fake</html>'), 'application/pdf'),
    ).toThrow()
    expect(() =>
      validateMemberUpload(Buffer.from('%PDF-1.4'), 'application/pdf'),
    ).not.toThrow()
    expect(() =>
      validateMemberUpload(Buffer.alloc(9 * 1024 * 1024), 'image/png'),
    ).toThrow()
  })
  it.each([
    'contract-template',
    'support-template',
    'refund-template',
    'history',
  ])(
    'prépare le PDF %s avec les données personnelles, sans écriture',
    async (type) => {
      const { db, writes } = memoryDb({
        'contractsCI/CI': record,
        'contractsCI/CI/payments/M0': {
          monthIndex: 0,
          status: 'PAID',
          targetAmount: 10000,
          accumulatedAmount: 10000,
          versements: [
            { amount: 10000, date: '2026-01-01', time: '12:00', mode: 'cash' },
          ],
        },
      })
      const output = await memberFinanceFile(
        db,
        caller,
        'caisse-imprevue',
        'CI',
        type,
        '',
        type === 'refund-template'
          ? {
              type: 'EARLY',
              amount: 1000,
              reason: 'Besoin de mon capital.',
              mode: 'cash',
            }
          : undefined,
      )
      expect(
        Buffer.from(output.base64, 'base64').subarray(0, 5).toString(),
      ).toBe('%PDF-')
      expect(output.mime).toBe('application/pdf')
      expect(writes).toHaveLength(0)
    },
    60000,
  )
  it.each(['caisse-speciale', 'caisse-imprevue'] as const)(
    'préserve les reçus et l’historique complet %s, y compris les Timestamp imbriqués',
    async (module) => {
      const collection =
        module === 'caisse-speciale' ? 'caisseContracts' : 'contractsCI'
      const c = {
        ...record,
        contractStartAt: '2026-01-01',
        monthsPlanned: 12,
        caisseType: 'STANDARD',
      }
      const timestamp = { toDate: () => new Date('2026-01-01T12:00:00Z') }
      const payment = {
        id: 'M0',
        monthIndex: 0,
        dueMonthIndex: 0,
        status: 'PAID',
        amount: 10000,
        targetAmount: 10000,
        accumulatedAmount: 10000,
        paidAt: timestamp,
        contribs: [{ amount: 10000, paidAt: timestamp, mode: 'cash' }],
        versements: [
          { amount: 10000, date: '2026-01-01', time: '12:00', mode: 'cash' },
        ],
      }
      const { db, writes } = memoryDb({
        [collection + '/CI']: c,
        [collection + '/CI/payments/M0']: payment,
      })
      for (const type of ['receipt', 'history']) {
        const output = await memberFinanceFile(
          db,
          caller,
          module,
          'CI',
          type,
          'M0',
        )
        expect(
          Buffer.from(output.base64, 'base64').subarray(0, 5).toString(),
        ).toBe('%PDF-')
        expect(output.filename).toMatch(/\.pdf$/)
      }
      expect(writes).toHaveLength(0)
    },
    60000,
  )
})
