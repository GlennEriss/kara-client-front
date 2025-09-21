import { createGroup } from '@/db/group.db'

// Script temporaire pour créer des groupes de test
export async function createTestGroups() {
  try {
    console.log('🧪 Création de groupes de test...')
    
    const testGroups = [
      {
        name: 'Équipe Marketing',
        label: 'Marketing',
        description: 'Équipe dédiée au marketing et à la communication',
        createdBy: 'admin',
        updatedBy: 'admin'
      },
      {
        name: 'Équipe Technique',
        label: 'Tech',
        description: 'Équipe de développement et maintenance technique',
        createdBy: 'admin',
        updatedBy: 'admin'
      },
      {
        name: 'Équipe Commerciale',
        label: 'Sales',
        description: 'Équipe de vente et relation client',
        createdBy: 'admin',
        updatedBy: 'admin'
      },
      {
        name: 'Équipe Administrative',
        label: 'Admin',
        description: 'Équipe de gestion administrative',
        createdBy: 'admin',
        updatedBy: 'admin'
      },
      {
        name: 'Équipe Finance',
        label: 'Finance',
        description: 'Équipe de gestion financière et comptabilité',
        createdBy: 'admin',
        updatedBy: 'admin'
      }
    ]

    for (const groupData of testGroups) {
      try {
        const group = await createGroup(groupData)
        console.log('✅ Groupe créé:', group.id, group.name)
      } catch (error) {
        console.error('❌ Erreur lors de la création du groupe:', error)
      }
    }
    
    console.log('🎉 Création des groupes de test terminée!')
  } catch (error) {
    console.error('❌ Erreur générale:', error)
  }
}
