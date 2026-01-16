/**
 * Script pour créer un utilisateur admin dans la base de données de développement
 * 
 * Usage: npx tsx scripts/create-dev-admin-user.ts
 * 
 * Ce script crée un utilisateur admin avec :
 * - Matricule: 0001.MK.110126
 * - Email: glenneriss@gmail.com
 * - Mot de passe: 0001.MK.110126
 * - Rôle: Admin
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import * as path from 'path';
import * as fs from 'fs';

// Configuration Firebase Admin
const initializeFirebaseAdmin = () => {
  // Vérifier si Firebase Admin est déjà initialisé
  if (getApps().length > 0) {
    return getApps()[0];
  }

  // Charger les credentials depuis les variables d'environnement ou le fichier service account
  // Option 1: Variables d'environnement (prioritaire)
  if (process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PROJECT_ID) {
    const serviceAccount = {
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    };
    return initializeApp({
      credential: cert(serviceAccount),
      projectId: serviceAccount.projectId,
    });
  }

  // Option 2: Fichier service account
  const serviceAccountsDir = path.join(process.cwd(), 'service-accounts');
  if (!fs.existsSync(serviceAccountsDir)) {
    throw new Error('Dossier service-accounts/ non trouvé. Veuillez configurer les variables d\'environnement ou placer le fichier service account dans service-accounts/');
  }

  const files = fs.readdirSync(serviceAccountsDir);
  const devServiceAccountFile = files.find(f => f.includes('kara-gabon-dev') && f.endsWith('.json'));

  if (!devServiceAccountFile) {
    throw new Error('Fichier service account dev non trouvé dans service-accounts/. Cherchez un fichier contenant "kara-gabon-dev"');
  }

  const serviceAccountPath = path.join(serviceAccountsDir, devServiceAccountFile);
  const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

  return initializeApp({
    credential: cert(serviceAccount),
    projectId: serviceAccount.project_id,
  });
};

const createAdminUser = async () => {
  try {
    console.log('🚀 Initialisation de Firebase Admin...');
    initializeFirebaseAdmin();

    const auth = getAuth();
    const firestore = getFirestore();

    const matricule = '0001.MK.110126';
    const email = 'glenneriss@gmail.com';
    const password = '0001.MK.110126';
    const role = 'Admin';

    console.log(`\n📋 Création de l'utilisateur admin:`);
    console.log(`   Matricule: ${matricule}`);
    console.log(`   Email: ${email}`);
    console.log(`   Rôle: ${role}`);

    // Vérifier si l'utilisateur existe déjà
    let userRecord;
    try {
      userRecord = await auth.getUserByEmail(email);
      console.log(`\n⚠️  L'utilisateur avec l'email ${email} existe déjà (UID: ${userRecord.uid})`);
      console.log('   Mise à jour de l\'utilisateur...');
      
      // Mettre à jour l'utilisateur existant
      await auth.updateUser(userRecord.uid, {
        email,
        password,
        displayName: 'Admin KARA',
        disabled: false,
      });
      
      userRecord = await auth.getUser(userRecord.uid);
    } catch (error: any) {
      if (error.code === 'auth/user-not-found') {
        // Créer l'utilisateur
        console.log('\n✨ Création du nouvel utilisateur...');
        userRecord = await auth.createUser({
          uid: matricule,
          email,
          password,
          displayName: 'Admin KARA',
          disabled: false,
        });
        console.log(`✅ Utilisateur créé avec succès (UID: ${userRecord.uid})`);
      } else {
        throw error;
      }
    }

    // Définir les custom claims (rôle admin)
    console.log(`\n🔐 Définition des custom claims (rôle: ${role})...`);
    await auth.setCustomUserClaims(userRecord.uid, {
      role: role,
    });
    console.log('✅ Custom claims définis avec succès');

    // Créer ou mettre à jour le document dans Firestore
    // Note: Chaque environnement utilise sa propre base de données Firebase,
    // donc on utilise toujours "users" comme nom de collection
    console.log(`\n📝 Création/mise à jour du document dans Firestore...`);
    
    const usersCollection = "users";
    
    console.log(`   Collection Firestore: ${usersCollection}`);
    
    const userDocRef = firestore.collection(usersCollection).doc(matricule);
    
    const userData = {
      id: matricule,
      matricule: matricule,
      lastName: 'KARA',
      firstName: 'Admin',
      email: email,
      birthDate: '1990-01-01', // Date de naissance requise
      contacts: [], // Contacts (tableau de strings)
      gender: 'other',
      nationality: 'GA',
      hasCar: false,
      subscriptions: [], // Abonnements (tableau)
      dossier: `dossier-${matricule}`, // Dossier
      membershipType: 'adherant' as const, // Type d'adhésion (en minuscules)
      roles: [role], // Rôles (tableau)
      isActive: true,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };
    
    console.log(`   Données utilisateur à créer:`, {
      id: userData.id,
      matricule: userData.matricule,
      email: userData.email,
      roles: userData.roles,
      membershipType: userData.membershipType,
    });

    await userDocRef.set(userData, { merge: true });
    console.log(`✅ Document Firestore créé/mis à jour dans la collection ${usersCollection}`);

    console.log(`\n🎉 Utilisateur admin créé avec succès !`);
    console.log(`\n📊 Résumé:`);
    console.log(`   UID: ${userRecord.uid}`);
    console.log(`   Matricule: ${matricule}`);
    console.log(`   Email: ${email}`);
    console.log(`   Rôle: ${role}`);
    console.log(`   Collection Firestore: ${usersCollection}`);
    console.log(`\n🔑 Vous pouvez maintenant vous connecter avec:`);
    console.log(`   Email: ${email}`);
    console.log(`   Mot de passe: ${password}`);

  } catch (error: any) {
    console.error('\n❌ Erreur lors de la création de l\'utilisateur:', error);
    if (error.code) {
      console.error(`   Code d'erreur: ${error.code}`);
    }
    if (error.message) {
      console.error(`   Message: ${error.message}`);
    }
    process.exit(1);
  }
};

// Exécuter le script
createAdminUser()
  .then(() => {
    console.log('\n✅ Script terminé avec succès');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Erreur fatale:', error);
    process.exit(1);
  });
