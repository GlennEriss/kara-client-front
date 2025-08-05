/**
 * Utilitaires pour débugger les données Firebase
 */

import { collection, getDocs, query, where, limit, doc, getDoc } from 'firebase/firestore'
import { db } from '@/firebase/firestore'

/**
 * Inspecte l'état de la base de données pour diagnostiquer les problèmes
 */
export async function debugFirebaseData() {
  console.log('🔍 === STARTING FIREBASE DEBUG ===')
  
  try {
    // 1. Vérifier les utilisateurs
    console.log('\n📋 1. CHECKING USERS COLLECTION:')
    const usersQuery = query(collection(db, 'users'), limit(5))
    const usersSnapshot = await getDocs(usersQuery)
    
    console.log(`   Total users found: ${usersSnapshot.docs.length}`)
    
    usersSnapshot.docs.forEach((doc, index) => {
      const userData = doc.data()
      console.log(`   User ${index + 1}:`, {
        id: doc.id,
        name: `${userData.firstName} ${userData.lastName}`,
        roles: userData.roles,
        subscriptions: userData.subscriptions || [],
        hasCar: userData.hasCar,
        isActive: userData.isActive
      })
    })
    
    // 2. Vérifier les subscriptions
    console.log('\n💳 2. CHECKING SUBSCRIPTIONS COLLECTION:')
    const subsQuery = query(collection(db, 'subscriptions'), limit(10))
    const subsSnapshot = await getDocs(subsQuery)
    
    console.log(`   Total subscriptions found: ${subsSnapshot.docs.length}`)
    
    subsSnapshot.docs.forEach((doc, index) => {
      const subData = doc.data()
      console.log(`   Subscription ${index + 1}:`, {
        id: doc.id,
        userId: subData.userId,
        type: subData.type,
        dateStart: subData.dateStart?.toDate?.() || subData.dateStart,
        dateEnd: subData.dateEnd?.toDate?.() || subData.dateEnd,
        montant: subData.montant,
        currency: subData.currency
      })
    })
    
    // 3. Vérifier les relations User → Subscription
    console.log('\n🔗 3. CHECKING USER-SUBSCRIPTION RELATIONSHIPS:')
    
    if (usersSnapshot.docs.length > 0) {
      const firstUser = usersSnapshot.docs[0]
      const userData = firstUser.data()
      
      console.log(`   Testing relationships for user: ${userData.firstName} ${userData.lastName} (${firstUser.id})`)
      
      // Méthode 1: Via tableau subscriptions du User
      if (userData.subscriptions && userData.subscriptions.length > 0) {
        console.log(`     User has ${userData.subscriptions.length} subscription references:`, userData.subscriptions)
        
        for (const subId of userData.subscriptions) {
          try {
            const subDoc = await getDoc(doc(db, 'subscriptions', subId))
            if (subDoc.exists()) {
              console.log(`     ✅ Subscription ${subId} exists:`, subDoc.data())
            } else {
              console.log(`     ❌ Subscription ${subId} NOT FOUND`)
            }
          } catch (error) {
            console.log(`     🚨 Error fetching subscription ${subId}:`, error)
          }
        }
      } else {
        console.log(`     User has no subscription references in subscriptions array`)
      }
      
      // Méthode 2: Via requête directe sur userId
      try {
        const userSubsQuery = query(
          collection(db, 'subscriptions'),
          where('userId', '==', firstUser.id)
        )
        const userSubsSnapshot = await getDocs(userSubsQuery)
        console.log(`     Query by userId found ${userSubsSnapshot.docs.length} subscriptions`)
        
        userSubsSnapshot.docs.forEach(doc => {
          const subData = doc.data()
          console.log(`     📋 Found subscription:`, {
            id: doc.id,
            userId: subData.userId,
            dateEnd: subData.dateEnd?.toDate?.() || subData.dateEnd
          })
        })
      } catch (error) {
        console.log(`     🚨 Error in userId query:`, error)
      }
    }
    
    // 4. Vérifier les permissions et règles
    console.log('\n🔐 4. CHECKING PERMISSIONS:')
    try {
      const testQuery = query(collection(db, 'subscriptions'), limit(1))
      const testSnapshot = await getDocs(testQuery)
      console.log(`   ✅ Can read subscriptions collection (${testSnapshot.docs.length} docs)`)
    } catch (error) {
      console.log(`   ❌ Cannot read subscriptions collection:`, error)
    }
    
    try {
      const testQuery = query(collection(db, 'users'), limit(1))
      const testSnapshot = await getDocs(testQuery)
      console.log(`   ✅ Can read users collection (${testSnapshot.docs.length} docs)`)
    } catch (error) {
      console.log(`   ❌ Cannot read users collection:`, error)
    }
    
  } catch (error) {
    console.error('🚨 DEBUG ERROR:', error)
  }
  
  console.log('\n🏁 === FIREBASE DEBUG COMPLETE ===\n')
}

/**
 * Test spécifique pour un utilisateur donné
 */
export async function debugUserSubscriptions(userId: string) {
  console.log(`🔍 === DEBUGGING USER ${userId} ===`)
  
  try {
    // 1. Récupérer l'utilisateur
    const userDoc = await getDoc(doc(db, 'users', userId))
    if (!userDoc.exists()) {
      console.log('❌ User not found')
      return
    }
    
    const userData = userDoc.data()
    console.log('📋 User data:', {
      id: userDoc.id,
      name: `${userData.firstName} ${userData.lastName}`,
      subscriptions: userData.subscriptions,
      roles: userData.roles
    })
    
    // 2. Test requête subscriptions
    console.log('\n💳 Testing subscription queries:')
    
    const subsQuery = query(
      collection(db, 'subscriptions'),
      where('userId', '==', userId)
    )
    
    const subsSnapshot = await getDocs(subsQuery)
    console.log(`Query result: ${subsSnapshot.docs.length} subscriptions found`)
    
    subsSnapshot.docs.forEach(doc => {
      const subData = doc.data()
      console.log('📋 Subscription:', {
        id: doc.id,
        userId: subData.userId,
        dateStart: subData.dateStart?.toDate?.() || subData.dateStart,
        dateEnd: subData.dateEnd?.toDate?.() || subData.dateEnd,
        isValid: (subData.dateEnd?.toDate?.() || new Date(subData.dateEnd)) > new Date()
      })
    })
    
  } catch (error) {
    console.error('🚨 DEBUG USER ERROR:', error)
  }
}