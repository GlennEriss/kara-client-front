/**
 * Script pour ajouter des indexes Firestore depuis les liens Firebase Console
 * 
 * Usage:
 *   npx ts-node scripts/add-firestore-index.ts "https://console.firebase.google.com/v1/r/project/kara-gabon-dev/firestore/indexes?create_composite=..."
 * 
 * Ou avec plusieurs URLs:
 *   npx ts-node scripts/add-firestore-index.ts "url1" "url2" "url3"
 */

import * as fs from 'fs'
import * as path from 'path'

interface FirestoreIndex {
  collectionGroup: string
  queryScope: 'COLLECTION' | 'COLLECTION_GROUP'
  fields: Array<{
    fieldPath: string
    order: 'ASCENDING' | 'DESCENDING'
  }>
}

interface FirestoreIndexesFile {
  indexes: FirestoreIndex[]
  fieldOverrides: any[]
}

/**
 * Décode l'URL Firebase Console pour extraire les informations de l'index
 */
function parseFirebaseIndexUrl(url: string): FirestoreIndex | null {
  try {
    // Extraire le paramètre create_composite de l'URL
    const urlObj = new URL(url)
    const createComposite = urlObj.searchParams.get('create_composite')
    
    if (!createComposite) {
      console.error('❌ URL invalide: pas de paramètre create_composite')
      console.error('   Format attendu: https://console.firebase.google.com/.../indexes?create_composite=...')
      return null
    }

    // Le paramètre est encodé en base64url (pas base64 standard)
    // Remplacer les caractères URL-safe
    const base64 = createComposite.replace(/-/g, '+').replace(/_/g, '/')
    const padding = '='.repeat((4 - (base64.length % 4)) % 4)
    
    try {
      const decoded = Buffer.from(base64 + padding, 'base64').toString('utf-8')
      const indexData = JSON.parse(decoded)
      
      // Extraire les informations - format peut varier
      let collectionGroup = indexData.collectionGroup || indexData.collectionId
      const fields: any[] = indexData.fields || []
      
      // Si pas de collectionGroup, essayer d'extraire depuis l'URL
      if (!collectionGroup) {
        const match = url.match(/\/firestore\/indexes\?create_composite=/)
        if (match) {
          // Essayer d'extraire depuis le path ou d'autres indices
          console.warn('   ⚠️  CollectionGroup non trouvé dans l\'index, extraction manuelle nécessaire')
        }
      }
      
      if (!collectionGroup || fields.length === 0) {
        console.error('   ❌ Impossible d\'extraire collectionGroup ou fields')
        console.error('   Données décodées:', JSON.stringify(indexData, null, 2))
        return null
      }
      
      const index: FirestoreIndex = {
        collectionGroup,
        queryScope: indexData.queryScope || 'COLLECTION',
        fields: fields.map((field: any) => ({
          fieldPath: field.fieldPath || field.field_path,
          order: (field.order || field.order_direction || 'ASCENDING').toUpperCase(),
        })),
      }

      return index
    } catch (decodeError) {
      // Si le décodage échoue, afficher l'URL pour debug
      console.error('   ❌ Erreur lors du décodage:', decodeError)
      console.error('   💡 Essayez de copier l\'URL complète depuis la barre d\'adresse du navigateur')
      return null
    }
  } catch (error) {
    console.error('❌ Erreur lors du parsing de l\'URL:', error)
    return null
  }
}

/**
 * Vérifie si un index existe déjà dans le fichier
 */
function indexExists(index: FirestoreIndex, existingIndexes: FirestoreIndex[]): boolean {
  return existingIndexes.some((existing) => {
    if (existing.collectionGroup !== index.collectionGroup) return false
    if (existing.queryScope !== index.queryScope) return false
    if (existing.fields.length !== index.fields.length) return false
    
    return existing.fields.every((field, i) => {
      const otherField = index.fields[i]
      return field.fieldPath === otherField.fieldPath && field.order === otherField.order
    })
  })
}

/**
 * Ajoute un index au fichier firestore.indexes.json
 */
function addIndexToFile(index: FirestoreIndex, filePath: string): boolean {
  try {
    // Lire le fichier existant
    const fileContent = fs.readFileSync(filePath, 'utf-8')
    const indexesFile: FirestoreIndexesFile = JSON.parse(fileContent)

    // Vérifier si l'index existe déjà
    if (indexExists(index, indexesFile.indexes)) {
      console.log(`⚠️  Index déjà présent pour ${index.collectionGroup}`)
      return false
    }

    // Ajouter le nouvel index
    indexesFile.indexes.push(index)

    // Trier les indexes par collectionGroup pour une meilleure lisibilité
    indexesFile.indexes.sort((a, b) => {
      if (a.collectionGroup !== b.collectionGroup) {
        return a.collectionGroup.localeCompare(b.collectionGroup)
      }
      return 0
    })

    // Écrire le fichier
    fs.writeFileSync(filePath, JSON.stringify(indexesFile, null, 2) + '\n', 'utf-8')
    
    return true
  } catch (error) {
    console.error('❌ Erreur lors de l\'écriture du fichier:', error)
    return false
  }
}

/**
 * Fonction principale
 */
function main() {
  const urls = process.argv.slice(2)
  
  if (urls.length === 0) {
    console.log(`
📝 Script pour ajouter des indexes Firestore depuis les liens Firebase Console

Usage:
  npx ts-node scripts/add-firestore-index.ts "URL1" "URL2" ...

Exemple:
  npx ts-node scripts/add-firestore-index.ts \\
    "https://console.firebase.google.com/v1/r/project/kara-gabon-dev/firestore/indexes?create_composite=..."

💡 Pour obtenir les URLs:
  1. Allez sur Firebase Console > Firestore > Indexes
  2. Cliquez sur le lien "Create index" dans les erreurs
  3. Copiez l'URL complète depuis la barre d'adresse
  4. Collez-la comme argument de ce script
    `)
    process.exit(1)
  }

  const filePath = path.join(__dirname, '../firestore.indexes.json')
  let added = 0
  let skipped = 0

  console.log('🚀 Démarrage de l\'ajout des indexes...\n')

  for (const url of urls) {
    console.log(`📋 Traitement de l'URL: ${url.substring(0, 80)}...`)
    
    const index = parseFirebaseIndexUrl(url)
    
    if (!index) {
      console.log('   ❌ Impossible de parser l\'index\n')
      skipped++
      continue
    }

    console.log(`   ✅ Index extrait: ${index.collectionGroup}`)
    console.log(`      Fields: ${index.fields.map(f => `${f.fieldPath} (${f.order})`).join(', ')}`)

    if (addIndexToFile(index, filePath)) {
      console.log('   ✅ Index ajouté au fichier\n')
      added++
    } else {
      console.log('   ⚠️  Index ignoré (déjà présent)\n')
      skipped++
    }
  }

  console.log('='.repeat(50))
  console.log(`🎉 Terminé!`)
  console.log(`   ✅ ${added} index(es) ajouté(s)`)
  console.log(`   ⚠️  ${skipped} index(es) ignoré(s)`)
  console.log(`\n📝 Fichier mis à jour: ${filePath}`)
  console.log(`\n🚀 Pour déployer les indexes:`)
  console.log(`   firebase deploy --only firestore:indexes`)
}

main()
