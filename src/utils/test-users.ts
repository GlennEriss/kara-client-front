import { createUser } from '@/db/user.db'

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
        roles: ['Member'] as const,
        isActive: true,
        hasCar: true,
        subscriptions: []
      },
      {
        firstName: 'Marie',
        lastName: 'Martin',
        email: 'marie.martin@test.com',
        phone: '+241 02 34 56 78',
        membershipType: 'bienfaiteur' as const,
        roles: ['Member'] as const,
        isActive: true,
        hasCar: false,
        subscriptions: []
      },
      {
        firstName: 'Pierre',
        lastName: 'Durand',
        email: 'pierre.durand@test.com',
        phone: '+241 03 45 67 89',
        membershipType: 'sympathisant' as const,
        roles: ['Member'] as const,
        isActive: true,
        hasCar: true,
        subscriptions: []
      },
      {
        firstName: 'Sophie',
        lastName: 'Bernard',
        email: 'sophie.bernard@test.com',
        phone: '+241 04 56 78 90',
        membershipType: 'adherant' as const,
        roles: ['Member'] as const,
        isActive: true,
        hasCar: false,
        subscriptions: []
      },
      {
        firstName: 'Lucas',
        lastName: 'Petit',
        email: 'lucas.petit@test.com',
        phone: '+241 05 67 89 01',
        membershipType: 'bienfaiteur' as const,
        roles: ['Member'] as const,
        isActive: true,
        hasCar: true,
        subscriptions: []
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
