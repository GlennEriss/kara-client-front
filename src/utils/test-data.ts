/**
 * Utilitaires pour créer des données de test
 * À utiliser temporairement pour tester les fonctionnalités
 */

import { addDoc, collection, doc, setDoc } from 'firebase/firestore'
import { db } from '@/firebase/firestore'
import { User, Subscription, MembershipType } from '@/types/types'
import { generateMatricule } from '@/db/user.db'

/**
 * Crée un utilisateur de test avec une subscription valide
 */
export async function createTestUserWithSubscription() {
  try {
    // Générer un ID unique pour l'utilisateur
    const userId = `test_user_${Date.now()}`
    
         // Créer les données utilisateur
     const userData: Omit<User, 'id'> = {
       matricule: await generateMatricule(),
      lastName: 'Test',
      firstName: 'Utilisateur',
      birthDate: '1990-01-01',
      contacts: ['+33612345678'],
      gender: 'Homme',
      email: 'test@kara.com',
      nationality: 'Française',
      hasCar: true,
      address: {
        province: 'Estuaire',
        city: 'Libreville',
        district: 'Centre-ville',
        arrondissement: '1er Arrondissement',
        additionalInfo: 'Rue de la Paix'
      },
      companyName: 'TechCorp',
      profession: 'Développeur',
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
       matricule: await generateMatricule(),
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
       matricule: await generateMatricule(),
      lastName: 'TestSansAbo',
      firstName: 'Utilisateur',
      birthDate: '1992-12-20',
      contacts: ['+33612345680'],
      gender: 'Homme',
      email: 'test.nosub@kara.com',
      nationality: 'Française',
      hasCar: true,
      address: {
        province: 'Haut-Ogooué',
        city: 'Franceville',
        district: 'Banlieue',
        arrondissement: '2ème Arrondissement',
        additionalInfo: 'Avenue de l\'Indépendance'
      },
      companyName: 'MiningCorp',
      profession: 'Ingénieur',
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

/**
 * Crée un utilisateur de test avec des données d'adresse et professionnelles pour tester les filtres
 */
export async function createTestUserWithAddressAndProfession() {
     try {
     const userId = `test_user_filters_${Date.now()}`
     
     const userData: Omit<User, 'id'> = {
       matricule: await generateMatricule(),
      lastName: 'TestFiltres',
      firstName: 'Utilisateur',
      birthDate: '1988-08-15',
      contacts: ['+33612345681'],
      gender: 'Femme',
      email: 'test.filtres@kara.com',
      nationality: 'Gabonaise',
      hasCar: false,
      address: {
        province: 'Moyen-Ogooué',
        city: 'Lambaréné',
        district: 'Quartier Médical',
        arrondissement: '3ème Arrondissement',
        additionalInfo: 'Boulevard Albert Schweitzer'
      },
      companyName: 'HospitalCorp',
      profession: 'Médecin',
      photoURL: null,
      photoPath: null,
      subscriptions: [],
      dossier: 'test_dossier_filtres_id',
      membershipType: 'bienfaiteur' as MembershipType,
      roles: ['Bienfaiteur'],
      createdAt: new Date(),
      updatedAt: new Date(),
      isActive: true
    }
    
    await setDoc(doc(db, 'users', userId), userData)
    console.log(`✅ Created test user with address and profession: ${userId}`)
    
    console.log(`🎉 Test user with filters data created successfully:`)
    console.log(`   User ID: ${userId}`)
    console.log(`   Address: ${userData.address?.province} > ${userData.address?.city} > ${userData.address?.arrondissement} > ${userData.address?.district}`)
    console.log(`   Company: ${userData.companyName}`)
    console.log(`   Profession: ${userData.profession}`)
    
    return {
      userId,
      userData
    }
  } catch (error) {
    console.error('❌ Error creating test user with filters data:', error)
    throw error
  }
}

/**
 * Crée une demande d'adhésion de test avec statut "En attente"
 */
export async function createTestMembershipRequestPending() {
     try {
     const requestId = `test_request_pending_${Date.now()}`
     
     const requestData: Omit<import('@/types/types').MembershipRequest, 'id'> = {
       matricule: await generateMatricule(),
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
      identity: {
        civility: 'Monsieur',
        lastName: 'TestDemande',
        firstName: 'EnAttente',
        birthDate: '1995-06-15',
        birthPlace: 'Libreville',
        birthCertificateNumber: 'ACT-1995-001',
        prayerPlace: 'Mosquée Centrale',
        religion: 'Islam',
        contacts: ['+241 074 77 34 00'],
        email: 'test.pending@kara.com',
        gender: 'Homme',
        nationality: 'Gabonaise',
        maritalStatus: 'Célibataire',
        hasCar: true,
        photo: `https://ui-avatars.com/api/?name=TestDemande+EnAttente&background=234D65&color=fff&size=200&font-size=0.4`,
        photoURL: `https://ui-avatars.com/api/?name=TestDemande+EnAttente&background=234D65&color=fff&size=200&font-size=0.4`,
        photoPath: null
      },
      address: {
        province: 'Estuaire',
        city: 'Libreville',
        district: 'Centre-ville',
        arrondissement: '1er Arrondissement',
        additionalInfo: 'Rue de la Paix, N°123'
      },
      company: {
        isEmployed: true,
        companyName: 'TechCorp Gabon',
        companyAddress: {
          province: 'Estuaire',
          city: 'Libreville',
          district: 'Zone Industrielle'
        },
        profession: 'Développeur Full-Stack',
        seniority: '5 ans'
      },
      documents: {
        identityDocument: 'CNI',
        identityDocumentNumber: 'CNI-123456789',
        expirationDate: '2030-12-31',
        issuingPlace: 'Libreville',
        issuingDate: '2020-01-15',
        documentPhotoFront: `https://ui-avatars.com/api/?name=CNI+Front&background=1F2937&color=fff&size=300&font-size=0.3`,
        documentPhotoBack: `https://ui-avatars.com/api/?name=CNI+Back&background=374151&color=fff&size=300&font-size=0.3`,
        documentPhotoFrontURL: `https://ui-avatars.com/api/?name=CNI+Front&background=1F2937&color=fff&size=300&font-size=0.3`,
        documentPhotoFrontPath: null,
        documentPhotoBackURL: `https://ui-avatars.com/api/?name=CNI+Back&background=374151&color=fff&size=300&font-size=0.3`,
        documentPhotoBackPath: null
      },
      isPaid: true,
      payments: [{
        date: new Date(),
        mode: 'airtel_money',
        amount: 25000,
        acceptedBy: 'admin_test',
        paymentType: 'Membership',
        time: '14:30',
        withFees: false
      }],
      priorityScore: 85
    }
    
    await setDoc(doc(db, 'membership-requests', requestId), requestData)
    console.log(`✅ Created test membership request (pending): ${requestId}`)
    
    console.log(`🎉 Test membership request created successfully:`)
    console.log(`   Request ID: ${requestId}`)
    console.log(`   Status: ${requestData.status}`)
    console.log(`   Applicant: ${requestData.identity.firstName} ${requestData.identity.lastName}`)
    console.log(`   Payment: ${requestData.isPaid ? 'Paid' : 'Not paid'}`)
    
    return {
      requestId,
      requestData
    }
  } catch (error) {
    console.error('❌ Error creating test membership request:', error)
    throw error
  }
}

/**
 * Crée une demande d'adhésion de test avec statut "En cours d'examen"
 */
export async function createTestMembershipRequestUnderReview() {
     try {
     const requestId = `test_request_review_${Date.now()}`
     
     const requestData: Omit<import('@/types/types').MembershipRequest, 'id'> = {
       matricule: await generateMatricule(),
      status: 'under_review',
      createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Créé il y a 7 jours
      updatedAt: new Date(),
      processedBy: 'admin_test',
      reviewNote: 'Photo de pièce d\'identité trop floue. Veuillez fournir une photo plus nette.',
      securityCode: 'ABC123',
      securityCodeExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000), // Expire dans 24h
      securityCodeUsed: false,
      identity: {
        civility: 'Madame',
        lastName: 'TestDemande',
        firstName: 'EnExamen',
        birthDate: '1988-03-22',
        birthPlace: 'Port-Gentil',
        birthCertificateNumber: 'ACT-1988-045',
        prayerPlace: 'Église Saint-Michel',
        religion: 'Christianisme',
        contacts: ['+241 074 77 34 01'],
        email: 'test.review@kara.com',
        gender: 'Femme',
        nationality: 'Gabonaise',
        maritalStatus: 'Marié(e)',
        spouseLastName: 'TestDemande',
        spouseFirstName: 'Conjoint',
        spousePhone: '+241 074 77 34 02',
        hasCar: false,
        photo: `https://ui-avatars.com/api/?name=TestDemande+EnExamen&background=3B82F6&color=fff&size=200&font-size=0.4`,
        photoURL: `https://ui-avatars.com/api/?name=TestDemande+EnExamen&background=3B82F6&color=fff&size=200&font-size=0.4`,
        photoPath: null
      },
      address: {
        province: 'Ogooué-Maritime',
        city: 'Port-Gentil',
        district: 'Quartier Résidentiel',
        arrondissement: '2ème Arrondissement',
        additionalInfo: 'Avenue de la Mer, Villa 45'
      },
      company: {
        isEmployed: true,
        companyName: 'OilCorp Gabon',
        companyAddress: {
          province: 'Ogooué-Maritime',
          city: 'Port-Gentil',
          district: 'Zone Pétrolière'
        },
        profession: 'Ingénieur Pétrolier',
        seniority: '8 ans'
      },
      documents: {
        identityDocument: 'Passeport',
        identityDocumentNumber: 'PASS-987654321',
        expirationDate: '2028-06-15',
        issuingPlace: 'Port-Gentil',
        issuingDate: '2018-06-15',
        documentPhotoFront: `https://ui-avatars.com/api/?name=Passeport+Front&background=1E40AF&color=fff&size=300&font-size=0.3`,
        documentPhotoBack: `https://ui-avatars.com/api/?name=Passeport+Back&background=2563EB&color=fff&size=300&font-size=0.3`,
        documentPhotoFrontURL: `https://ui-avatars.com/api/?name=Passeport+Front&background=1E40AF&color=fff&size=300&font-size=0.3`,
        documentPhotoFrontPath: null,
        documentPhotoBackURL: `https://ui-avatars.com/api/?name=Passeport+Back&background=2563EB&color=fff&size=300&font-size=0.3`,
        documentPhotoBackPath: null
      },
      isPaid: true,
      payments: [{
        date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        mode: 'mobicash',
        amount: 25000,
        acceptedBy: 'admin_test',
        paymentType: 'Membership',
        time: '10:15',
        withFees: true
      }],
      priorityScore: 72
    }
    
    await setDoc(doc(db, 'membership-requests', requestId), requestData)
    console.log(`✅ Created test membership request (under review): ${requestId}`)
    
    console.log(`🎉 Test membership request under review created successfully:`)
    console.log(`   Request ID: ${requestId}`)
    console.log(`   Status: ${requestData.status}`)
    console.log(`   Applicant: ${requestData.identity.firstName} ${requestData.identity.lastName}`)
    console.log(`   Review Note: ${requestData.reviewNote}`)
    console.log(`   Security Code: ${requestData.securityCode}`)
    
    return {
      requestId,
      requestData
    }
  } catch (error) {
    console.error('❌ Error creating test membership request under review:', error)
    throw error
  }
}

/**
 * Crée une demande d'adhésion de test avec statut "Rejetée"
 */
export async function createTestMembershipRequestRejected() {
     try {
     const requestId = `test_request_rejected_${Date.now()}`
     
     const requestData: Omit<import('@/types/types').MembershipRequest, 'id'> = {
       matricule: await generateMatricule(),
      status: 'rejected',
      createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000), // Créé il y a 14 jours
      updatedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Traité il y a 7 jours
      processedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      processedBy: 'admin_test',
      motifReject: 'Documents d\'identité expirés et informations professionnelles incomplètes.',
      identity: {
        civility: 'Monsieur',
        lastName: 'TestDemande',
        firstName: 'Rejeté',
        birthDate: '1990-11-08',
        birthPlace: 'Franceville',
        birthCertificateNumber: 'ACT-1990-078',
        prayerPlace: 'Temple Protestant',
        religion: 'Protestantisme',
        contacts: ['+241 074 77 34 03'],
        email: 'test.rejected@kara.com',
        gender: 'Homme',
        nationality: 'Gabonaise',
        maritalStatus: 'Célibataire',
        hasCar: true,
        photo: `https://ui-avatars.com/api/?name=TestDemande+Rejeté&background=EF4444&color=fff&size=200&font-size=0.4`,
        photoURL: `https://ui-avatars.com/api/?name=TestDemande+Rejeté&background=EF4444&color=fff&size=200&font-size=0.4`,
        photoPath: null
      },
      address: {
        province: 'Haut-Ogooué',
        city: 'Franceville',
        district: 'Quartier Universitaire',
        arrondissement: '1er Arrondissement',
        additionalInfo: 'Campus Universitaire, Bâtiment A'
      },
      company: {
        isEmployed: false
      },
      documents: {
        identityDocument: 'CNI',
        identityDocumentNumber: 'CNI-456789123',
        expirationDate: '2020-05-20', // Expiré
        issuingPlace: 'Franceville',
        issuingDate: '2015-05-20',
        documentPhotoFront: `https://ui-avatars.com/api/?name=CNI+Expiré+Front&background=DC2626&color=fff&size=300&font-size=0.25`,
        documentPhotoBack: `https://ui-avatars.com/api/?name=CNI+Expiré+Back&background=EF4444&color=fff&size=300&font-size=0.25`,
        documentPhotoFrontURL: `https://ui-avatars.com/api/?name=CNI+Expiré+Front&background=DC2626&color=fff&size=300&font-size=0.25`,
        documentPhotoFrontPath: null,
        documentPhotoBackURL: `https://ui-avatars.com/api/?name=CNI+Expiré+Back&background=EF4444&color=fff&size=300&font-size=0.25`,
        documentPhotoBackPath: null
      },
      isPaid: false,
      payments: [],
      priorityScore: 30
    }
    
    await setDoc(doc(db, 'membership-requests', requestId), requestData)
    console.log(`✅ Created test membership request (rejected): ${requestId}`)
    
    console.log(`🎉 Test membership request rejected created successfully:`)
    console.log(`   Request ID: ${requestId}`)
    console.log(`   Status: ${requestData.status}`)
    console.log(`   Applicant: ${requestData.identity.firstName} ${requestData.identity.lastName}`)
    console.log(`   Rejection Reason: ${requestData.motifReject}`)
    console.log(`   Payment: ${requestData.isPaid ? 'Paid' : 'Not paid'}`)
    
    return {
      requestId,
      requestData
    }
  } catch (error) {
    console.error('❌ Error creating test membership request rejected:', error)
    throw error
  }
}

/**
 * Crée une demande d'adhésion de test avec statut "Approuvée"
 */
export async function createTestMembershipRequestApproved() {
     try {
     const requestId = `test_request_approved_${Date.now()}`
     
     const requestData: Omit<import('@/types/types').MembershipRequest, 'id'> = {
       matricule: await generateMatricule(),
      status: 'approved',
      createdAt: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000), // Créé il y a 21 jours
      updatedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000), // Approuvé il y a 14 jours
      processedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
      processedBy: 'admin_test',
      memberNumber: `MEM${String(Math.floor(Math.random() * 9999)).padStart(4, '0')}`,
      identity: {
        civility: 'Mademoiselle',
        lastName: 'TestDemande',
        firstName: 'Approuvée',
        birthDate: '1993-09-14',
        birthPlace: 'Lambaréné',
        birthCertificateNumber: 'ACT-1993-156',
        prayerPlace: 'Église Catholique',
        religion: 'Catholicisme',
        contacts: ['+241 074 77 34 04'],
        email: 'test.approved@kara.com',
        gender: 'Femme',
        nationality: 'Gabonaise',
        maritalStatus: 'Célibataire',
        hasCar: false,
        photo: `https://ui-avatars.com/api/?name=TestDemande+Approuvée&background=10B981&color=fff&size=200&font-size=0.4`,
        photoURL: `https://ui-avatars.com/api/?name=TestDemande+Approuvée&background=10B981&color=fff&size=200&font-size=0.4`,
        photoPath: null
      },
      address: {
        province: 'Moyen-Ogooué',
        city: 'Lambaréné',
        district: 'Quartier Médical',
        arrondissement: '1er Arrondissement',
        additionalInfo: 'Hôpital Albert Schweitzer, Résidence Médecins'
      },
      company: {
        isEmployed: true,
        companyName: 'Hôpital Albert Schweitzer',
        companyAddress: {
          province: 'Moyen-Ogooué',
          city: 'Lambaréné',
          district: 'Quartier Médical'
        },
        profession: 'Médecin Généraliste',
        seniority: '3 ans'
      },
      documents: {
        identityDocument: 'Passeport',
        identityDocumentNumber: 'PASS-789123456',
        expirationDate: '2032-08-10',
        issuingPlace: 'Lambaréné',
        issuingDate: '2022-08-10',
        documentPhotoFront: `https://ui-avatars.com/api/?name=Passeport+Valide+Front&background=059669&color=fff&size=300&font-size=0.25`,
        documentPhotoBack: `https://ui-avatars.com/api/?name=Passeport+Valide+Back&background=10B981&color=fff&size=300&font-size=0.25`,
        documentPhotoFrontURL: `https://ui-avatars.com/api/?name=Passeport+Valide+Front&background=059669&color=fff&size=300&font-size=0.25`,
        documentPhotoFrontPath: null,
        documentPhotoBackURL: `https://ui-avatars.com/api/?name=Passeport+Valide+Back&background=10B981&color=fff&size=300&font-size=0.25`,
        documentPhotoBackPath: null
      },
      isPaid: true,
      payments: [{
        date: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000),
        mode: 'airtel_money',
        amount: 25000,
        acceptedBy: 'admin_test',
        paymentType: 'Membership',
        time: '16:45',
        withFees: false
      }],
      priorityScore: 95
    }
    
    await setDoc(doc(db, 'membership-requests', requestId), requestData)
    console.log(`✅ Created test membership request (approved): ${requestId}`)
    
    console.log(`🎉 Test membership request approved created successfully:`)
    console.log(`   Request ID: ${requestId}`)
    console.log(`   Status: ${requestData.status}`)
    console.log(`   Applicant: ${requestData.identity.firstName} ${requestData.identity.lastName}`)
    console.log(`   Member Number: ${requestData.memberNumber}`)
    console.log(`   Payment: ${requestData.isPaid ? 'Paid' : 'Not paid'}`)
    
    return {
      requestId,
      requestData
    }
  } catch (error) {
    console.error('❌ Error creating test membership request approved:', error)
    throw error
  }
}

