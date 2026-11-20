import { describe, expect, it, vi } from 'vitest'
import {
  createServerFirestorePort,
  cleanFinanceWrite,
} from '../server/firestore-port'
describe('port de persistance financier', () => {
  it('retire les champs optionnels imbriqués sans altérer les dates', () => {
    const date = new Date()
    expect(
      cleanFinanceWrite({
        date,
        contribs: [{ amount: 25000, proofUrl: undefined }],
      }),
    ).toEqual({ date, contribs: [{ amount: 25000 }] })
  })
  it('refuse l’écrasement implicite d’un paiement existant', async () => {
    const create = vi
        .fn()
        .mockRejectedValue(Object.assign(new Error('exists'), { code: 6 })),
      set = vi.fn()
    const port = createServerFirestorePort({} as any)
    await expect(
      port.setDoc({ create, set } as any, { amount: 100 }),
    ).rejects.toMatchObject({ code: 6 })
    expect(create).toHaveBeenCalledWith({ amount: 100 })
    expect(set).not.toHaveBeenCalled()
  })
  it('adapte les snapshots transactionnels sans perdre la référence métier', async () => {
    const ref = { id: 'payment' },
      snapshot = {
        id: 'payment',
        ref,
        exists: true,
        data: () => ({ amount: 200 }),
      }
    const transaction = {
      get: vi.fn().mockResolvedValue(snapshot),
      update: vi.fn(),
      set: vi.fn(),
      delete: vi.fn(),
    }
    const db = { runTransaction: vi.fn((fn) => fn(transaction)) }
    const port = createServerFirestorePort(db as any)
    await port.runTransaction(port.db, async (tx) => {
      const row = await tx.get(ref as any)
      expect(row.exists()).toBe(true)
      expect(row.data()).toEqual({ amount: 200 })
      expect(row.ref).toBe(ref)
      tx.update(ref as any, { amount: 300 })
    })
    expect(transaction.update).toHaveBeenCalledWith(ref, { amount: 300 })
  })
  it('conserve les clauses de curseur et les disjonctions des recherches', () => {
    const port = createServerFirestorePort({} as any),
      q = {
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        startAfter: vi.fn().mockReturnThis(),
      }
    const native = { id: 'cursor' }
    port.query(
      q as any,
      port.or(
        port.where('name', '==', 'A'),
        port.where('matricule', '==', 'A'),
      ),
      port.limit(25),
      port.startAfter({ _snapshot: native } as any),
    )
    expect(q.where).toHaveBeenCalledTimes(1)
    expect(q.limit).toHaveBeenCalledWith(25)
    expect(q.startAfter).toHaveBeenCalledWith(native)
  })
})
