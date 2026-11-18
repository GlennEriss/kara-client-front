import { describe, expect, it } from 'vitest'
import { financeAttachmentPath } from '../server/attachment-path'
const bucket = 'demo.firebasestorage.app'
const url = `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/proofs%2Fversement.jpg?alt=media`
describe('pièces contractuelles intégrées', () => {
  it('retrouve seulement une pièce rattachée au dossier dans le bucket prévu', () => {
    expect(
      financeAttachmentPath({ versements: [{ proofUrl: url }] }, url, bucket),
    ).toBe('proofs/versement.jpg')
  })
  it('refuse les documents d’un autre contrat et les URL externes même stockées en base', () => {
    expect(() => financeAttachmentPath({ documents: [] }, url, bucket)).toThrow(
      'contrat',
    )
    const external = 'https://example.test/document.pdf'
    expect(() =>
      financeAttachmentPath({ documentUrl: external }, external, bucket),
    ).toThrow('stockage')
    expect(() =>
      financeAttachmentPath({ documentUrl: url }, url, 'another-bucket'),
    ).toThrow('stockage')
  })
})
