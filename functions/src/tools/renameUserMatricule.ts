import * as admin from 'firebase-admin'
import * as path from 'path'
import * as fs from 'fs'

/**
 * Script utilitaire pour renommer complètement le matricule / UID d'un utilisateur.
 *
 * Ce script effectue les opérations suivantes :
 * 1. Duplique l'utilisateur Firebase Auth en changeant son UID
 * 2. Met à jour la collection `users` :
 *    - nouveau document avec le nouvel ID
 *    - champs `id` et `matricule` mis à jour
 *    - suppression de l'ancien document
 * 3. Met à jour la collection `membership-requests` :
 *    - nouveau document avec le nouvel ID (si existant)
 *    - champ `matricule` mis à jour
 *    - suppression de l'ancien document
 *
 * IMPORTANT :
 * - À exécuter manuellement avec Node/ts-node depuis le dossier `functions`
 * - Exemple (TS compilé) : `node lib/tools/renameUserMatricule.js`
 * - Pense à modifier OLD_MATRICULE et NEW_MATRICULE avant d'exécuter.
 */

// Matricules à adapter avant exécution
const OLD_MATRICULE = '6268.MK.070126'
const NEW_MATRICULE = '0000.MK.00001'

// Charger les variables d'environnement depuis le projet principal
const projectRoot = path.resolve(__dirname, '../../..')
const envFiles = ['.env.local', '.env', '.env.production', '.env.development']
for (const envFile of envFiles) {
  const envPath = path.join(projectRoot, envFile)
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8')
    envContent.split('\n').forEach(line => {
      const match = line.match(/^([^=]+)=(.*)$/)
      if (match && !process.env[match[1]]) {
        process.env[match[1]] = match[2].trim()
      }
    })
    break
  }
}

// Initialiser Firebase Admin avec les credentials
if (!admin.apps.length) {
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/gm, '\n')

  if (projectId && clientEmail && privateKey) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    })
  } else {
    // Fallback: utiliser les credentials par défaut (Application Default Credentials)
    admin.initializeApp()
  }
}

const auth = admin.auth()
const db = admin.firestore()

async function renameUserMatricule(oldMatricule: string, newMatricule: string) {
  console.log('=== Début renommage matricule ===')
  console.log(`Ancien matricule / UID : ${oldMatricule}`)
  console.log(`Nouveau matricule / UID : ${newMatricule}`)

  if (oldMatricule === newMatricule) {
    throw new Error('Les matricules ancien et nouveau sont identiques.')
  }

  // 1. Récupérer l'utilisateur Auth existant
  console.log('1) Récupération de l’utilisateur Firebase Auth…')
  const oldUser = await auth.getUser(oldMatricule)
  console.log('   Utilisateur trouvé :', oldUser.uid, oldUser.email)

  // Vérifier qu'il n'existe pas déjà un compte avec le nouvel UID
  try {
    const existingNew = await auth.getUser(newMatricule)
    if (existingNew) {
      throw new Error(`Un utilisateur avec l’UID ${newMatricule} existe déjà dans Auth. Abandon.`)
    }
  } catch (e: any) {
    if (e?.code === 'auth/user-not-found') {
      console.log('   Aucun utilisateur existant avec le nouvel UID, OK.')
    } else {
      throw e
    }
  }

  // 2. Créer le nouvel utilisateur dans Auth SANS email (pour éviter le conflit)
  console.log('2) Création du nouvel utilisateur Auth avec le nouveau matricule…')
  const newUser = await auth.createUser({
    uid: newMatricule,
    // On ne met pas l'email ici car il est déjà utilisé par l'ancien compte
    // On le mettra à jour après avoir supprimé l'ancien
    emailVerified: oldUser.emailVerified,
    disabled: oldUser.disabled,
    // On ne peut pas lire le mot de passe existant, on remet le mot de passe par défaut
    password: '123456',
  })
  console.log('   Nouvel utilisateur créé :', newUser.uid)

  // Copier les custom claims si présents
  if (oldUser.customClaims && Object.keys(oldUser.customClaims).length > 0) {
    console.log('   Copie des custom claims…')
    await auth.setCustomUserClaims(newUser.uid, oldUser.customClaims)
  }

  // 3. Dupliquer la doc Firestore dans `users`
  console.log('3) Migration du document Firestore dans `users`…')
  const usersRef = db.collection('users')
  const oldUserDocRef = usersRef.doc(oldMatricule)
  const oldUserSnap = await oldUserDocRef.get()

  if (!oldUserSnap.exists) {
    console.warn(`   ⚠ Aucun document trouvé dans "users/${oldMatricule}"`)
  } else {
    const userData = oldUserSnap.data() || {}
    const newUserData = {
      ...userData,
      id: newMatricule,
      matricule: newMatricule,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }

    const newUserDocRef = usersRef.doc(newMatricule)
    await newUserDocRef.set(newUserData, { merge: false })
    console.log(`   Nouveau document écrit dans "users/${newMatricule}"`)

    await oldUserDocRef.delete()
    console.log(`   Ancien document "users/${oldMatricule}" supprimé`)
  }

  // 4. Dupliquer la doc Firestore dans `membership-requests`
  console.log('4) Migration du document Firestore dans `membership-requests`…')
  const mrRef = db.collection('membership-requests')
  const oldMrDocRef = mrRef.doc(oldMatricule)
  const oldMrSnap = await oldMrDocRef.get()

  if (!oldMrSnap.exists) {
    console.warn(`   ⚠ Aucun document trouvé dans "membership-requests/${oldMatricule}" (OK si ce n’est pas une demande d’adhésion)`)
  } else {
    const mrData = oldMrSnap.data() || {}
    const newMrData = {
      ...mrData,
      matricule: newMatricule,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }

    const newMrDocRef = mrRef.doc(newMatricule)
    await newMrDocRef.set(newMrData, { merge: false })
    console.log(`   Nouveau document écrit dans "membership-requests/${newMatricule}"`)

    await oldMrDocRef.delete()
    console.log(`   Ancien document "membership-requests/${oldMatricule}" supprimé`)
  }

  // 5. Supprimer l'ancien utilisateur Auth (en dernier)
  console.log('5) Suppression de l\'ancien utilisateur Auth…')
  await auth.deleteUser(oldMatricule)
  console.log('   Ancien utilisateur supprimé.')

  // 6. Mettre à jour l'email du nouvel utilisateur (maintenant que l'ancien est supprimé)
  if (oldUser.email) {
    console.log('6) Mise à jour de l\'email du nouvel utilisateur…')
    await auth.updateUser(newMatricule, {
      email: oldUser.email,
      emailVerified: oldUser.emailVerified,
    })
    console.log(`   Email ${oldUser.email} assigné au nouvel utilisateur.`)
  }

  console.log('=== Renommage terminé avec succès ===')
}

// Lancer le script si exécuté directement via Node
if (require.main === module) {
  renameUserMatricule(OLD_MATRICULE, NEW_MATRICULE)
    .then(() => {
      console.log('Script terminé.')
      process.exit(0)
    })
    .catch((err) => {
      console.error('Erreur lors du renommage du matricule :', err)
      process.exit(1)
    })
}

// Export pour réutilisation éventuelle dans d’autres fonctions
export { renameUserMatricule }


