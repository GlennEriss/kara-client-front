/**
 * Script pour vérifier l'existence d'un utilisateur dans Firebase
 * 
 * Usage: npx tsx scripts/check-user-exists.ts <matricule>
 * Exemple: npx tsx scripts/check-user-exists.ts 7748.MK.011025
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
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
    console.log(`📋 Utilisation des variables d'environnement pour le projet: ${serviceAccount.projectId}`);
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
  // Chercher le fichier de production (kara-gabon sans dev/preprod)
  const prodServiceAccountFile = files.find(f => 
    f.includes('kara-gabon') && 
    !f.includes('dev') && 
    !f.includes('preprod') && 
    f.endsWith('.json')
  );

  if (!prodServiceAccountFile) {
    throw new Error('Fichier service account production non trouvé dans service-accounts/. Cherchez un fichier contenant "kara-gabon" (sans dev/preprod)');
  }

  const serviceAccountPath = path.join(serviceAccountsDir, prodServiceAccountFile);
  const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

  console.log(`📋 Utilisation du fichier service account: ${prodServiceAccountFile}`);
  console.log(`📋 Projet: ${serviceAccount.project_id}`);

  return initializeApp({
    credential: cert(serviceAccount),
    projectId: serviceAccount.project_id,
  });
};

const checkUserExists = async (matricule: string) => {
  try {
    const app = initializeFirebaseAdmin();
    const auth = getAuth(app);
    const firestore = getFirestore(app);

    console.log(`\n🔍 Recherche de l'utilisateur: ${matricule}\n`);

    const results = {
      found: false,
      inAuth: false,
      inUsers: false,
      inAdmins: false,
      details: {} as any,
    };

    // 1) Vérifier dans Firebase Auth
    try {
      console.log('1️⃣ Vérification Firebase Auth...');
      const userRecord = await auth.getUser(matricule);
      console.log('   ✅ Utilisateur trouvé dans Firebase Auth');
      console.log('   📧 Email:', userRecord.email);
      console.log('   📱 Phone:', userRecord.phoneNumber || 'N/A');
      console.log('   🚫 Disabled:', userRecord.disabled);
      results.inAuth = true;
      results.found = true;
      results.details.auth = {
        email: userRecord.email,
        phoneNumber: userRecord.phoneNumber,
        disabled: userRecord.disabled,
        metadata: {
          creationTime: userRecord.metadata.creationTime,
          lastSignInTime: userRecord.metadata.lastSignInTime,
        },
      };
    } catch (err: any) {
      if (err?.code === 'auth/user-not-found') {
        console.log('   ❌ Utilisateur non trouvé dans Firebase Auth');
      } else {
        console.error('   ⚠️ Erreur Firebase Auth:', err.message);
      }
    }

    // 2) Vérifier dans Firestore collection 'users'
    try {
      console.log('\n2️⃣ Vérification Firestore collection "users"...');
      const userDoc = await firestore.collection('users').doc(matricule).get();
      if (userDoc.exists) {
        console.log('   ✅ Utilisateur trouvé dans Firestore "users"');
        const data = userDoc.data();
        console.log('   📝 Données:', {
          firstName: data?.firstName,
          lastName: data?.lastName,
          email: data?.email,
          role: data?.role,
        });
        results.inUsers = true;
        results.found = true;
        results.details.users = data;
      } else {
        console.log('   ❌ Document non trouvé dans Firestore "users"');
      }
    } catch (err: any) {
      console.error('   ⚠️ Erreur Firestore users:', err.message);
    }

    // 3) Vérifier dans Firestore collection 'admins'
    try {
      console.log('\n3️⃣ Vérification Firestore collection "admins"...');
      const adminDoc = await firestore.collection('admins').doc(matricule).get();
      if (adminDoc.exists) {
        console.log('   ✅ Utilisateur trouvé dans Firestore "admins"');
        const data = adminDoc.data();
        console.log('   📝 Données:', {
          firstName: data?.firstName,
          lastName: data?.lastName,
          email: data?.email,
          role: data?.role,
        });
        results.inAdmins = true;
        results.found = true;
        results.details.admins = data;
      } else {
        console.log('   ❌ Document non trouvé dans Firestore "admins"');
      }
    } catch (err: any) {
      console.error('   ⚠️ Erreur Firestore admins:', err.message);
    }

    // Résumé
    console.log('\n📊 Résumé:');
    console.log('   Trouvé:', results.found ? '✅ OUI' : '❌ NON');
    console.log('   Dans Firebase Auth:', results.inAuth ? '✅' : '❌');
    console.log('   Dans Firestore users:', results.inUsers ? '✅' : '❌');
    console.log('   Dans Firestore admins:', results.inAdmins ? '✅' : '❌');

    if (!results.found) {
      console.log('\n⚠️ L\'utilisateur n\'existe dans aucune source.');
      console.log('💡 Solutions possibles:');
      console.log('   1. Créer l\'utilisateur dans Firebase Auth avec cet UID');
      console.log('   2. Créer l\'utilisateur dans Firestore collection "users" ou "admins"');
      console.log('   3. Vérifier que le matricule est correct');
      console.log('   4. Vérifier que vous êtes connecté au bon projet Firebase');
    }

    return results;
  } catch (error: any) {
    console.error('❌ Erreur:', error.message);
    process.exit(1);
  }
};

// Main
const matricule = process.argv[2];
if (!matricule) {
  console.error('❌ Usage: npx tsx scripts/check-user-exists.ts <matricule>');
  console.error('   Exemple: npx tsx scripts/check-user-exists.ts 7748.MK.011025');
  process.exit(1);
}

checkUserExists(matricule)
  .then(() => {
    console.log('\n✅ Vérification terminée');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Erreur:', error);
    process.exit(1);
  });
