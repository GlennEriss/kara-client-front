/**
 * Script pour créer des données de test pour le module Géographie
 * 
 * Usage: pnpm tsx scripts/seed-geography-test-data.ts
 * 
 * Ce script crée :
 * - 5 provinces
 * - 10 départements (2 par province)
 * - 20 communes (2 par département)
 * - 40 arrondissements (2 par commune)
 * - 80 quartiers (2 par arrondissement)
 * 
 * Toutes les données incluent le champ searchableText pour la recherche.
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getFirestore, Timestamp } from 'firebase-admin/firestore'
import * as path from 'path'
import * as fs from 'fs'

// Configuration Firebase Admin
const initializeFirebaseAdmin = () => {
  if (getApps().length > 0) {
    return getApps()[0]
  }

  // Option 1: Variables d'environnement (prioritaire)
  if (process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PROJECT_ID) {
    const serviceAccount = {
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    }
    return initializeApp({
      credential: cert(serviceAccount),
      projectId: serviceAccount.projectId,
    })
  }

  // Option 2: Fichier service account
  const serviceAccountsDir = path.join(process.cwd(), 'service-accounts')
  if (!fs.existsSync(serviceAccountsDir)) {
    throw new Error('Dossier service-accounts/ non trouvé. Veuillez configurer les variables d\'environnement ou placer le fichier service account dans service-accounts/')
  }

  const files = fs.readdirSync(serviceAccountsDir)
  const devServiceAccountFile = files.find(f => f.includes('kara-gabon-dev') && f.endsWith('.json'))

  if (!devServiceAccountFile) {
    throw new Error('Fichier service account dev non trouvé dans service-accounts/. Cherchez un fichier contenant "kara-gabon-dev"')
  }

  const serviceAccountPath = path.join(serviceAccountsDir, devServiceAccountFile)
  const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'))

  return initializeApp({
    credential: cert(serviceAccount),
    projectId: serviceAccount.project_id,
  })
}

// Fonction pour générer searchableText
function generateSearchableText(name: string, ...additionalFields: (string | undefined)[]): string {
  const fields = [name, ...additionalFields].filter(Boolean)
  return fields
    .join(' ')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Supprime les accents
}

// Fonction pour nettoyer les valeurs undefined d'un objet (Firestore ne les accepte pas)
function cleanUndefined(obj: Record<string, any>): Record<string, any> {
  const cleaned: Record<string, any> = {}
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      cleaned[key] = value
    }
  }
  return cleaned
}

// Données de test
const provinces = [
  { code: 'EST', name: 'Estuaire' },
  { code: 'HOG', name: 'Haut-Ogooué' },
  { code: 'MOY', name: 'Moyen-Ogooué' },
  { code: 'NGU', name: 'Ngounié' },
  { code: 'NYA', name: 'Nyanga' },
]

const departments = [
  { name: 'Libreville', code: 'LBV' },
  { name: 'Ntoum', code: 'NTM' },
  { name: 'Franceville', code: 'FRV' },
  { name: 'Lékoni', code: 'LKN' },
  { name: 'Lambaréné', code: 'LMB' },
  { name: 'Ndjolé', code: 'NDJ' },
  { name: 'Mouila', code: 'MOU' },
  { name: 'Fougamou', code: 'FOU' },
  { name: 'Tchibanga', code: 'TCH' },
  { name: 'Mayumba', code: 'MAY' },
]

const communes = [
  { name: 'Libreville Centre', postalCode: '24100', alias: 'Ville' },
  { name: 'Akanda', postalCode: '24101' },
  { name: 'Owendo', postalCode: '24102' },
  { name: 'Ntoum Centre', postalCode: '24110' },
  { name: 'Cocobeach', postalCode: '24111' },
  { name: 'Franceville Centre', postalCode: '24200', alias: 'Ville' },
  { name: 'Mounana', postalCode: '24201' },
  { name: 'Lékoni Centre', postalCode: '24210' },
  { name: 'Mpassa', postalCode: '24211' },
  { name: 'Lambaréné Centre', postalCode: '24300', alias: 'Ville' },
  { name: 'Ndjolé Centre', postalCode: '24310' },
  { name: 'Mouila Centre', postalCode: '24400', alias: 'Ville' },
  { name: 'Fougamou Centre', postalCode: '24410' },
  { name: 'Tchibanga Centre', postalCode: '24500', alias: 'Ville' },
  { name: 'Mayumba Centre', postalCode: '24510' },
]

const districts = [
  'Centre-Ville',
  'Quartier Administratif',
  'Zone Industrielle',
  'Résidentiel Nord',
  'Résidentiel Sud',
  'Commercial',
  'Portuaire',
  'Aéroportuaire',
]

const quarters = [
  'Quartier A',
  'Quartier B',
  'Quartier C',
  'Quartier D',
  'Quartier E',
  'Quartier F',
  'Quartier G',
  'Quartier H',
]

async function seedGeographyData() {
  try {
    console.log('🚀 Initialisation de Firebase Admin...')
    initializeFirebaseAdmin()
    const db = getFirestore()

    console.log('🌍 Création des données de test pour le module Géographie...\n')

    const provinceIds: string[] = []
    const departmentIds: string[] = []
    const communeIds: string[] = []
    const districtIds: string[] = []

    // 1. Créer les provinces
    console.log('📌 Création des provinces...')
    for (const province of provinces) {
      const docRef = await db.collection('provinces').add({
        code: province.code,
        name: province.name,
        searchableText: generateSearchableText(province.name, province.code),
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        createdBy: 'test-seed-script',
      })
      provinceIds.push(docRef.id)
      console.log(`  ✅ ${province.name} (${docRef.id})`)
    }

    // 2. Créer les départements (2 par province)
    console.log('\n📌 Création des départements...')
    let deptIndex = 0
    for (let i = 0; i < provinceIds.length; i++) {
      for (let j = 0; j < 2 && deptIndex < departments.length; j++) {
        const dept = departments[deptIndex]
        const docRef = await db.collection('departments').add({
          provinceId: provinceIds[i],
          name: dept.name,
          code: dept.code,
          searchableText: generateSearchableText(dept.name, dept.code),
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
          createdBy: 'test-seed-script',
        })
        departmentIds.push(docRef.id)
        console.log(`  ✅ ${dept.name} (${docRef.id})`)
        deptIndex++
      }
    }

    // 3. Créer les communes (2 par département)
    console.log('\n📌 Création des communes...')
    let communeIndex = 0
    for (let i = 0; i < departmentIds.length; i++) {
      for (let j = 0; j < 2 && communeIndex < communes.length; j++) {
        const commune = communes[communeIndex]
        // Nettoyer les valeurs undefined pour Firestore
        const communeData = cleanUndefined({
          departmentId: departmentIds[i],
          name: commune.name,
          postalCode: commune.postalCode,
          alias: commune.alias, // Sera supprimé si undefined
          searchableText: generateSearchableText(commune.name, commune.postalCode, commune.alias),
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
          createdBy: 'test-seed-script',
        })
        const docRef = await db.collection('communes').add(communeData)
        communeIds.push(docRef.id)
        console.log(`  ✅ ${commune.name} (${docRef.id})`)
        communeIndex++
      }
    }

    // 4. Créer les arrondissements (2 par commune)
    console.log('\n📌 Création des arrondissements...')
    let districtIndex = 0
    for (let i = 0; i < communeIds.length; i++) {
      for (let j = 0; j < 2 && districtIndex < districts.length; j++) {
        const district = districts[districtIndex % districts.length]
        const docRef = await db.collection('districts').add({
          communeId: communeIds[i],
          name: `${district} ${i + 1}`,
          searchableText: generateSearchableText(`${district} ${i + 1}`),
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
          createdBy: 'test-seed-script',
        })
        districtIds.push(docRef.id)
        console.log(`  ✅ ${district} ${i + 1} (${docRef.id})`)
        districtIndex++
      }
    }

    // 5. Créer les quartiers (2 par arrondissement)
    console.log('\n📌 Création des quartiers...')
    let quarterIndex = 0
    for (let i = 0; i < districtIds.length; i++) {
      for (let j = 0; j < 2 && quarterIndex < quarters.length * 10; j++) {
        const quarter = quarters[quarterIndex % quarters.length]
        const docRef = await db.collection('quarters').add({
          districtId: districtIds[i],
          name: `${quarter} ${i + 1}-${j + 1}`,
          searchableText: generateSearchableText(`${quarter} ${i + 1}-${j + 1}`),
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
          createdBy: 'test-seed-script',
        })
        console.log(`  ✅ ${quarter} ${i + 1}-${j + 1} (${docRef.id})`)
        quarterIndex++
      }
    }

    console.log('\n✅ Données de test créées avec succès !')
    console.log(`\n📊 Résumé:`)
    console.log(`   - ${provinces.length} provinces`)
    console.log(`   - ${departmentIds.length} départements`)
    console.log(`   - ${communeIds.length} communes`)
    console.log(`   - ${districtIds.length} arrondissements`)
    console.log(`   - ${quarterIndex} quartiers`)

    process.exit(0)
  } catch (error) {
    console.error('❌ Erreur lors de la création des données de test:', error)
    process.exit(1)
  }
}

// Exécuter le script
seedGeographyData()
