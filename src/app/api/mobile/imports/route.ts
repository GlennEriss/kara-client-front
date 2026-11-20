import { NextResponse } from 'next/server'

/** Fonction exclue du périmètre mobile. Les outils web restent indépendants. */
export function POST() {
  return NextResponse.json(
    { error: 'Cette fonction n’est pas disponible dans l’application mobile.' },
    { status: 404 },
  )
}
