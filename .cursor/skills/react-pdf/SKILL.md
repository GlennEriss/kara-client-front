---
name: react-pdf
description: "Expert patterns for PDF generation with @react-pdf/renderer, PDF display with react-pdf, and PDF viewing. Use when: PDF generation, react-pdf, @react-pdf/renderer, PDF viewer, PDF documents, pdf creation."
source: react-pdf.org documentation
---

# React PDF Integration

Guide pour la génération et l'affichage de PDF dans les applications React. Deux bibliothèques principales selon le cas d'usage.

## Quand utiliser ce skill

- Génération de PDF (contrats, reçus, attestations)
- Affichage de PDF existants
- Visualisation de documents PDF interactifs
- Export de données en PDF

## Choix de la bibliothèque

| Bibliothèque | Usage | Installation |
|--------------|-------|--------------|
| **@react-pdf/renderer** | **Créer** des PDF avec des composants React | `pnpm add @react-pdf/renderer` |
| **react-pdf** | **Afficher** des PDF existants | `pnpm add react-pdf` |
| **@pdf-viewer/react** | Visualisation avancée (annotations, formulaires) | `pnpm add @pdf-viewer/react` |

---

## @react-pdf/renderer — Création de PDF

Le projet utilise déjà cette bibliothèque. Composants React → PDF.

### Structure de base

```tsx
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'

const styles = StyleSheet.create({
  page: { padding: 32 },
  title: { fontSize: 18, marginBottom: 12 },
})

const MyDocument = () => (
  <Document>
    <Page size="A4" style={styles.page}>
      <Text style={styles.title}>Mon document</Text>
      <View>...</View>
    </Page>
  </Document>
)
```

### Composants principaux

| Composant | Description |
|-----------|-------------|
| `<Document>` | Racine obligatoire, uniquement des enfants `<Page>` |
| `<Page>` | Page unique, props: `size`, `orientation`, `wrap` |
| `<View>` | Conteneur (équivalent div), props: `wrap`, `fixed` |
| `<Text>` | Texte, supporte le nesting pour styles inline |
| `<Image>` | Images (URL, base64, Buffer) |
| `<Link>` | Liens internes (#id) ou externes (URL) |
| `<Canvas>` | Dessin libre via API PDFKit |

### Affichage et téléchargement

```tsx
// Affichage dans un iframe
import { PDFViewer } from '@react-pdf/renderer'
<PDFViewer width="100%" height={600}>
  <MyDocument />
</PDFViewer>

// Téléchargement direct
import { PDFDownloadLink } from '@react-pdf/renderer'
<PDFDownloadLink document={<MyDocument />} fileName="document.pdf">
  {({ loading }) => loading ? 'Génération...' : 'Télécharger'}
</PDFDownloadLink>

// Accès au blob (upload, envoi API)
import { BlobProvider, pdf } from '@react-pdf/renderer'
<BlobProvider document={<MyDocument />}>
  {({ blob, url, loading }) => {
    // Utiliser blob pour upload ou autre
    return <div>...</div>
  }}
</BlobProvider>

// API impérative
const blob = await pdf(<MyDocument />).toBlob()
```

### usePDF hook

Contrôle fin du rendu et accès aux données :

```tsx
import { usePDF, Document, Page } from '@react-pdf/renderer'

const MyDoc = <Document><Page>...</Page></Document>

const App = () => {
  const [instance, updateInstance] = usePDF({ document: MyDoc })
  if (instance.loading) return <div>Chargement...</div>
  if (instance.error) return <div>Erreur: {instance.error}</div>
  return <a href={instance.url} download="doc.pdf">Télécharger</a>
}
```

### Page wrapping et sauts

- **wrap** (défaut: true) : le contenu déborde sur les pages suivantes
- **wrap={false}** sur `<Page>` : désactiver le wrapping
- **wrap={false}** sur un composant : le rendre indivisible (saute toute la page)
- **break** : forcer un saut de page avant l'élément
- **fixed** : répéter sur toutes les pages (headers, footers, numéros)

```tsx
<Page wrap>
  <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} fixed />
  <View fixed style={{ position: 'absolute', bottom: 20 }}>Footer</View>
  <Text break>Nouvelle section</Text>
</Page>
```

### Contenu dynamique

```tsx
<Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} fixed />
<View render={({ pageNumber }) => pageNumber % 2 === 0 && <View>...</View>} />
```

### Styles

StyleSheet similaire à React Native (flexbox, pas de px/em) :

```tsx
const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  bold: { fontWeight: 700 },
  section: { marginBottom: 10 },
})
```

### Polices et césure

```tsx
import { Font } from '@react-pdf/renderer'

Font.register({
  family: 'Custom',
  src: '/fonts/CustomFont.ttf',
})

// Césure personnalisée (ex: allemand)
import { hyphenateSync as hyphenateDE } from 'hyphen/de'
Font.registerHyphenationCallback((word) => hyphenateDE(word).split('\u00AD'))
```

### Documents volumineux (30+ pages)

Rendre dans un **Web Worker** pour éviter de bloquer le thread principal :

```tsx
// Voir: https://dev.to/simonhessel/creating-pdf-files-without-slowing-down-your-app-a42
```

### Node.js / Express

```tsx
import ReactPDF from '@react-pdf/renderer'

const pdfStream = await ReactPDF.renderToStream(<MyDocument />)
res.setHeader('Content-Type', 'application/pdf')
pdfStream.pipe(res)
```

---

## react-pdf — Affichage de PDF existants

Pour **afficher** des PDF déjà générés (URL, base64, blob).

```tsx
import { Document, Page } from 'react-pdf'

<Document file={urlOuBlob}>
  <Page pageNumber={1} />
</Document>
```

---

## Bonnes pratiques

1. **Import dynamique** pour les PDF lourds : `const { Document, Page, pdf } = await import('@react-pdf/renderer')`
2. **Composants réutilisables** : LogoPDF, styles partagés
3. **fixed** pour headers/footers et numéros de page
4. **render** pour le contenu dynamique (pageNumber, totalPages)
5. **Web Worker** pour documents > 30 pages
6. **Font.register** pour les polices personnalisées

## Ressources

- [react-pdf.org](https://react-pdf.org/) — Documentation officielle
- [Composants](https://react-pdf.org/components)
- [Fonctionnalités avancées](https://react-pdf.org/advanced)
- [npm @react-pdf/renderer](https://www.npmjs.com/package/@react-pdf/renderer)
