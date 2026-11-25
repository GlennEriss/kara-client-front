import { expect, it } from 'vitest'
import { readInsurerNames, resolveInsurerSelection } from './insurance-companies'

it('normalise les variantes du catalogue et conserve un catalogue explicitement vide', () => {
  expect(readInsurerNames({ names: ['Nsia', ' NSIA ', 'aXa', 'OGAR'] })).toEqual(['AXA', 'NSIA', 'OGAR'])
  expect(readInsurerNames({ names: [] })).toEqual([])
})

it('utilise le nom officiel pour la saisie et conserve un ancien assureur uniquement sur son dossier', () => {
  expect(resolveInsurerSelection('Nsia', ['NSIA'])).toBe('NSIA')
  expect(resolveInsurerSelection('Ancien assureur', ['OGAR'])).toBeNull()
  expect(resolveInsurerSelection('Ancien assureur', ['OGAR'], 'Ancien assureur')).toBe('Ancien assureur')
})
