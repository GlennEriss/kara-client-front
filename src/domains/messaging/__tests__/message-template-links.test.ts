import { describe, expect, it } from 'vitest'
import { messageLinkVariables, normalizeMessageBaseUrl } from '../utils/message-template-links'

describe('adresses des modèles de messages', () => {
  it('conserve le chemin, les paramètres du dossier et les autres variables', () => {
    const variables = messageLinkVariables({ lien: 'https://ancien.example.com/corrections/dossier-42?code=123456#etape', nom: 'Alice' }, 'https://nouveau.example.com/espace')
    expect(variables).toEqual({ lien: 'https://nouveau.example.com/espace/corrections/dossier-42?code=123456#etape', nom: 'Alice' })
  })
  it('applique la même adresse aux liens inclus dans les blocs et reste idempotent', () => {
    const variables = { lienEvenement: 'Voir : https://ancien.example.com/evenements/e1', contribution: 'Contribuer : https://ancien.example.com/bienfaiteur/c1' }
    const next = messageLinkVariables(variables, 'https://nouveau.example.com/espace')
    expect(next.contribution).toBe('Contribuer : https://nouveau.example.com/espace/bienfaiteur/c1')
    expect(messageLinkVariables(next, 'https://nouveau.example.com/espace')).toEqual(next)
    expect(messageLinkVariables(variables, '')).toEqual(variables)
  })
  it('refuse les protocoles dangereux, identifiants et paramètres sur l’adresse de base', () => {
    for (const input of ['javascript:alert(1)', 'https://user:pass@example.com', 'https://exemple.com?code=123456', 'https://exemple.com#etape', 'http://exemple.com']) expect(() => normalizeMessageBaseUrl(input)).toThrow()
    expect(normalizeMessageBaseUrl('https://exemple.com/')).toBe('https://exemple.com')
  })
})
