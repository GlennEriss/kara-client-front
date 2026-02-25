import { readFile } from 'fs/promises'
import { NextResponse } from 'next/server'
import path from 'path'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), 'documentation', 'placement', 'CAISSE BIENFAITEUR.pdf')
    const fileBuffer = await readFile(filePath)

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="CAISSE_BIENFAITEUR.pdf"',
        'Cache-Control': 'public, max-age=3600',
      },
    })
  } catch (error) {
    console.error('Erreur lecture template contrat bienfaiteur:', error)
    return NextResponse.json({ error: 'Template contrat introuvable' }, { status: 404 })
  }
}