/**
 * Crée une demande d'adhésion de test avec des données complètes pour tester les filtres
 */
export async function createTestMembershipRequestWithFilters() {
     try {
     const requestId = `test_request_filters_${Date.now()}`
     
     const requestData: Omit<import('@/types/types').MembershipRequest, 'id'> = {
       matricule: await generateMatricule(),
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
      identity: {
        civility: 'Monsieur',
        lastName: 'TestFiltres',
        firstName: 'Demande',
        birthDate: '1985-12-03',
        birthPlace: 'Tchibanga',
        birthCertificateNumber: 'ACT-1985-234',
        prayerPlace: 'Mosquée Al-Habib',
        religion: 'Islam',
        contacts: ['+241 074 77 34 05'],
        email: 'test.filtres@kara.com',
        gender: 'Homme',
        nationality: 'Gabonaise',
        maritalStatus: 'Marié(e)',
        spouseLastName: 'TestFiltres',
        spouseFirstName: 'Épouse',
        spousePhone: '+241 074 77 34 06',
        hasCar: true,
        photo: `https://ui-avatars.com/api/?name=TestFiltres+Demande&background=8B5CF6&color=fff&size=200&font-size=0.4`,
        photoURL: `https://ui-avatars.com/api/?name=TestFiltres+Demande&background=8B5CF6&color=fff&size=200&font-size=0.4`,
        photoPath: null
      },
      address: {
        province: 'Nyanga',
        city: 'Tchibanga',
        district: 'Quartier Commercial',
        arrondissement: '2ème Arrondissement',
        additionalInfo: 'Rue du Marché, Boutique 12'
      },
      company: {
        isEmployed: true,
        companyName: 'Commerce Traditionnel',
        companyAddress: {
          province: 'Nyanga',
          city: 'Tchibanga',
          district: 'Centre Commercial'
        },
        profession: 'Commerçant',
        seniority: '15 ans'
      },
      documents: {
        identityDocument: 'CNI',
        identityDocumentNumber: 'CNI-321654987',
        expirationDate: '2030-03-15',
        issuingPlace: 'Tchibanga',
        issuingDate: '2020-03-15',
        documentPhotoFront: `https://ui-avatars.com/api/?name=CNI+Filtres+Front&background=7C3AED&color=fff&size=300&font-size=0.25`,
        documentPhotoBack: `https://ui-avatars.com/api/?name=CNI+Filtres+Back&background=8B5CF6&color=fff&size=300&font-size=0.25`,
        documentPhotoFrontURL: `https://ui-avatars.com/api/?name=CNI+Filtres+Front&background=7C3AED&color=fff&size=300&font-size=0.25`,
        documentPhotoFrontPath: null,
        documentPhotoBackURL: `https://ui-avatars.com/api/?name=CNI+Filtres+Back&background=8B5CF6&color=fff&size=300&font-size=0.25`,
        documentPhotoBackPath: null
      },
      isPaid: false,
      payments: [],
      priorityScore: 60
    }
    
    await setDoc(doc(db, 'membership-requests', requestId), requestData)
    console.log(`✅ Created test membership request with filters: ${requestId}`)
    
    console.log(`🎉 Test membership request with filters created successfully:`)
    console.log(`   Request ID: ${requestId}`)
    console.log(`   Status: ${requestData.status}`)
    console.log(`   Applicant: ${requestData.identity.firstName} ${requestData.identity.lastName}`)
    console.log(`   Address: ${requestData.address.province} > ${requestData.address.city} > ${requestData.address.district}`)
    console.log(`   Company: ${requestData.company.companyName}`)
    console.log(`   Profession: ${requestData.company.profession}`)
    console.log(`   Has Car: ${requestData.identity.hasCar}`)
    
    return {
      requestId,
      requestData
    }
  } catch (error) {
    console.error('❌ Error creating test membership request with filters:', error)
    throw error
  }
}

