import { getUserById, getAllUsers } from '@/db/user.db'

// Fonction de débogage pour vérifier les utilisateurs
export async function debugUsers() {
  try {
    console.log('🔍 Début du débogage des utilisateurs...')
    
    // Vérifier l'utilisateur spécifique
    const specificUser = await getUserById('6156.MK.250825')
    console.log('👤 Utilisateur spécifique:', specificUser ? {
      id: specificUser.id,
      matricule: specificUser.matricule,
      firstName: specificUser.firstName,
      lastName: specificUser.lastName,
      createdAt: specificUser.createdAt
    } : 'Non trouvé')
    
    // Récupérer tous les utilisateurs
    const allUsers = await getAllUsers({ limit: 50 })
    console.log('📊 Total des utilisateurs:', allUsers.total)
    console.log('👥 Premiers utilisateurs:', allUsers.users.slice(0, 10).map(u => ({
      id: u.id,
      matricule: u.matricule,
      firstName: u.firstName,
      lastName: u.lastName,
      createdAt: u.createdAt
    })))
    
    // Chercher des utilisateurs avec des matricules similaires
    const usersWithMatricule = allUsers.users.filter(u => u.matricule?.includes('6156'))
    console.log('🔍 Utilisateurs avec matricule contenant "6156":', usersWithMatricule.map(u => ({
      id: u.id,
      matricule: u.matricule,
      firstName: u.firstName,
      lastName: u.lastName
    })))
    
  } catch (error) {
    console.error('❌ Erreur lors du débogage:', error)
  }
}
