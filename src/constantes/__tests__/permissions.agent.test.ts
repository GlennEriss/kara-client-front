import { describe, expect, it } from 'vitest'
import {
  AGENT_RECOUVREMENT_PERMISSIONS,
  ALL_PERMISSION_KEYS,
  PERMISSIONS_VERSION,
  effectivePermissions,
  RESTRICTED_ROLE_TEMPLATES,
  VEHICULE_MANAGER_PERMISSIONS,
  firstAccessiblePath,
  isOpenToRestrictedRole,
  restrictedRoleOf,
  requiredActionPermissionForPath,
  requiredViewPermissionForPath,
} from '../permissions'

const agent = AGENT_RECOUVREMENT_PERMISSIONS as readonly string[]

describe('modèle d’accès de l’agent de recouvrement', () => {
  it('ne contient que des clés existantes, en consultation seulement', () => {
    for (const key of agent) {
      expect(ALL_PERMISSION_KEYS).toContain(key)
      expect(key.endsWith('.view')).toBe(true)
    }
  })

  it('n’inclut ni l’encaissement ni le téléchargement', () => {
    expect(ALL_PERMISSION_KEYS).toContain('calendar.payment')
    expect(ALL_PERMISSION_KEYS).toContain('documents.download')
    expect(agent).not.toContain('calendar.payment')
    expect(agent).not.toContain('documents.download')
  })

  it('arrive sur le calendrier', () => {
    expect(firstAccessiblePath((key) => agent.includes(key))).toBe('/calendrier')
    expect(firstAccessiblePath((key) => key === 'events.view')).toBe('/events')
    expect(firstAccessiblePath(() => false)).toBeNull()
  })

  it('ouvre les anniversaires sans la liste des membres', () => {
    expect(requiredViewPermissionForPath('/memberships/anniversaires')).toBe('birthdays.view')
    expect(agent).toContain('birthdays.view')
    expect(agent).not.toContain(requiredViewPermissionForPath('/memberships'))
  })
})

describe('pages protégées', () => {
  it('protège les pages de création et de modification', () => {
    expect(requiredActionPermissionForPath('/events/nouveau')).toBe('events.manage')
    expect(requiredActionPermissionForPath('/events/abc123/edit')).toBe('events.manage')
    expect(requiredActionPermissionForPath('/bienfaiteur/create')).toBe('bienfaiteur.create')
    expect(requiredActionPermissionForPath('/bienfaiteur/abc123/modify')).toBe('bienfaiteur.edit')
    expect(requiredActionPermissionForPath('/events/abc123')).toBeNull()
  })

  it('rattache la page Métiers à son module', () => {
    expect(requiredViewPermissionForPath('/metiers')).toBe('references.view')
  })

  it('n’ouvre à l’agent que les pages sans module explicitement listées', () => {
    expect(isOpenToRestrictedRole('/statuts')).toBe(true)
    expect(isOpenToRestrictedRole('/reinitialisation')).toBe(false)
  })
})

describe('effectivePermissions', () => {
  it('prend les cases cochées telles quelles au format actuel', () => {
    const saved = ['calendar.view', 'events.view']
    expect(effectivePermissions(saved, { version: PERMISSIONS_VERSION, restrictedRole: 'AgentRecouvrement' })).toEqual(saved)
    expect(effectivePermissions(saved, { version: PERMISSIONS_VERSION, restrictedRole: null })).toEqual(saved)
  })

  it('garde ses accès à un admin dont la fiche est ancienne', () => {
    const result = effectivePermissions(['members.view', 'members.export', 'calendar.view'], { restrictedRole: null })
    expect(result).toEqual(
      expect.arrayContaining(['birthdays.view', 'birthdays.export', 'calendar.payment', 'documents.download']),
    )
  })

  it('n’ajoute pas l’encaissement sans le calendrier', () => {
    expect(effectivePermissions(['events.view'], { restrictedRole: null })).not.toContain('calendar.payment')
  })

  it('donne le modèle agent à un agent dont la fiche est ancienne', () => {
    expect(effectivePermissions(['calendar.view'], { restrictedRole: 'AgentRecouvrement' })).toEqual([...AGENT_RECOUVREMENT_PERMISSIONS])
  })
})

describe('gestionnaire des véhicules', () => {
  const vehicules = VEHICULE_MANAGER_PERMISSIONS as readonly string[]

  it('a tout le module Véhicules, sans téléchargement', () => {
    for (const key of vehicules) expect(ALL_PERMISSION_KEYS).toContain(key)
    expect(vehicules).toEqual(expect.arrayContaining(['vehicules.view', 'vehicules.create', 'vehicules.edit', 'vehicules.delete', 'vehicules.export']))
    expect(vehicules).not.toContain('documents.download')
  })

  it('arrive sur les véhicules', () => {
    expect(firstAccessiblePath((key) => vehicules.includes(key))).toBe('/vehicules')
  })

  it('protège la page de modification d’une assurance', () => {
    expect(requiredActionPermissionForPath('/vehicules/abc123/edit')).toBe('vehicules.edit')
    expect(requiredActionPermissionForPath('/vehicules/abc123')).toBeNull()
  })

  it('reçoit son modèle si sa fiche est ancienne', () => {
    expect(effectivePermissions([], { restrictedRole: 'GestionnaireVehicules' })).toEqual([...vehicules])
  })
})

describe('restrictedRoleOf', () => {
  it('reconnaît les rôles restreints dans roles ou role', () => {
    expect(restrictedRoleOf(['GestionnaireVehicules'])).toBe('GestionnaireVehicules')
    expect(restrictedRoleOf(null, 'AgentRecouvrement')).toBe('AgentRecouvrement')
    expect(restrictedRoleOf(['Admin'], 'Secretary')).toBeNull()
    expect(Object.keys(RESTRICTED_ROLE_TEMPLATES)).toEqual(['AgentRecouvrement', 'GestionnaireVehicules'])
  })
})
