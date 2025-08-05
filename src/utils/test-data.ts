/**
 * Utilitaires pour créer des données de test
 * À utiliser temporairement pour tester les fonctionnalités
 */

import { addDoc, collection, doc, setDoc } from 'firebase/firestore'
import { db } from '@/firebase/firestore'
import { User, Subscription, MembershipType } from '@/types/types'

/**
 * Crée un utilisateur de test avec une subscription valide
 */
export async function createTestUserWithSubscription() {
  try {
    // Générer un ID unique pour l'utilisateur
    const userId = `test_user_${Date.now()}`
    
    // Créer les données utilisateur
    const userData: Omit<User, 'id'> = {
      matricule: `${String(Math.floor(Math.random() * 9999)).padStart(4, '0')}.MK.${new Date().toISOString().slice(2, 10).replace(/-/g, '')}`,
      lastName: 'Test',
      firstName: 'Utilisateur',
      birthDate: '1990-01-01',
      contacts: ['+33612345678'],
      gender: 'Homme',
      email: 'test@kara.com',
      nationality: 'Française',
      hasCar: true,
      photoURL: null,
      photoPath: null,
      subscriptions: [], // Sera mis à jour après création de la subscription
      dossier: 'test_dossier_id',
      membershipType: 'adherant' as MembershipType,
      roles: ['Adherant'],
      createdAt: new Date(),
      updatedAt: new Date(),
      isActive: true
    }
    
    // Créer l'utilisateur dans Firestore
    await setDoc(doc(db, 'users', userId), userData)
    console.log(`✅ Created test user: ${userId}`)
    
    // Créer une subscription valide
    const subscriptionData: Omit<Subscription, 'id'> = {
      userId: userId,
      dateStart: new Date(), // Commence maintenant
      dateEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // Expire dans 1 an
      montant: 50,
      currency: 'EUR',
      type: 'adherant' as MembershipType,
      isValid: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'admin_test'
    }
    
    // Ajouter la subscription
    const subscriptionRef = await addDoc(collection(db, 'subscriptions'), subscriptionData)
    console.log(`✅ Created test subscription: ${subscriptionRef.id}`)
    
    // Mettre à jour l'utilisateur avec la référence de subscription
    await setDoc(doc(db, 'users', userId), {
      ...userData,
      subscriptions: [subscriptionRef.id]
    })
    
    console.log(`🎉 Test user created successfully:`)
    console.log(`   User ID: ${userId}`)
    console.log(`   Subscription ID: ${subscriptionRef.id}`)
    console.log(`   Subscription valid until: ${subscriptionData.dateEnd}`)
    
    return {
      userId,
      subscriptionId: subscriptionRef.id,
      userData,
      subscriptionData
    }
  } catch (error) {
    console.error('❌ Error creating test user:', error)
    throw error
  }
}

/**
 * Crée un utilisateur de test avec une subscription expirée
 */
export async function createTestUserWithExpiredSubscription() {
  try {
    const userId = `test_user_expired_${Date.now()}`
    
    const userData: Omit<User, 'id'> = {
      matricule: `${String(Math.floor(Math.random() * 9999)).padStart(4, '0')}.MK.${new Date().toISOString().slice(2, 10).replace(/-/g, '')}`,
      lastName: 'TestExpiré',
      firstName: 'Utilisateur',
      birthDate: '1985-05-15',
      contacts: ['+33612345679'],
      gender: 'Femme',
      email: 'test.expire@kara.com',
      nationality: 'Française',
      hasCar: false,
      photoURL: null,
      photoPath: null,
      subscriptions: [],
      dossier: 'test_dossier_expire_id',
      membershipType: 'bienfaiteur' as MembershipType,
      roles: ['Bienfaiteur'],
      createdAt: new Date(Date.now() - 400 * 24 * 60 * 60 * 1000), // Créé il y a 400 jours
      updatedAt: new Date(),
      isActive: true
    }
    
    await setDoc(doc(db, 'users', userId), userData)
    console.log(`✅ Created test user with expired subscription: ${userId}`)
    
    const subscriptionData: Omit<Subscription, 'id'> = {
      userId: userId,
      dateStart: new Date(Date.now() - 400 * 24 * 60 * 60 * 1000), // Commencé il y a 400 jours
      dateEnd: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000), // Expiré il y a 35 jours
      montant: 100,
      currency: 'EUR',
      type: 'bienfaiteur' as MembershipType,
      isValid: false,
      createdAt: new Date(Date.now() - 400 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(),
      createdBy: 'admin_test'
    }
    
    const subscriptionRef = await addDoc(collection(db, 'subscriptions'), subscriptionData)
    console.log(`✅ Created expired subscription: ${subscriptionRef.id}`)
    
    await setDoc(doc(db, 'users', userId), {
      ...userData,
      subscriptions: [subscriptionRef.id]
    })
    
    console.log(`🎉 Test user with expired subscription created successfully:`)
    console.log(`   User ID: ${userId}`)
    console.log(`   Subscription ID: ${subscriptionRef.id}`)
    console.log(`   Subscription expired on: ${subscriptionData.dateEnd}`)
    
    return {
      userId,
      subscriptionId: subscriptionRef.id,
      userData,
      subscriptionData
    }
  } catch (error) {
    console.error('❌ Error creating test user with expired subscription:', error)
    throw error
  }
}

/**
 * Crée un utilisateur de test sans subscription
 */
export async function createTestUserWithoutSubscription() {
  try {
    const userId = `test_user_no_sub_${Date.now()}`
    
    const userData: Omit<User, 'id'> = {
      matricule: `${String(Math.floor(Math.random() * 9999)).padStart(4, '0')}.MK.${new Date().toISOString().slice(2, 10).replace(/-/g, '')}`,
      lastName: 'TestSansAbo',
      firstName: 'Utilisateur',
      birthDate: '1992-12-20',
      contacts: ['+33612345680'],
      gender: 'Homme',
      email: 'test.nosub@kara.com',
      nationality: 'Française',
      hasCar: true,
      photoURL: null,
      photoPath: null,
      subscriptions: [], // Pas de subscriptions
      dossier: 'test_dossier_no_sub_id',
      membershipType: 'sympathisant' as MembershipType,
      roles: ['Sympathisant'],
      createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Créé il y a 30 jours
      updatedAt: new Date(),
      isActive: true
    }
    
    await setDoc(doc(db, 'users', userId), userData)
    console.log(`✅ Created test user without subscription: ${userId}`)
    
    console.log(`🎉 Test user without subscription created successfully:`)
    console.log(`   User ID: ${userId}`)
    console.log(`   No subscriptions`)
    
    return {
      userId,
      userData
    }
  } catch (error) {
    console.error('❌ Error creating test user without subscription:', error)
    throw error
  }
}