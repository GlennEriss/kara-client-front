/**
 * Script pour créer des données de test pour le module Géographie
 * 
 * Usage: pnpm tsx scripts/seed-geography-test-data.ts
 * 
 * Ce script crée :
 * - 9 provinces du Gabon
 * - 27 départements (3 par province)
 * - 81 communes (3 par département)
 * - 243 arrondissements (3 par commune)
 * - 729 quartiers (3 par arrondissement)
 * 
 * Toutes les données incluent le champ searchableText pour la recherche.
 * Structure hiérarchique cohérente avec des données réelles du Gabon.
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

// Structure hiérarchique complète avec données réelles du Gabon
const geographyData = [
  {
    province: { code: 'EST', name: 'Estuaire' },
    departments: [
      {
        name: 'Komo-Mondah',
        code: 'KMM',
        communes: [
          { name: 'Ntoum', postalCode: '24110' },
          { name: 'Cocobeach', postalCode: '24111' },
          { name: 'Kango', postalCode: '24112' },
        ],
      },
      {
        name: 'Libreville',
        code: 'LBV',
        communes: [
          { name: 'Libreville Centre', postalCode: '24100', alias: 'Ville' },
          { name: 'Akanda', postalCode: '24101' },
          { name: 'Owendo', postalCode: '24102' },
        ],
      },
      {
        name: 'Komo-Océan',
        code: 'KMO',
        communes: [
          { name: 'Ndzomoé', postalCode: '24120' },
          { name: 'Cap Estérias', postalCode: '24121' },
          { name: 'Ntoum', postalCode: '24122' },
        ],
      },
    ],
  },
  {
    province: { code: 'HOG', name: 'Haut-Ogooué' },
    departments: [
      {
        name: 'Franceville',
        code: 'FRV',
        communes: [
          { name: 'Franceville Centre', postalCode: '24200', alias: 'Ville' },
          { name: 'Mounana', postalCode: '24201' },
          { name: 'Okondja', postalCode: '24202' },
        ],
      },
      {
        name: 'Lékoni',
        code: 'LKN',
        communes: [
          { name: 'Lékoni Centre', postalCode: '24210' },
          { name: 'Mpassa', postalCode: '24211' },
          { name: 'Bongoville', postalCode: '24212' },
        ],
      },
      {
        name: 'Lékabi-Léwolo',
        code: 'LKL',
        communes: [
          { name: 'Moanda', postalCode: '24220' },
          { name: 'Boumango', postalCode: '24221' },
          { name: 'Lastoursville', postalCode: '24222' },
        ],
      },
    ],
  },
  {
    province: { code: 'MOY', name: 'Moyen-Ogooué' },
    departments: [
      {
        name: 'Lambaréné',
        code: 'LMB',
        communes: [
          { name: 'Lambaréné Centre', postalCode: '24300', alias: 'Ville' },
          { name: 'Ndjolé', postalCode: '24301' },
          { name: 'Omboué', postalCode: '24302' },
        ],
      },
      {
        name: 'Aboumi',
        code: 'ABM',
        communes: [
          { name: 'Aboumi', postalCode: '24310' },
          { name: 'Booué', postalCode: '24311' },
          { name: 'Mbigou', postalCode: '24312' },
        ],
      },
      {
        name: 'Ogooué et des Lacs',
        code: 'OGL',
        communes: [
          { name: 'Ogooué', postalCode: '24320' },
          { name: 'Remboué', postalCode: '24321' },
          { name: 'Mouila', postalCode: '24322' },
        ],
      },
    ],
  },
  {
    province: { code: 'NGU', name: 'Ngounié' },
    departments: [
      {
        name: 'Mouila',
        code: 'MOU',
        communes: [
          { name: 'Mouila Centre', postalCode: '24400', alias: 'Ville' },
          { name: 'Fougamou', postalCode: '24401' },
          { name: 'Mbigou', postalCode: '24402' },
        ],
      },
      {
        name: 'Douya-Onoy',
        code: 'DOY',
        communes: [
          { name: 'Mimongo', postalCode: '24410' },
          { name: 'Mouila', postalCode: '24411' },
          { name: 'Ndendé', postalCode: '24412' },
        ],
      },
      {
        name: 'Dola',
        code: 'DOL',
        communes: [
          { name: 'Dola', postalCode: '24420' },
          { name: 'Mouila', postalCode: '24421' },
          { name: 'Mbigou', postalCode: '24422' },
        ],
      },
    ],
  },
  {
    province: { code: 'NYA', name: 'Nyanga' },
    departments: [
      {
        name: 'Tchibanga',
        code: 'TCH',
        communes: [
          { name: 'Tchibanga Centre', postalCode: '24500', alias: 'Ville' },
          { name: 'Mayumba', postalCode: '24501' },
          { name: 'Moabi', postalCode: '24502' },
        ],
      },
      {
        name: 'Doutsila',
        code: 'DOU',
        communes: [
          { name: 'Doutsila', postalCode: '24510' },
          { name: 'Mabanda', postalCode: '24511' },
          { name: 'Mouila', postalCode: '24512' },
        ],
      },
      {
        name: 'Haute-Banio',
        code: 'HBA',
        communes: [
          { name: 'Mayumba', postalCode: '24520' },
          { name: 'Mabanda', postalCode: '24521' },
          { name: 'Tchibanga', postalCode: '24522' },
        ],
      },
    ],
  },
  {
    province: { code: 'OGI', name: 'Ogooué-Ivindo' },
    departments: [
      {
        name: 'Makokou',
        code: 'MAK',
        communes: [
          { name: 'Makokou Centre', postalCode: '24600', alias: 'Ville' },
          { name: 'Mékambo', postalCode: '24601' },
          { name: 'Booué', postalCode: '24602' },
        ],
      },
      {
        name: 'Ivindo',
        code: 'IVI',
        communes: [
          { name: 'Makokou', postalCode: '24610' },
          { name: 'Zadié', postalCode: '24611' },
          { name: 'Mékambo', postalCode: '24612' },
        ],
      },
      {
        name: 'Lopé',
        code: 'LOP',
        communes: [
          { name: 'Booué', postalCode: '24620' },
          { name: 'Lopé', postalCode: '24621' },
          { name: 'Mékambo', postalCode: '24622' },
        ],
      },
    ],
  },
  {
    province: { code: 'OGL', name: 'Ogooué-Lolo' },
    departments: [
      {
        name: 'Koulamoutou',
        code: 'KOU',
        communes: [
          { name: 'Koulamoutou Centre', postalCode: '24700', alias: 'Ville' },
          { name: 'Lastoursville', postalCode: '24701' },
          { name: 'Mouila', postalCode: '24702' },
        ],
      },
      {
        name: 'Lolo-Bouenguidi',
        code: 'LOL',
        communes: [
          { name: 'Koulamoutou', postalCode: '24710' },
          { name: 'Mouila', postalCode: '24711' },
          { name: 'Lastoursville', postalCode: '24712' },
        ],
      },
      {
        name: 'Lombo-Bouenguidi',
        code: 'LOB',
        communes: [
          { name: 'Lastoursville', postalCode: '24720' },
          { name: 'Koulamoutou', postalCode: '24721' },
          { name: 'Mouila', postalCode: '24722' },
        ],
      },
    ],
  },
  {
    province: { code: 'OGM', name: 'Ogooué-Maritime' },
    departments: [
      {
        name: 'Port-Gentil',
        code: 'PGL',
        communes: [
          { name: 'Port-Gentil Centre', postalCode: '24800', alias: 'Ville' },
          { name: 'Omboué', postalCode: '24801' },
          { name: 'Gamba', postalCode: '24802' },
        ],
      },
      {
        name: 'Bendjé',
        code: 'BEN',
        communes: [
          { name: 'Port-Gentil', postalCode: '24810' },
          { name: 'Omboué', postalCode: '24811' },
          { name: 'Gamba', postalCode: '24812' },
        ],
      },
      {
        name: 'Etimboué',
        code: 'ETI',
        communes: [
          { name: 'Omboué', postalCode: '24820' },
          { name: 'Gamba', postalCode: '24821' },
          { name: 'Port-Gentil', postalCode: '24822' },
        ],
      },
    ],
  },
  {
    province: { code: 'WNT', name: 'Woleu-Ntem' },
    departments: [
      {
        name: 'Oyem',
        code: 'OYE',
        communes: [
          { name: 'Oyem Centre', postalCode: '24900', alias: 'Ville' },
          { name: 'Mitzic', postalCode: '24901' },
          { name: 'Medouneu', postalCode: '24902' },
        ],
      },
      {
        name: 'Woleu',
        code: 'WOL',
        communes: [
          { name: 'Oyem', postalCode: '24910' },
          { name: 'Mitzic', postalCode: '24911' },
          { name: 'Medouneu', postalCode: '24912' },
        ],
      },
      {
        name: 'Ntem',
        code: 'NTE',
        communes: [
          { name: 'Bitam', postalCode: '24920' },
          { name: 'Mitzic', postalCode: '24921' },
          { name: 'Medouneu', postalCode: '24922' },
        ],
      },
    ],
  },
]

// Arrondissements réels du Gabon (3 par commune)
const districtNames = [
  'Centre-Ville',
  'Quartier Administratif',
  'Zone Industrielle',
  'Résidentiel Nord',
  'Résidentiel Sud',
  'Commercial',
  'Portuaire',
  'Aéroportuaire',
  'Zone Périphérique',
]

// Quartiers réels du Gabon (3 par arrondissement)
const quarterNames = [
  'Dakar',
  'Atongowanga',
  'Lalala',
  'Faisceau Hertzien',
  'Château',
  'Grand-village',
  'Point-V',
  'Adouma',
  'Moussamoukougou',
  'Abongo',
  'Sainte-Thérèse',
  'Douanes',
  'SBOM',
  'CFG',
  'OPRAG',
  'Zone Industrielle du Port',
  'Club Hippique',
  'Sogara',
  'Derrière-Abela',
  'Carrefour Léon-Mba',
  'Nouvelle Balise',
  'Océan',
  'Bac Aviation',
  'Aéroport',
  'Route du Cap Lopez',
  'Akwakam',
  'Nkembo',
  'Oloumi',
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
    let quarterCount = 0

    // 1. Créer les provinces
    console.log('📌 Création des provinces...')
    for (const geoData of geographyData) {
      const docRef = await db.collection('provinces').add({
        code: geoData.province.code,
        name: geoData.province.name,
        searchableText: generateSearchableText(geoData.province.name, geoData.province.code),
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        createdBy: 'test-seed-script',
      })
      provinceIds.push(docRef.id)
      console.log(`  ✅ ${geoData.province.name} (${docRef.id})`)
    }

    // 2. Créer les départements (3 par province)
    console.log('\n📌 Création des départements...')
    let provinceIndex = 0
    for (const geoData of geographyData) {
      for (const dept of geoData.departments) {
        const docRef = await db.collection('departments').add({
          provinceId: provinceIds[provinceIndex],
          name: dept.name,
          code: dept.code,
          searchableText: generateSearchableText(dept.name, dept.code),
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
          createdBy: 'test-seed-script',
        })
        departmentIds.push(docRef.id)
        console.log(`  ✅ ${dept.name} (${docRef.id})`)
      }
      provinceIndex++
    }

    // 3. Créer les communes (3 par département)
    console.log('\n📌 Création des communes...')
    let deptIndex = 0
    for (const geoData of geographyData) {
      for (const dept of geoData.departments) {
        for (const commune of dept.communes) {
          const communeData = cleanUndefined({
            departmentId: departmentIds[deptIndex],
            name: commune.name,
            postalCode: commune.postalCode,
            alias: commune.alias,
            searchableText: generateSearchableText(commune.name, commune.postalCode, commune.alias),
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
            createdBy: 'test-seed-script',
          })
          const docRef = await db.collection('communes').add(communeData)
          communeIds.push(docRef.id)
          console.log(`  ✅ ${commune.name} (${docRef.id})`)
        }
        deptIndex++
      }
    }

    // 4. Créer les arrondissements (3 par commune)
    console.log('\n📌 Création des arrondissements...')
    let districtNameIndex = 0
    for (let i = 0; i < communeIds.length; i++) {
      for (let j = 0; j < 3; j++) {
        const districtName = districtNames[districtNameIndex % districtNames.length]
        const docRef = await db.collection('districts').add({
          communeId: communeIds[i],
          name: districtName,
          searchableText: generateSearchableText(districtName),
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
          createdBy: 'test-seed-script',
        })
        districtIds.push(docRef.id)
        console.log(`  ✅ ${districtName} (${docRef.id})`)
        districtNameIndex++
      }
    }

    // 5. Créer les quartiers (3 par arrondissement)
    console.log('\n📌 Création des quartiers...')
    let quarterNameIndex = 0
    for (let i = 0; i < districtIds.length; i++) {
      for (let j = 0; j < 3; j++) {
        const quarterName = quarterNames[quarterNameIndex % quarterNames.length]
        const docRef = await db.collection('quarters').add({
          districtId: districtIds[i],
          name: quarterName,
          searchableText: generateSearchableText(quarterName),
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
          createdBy: 'test-seed-script',
        })
        quarterCount++
        console.log(`  ✅ ${quarterName} (${docRef.id})`)
        quarterNameIndex++
      }
    }

    console.log('\n✅ Données de test créées avec succès !')
    console.log(`\n📊 Résumé:`)
    console.log(`   - ${provinceIds.length} provinces`)
    console.log(`   - ${departmentIds.length} départements`)
    console.log(`   - ${communeIds.length} communes`)
    console.log(`   - ${districtIds.length} arrondissements`)
    console.log(`   - ${quarterCount} quartiers`)

    process.exit(0)
  } catch (error) {
    console.error('❌ Erreur lors de la création des données de test:', error)
    process.exit(1)
  }
}

// Exécuter le script
seedGeographyData()
