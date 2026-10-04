import { describe, expect, it } from 'vitest'
import {
  AGENT_RECOUVREMENT_HOME,
  AGENT_RECOUVREMENT_PERMISSIONS,
  ALL_PERMISSION_KEYS,
  requiredActionPermissionForPath,
  requiredViewPermissionForPath,
  isOpenToAgent,
  withImpliedPermissions,
} from '../permissions'

describe('permissions de l’agent de recouvrement', () => {
  it('ne contient que des clés existantes, en consultation seulement', () => {
    for (const key of AGENT_RECOUVREMENT_PERMISSIONS) {
      expect(ALL_PERMISSION_KEYS).toContain(key)
      expect(key.endsWith('.view')).toBe(true)
    }
  })

  it('donne accès à sa page d’arrivée', () => {
    const required = requiredViewPermissionForPath(AGENT_RECOUVREMENT_HOME)
    expect(required).not.toBeNull()
    expect(AGENT_RECOUVREMENT_PERMISSIONS as readonly string[]).toContain(required)
  })

  it('protège les pages de création et de modification', () => {
    expect(requiredActionPermissionForPath('/events/nouveau')).toBe('events.manage')
    expect(requiredActionPermissionForPath('/events/abc123/edit')).toBe('events.manage')
    expect(requiredActionPermissionForPath('/bienfaiteur/create')).toBe('bienfaiteur.create')
    expect(requiredActionPermissionForPath('/bienfaiteur/abc123/modify')).toBe('bienfaiteur.edit')
  })

  it('laisse les pages de consultation sans permission d’action', () => {
    expect(requiredActionPermissionForPath('/events')).toBeNull()
    expect(requiredActionPermissionForPath('/events/abc123')).toBeNull()
    expect(requiredActionPermissionForPath('/bienfaiteur/abc123')).toBeNull()
    expect(requiredActionPermissionForPath('/calendrier')).toBeNull()
  })

  it('ouvre les anniversaires sans la liste des membres', () => {
    const agent = AGENT_RECOUVREMENT_PERMISSIONS as readonly string[]
    expect(requiredViewPermissionForPath('/memberships/anniversaires')).toBe('birthdays.view')
    expect(agent).toContain('birthdays.view')
    expect(agent).not.toContain(requiredViewPermissionForPath('/memberships'))
    expect(agent).not.toContain(requiredViewPermissionForPath('/memberships/abc123'))
    expect(agent).not.toContain('birthdays.export')
  })
})

describe('isOpenToAgent', () => {
  it('n’ouvre à l’agent que les pages sans module explicitement listées', () => {
    expect(isOpenToAgent('/statuts')).toBe(true)
    expect(isOpenToAgent('/metiers')).toBe(false)
    expect(isOpenToAgent('/reinitialisation')).toBe(false)
  })
})

describe('withImpliedPermissions', () => {
  it('garde les anniversaires aux admins qui voient les membres', () => {
    expect(withImpliedPermissions(['members.view', 'members.export'])).toEqual(
      expect.arrayContaining(['birthdays.view', 'birthdays.export']),
    )
  })

  it('n’ajoute rien sans la permission source', () => {
    expect(withImpliedPermissions(['calendar.view'])).toEqual(['calendar.view'])
  })
})
