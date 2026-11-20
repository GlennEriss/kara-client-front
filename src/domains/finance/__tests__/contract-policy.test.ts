import { describe, expect, it } from 'vitest'
import {
  contractActionAvailable,
  contractDocumentGate,
} from '../server/contract-policy'

describe('prérequis des contrats natifs', () => {
  it.each(['credit-speciale', 'credit-fixe', 'caisse-aide'] as const)(
    'autorise un nouveau dépôt après rajout déjà signé en %s sans retirer les droits existants',
    (module) => {
      const row = {
        status: 'PARTIAL',
        signedContractUrl: 'ancien.pdf',
        rajoutEffectue: true,
      }
      expect(contractDocumentGate(module, row)).toBeNull()
      expect(contractActionAvailable(module, row, 'document.upload')).toBe(true)
      expect(
        contractActionAvailable(
          module,
          { ...row, rajoutEffectue: false },
          'document.upload',
        ),
      ).toBe(false)
      for (const status of ['CLOSED', 'DISCHARGED', 'WRITTEN_OFF'])
        expect(
          contractActionAvailable(
            module,
            { ...row, status },
            'document.upload',
          ),
        ).toBe(false)
    },
  )
  it.each(['caisse-speciale', 'caisse-imprevue', 'credit-speciale'] as const)(
    'bloque les versements sans document signé en %s',
    (module) => {
      const row = { status: 'ACTIVE' }
      expect(contractDocumentGate(module, row)?.status).toBe('MISSING')
      expect(contractActionAvailable(module, row, 'payment.create')).toBe(false)
      expect(contractActionAvailable(module, row, 'payment.update')).toBe(false)
      expect(contractActionAvailable(module, row, 'document.upload')).toBe(true)
    },
  )
  it('conserve les exceptions de migration CS/CI et attend la validation de la signature reçue', () => {
    for (const module of ['caisse-speciale', 'caisse-imprevue'] as const) {
      expect(contractDocumentGate(module, { isMigrated: true })).toBeNull()
      const pending = {
        isMigrated: true,
        memberSignedStatus: 'PENDING_ADMIN',
        memberSignedDocumentId: 'doc',
      }
      expect(contractActionAvailable(module, pending, 'payment.create')).toBe(
        false,
      )
      expect(
        contractActionAvailable(module, pending, 'member-document.approve'),
      ).toBe(true)
    }
    expect(
      contractDocumentGate('credit-speciale', { isMigrated: true }),
    ).not.toBeNull()
  })
  it('autorise le contrat signé actif et bloque les changements de versement après clôture', () => {
    expect(
      contractActionAvailable(
        'credit-speciale',
        { status: 'ACTIVE', signedContractUrl: 'signed' },
        'payment.create',
      ),
    ).toBe(true)
    expect(
      contractActionAvailable(
        'credit-speciale',
        { status: 'CLOSED', signedContractUrl: 'signed' },
        'payment.create',
      ),
    ).toBe(false)
    expect(
      contractActionAvailable(
        'credit-speciale',
        { status: 'CLOSED', signedContractUrl: 'signed' },
        'payment.update',
      ),
    ).toBe(false)
  })
})
