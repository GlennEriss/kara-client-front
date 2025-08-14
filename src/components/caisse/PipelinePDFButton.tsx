"use client"

import React from 'react'
// Simplifier: générer un Blob et déclencher download, évite PDFDownloadLink

export default function PipelinePDFButton({ sections, fileName }: { sections: Array<{ label: string; items: any[] }>; fileName: string }) {
  const [isGenerating, setIsGenerating] = React.useState(false)

  const handleGenerate = async () => {
    try {
      setIsGenerating(true)
      const { Document, Page, Text, View, pdf } = await import('@react-pdf/renderer')
      const doc = (
        <Document>
          <Page size="A4" style={{ padding: 24 }}>
            <Text style={{ fontSize: 16, marginBottom: 12 }}>Rapport Caisse Spéciale</Text>
            {sections.map((s) => (
              <View key={s.label} style={{ marginBottom: 10 }} wrap>
                <Text style={{ fontSize: 12, marginBottom: 6 }}>{s.label} ({s.items.length})</Text>
                {s.items.slice(0, 50).map((c: any) => (
                  <View key={c.id} style={{ flexDirection: 'row', justifyContent: 'space-between', fontSize: 10, marginBottom: 2 }}>
                    <Text>#{String(c.id).slice(-6)}</Text>
                    <Text>{c.status}</Text>
                    <Text>{c.nextDueAt ? new Date(c.nextDueAt).toLocaleDateString('fr-FR') : '—'}</Text>
                  </View>
                ))}
              </View>
            ))}
          </Page>
        </Document>
      )
      const blob = await pdf(doc).toBlob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = fileName
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <button className="px-3 py-2 border rounded disabled:opacity-50" onClick={handleGenerate} disabled={isGenerating}>
      {isGenerating ? 'Génération…' : 'Exporter PDF'}
    </button>
  )
}

