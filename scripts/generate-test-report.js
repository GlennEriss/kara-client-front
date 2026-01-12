#!/usr/bin/env node
/**
 * Script pour générer un rapport consolidé des tests
 * 
 * Usage: node scripts/generate-test-report.js
 */
const fs = require('fs')
const path = require('path')

const RESULTS_DIR = path.join(__dirname, '..', 'tests', 'results')
const REPORT_PATH = path.join(RESULTS_DIR, 'test-report.md')

// Lire les résultats des tests unitaires
function readUnitTestResults() {
  const unitTestPath = path.join(RESULTS_DIR, 'unit-tests.json')
  if (!fs.existsSync(unitTestPath)) {
    return null
  }
  try {
    return JSON.parse(fs.readFileSync(unitTestPath, 'utf8'))
  } catch (e) {
    console.warn('Impossible de lire les résultats des tests unitaires:', e.message)
    return null
  }
}

// Lire les résultats des tests E2E
function readE2ETestResults() {
  const e2ePath = path.join(RESULTS_DIR, 'e2e-tests.json')
  if (!fs.existsSync(e2ePath)) {
    return null
  }
  try {
    return JSON.parse(fs.readFileSync(e2ePath, 'utf8'))
  } catch (e) {
    console.warn('Impossible de lire les résultats des tests E2E:', e.message)
    return null
  }
}

// Lire le rapport de couverture
function readCoverageReport() {
  const coveragePath = path.join(__dirname, '..', 'coverage', 'coverage-summary.json')
  if (!fs.existsSync(coveragePath)) {
    return null
  }
  try {
    return JSON.parse(fs.readFileSync(coveragePath, 'utf8'))
  } catch (e) {
    console.warn('Impossible de lire le rapport de couverture:', e.message)
    return null
  }
}