/**
 * Crée une demande d'adhésion de test avec statut "En attente" mais non payée
 */
export async function createTestMembershipRequestPendingUnpaid() {
     try {
     const requestId = `test_request_pending_unpaid_${Date.now()}`
     
     const requestData: Omit<import('@/types/types').MembershipRequest, 'id'> = {
       matricule: await generateMatricule(),
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
      identity: {
        civility: 'Mademoiselle',
        lastName: 'TestDemande',
        firstName: 'NonPayée',
        birthDate: '1997-04-18',
        birthPlace: 'Oyem',
        birthCertificateNumber: 'ACT-1997-089',
        prayerPlace: 'Église Évangélique',
        religion: 'Évangélisme',
        contacts: ['+241 074 77 34 07'],
        email: 'test.unpaid@kara.com',
        gender: 'Femme',
        nationality: 'Gabonaise',
        maritalStatus: 'Célibataire',
        hasCar: false,
        photo: `https://ui-avatars.com/api/?name=TestDemande+NonPayée&background=F59E0B&color=fff&size=200&font-size=0.4&length=2`,
        photoURL: `https://ui-avatars.com/api/?name=TestDemande+NonPayée&background=F59E0B&color=fff&size=200&font-size=0.4&length=2`,
        photoPath: null
      },
      address: {
        province: 'Woleu-Ntem',
        city: 'Oyem',
        district: 'Quartier Étudiant',
        arrondissement: '1er Arrondissement',
        additionalInfo: 'Campus Universitaire, Résidence B'
      },
      company: {
        isEmployed: false
      },
      documents: {
        identityDocument: 'CNI',
        identityDocumentNumber: 'CNI-147258369',
        expirationDate: '2029-11-30',
        issuingPlace: 'Oyem',
        issuingDate: '2019-11-30',
        documentPhotoFront: `https://ui-avatars.com/api/?name=CNI+NonPayée+Front&background=D97706&color=fff&size=300&font-size=0.25&length=2`,
        documentPhotoBack: `https://ui-avatars.com/api/?name=CNI+NonPayée+Back&background=F59E0B&color=fff&size=300&font-size=0.25&length=2`,
        documentPhotoFrontURL: `https://ui-avatars.com/api/?name=CNI+NonPayée+Front&background=D97706&color=fff&size=300&font-size=0.25&length=2`,
        documentPhotoFrontPath: null,
        documentPhotoBackURL: `https://ui-avatars.com/api/?name=CNI+NonPayée+Back&background=F59E0B&color=fff&size=300&font-size=0.25&length=2`,
        documentPhotoBackPath: null
      },
      isPaid: false,
      payments: [], // Aucun paiement
      priorityScore: 45
    }
    
    await setDoc(doc(db, 'membership-requests', requestId), requestData)
    console.log(`✅ Created test membership request (pending unpaid): ${requestId}`)
    
    console.log(`🎉 Test membership request pending unpaid created successfully:`)
    console.log(`   Request ID: ${requestId}`)
    console.log(`   Status: ${requestData.status}`)
    console.log(`   Applicant: ${requestData.identity.firstName} ${requestData.identity.lastName}`)
    console.log(`   Payment: ${requestData.isPaid ? 'Paid' : 'Not paid'}`)
    console.log(`   Priority Score: ${requestData.priorityScore}`)
    
    return {
      requestId,
      requestData
    }
  } catch (error) {
    console.error('❌ Error creating test membership request pending unpaid:', error)
    throw error
  }
}