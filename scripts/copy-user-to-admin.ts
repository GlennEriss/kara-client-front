/**
 * Script pour copier un utilisateur de la collection 'users' vers 'admins'
 * 
 * Usage: npx ts-node scripts/copy-user-to-admin.ts
 * 
 * Ce script copie le document avec l'ID '0001.MK.110126' de la collection 'users'
 * vers la collection 'admins' avec le même ID.
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
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

const copyUserToAdmin = async () => {
  try {
    console.log('🚀 Initialisation de Firebase Admin...');
    const app = initializeFirebaseAdmin();
    const projectId = app.options.projectId;
    console.log(`✅ Firebase Admin initialisé pour le projet: ${projectId}\n`);

    const firestore = getFirestore();

    const userId = '0001.MK.110126';
    const usersCollection = 'users';
    const adminsCollection = 'admins';

    console.log(`📋 Copie de l'utilisateur vers la collection admins:`);
    console.log(`   ID: ${userId}`);
    console.log(`   De: ${usersCollection}`);
    console.log(`   Vers: ${adminsCollection}`);
    console.log(`   Projet: ${projectId}\n`);

    // Lire le document utilisateur
    console.log(`📖 Lecture du document depuis '${usersCollection}'...`);
    const userDocRef = firestore.collection(usersCollection).doc(userId);
    const userDoc = await userDocRef.get();

    if (!userDoc.exists) {
      console.error(`\n❌ Erreur: Le document avec l'ID '${userId}' n'existe pas dans la collection '${usersCollection}'`);
      process.exit(1);
    }

    const userData = userDoc.data();
    console.log(`✅ Document trouvé dans '${usersCollection}'`);
    console.log(`   Nom: ${userData?.firstName} ${userData?.lastName}`);
    console.log(`   Email: ${userData?.email}`);

    // Préparer les données pour la collection admins
    // Mapping des champs utilisateur -> admin
    const adminData: any = {
      id: userId,
      lastName: userData?.lastName || userData?.name || 'Inconnu',
      firstName: userData?.firstName || userData?.prenom || '',
      birthDate: userData?.birthDate || '',
      civility: userData?.civility || 'Monsieur',
      gender: userData?.gender || 'Homme',
      email: userData?.email || '',
      contacts: userData?.contacts || [],
      roles: userData?.roles || (userData?.role ? [userData.role] : ['Admin']),
      photoURL: userData?.photoURL || null,
      photoPath: userData?.photoPath || null,
      isActive: userData?.isActive !== undefined ? userData.isActive : true,
      createdBy: userData?.createdBy || 'System',
      updatedBy: userData?.updatedBy || 'System',
    };

    // Préserver les timestamps si présents
    if (userData?.createdAt) {
      adminData.createdAt = userData.createdAt instanceof Timestamp 
        ? userData.createdAt 
        : (userData.createdAt?.toDate ? Timestamp.fromDate(userData.createdAt.toDate()) : Timestamp.now());
    } else {
      adminData.createdAt = Timestamp.now();
    }

    if (userData?.updatedAt) {
      adminData.updatedAt = userData.updatedAt instanceof Timestamp 
        ? userData.updatedAt 
        : (userData.updatedAt?.toDate ? Timestamp.fromDate(userData.updatedAt.toDate()) : Timestamp.now());
    } else {
      adminData.updatedAt = Timestamp.now();
    }

    console.log(`\n📝 Données admin préparées:`, {
      id: adminData.id,
      lastName: adminData.lastName,
      firstName: adminData.firstName,
      email: adminData.email,
      roles: adminData.roles,
      isActive: adminData.isActive,
    });

    // Vérifier si l'admin existe déjà
    const adminDocRef = firestore.collection(adminsCollection).doc(userId);
    const adminDoc = await adminDocRef.get();

    if (adminDoc.exists) {
      console.log(`\n⚠️  Un document avec l'ID '${userId}' existe déjà dans la collection '${adminsCollection}'`);
      console.log('   Mise à jour du document existant...');
      await adminDocRef.set(adminData, { merge: true });
      console.log(`✅ Document mis à jour dans '${adminsCollection}'`);
    } else {
      console.log(`\n✨ Création du document dans '${adminsCollection}'...`);
      await adminDocRef.set(adminData);
      console.log(`✅ Document créé dans '${adminsCollection}'`);
    }

    console.log(`\n🎉 Utilisateur copié avec succès vers la collection admins !`);
    console.log(`\n📊 Résumé:`);
    console.log(`   Projet Firebase: ${projectId}`);
    console.log(`   ID: ${userId}`);
    console.log(`   Nom: ${adminData.firstName} ${adminData.lastName}`);
    console.log(`   Email: ${adminData.email}`);
    console.log(`   Rôles: ${adminData.roles.join(', ')}`);
    console.log(`   Collection source: ${usersCollection}`);
    console.log(`   Collection cible: ${adminsCollection}`);

  } catch (error: any) {
    console.error('\n❌ Erreur lors de la copie de l\'utilisateur:', error);
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
copyUserToAdmin()
  .then(() => {
    console.log('\n✅ Script terminé avec succès');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Erreur fatale:', error);
    process.exit(1);
  });
