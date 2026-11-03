import { existsSync, readFileSync } from 'node:fs'
import console from 'node:console'
import path from 'node:path'
import process from 'node:process'
import { gzipSync } from 'node:zlib'

// Mesure le build de production ; les fichiers du serveur de développement sont séparés.
const buildDir = path.resolve('.next')
const manifestPath = path.join(buildDir, 'app-build-manifest.json')
if (!existsSync(manifestPath)) {
  console.error('Build introuvable : exécutez npm run build avant npm run analyze:bundle.')
  process.exit(1)
}

const { pages } = JSON.parse(readFileSync(manifestPath, 'utf8'))
const trackedRoutes = [
  '/(auth)/login/page', '/(admin)/layout', '/(admin)/dashboard/page',
  '/(admin)/caisse-speciale/page', '/(admin)/caisse-speciale/contrats/[id]/page',
  '/(admin)/caisse-imprevue/page', '/(admin)/caisse-imprevue/contrats/[id]/page',
  '/(admin)/calendrier/page', '/(admin)/placements/page',
  '/(admin)/credit-speciale/demandes/page', '/(admin)/credit-speciale/contrats/[id]/page',
  '/(admin)/vehicules/page',
]
const assetCache = new Map()
const assetSize = (file) => {
  if (!assetCache.has(file)) {
    const content = readFileSync(path.join(buildDir, file))
    assetCache.set(file, { rawBytes: content.length, gzipBytes: gzipSync(content).length })
  }
  return assetCache.get(file)
}

const routes = trackedRoutes.filter((key) => pages[key]).map((key) => {
  const layouts = Object.keys(pages).filter((candidate) =>
    candidate.endsWith('/layout') && key.startsWith(candidate.slice(0, -'layout'.length)),
  )
  const files = [...new Set([key, ...layouts].flatMap((entry) => pages[entry]))]
    .filter((file) => file.endsWith('.js'))
  const sizes = files.map(assetSize)
  return {
    route: key, layouts, assetCount: files.length,
    gzipBytes: sizes.reduce((sum, size) => sum + size.gzipBytes, 0),
    rawBytes: sizes.reduce((sum, size) => sum + size.rawBytes, 0),
  }
})

if (process.argv.includes('--json')) {
  console.log(JSON.stringify({ recordedAt: new Date().toISOString(), routes }, null, 2))
} else {
  console.log('JavaScript initial à cache froid, layouts inclus et fichiers dédupliqués. 1 Ko = 1 000 octets.')
  console.table(routes.map((entry) => ({
    Route: entry.route,
    'JS gzip (Ko)': Math.round(entry.gzipBytes / 1000),
    'JS brut (Ko)': Math.round(entry.rawBytes / 1000),
    Fichiers: entry.assetCount,
  })))
  console.log('Hors CSS, images, données et imports différés. Ces poids ne s’additionnent pas entre navigations.')
}