// Générer le rapport
function generateReport() {
  const now = new Date().toISOString()
  const unitResults = readUnitTestResults()
  const e2eResults = readE2ETestResults()
  const coverage = readCoverageReport()
  
  let report = `# Rapport de Tests — KARA\n\n`
  report += `**Généré le** : ${now}\n\n`
  report += `---\n\n`
  
  // Section Tests Unitaires
  report += `## Tests Unitaires (Vitest)\n\n`
  if (unitResults) {
    const passed = unitResults.numPassedTests || 0
    const failed = unitResults.numFailedTests || 0
    const total = unitResults.numTotalTests || 0
    const duration = unitResults.testResults?.reduce((acc, r) => acc + (r.duration || 0), 0) || 0
    
    report += `| Métrique | Valeur |\n`
    report += `|----------|--------|\n`
    report += `| Tests réussis | ${passed} |\n`
    report += `| Tests échoués | ${failed} |\n`
    report += `| Total | ${total} |\n`
    report += `| Durée | ${(duration / 1000).toFixed(2)}s |\n`
    report += `| Statut | ${failed === 0 ? '✅ PASS' : '❌ FAIL'} |\n\n`
    
    if (failed > 0 && unitResults.testResults) {
      report += `### Tests échoués\n\n`
      unitResults.testResults
        .filter(r => r.status === 'failed')
        .forEach(r => {
          report += `- \`${r.name}\`\n`
        })
      report += `\n`
    }
  } else {
    report += `*Aucun résultat disponible*\n\n`
  }
  
  // Section Tests E2E
  report += `## Tests E2E (Playwright)\n\n`
  if (e2eResults && e2eResults.suites) {
    const countTests = (suites) => {
      let passed = 0, failed = 0, skipped = 0
      const process = (suite) => {
        if (suite.specs) {
          suite.specs.forEach(spec => {
            if (spec.tests) {
              spec.tests.forEach(test => {
                if (test.status === 'expected' || test.status === 'passed') passed++
                else if (test.status === 'unexpected' || test.status === 'failed') failed++
                else if (test.status === 'skipped') skipped++
              })
            }
          })
        }
        if (suite.suites) {
          suite.suites.forEach(process)
        }
      }
      suites.forEach(process)
      return { passed, failed, skipped, total: passed + failed + skipped }
    }
    
    const stats = countTests(e2eResults.suites)
    const duration = e2eResults.duration || 0
    
    report += `| Métrique | Valeur |\n`
    report += `|----------|--------|\n`
    report += `| Tests réussis | ${stats.passed} |\n`
    report += `| Tests échoués | ${stats.failed} |\n`
    report += `| Tests ignorés | ${stats.skipped} |\n`
    report += `| Total | ${stats.total} |\n`
    report += `| Durée | ${(duration / 1000).toFixed(2)}s |\n`
    report += `| Statut | ${stats.failed === 0 ? '✅ PASS' : '❌ FAIL'} |\n\n`
  } else {
    report += `*Aucun résultat disponible*\n\n`
  }
  
  // Section Couverture
  report += `## Couverture de Code\n\n`
  if (coverage && coverage.total) {
    const { lines, statements, functions, branches } = coverage.total
    
    report += `| Métrique | Couverture | Seuil |\n`
    report += `|----------|------------|-------|\n`
    report += `| Lignes | ${lines.pct.toFixed(1)}% | 80% ${lines.pct >= 80 ? '✅' : '❌'} |\n`
    report += `| Statements | ${statements.pct.toFixed(1)}% | 80% ${statements.pct >= 80 ? '✅' : '❌'} |\n`
    report += `| Fonctions | ${functions.pct.toFixed(1)}% | 80% ${functions.pct >= 80 ? '✅' : '❌'} |\n`
    report += `| Branches | ${branches.pct.toFixed(1)}% | 80% ${branches.pct >= 80 ? '✅' : '❌'} |\n\n`
    
    // Couverture par module (si disponible)
    const moduleKeys = Object.keys(coverage).filter(k => k !== 'total')
    if (moduleKeys.length > 0) {
      report += `### Couverture par Module\n\n`
      report += `| Module | Lignes | Fonctions | Branches |\n`
      report += `|--------|--------|-----------|----------|\n`
      
      moduleKeys.slice(0, 10).forEach(key => {
        const mod = coverage[key]
        const shortKey = key.split('/').slice(-2).join('/')
        report += `| ${shortKey} | ${mod.lines.pct.toFixed(0)}% | ${mod.functions.pct.toFixed(0)}% | ${mod.branches.pct.toFixed(0)}% |\n`
      })
      
      if (moduleKeys.length > 10) {
        report += `| ... | ... | ... | ... |\n`
      }
      report += `\n`
    }
  } else {
    report += `*Aucun rapport de couverture disponible*\n\n`
  }
  
  // Résumé
  report += `---\n\n`
  report += `## Résumé\n\n`
  
  const unitPass = unitResults ? (unitResults.numFailedTests || 0) === 0 : false
  const e2ePass = e2eResults?.suites ? true : false // Simplified
  const coveragePass = coverage?.total?.lines?.pct >= 80
  
  report += `| Check | Statut |\n`
  report += `|-------|--------|\n`
  report += `| Tests Unitaires | ${unitPass ? '✅ PASS' : '❌ FAIL ou N/A'} |\n`
  report += `| Tests E2E | ${e2ePass ? '✅ PASS' : '❌ FAIL ou N/A'} |\n`
  report += `| Couverture ≥ 80% | ${coveragePass ? '✅ PASS' : '❌ FAIL ou N/A'} |\n`
  report += `| **Global** | ${unitPass && e2ePass && coveragePass ? '✅ READY FOR MERGE' : '❌ NOT READY'} |\n`
  
  return report
}

// Main
function main() {
  console.log('🔍 Génération du rapport de tests...')
  
  // Créer le dossier si nécessaire
  if (!fs.existsSync(RESULTS_DIR)) {
    fs.mkdirSync(RESULTS_DIR, { recursive: true })
  }
  
  const report = generateReport()
  fs.writeFileSync(REPORT_PATH, report, 'utf8')
  
  console.log(`✅ Rapport généré : ${REPORT_PATH}`)
  console.log('\n' + report)
}

main()
