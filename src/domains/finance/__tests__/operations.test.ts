import { describe, it, expect, vi } from 'vitest'
import {
  beginFinanceOperation,
  endFinanceOperation,
} from '../server/operations'
function fakeDb() {
  const rows = new Map<string, any>()
  const reference = (path: string) => ({ path, id: path.split('/').at(-1) })
  const tx = {
    get: vi.fn(async (ref: any) => ({
      exists: rows.has(ref.path),
      data: () => rows.get(ref.path),
    })),
    create: vi.fn((ref: any, data: any) => {
      if (rows.has(ref.path)) throw new Error('exists')
      rows.set(ref.path, data)
    }),
    update: vi.fn((ref: any, data: any) =>
      rows.set(ref.path, { ...rows.get(ref.path), ...data }),
    ),
    delete: vi.fn((ref: any) => rows.delete(ref.path)),
  }
  return {
    rows,
    db: {
      collection: (name: string) => ({
        doc: (id: string) => reference(name + '/' + id),
      }),
      runTransaction: async (fn: any) => fn(tx),
    },
  }
}
describe('reprises et exclusions des opérations financières', () => {
  it('retourne le résultat enregistré sans répéter un paiement', async () => {
    const { db } = fakeDb()
    const a = await beginFinanceOperation(
      db as any,
      'admin',
      'uuid',
      'contract',
      'hash',
    )
    await endFinanceOperation(db as any, a.operation, a.lock, 'DONE', {
      paymentId: 'saved',
    })
    const b = await beginFinanceOperation(
      db as any,
      'admin',
      'uuid',
      'contract',
      'hash',
    )
    expect(b.replay).toBe(true)
    expect(b.result).toEqual({ paymentId: 'saved' })
  })
  it('bloque la double saisie concurrente d’un dossier et les clés réutilisées', async () => {
    const { db } = fakeDb()
    await beginFinanceOperation(db as any, 'admin', 'uuid', 'contract', 'hash')
    await expect(
      beginFinanceOperation(db as any, 'other', 'newuuid', 'contract', 'hash'),
    ).rejects.toThrow('déjà en cours')
    await expect(
      beginFinanceOperation(db as any, 'admin', 'uuid', 'contract', 'modified'),
    ).rejects.toThrow('autre saisie')
  })
  it('ne rejoue pas automatiquement une opération partiellement échouée', async () => {
    const { db } = fakeDb()
    const a = await beginFinanceOperation(
      db as any,
      'admin',
      'uuid',
      'contract',
      'hash',
    )
    await endFinanceOperation(db as any, a.operation, a.lock, 'FAILED')
    await expect(
      beginFinanceOperation(db as any, 'admin', 'uuid', 'contract', 'hash'),
    ).rejects.toThrow('historique')
  })
})
