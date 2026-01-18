/**
 * Script pour créer un utilisateur dans la base de données de production
 * 
 * Usage: npx tsx scripts/create-prod-user.ts <matricule> <email> <password> [firstName] [lastName] [role]
 * Exemple: npx tsx scripts/create-prod-user.ts 7748.MK.011025 glenneriss@gmail.com MonMotDePasse123 "Glen" "Neriss" "Admin"
 * 
 * ⚠️ ATTENTION : Ce script crée l'utilisateur dans la base de données de PRODUCTION
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

const createUser = async (
  matricule: string,
  email: string,
  password: string,
  firstName: string = 'Admin',
  lastName: string = 'User',
  role: string = 'Admin'
) => {
  try {
    const app = initializeFirebaseAdmin();
    const auth = getAuth(app);
    const firestore = getFirestore(app);

    console.log(`\n🔧 Création de l'utilisateur: ${matricule}\n`);

    // 1) Vérifier si l'utilisateur existe déjà
    let userRecord;
    try {
      userRecord = await auth.getUser(matricule);
      console.log('⚠️ Utilisateur existe déjà dans Firebase Auth');
      console.log('   Email:', userRecord.email);
    } catch (err: any) {
      if (err?.code === 'auth/user-not-found') {
        // Créer l'utilisateur dans Firebase Auth
        console.log('1️⃣ Création dans Firebase Auth...');
        userRecord = await auth.createUser({
          uid: matricule,
          email: email,
          password: password,
          emailVerified: false,
          disabled: false,
        });
        console.log('   ✅ Utilisateur créé dans Firebase Auth');
        console.log('   📧 Email:', userRecord.email);
        console.log('   🆔 UID:', userRecord.uid);
      } else {
        throw err;
      }
    }

    // 2) Vérifier si l'utilisateur existe dans Firestore 'users'
    const userDoc = await firestore.collection('users').doc(matricule).get();
    if (userDoc.exists) {
      console.log('⚠️ Utilisateur existe déjà dans Firestore "users"');
      const existingData = userDoc.data();
      console.log('   Données existantes:', {
        firstName: existingData?.firstName,
        lastName: existingData?.lastName,
        email: existingData?.email,
        role: existingData?.role,
      });
    } else {
      // Créer l'utilisateur dans Firestore 'users'
      console.log('\n2️⃣ Création dans Firestore collection "users"...');
      await firestore.collection('users').doc(matricule).set({
        matricule: matricule,
        firstName: firstName,
        lastName: lastName,
        email: email,
        role: role,
        isActive: true,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
      console.log('   ✅ Utilisateur créé dans Firestore "users"');
    }

    // 3) Définir les custom claims (rôle)
    console.log('\n3️⃣ Définition des custom claims (rôle)...');
    await auth.setCustomUserClaims(matricule, {
      role: role,
    });
    console.log('   ✅ Custom claims définis:', { role });

    console.log('\n✅ Utilisateur créé avec succès !');
    console.log('\n📊 Résumé:');
    console.log('   Matricule:', matricule);
    console.log('   Email:', email);
    console.log('   Nom:', `${firstName} ${lastName}`);
    console.log('   Rôle:', role);
    console.log('\n💡 Vous pouvez maintenant vous connecter avec:');
    console.log('   Matricule:', matricule);
    console.log('   Email:', email);
    console.log('   Password:', password);

  } catch (error: any) {
    console.error('❌ Erreur lors de la création:', error.message);
    if (error.code) {
      console.error('   Code:', error.code);
    }
    process.exit(1);
  }
};

// Main
const args = process.argv.slice(2);
if (args.length < 3) {
  console.error('❌ Usage: npx tsx scripts/create-prod-user.ts <matricule> <email> <password> [firstName] [lastName] [role]');
  console.error('   Exemple: npx tsx scripts/create-prod-user.ts 7748.MK.011025 glenneriss@gmail.com MonMotDePasse123 "Glen" "Neriss" "Admin"');
  process.exit(1);
}

const [matricule, email, password, firstName = 'Admin', lastName = 'User', role = 'Admin'] = args;

// Confirmation
console.log('⚠️  ATTENTION : Vous allez créer un utilisateur en PRODUCTION');
console.log('   Matricule:', matricule);
console.log('   Email:', email);
console.log('   Nom:', `${firstName} ${lastName}`);
console.log('   Rôle:', role);
console.log('\nAppuyez sur Ctrl+C pour annuler, ou attendez 5 secondes...\n');

await new Promise(resolve => setTimeout(resolve, 5000));

createUser(matricule, email, password, firstName, lastName, role)
  .then(() => {
    console.log('\n✅ Terminé');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Erreur:', error);
    process.exit(1);
  });
