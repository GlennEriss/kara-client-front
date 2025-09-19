import { createUser } from '@/db/user.db'
import type { UserRole } from '@/types/types'

// Script temporaire pour créer des utilisateurs de test
export async function createTestUsers() {
  try {
    console.log('🧪 Création d\'utilisateurs de test...')
    
    const testUsers = [
      {
        firstName: 'Jean',
        lastName: 'Dupont',
        email: 'jean.dupont@test.com',
        phone: '+241 01 23 45 67',
        membershipType: 'adherant' as const,
        roles: ['Member'] as unknown as UserRole[],
        isActive: true,
        hasCar: true,
        subscriptions: [],
        gender: 'Homme',
        birthDate: '1990-01-15',
        contacts: ['+241 01 23 45 67'],
        nationality: 'Gabonaise',
        dossier: 'test-dossier-1'
      },
      {
        firstName: 'Marie',
        lastName: 'Martin',
        email: 'marie.martin@test.com',
        phone: '+241 02 34 56 78',
        membershipType: 'bienfaiteur' as const,
        roles: ['Member'] as unknown as UserRole[],
        isActive: true,
        hasCar: false,
        subscriptions: [],
        gender: 'Femme',
        birthDate: '1985-05-20',
        contacts: ['+241 02 34 56 78'],
        nationality: 'Gabonaise',
        dossier: 'test-dossier-2'
      },
      {
        firstName: 'Pierre',
        lastName: 'Durand',
        email: 'pierre.durand@test.com',
        phone: '+241 03 45 67 89',
        membershipType: 'sympathisant' as const,
        roles: ['Member'] as unknown as UserRole[],
        isActive: true,
        hasCar: true,
        subscriptions: [],
        gender: 'Homme',
        birthDate: '1992-12-10',
        contacts: ['+241 03 45 67 89'],
        nationality: 'Gabonaise',
        dossier: 'test-dossier-3'
      },
      {
        firstName: 'Sophie',
        lastName: 'Bernard',
        email: 'sophie.bernard@test.com',
        phone: '+241 04 56 78 90',
        membershipType: 'adherant' as const,
        roles: ['Member'] as unknown as UserRole[],
        isActive: true,
        hasCar: false,
        subscriptions: [],
        gender: 'Femme',
        birthDate: '1988-08-25',
        contacts: ['+241 04 56 78 90'],
        nationality: 'Gabonaise',
        dossier: 'test-dossier-4'
      },
      {
        firstName: 'Lucas',
        lastName: 'Petit',
        email: 'lucas.petit@test.com',
        phone: '+241 05 67 89 01',
        membershipType: 'bienfaiteur' as const,
        roles: ['Member'] as unknown as UserRole[],
        isActive: true,
        hasCar: true,
        subscriptions: [],
        gender: 'Homme',
        birthDate: '1995-03-12',
        contacts: ['+241 05 67 89 01'],
        nationality: 'Gabonaise',
        dossier: 'test-dossier-5'
      }
    ]

    for (const userData of testUsers) {
      try {
        const user = await createUser(userData)
        console.log('✅ Utilisateur créé:', user.matricule, user.firstName, user.lastName)
      } catch (error) {
        console.error('❌ Erreur lors de la création de l\'utilisateur:', error)
      }
    }
    
    console.log('🎉 Création des utilisateurs de test terminée!')
  } catch (error) {
    console.error('❌ Erreur générale:', error)
  }
}
